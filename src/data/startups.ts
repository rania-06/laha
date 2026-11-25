import type { Language, LocalizedText } from '../i18n/translations';

export type CategoryId = 'tech' | 'design' | 'growth' | 'operations';

export type RegionId =
  | 'riyadh'
  | 'makkah'
  | 'eastern'
  | 'madinah'
  | 'qassim'
  | 'asir';

export interface CategoryMeta {
  id: CategoryId;
  label: LocalizedText;
}

export interface RegionMeta {
  id: RegionId;
  label: LocalizedText;
  hubCity: LocalizedText;
}

export interface StartupService {
  id: string;
  categoryId: CategoryId;
  regionId: RegionId;
  startupName: LocalizedText;
  serviceTitle: LocalizedText;
  city: LocalizedText;
  deliveryTime: LocalizedText;
  deliveryDays: number;
  startingBudget: LocalizedText;
  budgetSar: number;
  summary: LocalizedText;
  idealClient: LocalizedText;
  deliverables: LocalizedText;
  responseTime: LocalizedText;
  teamAndSupport: LocalizedText;
  keywords: string[];
}

export type ClientDecisionStatus = 'pending' | 'accepted' | 'declined';

export interface ClientRequest {
  id: string;
  clientName: LocalizedText;
  categoryId: CategoryId;
  regionId: RegionId;
  needDescription: LocalizedText;
  budgetRange: LocalizedText;
  targetStartupName?: LocalizedText;
  matchedCount: number;
  status: ClientDecisionStatus;
  submittedLabel: LocalizedText;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'tech', label: { ar: 'التقنية والبرمجة', en: 'Tech & Engineering' } },
  { id: 'design', label: { ar: 'التصميم والهوية', en: 'Design & Brand' } },
  { id: 'growth', label: { ar: 'التسويق والنمو', en: 'Marketing & Growth' } },
  {
    id: 'operations',
    label: { ar: 'الاستشارات التشغيلية', en: 'Operations & Strategy' },
  },
];

export const REGIONS: RegionMeta[] = [
  {
    id: 'riyadh',
    label: { ar: 'منطقة الرياض', en: 'Riyadh Region' },
    hubCity: { ar: 'الرياض', en: 'Riyadh' },
  },
  {
    id: 'makkah',
    label: { ar: 'منطقة مكة المكرمة', en: 'Makkah Region' },
    hubCity: { ar: 'جدة', en: 'Jeddah' },
  },
  {
    id: 'eastern',
    label: { ar: 'المنطقة الشرقية', en: 'Eastern Province' },
    hubCity: { ar: 'الخبر · الدمام', en: 'Khobar · Dammam' },
  },
  {
    id: 'madinah',
    label: { ar: 'المدينة المنورة', en: 'Madinah Region' },
    hubCity: { ar: 'المدينة المنورة', en: 'Madinah' },
  },
  {
    id: 'qassim',
    label: { ar: 'منطقة القصيم', en: 'Qassim Region' },
    hubCity: { ar: 'بريدة', en: 'Buraydah' },
  },
  {
    id: 'asir',
    label: { ar: 'منطقة عسير', en: 'Asir Region' },
    hubCity: { ar: 'أبها', en: 'Abha' },
  },
];

export function getCategoryLabel(id: CategoryId, lang: Language): string {
  return CATEGORIES.find((c) => c.id === id)?.label[lang] ?? '';
}

export function getRegionLabel(id: RegionId, lang: Language): string {
  return REGIONS.find((r) => r.id === id)?.label[lang] ?? '';
}

