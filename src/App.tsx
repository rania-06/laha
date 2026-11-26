import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Compass, RefreshCw } from 'lucide-react';
import { AppleCompareSection } from './components/AppleCompareSection';
import { AuthOnboardingModal } from './components/AuthOnboardingModal';
import { Header } from './components/Header';
import {
  HeroSearchSection,
  type SearchFeedback,
  type SmartMatchSource,
} from './components/HeroSearchSection';
import { LahaLogo } from './components/LahaLogo';
import { ManagementDashboard } from './components/ManagementDashboard';
import {
  MatchingWorkspace,
  type WorkspaceTab,
} from './components/MatchingWorkspace';
import { SmartAdvisorDrawer } from './components/SmartAdvisorDrawer';
import { StartupChatModal } from './components/StartupChatModal';
import { StartupDetailModal } from './components/StartupDetailModal';
import {
  StartupDirectory,
  type SortOption,
} from './components/StartupDirectory';
import { StartupEditorModal } from './components/StartupEditorModal';
import { useAuth } from './context/AuthContext';
import {
  INITIAL_STARTUPS,
  REGIONS,
  getCategoryLabel,
  getRegionLabel,
  type CategoryId,
  type ClientRequest,
  type Conversation,
  type RegionId,
  type StartupService,
} from './data/startups';
import { UI_COPY, type Language } from './i18n/translations';
import {
  requestAiStartupMatch,
  type AiMatchResult,
} from './services/aiMatchService';
import {
  createClientRequest,
  createStartupService,
  decideClientRequest,
  deleteClientRequest,
  deleteStartupService,
  seedInitialStartupsIfEmpty,
  subscribeToStartups,
  subscribeToUserConversations,
  subscribeToUserRequests,
  updateClientRequestBrief,
  updateStartupService,
  type StartupMutationInput,
} from './services/firestoreService';
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

const DEMO_FALLBACK_STARTUPS: StartupService[] = INITIAL_STARTUPS.map((s) => ({
  ...s,
  isSeedDemo: true,
}));

