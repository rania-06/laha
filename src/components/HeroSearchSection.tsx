import { useState, type FormEvent, type RefObject } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  MapPin,
  RotateCcw,
  Scale,
  Search,
  Wand2,
  X,
} from 'lucide-react';
import {
  REGIONS,
  getCategoryLabel,
  type RegionId,
  type StartupService,
} from '../data/startups';
import { UI_COPY, type Language } from '../i18n/translations';
import type { AiMatchResult } from '../services/aiMatchService';
import { HeroEditorialVisual } from './EditorialArtwork';

export interface SearchFeedback {
  type: 'success' | 'error';
  title: string;
  message: string;
  retryable?: boolean;
}

export type SmartMatchSource = 'gemini' | 'directory';

interface HeroSearchSectionProps {
  lang: Language;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  selectedRegion: RegionId | 'all';
  onSelectRegion: (region: RegionId | 'all') => void;
  onSearchSubmit: (e: FormEvent) => void;
  onAiMatchClick: (overrideQuery?: string) => void;
  onInstantDirectoryMatch: () => void;
  aiLoading: boolean;
  aiResult: AiMatchResult | null;
  aiSource: SmartMatchSource | null;
  onDismissAiResult: () => void;
  allStartups: StartupService[];
  onCompareRecommended: (startupIds: string[]) => void;
  onViewDetails: (startup: StartupService) => void;
  onRequestStartup: (startup: StartupService, carryNeed?: boolean) => void;
  onQuickSearch: (term: string) => void;
  onClearSearch: () => void;
  activeQuery: string;
  feedback: SearchFeedback | null;
  searchInputRef: RefObject<HTMLInputElement | null>;
  totalStartups: number;
  regionsCount: number;
  requestsCount: number;
  acceptedClientsCount: number;
}

