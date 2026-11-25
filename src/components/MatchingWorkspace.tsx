import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, Check, CheckCircle2, Clock, X } from 'lucide-react';
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
import { UI_COPY, type Language } from '../i18n/translations';

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
  selectedStartup: StartupService | null;
  onClearSelectedStartup: () => void;
  prefilledNeed?: string;
  prefilledNeedKey?: number;
  onAddStartup: (service: StartupService) => void;
  onCompareNewStartup: (startupId: string) => void;
  requests: ClientRequest[];
  onAddClientRequest: (payload: {
    clientName: string;
    categoryId: CategoryId;
    regionId: RegionId;
    needDescription: string;
    budgetRange: string;
    targetStartupName?: StartupService['startupName'];
  }) => number;
  onUpdateDecision: (requestId: string, status: ClientDecisionStatus) => void;
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
  selectedStartup,
  onClearSelectedStartup,
  prefilledNeed,
  prefilledNeedKey,
  onAddStartup,
  onCompareNewStartup,
  requests,
  onAddClientRequest,
  onUpdateDecision,
}: MatchingWorkspaceProps) {
  const t = UI_COPY[lang].workspace;

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
  const [startupFeedback, setStartupFeedback] = useState<FormFeedback | null>(null);
  const [startupInvalidFields, setStartupInvalidFields] = useState<string[]>([]);

  // Client form state
  const [clientName, setClientName] = useState('');
  const [clientCategory, setClientCategory] = useState<CategoryId>('tech');
  const [clientRegion, setClientRegion] = useState<RegionId>('riyadh');
  const [budgetIndex, setBudgetIndex] = useState(1);
  const [needDescription, setNeedDescription] = useState('');
  const [clientFeedback, setClientFeedback] = useState<FormFeedback | null>(null);
  const [clientInvalidFields, setClientInvalidFields] = useState<string[]>([]);

  useEffect(() => {
    if (prefilledNeed && prefilledNeed.trim()) {
      setNeedDescription(prefilledNeed.trim());
    }
  }, [prefilledNeed, prefilledNeedKey]);

  // Decision board filter & confirmation notice
  const [boardFilter, setBoardFilter] = useState<ClientDecisionStatus | 'all'>('all');
  const [boardNotice, setBoardNotice] = useState<string | null>(null);

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

  const handleStartupSubmit = (e: FormEvent) => {
    e.preventDefault();
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
      deliveryTime.trim() || (lang === 'ar' ? '3 أسابيع' : '3 weeks');
    const cleanBudget =
      startingBudget.trim() ||
      (lang === 'ar' ? 'حسب نطاق المشروع' : 'Custom scope');
    const cleanSummary = summary.trim();
    const cleanIdeal = idealClient.trim();
    const newId = `st-${Date.now()}`;

    const keywords = `${cleanName} ${cleanTitle} ${cleanCity} ${cleanSummary} ${cleanIdeal}`
      .split(/\s+/)
      .filter((w) => w.length >= 2)
      .slice(0, 14);

    const newService: StartupService = {
      id: newId,
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
      deliverables: {
        ar: cleanSummary.slice(0, 80),
        en: cleanSummary.slice(0, 80),
      },
      responseTime: { ar: 'خلال 24 ساعة', en: 'Within 24 hours' },
      teamAndSupport: {
        ar: 'فريق مخصص · متابعة بعد التسليم',
        en: 'Dedicated team · Post-launch support',
      },
      keywords,
    };

    onAddStartup(newService);
    setStartupInvalidFields([]);
    setStartupFeedback({
      type: 'success',
      title: t.startupForm.successTitle,
      message: t.startupForm.successMessage(cleanTitle, cleanName, cleanCity),
      createdStartupId: newId,
    });

    setStartupName('');
    setServiceTitle('');
    setCity('');
    setDeliveryTime('');
    setStartingBudget('');
    setSummary('');
    setIdealClient('');
  };

  const handleClientSubmit = (e: FormEvent) => {
    e.preventDefault();
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

    const selectedBudgetText =
      t.clientForm.budgets[budgetIndex] ?? t.clientForm.budgets[1];

    const matchedCount = onAddClientRequest({
      clientName: clientName.trim(),
      categoryId: effectiveClientCategory,
      regionId: effectiveClientRegion,
      needDescription: needDescription.trim(),
      budgetRange: selectedBudgetText,
      targetStartupName: selectedStartup?.startupName,
    });

    setClientInvalidFields([]);
    setBoardFilter('all');
    setClientFeedback({
      type: 'success',
      title: t.clientForm.successTitle,
      message: selectedStartup
        ? t.clientForm.successTargeted(
            clientName.trim(),
            selectedStartup.startupName[lang]
          )
        : t.clientForm.successGeneral(
            matchedCount,
            getCategoryLabel(effectiveClientCategory, lang)
          ),
    });

    setClientName('');
    setNeedDescription('');
    if (selectedStartup) {
      onClearSelectedStartup();
    }
  };

  const handleDecisionClick = (
    req: ClientRequest,
    status: ClientDecisionStatus
  ) => {
    onUpdateDecision(req.id, status);
    setBoardNotice(
      status === 'accepted'
        ? t.board.decisionSavedAccepted(req.clientName[lang])
        : t.board.decisionSavedDeclined(req.clientName[lang])
    );
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
    <section id="workspace" className="bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Column 1: Dual-Mode Interactive Form */}
          <div className="lg:col-span-6">
            <h2 className="text-3xl font-bold tracking-tight text-[#1d1d1f]">
              {t.title}
            </h2>
            <p className="mt-2.5 text-sm leading-relaxed text-[#6e6e73] sm:text-base">
              {t.subtitle}
            </p>

            {/* Apple-Style Segmented Mode Switch */}
            <div
              role="tablist"
              aria-label={t.title}
              className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-[#f5f5f7] p-1"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'startup'}
                onClick={() => onTabChange('startup')}
                className={`min-h-11 rounded-lg px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'startup'
                    ? 'bg-white text-[#1d1d1f] shadow-xs'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
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
                    ? 'bg-white text-[#1d1d1f] shadow-xs'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
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
                      className="block text-xs font-semibold text-[#1d1d1f]"
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
                      className={`mt-1.5 min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] ${
                        startupInvalidFields.includes('startupName')
                          ? 'border-red-600 bg-red-50/40'
                          : 'border-[#d2d2d7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="startup-category"
                      className="block text-xs font-semibold text-[#1d1d1f]"
                    >
                      {t.startupForm.categoryLabel}
                    </label>
                    <select
                      id="startup-category"
                      value={startupCategory}
                      onChange={(e) =>
                        setStartupCategory(e.target.value as CategoryId)
                      }
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label[lang]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="service-title"
                    className="block text-xs font-semibold text-[#1d1d1f]"
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
                    className={`mt-1.5 min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] ${
                      startupInvalidFields.includes('serviceTitle')
                        ? 'border-red-600 bg-red-50/40'
                        : 'border-[#d2d2d7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="startup-region"
                      className="block text-xs font-semibold text-[#1d1d1f]"
                    >
                      {t.startupForm.regionLabel}
                    </label>
                    <select
                      id="startup-region"
                      value={startupRegion}
                      onChange={(e) =>
                        setStartupRegion(e.target.value as RegionId)
                      }
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white"
                    >
                      {REGIONS.map((reg) => (
                        <option key={reg.id} value={reg.id}>
                          {reg.label[lang]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="startup-city"
                      className="block text-xs font-semibold text-[#1d1d1f]"
                    >
                      {t.startupForm.cityLabel}
                    </label>
                    <input
                      id="startup-city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t.startupForm.cityPlaceholder}
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#0071e3] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="delivery-time"
                      className="block text-xs font-semibold text-[#1d1d1f]"
                    >
                      {t.startupForm.deliveryLabel}
                    </label>
                    <input
                      id="delivery-time"
                      type="text"
                      value={deliveryTime}
                      onChange={(e) => setDeliveryTime(e.target.value)}
                      placeholder={t.startupForm.deliveryPlaceholder}
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#0071e3] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="starting-budget"
                      className="block text-xs font-semibold text-[#1d1d1f]"
                    >
                      {t.startupForm.budgetLabel}
                    </label>
                    <input
                      id="starting-budget"
                      type="text"
                      value={startingBudget}
                      onChange={(e) => setStartingBudget(e.target.value)}
                      placeholder={t.startupForm.budgetPlaceholder}
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:border-[#0071e3] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="service-summary"
                    className="block text-xs font-semibold text-[#1d1d1f]"
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
                    className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] ${
                      startupInvalidFields.includes('summary')
                        ? 'border-red-600 bg-red-50/40'
                        : 'border-[#d2d2d7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white'
                    }`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="ideal-client"
                    className="block text-xs font-semibold text-[#1d1d1f]"
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
                    className={`mt-1.5 min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] ${
                      startupInvalidFields.includes('idealClient')
                        ? 'border-red-600 bg-red-50/40'
                        : 'border-[#d2d2d7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  className="min-h-12 w-full rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] cursor-pointer sm:w-auto"
                >
                  {t.startupForm.submit}
                </button>

                {startupFeedback && (
                  <div
                    role={startupFeedback.type === 'error' ? 'alert' : 'status'}
                    aria-live="polite"
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${
                      startupFeedback.type === 'error'
                        ? 'border-red-200 bg-red-50 text-red-900'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-950'
                    }`}
                  >
                    {startupFeedback.type === 'error' ? (
                      <AlertCircle
                        className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
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
                              className="text-xs font-semibold text-emerald-900 underline underline-offset-4 hover:text-emerald-700"
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
                              className="text-xs font-semibold text-[#0066cc] underline underline-offset-4 hover:text-[#004c99] cursor-pointer"
                            >
                              {t.startupForm.compareNew}
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
                {selectedStartup && (
                  <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#0071e3]/25 bg-[#0071e3]/6 px-4 py-3 text-sm text-[#1d1d1f]">
                    <div>
                      <p className="text-xs font-semibold text-[#0066cc]">
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
                      className="min-h-9 rounded-full px-3 py-1 text-xs font-semibold text-[#1d1d1f] hover:bg-white cursor-pointer whitespace-nowrap"
                    >
                      {t.clientForm.changeTarget}
                    </button>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="client-name"
                    className="block text-xs font-semibold text-[#1d1d1f]"
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
                    className={`mt-1.5 min-h-11 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] ${
                      clientInvalidFields.includes('clientName')
                        ? 'border-red-600 bg-red-50/40'
                        : 'border-[#d2d2d7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="client-category"
                      className="block text-xs font-semibold text-[#1d1d1f]"
                    >
                      {t.clientForm.categoryLabel}
                    </label>
                    <select
                      id="client-category"
                      value={effectiveClientCategory}
                      disabled={Boolean(selectedStartup)}
                      onChange={(e) =>
                        setClientCategory(e.target.value as CategoryId)
                      }
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white disabled:opacity-70"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.label[lang]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="client-region"
                      className="block text-xs font-semibold text-[#1d1d1f]"
                    >
                      {t.clientForm.regionLabel}
                    </label>
                    <select
                      id="client-region"
                      value={effectiveClientRegion}
                      disabled={Boolean(selectedStartup)}
                      onChange={(e) =>
                        setClientRegion(e.target.value as RegionId)
                      }
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white disabled:opacity-70"
                    >
                      {REGIONS.map((reg) => (
                        <option key={reg.id} value={reg.id}>
                          {reg.label[lang]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="client-budget"
                      className="block text-xs font-semibold text-[#1d1d1f]"
                    >
                      {t.clientForm.budgetLabel}
                    </label>
                    <select
                      id="client-budget"
                      value={budgetIndex}
                      onChange={(e) => setBudgetIndex(Number(e.target.value))}
                      className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white"
                    >
                      {t.clientForm.budgets.map((label, idx) => (
                        <option key={label} value={idx}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="need-description"
                    className="block text-xs font-semibold text-[#1d1d1f]"
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
                    className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#86868b] ${
                      clientInvalidFields.includes('needDescription')
                        ? 'border-red-600 bg-red-50/40'
                        : 'border-[#d2d2d7] bg-[#f5f5f7] focus:border-[#0071e3] focus:bg-white'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  className="min-h-12 w-full rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] cursor-pointer sm:w-auto"
                >
                  {t.clientForm.submit}
                </button>

                {clientFeedback && (
                  <div
                    role={clientFeedback.type === 'error' ? 'alert' : 'status'}
                    aria-live="polite"
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${
                      clientFeedback.type === 'error'
                        ? 'border-red-200 bg-red-50 text-red-900'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-950'
                    }`}
                  >
                    {clientFeedback.type === 'error' ? (
                      <AlertCircle
                        className="mt-0.5 h-5 w-5 shrink-0 text-red-700"
                        aria-hidden="true"
                      />
                    ) : (
                      <CheckCircle2
                        className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                        aria-hidden="true"
                      />
                    )}
                    <div className="space-y-0.5">
                      <p className="font-semibold">{clientFeedback.title}</p>
                      <p className="leading-relaxed opacity-90">
                        {clientFeedback.message}
                      </p>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Column 2: Startup Decision Board with Triage Filter */}
          <div id="matching-board" className="lg:col-span-6">
            <div className="flex flex-col justify-between gap-2 border-b border-[#d2d2d7]/80 pb-5 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f]">
                  {t.board.title}
                </h2>
                <p className="mt-1.5 text-sm text-[#6e6e73]">
                  {t.board.subtitle}
                </p>
              </div>
              <span className="text-xs font-semibold tabular-nums text-[#6e6e73] whitespace-nowrap">
                {t.board.countLabel(filteredRequests.length)}
              </span>
            </div>

            {/* Status Triage Filter */}
            <div
              role="group"
              aria-label={t.board.title}
              className="mt-4 inline-flex flex-wrap items-center gap-1 rounded-xl bg-[#f5f5f7] p-1"
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
                        ? 'bg-white text-[#1d1d1f] shadow-xs'
                        : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {boardNotice && (
              <div
                role="status"
                aria-live="polite"
                className="mt-4 flex items-center gap-2 rounded-xl border border-[#d2d2d7]/80 bg-[#f5f5f7] px-3.5 py-2.5 text-xs font-medium text-[#1d1d1f]"
              >
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-emerald-700"
                  aria-hidden="true"
                />
                <span>{boardNotice}</span>
              </div>
            )}

            <div className="mt-4 divide-y divide-[#d2d2d7]/70 rounded-3xl bg-[#f5f5f7]">
              {filteredRequests.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#6e6e73]">
                  {t.board.emptyFiltered}
                </p>
              ) : (
                filteredRequests.map((req) => (
                  <div key={req.id} className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6e6e73]">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-semibold text-[#0066cc]">
                          {getCategoryLabel(req.categoryId, lang)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-[#1d1d1f]">
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
                            ? 'text-emerald-700'
                            : req.status === 'declined'
                              ? 'text-red-700'
                              : 'text-[#1d1d1f]'
                        }`}
                      >
                        {req.status === 'accepted' ? (
                          <CheckCircle2
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        ) : req.status === 'declined' ? (
                          <AlertCircle
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        ) : (
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        <span>{t.board.statuses[req.status]}</span>
                      </span>
                    </div>

                    <h3 className="mt-2.5 text-base font-bold text-[#1d1d1f]">
                      {req.clientName[lang]}
                    </h3>

                    {req.targetStartupName && (
                      <p className="mt-1 text-xs text-[#6e6e73]">
                        {t.board.directedTo}{' '}
                        <span className="font-semibold text-[#1d1d1f]">
                          {req.targetStartupName[lang]}
                        </span>
                      </p>
                    )}

                    <p className="mt-2.5 text-sm leading-relaxed text-[#6e6e73]">
                      {req.needDescription[lang]}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleDecisionClick(req, 'accepted')}
                        aria-pressed={req.status === 'accepted'}
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          req.status === 'accepted'
                            ? 'border-emerald-700 bg-emerald-700 text-white'
                            : 'border-[#d2d2d7] bg-white text-[#1d1d1f] hover:border-emerald-700 hover:text-emerald-700'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.board.acceptBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDecisionClick(req, 'declined')}
                        aria-pressed={req.status === 'declined'}
                        className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          req.status === 'declined'
                            ? 'border-red-700 bg-red-700 text-white'
                            : 'border-[#d2d2d7] bg-white text-[#6e6e73] hover:border-red-700 hover:text-red-700'
                        }`}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{t.board.declineBtn}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
