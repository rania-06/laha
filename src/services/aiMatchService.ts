import {
  getCategoryLabel,
  getRegionLabel,
  type RegionId,
  type StartupService,
} from '../data/startups';
import type { Language } from '../i18n/translations';

export interface AiMatchRecommendation {
  startupId: string;
  fitLevel: string;
  whyItFits: string;
  clientFitNote: string;
  suggestedQuestion: string;
}

export interface AiMatchResult {
  summary: string;
  recommendations: AiMatchRecommendation[];
}

export async function requestAiStartupMatch(params: {
  needDescription: string;
  regionId: RegionId | 'all';
  lang: Language;
  startups: StartupService[];
}): Promise<AiMatchResult> {
  const { needDescription, regionId, lang, startups } = params;

  const compactStartups = startups.map((item) => ({
    id: item.id,
    startupName: item.startupName[lang],
    serviceTitle: item.serviceTitle[lang],
    category: getCategoryLabel(item.categoryId, lang),
    regionId: item.regionId,
    regionLabel: getRegionLabel(item.regionId, lang),
    city: item.city[lang],
    deliveryTime: item.deliveryTime[lang],
    startingBudget: item.startingBudget[lang],
    summary: item.summary[lang],
    idealClient: item.idealClient[lang],
    deliverables: item.deliverables[lang],
  }));

  let response: Response;
  try {
    response = await fetch('/api/ai/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        needDescription,
        regionId,
        lang,
        startups: compactStartups,
      }),
    });
  } catch {
    throw new Error(
      lang === 'ar'
        ? 'تعذّر الاتصال بالخادم لتنفيذ الترشيح الذكي. تأكد من الاتصال وحاول مجددًا.'
        : 'Could not reach the server for AI matching. Please check your connection and try again.'
    );
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const serverMessage =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : lang === 'ar'
          ? 'حدث خطأ أثناء معالجة طلب الترشيح الذكي.'
          : 'An error occurred while processing the AI match request.';
    throw new Error(serverMessage);
  }

  const parsed = data as Partial<AiMatchResult> | null;
  if (
    !parsed ||
    typeof parsed.summary !== 'string' ||
    !Array.isArray(parsed.recommendations)
  ) {
    throw new Error(
      lang === 'ar'
        ? 'استجابة غير متوقعة من الخادم. يرجى المحاولة مرة أخرى.'
        : 'Unexpected response format from the server. Please try again.'
    );
  }

  return {
    summary: parsed.summary,
    recommendations: parsed.recommendations,
  };
}
