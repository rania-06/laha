import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

const VALID_REGIONS = new Set([
  'all',
  'riyadh',
  'makkah',
  'eastern',
  'madinah',
  'qassim',
  'asir',
]);

interface StartupCandidateInput {
  id: string;
  startupName: string;
  serviceTitle: string;
  category: string;
  regionId: string;
  regionLabel: string;
  city: string;
  deliveryTime: string;
  startingBudget: string;
  summary: string;
  idealClient: string;
  deliverables: string;
}

interface AiMatchRecommendation {
  startupId: string;
  fitLevel: string;
  whyItFits: string;
  clientFitNote: string;
  suggestedQuestion: string;
}

interface AiMatchPayload {
  summary: string;
  recommendations: AiMatchRecommendation[];
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    ''
  ).trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function sanitizeText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

function hasMeaningfulLetters(value: string): boolean {
  return /[\u0600-\u06FFa-zA-Z]{2,}/.test(value.trim());
}

function safeParseJson<T>(rawText: string): T {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned) as T;
}

function extractGeminiStatusCode(err: unknown): number {
  const e = err as { status?: unknown; code?: unknown; message?: unknown };
  if (typeof e?.status === 'number') return e.status;
  if (typeof e?.code === 'number') return e.code;
  if (typeof e?.message === 'string') {
    const m = e.message;
    if (m.includes('TIMEOUT') || m.includes('503') || m.includes('UNAVAILABLE')) {
      return 503;
    }
    if (m.includes('429') || m.includes('RESOURCE_EXHAUSTED')) {
      return 429;
    }
    if (m.includes('404') || m.includes('NOT_FOUND')) {
      return 404;
    }
    if (m.includes('403') || m.includes('PERMISSION_DENIED')) {
      return 403;
    }
    if (m.includes('400') || m.includes('API_KEY_INVALID') || m.includes('INVALID_ARGUMENT')) {
      return 400;
    }
  }
  return 500;
}

