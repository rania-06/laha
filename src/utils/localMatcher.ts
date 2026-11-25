import {
  getCategoryLabel,
  getRegionLabel,
  type RegionId,
  type StartupService,
} from '../data/startups';
import type { Language } from '../i18n/translations';
import type {
  AiMatchRecommendation,
  AiMatchResult,
} from '../services/aiMatchService';

function normalizeForMatch(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ');
}

const DOMAIN_HINTS: Array<{
  categoryId: StartupService['categoryId'];
  terms: string[];
}> = [
  {
    categoryId: 'tech',
    terms: [
      'تطبيق',
      'تطبيقات',
      'برمجه',
      'جوال',
      'موقع',
      'نظام',
      'حجز',
      'مواعيد',
      'اتمته',
      'ربط',
      'متجر',
      'app',
      'mobile',
      'booking',
      'software',
      'automation',
      'crm',
      'web',
      'clinic',
      'عياده',
    ],
  },
  {
    categoryId: 'design',
    terms: [
      'هويه',
      'شعار',
      'تصميم',
      'تغليف',
      'عبوات',
      'واجهه',
      'واجهات',
      'مستخدم',
      'مقهى',
      'قهوه',
      'محمصه',
      'عطور',
      'brand',
      'identity',
      'logo',
      'packaging',
      'ux',
      'ui',
      'design',
      'coffee',
    ],
  },
  {
    categoryId: 'growth',
    terms: [
      'تسويق',
      'اعلانات',
      'حملات',
      'مبيعات',
      'نمو',
      'عملاء',
      'محتوى',
      'تصوير',
      'فيديو',
      'marketing',
      'growth',
      'ads',
      'seo',
      'content',
      'video',
      'sales',
      'store',
    ],
  },
  {
    categoryId: 'operations',
    terms: [
      'تشغيل',
      'استشارات',
      'خطه',
      'توسع',
      'تسعير',
      'فرع',
      'ضيافه',
      'سياحه',
      'نزل',
      'operations',
      'strategy',
      'expansion',
      'sop',
      'hospitality',
      'tourism',
      'pricing',
    ],
  },
];

const REGION_HINTS: Array<{ regionId: RegionId; terms: string[] }> = [
  { regionId: 'riyadh', terms: ['الرياض', 'رياض', 'riyadh'] },
  { regionId: 'makkah', terms: ['جده', 'مكه', 'jeddah', 'makkah', 'mecca'] },
  {
    regionId: 'eastern',
    terms: ['الخبر', 'الدمام', 'الشرقيه', 'khobar', 'dammam', 'eastern'],
  },
  { regionId: 'madinah', terms: ['المدينه', 'مدينه', 'madinah', 'medina'] },
  { regionId: 'qassim', terms: ['القصيم', 'بريده', 'qassim', 'buraydah'] },
  { regionId: 'asir', terms: ['عسير', 'ابها', 'الجنوب', 'asir', 'abha'] },
];

