import {
  getCategoryLabel,
  getRegionLabel,
  type RegionId,
  type StartupService,
} from '../data/startups';
import type { Language } from '../i18n/translations';

export interface AdvisorTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AdvisorResponse {
  reply: string;
  recommendedStartupIds: string[];
  followUpSuggestions: string[];
}

export async function askSmartAdvisor(params: {
  messages: AdvisorTurn[];
  startups: StartupService[];
  lang: Language;
  selectedRegion: RegionId | 'all';
}): Promise<AdvisorResponse> {
  const candidates = params.startups.map((item) => ({
    id: item.id,
    startupName: item.startupName[params.lang],
    serviceTitle: item.serviceTitle[params.lang],
    category: getCategoryLabel(item.categoryId, params.lang),
    regionId: item.regionId,
    regionLabel: getRegionLabel(item.regionId, params.lang),
    city: item.city[params.lang],
    deliveryTime: item.deliveryTime[params.lang],
    startingBudget: item.startingBudget[params.lang],
    summary: item.summary[params.lang],
    idealClient: item.idealClient[params.lang],
    deliverables: item.deliverables[params.lang],
  }));

  const response = await fetch('/api/ai/advisor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: params.messages,
      startups: candidates,
      lang: params.lang,
      selectedRegion: params.selectedRegion,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as Partial<
    AdvisorResponse & { error?: string }
  >;

  if (!response.ok) {
    throw new Error(
      data.error ||
        (params.lang === 'ar'
          ? 'تعذّر الاتصال بالمستشار الذكي حاليًا.'
          : 'Could not reach Smart Advisor right now.')
    );
  }

  return {
    reply: typeof data.reply === 'string' ? data.reply : '',
    recommendedStartupIds: Array.isArray(data.recommendedStartupIds)
      ? data.recommendedStartupIds
      : [],
    followUpSuggestions: Array.isArray(data.followUpSuggestions)
      ? data.followUpSuggestions
      : [],
  };
}