function shouldFailoverModel(err: unknown): boolean {
  const code = extractGeminiStatusCode(err);
  const msg =
    typeof (err as { message?: unknown })?.message === 'string'
      ? (err as { message: string }).message
      : '';
  // Do not failover on invalid API key / permission denied (same key fails on all models)
  if (
    code === 403 ||
    msg.includes('API_KEY_INVALID') ||
    msg.includes('PERMISSION_DENIED')
  ) {
    return false;
  }
  return (
    code === 503 ||
    code === 429 ||
    code === 500 ||
    code === 504 ||
    code === 404 ||
    code === 400 ||
    msg.includes('TIMEOUT') ||
    msg.includes('Empty')
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('TIMEOUT:503'));
    }, ms);
    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function parseCandidates(raw: unknown): StartupCandidateInput[] {
  if (!Array.isArray(raw)) return [];
  const results: StartupCandidateInput[] = [];
  for (const item of raw.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const id = sanitizeText(obj.id, 60);
    const startupName = sanitizeText(obj.startupName, 120);
    const serviceTitle = sanitizeText(obj.serviceTitle, 160);
    if (!id || !startupName || !serviceTitle) continue;

    results.push({
      id,
      startupName,
      serviceTitle,
      category: sanitizeText(obj.category, 80),
      regionId: sanitizeText(obj.regionId, 40),
      regionLabel: sanitizeText(obj.regionLabel, 80),
      city: sanitizeText(obj.city, 80),
      deliveryTime: sanitizeText(obj.deliveryTime, 60),
      startingBudget: sanitizeText(obj.startingBudget, 80),
      summary: sanitizeText(obj.summary, 320),
      idealClient: sanitizeText(obj.idealClient, 260),
      deliverables: sanitizeText(obj.deliverables, 220),
    });
  }
  return results;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      geminiConfigured: Boolean(getGeminiClient()),
    });
  });

  app.post('/api/ai/match', async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const lang: 'ar' | 'en' = body.lang === 'en' ? 'en' : 'ar';
      const needDescription = sanitizeText(body.needDescription, 600);
      const rawRegion = sanitizeText(body.regionId, 40) || 'all';
      const regionId = VALID_REGIONS.has(rawRegion) ? rawRegion : 'all';
      const startups = parseCandidates(body.startups);

      if (needDescription.length < 6 || !hasMeaningfulLetters(needDescription)) {
        res.status(400).json({
          error:
            lang === 'ar'
              ? 'يرجى كتابة وصف أوضح لاحتياجك (6 أحرف على الأقل بحروف عربية أو إنجليزية) للحصول على ترشيح ذكي دقيق.'
              : 'Please describe your project need clearly (at least 6 characters with letters) to generate a smart recommendation.',
        });
        return;
      }

      if (startups.length === 0) {
        res.status(400).json({
          error:
            lang === 'ar'
              ? 'لا توجد شركات ناشئة متاحة للتحليل في الوقت الحالي.'
              : 'No startups are currently available for matching.',
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            lang === 'ar'
              ? 'مفتاح GEMINI_API_KEY غير مضاف في إعدادات البيئة (Settings > Secrets). أضف المفتاح لتفعيل الترشيح الذكي.'
              : 'GEMINI_API_KEY is not configured in Settings > Secrets. Add an API key to enable AI matching.',
        });
        return;
      }

      const validIds = new Set(startups.map((s) => s.id));
      const languageInstruction =
        lang === 'ar'
          ? 'اكتب جميع النصوص باللغة العربية الفصحى المعاصرة والواضحة والمختصرة.'
          : 'Write all output text in crisp, concise, practical English.';

      const systemInstruction = [
        'You are the smart startup-client matching advisor for the Laha (لها) platform.',
        'Your job is to evaluate a client need against the provided list of startups and recommend the top 1 to 3 best-matching startups.',
        'Strictly choose startupId values ONLY from the provided startups array.',
        'Prioritize startups whose service, region/city (if a specific region was chosen), and idealClient criteria align closely with the client need.',
        'Keep every explanation concise, concrete, and practical (1 to 2 short sentences each).',
        languageInstruction,
      ].join(' ');

      const userPrompt = JSON.stringify({
        clientNeed: needDescription,
        preferredRegionId: regionId,
        availableStartups: startups,
      });

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description:
              'A concise 1-2 sentence overview of the best match strategy for the client need.',
          },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                startupId: {
                  type: Type.STRING,
                  description: 'Exact id of a startup from availableStartups.',
                },
                fitLevel: {
                  type: Type.STRING,
                  description:
                    'Short fit label such as توافق عالٍ / توافق جيد (ar) or Strong Fit / Good Fit (en).',
                },
                whyItFits: {
                  type: Type.STRING,
                  description:
                    'Concrete reason why this startup service matches the client need.',
                },
                clientFitNote: {
                  type: Type.STRING,
                  description:
                    'Assessment of how well the client aligns with this startup idealClient criteria.',
                },
                suggestedQuestion: {
                  type: Type.STRING,
                  description:
                    'One practical kickoff question the client should ask this startup.',
                },
              },
              required: [
                'startupId',
                'fitLevel',
                'whyItFits',
                'clientFitNote',
                'suggestedQuestion',
              ],
            },
          },
        },
        required: ['summary', 'recommendations'],
      };

      const modelAttempts: Array<{
        model: string;
        useThinkingLow: boolean;
        delayBeforeMs: number;
        timeoutMs: number;
      }> = [
        {
          model: 'gemini-4-hydrogen',
          useThinkingLow: true,
          delayBeforeMs: 0,
          timeoutMs: 25000,
        },
        {
          model: 'gemini-3.1-flash-lite',
          useThinkingLow: false,
          delayBeforeMs: 350,
          timeoutMs: 25000,
        },
      ];

      let rawText = '';
      let lastError: unknown = null;

      for (let idx = 0; idx < modelAttempts.length; idx++) {
        const cfg = modelAttempts[idx];
        if (cfg.delayBeforeMs > 0) {
          await sleep(cfg.delayBeforeMs);
        }
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: cfg.model,
              contents: userPrompt,
              config: {
                systemInstruction,
                ...(cfg.useThinkingLow
                  ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                  : {}),
                responseMimeType: 'application/json',
                responseSchema,
              },
            }),
            cfg.timeoutMs
          );
          const text = (response.text ?? '').trim();
          if (!text) {
            throw new Error('Empty model response');
          }
          rawText = text;
          lastError = null;
          break;
        } catch (err: unknown) {
          lastError = err;
          if (!shouldFailoverModel(err)) {
            break;
          }
          console.warn(
            `[api/ai/match] transient ${extractGeminiStatusCode(err)} on ${cfg.model} (try ${idx + 1}/${modelAttempts.length}), failing over...`
          );
        }
      }

      if (!rawText) {
        throw lastError ?? new Error('Empty model response');
      }

      const parsed = safeParseJson<Partial<AiMatchPayload>>(rawText);
      const safeRecommendations = Array.isArray(parsed.recommendations)
        ? parsed.recommendations
            .filter(
              (rec): rec is AiMatchRecommendation =>
                Boolean(rec) &&
                typeof rec.startupId === 'string' &&
                validIds.has(rec.startupId)
            )
            .slice(0, 3)
        : [];

      if (safeRecommendations.length === 0) {
        res.status(502).json({
          error:
            lang === 'ar'
              ? 'تعذّر استخراج ترشيحات مطابقة من النموذج. يرجى إعادة المحاولة بصياغة أوضح.'
              : 'Could not extract matching startups from the AI response. Please try again with more detail.',
        });
        return;
      }

      // Deduplicate by startupId while preserving ranked order
      const seen = new Set<string>();
      const uniqueRecommendations = safeRecommendations.filter((rec) => {
        if (seen.has(rec.startupId)) return false;
        seen.add(rec.startupId);
        return true;
      });

      const payload: AiMatchPayload = {
        summary:
          typeof parsed.summary === 'string' && parsed.summary.trim()
            ? parsed.summary.trim()
            : lang === 'ar'
              ? 'إليك أبرز الشركات الناشئة المناسبة لاحتياجك بناءً على التخصص ومعيار العميل الأنسب.'
              : 'Here are the top startups matched to your project brief and ideal client criteria.',
        recommendations: uniqueRecommendations,
      };

      res.json(payload);
    } catch (error: unknown) {
      const lang: 'ar' | 'en' =
        (req.body as Record<string, unknown> | undefined)?.lang === 'en'
          ? 'en'
          : 'ar';
      const status = extractGeminiStatusCode(error);
      const msg =
        typeof (error as { message?: unknown })?.message === 'string'
          ? (error as { message: string }).message
          : '';

      console.error('[api/ai/match] error:', msg || error);

      if (status === 503) {
        res.status(503).json({
          error:
            lang === 'ar'
              ? 'تشهد خدمة Gemini ضغطًا مؤقتًا في الطلبات حاليًا. يرجى الضغط على «ترشيح ذكي» مجددًا بعد ثوانٍ قليلة.'
              : 'Gemini is temporarily experiencing high demand. Please click AI Match again in a few seconds.',
        });
        return;
      }

      if (status === 429) {
        res.status(429).json({
          error:
            lang === 'ar'
              ? 'تم تجاوز حد الطلبات المؤقت لخدمة الذكاء الاصطناعي. يرجى المحاولة بعد قليل أو مراجعة حصتك في Settings > Secrets.'
              : 'The AI rate limit was reached. Please wait a moment or check your API key quota in Settings > Secrets.',
        });
        return;
      }

      if (status === 400 || status === 403) {
        res.status(502).json({
          error:
            lang === 'ar'
              ? 'تعذّر التحقق من صلاحية مفتاح GEMINI_API_KEY. يرجى مراجعة المفتاح في Settings > Secrets.'
              : 'Unable to authenticate with Gemini API. Please check GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }

      res.status(500).json({
        error:
          lang === 'ar'
            ? 'حدث خطأ مؤقت أثناء تحليل احتياجك بالذكاء الاصطناعي. يمكنك إعادة المحاولة أو استخدام البحث المباشر.'
            : 'A temporary error occurred while running AI matching. Please try again or use direct search.',
      });
    }
  });

  app.post('/api/ai/advisor', async (req, res) => {
    try {
      const body = (req.body ?? {}) as Record<string, unknown>;
      const lang: 'ar' | 'en' = body.lang === 'en' ? 'en' : 'ar';
      const rawRegion = sanitizeText(body.selectedRegion, 40) || 'all';
      const selectedRegion = VALID_REGIONS.has(rawRegion) ? rawRegion : 'all';
      const startups = parseCandidates(body.startups);

      const rawMessages = Array.isArray(body.messages) ? body.messages : [];
      const messages = rawMessages
        .slice(-12)
        .map((m) => {
          if (!m || typeof m !== 'object') return null;
          const obj = m as Record<string, unknown>;
          const role = obj.role === 'assistant' ? 'assistant' : 'user';
          const content = sanitizeText(obj.content, 1000);
          if (!content) return null;
          return { role, content };
        })
        .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
          Boolean(m)
        );

      const lastUserMessage = [...messages]
        .reverse()
        .find((m) => m.role === 'user');

      if (!lastUserMessage || lastUserMessage.content.length < 2) {
        res.status(400).json({
          error:
            lang === 'ar'
              ? 'يرجى كتابة سؤالك أو اختيار أحد المواضيع لبدء الاستشارة.'
              : 'Please type your question or choose a starter topic to begin.',
        });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            lang === 'ar'
              ? 'مفتاح GEMINI_API_KEY غير مضاف في إعدادات البيئة (Settings > Secrets). أضف المفتاح لتفعيل المستشار الذكي.'
              : 'GEMINI_API_KEY is not configured in Settings > Secrets. Add an API key to enable Smart Advisor.',
        });
        return;
      }

      const validIds = new Set(startups.map((s) => s.id));
      const languageInstruction =
        lang === 'ar'
          ? 'تحدث باللغة العربية الفصحى المعاصرة والودودة والعملية، بأسلوب مستشار أعمال خبير ومختصر وواضح.'
          : 'Respond in crisp, warm, practical English like a senior business advisor.';

      const systemInstruction = [
        'You are "مستشارك الذكي" (Smart Advisor) on the Laha (لها) regional startups marketplace.',
        'Help undecided clients clarify their project scope, budget priorities, timeline trade-offs, and choose the right startup from the availableStartups list.',
        'Keep replies concise (3 to 5 clear sentences or short actionable points), honest, and directly tailored to their situation.',
        'Only include startup IDs in recommendedStartupIds that exist verbatim in availableStartups (0 to 2 best matches).',
        'Always include 2 to 3 short, natural followUpSuggestions the client can click next to continue the consultation.',
        languageInstruction,
      ].join(' ');

      const userPrompt = JSON.stringify({
        preferredRegionId: selectedRegion,
        conversationHistory: messages,
        availableStartups: startups,
      });

      const advisorSchema = {
        type: Type.OBJECT,
        properties: {
          reply: {
            type: Type.STRING,
            description:
              'Concise, practical consultation response addressing the client question clearly.',
          },
          recommendedStartupIds: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              '0 to 2 exact startup IDs from availableStartups relevant to this advice.',
          },
          followUpSuggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              '2 to 3 short clickable follow-up questions the client might want to ask next.',
          },
        },
        required: ['reply', 'recommendedStartupIds', 'followUpSuggestions'],
      };

      const modelAttempts = [
        {
          model: 'gemini-4-hydrogen',
          useThinkingLow: true,
          delayBeforeMs: 0,
          timeoutMs: 25000,
        },
        {
          model: 'gemini-3.1-flash-lite',
          useThinkingLow: false,
          delayBeforeMs: 350,
          timeoutMs: 25000,
        },
      ];

      let rawText = '';
      let lastError: unknown = null;

      for (let idx = 0; idx < modelAttempts.length; idx++) {
        const cfg = modelAttempts[idx];
        if (cfg.delayBeforeMs > 0) {
          await sleep(cfg.delayBeforeMs);
        }
        try {
          const response = await withTimeout(
            ai.models.generateContent({
              model: cfg.model,
              contents: userPrompt,
              config: {
                systemInstruction,
                ...(cfg.useThinkingLow
                  ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
                  : {}),
                responseMimeType: 'application/json',
                responseSchema: advisorSchema,
              },
            }),
            cfg.timeoutMs
          );
          const text = (response.text ?? '').trim();
          if (!text) throw new Error('Empty advisor response');
          rawText = text;
          lastError = null;
          break;
        } catch (err: unknown) {
          lastError = err;
          if (!shouldFailoverModel(err)) {
            break;
          }
          console.warn(
            `[api/ai/advisor] transient ${extractGeminiStatusCode(err)} on ${cfg.model} (try ${idx + 1}/${modelAttempts.length}), failing over...`
          );
        }
      }

      if (!rawText) {
        throw lastError ?? new Error('Empty advisor response');
      }

      const parsed = safeParseJson<{
        reply?: unknown;
        recommendedStartupIds?: unknown;
        followUpSuggestions?: unknown;
      }>(rawText);

      const reply =
        typeof parsed.reply === 'string' && parsed.reply.trim()
          ? parsed.reply.trim()
          : lang === 'ar'
            ? 'يسعدني مساعدتك في تحديد الخيار الأنسب لمشروعك. أخبرني أكثر عن ميزانيتك التقريبية وموعد الإطلاق المطلوب.'
            : 'I would be glad to help you narrow down the best option. Tell me a bit about your budget and target timeline.';

      const recommendedStartupIds = Array.isArray(parsed.recommendedStartupIds)
        ? Array.from(
            new Set(
              parsed.recommendedStartupIds.filter(
                (id): id is string => typeof id === 'string' && validIds.has(id)
              )
            )
          ).slice(0, 2)
        : [];

      const followUpSuggestions = Array.isArray(parsed.followUpSuggestions)
        ? parsed.followUpSuggestions
            .filter((s): s is string => typeof s === 'string' && s.trim().length > 2)
            .map((s) => s.trim().slice(0, 120))
            .slice(0, 3)
        : [];

      res.json({
        reply,
        recommendedStartupIds,
        followUpSuggestions,
      });
    } catch (error: unknown) {
      const lang: 'ar' | 'en' =
        (req.body as Record<string, unknown> | undefined)?.lang === 'en'
          ? 'en'
          : 'ar';
      const status = extractGeminiStatusCode(error);
      const msg =
        typeof (error as { message?: unknown })?.message === 'string'
          ? (error as { message: string }).message
          : '';
      console.error('[api/ai/advisor] error:', msg || error);

      if (status === 503) {
        res.status(503).json({
          error:
            lang === 'ar'
              ? 'المستشار الذكي يشهد ضغطًا مؤقتًا الآن. يرجى إعادة إرسال سؤالك بعد ثوانٍ.'
              : 'Smart Advisor is experiencing high demand right now. Please retry in a few seconds.',
        });
        return;
      }

      if (status === 429) {
        res.status(429).json({
          error:
            lang === 'ar'
              ? 'تم بلوغ الحد المؤقت لطلبات الذكاء الاصطناعي. يرجى الانتظار قليلًا أو مراجعة المفتاح في Settings > Secrets.'
              : 'Rate limit reached temporarily. Please wait a moment or check your key in Settings > Secrets.',
        });
        return;
      }

      if (status === 400 || status === 403) {
        res.status(502).json({
          error:
            lang === 'ar'
              ? 'تعذّر التحقق من صلاحية مفتاح GEMINI_API_KEY. يرجى مراجعة المفتاح في Settings > Secrets.'
              : 'Unable to authenticate with Gemini API. Please check GEMINI_API_KEY in Settings > Secrets.',
        });
        return;
      }

      res.status(500).json({
        error:
          lang === 'ar'
            ? 'تعذّر الحصول على رد من المستشار الذكي حاليًا. حاول مرة أخرى.'
            : 'Unable to reach Smart Advisor right now. Please try again.',
      });
    }
  });

  const httpServer = http.createServer(app);

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Laha server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