export function buildDirectorySmartMatch(params: {
  needDescription: string;
  regionId: RegionId | 'all';
  lang: Language;
  startups: StartupService[];
}): AiMatchResult {
  const { needDescription, regionId, lang, startups } = params;
  const normalizedNeed = normalizeForMatch(needDescription);
  const tokens = normalizedNeed
    .split(/\s+/)
    .filter((tok) => tok.length >= 2);

  // Detect mentioned region if user selected "all"
  let inferredRegion: RegionId | null = regionId === 'all' ? null : regionId;
  if (!inferredRegion) {
    for (const hint of REGION_HINTS) {
      if (hint.terms.some((term) => normalizedNeed.includes(term))) {
        inferredRegion = hint.regionId;
        break;
      }
    }
  }

  // Score each startup based on transparent directory attributes
  const scored = startups.map((startup) => {
    let score = 0;
    let regionMatched = false;
    let categoryMatched = false;
    let keywordHits = 0;

    if (inferredRegion && startup.regionId === inferredRegion) {
      score += 35;
      regionMatched = true;
    }

    for (const domain of DOMAIN_HINTS) {
      if (
        domain.categoryId === startup.categoryId &&
        domain.terms.some((term) => normalizedNeed.includes(term))
      ) {
        score += 30;
        categoryMatched = true;
        break;
      }
    }

    const haystack = normalizeForMatch(
      [
        startup.startupName.ar,
        startup.startupName.en,
        startup.serviceTitle.ar,
        startup.serviceTitle.en,
        startup.city.ar,
        startup.city.en,
        startup.summary.ar,
        startup.summary.en,
        startup.idealClient.ar,
        startup.idealClient.en,
        startup.deliverables.ar,
        startup.deliverables.en,
        ...startup.keywords,
      ].join(' ')
    );

    for (const token of tokens) {
      if (haystack.includes(token)) {
        keywordHits += 1;
        score += 12;
      }
    }

    // Small tiebreaker favoring faster delivery
    score += Math.max(0, 5 - Math.floor(startup.deliveryDays / 10));

    return {
      startup,
      score,
      regionMatched,
      categoryMatched,
      keywordHits,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(3, scored.length));

  const recommendations: AiMatchRecommendation[] = top.map((entry, idx) => {
    const { startup, regionMatched, categoryMatched, keywordHits } = entry;
    const isStrong = idx === 0 && (categoryMatched || keywordHits >= 2);

    const fitLevel =
      lang === 'ar'
        ? isStrong
          ? 'توافق عالٍ'
          : idx === 1
            ? 'توافق جيد جدًا'
            : 'خيار بديل مناسب'
        : isStrong
          ? 'Strong Fit'
          : idx === 1
            ? 'Very Good Fit'
            : 'Solid Alternative';

    const catName = getCategoryLabel(startup.categoryId, lang);
    const regName = getRegionLabel(startup.regionId, lang);

    const whyItFits =
      lang === 'ar'
        ? `تتخصص «${startup.startupName.ar}» في ${startup.serviceTitle.ar} (${catName})${
            regionMatched
              ? ` وتعمل مباشرة من ${startup.city.ar}،`
              : ` ومقرها ${startup.city.ar} (${regName})،`
          } بمدة تنفيذ تقارب ${startup.deliveryTime.ar} وميزانية ${startup.startingBudget.ar}.`
        : `${startup.startupName.en} specializes in ${startup.serviceTitle.en} (${catName})${
            regionMatched
              ? ` directly in ${startup.city.en},`
              : ` based in ${startup.city.en} (${regName}),`
          } with typical delivery of ${startup.deliveryTime.en} (${startup.startingBudget.en}).`;

    const clientFitNote =
      lang === 'ar'
        ? `معيار الشركة للعميل الأنسب: ${startup.idealClient.ar}`
        : `Startup ideal-client criteria: ${startup.idealClient.en}`;

    const suggestedQuestion =
      lang === 'ar'
        ? `هل يتناسب نطاق مشروعنا مع باقة «${startup.serviceTitle.ar}» وهل يمكن البدء خلال الجدول الزمني المطلوب (${startup.deliveryTime.ar})؟`
        : `Does our project scope fit your “${startup.serviceTitle.en}” package, and can we start within the ${startup.deliveryTime.en} timeline?`;

    return {
      startupId: startup.id,
      fitLevel,
      whyItFits,
      clientFitNote,
      suggestedQuestion,
    };
  });

  const regionSuffix = inferredRegion
    ? lang === 'ar'
      ? ` مع أولوية لـ ${getRegionLabel(inferredRegion, 'ar')}`
      : ` prioritizing ${getRegionLabel(inferredRegion, 'en')}`
    : '';

  const summary =
    lang === 'ar'
      ? `بناءً على وصف احتياجك${regionSuffix}، رُتّبت هذه الشركات الناشئة وفق تطابق التخصص، الموقع الجغرافي، ومعيار العميل الأنسب في الدليل.`
      : `Based on your brief${regionSuffix}, these startups are ranked by discipline fit, regional proximity, and ideal-client alignment from the directory.`;

  return {
    summary,
    recommendations,
  };
}
