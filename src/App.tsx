import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AppleCompareSection } from './components/AppleCompareSection';
import { Header } from './components/Header';
import {
  HeroSearchSection,
  type SearchFeedback,
  type SmartMatchSource,
} from './components/HeroSearchSection';
import { LahaLogo } from './components/LahaLogo';
import {
  MatchingWorkspace,
  type WorkspaceTab,
} from './components/MatchingWorkspace';
import { StartupDetailModal } from './components/StartupDetailModal';
import {
  StartupDirectory,
  type SortOption,
} from './components/StartupDirectory';
import {
  INITIAL_CLIENT_REQUESTS,
  INITIAL_STARTUPS,
  REGIONS,
  getCategoryLabel,
  getRegionLabel,
  type CategoryId,
  type ClientDecisionStatus,
  type ClientRequest,
  type RegionId,
  type StartupService,
} from './data/startups';
import { UI_COPY, type Language } from './i18n/translations';
import {
  requestAiStartupMatch,
  type AiMatchResult,
} from './services/aiMatchService';
import { buildDirectorySmartMatch } from './utils/localMatcher';

function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '');
}

function isValidSearchTerm(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed.length < 2) {
    return false;
  }
  return /[\u0600-\u06FFa-zA-Z]{2,}/.test(trimmed);
}