export default function App() {
  const { user, profile, isAdmin, authLoading } = useAuth();

  const [lang, setLang] = useState<Language>('ar');
  const [activeView, setActiveView] = useState<'marketplace' | 'dashboard'>(
    'marketplace'
  );

  // Live Firestore state
  const [firestoreStartups, setFirestoreStartups] = useState<StartupService[] | null>(
    null
  );
  const [startupsLoading, setStartupsLoading] = useState(true);
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  // Search, Filters & AI Match state
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<RegionId | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [searchFeedback, setSearchFeedback] = useState<SearchFeedback | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiMatchResult | null>(null);
  const [aiSource, setAiSource] = useState<SmartMatchSource | null>(null);

  // Comparison, Smart Advisor, Direct Chat & Modals
  const [compareIds, setCompareIds] = useState<string[]>([
    INITIAL_STARTUPS[0].id,
    INITIAL_STARTUPS[1].id,
  ]);
  const [detailStartup, setDetailStartup] = useState<StartupService | null>(null);
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [chatModal, setChatModal] = useState<{
    open: boolean;
    startup: StartupService | null;
    conversation: Conversation | null;
  }>({ open: false, startup: null, conversation: null });
  const [pendingChatStartupId, setPendingChatStartupId] = useState<string | null>(
    null
  );
  const [authModal, setAuthModal] = useState<{
    open: boolean;
    reason: 'startup' | 'client' | 'dashboard' | 'message' | 'general';
  }>({ open: false, reason: 'general' });
  const [editorModal, setEditorModal] = useState<{
    open: boolean;
    startup: StartupService | null;
  }>({ open: false, startup: null });

  // Workspace state
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('startup');
  const [selectedStartup, setSelectedStartup] = useState<StartupService | null>(null);
  const [prefilledNeed, setPrefilledNeed] = useState('');
  const [prefilledNeedKey, setPrefilledNeedKey] = useState(0);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const seededAttemptedRef = useRef(false);

  // Effective startups list: live Firestore docs if present, otherwise curated demo catalog
  const startups = useMemo<StartupService[]>(() => {
    if (firestoreStartups && firestoreStartups.length > 0) {
      return firestoreStartups;
    }
    return DEMO_FALLBACK_STARTUPS;
  }, [firestoreStartups]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title =
      lang === 'ar'
        ? 'لها — ملتقى الشركات الناشئة والعملاء'
        : 'Laha — Startups & Clients Marketplace';
  }, [lang]);

  const hasOpenOverlay =
    advisorOpen ||
    chatModal.open ||
    Boolean(detailStartup) ||
    authModal.open ||
    editorModal.open;

  // Lock background page scroll while any modal or drawer is active
  useEffect(() => {
    if (!hasOpenOverlay) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [hasOpenOverlay]);

  // 1. Subscribe to public startups collection
  useEffect(() => {
    setStartupsLoading(true);
    setDataError(null);
    const unsub = subscribeToStartups(
      (items) => {
        setFirestoreStartups(items);
        setStartupsLoading(false);
      },
      () => {
        setStartupsLoading(false);
        setDataError('startups');
      }
    );
    return () => unsub();
  }, [retryToken]);

  // 2. Auto-seed Firestore with the 8 curated regional startups once an authenticated user logs in and collection is empty
  useEffect(() => {
    if (
      !user ||
      authLoading ||
      startupsLoading ||
      firestoreStartups === null ||
      firestoreStartups.length > 0 ||
      seededAttemptedRef.current
    ) {
      return;
    }
    seededAttemptedRef.current = true;
    seedInitialStartupsIfEmpty(user.uid).catch((err) => {
      console.warn('[Laha] Initial startup seed skipped:', err);
      seededAttemptedRef.current = false;
    });
  }, [user, authLoading, startupsLoading, firestoreStartups]);

  // 3. Subscribe to scoped client/startup requests only when signed in
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRequests([]);
      setRequestsLoading(false);
      return;
    }

    setRequestsLoading(true);
    const unsub = subscribeToUserRequests(
      user.uid,
      isAdmin,
      (items) => {
        setRequests(items);
        setRequestsLoading(false);
      },
      () => {
        setRequestsLoading(false);
        setDataError('requests');
      }
    );
    return () => unsub();
  }, [user, isAdmin, authLoading, retryToken]);

  // 4. Subscribe to user's direct messaging conversations when signed in
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setConversations([]);
      return;
    }

    const unsub = subscribeToUserConversations(
      user.uid,
      isAdmin,
      (items) => {
        setConversations(items);
      },
      () => {
        // Non-blocking: conversations fallback quietly if rules/network momentarily hiccup
      }
    );
    return () => unsub();
  }, [user, isAdmin, authLoading, retryToken]);

  // Keep user out of dashboard view if they sign out
  useEffect(() => {
    if (!authLoading && !user && activeView === 'dashboard') {
      setActiveView('marketplace');
    }
    if (!authLoading && !user && chatModal.open) {
      setChatModal({ open: false, startup: null, conversation: null });
    }
  }, [authLoading, user, activeView, chatModal.open]);

  // Complete pending auth modal intent once user finishes signing in & onboarding
  useEffect(() => {
    if (authModal.open && user && profile) {
      const targetReason = authModal.reason;
      setAuthModal({ open: false, reason: 'general' });
      if (targetReason === 'dashboard') {
        setActiveView('dashboard');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (targetReason === 'message' && pendingChatStartupId) {
        const target =
          startups.find((s) => s.id === pendingChatStartupId) ?? null;
        setPendingChatStartupId(null);
        if (target) {
          setChatModal({ open: true, startup: target, conversation: null });
        }
      }
    }
  }, [authModal.open, authModal.reason, user, profile, pendingChatStartupId, startups]);

  // Keep compareIds valid whenever startups list changes (e.g. deletion)
  useEffect(() => {
    if (startups.length === 0) return;
    const validSet = new Set(startups.map((s) => s.id));
    setCompareIds((prev) => {
      const kept = prev.filter((id) => validSet.has(id));
      if (kept.length >= 2 || kept.length === startups.length) {
        return kept.length === prev.length ? prev : kept;
      }
      const next = [...kept];
      for (const s of startups) {
        if (!next.includes(s.id)) next.push(s.id);
        if (next.length >= Math.min(2, startups.length)) break;
      }
      return next;
    });
  }, [startups]);

  // Keep detail modal and active chat modal synced with live startup edits/seeding
  useEffect(() => {
    if (detailStartup) {
      const updated = startups.find((s) => s.id === detailStartup.id) ?? null;
      if (updated !== detailStartup) {
        setDetailStartup(updated);
      }
    }
    if (chatModal.open && chatModal.startup) {
      const updatedChatStartup =
        startups.find((s) => s.id === chatModal.startup!.id) ?? null;
      if (updatedChatStartup && updatedChatStartup !== chatModal.startup) {
        setChatModal((prev) => ({ ...prev, startup: updatedChatStartup }));
      }
    }
  }, [startups, detailStartup, chatModal.open, chatModal.startup]);

  // Keep open chat conversation synced with live conversation updates
  useEffect(() => {
    if (!chatModal.open || !chatModal.conversation) return;
    const updatedConv =
      conversations.find((c) => c.id === chatModal.conversation!.id) ?? null;
    if (updatedConv && updatedConv !== chatModal.conversation) {
      setChatModal((prev) => ({ ...prev, conversation: updatedConv }));
    }
  }, [conversations, chatModal.open, chatModal.conversation]);

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

  const handleOpenAuth = (
    reason: 'startup' | 'client' | 'dashboard' | 'message' | 'general' = 'general'
  ) => {
    setAuthModal({ open: true, reason });
  };

  const handleMessageStartup = (startup: StartupService) => {
    if (!user) {
      setPendingChatStartupId(startup.id);
      handleOpenAuth('message');
      return;
    }
    setChatModal({ open: true, startup, conversation: null });
  };

  const handleOpenConversation = (conversation: Conversation) => {
    const matchedStartup =
      startups.find((s) => s.id === conversation.startupId) ?? null;
    setChatModal({
      open: true,
      startup: matchedStartup,
      conversation,
    });
  };

  const handleNavigateView = (view: 'marketplace' | 'dashboard') => {
    if (view === 'dashboard' && !user) {
      handleOpenAuth('dashboard');
      return;
    }
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (activeView !== 'marketplace') {
      setActiveView('marketplace');
    }
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
    if (activeView !== 'marketplace') {
      setActiveView('marketplace');
      window.setTimeout(() => scrollToElement('workspace'), 100);
    } else {
      scrollToElement('workspace');
    }
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
      return nextUnused ? [...prev, nextUnused.id] : prev;
    });
  };

  // ============================================================================
  // Firestore CRUD Handlers
  // ============================================================================

  const handleAddStartup = async (
    input: StartupMutationInput
  ): Promise<StartupService> => {
    if (!user) {
      handleOpenAuth('startup');
      throw new Error('Authentication required');
    }
    const created = await createStartupService(user.uid, input);
    setSelectedCategory('all');
    setSelectedRegion('all');
    setActiveQuery('');
    setSortBy('featured');
    return created;
  };

  const handleSaveStartupModal = async (
    input: StartupMutationInput,
    editingId?: string
  ) => {
    if (!user) {
      handleOpenAuth('startup');
      throw new Error('Authentication required');
    }
    if (editingId) {
      await updateStartupService(editingId, input);
    } else {
      await createStartupService(user.uid, input);
    }
  };

  const handleDeleteStartup = async (startupId: string) => {
    await deleteStartupService(startupId);
    if (detailStartup?.id === startupId) {
      setDetailStartup(null);
    }
    if (selectedStartup?.id === startupId) {
      setSelectedStartup(null);
    }
  };

  const handleCompareNewStartup = (startupId: string) => {
    setCompareIds((prev) => {
      const second = prev.find((id) => id !== startupId) ?? startups[0]?.id;
      return second ? [startupId, second] : [startupId];
    });
    scrollToElement('compare');
  };

  const handleAddClientRequest = async (payload: {
    clientName: string;
    clientContact: string;
    categoryId: CategoryId;
    regionId: RegionId;
    needDescription: string;
    budgetRange: string;
    targetStartup: StartupService;
  }): Promise<number> => {
    if (!user) {
      handleOpenAuth('client');
      throw new Error('Authentication required');
    }
    const matched = startups.filter(
      (s) => s.categoryId === payload.categoryId
    ).length;

    await createClientRequest({
      clientUid: user.uid,
      clientName: payload.clientName,
      clientContact: payload.clientContact,
      categoryId: payload.categoryId,
      regionId: payload.regionId,
      needDescription: payload.needDescription,
      budgetRange: payload.budgetRange,
      targetStartup: payload.targetStartup,
      matchedCount: matched,
    });

    return matched;
  };

  const handleEditClientRequest = async (
    requestId: string,
    updates: {
      clientName: string;
      clientContact: string;
      categoryId: CategoryId;
      regionId: RegionId;
      needDescription: string;
      budgetRange: string;
    }
  ) => {
    await updateClientRequestBrief(requestId, updates);
  };

  const handleDeleteClientRequest = async (requestId: string) => {
    await deleteClientRequest(requestId);
  };

  const handleUpdateDecision = async (
    requestId: string,
    status: 'accepted' | 'declined',
    decisionNote: string
  ) => {
    if (!user) {
      handleOpenAuth('startup');
      throw new Error('Authentication required');
    }
    await decideClientRequest(requestId, user.uid, status, decisionNote);
  };

  const canEditStartup = (startup: StartupService | null) =>
    Boolean(
      startup &&
        user &&
        !startup.isSeedDemo &&
        (isAdmin || startup.ownerId === user.uid)
    );

  return (
    <div className="min-h-screen bg-white text-[#1d1d1f] transition-colors duration-200 dark:bg-black dark:text-[#f5f5f7]">
      <Header
        lang={lang}
        activeView={activeView}
        onNavigateView={handleNavigateView}
        onToggleLanguage={handleToggleLanguage}
        onFocusSearch={handleFocusSearch}
        onOpenAuth={handleOpenAuth}
        onOpenAdvisor={() => setAdvisorOpen(true)}
      />

      {dataError && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-900/60 dark:bg-amber-950/40">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-200 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
              <span>
                {lang === 'ar'
                  ? 'تعذّر الاتصال المباشر بقاعدة البيانات مؤقتًا. يتم عرض البيانات المتاحة حاليًا.'
                  : 'Temporary issue syncing with the live database. Showing available listings.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRetryToken((prev) => prev + 1)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1 font-semibold text-amber-950 hover:bg-amber-100 dark:border-amber-700 dark:bg-[#1c1c1e] dark:text-amber-200 dark:hover:bg-amber-900/40 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
            </button>
          </div>
        </div>
      )}

      <main>
        {activeView === 'dashboard' && user ? (
          <ManagementDashboard
            lang={lang}
            startups={startups}
            requests={requests}
            conversations={conversations}
            loadingData={startupsLoading || requestsLoading}
            onBackToMarketplace={() => setActiveView('marketplace')}
            onViewStartup={setDetailStartup}
            onOpenCreateStartup={() =>
              setEditorModal({ open: true, startup: null })
            }
            onOpenEditStartup={(startup) =>
              setEditorModal({ open: true, startup })
            }
            onDeleteStartup={handleDeleteStartup}
            onDecideRequest={handleUpdateDecision}
            onEditClientRequest={handleEditClientRequest}
            onDeleteClientRequest={handleDeleteClientRequest}
            onCompareStartup={handleCompareNewStartup}
            onOpenConversation={handleOpenConversation}
          />
        ) : (
          <>
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
              onMessageStartup={handleMessageStartup}
              onOpenAdvisor={() => setAdvisorOpen(true)}
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
              loading={startupsLoading}
              currentUserId={user?.uid}
              isAdmin={isAdmin}
              selectedRegion={selectedRegion}
              onSelectRegion={setSelectedRegion}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              sortBy={sortBy}
              onSortChange={setSortBy}
              activeQuery={activeQuery}
              onResetFilters={handleResetFilters}
              onViewDetails={setDetailStartup}
              onEditStartup={(startup) =>
                setEditorModal({ open: true, startup })
              }
              onRequestStartup={(startup) => handleRequestStartup(startup, false)}
              onMessageStartup={handleMessageStartup}
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
              onMessageStartup={handleMessageStartup}
            />

            {/* Editorial 3-Step Mechanism Section */}
            <section
              id="how-it-works"
              className="border-b border-[#d2d2d7]/70 bg-[#f5f5f7] py-12 sm:py-16 lg:py-24 dark:border-[#2c2c2e] dark:bg-[#111113]"
            >
              <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl">
                  <h2 className="text-2xl font-bold tracking-tight text-[#1d1d1f] sm:text-4xl dark:text-[#f5f5f7]">
                    {t.howItWorks.title}
                  </h2>
                  <p className="mt-2.5 text-base leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                    {t.howItWorks.subtitle}
                  </p>
                </div>

                <div className="mt-10 grid grid-cols-1 gap-8 border-t border-[#d2d2d7]/80 pt-8 md:grid-cols-3 dark:border-[#2c2c2e]">
                  {t.howItWorks.steps.map((step) => (
                    <div key={step.num}>
                      <p className="text-sm font-bold tabular-nums text-[#0066cc] dark:text-[#2997ff]">
                        {step.num}
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
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
              startups={startups}
              selectedStartup={selectedStartup}
              onClearSelectedStartup={() => setSelectedStartup(null)}
              prefilledNeed={prefilledNeed}
              prefilledNeedKey={prefilledNeedKey}
              onAddStartup={handleAddStartup}
              onCompareNewStartup={handleCompareNewStartup}
              requests={requests}
              onAddClientRequest={handleAddClientRequest}
              onUpdateDecision={handleUpdateDecision}
              onRequireAuth={handleOpenAuth}
              onOpenDashboard={() => handleNavigateView('dashboard')}
            />
          </>
        )}
      </main>

      <footer className="border-t border-[#d2d2d7]/80 bg-[#f5f5f7] dark:border-[#2c2c2e] dark:bg-[#111113]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 pt-8 pb-20 text-sm text-[#515154] sm:flex-row sm:items-center sm:px-6 sm:py-8 lg:px-8 dark:text-[#a1a1a6]">
          <div className="flex flex-wrap items-center gap-2.5">
            <LahaLogo className="h-6 w-6 shrink-0" />
            <span className="text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
              {t.brandName}
            </span>
            <span aria-hidden="true" className="text-[#d2d2d7] dark:text-[#38383a]">
              ·
            </span>
            <span>{t.brandTagline}</span>
          </div>

          <p className="text-xs text-[#515154] dark:text-[#a1a1a6]">
            {t.footer.note}
          </p>
        </div>
      </footer>

      {/* Compact Apple-style Floating Smart Advisor Trigger */}
      {!hasOpenOverlay && (
        <button
          type="button"
          onClick={() => setAdvisorOpen(true)}
          aria-label={lang === 'ar' ? 'فتح مستشارك الذكي' : 'Open Smart Advisor'}
          className="fixed bottom-4 end-4 z-30 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#1d1d1f] px-4 py-2.5 text-xs font-semibold text-white shadow-xl transition-transform duration-150 hover:scale-[1.02] hover:bg-black dark:bg-[#f5f5f7] dark:text-[#1d1d1f] dark:hover:bg-white sm:bottom-5 sm:end-5 sm:min-h-12 sm:px-5 sm:py-3 sm:text-sm cursor-pointer"
        >
          <Compass className="h-4 w-4 text-[#2997ff] dark:text-[#0071e3]" aria-hidden="true" />
          <span>{lang === 'ar' ? 'مستشارك الذكي' : 'Smart Advisor'}</span>
        </button>
      )}

      <SmartAdvisorDrawer
        lang={lang}
        isOpen={advisorOpen}
        startups={startups}
        selectedRegion={selectedRegion}
        onClose={() => setAdvisorOpen(false)}
        onViewStartup={setDetailStartup}
        onMessageStartup={handleMessageStartup}
        onRequestStartup={(startup) => handleRequestStartup(startup, false)}
      />

      <StartupChatModal
        lang={lang}
        isOpen={chatModal.open}
        startup={chatModal.startup}
        conversation={chatModal.conversation}
        allConversations={conversations}
        onClose={() =>
          setChatModal({ open: false, startup: null, conversation: null })
        }
      />

      <StartupDetailModal
        lang={lang}
        startup={detailStartup}
        isInCompare={
          detailStartup ? compareIds.includes(detailStartup.id) : false
        }
        canEdit={canEditStartup(detailStartup)}
        onClose={() => setDetailStartup(null)}
        onEdit={(startup) => {
          setDetailStartup(null);
          setEditorModal({ open: true, startup });
        }}
        onToggleCompare={handleToggleCompare}
        onRequestStartup={(startup) => handleRequestStartup(startup, false)}
        onMessageStartup={handleMessageStartup}
      />

      <AuthOnboardingModal
        lang={lang}
        isOpen={authModal.open}
        reason={authModal.reason}
        onClose={() => {
          setAuthModal({ open: false, reason: 'general' });
          setPendingChatStartupId(null);
        }}
      />

      <StartupEditorModal
        lang={lang}
        isOpen={editorModal.open}
        editingStartup={editorModal.startup}
        defaultStartupName={profile?.organizationName || ''}
        defaultRegionId={profile?.regionId || 'riyadh'}
        defaultContact={profile?.contactInfo || ''}
        onClose={() => setEditorModal({ open: false, startup: null })}
        onSave={handleSaveStartupModal}
      />
    </div>
  );
}
