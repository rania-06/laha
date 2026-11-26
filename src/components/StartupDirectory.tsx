import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  MapPin,
  MessageSquare,
  Pencil,
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
  loading?: boolean;
  currentUserId?: string;
  isAdmin?: boolean;
  selectedRegion: RegionId | 'all';
  onSelectRegion: (region: RegionId | 'all') => void;
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (category: CategoryId | 'all') => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  activeQuery: string;
  onResetFilters: () => void;
  onViewDetails: (startup: StartupService) => void;
  onEditStartup?: (startup: StartupService) => void;
  onMessageStartup: (startup: StartupService) => void;
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
  loading = false,
  currentUserId,
  isAdmin = false,
  selectedRegion,
  onSelectRegion,
  selectedCategory,
  onSelectCategory,
  sortBy,
  onSortChange,
  activeQuery,
  onResetFilters,
  onViewDetails,
  onEditStartup,
  onMessageStartup,
  onRequestStartup,
  onJumpToClientForm,
  compareIds,
  onToggleCompare,
  onJumpToCompare,
}: StartupDirectoryProps) {
  const t = UI_COPY[lang].directory;
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

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
      className="border-b border-[#d2d2d7]/75 bg-[#f5f5f7] py-12 transition-colors duration-200 dark:border-white/10 dark:bg-[#111113] sm:py-16 lg:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7] sm:text-4xl">
            {t.title}
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6] sm:mt-3 sm:text-base">
            {t.subtitle}
          </p>
        </div>

        {/* Regional & Category Filter Strips — horizontal scroll on mobile/tablet, crisp inline rows on laptop */}
        <div className="mt-7 space-y-4 border-b border-[#d2d2d7]/80 pb-6 dark:border-white/12 sm:mt-8">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#515154] dark:text-[#a1a1a6] whitespace-nowrap shrink-0">
              <MapPin
                className="h-3.5 w-3.5 shrink-0 text-[#0071e3] dark:text-[#2997ff]"
                aria-hidden="true"
              />
              <span>{t.regionFilterLabel}</span>
            </span>

            <div
              role="group"
              aria-label={t.regionFilterLabel}
              className="no-scrollbar -mx-1 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0 lg:pb-0"
            >
              <button
                type="button"
                onClick={() => onSelectRegion('all')}
                aria-pressed={selectedRegion === 'all'}
                className={`min-h-10 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  selectedRegion === 'all'
                    ? 'bg-[#1d1d1f] text-white dark:bg-[#f5f5f7] dark:text-black'
                    : 'border border-[#d2d2d7] bg-white text-[#1d1d1f] hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6]'
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
                        ? 'bg-[#1d1d1f] text-white dark:bg-[#f5f5f7] dark:text-black'
                        : 'border border-[#d2d2d7] bg-white text-[#1d1d1f] hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6]'
                    }`}
                  >
                    {region.hubCity[lang]} ({regionCounts[region.id]})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Segmented Filter */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
            <span className="text-xs font-semibold text-[#515154] dark:text-[#a1a1a6] whitespace-nowrap shrink-0">
              {t.categoryFilterLabel}
            </span>

            <div className="no-scrollbar -mx-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0">
              <div
                role="group"
                aria-label={t.categoryFilterLabel}
                className="inline-flex flex-nowrap items-center gap-1 rounded-xl bg-[#e8e8ed] p-1 dark:bg-[#1c1c1e] lg:flex-wrap"
              >
                <button
                  type="button"
                  onClick={() => onSelectCategory('all')}
                  aria-pressed={selectedCategory === 'all'}
                  className={`min-h-9 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-white text-[#1d1d1f] shadow-xs dark:bg-[#323236] dark:text-white'
                      : 'text-[#515154] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-white'
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
                          ? 'bg-white text-[#1d1d1f] shadow-xs dark:bg-[#323236] dark:text-white'
                          : 'text-[#515154] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-white'
                      }`}
                    >
                      {category.label[lang]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Status & Sort Row */}
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#515154] dark:text-[#a1a1a6]">
            <p className="tabular-nums">
              {t.showingPrefix}{' '}
              <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {filteredStartups.length}
              </strong>{' '}
              {filteredStartups.length === 1
                ? t.serviceSingular
                : t.servicePlural}
              {activeQuery ? (
                <>
                  {' '}
                  {t.matchingQuery}{' '}
                  <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    «{activeQuery}»
                  </strong>
                </>
              ) : null}
              {selectedRegion !== 'all' ? (
                <>
                  {' '}
                  {t.inRegion}{' '}
                  <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {getRegionLabel(selectedRegion, lang)}
                  </strong>
                </>
              ) : null}
              {selectedCategory !== 'all' ? (
                <>
                  {' '}
                  {t.inCategory}{' '}
                  <strong className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
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
                className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-[#0066cc] hover:underline dark:text-[#2997ff] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{t.resetAll}</span>
              </button>
            )}
          </div>

          {/* Sort Select — RTL/LTR custom ChevronDown */}
          <div className="flex items-center justify-between gap-2.5 sm:justify-start shrink-0">
            <label
              htmlFor="directory-sort"
              className="text-xs font-semibold text-[#515154] dark:text-[#a1a1a6] whitespace-nowrap"
            >
              {t.sortLabel}
            </label>
            <div className="relative">
              <select
                id="directory-sort"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as SortOption)}
                className="min-h-10 appearance-none rounded-xl border border-[#d2d2d7] bg-white py-1.5 ps-3.5 pe-9 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#86868b] focus:border-[#0071e3] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#636366] dark:focus:border-[#2997ff] cursor-pointer"
              >
                <option value="featured">{t.sortOptions.featured}</option>
                <option value="budgetAsc">{t.sortOptions.budgetAsc}</option>
                <option value="deliveryAsc">{t.sortOptions.deliveryAsc}</option>
              </select>
              <ChevronDown
                className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {/* Inline Comparison Ready Bar */}
        {selectedCompareStartups.length >= 2 && (
          <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#d2d2d7]/80 bg-white px-5 py-3.5 dark:border-[#2c2c2e] dark:bg-[#1c1c1e] sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[#515154] dark:text-[#a1a1a6]">
              <Scale
                className="h-4 w-4 shrink-0 text-[#0071e3] dark:text-[#2997ff]"
                aria-hidden="true"
              />
              <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {t.compareTrayLabel}
              </span>
              <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                {selectedCompareStartups
                  .map((s) => s.startupName[lang])
                  .join(' · ')}
              </span>
            </div>

            <button
              type="button"
              onClick={onJumpToCompare}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#1d1d1f] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0071e3] dark:bg-[#f5f5f7] dark:text-black dark:hover:bg-[#2997ff] dark:hover:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>{t.compareNowCta}</span>
              <ArrowIcon className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Startup Cards Grid, Loading Skeletons, or Empty State */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-3xl bg-white dark:bg-[#1c1c1e]"
              >
                <div className="aspect-[16/10] w-full animate-pulse bg-[#e8e8ed] dark:bg-[#2c2c2e]" />
                <div className="space-y-3 p-6">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-[#e8e8ed] dark:bg-[#2c2c2e]" />
                  <div className="h-5 w-4/5 animate-pulse rounded bg-[#e8e8ed] dark:bg-[#2c2c2e]" />
                  <div className="h-3 w-full animate-pulse rounded bg-[#f5f5f7] dark:bg-[#242426]" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-[#f5f5f7] dark:bg-[#242426]" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredStartups.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-[#d2d2d7]/70 bg-white px-6 py-14 text-center dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
            <h3 className="text-xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
              {t.emptyTitle}
            </h3>
            <p className="mx-auto mt-2.5 max-w-lg text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
              {t.emptyBody}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onResetFilters}
                className="min-h-11 rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] whitespace-nowrap cursor-pointer"
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
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {filteredStartups.map((item) => {
              const isInCompare = compareIds.includes(item.id);
              const canEdit =
                !item.isSeedDemo &&
                Boolean(onEditStartup) &&
                Boolean(
                  isAdmin || (currentUserId && item.ownerId === currentUserId)
                );
              return (
                <article
                  key={item.id}
                  className="flex flex-col overflow-hidden rounded-3xl border border-[#e5e5ea] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#d2d2d7] dark:border-[#2c2c2e] dark:bg-[#1c1c1e] dark:hover:border-[#48484a]"
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
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#515154] dark:text-[#a1a1a6]">
                      <span className="font-semibold text-[#0066cc] dark:text-[#2997ff]">
                        {getCategoryLabel(item.categoryId, lang)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
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
                      className="mt-3 text-start text-lg font-bold leading-snug text-[#1d1d1f] transition-colors hover:text-[#0066cc] dark:text-[#f5f5f7] dark:hover:text-[#2997ff] cursor-pointer"
                    >
                      {item.serviceTitle[lang]}
                    </button>

                    <p className="mt-1 text-sm font-medium text-[#515154] dark:text-[#a1a1a6]">
                      {item.startupName[lang]}
                    </p>

                    <p className="mt-3 text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                      {item.summary[lang]}
                    </p>

                    <div className="mt-5 border-t border-[#f2f2f7] pt-4 pb-5 dark:border-[#2c2c2e]">
                      <p className="text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {t.idealClientLabel}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                        {item.idealClient[lang]}
                      </p>
                    </div>

                    <div className="mt-auto space-y-3 border-t border-[#f2f2f7] pt-4 dark:border-[#2c2c2e]">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {item.startingBudget[lang]}
                        </span>
                        <div className="flex items-center gap-3">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => onEditStartup?.(item)}
                              className="inline-flex items-center gap-1 font-semibold text-[#0066cc] hover:underline dark:text-[#2997ff] cursor-pointer"
                            >
                              <Pencil className="h-3 w-3" aria-hidden="true" />
                              <span>{isAr ? 'تعديل' : 'Edit'}</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onViewDetails(item)}
                            className="font-medium text-[#515154] underline decoration-[#d2d2d7] underline-offset-4 transition-colors hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:decoration-[#48484a] dark:hover:text-[#f5f5f7] cursor-pointer"
                          >
                            {t.detailsAction}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => onToggleCompare(item.id)}
                          aria-pressed={isInCompare}
                          className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                            isInCompare
                              ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white dark:border-[#f5f5f7] dark:bg-[#f5f5f7] dark:text-black'
                              : 'border-[#d2d2d7] bg-white text-[#1d1d1f] hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6]'
                          }`}
                        >
                          {isInCompare ? (
                            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          ) : (
                            <Scale className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          )}
                          <span>
                            {isInCompare ? t.comparedAction : t.compareAction}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onMessageStartup(item)}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-3 py-1.5 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#0071e3] hover:text-[#0066cc] dark:border-[#38383a] dark:bg-[#242426] dark:text-[#f5f5f7] dark:hover:border-[#2997ff] dark:hover:text-[#2997ff] whitespace-nowrap cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{isAr ? 'مراسلة' : 'Message'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onRequestStartup(item)}
                          className="col-span-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-[#0071e3]/10 px-4 py-2 text-xs font-semibold text-[#0066cc] transition-colors hover:bg-[#0071e3] hover:text-white dark:bg-[#2997ff]/14 dark:text-[#2997ff] dark:hover:bg-[#2997ff] dark:hover:text-black whitespace-nowrap cursor-pointer"
                        >
                          <span>{t.requestAction}</span>
                          <ArrowIcon
                            className="h-3.5 w-3.5 shrink-0"
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
