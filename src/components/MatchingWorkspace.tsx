import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  LayoutDashboard,
  Loader2,
  Lock,
  LogIn,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  REGIONS,
  getCategoryLabel,
  getRegionLabel,
  type CategoryId,
  type ClientDecisionStatus,
  type ClientRequest,
  type RegionId,
  type StartupService,
} from '../data/startups';
import { useAuth } from '../context/AuthContext';
import { UI_COPY, type Language } from '../i18n/translations';
import type { StartupMutationInput } from '../services/firestoreService';

export type WorkspaceTab = 'startup' | 'client';

interface FormFeedback {
  type: 'success' | 'error';
  title: string;
  message: string;
  createdStartupId?: string;
}

interface MatchingWorkspaceProps {
  lang: Language;
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  startups: StartupService[];
  selectedStartup: StartupService | null;
  onClearSelectedStartup: () => void;
  prefilledNeed?: string;
  prefilledNeedKey?: number;
  onAddStartup: (input: StartupMutationInput) => Promise<StartupService>;
  onCompareNewStartup: (startupId: string) => void;
  requests: ClientRequest[];
  onAddClientRequest: (payload: {
    clientName: string;
    clientContact: string;
    categoryId: CategoryId;
    regionId: RegionId;
    needDescription: string;
    budgetRange: string;
    targetStartup: StartupService;
  }) => Promise<number>;
  onUpdateDecision: (
    requestId: string,
    status: 'accepted' | 'declined',
    decisionNote: string
  ) => Promise<void>;
  onRequireAuth: (reason: 'startup' | 'client' | 'dashboard') => void;
  onOpenDashboard: () => void;
}

function hasMeaningfulLetters(value: string): boolean {
  return /[\u0600-\u06FFa-zA-Z]{2,}/.test(value.trim());
}

function parseNumericBudget(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10000;
}