export const INITIAL_STARTUPS: StartupService[] = [
  {
    id: 'st-1',
    categoryId: 'tech',
    regionId: 'riyadh',
    startupName: { ar: 'مِدار للأنظمة', en: 'Midar Systems' },
    serviceTitle: {
      ar: 'تطوير تطبيقات الجوال ومنصات الحجز',
      en: 'Mobile Apps & Booking Platforms',
    },
    city: { ar: 'الرياض', en: 'Riyadh' },
    deliveryTime: { ar: '6 أسابيع', en: '6 weeks' },
    deliveryDays: 42,
    startingBudget: { ar: 'ابتداءً من 18,000 ر.س', en: 'From 18,000 SAR' },
    budgetSar: 18000,
    summary: {
      ar: 'بناء تطبيقات سريعة لإدارة الطلبات والحجوزات وربطها بلوحة تحكم بسيطة تناسب الفرق المتنامية.',
      en: 'Fast iOS and Android booking and order applications paired with an intuitive operations dashboard for growing local teams.',
    },
    idealClient: {
      ar: 'العيادات، المطاعم السحابية، وشركات الخدمات التي تتعامل مع حجوزات يومية متكررة.',
      en: 'Clinics, cloud kitchens, and service businesses handling recurring daily bookings.',
    },
    deliverables: {
      ar: 'تطبيق iOS وAndroid + لوحة تحكم + تدريب الفريق',
      en: 'iOS & Android app + admin dashboard + team handover',
    },
    responseTime: { ar: 'خلال 4 ساعات', en: 'Within 4 hours' },
    teamAndSupport: {
      ar: 'فريق من 6 مهندسين · دعم فني 90 يومًا',
      en: '6 engineers · 90-day post-launch support',
    },
    keywords: [
      'تطبيق',
      'تطبيقات',
      'برمجة',
      'جوال',
      'حجز',
      'الرياض',
      'app',
      'mobile',
      'booking',
      'riyadh',
      'software',
    ],
  },
  {
    id: 'st-2',
    categoryId: 'design',
    regionId: 'makkah',
    startupName: { ar: 'نَسَق للاستوديو البصري', en: 'Nasaq Visual Studio' },
    serviceTitle: {
      ar: 'تصميم الهوية البصرية وتغليف المنتجات',
      en: 'Brand Identity & Packaging Design',
    },
    city: { ar: 'جدة', en: 'Jeddah' },
    deliveryTime: { ar: '3 أسابيع', en: '3 weeks' },
    deliveryDays: 21,
    startingBudget: { ar: 'ابتداءً من 7,500 ر.س', en: 'From 7,500 SAR' },
    budgetSar: 7500,
    summary: {
      ar: 'بناء هوية بصرية متكاملة تشمل الشعار، نظام الألوان، الخطوط العربية والإنجليزية، وتصاميم العبوات الجاهزة للطباعة.',
      en: 'Complete bilingual brand identity systems covering logo craft, color systems, typography, and print-ready packaging.',
    },
    idealClient: {
      ar: 'العلامات التجارية الجديدة في القهوة المختصة، الأغذية، والعطور الباحثة عن تميّز بصري.',
      en: 'Emerging specialty coffee, food, and fragrance brands seeking a cohesive shelf presence.',
    },
    deliverables: {
      ar: 'دليل هوية كامل + ملفات الشعار + 4 تصاميم تغليف',
      en: 'Full brand book + vector logos + 4 packaging layouts',
    },
    responseTime: { ar: 'خلال 6 ساعات', en: 'Within 6 hours' },
    teamAndSupport: {
      ar: 'فريق من 4 مصممين · إشراف طباعة 30 يومًا',
      en: '4 designers · 30-day print supervision',
    },
    keywords: [
      'هوية',
      'شعار',
      'تصميم',
      'تغليف',
      'جدة',
      'مكة',
      'brand',
      'identity',
      'logo',
      'packaging',
      'jeddah',
      'design',
    ],
  },
  {
    id: 'st-3',
    categoryId: 'growth',
    regionId: 'riyadh',
    startupName: { ar: 'مدى للنمو الرقمي', en: 'Mada Growth Lab' },
    serviceTitle: {
      ar: 'حملات الاستحواذ وتحسين محركات البحث',
      en: 'Performance Campaigns & SEO Growth',
    },
    city: { ar: 'الرياض', en: 'Riyadh' },
    deliveryTime: { ar: 'باقة شهرية', en: 'Monthly sprint' },
    deliveryDays: 30,
    startingBudget: { ar: 'ابتداءً من 6,000 ر.س', en: 'From 6,000 SAR' },
    budgetSar: 6000,
    summary: {
      ar: 'إدارة الإعلانات الممولة وصفحات الهبوط لرفع جودة العملاء المحتملين وخفض تكلفة الاستحواذ.',
      en: 'Paid acquisition campaigns and high-converting landing pages engineered to raise qualified leads and lower CAC.',
    },
    idealClient: {
      ar: 'المتاجر الإلكترونية وشركات الخدمات التي تمتلك منتجًا جاهزًا وميزانية إعلانية شهرية.',
      en: 'E-commerce stores and B2B services with a validated offer and monthly ad budget.',
    },
    deliverables: {
      ar: 'إدارة 3 قنوات إعلانية + تقارير أسبوعية + تحسين صفحات الهبوط',
      en: '3 ad channels + weekly KPI reports + landing page optimization',
    },
    responseTime: { ar: 'خلال 3 ساعات', en: 'Within 3 hours' },
    teamAndSupport: {
      ar: 'فريق من 5 مختصين · مراجعة أداء أسبوعية',
      en: '5 specialists · Weekly performance reviews',
    },
    keywords: [
      'تسويق',
      'إعلانات',
      'حملات',
      'نمو',
      'الرياض',
      'marketing',
      'growth',
      'seo',
      'ads',
      'riyadh',
    ],
  },
  {
    id: 'st-4',
    categoryId: 'design',
    regionId: 'eastern',
    startupName: { ar: 'بُنية للتجربة الرقمية', en: 'Bunya Product Design' },
    serviceTitle: {
      ar: 'تصميم واجهات المواقع وتجربة المستخدم UX/UI',
      en: 'Web & App UX/UI Product Design',
    },
    city: { ar: 'الخبر', en: 'Khobar' },
    deliveryTime: { ar: 'أسبوعان', en: '2 weeks' },
    deliveryDays: 14,
    startingBudget: { ar: 'ابتداءً من 9,000 ر.س', en: 'From 9,000 SAR' },
    budgetSar: 9000,
    summary: {
      ar: 'إعادة هيكلة رحلة المستخدم وتصميم نماذج تفاعلية ونظام تصميم جاهز للتسليم الفوري للمبرمجين.',
      en: 'End-to-end user journey architecture, interactive prototypes, and developer-ready design systems.',
    },
    idealClient: {
      ar: 'المنصات التقنية والمتاجر التي تسعى لرفع معدل إتمام الطلب وتقليل تعقيد الواجهة.',
      en: 'Tech products and storefronts aiming to increase checkout conversion and simplify UX.',
    },
    deliverables: {
      ar: 'نماذج Figma تفاعلية + مكتبة مكونات + اختبار قابلية استخدام',
      en: 'Interactive Figma prototype + component library + usability check',
    },
    responseTime: { ar: 'خلال 5 ساعات', en: 'Within 5 hours' },
    teamAndSupport: {
      ar: 'فريق من 3 مصممين · دعم تسليم للمطورين 45 يومًا',
      en: '3 product designers · 45-day dev handoff support',
    },
    keywords: [
      'واجهة',
      'واجهات',
      'تصميم',
      'تجربة',
      'الخبر',
      'الشرقية',
      'ux',
      'ui',
      'design',
      'khobar',
      'eastern',
    ],
  },
  {
    id: 'st-5',
    categoryId: 'tech',
    regionId: 'madinah',
    startupName: { ar: 'وثبة للأتمتة', en: 'Wathbah Automation' },
    serviceTitle: {
      ar: 'أتمتة خدمة العملاء وربط المبيعات',
      en: 'Customer Support & Sales Automation',
    },
    city: { ar: 'المدينة المنورة', en: 'Madinah' },
    deliveryTime: { ar: '10 أيام', en: '10 days' },
    deliveryDays: 10,
    startingBudget: { ar: 'ابتداءً من 5,500 ر.س', en: 'From 5,500 SAR' },
    budgetSar: 5500,
    summary: {
      ar: 'بناء مسارات رد وفرز ذكية لاستفسارات العملاء وربط قنوات التواصل بجدول متابعة موحّد.',
      en: 'Automated customer triage, instant response workflows, and unified sales tracking pipelines.',
    },
    idealClient: {
      ar: 'الشركات الخدمية والضيافة التي تستقبل أكثر من 50 استفسارًا يوميًا وتحتاج سرعة استجابة.',
      en: 'Hospitality and service teams handling 50+ daily inquiries who want faster turnaround.',
    },
    deliverables: {
      ar: 'مسارات أتمتة كاملة + ربط النماذج + دليل تشغيل مصوّر',
      en: 'Full automation workflows + CRM sync + recorded training guide',
    },
    responseTime: { ar: 'خلال ساعتين', en: 'Within 2 hours' },
    teamAndSupport: {
      ar: 'فريق من 3 مهندسين · صيانة وتحديث 60 يومًا',
      en: '3 automation engineers · 60-day maintenance',
    },
    keywords: [
      'أتمتة',
      'برمجة',
      'عملاء',
      'المدينة',
      'automation',
      'crm',
      'workflow',
      'madinah',
      'tech',
    ],
  },
  {
    id: 'st-6',
    categoryId: 'operations',
    regionId: 'eastern',
    startupName: { ar: 'إتقان للعمليات', en: 'Itqan Operations' },
    serviceTitle: {
      ar: 'تأسيس إجراءات التشغيل وخطة التوسع',
      en: 'Operations Playbooks & Expansion Plans',
    },
    city: { ar: 'الدمام', en: 'Dammam' },
    deliveryTime: { ar: '3 أسابيع', en: '3 weeks' },
    deliveryDays: 21,
    startingBudget: { ar: 'ابتداءً من 8,000 ر.س', en: 'From 8,000 SAR' },
    budgetSar: 8000,
    summary: {
      ar: 'كتابة أدلة التشغيل القياسية، إعادة تسعير الخدمات، وبناء خطة تنفيذ واضحة لأول 90 يومًا.',
      en: 'Standard operating procedures, pricing structure audits, and an actionable 90-day rollout plan.',
    },
    idealClient: {
      ar: 'المشاريع الصغيرة والمتوسطة المقبلة على فتح فرع جديد أو تنظيم فريقها التشغيلي.',
      en: 'SMBs preparing to open a second branch or standardize daily team workflows.',
    },
    deliverables: {
      ar: 'دليل تشغيل SOP + نموذج تسعير + خطة 90 يومًا',
      en: 'SOP manual + pricing model + 90-day execution roadmap',
    },
    responseTime: { ar: 'خلال 12 ساعة', en: 'Within 12 hours' },
    teamAndSupport: {
      ar: 'مستشاران معتمدان · جلستا متابعة شهريتان',
      en: '2 senior advisors · 2 monthly review sessions',
    },
    keywords: [
      'استشارات',
      'تشغيل',
      'خطة',
      'الدمام',
      'الشرقية',
      'operations',
      'strategy',
      'dammam',
      'eastern',
    ],
  },
  {
    id: 'st-7',
    categoryId: 'growth',
    regionId: 'qassim',
    startupName: { ar: 'أثر للمحتوى والتسويق', en: 'Athar Content Studio' },
    serviceTitle: {
      ar: 'إنتاج المحتوى الإعلاني وإدارة الظهور المحلي',
      en: 'Commercial Content & Local Reach',
    },
    city: { ar: 'بريدة', en: 'Buraydah' },
    deliveryTime: { ar: 'أسبوعان', en: '2 weeks' },
    deliveryDays: 14,
    startingBudget: { ar: 'ابتداءً من 4,800 ر.س', en: 'From 4,800 SAR' },
    budgetSar: 4800,
    summary: {
      ar: 'تصوير المنتجات وإعداد حملات محتوى قصير موجهة للجمهور المحلي لرفع الزيارات والمبيعات.',
      en: 'Product photography and short-form regional campaigns crafted to drive store visits and local orders.',
    },
    idealClient: {
      ar: 'المتاجر، المقاهي، والعلامات الأسرية والناشئة في القصيم الراغبة بانتشار محلي فعّال.',
      en: 'Cafes, boutiques, and local retail brands across Qassim seeking high-impact local reach.',
    },
    deliverables: {
      ar: '12 فيديو قصير + جلسة تصوير منتجات + خطة نشر شهرية',
      en: '12 short videos + product shoot + monthly content calendar',
    },
    responseTime: { ar: 'خلال 4 ساعات', en: 'Within 4 hours' },
    teamAndSupport: {
      ar: 'فريق إنتاج من 4 أشخاص · تعديلات مرنة',
      en: '4-person creative crew · Flexible revision rounds',
    },
    keywords: [
      'محتوى',
      'تصوير',
      'تسويق',
      'القصيم',
      'بريدة',
      'content',
      'video',
      'marketing',
      'qassim',
      'buraydah',
    ],
  },
  {
    id: 'st-8',
    categoryId: 'operations',
    regionId: 'asir',
    startupName: { ar: 'قمم لتجربة الضيافة والسياحة', en: 'Qimam Hospitality Tech' },
    serviceTitle: {
      ar: 'تطوير تجربة الضيوف وتنظيم الحجوزات السياحية',
      en: 'Guest Experience & Tourism Operations',
    },
    city: { ar: 'أبها', en: 'Abha' },
    deliveryTime: { ar: '3 أسابيع', en: '3 weeks' },
    deliveryDays: 21,
    startingBudget: { ar: 'ابتداءً من 7,000 ر.س', en: 'From 7,000 SAR' },
    budgetSar: 7000,
    summary: {
      ar: 'تنظيم مسار حجز النزل والتجارب السياحية وتدريب فرق الاستقبال لرفع تقييمات الزوار.',
      en: 'End-to-end guest booking flows and front-desk playbooks for boutique stays and tourism operators.',
    },
    idealClient: {
      ar: 'النزل الريفية، الأكواخ السياحية، ومنظمي الرحلات في المنطقة الجنوبية.',
      en: 'Boutique lodges, eco-cabins, and guided tour operators across Asir.',
    },
    deliverables: {
      ar: 'خريطة رحلة الضيف + إعداد قنوات الحجز + دليل ضيافة',
      en: 'Guest journey map + booking channel setup + hospitality guide',
    },
    responseTime: { ar: 'خلال 6 ساعات', en: 'Within 6 hours' },
    teamAndSupport: {
      ar: 'فريق من 3 مختصين · دعم موسمي 60 يومًا',
      en: '3 specialists · 60-day seasonal support',
    },
    keywords: [
      'سياحة',
      'ضيافة',
      'عسير',
      'أبها',
      'تشغيل',
      'tourism',
      'hospitality',
      'asir',
      'abha',
    ],
  },
];

