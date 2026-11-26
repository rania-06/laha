import { useState, type ComponentType } from 'react';
import {
  ArrowLeftRight,
  Banknote,
  Briefcase,
  ChevronDown,
  Clock,
  Layers,
  MapPin,
  MessageSquare,
  Minus,
  Plus,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import {
  getCategoryLabel,
  getRegionLabel,
  type StartupService,
} from '../data/startups';
import { UI_COPY, type Language } from '../i18n/translations';
import { CategoryArtwork } from './EditorialArtwork';

interface AppleCompareSectionProps {
  lang: Language;
  startups: StartupService[];
  compareIds: string[];
  onChangeCompareSlot: (slotIndex: number, startupId: string) => void;
  onSwapColumns: () => void;
  onToggleThirdSlot: () => void;
  onMessageStartup: (startup: StartupService) => void;
  onRequestStartup: (startup: StartupService) => void;
}

interface SpecRow {
  key: string;
  label: string;
  Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  renderValue: (item: StartupService) => string;
  emphasis?: boolean;
}

export function AppleCompareSection({
  lang,
  startups,
  compareIds,
  onChangeCompareSlot,
  onSwapColumns,
  onToggleThirdSlot,
  onMessageStartup,
  onRequestStartup,
}: AppleCompareSectionProps) {
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const t = UI_COPY[lang].compare;
  const isAr = lang === 'ar';

  const selectedStartups = compareIds
    .map((id) => startups.find((s) => s.id === id) ?? startups[0])
    .filter((s): s is StartupService => Boolean(s));

  const isThreeColumns = selectedStartups.length >= 3;
  const gridColsClass = isThreeColumns ? 'grid-cols-3' : 'grid-cols-2';

  const allSpecRows: SpecRow[] = [
    {
      key: 'category',
      label: t.rows.category,
      Icon: Briefcase,
      renderValue: (item) => getCategoryLabel(item.categoryId, lang),
    },
    {
      key: 'location',
      label: t.rows.location,
      Icon: MapPin,
      renderValue: (item) =>
        `${item.city[lang]} · ${getRegionLabel(item.regionId, lang)}`,
      emphasis: true,
    },
    {
      key: 'delivery',
      label: t.rows.delivery,
      Icon: Clock,
      renderValue: (item) => item.deliveryTime[lang],
      emphasis: true,
    },
    {
      key: 'budget',
      label: t.rows.budget,
      Icon: Banknote,
      renderValue: (item) => item.startingBudget[lang],
      emphasis: true,
    },
    {
      key: 'idealClient',
      label: t.rows.idealClient,
      Icon: Target,
      renderValue: (item) => item.idealClient[lang],
    },
    {
      key: 'deliverables',
      label: t.rows.deliverables,
      Icon: Layers,
      renderValue: (item) => item.deliverables[lang],
    },
    {
      key: 'responseTime',
      label: t.rows.responseTime,
      Icon: Zap,
      renderValue: (item) => item.responseTime[lang],
    },
    {
      key: 'teamAndSupport',
      label: t.rows.teamAndSupport,
      Icon: Users,
      renderValue: (item) => item.teamAndSupport[lang],
    },
  ];

  const visibleSpecRows = differencesOnly
    ? allSpecRows.filter((row) => {
        const values = selectedStartups.map((item) => row.renderValue(item));
        return new Set(values).size > 1;
      })
    : allSpecRows;

  return (
    <section
      id="compare"
      className="border-b border-[#d2d2d7]/75 bg-white py-12 transition-colors duration-200 dark:border-white/10 dark:bg-black sm:py-16 lg:py-24"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Centered Apple-style Compare Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold text-[#0066cc] dark:text-[#2997ff] sm:text-sm">
            {t.eyebrow}
          </p>
          <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] sm:text-4xl lg:text-5xl">
            {t.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6] sm:mt-4 sm:text-base">
            {t.subtitle}
          </p>

          {/* Clean Apple-style Compare Controls */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:mt-7 sm:gap-2.5">
            {startups.length >= 3 && (
              <button
                type="button"
                onClick={onToggleThirdSlot}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-1.5 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] hover:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6] dark:hover:bg-[#2c2c2e] whitespace-nowrap cursor-pointer"
              >
                {isThreeColumns ? (
                  <>
                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.removeThird}</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{t.addThird}</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onSwapColumns}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-1.5 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] hover:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6] dark:hover:bg-[#2c2c2e] whitespace-nowrap cursor-pointer"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{t.swapColumns}</span>
            </button>

            <button
              type="button"
              onClick={() => setDifferencesOnly((prev) => !prev)}
              aria-pressed={differencesOnly}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                differencesOnly
                  ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white dark:border-[#f5f5f7] dark:bg-[#f5f5f7] dark:text-black'
                  : 'border-[#d2d2d7] bg-[#f5f5f7] text-[#1d1d1f] hover:border-[#1d1d1f] hover:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6] dark:hover:bg-[#2c2c2e]'
              }`}
            >
              <span>{t.differencesOnly}</span>
            </button>
          </div>
        </div>

        {isThreeColumns && (
          <p className="mt-5 text-center text-xs text-[#515154] dark:text-[#a1a1a6] md:hidden">
            {isAr
              ? 'اسحب أفقيًا لمقارنة الأعمدة الثلاثة جنبًا إلى جنب'
              : 'Swipe horizontally to compare all three columns side by side'}
          </p>
        )}

        {/* Comparison Matrix Track (horizontally scrollable on small phones when 3 columns are active) */}
        <div
          className={
            isThreeColumns
              ? 'no-scrollbar -mx-4 mt-8 overflow-x-auto px-4 md:mx-0 md:mt-12 md:overflow-visible md:px-0'
              : 'mt-10 sm:mt-12'
          }
        >
          <div className={isThreeColumns ? 'min-w-[660px] md:min-w-0' : ''}>
            {/* Side-by-Side Selectors + Product-Style Hero Cards */}
            <div className={`grid gap-3 sm:gap-6 lg:gap-8 ${gridColsClass}`}>
              {selectedStartups.map((item, idx) => (
                <div
                  key={`${idx}-${item.id}`}
                  className="flex flex-col items-center text-center min-w-0"
                >
                  <div className="relative w-full">
                    <select
                      aria-label={t.selectAria(idx + 1)}
                      value={item.id}
                      onChange={(e) => onChangeCompareSlot(idx, e.target.value)}
                      className="min-h-11 w-full appearance-none truncate rounded-xl border border-[#d2d2d7] bg-white py-2.5 ps-3 pe-8 text-center text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#86868b] focus:border-[#0071e3] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#8e8e93] dark:focus:border-[#2997ff] cursor-pointer sm:ps-8 sm:pe-8 sm:text-sm"
                    >
                      {startups.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.startupName[lang]} — {option.city[lang]}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="mt-4 w-full overflow-hidden rounded-2xl border border-[#e5e5ea] dark:border-[#2c2c2e] sm:mt-5">
                    <CategoryArtwork
                      categoryId={item.categoryId}
                      startupName={item.startupName[lang]}
                      compact
                    />
                  </div>

                  <h3 className="mt-4 text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7] sm:mt-5 sm:text-xl">
                    {item.startupName[lang]}
                  </h3>

                  <p className="mt-1.5 min-h-[2.5rem] text-xs leading-relaxed text-[#515154] dark:text-[#a1a1a6] sm:text-sm">
                    {item.serviceTitle[lang]}
                  </p>

                  <p className="mt-2 text-xs font-semibold tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7] sm:text-sm">
                    {item.startingBudget[lang]}
                  </p>

                  <div className="mt-4 flex w-full flex-col items-stretch justify-center gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                    <button
                      type="button"
                      onClick={() => onRequestStartup(item)}
                      className="min-h-10 rounded-full bg-[#0071e3] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0062c4] whitespace-nowrap cursor-pointer sm:px-5 sm:text-sm"
                    >
                      {t.requestCta}
                    </button>
                    <button
                      type="button"
                      onClick={() => onMessageStartup(item)}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-2 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6] whitespace-nowrap cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{isAr ? 'مراسلة' : 'Message'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Apple-Style Horizontal Spec Comparison Rows */}
            <div className="mt-10 divide-y divide-[#d2d2d7]/80 border-t border-[#d2d2d7]/80 dark:divide-white/12 dark:border-white/12 sm:mt-12">
              {visibleSpecRows.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#515154] dark:text-[#a1a1a6]">
                  {t.noDifferencesNote}
                </p>
              ) : (
                visibleSpecRows.map(({ key, label, Icon, renderValue, emphasis }) => (
                  <div key={key} className="py-6 sm:py-8">
                    <div className="mb-4 flex flex-col items-center gap-1.5 text-center sm:mb-5">
                      <Icon
                        className="h-5 w-5 text-[#1d1d1f]/80 dark:text-[#f5f5f7]/80"
                        aria-hidden={true}
                      />
                      <p className="text-xs font-semibold text-[#515154] dark:text-[#a1a1a6]">
                        {label}
                      </p>
                    </div>

                    <div
                      className={`grid gap-3 text-center sm:gap-6 lg:gap-8 ${gridColsClass}`}
                    >
                      {selectedStartups.map((item, idx) => (
                        <div
                          key={`${key}-${idx}-${item.id}`}
                          className="px-1 sm:px-3 min-w-0"
                        >
                          <p
                            className={`leading-relaxed tabular-nums ${
                              emphasis
                                ? 'text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7] sm:text-base'
                                : 'text-xs text-[#1d1d1f]/85 dark:text-[#d1d1d6] sm:text-sm'
                            }`}
                          >
                            {renderValue(item)}
                          </p>
                        </div>
                      ))}
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