export function HeroSearchSection({
  lang,
  searchInput,
  onSearchInputChange,
  selectedRegion,
  onSelectRegion,
  onSearchSubmit,
  onAiMatchClick,
  onInstantDirectoryMatch,
  aiLoading,
  aiResult,
  aiSource,
  onDismissAiResult,
  allStartups,
  onCompareRecommended,
  onViewDetails,
  onRequestStartup,
  onQuickSearch,
  onClearSearch,
  activeQuery,
  feedback,
  searchInputRef,
  totalStartups,
  regionsCount,
  requestsCount,
  acceptedClientsCount,
}: HeroSearchSectionProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const t = UI_COPY[lang].hero;
  const hasError = feedback?.type === 'error';
  const isRtl = lang === 'ar';
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const resolvedRecommendations = aiResult
    ? aiResult.recommendations
        .map((rec) => {
          const startup = allStartups.find((s) => s.id === rec.startupId);
          return startup ? { rec, startup } : null;
        })
        .filter(
          (
            entry
          ): entry is {
            rec: AiMatchResult['recommendations'][number];
            startup: StartupService;
          } => Boolean(entry)
        )
    : [];

  const handleCopyQuestion = async (startupId: string, question: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(question);
      }
      setCopiedId(startupId);
      window.setTimeout(() => {
        setCopiedId((curr) => (curr === startupId ? null : curr));
      }, 2000);
    } catch {
      setCopiedId(startupId);
    }
  };

  return (
    <section id="top" className="border-b border-[#d2d2d7]/70 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Primary Column: Apple-Inspired High-Contrast Typography & Search */}
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="text-xs font-semibold text-[#0066cc] sm:text-sm">
              {t.eyebrow}
            </p>

            <h1 className="mt-3 text-3xl font-bold leading-[1.15] text-[#1d1d1f] sm:text-5xl lg:text-[3.1rem]">
              {t.headline}
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#6e6e73] sm:text-lg">
              {t.subtitle}
            </p>

            {/* Primary Search Form: Validated Input + Regional Selector + Direct Search & AI Match */}
            <form
              onSubmit={onSearchSubmit}
              noValidate
              className="mt-8 space-y-3"
              aria-label={t.searchLabel}
            >
              <label
                htmlFor="service-search-input"
                className="block text-sm font-semibold text-[#1d1d1f]"
              >
                {t.searchLabel}
              </label>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e6e73] ${
                      isRtl ? 'right-4' : 'left-4'
                    }`}
                    aria-hidden="true"
                  />
                  <input
                    ref={searchInputRef}
                    id="service-search-input"
                    name="serviceQuery"
                    type="text"
                    value={searchInput}
                    onChange={(e) => onSearchInputChange(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    aria-invalid={hasError}
                    aria-describedby={
                      feedback ? 'search-feedback-banner' : 'search-helper-text'
                    }
                    className={`min-h-12 w-full rounded-xl border bg-[#f5f5f7] py-3 text-sm text-[#1d1d1f] placeholder:text-[#86868b] transition-colors focus:bg-white sm:text-base ${
                      isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'
                    } ${
                      hasError
                        ? 'border-red-600 bg-red-50/40 focus:border-red-700'
                        : 'border-[#d2d2d7] focus:border-[#0071e3]'
                    }`}
                  />
                </div>

                {/* Region selector */}
                <div className="relative sm:w-44">
                  <MapPin
                    className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e6e73] ${
                      isRtl ? 'right-3.5' : 'left-3.5'
                    }`}
                    aria-hidden="true"
                  />
                  <select
                    aria-label={t.regionAllOption}
                    value={selectedRegion}
                    onChange={(e) =>
                      onSelectRegion(e.target.value as RegionId | 'all')
                    }
                    className={`min-h-12 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-3 text-sm font-medium text-[#1d1d1f] transition-colors focus:border-[#0071e3] focus:bg-white ${
                      isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'
                    }`}
                  >
                    <option value="all">{t.regionAllOption}</option>
                    {REGIONS.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.label[lang]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Row: Primary Search + Secondary Smart Match */}
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                <button
                  type="submit"
                  className="min-h-11 rounded-xl bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#0062c4] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {t.searchButton}
                </button>

                <button
                  type="button"
                  onClick={() => onAiMatchClick()}
                  disabled={aiLoading}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#1d1d1f] bg-[#1d1d1f] px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#323236] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {aiLoading ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Wand2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>{aiLoading ? t.aiMatchLoading : t.aiMatchButton}</span>
                </button>
              </div>

              {/* Quick Terms Row */}
              <div
                id="search-helper-text"
                className="flex flex-wrap items-center gap-x-3.5 gap-y-2 text-xs text-[#6e6e73]"
              >
                <span>{t.quickLabel}</span>
                {t.quickTerms.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => onQuickSearch(term)}
                    className="min-h-8 font-medium text-[#1d1d1f] underline decoration-[#d2d2d7] underline-offset-4 transition-colors hover:text-[#0066cc] hover:decoration-[#0066cc] whitespace-nowrap cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
                {(activeQuery || selectedRegion !== 'all') && (
                  <button
                    type="button"
                    onClick={onClearSearch}
                    className="inline-flex min-h-8 items-center gap-1 font-medium text-[#0066cc] hover:text-[#004c99] whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.resetSearch}</span>
                  </button>
                )}
              </div>

              {/* Ready-to-click Smart Match Scenario Starters */}
              <div className="space-y-1.5 pt-1">
                <p className="text-xs text-[#6e6e73]">{t.aiScenariosLabel}</p>
                <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
                  {t.aiScenarios.map((scenario) => (
                    <button
                      key={scenario}
                      type="button"
                      disabled={aiLoading}
                      onClick={() => onAiMatchClick(scenario)}
                      className="min-h-9 rounded-lg border border-[#d2d2d7]/90 bg-[#f5f5f7] px-3 py-1.5 text-start text-xs font-medium text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] hover:bg-white disabled:opacity-50 cursor-pointer"
                    >
                      {scenario}
                    </button>
                  ))}
                </div>
              </div>

              {feedback && (
                <div
                  id="search-feedback-banner"
                  role={feedback.type === 'error' ? 'alert' : 'status'}
                  aria-live="polite"
                  className={`mt-4 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${
                    feedback.type === 'error'
                      ? 'border-red-200 bg-red-50 text-red-900'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-950'
                  }`}
                >
                  {feedback.type === 'error' ? (
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
                    <p className="font-semibold">{feedback.title}</p>
                    <p className="leading-relaxed opacity-90">{feedback.message}</p>
                    {feedback.type === 'error' && feedback.retryable && (
                      <div className="flex flex-wrap items-center gap-3 pt-1.5">
                        <button
                          type="button"
                          onClick={onInstantDirectoryMatch}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#1d1d1f] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0071e3] whitespace-nowrap cursor-pointer"
                        >
                          <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t.aiInstantFallbackBtn}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onAiMatchClick()}
                          disabled={aiLoading}
                          className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-red-800 underline underline-offset-4 hover:text-red-950 disabled:opacity-50 whitespace-nowrap cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t.aiRetryGeminiBtn}</span>
                        </button>

                        <button
                          type="submit"
                          className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-[#1d1d1f] underline underline-offset-4 hover:text-[#0066cc] whitespace-nowrap cursor-pointer"
                        >
                          <Search className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>{t.searchButton}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Secondary Column: High-Contrast Obsidian Editorial Panel */}
          <div className="lg:col-span-5">
            <HeroEditorialVisual
              lang={lang}
              totalStartups={totalStartups}
              acceptedClientsCount={acceptedClientsCount}
            />
          </div>
        </div>

        {/* Upgraded Smart Match Recommendations Panel */}
        {aiResult && resolvedRecommendations.length > 0 && (
          <div
            id="smart-match-results"
            role="region"
            aria-label={
              aiSource === 'directory'
                ? t.aiPanelTitleDirectory
                : t.aiPanelTitleGemini
            }
            className="mt-10 rounded-3xl border border-[#d2d2d7]/80 bg-[#f5f5f7] p-6 sm:p-8"
          >
            <div className="flex flex-col justify-between gap-4 border-b border-[#d2d2d7]/80 pb-5 sm:flex-row sm:items-start">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold text-[#0066cc]">
                  {aiSource === 'directory'
                    ? t.aiPanelTitleDirectory
                    : t.aiPanelTitleGemini}
                </p>
                <p className="mt-1.5 text-base font-medium leading-relaxed text-[#1d1d1f]">
                  {aiResult.summary}
                </p>
                {aiSource === 'directory' && (
                  <p className="mt-1.5 text-xs text-[#6e6e73]">
                    {t.aiPanelDirectoryNote}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {aiSource === 'directory' && (
                  <button
                    type="button"
                    onClick={() => onAiMatchClick()}
                    disabled={aiLoading}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-4 py-1.5 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] disabled:opacity-50 whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.aiRetryGeminiBtn}</span>
                  </button>
                )}

                {resolvedRecommendations.length >= 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      onCompareRecommended(
                        resolvedRecommendations.map((r) => r.startup.id)
                      )
                    }
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#1d1d1f] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0071e3] whitespace-nowrap cursor-pointer"
                  >
                    <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.aiCompareMatchedCta}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onDismissAiResult}
                  aria-label={t.aiPanelClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {resolvedRecommendations.map(({ rec, startup }, idx) => {
                const isTopMatch = idx === 0;
                const isCopied = copiedId === startup.id;

                return (
                  <div
                    key={startup.id}
                    className={`flex flex-col rounded-2xl bg-white p-6 ${
                      isTopMatch
                        ? 'ring-1 ring-[#0071e3]/35'
                        : 'border border-[#e8e8ed]'
                    }`}
                  >
                    {/* Quiet unboxed rank & metadata */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6e6e73]">
                      <span
                        className={`font-semibold ${
                          isTopMatch ? 'text-[#0066cc]' : 'text-[#1d1d1f]'
                        }`}
                      >
                        {isTopMatch ? t.aiRankTop : t.aiRankLabel(idx + 1)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{rec.fitLevel}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6e6e73]">
                      <span>{getCategoryLabel(startup.categoryId, lang)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#1d1d1f]">
                        {startup.city[lang]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {startup.deliveryTime[lang]}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onViewDetails(startup)}
                      className="mt-3 text-start text-lg font-bold text-[#1d1d1f] transition-colors hover:text-[#0066cc] cursor-pointer"
                    >
                      {startup.startupName[lang]}
                    </button>
                    <p className="mt-0.5 text-xs font-medium text-[#6e6e73]">
                      {startup.serviceTitle[lang]}
                    </p>

                    <div className="mt-4 space-y-3.5 border-t border-[#f5f5f7] pt-4 pb-5 text-xs">
                      <div>
                        <p className="font-semibold text-[#1d1d1f]">
                          {t.aiWhyFitsLabel}
                        </p>
                        <p className="mt-1 leading-relaxed text-[#6e6e73]">
                          {rec.whyItFits}
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold text-[#1d1d1f]">
                          {t.aiClientFitLabel}
                        </p>
                        <p className="mt-1 leading-relaxed text-[#6e6e73]">
                          {rec.clientFitNote}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#f5f5f7] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-[#1d1d1f]">
                            {t.aiSuggestedQuestionLabel}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              handleCopyQuestion(
                                startup.id,
                                rec.suggestedQuestion
                              )
                            }
                            className="inline-flex min-h-7 items-center gap-1 text-[11px] font-semibold text-[#0066cc] hover:underline whitespace-nowrap cursor-pointer"
                          >
                            {isCopied ? (
                              <>
                                <Check
                                  className="h-3 w-3 text-emerald-700"
                                  aria-hidden="true"
                                />
                                <span className="text-emerald-700">
                                  {t.aiCopiedQuestion}
                                </span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" aria-hidden="true" />
                                <span>{t.aiCopyQuestion}</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="mt-1.5 leading-relaxed text-[#1d1d1f]/85">
                          «{rec.suggestedQuestion}»
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto space-y-3 border-t border-[#f5f5f7] pt-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold tabular-nums text-[#1d1d1f]">
                          {startup.startingBudget[lang]}
                        </span>
                        <button
                          type="button"
                          onClick={() => onViewDetails(startup)}
                          className="font-medium text-[#6e6e73] underline decoration-[#d2d2d7] underline-offset-4 hover:text-[#1d1d1f] cursor-pointer"
                        >
                          {t.aiQuickViewCta}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRequestStartup(startup, true)}
                        className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full bg-[#0071e3] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0062c4] whitespace-nowrap cursor-pointer"
                      >
                        <span>{t.aiRequestStartupCta}</span>
                        <ArrowIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full-Width 4-Column Summary Strip Below Hero Split */}
        <div className="mt-14 grid grid-cols-2 gap-6 border-t border-[#d2d2d7]/80 pt-8 sm:grid-cols-4">
          <div>
            <p className="text-xs text-[#6e6e73]">{t.metrics.startups}</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-[#1d1d1f]">
              {totalStartups}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6e6e73]">{t.metrics.regions}</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-[#1d1d1f]">
              {regionsCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6e6e73]">{t.metrics.requests}</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-[#1d1d1f]">
              {requestsCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#6e6e73]">{t.metrics.accepted}</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums text-[#1d1d1f]">
              {acceptedClientsCount}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