export function MatchingWorkspace({
  lang,
  activeTab,
  onTabChange,
  startups,
  selectedStartup,
  onClearSelectedStartup,
  prefilledNeed,
  prefilledNeedKey,
  onAddStartup,
  onCompareNewStartup,
  requests,
  onAddClientRequest,
  onUpdateDecision,
  onRequireAuth,
  onOpenDashboard,
}: MatchingWorkspaceProps) {
  const { user, profile, isAdmin } = useAuth();
  const t = UI_COPY[lang].workspace;
  const isAr = lang === 'ar';

  // Startup form state
  const [startupName, setStartupName] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [startupCategory, setStartupCategory] = useState<CategoryId>('tech');
  const [startupRegion, setStartupRegion] = useState<RegionId>('riyadh');
  const [city, setCity] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [startingBudget, setStartingBudget] = useState('');
  const [summary, setSummary] = useState('');
  const [idealClient, setIdealClient] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [contactChannel, setContactChannel] = useState('');
  const [submittingStartup, setSubmittingStartup] = useState(false);
  const [startupFeedback, setStartupFeedback] = useState<FormFeedback | null>(null);
  const [startupInvalidFields, setStartupInvalidFields] = useState<string[]>([]);

  // Client form state
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [clientCategory, setClientCategory] = useState<CategoryId>('tech');
  const [clientRegion, setClientRegion] = useState<RegionId>('riyadh');
  const [targetStartupId, setTargetStartupId] = useState('');
  const [budgetIndex, setBudgetIndex] = useState(1);
  const [needDescription, setNeedDescription] = useState('');
  const [submittingClient, setSubmittingClient] = useState(false);
  const [clientFeedback, setClientFeedback] = useState<FormFeedback | null>(null);
  const [clientInvalidFields, setClientInvalidFields] = useState<string[]>([]);

  // Pre-fill profile defaults when logged in
  useEffect(() => {
    if (profile) {
      if (!startupName && profile.accountType === 'startup' && profile.organizationName) {
        setStartupName(profile.organizationName);
      }
      if (!clientName) {
        setClientName(profile.organizationName || profile.displayName || '');
      }
      if (!clientContact && profile.contactInfo) {
        setClientContact(profile.contactInfo);
      }
      if (!contactChannel && profile.contactInfo) {
        setContactChannel(profile.contactInfo);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (prefilledNeed && prefilledNeed.trim()) {
      setNeedDescription(prefilledNeed.trim());
    }
  }, [prefilledNeed, prefilledNeedKey]);

  const persistedStartups = useMemo(
    () => startups.filter((s) => Boolean(s.ownerId)),
    [startups]
  );

  const selectableStartups =
    persistedStartups.length > 0 ? persistedStartups : startups;

  const resolvedTargetStartup = useMemo(() => {
    if (selectedStartup) return selectedStartup;
    if (targetStartupId) {
      const found = selectableStartups.find((s) => s.id === targetStartupId);
      if (found) return found;
    }
    const categoryMatch = selectableStartups.find(
      (s) => s.categoryId === clientCategory
    );
    return categoryMatch ?? selectableStartups[0] ?? null;
  }, [selectedStartup, targetStartupId, selectableStartups, clientCategory]);

  // Decision board filter & notice
  const [boardFilter, setBoardFilter] = useState<ClientDecisionStatus | 'all'>('all');
  const [boardNotice, setBoardNotice] = useState<string | null>(null);
  const [busyDecisionId, setBusyDecisionId] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  const effectiveClientCategory = selectedStartup
    ? selectedStartup.categoryId
    : clientCategory;
  const effectiveClientRegion = selectedStartup
    ? selectedStartup.regionId
    : clientRegion;

  const filteredRequests =
    boardFilter === 'all'
      ? requests
      : requests.filter((req) => req.status === boardFilter);

  const handleStartupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth('startup');
      return;
    }

    const invalid: string[] = [];
    if (!hasMeaningfulLetters(startupName) || startupName.trim().length < 2) {
      invalid.push('startupName');
    }
    if (!hasMeaningfulLetters(serviceTitle) || serviceTitle.trim().length < 4) {
      invalid.push('serviceTitle');
    }
    if (!hasMeaningfulLetters(summary) || summary.trim().length < 12) {
      invalid.push('summary');
    }
    if (!hasMeaningfulLetters(idealClient) || idealClient.trim().length < 8) {
      invalid.push('idealClient');
    }

    if (invalid.length > 0) {
      setStartupInvalidFields(invalid);
      setStartupFeedback({
        type: 'error',
        title: t.startupForm.errorTitle,
        message: t.startupForm.errorMessage,
      });
      return;
    }

    const regionMeta = REGIONS.find((r) => r.id === startupRegion) ?? REGIONS[0];
    const cleanName = startupName.trim();
    const cleanTitle = serviceTitle.trim();
    const cleanCity = city.trim() || regionMeta.hubCity[lang];
    const cleanDelivery =
      deliveryTime.trim() || (isAr ? '3 أسابيع' : '3 weeks');
    const cleanBudget =
      startingBudget.trim() ||
      (isAr ? 'حسب نطاق المشروع' : 'Custom scope');
    const cleanSummary = summary.trim();
    const cleanIdeal = idealClient.trim();
    const cleanDeliverables = deliverables.trim() || cleanSummary.slice(0, 120);

    setSubmittingStartup(true);
    setStartupFeedback(null);
    try {
      const created = await onAddStartup({
        categoryId: startupCategory,
        regionId: startupRegion,
        startupName: { ar: cleanName, en: cleanName },
        serviceTitle: { ar: cleanTitle, en: cleanTitle },
        city: { ar: cleanCity, en: cleanCity },
        deliveryTime: { ar: cleanDelivery, en: cleanDelivery },
        deliveryDays: 21,
        startingBudget: { ar: cleanBudget, en: cleanBudget },
        budgetSar: parseNumericBudget(cleanBudget),
        summary: { ar: cleanSummary, en: cleanSummary },
        idealClient: { ar: cleanIdeal, en: cleanIdeal },
        deliverables: { ar: cleanDeliverables, en: cleanDeliverables },
        responseTime: { ar: 'خلال 24 ساعة', en: 'Within 24 hours' },
        teamAndSupport: {
          ar: 'فريق مخصص · متابعة بعد التسليم',
          en: 'Dedicated team · Post-launch support',
        },
        contactChannel: contactChannel.trim(),
      });

      setStartupInvalidFields([]);
      setStartupFeedback({
        type: 'success',
        title: t.startupForm.successTitle,
        message: t.startupForm.successMessage(cleanTitle, cleanName, cleanCity),
        createdStartupId: created.id,
      });

      setServiceTitle('');
      setCity('');
      setDeliveryTime('');
      setStartingBudget('');
      setSummary('');
      setIdealClient('');
      setDeliverables('');
    } catch {
      setStartupFeedback({
        type: 'error',
        title: isAr ? 'تعذّر حفظ الخدمة' : 'Could not save service',
        message: isAr
          ? 'حدث خطأ أثناء حفظ الخدمة في قاعدة البيانات. يرجى المحاولة مجددًا.'
          : 'An error occurred while saving your service to the cloud database. Please try again.',
      });
    } finally {
      setSubmittingStartup(false);
    }
  };

  const handleClientSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireAuth('client');
      return;
    }

    const invalid: string[] = [];
    if (!hasMeaningfulLetters(clientName) || clientName.trim().length < 2) {
      invalid.push('clientName');
    }
    if (
      !hasMeaningfulLetters(needDescription) ||
      needDescription.trim().length < 10
    ) {
      invalid.push('needDescription');
    }

    if (invalid.length > 0) {
      setClientInvalidFields(invalid);
      setClientFeedback({
        type: 'error',
        title: t.clientForm.errorTitle,
        message: t.clientForm.errorMessage,
      });
      return;
    }

    if (!resolvedTargetStartup || !resolvedTargetStartup.ownerId) {
      setClientFeedback({
        type: 'error',
        title: isAr ? 'اختر شركة ناشئة متاحة' : 'Select an available startup',
        message: isAr
          ? 'يرجى اختيار شركة ناشئة نشطة من القائمة لإرسال الطلب إليها مباشرة.'
          : 'Please select an active startup from the list to route your match request.',
      });
      return;
    }

    const selectedBudgetText =
      t.clientForm.budgets[budgetIndex] ?? t.clientForm.budgets[1];

    setSubmittingClient(true);
    setClientFeedback(null);
    try {
      await onAddClientRequest({
        clientName: clientName.trim(),
        clientContact: clientContact.trim(),
        categoryId: effectiveClientCategory,
        regionId: effectiveClientRegion,
        needDescription: needDescription.trim(),
        budgetRange: selectedBudgetText,
        targetStartup: resolvedTargetStartup,
      });

      setClientInvalidFields([]);
      setBoardFilter('all');
      setClientFeedback({
        type: 'success',
        title: t.clientForm.successTitle,
        message: t.clientForm.successTargeted(
          clientName.trim(),
          resolvedTargetStartup.startupName[lang]
        ),
      });

      setNeedDescription('');
      if (selectedStartup) {
        onClearSelectedStartup();
      }
    } catch {
      setClientFeedback({
        type: 'error',
        title: isAr ? 'تعذّر إرسال الطلب' : 'Could not send request',
        message: isAr
          ? 'حدث خطأ أثناء حفظ طلبك. يرجى التأكد من اتصالك والمحاولة مجددًا.'
          : 'An error occurred while saving your request. Please try again.',
      });
    } finally {
      setSubmittingClient(false);
    }
  };

  const handleDecisionClick = async (
    req: ClientRequest,
    status: 'accepted' | 'declined'
  ) => {
    setBusyDecisionId(req.id);
    setBoardNotice(null);
    try {
      await onUpdateDecision(req.id, status, decisionNotes[req.id] ?? '');
      setBoardNotice(
        status === 'accepted'
          ? t.board.decisionSavedAccepted(req.clientName[lang])
          : t.board.decisionSavedDeclined(req.clientName[lang])
      );
    } catch {
      setBoardNotice(
        isAr
          ? 'تعذّر حفظ القرار. تأكد من صلاحياتك وأن الطلب قيد المراجعة.'
          : 'Could not save decision. Check permissions and ensure the request is still pending.'
      );
    } finally {
      setBusyDecisionId(null);
    }
  };

  const boardFilterOptions: Array<{
    key: ClientDecisionStatus | 'all';
    label: string;
  }> = [
    { key: 'all', label: t.board.filters.all },
    { key: 'pending', label: t.board.filters.pending },
    { key: 'accepted', label: t.board.filters.accepted },
    { key: 'declined', label: t.board.filters.declined },
  ];

  return (
    <section
      id="workspace"
      className="bg-white py-12 sm:py-16 lg:py-24 dark:bg-black"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Column 1: Dual-Mode Interactive Form */}
          <div className="lg:col-span-6">
            <h2 className="text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
              {t.title}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#515154] sm:text-base dark:text-[#a1a1a6]">
              {t.subtitle}
            </p>

            {/* Apple-Style Segmented Mode Switch */}
            <div
              role="tablist"
              aria-label={t.title}
              className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-[#f5f5f7] p-1 dark:bg-[#1c1c1e]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'startup'}
                onClick={() => onTabChange('startup')}
                className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'startup'
                    ? 'bg-white text-[#1d1d1f] shadow-xs dark:bg-[#2c2c2e] dark:text-[#f5f5f7]'
                    : 'text-[#515154] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-[#f5f5f7]'
                }`}
              >
                {t.tabStartup}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'client'}
                onClick={() => onTabChange('client')}
                className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'client'
                    ? 'bg-white text-[#1d1d1f] shadow-xs dark:bg-[#2c2c2e] dark:text-[#f5f5f7]'
                    : 'text-[#515154] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-[#f5f5f7]'
                }`}
              >
                {t.tabClient}
              </button>
            </div>

            {activeTab === 'startup' ? (
              <form
                onSubmit={handleStartupSubmit}
                noValidate
                className="mt-6 space-y-4"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="startup-name"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {t.startupForm.nameLabel}
                    </label>
                    <input
                      id="startup-name"
                      type="text"
                      value={startupName}
                      onChange={(e) => setStartupName(e.target.value)}
                      placeholder={t.startupForm.namePlaceholder}
                      aria-invalid={startupInvalidFields.includes('startupName')}
                      className={`mt-1.5 min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] ${
                        startupInvalidFields.includes('startupName')
                          ? 'border-red-600 bg-red-50/40 dark:border-red-500 dark:bg-red-950/30'
                          : 'border-[#d2d2d7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]'
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="startup-category"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {t.startupForm.categoryLabel}
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="startup-category"
                        value={startupCategory}
                        onChange={(e) =>
                          setStartupCategory(e.target.value as CategoryId)
                        }
                        className="min-h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-2.5 ps-3.5 pe-9 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff] dark:focus:bg-[#242426] cursor-pointer"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label[lang]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="service-title"
                    className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                  >
                    {t.startupForm.titleLabel}
                  </label>
                  <input
                    id="service-title"
                    type="text"
                    value={serviceTitle}
                    onChange={(e) => setServiceTitle(e.target.value)}
                    placeholder={t.startupForm.titlePlaceholder}
                    aria-invalid={startupInvalidFields.includes('serviceTitle')}
                    className={`mt-1.5 min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] ${
                      startupInvalidFields.includes('serviceTitle')
                        ? 'border-red-600 bg-red-50/40 dark:border-red-500 dark:bg-red-950/30'
                        : 'border-[#d2d2d7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="startup-region"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {t.startupForm.regionLabel}
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="startup-region"
                        value={startupRegion}
                        onChange={(e) =>
                          setStartupRegion(e.target.value as RegionId)
                        }
                        className="min-h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-2.5 ps-3.5 pe-9 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff] dark:focus:bg-[#242426] cursor-pointer"
                      >
                        {REGIONS.map((reg) => (
                          <option key={reg.id} value={reg.id}>
                            {reg.label[lang]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="startup-city"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {t.startupForm.cityLabel}
                    </label>
                    <input
                      id="startup-city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t.startupForm.cityPlaceholder}
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="delivery-time"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {t.startupForm.deliveryLabel}
                    </label>
                    <input
                      id="delivery-time"
                      type="text"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      placeholder={t.startupForm.deliveryPlaceholder}
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="starting-budget"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {t.startupForm.budgetLabel}
                    </label>
                    <input
                      id="starting-budget"
                      type="text"
                      value={startingBudget}
                      onChange={(e) => setStartingBudget(e.target.value)}
                      placeholder={t.startupForm.budgetPlaceholder}
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="service-summary"
                    className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                  >
                    {t.startupForm.summaryLabel}
                  </label>
                  <textarea
                    id="service-summary"
                    rows={3}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder={t.startupForm.summaryPlaceholder}
                    aria-invalid={startupInvalidFields.includes('summary')}
                    className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] ${
                      startupInvalidFields.includes('summary')
                        ? 'border-red-600 bg-red-50/40 dark:border-red-500 dark:bg-red-950/30'
                        : 'border-[#d2d2d7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="service-deliverables"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {isAr ? 'أبرز المخرجات (اختياري)' : 'Key Deliverables (optional)'}
                    </label>
                    <input
                      id="service-deliverables"
                      type="text"
                      value={deliverables}
                      onChange={(e) => setDeliverables(e.target.value)}
                      placeholder={
                        isAr ? 'مثال: تصميم + برمجة + تدريب' : 'e.g., Design + build + handover'
                      }
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="startup-contact"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {isAr ? 'قناة التواصل العامة (اختياري)' : 'Business Contact (optional)'}
                    </label>
                    <input
                      id="startup-contact"
                      type="text"
                      value={contactChannel}
                      onChange={(e) => setContactChannel(e.target.value)}
                      placeholder={isAr ? 'موقع الشركة أو بريد الأعمال' : 'Website or work email'}
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="ideal-client"
                    className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                  >
                    {t.startupForm.idealLabel}
                  </label>
                  <input
                    id="ideal-client"
                    type="text"
                    value={idealClient}
                    onChange={(e) => setIdealClient(e.target.value)}
                    placeholder={t.startupForm.idealPlaceholder}
                    aria-invalid={startupInvalidFields.includes('idealClient')}
                    className={`mt-1.5 min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] ${
                      startupInvalidFields.includes('idealClient')
                        ? 'border-red-600 bg-red-50/40 dark:border-red-500 dark:bg-red-950/30'
                        : 'border-[#d2d2d7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingStartup}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] disabled:opacity-60 cursor-pointer sm:w-auto"
                >
                  {submittingStartup && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!user && <LogIn className="h-4 w-4" aria-hidden="true" />}
                  <span>
                    {submittingStartup
                      ? isAr
                        ? 'جارٍ النشر...'
                        : 'Publishing...'
                      : user
                        ? t.startupForm.submit
                        : isAr
                          ? 'سجّل الدخول لنشر الخدمة'
                          : 'Sign In to Publish Service'}
                  </span>
                </button>

                {startupFeedback && (
                  <div
                    role={startupFeedback.type === 'error' ? 'alert' : 'status'}
                    aria-live="polite"
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${
                      startupFeedback.type === 'error'
                        ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                    }`}
                  >
                    {startupFeedback.type === 'error' ? (
                      <AlertCircle
                        className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                    )}
                    <div className="space-y-1.5">
                      <p className="font-semibold">{startupFeedback.title}</p>
                      <p className="leading-relaxed opacity-90">
                        {startupFeedback.message}
                      </p>
                      {startupFeedback.type === 'success' &&
                        startupFeedback.createdStartupId && (
                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <a
                              href="#directory"
                              className="text-xs font-semibold text-emerald-900 underline underline-offset-4 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200"
                            >
                              {t.startupForm.viewInDirectory}
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                onCompareNewStartup(
                                  startupFeedback.createdStartupId!
                                )
                              }
                              className="text-xs font-semibold text-[#0066cc] underline underline-offset-4 hover:text-[#004c99] dark:text-[#2997ff] cursor-pointer"
                            >
                              {t.startupForm.compareNew}
                            </button>
                            <button
                              type="button"
                              onClick={onOpenDashboard}
                              className="text-xs font-semibold text-[#1d1d1f] underline underline-offset-4 dark:text-[#f5f5f7] cursor-pointer"
                            >
                              {isAr ? 'إدارة في لوحتي' : 'Manage in Dashboard'}
                            </button>
                          </div>
                        )}
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <form
                onSubmit={handleClientSubmit}
                noValidate
                className="mt-6 space-y-4"
              >
                {selectedStartup ? (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#0071e3]/25 bg-[#0071e3]/6 px-4 py-3 text-sm text-[#1d1d1f] dark:border-[#2997ff]/30 dark:bg-[#2997ff]/10 dark:text-[#f5f5f7]">
                    <div>
                      <p className="text-xs font-semibold text-[#0066cc] dark:text-[#2997ff]">
                        {t.clientForm.targetedPrefix}
                      </p>
                      <p className="font-semibold">
                        {selectedStartup.startupName[lang]} —{' '}
                        {selectedStartup.city[lang]}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onClearSelectedStartup}
                      className="min-h-9 rounded-full px-3 py-1 text-xs font-semibold text-[#1d1d1f] hover:bg-white dark:text-[#f5f5f7] dark:hover:bg-[#2c2c2e] cursor-pointer whitespace-nowrap"
                    >
                      {t.clientForm.changeTarget}
                    </button>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="target-startup-select"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {isAr ? 'الشركة الناشئة المستهدفة' : 'Target Startup'}
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="target-startup-select"
                        value={resolvedTargetStartup?.id ?? ''}
                        onChange={(e) => setTargetStartupId(e.target.value)}
                        className="min-h-11 w-full appearance-none truncate rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-2.5 ps-3.5 pe-9 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff] dark:focus:bg-[#242426] cursor-pointer"
                      >
                        {selectableStartups.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.startupName[lang]} — {s.city[lang]} ({getCategoryLabel(s.categoryId, lang)})
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="client-name"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {t.clientForm.nameLabel}
                    </label>
                    <input
                      id="client-name"
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder={t.clientForm.namePlaceholder}
                      aria-invalid={clientInvalidFields.includes('clientName')}
                      className={`mt-1.5 min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] ${
                        clientInvalidFields.includes('clientName')
                          ? 'border-red-600 bg-red-50/40 dark:border-red-500 dark:bg-red-950/30'
                          : 'border-[#d2d2d7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]'
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="client-contact"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {isAr ? 'وسيلة التواصل (تظهر للشركة فقط)' : 'Contact Info (private to startup)'}
                    </label>
                    <input
                      id="client-contact"
                      type="text"
                      value={clientContact}
                      onChange={(e) => setClientContact(e.target.value)}
                      placeholder={isAr ? 'جوال أو بريد إلكتروني' : 'Phone or email'}
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="client-category"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {t.clientForm.categoryLabel}
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="client-category"
                        value={effectiveClientCategory}
                        disabled={Boolean(selectedStartup)}
                        onChange={(e) =>
                          setClientCategory(e.target.value as CategoryId)
                        }
                        className="min-h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-2.5 ps-3.5 pe-9 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white disabled:opacity-70 dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff] dark:focus:bg-[#242426] cursor-pointer disabled:cursor-not-allowed"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label[lang]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="client-region"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {t.clientForm.regionLabel}
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="client-region"
                        value={effectiveClientRegion}
                        disabled={Boolean(selectedStartup)}
                        onChange={(e) =>
                          setClientRegion(e.target.value as RegionId)
                        }
                        className="min-h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-2.5 ps-3.5 pe-9 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white disabled:opacity-70 dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff] dark:focus:bg-[#242426] cursor-pointer disabled:cursor-not-allowed"
                      >
                        {REGIONS.map((reg) => (
                          <option key={reg.id} value={reg.id}>
                            {reg.label[lang]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="client-budget"
                      className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                    >
                      {t.clientForm.budgetLabel}
                    </label>
                    <div className="relative mt-1.5">
                      <select
                        id="client-budget"
                        value={budgetIndex}
                        onChange={(e) => setBudgetIndex(Number(e.target.value))}
                        className="min-h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-2.5 ps-3.5 pe-9 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff] dark:focus:bg-[#242426] cursor-pointer"
                      >
                        {t.clientForm.budgets.map((label, idx) => (
                          <option key={label} value={idx}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="need-description"
                    className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                  >
                    {t.clientForm.needLabel}
                  </label>
                  <textarea
                    id="need-description"
                    rows={4}
                    value={needDescription}
                    onChange={(e) => setNeedDescription(e.target.value)}
                    placeholder={t.clientForm.needPlaceholder}
                    aria-invalid={clientInvalidFields.includes('needDescription')}
                    className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] ${
                      clientInvalidFields.includes('needDescription')
                        ? 'border-red-600 bg-red-50/40 dark:border-red-500 dark:bg-red-950/30'
                        : 'border-[#d2d2d7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingClient}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] disabled:opacity-60 cursor-pointer sm:w-auto"
                >
                  {submittingClient && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!user && <LogIn className="h-4 w-4" aria-hidden="true" />}
                  <span>
                    {submittingClient
                      ? isAr
                        ? 'جارٍ الإرسال...'
                        : 'Sending...'
                      : user
                        ? t.clientForm.submit
                        : isAr
                          ? 'سجّل الدخول لإرسال الطلب'
                          : 'Sign In to Send Request'}
                  </span>
                </button>

                {clientFeedback && (
                  <div
                    role={clientFeedback.type === 'error' ? 'alert' : 'status'}
                    aria-live="polite"
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${
                      clientFeedback.type === 'error'
                        ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                    }`}
                  >
                    {clientFeedback.type === 'error' ? (
                      <AlertCircle
                        className="mt-0.5 h-5 w-5 shrink-0 text-red-700 dark:text-red-400"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400"
                        aria-hidden="true"
                      />
                    )}
                    <div className="space-y-1">
                      <p className="font-semibold">{clientFeedback.title}</p>
                      <p className="leading-relaxed opacity-90">
                        {clientFeedback.message}
                      </p>
                      {clientFeedback.type === 'success' && (
                        <button
                          type="button"
                          onClick={onOpenDashboard}
                          className="text-xs font-semibold text-emerald-900 underline underline-offset-4 dark:text-emerald-300 cursor-pointer"
                        >
                          {isAr ? 'متابعة الطلب في لوحتي' : 'Track in Dashboard'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Column 2: Scoped Decision Board */}
          <div id="matching-board" className="lg:col-span-6">
            <div className="flex flex-col justify-between gap-2 border-b border-[#d2d2d7]/80 pb-5 sm:flex-row sm:items-end dark:border-[#2c2c2e]">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {t.board.title}
                </h2>
                <p className="mt-1.5 text-sm text-[#515154] dark:text-[#a1a1a6]">
                  {t.board.subtitle}
                </p>
              </div>
              {user && (
                <button
                  type="button"
                  onClick={onOpenDashboard}
                  className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-[#0066cc] hover:underline dark:text-[#2997ff] whitespace-nowrap cursor-pointer"
                >
                  <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isAr ? 'فتح لوحة الإدارة الكاملة' : 'Open Full Dashboard'}</span>
                </button>
              )}
            </div>

            {!user ? (
              <div className="mt-5 rounded-3xl border border-[#d2d2d7]/60 bg-[#f5f5f7] p-8 text-center dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#0066cc] dark:bg-[#2c2c2e] dark:text-[#2997ff]">
                  <Lock className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-4 text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr
                    ? 'طلبات المطابقة محمية بخصوصية الحساب'
                    : 'Match requests are private to each account'}
                </h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                  {isAr
                    ? 'سجّل دخولك لعرض الطلبات الواردة إلى شركتك الناشئة أو متابعة طلباتك المرسلة كعميل وتعديلها والبت فيها.'
                    : 'Sign in to view incoming requests for your startup or track and edit the requests you submitted as a client.'}
                </p>
                <button
                  type="button"
                  onClick={() => onRequireAuth('dashboard')}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] cursor-pointer"
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  <span>{isAr ? 'تسجيل الدخول لعرض الطلبات' : 'Sign In to View Requests'}</span>
                </button>
              </div>
            ) : (
              <>
                <div className="no-scrollbar mt-4 overflow-x-auto">
                  <div
                    role="group"
                    aria-label={t.board.title}
                    className="inline-flex flex-nowrap items-center gap-1 rounded-xl bg-[#f5f5f7] p-1 dark:bg-[#1c1c1e]"
                  >
                  {boardFilterOptions.map((opt) => {
                    const isActive = boardFilter === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setBoardFilter(opt.key)}
                        aria-pressed={isActive}
                        className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          isActive
                            ? 'bg-white text-[#1d1d1f] shadow-xs dark:bg-[#2c2c2e] dark:text-[#f5f5f7]'
                            : 'text-[#515154] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-[#f5f5f7]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                  </div>
                </div>

                {boardNotice && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="mt-4 flex items-center gap-2 rounded-xl border border-[#d2d2d7]/80 bg-[#f5f5f7] px-3.5 py-2.5 text-xs font-medium text-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7]"
                  >
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <span>{boardNotice}</span>
                  </div>
                )}

                <div className="mt-4 divide-y divide-[#d2d2d7]/70 rounded-3xl border border-[#d2d2d7]/60 bg-[#f5f5f7] dark:divide-[#2c2c2e] dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                  {filteredRequests.length === 0 ? (
                    <p className="p-8 text-center text-sm text-[#515154] dark:text-[#a1a1a6]">
                      {t.board.emptyFiltered}
                    </p>
                  ) : (
                    filteredRequests.slice(0, 5).map((req) => {
                      const canDecide =
                        (req.targetStartupOwnerId === user.uid &&
                          req.status === 'pending') ||
                        isAdmin;
                      const busy = busyDecisionId === req.id;

                      return (
                        <div key={req.id} className="p-6">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#515154] dark:text-[#a1a1a6]">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="font-semibold text-[#0066cc] dark:text-[#2997ff]">
                                {getCategoryLabel(req.categoryId, lang)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                                {getRegionLabel(req.regionId, lang)}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">
                                {req.budgetRange[lang]}
                              </span>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                req.status === 'accepted'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : req.status === 'declined'
                                    ? 'text-red-700 dark:text-red-400'
                                    : 'text-[#1d1d1f] dark:text-[#f5f5f7]'
                              }`}
                            >
                              {req.status === 'accepted' ? (
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : req.status === 'declined' ? (
                                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              <span>{t.board.statuses[req.status]}</span>
                            </span>
                          </div>

                          <h3 className="mt-2.5 text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {req.clientName[lang]}
                          </h3>

                          {req.targetStartupName && (
                            <p className="mt-1 text-xs text-[#515154] dark:text-[#a1a1a6]">
                              {t.board.directedTo}{' '}
                              <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                                {req.targetStartupName[lang]}
                              </span>
                            </p>
                          )}

                          <p className="mt-2.5 text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                            {req.needDescription[lang]}
                          </p>

                          {req.decisionNote && (
                            <p className="mt-2 rounded-xl bg-white px-3 py-2 text-xs text-[#1d1d1f] dark:bg-[#2c2c2e] dark:text-[#f5f5f7]">
                              {req.decisionNote}
                            </p>
                          )}

                          {canDecide && (
                            <div className="mt-4 space-y-2.5">
                              <input
                                type="text"
                                maxLength={500}
                                value={decisionNotes[req.id] ?? ''}
                                onChange={(e) =>
                                  setDecisionNotes((prev) => ({
                                    ...prev,
                                    [req.id]: e.target.value,
                                  }))
                                }
                                placeholder={
                                  isAr
                                    ? 'ملاحظة رد اختيارية للعميل...'
                                    : 'Optional response note for client...'
                                }
                                className="min-h-9 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 py-1.5 text-xs text-[#1d1d1f] placeholder:text-[#6e6e73] dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93]"
                              />

                              <div className="flex flex-wrap items-center gap-2.5">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleDecisionClick(req, 'accepted')}
                                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-emerald-700 bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 whitespace-nowrap cursor-pointer"
                                >
                                  {busy ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                  <span>{t.board.acceptBtn}</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleDecisionClick(req, 'declined')}
                                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-4 py-1.5 text-xs font-semibold text-[#515154] transition-colors hover:border-red-700 hover:text-red-700 disabled:opacity-60 dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#a1a1a6] dark:hover:border-red-500 dark:hover:text-red-400 whitespace-nowrap cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>{t.board.declineBtn}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