export default function App() {
  const [lang, setLang] = useState<Language>('ar');
  const [startups, setStartups] = useState<StartupService[]>(INITIAL_STARTUPS);
  const [requests, setRequests] = useState<ClientRequest[]>(INITIAL_CLIENT_REQUESTS);

  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RegionId | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [searchFeedback, setSearchFeedback] = useState<SearchFeedback | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiMatchResult | null>(null);
  const [aiSource, setAiSource] = useState<SmartMatchSource | null>(null);

  const [compareIds, setCompareIds] = useState<string[]>([
    INITIAL_STARTUPS[0].id,
    INITIAL_STARTUPS[1].id,
  ]);
  const [detailStartup, setDetailStartup] = useState<StartupService | null>(null);

  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('startup');
  const [selectedStartup, setSelectedStartup] = useState<StartupService | null>(null);
  const [prefilledNeed, setPrefilledNeed] = useState('');
  const [prefilledNeedKey, setPrefilledNeedKey] = useState(0);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title =
      lang === 'ar'
        ? 'لها — ملتقى الشركات الناشئة والعملاء'
        : 'Laha — Startups & Clients Marketplace';
  }, [lang]);

  const t = UI_COPY[lang];

  const filterStartups = (
    list: StartupService[],
    query: string,
    region: RegionId | 'all',
    category: CategoryId | 'all'
  ) => {
    const normalizedQuery = normalizeText(query);
    return list.filter((item) => {
      if (region !== 'all' && item.regionId !== region) return false;
      if (category !== 'all' && item.categoryId !== category) return false;
      if (!normalizedQuery) return true;

      const searchableBlob = normalizeText(
        [
          item.startupName.ar,
          item.startupName.en,
          item.serviceTitle.ar,
          item.serviceTitle.en,
          item.city.ar,
          item.city.en,
          getRegionLabel(item.regionId, 'ar'),
          getRegionLabel(item.regionId, 'en'),
          getCategoryLabel(item.categoryId, 'ar'),
          getCategoryLabel(item.categoryId, 'en'),
          item.summary.ar,
          item.summary.en,
          item.idealClient.ar,
          item.idealClient.en,
          ...item.keywords,
        ].join(' ')
      );

      const tokens = normalizedQuery.split(/\s+/).filter((tok) => tok.length >= 2);
      if (tokens.length === 0) return searchableBlob.includes(normalizedQuery);
      return tokens.some((token) => searchableBlob.includes(token));
    });
  };

  const filteredStartups = useMemo(() => {
    const filtered = filterStartups(
      startups,
      activeQuery,
      selectedRegion,
      selectedCategory
    );
    if (sortBy === 'budgetAsc') {
      return [...filtered].sort((a, b) => a.budgetSar - b.budgetSar);
    }
    if (sortBy === 'deliveryAsc') {
      return [...filtered].sort((a, b) => a.deliveryDays - b.deliveryDays);
    }
    return filtered;
  }, [startups, activeQuery, selectedRegion, selectedCategory, sortBy]);

  const acceptedClientsCount = useMemo(
    () => requests.filter((req) => req.status === 'accepted').length,
    [requests]
  );

  const handleToggleLanguage = () => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
    setSearchFeedback(null);
    setAiResult(null);
    setAiSource(null);
  };

  const scrollToElement = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const executeSearch = (rawQuery: string, regionOverride?: RegionId | 'all') => {
    const trimmed = rawQuery.trim();
    const effectiveRegion = regionOverride ?? selectedRegion;

    if (trimmed.length === 0 && effectiveRegion !== 'all') {
      setActiveQuery('');
      setSelectedCategory('all');
      const matches = filterStartups(startups, '', effectiveRegion, 'all');
      setSearchFeedback({
        type: 'success',
        title: t.hero.successFoundTitle,
        message: t.hero.successRegionOnlyMessage(
          matches.length,
          getRegionLabel(effectiveRegion, lang)
        ),
      });
      scrollToElement('directory');
      return;
    }

    if (!isValidSearchTerm(trimmed)) {
      setSearchFeedback({
        type: 'error',
        title: t.hero.errorTitle,
        message: t.hero.errorMessage,
      });
      return;
    }

    setActiveQuery(trimmed);
    setSelectedCategory('all');

    const matches = filterStartups(startups, trimmed, effectiveRegion, 'all');

    if (matches.length > 0) {
      setSearchFeedback({
        type: 'success',
        title: t.hero.successFoundTitle,
        message: t.hero.successFoundMessage(matches.length, trimmed),
      });
    } else {
      setSearchFeedback({
        type: 'success',
        title: t.hero.successEmptyTitle,
        message: t.hero.successEmptyMessage(trimmed),
      });
    }

    scrollToElement('directory');
  };

  const handleAiMatchClick = async (overrideQuery?: string) => {
    const queryToUse =
      typeof overrideQuery === 'string' ? overrideQuery : searchInput;
    if (typeof overrideQuery === 'string') {
      setSearchInput(overrideQuery);
    }

    const trimmed = queryToUse.trim();
    if (trimmed.length < 6 || !isValidSearchTerm(trimmed)) {
      setAiResult(null);
      setAiSource(null);
      setSearchFeedback({
        type: 'error',
        title: t.hero.aiShortInputErrorTitle,
        message: t.hero.aiShortInputErrorMessage,
      });
      return;
    }

    setAiLoading(true);
    setSearchFeedback(null);

    try {
      const result = await requestAiStartupMatch({
        needDescription: trimmed,
        regionId: selectedRegion,
        lang,
        startups,
      });
      setAiResult(result);
      setAiSource('gemini');
      window.setTimeout(() => scrollToElement('smart-match-results'), 80);
    } catch (err: unknown) {
      setAiResult(null);
      setAiSource(null);
      const message =
        err instanceof Error && err.message
          ? err.message
          : t.hero.aiErrorTitle;
      setSearchFeedback({
        type: 'error',
        title: t.hero.aiErrorTitle,
        message,
        retryable: true,
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleInstantDirectoryMatch = () => {
    const trimmed = searchInput.trim();
    if (trimmed.length < 6 || !isValidSearchTerm(trimmed)) {
      setSearchFeedback({
        type: 'error',
        title: t.hero.aiShortInputErrorTitle,
        message: t.hero.aiShortInputErrorMessage,
      });
      return;
    }

    const result = buildDirectorySmartMatch({
      needDescription: trimmed,
      regionId: selectedRegion,
      lang,
      startups,
    });
    setSearchFeedback(null);
    setAiResult(result);
    setAiSource('directory');
    window.setTimeout(() => scrollToElement('smart-match-results'), 80);
  };

  const handleCompareRecommended = (startupIds: string[]) => {
    if (startupIds.length >= 2) {
      setCompareIds(startupIds.slice(0, 3));
      scrollToElement('compare');
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    executeSearch(searchInput);
  };

  const handleQuickSearch = (term: string) => {
    setSearchInput(term);
    executeSearch(term);
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setActiveQuery('');
    setSelectedRegion('all');
    setSelectedCategory('all');
    setSortBy('featured');
    setSearchFeedback(null);
    setAiResult(null);
    setAiSource(null);
  };

  const handleFocusSearch = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 250);
  };

  const handleRequestStartup = (
    startup: StartupService,
    carryNeed = false
  ) => {
    setSelectedStartup(startup);
    setWorkspaceTab('client');
    if (carryNeed && searchInput.trim().length >= 6) {
      setPrefilledNeed(searchInput.trim());
      setPrefilledNeedKey((k) => k + 1);
    }
    scrollToElement('workspace');
  };

  const handleJumpToClientForm = () => {
    setSelectedStartup(null);
    setWorkspaceTab('client');
    scrollToElement('workspace');
  };

  const handleToggleCompare = (startupId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(startupId)) {
        if (prev.length <= 2) return prev;
        return prev.filter((id) => id !== startupId);
      }
      if (prev.length < 3) {
        return [...prev, startupId];
      }
      return [prev[0], prev[1], startupId];
    });
  };

  const handleChangeCompareSlot = (slotIndex: number, startupId: string) => {
    setCompareIds((prev) => {
      const next = [...prev];
      const existingIdx = next.indexOf(startupId);
      if (existingIdx !== -1 && existingIdx !== slotIndex) {
        next[existingIdx] = next[slotIndex];
      }
      next[slotIndex] = startupId;
      return next;
    });
  };

  const handleSwapCompareColumns = () => {
    setCompareIds((prev) => {
      if (prev.length < 2) return prev;
      const next = [...prev];
      const first = next[0];
      next[0] = next[1];
      next[1] = first;
      return next;
    });
  };

  const handleToggleThirdSlot = () => {
    setCompareIds((prev) => {
      if (prev.length >= 3) {
        return prev.slice(0, 2);
      }
      const nextUnused =
        startups.find((s) => !prev.includes(s.id)) ?? startups[0];
      return [...prev, nextUnused.id];
    });
  };

  const handleAddStartup = (newService: StartupService) => {
    setStartups((prev) => [newService, ...prev]);
    setSelectedCategory('all');
    setSelectedRegion('all');
    setActiveQuery('');
    setSortBy('featured');
  };

  const handleCompareNewStartup = (startupId: string) => {
    setCompareIds((prev) => {
      const second = prev.find((id) => id !== startupId) ?? startups[0]?.id;
      return second ? [startupId, second] : [startupId];
    });
    scrollToElement('compare');
  };

  const handleAddClientRequest = (payload: {
    clientName: string;
    categoryId: CategoryId;
    regionId: RegionId;
    needDescription: string;
    budgetRange: string;
    targetStartupName?: StartupService['startupName'];
  }): number => {
    const matched = startups.filter(
      (s) => s.categoryId === payload.categoryId
    ).length;

    const newRequest: ClientRequest = {
      id: `req-${Date.now()}`,
      clientName: { ar: payload.clientName, en: payload.clientName },
      categoryId: payload.categoryId,
      regionId: payload.regionId,
      needDescription: {
        ar: payload.needDescription,
        en: payload.needDescription,
      },
      budgetRange: { ar: payload.budgetRange, en: payload.budgetRange },
      targetStartupName: payload.targetStartupName,
      matchedCount: matched,
      status: 'pending',
      submittedLabel: { ar: 'الآن', en: 'Just now' },
    };

    setRequests((prev) => [newRequest, ...prev]);
    return matched;
  };

  const handleUpdateDecision = (
    requestId: string,
    status: ClientDecisionStatus
  ) => {
    setRequests((prev) =>
      prev.map((req) => (req.id === requestId ? { ...req, status } : req))
    );
  };

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f]">
      <Header
        lang={lang}
        onToggleLanguage={handleToggleLanguage}
        onFocusSearch={handleFocusSearch}
      />

      <main>
        <HeroSearchSection
          lang={lang}
          searchInput={searchInput}
          onSearchInputChange={(value) => {
            setSearchInput(value);
            if (searchFeedback?.type === 'error' && isValidSearchTerm(value)) {
              setSearchFeedback(null);
            }
          }}
          selectedRegion={selectedRegion}
          onSelectRegion={setSelectedRegion}
          onSearchSubmit={handleSearchSubmit}
          onAiMatchClick={handleAiMatchClick}
          onInstantDirectoryMatch={handleInstantDirectoryMatch}
          aiLoading={aiLoading}
          aiResult={aiResult}
          aiSource={aiSource}
          onDismissAiResult={() => {
            setAiResult(null);
            setAiSource(null);
          }}
          allStartups={startups}
          onCompareRecommended={handleCompareRecommended}
          onViewDetails={setDetailStartup}
          onRequestStartup={handleRequestStartup}
          onQuickSearch={handleQuickSearch}
          onClearSearch={handleResetFilters}
          activeQuery={activeQuery}
          feedback={searchFeedback}
          searchInputRef={searchInputRef}
          totalStartups={startups.length}
          regionsCount={REGIONS.length}
          requestsCount={requests.length}
          acceptedClientsCount={acceptedClientsCount}
        />

        <StartupDirectory
          lang={lang}
          allStartups={startups}
          filteredStartups={filteredStartups}
          selectedRegion={selectedRegion}
          onSelectRegion={setSelectedRegion}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          sortBy={sortBy}
          onSortChange={setSortBy}
          activeQuery={activeQuery}
          onResetFilters={handleResetFilters}
          onViewDetails={setDetailStartup}
          onRequestStartup={(startup) => handleRequestStartup(startup, false)}
          onJumpToClientForm={handleJumpToClientForm}
          compareIds={compareIds}
          onToggleCompare={handleToggleCompare}
          onJumpToCompare={() => scrollToElement('compare')}
        />

        <AppleCompareSection
          lang={lang}
          startups={startups}
          compareIds={compareIds}
          onChangeCompareSlot={handleChangeCompareSlot}
          onSwapColumns={handleSwapCompareColumns}
          onToggleThirdSlot={handleToggleThirdSlot}
          onRequestStartup={(startup) => handleRequestStartup(startup, false)}
        />

        {/* Editorial 3-Step Mechanism Section */}
        <section
          id="how-it-works"
          className="border-b border-[#d2d2d7]/70 bg-[#f5f5f7] py-16 lg:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-[#1d1d1f] sm:text-4xl">
                {t.howItWorks.title}
              </h2>
              <p className="mt-2.5 text-base leading-relaxed text-[#6e6e73]">
                {t.howItWorks.subtitle}
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 border-t border-[#d2d2d7]/80 pt-8 md:grid-cols-3">
              {t.howItWorks.steps.map((step) => (
                <div key={step.num}>
                  <p className="text-sm font-bold tabular-nums text-[#0066cc]">
                    {step.num}
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-[#1d1d1f]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <MatchingWorkspace
          lang={lang}
          activeTab={workspaceTab}
          onTabChange={setWorkspaceTab}
          selectedStartup={selectedStartup}
          onClearSelectedStartup={() => setSelectedStartup(null)}
          prefilledNeed={prefilledNeed}
          prefilledNeedKey={prefilledNeedKey}
          onAddStartup={handleAddStartup}
          onCompareNewStartup={handleCompareNewStartup}
          requests={requests}
          onAddClientRequest={handleAddClientRequest}
          onUpdateDecision={handleUpdateDecision}
        />
      </main>

      <footer className="border-t border-[#d2d2d7]/80 bg-[#f5f5f7]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-[#6e6e73] sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <LahaLogo className="h-6 w-6" />
            <span className="text-base font-bold text-[#1d1d1f]">
              {t.brandName}
            </span>
            <span aria-hidden="true" className="text-[#d2d2d7]">
              ·
            </span>
            <span>{t.brandTagline}</span>
          </div>

          <p className="text-xs text-[#6e6e73]">{t.footer.note}</p>
        </div>
      </footer>

      <StartupDetailModal
        lang={lang}
        startup={detailStartup}
        isInCompare={
          detailStartup ? compareIds.includes(detailStartup.id) : false
        }
        onClose={() => setDetailStartup(null)}
        onToggleCompare={handleToggleCompare}
        onRequestStartup={(startup) => handleRequestStartup(startup, false)}
      />
    </div>
  );
}
