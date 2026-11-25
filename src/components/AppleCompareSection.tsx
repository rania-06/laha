import { useState, type ComponentType } from 'react';
import {
  ArrowLeftRight,
  Banknote,
  Briefcase,
  Clock,
  Layers,
  MapPin,
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
  onRequestStartup,
}: AppleCompareSectionProps) {
  const [differencesOnly, setDifferencesOnly] = useState(false);
  const t = UI_COPY[lang].compare;

  const selectedStartups = compareIds
    .map((id) => startups.find((s) => s.id === id) ?? startups[0])
    .filter((s): s is StartupService => Boolean(s));

  const isThreeColumns = selectedStartups.length >= 3;
  const gridColsClass = isThreeColumns
    ? 'grid-cols-2 md:grid-cols-3'
    : 'grid-cols-2';

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
      className="border-b border-[#d2d2d7]/70 bg-white py-16 lg:py-24"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Centered Apple-style Compare Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold text-[#0066cc] sm:text-sm">
            {t.eyebrow}
          </p>
          <h2 className="mt-2.5 text-3xl font-bold tracking-tight text-[#1d1d1f] sm:text-5xl">
            {t.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[#6e6e73]">
            {t.subtitle}
          </p>

          {/* Clean Apple-style Compare Controls */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5">
            {startups.length >= 3 && (
              <button
                type="button"
                onClick={onToggleThirdSlot}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-1.5 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] hover:bg-white whitespace-nowrap cursor-pointer"
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
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-1.5 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] hover:bg-white whitespace-nowrap cursor-pointer"
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
                  ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white'
                  : 'border-[#d2d2d7] bg-[#f5f5f7] text-[#1d1d1f] hover:border-[#1d1d1f] hover:bg-white'
              }`}
            >
              <span>{t.differencesOnly}</span>
            </button>
          </div>
        </div>

        {/* Side-by-Side Selectors + Product-Style Hero Cards */}
        <div className={`mt-12 grid gap-4 sm:gap-8 ${gridColsClass}`}>
          {selectedStartups.map((item, idx) => (
            <div
              key={`${idx}-${item.id}`}
              className={`flex flex-col items-center text-center ${
                idx === 2 ? 'col-span-2 md:col-span-1' : ''
              }`}
            >
              <div className="w-full">
                <select
                  aria-label={t.selectAria(idx + 1)}
                  value={item.id}
                  onChange={(e) => onChangeCompareSlot(idx, e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-3.5 py-2.5 text-center text-sm font-semibold text-[#1d1d1f] transition-colors hover:border-[#86868b] focus:border-[#0071e3] cursor-pointer"
                >
                  {startups.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.startupName[lang]} — {option.city[lang]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5 w-full overflow-hidden rounded-2xl border border-[#e8e8ed]">
                <CategoryArtwork
                  categoryId={item.categoryId}
                  startupName={item.startupName[lang]}
                  compact
                />
              </div>

              <h3 className="mt-5 text-base font-bold text-[#1d1d1f] sm:text-xl">
                {item.startupName[lang]}
              </h3>

              <p className="mt-1.5 min-h-[2.5rem] text-xs leading-relaxed text-[#6e6e73] sm:text-sm">
                {item.serviceTitle[lang]}
              </p>

              <p className="mt-2 text-sm font-semibold tabular-nums text-[#1d1d1f]">
                {item.startingBudget[lang]}
              </p>

              <button
                type="button"
                onClick={() => onRequestStartup(item)}
                className="mt-4 min-h-10 rounded-full bg-[#0071e3] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0062c4] whitespace-nowrap cursor-pointer sm:text-sm"
              >
                {t.requestCta}
              </button>
            </div>
          ))}
        </div>

        {/* Apple-Style Horizontal Spec Comparison Rows with Centered Monochrome Icons */}
        <div className="mt-12 divide-y divide-[#d2d2d7]/80 border-t border-[#d2d2d7]/80">
          {visibleSpecRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#6e6e73]">
              {t.noDifferencesNote}
            </p>
          ) : (
            visibleSpecRows.map(({ key, label, Icon, renderValue, emphasis }) => (
              <div key={key} className="py-8">
                <div className="mb-5 flex flex-col items-center gap-1.5 text-center">
                  <Icon
                    className="h-5 w-5 text-[#1d1d1f]/80"
                    aria-hidden={true}
                  />
                  <p className="text-xs font-semibold text-[#6e6e73]">{label}</p>
                </div>

                <div
                  className={`grid gap-4 text-center sm:gap-8 ${gridColsClass}`}
                >
                  {selectedStartups.map((item, idx) => (
                    <div
                      key={`${key}-${idx}-${item.id}`}
                      className={`px-1 sm:px-3 ${
                        idx === 2 ? 'col-span-2 md:col-span-1' : ''
                      }`}
                    >
                      <p
                        className={`leading-relaxed tabular-nums ${
                          emphasis
                            ? 'text-sm font-semibold text-[#1d1d1f] sm:text-base'
                            : 'text-xs text-[#1d1d1f]/85 sm:text-sm'
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
    </section>
  );
}
