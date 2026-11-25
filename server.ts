import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
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
  const apiKey = process.env.GEMINI_API_KEY?.trim();
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
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
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
              ? 'ميزة الترشيح الذكي غير مفعّلة حاليًا بسبب عدم إعداد مفتاح Gemini على الخادم.'
              : 'AI matching is currently unavailable because GEMINI_API_KEY is not configured on the server.',
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

      const extractStatusCode = (err: unknown): number => {
        const e = err as { status?: unknown; code?: unknown; message?: unknown };
        if (typeof e?.status === 'number') return e.status;
        if (typeof e?.code === 'number') return e.code;
        if (typeof e?.message === 'string') {
          if (e.message.includes('503') || e.message.includes('UNAVAILABLE')) {
            return 503;
          }
          if (e.message.includes('429') || e.message.includes('RESOURCE_EXHAUSTED')) {
            return 429;
          }
          if (e.message.includes('403') || e.message.includes('PERMISSION_DENIED')) {
            return 403;
          }
          if (e.message.includes('400') || e.message.includes('API_KEY_INVALID')) {
            return 400;
          }
        }
        return 500;
      };

      const shouldFailover = (err: unknown): boolean => {
        const code = extractStatusCode(err);
        const msg =
          typeof (err as { message?: unknown })?.message === 'string'
            ? (err as { message: string }).message
            : '';
        return (
          code === 503 ||
          code === 429 ||
          code === 500 ||
          code === 504 ||
          msg.includes('TIMEOUT')
        );
      };

      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
        new Promise((resolve, reject) => {
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

      // Primary: gemini-4-hydrogen; automatic fast failover on 503/429 high-demand spikes
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
          timeoutMs: 8000,
        },
        {
          model: 'gemini-3.5-flash-lite',
          useThinkingLow: false,
          delayBeforeMs: 250,
          timeoutMs: 12000,
        },
        {
          model: 'gemini-3.1-flash-lite',
          useThinkingLow: false,
          delayBeforeMs: 350,
          timeoutMs: 10000,
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
          if (!shouldFailover(err)) {
            break;
          }
          console.warn(
            `[api/ai/match] transient ${extractStatusCode(err)} on ${cfg.model} (try ${idx + 1}/${modelAttempts.length}), failing over...`
          );
        }
      }

      if (!rawText) {
        throw lastError ?? new Error('Empty model response');
      }

      const parsed = JSON.parse(rawText) as Partial<AiMatchPayload>;
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
      const errObj = error as { status?: number; code?: number; message?: string };
      const msg = typeof errObj?.message === 'string' ? errObj.message : '';
      const status =
        typeof errObj?.status === 'number'
          ? errObj.status
          : typeof errObj?.code === 'number'
            ? errObj.code
            : msg.includes('503') || msg.includes('UNAVAILABLE')
              ? 503
              : msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')
                ? 429
                : 500;

      console.error('[api/ai/match] error:', msg || error);

      if (status === 503) {
        res.status(503).json({
          error:
            lang === 'ar'
              ? 'تشهد خدمة Gemini ضغطًا مؤقتًا في الطلبات حاليًا. حاولنا إعادة الاتصال تلقائيًا، يرجى الضغط على «ترشيح ذكي» مجددًا بعد ثوانٍ قليلة.'
              : 'Gemini is temporarily experiencing high demand. Automatic retries were attempted—please click AI Match again in a few seconds.',
        });
        return;
      }

      if (status === 429) {
        res.status(429).json({
          error:
            lang === 'ar'
              ? 'تم تجاوز حد الطلبات المؤقت لخدمة الذكاء الاصطناعي. يرجى المحاولة بعد قليل.'
              : 'The AI service rate limit was reached. Please wait a moment and try again.',
        });
        return;
      }

      if (status === 400 || status === 403) {
        res.status(502).json({
          error:
            lang === 'ar'
              ? 'تعذّر التحقق من صلاحية مفتاح Gemini في الخادم. يرجى مراجعة إعدادات المفتاح.'
              : 'Unable to authenticate with Gemini API. Please check the server API key settings.',
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

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Laha server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
