import {
  ArrowLeft,
  ArrowRight,
  Check,
  MapPin,
  RotateCcw,
  Scale,
} from 'lucide-react';
import {
  CATEGORIES,
  REGIONS,
  getCategoryLabel,
  getRegionLabel,
  type CategoryId,
  type RegionId,
  type StartupService,
} from '../data/startups';
import { UI_COPY, type Language } from '../i18n/translations';
import { CategoryArtwork } from './EditorialArtwork';

export type SortOption = 'featured' | 'budgetAsc' | 'deliveryAsc';

interface StartupDirectoryProps {
  lang: Language;
  allStartups: StartupService[];
  filteredStartups: StartupService[];
  selectedRegion: RegionId | 'all';
  onSelectRegion: (region: RegionId | 'all') => void;
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (category: CategoryId | 'all') => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  activeQuery: string;
  onResetFilters: () => void;
  onViewDetails: (startup: StartupService) => void;
  onRequestStartup: (startup: StartupService) => void;
  onJumpToClientForm: () => void;
  compareIds: string[];
  onToggleCompare: (startupId: string) => void;
  onJumpToCompare: () => void;
}

export function StartupDirectory({
  lang,
  allStartups,
  filteredStartups,
  selectedRegion,
  onSelectRegion,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSortChange,
  activeQuery,
  onResetFilters,
  onViewDetails,
  onRequestStartup,
  onJumpToClientForm,
  compareIds,
  onToggleCompare,
  onJumpToCompare,
}: StartupDirectoryProps) {
  const t = UI_COPY[lang].directory;
  const ArrowIcon = lang === 'ar' ? ArrowLeft : ArrowRight;

  const regionCounts = REGIONS.reduce<Record<RegionId, number>>(
    (acc, reg) => {
      acc[reg.id] = allStartups.filter((s) => s.regionId === reg.id).length;
      return acc;
    },
    {
      riyadh: 0,
      makkah: 0,
      eastern: 0,
      madinah: 0,
      qassim: 0,
      asir: 0,
    }
  );

  const selectedCompareStartups = compareIds
    .map((id) => allStartups.find((s) => s.id === id))
    .filter((s): s is StartupService => Boolean(s));

  return (
    <section
      id="directory"
      className="border-b border-[#d2d2d7]/70 bg-[#f5f5f7] py-16 lg:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold tracking-tight text-[#1d1d1f] sm:text-4xl">
            {t.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-[#6e6e73]">
            {t.subtitle}
          </p>
        </div>

        {/* Regional Filter Strip */}
        <div className="mt-8 space-y-4 border-b border-[#d2d2d7]/80 pb-6">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6e6e73] whitespace-nowrap shrink-0">
              <MapPin
                className="h-3.5 w-3.5 text-[#0071e3]"
                aria-hidden="true"
              />
              <span>{t.regionFilterLabel}</span>
            </span>

            <div
              role="group"
              aria-label={t.regionFilterLabel}
              className="flex flex-wrap items-center gap-1.5"
            >
              <button
                type="button"
                onClick={() => onSelectRegion('all')}
                aria-pressed={selectedRegion === 'all'}
                className={`min-h-10 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  selectedRegion === 'all'
                    ? 'bg-[#1d1d1f] text-white'
                    : 'border border-[#d2d2d7] bg-white text-[#1d1d1f] hover:border-[#1d1d1f]'
                }`}
              >
                {t.allRegions} ({allStartups.length})
              </button>

              {REGIONS.map((region) => {
                const isActive = selectedRegion === region.id;
                return (
                  <button
                    key={region.id}
                    type="button"
                    onClick={() => onSelectRegion(region.id)}
                    aria-pressed={isActive}
                    className={`min-h-10 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                      isActive
                        ? 'bg-[#1d1d1f] text-white'
                        : 'border border-[#d2d2d7] bg-white text-[#1d1d1f] hover:border-[#1d1d1f]'
                    }`}
                  >
                    {region.hubCity[lang]} ({regionCounts[region.id]})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Segmented Filter */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <span className="text-xs font-semibold text-[#6e6e73] whitespace-nowrap shrink-0">
              {t.categoryFilterLabel}
            </span>

            <div
              role="group"
              aria-label={t.categoryFilterLabel}
              className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-[#e8e8ed] p-1"
            >
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                aria-pressed={selectedCategory === 'all'}
                className={`min-h-9 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-white text-[#1d1d1f] shadow-xs'
                    : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                }`}
              >
                {t.allCategories}
              </button>

              {CATEGORIES.map((category) => {
                const isActive = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onSelectCategory(category.id)}
                    aria-pressed={isActive}
                    className={`min-h-9 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#1d1d1f] shadow-xs'
                        : 'text-[#6e6e73] hover:text-[#1d1d1f]'
                    }`}
                  >
                    {category.label[lang]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Inline Comparison Tray + Status & Sort Row */}
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#6e6e73]">
            <p className="tabular-nums">
              {t.showingPrefix}{' '}
              <strong className="font-semibold text-[#1d1d1f]">
                {filteredStartups.length}
              </strong>{' '}
              {filteredStartups.length === 1
                ? t.serviceSingular
                : t.servicePlural}
              {activeQuery ? (
                <>
                  {' '}
                  {t.matchingQuery}{' '}
                  <strong className="font-semibold text-[#1d1d1f]">
                    «{activeQuery}»
                  </strong>
                </>
              ) : null}
              {selectedRegion !== 'all' ? (
                <>
                  {' '}
                  {t.inRegion}{' '}
                  <strong className="font-semibold text-[#1d1d1f]">
                    {getRegionLabel(selectedRegion, lang)}
                  </strong>
                </>
              ) : null}
              {selectedCategory !== 'all' ? (
                <>
                  {' '}
                  {t.inCategory}{' '}
                  <strong className="font-semibold text-[#1d1d1f]">
                    {getCategoryLabel(selectedCategory, lang)}
                  </strong>
                </>
              ) : null}
            </p>

            {(activeQuery ||
              selectedCategory !== 'all' ||
              selectedRegion !== 'all') && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-[#0066cc] hover:underline cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.resetAll}</span>
              </button>
            )}
          </div>

          {/* Sort Select */}
          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="directory-sort"
              className="text-xs font-semibold text-[#6e6e73] whitespace-nowrap"
            >
              {t.sortLabel}
            </label>
            <select
              id="directory-sort"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="min-h-10 rounded-xl border border-[#d2d2d7] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1d1d1f] focus:border-[#0071e3] cursor-pointer"
            >
              <option value="featured">{t.sortOptions.featured}</option>
              <option value="budgetAsc">{t.sortOptions.budgetAsc}</option>
              <option value="deliveryAsc">{t.sortOptions.deliveryAsc}</option>
            </select>
          </div>
        </div>

        {/* Non-intrusive Inline Comparison Ready Bar */}
        {selectedCompareStartups.length >= 2 && (
          <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#d2d2d7]/80 bg-white px-5 py-3.5 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#6e6e73]">
              <Scale
                className="h-4 w-4 shrink-0 text-[#0071e3]"
                aria-hidden="true"
              />
              <span className="font-semibold text-[#1d1d1f]">
                {t.compareTrayLabel}
              </span>
              <span className="font-medium text-[#1d1d1f]">
                {selectedCompareStartups
                  .map((s) => s.startupName[lang])
                  .join(' · ')}
              </span>
            </div>

            <button
              type="button"
              onClick={onJumpToCompare}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#1d1d1f] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0071e3] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{t.compareNowCta}</span>
              <ArrowIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Startup Cards Grid or Empty State */}
        {filteredStartups.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-white px-6 py-14 text-center">
            <h3 className="text-xl font-bold text-[#1d1d1f]">{t.emptyTitle}</h3>
            <p className="mx-auto mt-2.5 max-w-lg text-sm leading-relaxed text-[#6e6e73]">
              {t.emptyBody}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onResetFilters}
                className="min-h-11 rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] whitespace-nowrap cursor-pointer"
              >
                {t.emptyReset}
              </button>
              <button
                type="button"
                onClick={onJumpToClientForm}
                className="min-h-11 rounded-full bg-[#0071e3] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] whitespace-nowrap cursor-pointer"
              >
                {t.emptySendNeed}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredStartups.map((item) => {
              const isInCompare = compareIds.includes(item.id);
              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-3xl bg-white transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <button
                    type="button"
                    onClick={() => onViewDetails(item)}
                    className="block w-full text-start cursor-pointer focus-visible:outline-offset-[-2px]"
                    aria-label={`${t.detailsAction}: ${item.startupName[lang]}`}
                  >
                    <CategoryArtwork
                      categoryId={item.categoryId}
                      startupName={item.startupName[lang]}
                    />
                  </button>

                  <div className="flex flex-1 flex-col p-6">
                    {/* Zero-pill unboxed metadata with middots */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6e6e73]">
                      <span className="font-semibold text-[#0066cc]">
                        {getCategoryLabel(item.categoryId, lang)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#1d1d1f]">
                        {item.city[lang]}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {item.deliveryTime[lang]}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onViewDetails(item)}
                      className="mt-3 text-start text-lg font-bold leading-snug text-[#1d1d1f] transition-colors hover:text-[#0066cc] cursor-pointer"
                    >
                      {item.serviceTitle[lang]}
                    </button>

                    <p className="mt-1 text-sm font-medium text-[#6e6e73]">
                      {item.startupName[lang]}
                    </p>

                    <p className="mt-3 text-sm leading-relaxed text-[#6e6e73]">
                      {item.summary[lang]}
                    </p>

                    <div className="mt-5 border-t border-[#f5f5f7] pt-4 pb-5">
                      <p className="text-xs font-semibold text-[#1d1d1f]">
                        {t.idealClientLabel}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[#6e6e73]">
                        {item.idealClient[lang]}
                      </p>
                    </div>

                    <div className="mt-auto space-y-3 border-t border-[#f5f5f7] pt-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold tabular-nums text-[#1d1d1f]">
                          {item.startingBudget[lang]}
                        </span>
                        <button
                          type="button"
                          onClick={() => onViewDetails(item)}
                          className="font-medium text-[#6e6e73] underline decoration-[#d2d2d7] underline-offset-4 transition-colors hover:text-[#1d1d1f] cursor-pointer"
                        >
                          {t.detailsAction}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onToggleCompare(item.id)}
                          aria-pressed={isInCompare}
                          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            isInCompare
                              ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white'
                              : 'border-[#d2d2d7] bg-white text-[#1d1d1f] hover:border-[#1d1d1f]'
                          }`}
                        >
                          {isInCompare ? (
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          <span>
                            {isInCompare ? t.comparedAction : t.compareAction}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onRequestStartup(item)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#0066cc] transition-colors hover:bg-[#0071e3]/8 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>{t.requestAction}</span>
                          <ArrowIcon
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