export const INITIAL_CLIENT_REQUESTS: ClientRequest[] = [
  {
    id: 'req-1',
    clientName: {
      ar: 'محمصة ريف للقهوة المختصة',
      en: 'Reef Specialty Coffee Roasters',
    },
    categoryId: 'design',
    regionId: 'makkah',
    needDescription: {
      ar: 'نبحث عن استوديو في جدة لتصميم هوية بصرية متكاملة وأكياس تعبئة لمحصولين جديدين قبل الافتتاح.',
      en: 'Looking for a Jeddah studio to design a full visual identity and packaging bags for two new roasts before launch.',
    },
    budgetRange: { ar: '10,000 – 15,000 ر.س', en: '10,000 – 15,000 SAR' },
    targetStartupName: { ar: 'نَسَق للاستوديو البصري', en: 'Nasaq Visual Studio' },
    matchedCount: 2,
    status: 'accepted',
    submittedLabel: { ar: 'اليوم · 10:20 ص', en: 'Today · 10:20 AM' },
  },
  {
    id: 'req-2',
    clientName: {
      ar: 'عيادة أفق للعلاج الطبيعي',
      en: 'Ofoq Physiotherapy Clinic',
    },
    categoryId: 'tech',
    regionId: 'riyadh',
    needDescription: {
      ar: 'نحتاج نظام حجز مواعيد إلكتروني للمرضى في الرياض مع تذكير تلقائي قبل الجلسة بيوم واحد.',
      en: 'Need an online patient appointment system in Riyadh with automated 24-hour reminders.',
    },
    budgetRange: { ar: '15,000 – 30,000 ر.س', en: '15,000 – 30,000 SAR' },
    targetStartupName: { ar: 'مِدار للأنظمة', en: 'Midar Systems' },
    matchedCount: 2,
    status: 'pending',
    submittedLabel: { ar: 'اليوم · 11:45 ص', en: 'Today · 11:45 AM' },
  },
];
