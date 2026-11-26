import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Inbox,
  Loader2,
  LogOut,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORIES,
  REGIONS,
  getCategoryLabel,
  getRegionLabel,
  type AccountType,
  type CategoryId,
  type ClientDecisionStatus,
  type ClientRequest,
  type Conversation,
  type RegionId,
  type StartupService,
} from '../data/startups';
import { useAuth } from '../context/AuthContext';
import { UI_COPY, type Language } from '../i18n/translations';

export type DashboardSection = 'services' | 'messages' | 'incoming' | 'sent' | 'account';

interface ManagementDashboardProps {
  lang: Language;
  startups: StartupService[];
  requests: ClientRequest[];
  conversations: Conversation[];
  loadingData: boolean;
  onBackToMarketplace: () => void;
  onViewStartup: (startup: StartupService) => void;
  onOpenCreateStartup: () => void;
  onOpenEditStartup: (startup: StartupService) => void;
  onDeleteStartup: (startupId: string) => Promise<void>;
  onDecideRequest: (
    requestId: string,
    status: 'accepted' | 'declined',
    decisionNote: string
  ) => Promise<void>;
  onEditClientRequest: (
    requestId: string,
    updates: {
      clientName: string;
      clientContact: string;
      categoryId: CategoryId;
      regionId: RegionId;
      needDescription: string;
      budgetRange: string;
    }
  ) => Promise<void>;
  onDeleteClientRequest: (requestId: string) => Promise<void>;
  onCompareStartup: (startupId: string) => void;
  onOpenConversation: (conversation: Conversation) => void;
}

export function ManagementDashboard({
  lang,
  startups,
  requests,
  conversations,
  loadingData,
  onBackToMarketplace,
  onViewStartup,
  onOpenCreateStartup,
  onOpenEditStartup,
  onDeleteStartup,
  onDecideRequest,
  onEditClientRequest,
  onDeleteClientRequest,
  onCompareStartup,
  onOpenConversation,
}: ManagementDashboardProps) {
  const { user, profile, isAdmin, saveUserProfile, signOutUser } = useAuth();
  const isAr = lang === 'ar';
  const BackArrow = isAr ? ArrowRight : ArrowLeft;
  const budgets = UI_COPY[lang].workspace.clientForm.budgets;

  const isStartupAccount = profile?.accountType === 'startup' || isAdmin;
  const [activeTab, setActiveTab] = useState<DashboardSection>(
    isStartupAccount ? 'services' : 'sent'
  );
  const [statusFilter, setStatusFilter] = useState<ClientDecisionStatus | 'all'>('all');

  // Inline confirmation & mutation state
  const [confirmDeleteStartupId, setConfirmDeleteStartupId] = useState<string | null>(null);
  const [busyStartupId, setBusyStartupId] = useState<string | null>(null);

  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [confirmDeleteRequestId, setConfirmDeleteRequestId] = useState<string | null>(null);

  // Edit client request inline state
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editClientName, setEditClientName] = useState('');
  const [editClientContact, setEditClientContact] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<CategoryId>('tech');
  const [editRegionId, setEditRegionId] = useState<RegionId>('riyadh');
  const [editBudgetRange, setEditBudgetRange] = useState<string>(budgets[1]);
  const [editNeedDescription, setEditNeedDescription] = useState('');

  // Profile editor state
  const [profName, setProfName] = useState(profile?.displayName || user?.displayName || '');
  const [profType, setProfType] = useState<AccountType>(profile?.accountType || 'startup');
  const [profOrg, setProfOrg] = useState(profile?.organizationName || '');
  const [profRegion, setProfRegion] = useState<RegionId>(profile?.regionId || 'riyadh');
  const [profContact, setProfContact] = useState(profile?.contactInfo || '');
  const [profSaving, setProfSaving] = useState(false);

  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const myStartups = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return startups.filter((s) => !s.isSeedDemo);
    return startups.filter((s) => s.ownerId === user.uid);
  }, [startups, user, isAdmin]);

  const incomingRequests = useMemo(() => {
    if (!user) return [];
    const base = isAdmin
      ? requests
      : requests.filter((r) => r.targetStartupOwnerId === user.uid);
    return statusFilter === 'all' ? base : base.filter((r) => r.status === statusFilter);
  }, [requests, user, isAdmin, statusFilter]);

  const sentRequests = useMemo(() => {
    if (!user) return [];
    const base = requests.filter((r) => r.clientUid === user.uid);
    return statusFilter === 'all' ? base : base.filter((r) => r.status === statusFilter);
  }, [requests, user, statusFilter]);

  const totalIncomingCount = useMemo(() => {
    if (!user) return 0;
    return isAdmin
      ? requests.length
      : requests.filter((r) => r.targetStartupOwnerId === user.uid).length;
  }, [requests, user, isAdmin]);

  const totalSentCount = useMemo(
    () => (user ? requests.filter((r) => r.clientUid === user.uid).length : 0),
    [requests, user]
  );

  const approvedCount = useMemo(
    () => requests.filter((r) => r.status === 'accepted').length,
    [requests]
  );

  const handleConfirmDeleteStartup = async (startupId: string) => {
    setBusyStartupId(startupId);
    setNotice(null);
    try {
      await onDeleteStartup(startupId);
      setConfirmDeleteStartupId(null);
      setNotice({
        type: 'success',
        text: isAr ? 'تم حذف الخدمة من الدليل بنجاح.' : 'Service deleted from directory.',
      });
    } catch {
      setNotice({
        type: 'error',
        text: isAr
          ? 'تعذّر حذف الخدمة حاليًا. حاول مجددًا.'
          : 'Could not delete the service right now.',
      });
    } finally {
      setBusyStartupId(null);
    }
  };

  const handleDecision = async (req: ClientRequest, status: 'accepted' | 'declined') => {
    setBusyRequestId(req.id);
    setNotice(null);
    try {
      await onDecideRequest(req.id, status, decisionNotes[req.id] ?? '');
      setNotice({
        type: 'success',
        text:
          status === 'accepted'
            ? isAr
              ? `تم اعتماد طلب «${req.clientName[lang]}» بنجاح.`
              : `Approved match request from “${req.clientName[lang]}”.`
            : isAr
              ? `تم تحديث طلب «${req.clientName[lang]}» إلى غير مناسب.`
              : `Marked “${req.clientName[lang]}” as declined.`,
      });
    } catch {
      setNotice({
        type: 'error',
        text: isAr
          ? 'تعذّر حفظ القرار. تأكد أن الطلب لا يزال قيد المراجعة.'
          : 'Could not save decision. Ensure the request is still pending.',
      });
    } finally {
      setBusyRequestId(null);
    }
  };

  const startEditingRequest = (req: ClientRequest) => {
    setEditingRequestId(req.id);
    setEditClientName(req.clientName[lang]);
    setEditClientContact(req.clientContact || '');
    setEditCategoryId(req.categoryId);
    setEditRegionId(req.regionId);
    setEditBudgetRange(req.budgetRange[lang]);
    setEditNeedDescription(req.needDescription[lang]);
    setNotice(null);
  };

  const handleSaveRequestEdit = async (e: FormEvent, requestId: string) => {
    e.preventDefault();
    if (editClientName.trim().length < 2 || editNeedDescription.trim().length < 10) {
      setNotice({
        type: 'error',
        text: isAr
          ? 'يرجى كتابة اسم العميل (حرفان على الأقل) ووصف الاحتياج (10 أحرف على الأقل).'
          : 'Please enter client name (min 2 chars) and need description (min 10 chars).',
      });
      return;
    }

    setBusyRequestId(requestId);
    setNotice(null);
    try {
      await onEditClientRequest(requestId, {
        clientName: editClientName.trim(),
        clientContact: editClientContact.trim(),
        categoryId: editCategoryId,
        regionId: editRegionId,
        needDescription: editNeedDescription.trim(),
        budgetRange: editBudgetRange,
      });
      setEditingRequestId(null);
      setNotice({
        type: 'success',
        text: isAr ? 'تم تحديث بيانات طلبك بنجاح.' : 'Your request has been updated.',
      });
    } catch {
      setNotice({
        type: 'error',
        text: isAr
          ? 'تعذّر تعديل الطلب. يمكن التعديل فقط بينما الطلب قيد المراجعة.'
          : 'Could not update request. Requests can only be edited while pending.',
      });
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleConfirmDeleteRequest = async (requestId: string) => {
    setBusyRequestId(requestId);
    setNotice(null);
    try {
      await onDeleteClientRequest(requestId);
      setConfirmDeleteRequestId(null);
      setNotice({
        type: 'success',
        text: isAr ? 'تم حذف الطلب بنجاح.' : 'Request removed successfully.',
      });
    } catch {
      setNotice({
        type: 'error',
        text: isAr ? 'تعذّر حذف الطلب حاليًا.' : 'Could not delete the request.',
      });
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (profName.trim().length < 2) {
      setNotice({
        type: 'error',
        text: isAr ? 'يرجى إدخال اسم صحيح.' : 'Please enter a valid display name.',
      });
      return;
    }
    setProfSaving(true);
    setNotice(null);
    try {
      await saveUserProfile({
        displayName: profName.trim(),
        accountType: profType,
        organizationName: profOrg.trim(),
        regionId: profRegion,
        contactInfo: profContact.trim(),
      });
      setNotice({
        type: 'success',
        text: isAr ? 'تم تحديث إعدادات الحساب بنجاح.' : 'Account settings updated.',
      });
    } catch {
      setNotice({
        type: 'error',
        text: isAr ? 'تعذّر حفظ الإعدادات حاليًا.' : 'Could not save account settings.',
      });
    } finally {
      setProfSaving(false);
    }
  };

  const statusText = (status: ClientDecisionStatus) =>
    UI_COPY[lang].workspace.board.statuses[status];

  const formatConvDate = (ms?: number) => {
    if (!ms) return '';
    try {
      return new Date(ms).toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const tabs: Array<{ key: DashboardSection; label: string; count?: number }> = [
    {
      key: 'services',
      label: isAr ? 'خدماتي المنشورة' : 'My Services',
      count: myStartups.length,
    },
    {
      key: 'messages',
      label: isAr ? 'الرسائل المباشرة' : 'Direct Messages',
      count: conversations.length,
    },
    {
      key: 'incoming',
      label: isAr ? 'الطلبات الواردة' : 'Incoming Requests',
      count: totalIncomingCount,
    },
    {
      key: 'sent',
      label: isAr ? 'طلباتي كعميل' : 'My Sent Requests',
      count: totalSentCount,
    },
    {
      key: 'account',
      label: isAr ? 'إعدادات الحساب' : 'Account Settings',
    },
  ];

  return (
    <section className="min-h-[75vh] bg-[#f5f5f7] py-10 lg:py-14 dark:bg-[#0d0d0f]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top Breadcrumb & Primary Action */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#d2d2d7]/80 pb-6 sm:flex-row sm:items-end dark:border-[#2c2c2e]">
          <div>
            <button
              type="button"
              onClick={onBackToMarketplace}
              className="inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold text-[#0066cc] hover:underline dark:text-[#2997ff] cursor-pointer"
            >
              <BackArrow className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isAr ? 'العودة إلى سوق الخدمات' : 'Back to Marketplace'}</span>
            </button>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1d1d1f] dark:text-[#f5f5f7]">
              {isAr ? 'لوحة الإدارة' : 'Management Dashboard'}
            </h1>
            <p className="mt-1 text-sm text-[#515154] dark:text-[#a1a1a6]">
              {profile?.displayName || user?.displayName}
              {' · '}
              {profile?.accountType === 'startup'
                ? isAr
                  ? 'حساب شركة ناشئة'
                  : 'Startup Account'
                : isAr
                  ? 'حساب عميل'
                  : 'Client Account'}
              {isAdmin ? (isAr ? ' · مشرف المنصة' : ' · Platform Admin') : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenCreateStartup}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#0071e3] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#0062c4] whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{isAr ? 'إضافة خدمة جديدة' : 'Add New Service'}</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                await signOutUser();
                onBackToMarketplace();
              }}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-4 py-2.5 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6] whitespace-nowrap cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isAr ? 'تسجيل الخروج' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {/* 5-Column Summary Strip — adapts 2 cols on phone, 3 on tablet, 5 on laptop */}
        <div className="mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-[#d2d2d7]/70 bg-white p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-5 dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
          <div>
            <p className="text-xs text-[#515154] dark:text-[#a1a1a6]">
              {isAr ? 'خدماتي المنشورة' : 'Published Services'}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
              {myStartups.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#515154] dark:text-[#a1a1a6]">
              {isAr ? 'المحادثات المباشرة' : 'Direct Chats'}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#0066cc] dark:text-[#2997ff]">
              {conversations.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#515154] dark:text-[#a1a1a6]">
              {isAr ? 'طلبات واردة' : 'Incoming Requests'}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
              {totalIncomingCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#515154] dark:text-[#a1a1a6]">
              {isAr ? 'طلباتي المرسلة' : 'My Sent Requests'}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
              {totalSentCount}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="text-xs text-[#515154] dark:text-[#a1a1a6]">
              {isAr ? 'مطابقات معتمدة' : 'Approved Fits'}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
              {approvedCount}
            </p>
          </div>
        </div>

        {/* Segmented Dashboard Tabs — single scrollable row on mobile/tablet, full bar on laptop */}
        <div
          role="tablist"
          className="no-scrollbar mt-6 flex flex-nowrap items-center gap-1.5 overflow-x-auto rounded-2xl bg-[#e8e8ed] p-1.5 dark:bg-[#1c1c1e] lg:flex-wrap lg:overflow-visible"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setActiveTab(tab.key);
                  setNotice(null);
                }}
                className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white text-[#1d1d1f] shadow-xs dark:bg-[#2c2c2e] dark:text-[#f5f5f7]'
                    : 'text-[#515154] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-[#f5f5f7]'
                }`}
              >
                {tab.key === 'services' && <Building2 className="h-3.5 w-3.5" />}
                {tab.key === 'messages' && <MessageSquare className="h-3.5 w-3.5" />}
                {tab.key === 'incoming' && <Inbox className="h-3.5 w-3.5" />}
                {tab.key === 'sent' && <Send className="h-3.5 w-3.5" />}
                {tab.key === 'account' && <Settings className="h-3.5 w-3.5" />}
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span className="tabular-nums text-[#515154] dark:text-[#a1a1a6]">
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {notice && (
          <div
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={`mt-5 flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm ${
              notice.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
                : 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
            }`}
          >
            {notice.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-700 dark:text-red-400" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
            )}
            <span>{notice.text}</span>
          </div>
        )}

        {/* TAB 1: MY PUBLISHED SERVICES (FULL CRUD) */}
        {activeTab === 'services' && (
          <div className="mt-6">
            {loadingData ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-44 animate-pulse rounded-3xl border border-[#d2d2d7]/70 bg-white p-6 dark:border-[#2c2c2e] dark:bg-[#1c1c1e]"
                  />
                ))}
              </div>
            ) : myStartups.length === 0 ? (
              <div className="rounded-3xl border border-[#d2d2d7]/70 bg-white px-6 py-14 text-center dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr ? 'لم تنشر أي خدمة بعد' : 'No published services yet'}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#515154] dark:text-[#a1a1a6]">
                  {isAr
                    ? 'انشر خدمة شركتك الناشئة لتظهر في الدليل الإقليمي وجدول المقارنة وتستقبل طلبات العملاء مباشرة.'
                    : 'Publish your startup service to appear in the regional directory and comparison matrix.'}
                </p>
                <button
                  type="button"
                  onClick={onOpenCreateStartup}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{isAr ? 'نشر أول خدمة' : 'Publish First Service'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {myStartups.map((item) => {
                  const confirming = confirmDeleteStartupId === item.id;
                  const busy = busyStartupId === item.id;

                  return (
                    <article
                      key={item.id}
                      className="flex flex-col justify-between rounded-3xl border border-[#d2d2d7]/70 bg-white p-6 dark:border-[#2c2c2e] dark:bg-[#1c1c1e]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#515154] dark:text-[#a1a1a6]">
                          <span className="font-semibold text-[#0066cc] dark:text-[#2997ff]">
                            {getCategoryLabel(item.categoryId, lang)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {item.city[lang]} ({getRegionLabel(item.regionId, lang)})
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{item.startingBudget[lang]}</span>
                        </div>

                        <h3 className="mt-2.5 text-lg font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {item.serviceTitle[lang]}
                        </h3>
                        <p className="mt-0.5 text-xs font-medium text-[#515154] dark:text-[#a1a1a6]">
                          {item.startupName[lang]}
                        </p>
                        <p className="mt-3 text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                          {item.summary[lang]}
                        </p>
                      </div>

                      <div className="mt-5 border-t border-[#f5f5f7] pt-4 dark:border-[#2c2c2e]">
                        {confirming ? (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs dark:bg-red-950/40">
                            <span className="font-semibold text-red-900 dark:text-red-200">
                              {isAr
                                ? 'هل تؤكد حذف هذه الخدمة نهائيًا؟'
                                : 'Confirm deleting this service permanently?'}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setConfirmDeleteStartupId(null)}
                                className="min-h-8 rounded-full border border-[#d2d2d7] bg-white px-3 py-1 font-semibold text-[#1d1d1f] dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] cursor-pointer"
                              >
                                {isAr ? 'إلغاء' : 'Cancel'}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleConfirmDeleteStartup(item.id)}
                                className="inline-flex min-h-8 items-center gap-1 rounded-full bg-red-700 px-3.5 py-1 font-semibold text-white hover:bg-red-800 disabled:opacity-60 cursor-pointer"
                              >
                                {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                                <span>{isAr ? 'تأكيد الحذف' : 'Delete'}</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onOpenEditStartup(item)}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-4 py-1.5 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6] cursor-pointer"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span>{isAr ? 'تعديل' : 'Edit'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setConfirmDeleteStartupId(item.id)}
                                className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-4 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:border-red-700 dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-red-400 dark:hover:border-red-500 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>{isAr ? 'حذف' : 'Delete'}</span>
                              </button>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              <button
                                type="button"
                                onClick={() => onViewStartup(item)}
                                className="font-semibold text-[#515154] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-[#f5f5f7] cursor-pointer"
                              >
                                {isAr ? 'معاينة' : 'Preview'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onBackToMarketplace();
                                  window.setTimeout(() => onCompareStartup(item.id), 100);
                                }}
                                className="font-semibold text-[#0066cc] hover:underline dark:text-[#2997ff] cursor-pointer"
                              >
                                {isAr ? 'مقارنة' : 'Compare'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DIRECT MESSAGES INBOX */}
        {activeTab === 'messages' && (
          <div className="mt-6">
            {conversations.length === 0 ? (
              <div className="rounded-3xl border border-[#d2d2d7]/70 bg-white px-6 py-14 text-center dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f5f7] text-[#0066cc] dark:bg-[#2c2c2e] dark:text-[#2997ff]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr ? 'لا توجد محادثات مباشرة بعد' : 'No direct messages yet'}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-[#515154] dark:text-[#a1a1a6]">
                  {isAr
                    ? 'يمكنك مراسلة أي شركة ناشئة مباشرة من بطاقتها في سوق الخدمات، كما ستصل هنا رسائل العملاء الموجّهة لخدماتك.'
                    : 'Message any startup directly from their listing card, and client inquiries sent to your services will appear here.'}
                </p>
                <button
                  type="button"
                  onClick={onBackToMarketplace}
                  className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] cursor-pointer"
                >
                  {isAr ? 'استكشف الشركات وابدأ محادثة' : 'Browse Startups to Message'}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#d2d2d7]/70 rounded-3xl border border-[#d2d2d7]/70 bg-white dark:divide-[#2c2c2e] dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                {conversations.map((conv) => {
                  const isStartupSide =
                    Boolean(user) &&
                    conv.startupOwnerId === user!.uid &&
                    conv.clientUid !== user!.uid;
                  const heading = isStartupSide
                    ? conv.clientName
                    : conv.startupName[lang];
                  const subheading = isStartupSide
                    ? `${isAr ? 'استفسار عميل حول' : 'Client inquiry about'}: ${conv.serviceTitle[lang]}`
                    : conv.serviceTitle[lang];

                  return (
                    <div
                      key={conv.id}
                      className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center sm:p-6"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#515154] dark:text-[#a1a1a6]">
                          <span className="font-semibold text-[#0066cc] dark:text-[#2997ff]">
                            {isStartupSide
                              ? isAr
                                ? 'رسالة عميل واردة'
                                : 'Incoming Client Chat'
                              : isAr
                                ? 'محادثة مع شركة'
                                : 'Startup Chat'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {isAr
                              ? `${conv.messageCount} رسالة`
                              : `${conv.messageCount} messages`}
                          </span>
                          {conv.updatedAtMs && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">
                                {formatConvDate(conv.updatedAtMs)}
                              </span>
                            </>
                          )}
                        </div>

                        <h3 className="truncate text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {heading}
                        </h3>
                        <p className="truncate text-xs font-medium text-[#515154] dark:text-[#a1a1a6]">
                          {subheading}
                        </p>
                        {conv.lastMessageText && (
                          <p className="mt-1.5 line-clamp-2 text-sm text-[#1d1d1f]/85 dark:text-[#d1d1d6]">
                            {conv.lastMessageText}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenConversation(conv)}
                        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#0071e3] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0062c4] whitespace-nowrap cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>{isAr ? 'فتح المحادثة' : 'Open Chat'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INCOMING REQUESTS FOR STARTUP OWNER */}
        {activeTab === 'incoming' && (
          <div className="mt-6 space-y-4">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#d2d2d7]/70 bg-white p-1 dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
              {(['all', 'pending', 'accepted', 'declined'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`min-h-9 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#1d1d1f] text-white dark:bg-[#f5f5f7] dark:text-[#1d1d1f]'
                      : 'text-[#515154] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-[#f5f5f7]'
                  }`}
                >
                  {UI_COPY[lang].workspace.board.filters[st]}
                </button>
              ))}
            </div>

            {incomingRequests.length === 0 ? (
              <div className="rounded-3xl border border-[#d2d2d7]/70 bg-white px-6 py-12 text-center dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                <p className="text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr ? 'لا توجد طلبات واردة حاليًا' : 'No incoming requests right now'}
                </p>
                <p className="mt-1.5 text-sm text-[#515154] dark:text-[#a1a1a6]">
                  {isAr
                    ? 'ستظهر هنا طلبات العملاء الموجّهة إلى خدماتك المنشورة فور إرسالها.'
                    : 'Client match requests sent to your published services will appear here in real time.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#d2d2d7]/70 rounded-3xl border border-[#d2d2d7]/70 bg-white dark:divide-[#2c2c2e] dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                {incomingRequests.map((req) => {
                  const busy = busyRequestId === req.id;
                  const canDecide = req.status === 'pending' || isAdmin;

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
                          <span className="tabular-nums">{req.budgetRange[lang]}</span>
                          <span aria-hidden="true">·</span>
                          <span>{req.submittedLabel[lang]}</span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            req.status === 'accepted'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : req.status === 'declined'
                                ? 'text-red-700 dark:text-red-400'
                                : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {req.status === 'accepted' ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : req.status === 'declined' ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" />
                          )}
                          <span>{statusText(req.status)}</span>
                        </span>
                      </div>

                      <h3 className="mt-2.5 text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {req.clientName[lang]}
                      </h3>

                      {req.targetStartupName && (
                        <p className="mt-0.5 text-xs text-[#515154] dark:text-[#a1a1a6]">
                          {isAr ? 'موجّه إلى:' : 'Targeted to:'}{' '}
                          <span className="font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                            {req.targetStartupName[lang]}
                          </span>
                        </p>
                      )}

                      {req.clientContact && (
                        <p className="mt-1 text-xs text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {isAr ? 'وسيلة التواصل:' : 'Client contact:'}{' '}
                          <span className="font-medium text-[#0066cc] dark:text-[#2997ff]">
                            {req.clientContact}
                          </span>
                        </p>
                      )}

                      <p className="mt-2.5 text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                        {req.needDescription[lang]}
                      </p>

                      {req.decisionNote && req.status !== 'pending' && (
                        <div className="mt-3 rounded-xl bg-[#f5f5f7] px-4 py-2.5 text-xs text-[#1d1d1f] dark:bg-[#2c2c2e] dark:text-[#f5f5f7]">
                          <span className="font-semibold">
                            {isAr ? 'ملاحظة القرار:' : 'Decision note:'}{' '}
                          </span>
                          {req.decisionNote}
                        </div>
                      )}

                      {canDecide && (
                        <div className="mt-4 space-y-3 border-t border-[#f5f5f7] pt-4 dark:border-[#2c2c2e]">
                          <input
                            type="text"
                            maxLength={500}
                            value={decisionNotes[req.id] ?? req.decisionNote ?? ''}
                            onChange={(e) =>
                              setDecisionNotes((prev) => ({
                                ...prev,
                                [req.id]: e.target.value,
                              }))
                            }
                            placeholder={
                              isAr
                                ? 'ملاحظة رد اختيارية للعميل (مثل موعد الاجتماع أو سبب الاعتذار)...'
                                : 'Optional response note for the client (next steps or reason)...'
                            }
                            className="min-h-10 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2 text-xs text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff]"
                          />

                          <div className="flex flex-wrap items-center gap-2.5">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDecision(req, 'accepted')}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60 cursor-pointer"
                            >
                              {busy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              <span>{isAr ? 'اعتماد كعميل مناسب' : 'Approve Fit'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleDecision(req, 'declined')}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-4 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:border-red-700 disabled:opacity-60 dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-red-400 dark:hover:border-red-500 cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>{isAr ? 'غير مناسب حاليًا' : 'Decline'}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MY SENT REQUESTS AS CLIENT (EDIT & DELETE) */}
        {activeTab === 'sent' && (
          <div className="mt-6 space-y-4">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-[#d2d2d7]/70 bg-white p-1 dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
              {(['all', 'pending', 'accepted', 'declined'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`min-h-9 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-[#1d1d1f] text-white dark:bg-[#f5f5f7] dark:text-[#1d1d1f]'
                      : 'text-[#515154] hover:text-[#1d1d1f] dark:text-[#a1a1a6] dark:hover:text-[#f5f5f7]'
                  }`}
                >
                  {UI_COPY[lang].workspace.board.filters[st]}
                </button>
              ))}
            </div>

            {sentRequests.length === 0 ? (
              <div className="rounded-3xl border border-[#d2d2d7]/70 bg-white px-6 py-12 text-center dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                <p className="text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr ? 'لم ترسل أي طلبات مطابقة بعد' : 'No sent requests yet'}
                </p>
                <p className="mt-1.5 text-sm text-[#515154] dark:text-[#a1a1a6]">
                  {isAr
                    ? 'تصفح الشركات الناشئة في السوق واضغط «طلب مطابقة» لإرسال احتياجك ومتابعته هنا.'
                    : 'Browse startups in the marketplace and click Request Match to track your briefs here.'}
                </p>
                <button
                  type="button"
                  onClick={onBackToMarketplace}
                  className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0062c4] cursor-pointer"
                >
                  {isAr ? 'استكشف الشركات الناشئة' : 'Explore Startups'}
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#d2d2d7]/70 rounded-3xl border border-[#d2d2d7]/70 bg-white dark:divide-[#2c2c2e] dark:border-[#2c2c2e] dark:bg-[#1c1c1e]">
                {sentRequests.map((req) => {
                  const isEditing = editingRequestId === req.id;
                  const confirmingDelete = confirmDeleteRequestId === req.id;
                  const busy = busyRequestId === req.id;

                  return (
                    <div key={req.id} className="p-6">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#515154] dark:text-[#a1a1a6]">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-semibold text-[#0066cc] dark:text-[#2997ff]">
                            {getCategoryLabel(req.categoryId, lang)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{getRegionLabel(req.regionId, lang)}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{req.budgetRange[lang]}</span>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 font-semibold ${
                            req.status === 'accepted'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : req.status === 'declined'
                                ? 'text-red-700 dark:text-red-400'
                                : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {req.status === 'accepted' ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : req.status === 'declined' ? (
                            <AlertCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Clock className="h-3.5 w-3.5" />
                          )}
                          <span>{statusText(req.status)}</span>
                        </span>
                      </div>

                      <h3 className="mt-2 text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                        {req.targetStartupName
                          ? `${isAr ? 'طلب إلى' : 'Request to'} ${req.targetStartupName[lang]}`
                          : req.clientName[lang]}
                      </h3>

                      {isEditing ? (
                        <form
                          onSubmit={(e) => handleSaveRequestEdit(e, req.id)}
                          className="mt-4 space-y-3 rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#2c2c2e]"
                        >
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <input
                              type="text"
                              value={editClientName}
                              onChange={(e) => setEditClientName(e.target.value)}
                              placeholder={isAr ? 'اسمك أو مشروعك' : 'Your name / company'}
                              className="min-h-10 rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-xs text-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7]"
                            />
                            <input
                              type="text"
                              value={editClientContact}
                              onChange={(e) => setEditClientContact(e.target.value)}
                              placeholder={isAr ? 'وسيلة التواصل' : 'Contact info'}
                              className="min-h-10 rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-xs text-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7]"
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="relative">
                              <select
                                value={editCategoryId}
                                onChange={(e) =>
                                  setEditCategoryId(e.target.value as CategoryId)
                                }
                                className="min-h-10 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-white py-2 ps-3 pe-8 text-xs text-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] cursor-pointer"
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.label[lang]}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                                aria-hidden="true"
                              />
                            </div>

                            <div className="relative">
                              <select
                                value={editRegionId}
                                onChange={(e) =>
                                  setEditRegionId(e.target.value as RegionId)
                                }
                                className="min-h-10 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-white py-2 ps-3 pe-8 text-xs text-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] cursor-pointer"
                              >
                                {REGIONS.map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.label[lang]}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                                aria-hidden="true"
                              />
                            </div>

                            <div className="relative">
                              <select
                                value={editBudgetRange}
                                onChange={(e) => setEditBudgetRange(e.target.value)}
                                className="min-h-10 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-white py-2 ps-3 pe-8 text-xs text-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] cursor-pointer"
                              >
                                {budgets.map((b) => (
                                  <option key={b} value={b}>
                                    {b}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                                aria-hidden="true"
                              />
                            </div>
                          </div>

                          <textarea
                            rows={3}
                            value={editNeedDescription}
                            onChange={(e) => setEditNeedDescription(e.target.value)}
                            className="w-full rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-xs text-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7]"
                          />

                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              disabled={busy}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#0071e3] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#0062c4] disabled:opacity-60 cursor-pointer"
                            >
                              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                              <span>{isAr ? 'حفظ التعديل' : 'Save'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRequestId(null)}
                              className="min-h-9 rounded-full border border-[#d2d2d7] bg-white px-4 py-1.5 text-xs font-semibold text-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] cursor-pointer"
                            >
                              {isAr ? 'إلغاء' : 'Cancel'}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <p className="mt-2 text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                            {req.needDescription[lang]}
                          </p>

                          {req.decisionNote && (
                            <div className="mt-3 rounded-xl bg-[#f5f5f7] px-4 py-2.5 text-xs text-[#1d1d1f] dark:bg-[#2c2c2e] dark:text-[#f5f5f7]">
                              <span className="font-semibold">
                                {isAr ? 'رد الشركة الناشئة:' : 'Startup response:'}{' '}
                              </span>
                              {req.decisionNote}
                            </div>
                          )}

                          <div className="mt-4">
                            {confirmingDelete ? (
                              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs dark:bg-red-950/40">
                                <span className="font-semibold text-red-900 dark:text-red-200">
                                  {isAr
                                    ? 'هل تؤكد سحب وحذف هذا الطلب؟'
                                    : 'Confirm withdrawing and deleting this request?'}
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteRequestId(null)}
                                    className="min-h-8 rounded-full border border-[#d2d2d7] bg-white px-3 py-1 font-semibold text-[#1d1d1f] dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] cursor-pointer"
                                  >
                                    {isAr ? 'إلغاء' : 'Cancel'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => handleConfirmDeleteRequest(req.id)}
                                    className="inline-flex min-h-8 items-center gap-1 rounded-full bg-red-700 px-3.5 py-1 font-semibold text-white cursor-pointer"
                                  >
                                    {busy && <Loader2 className="h-3 w-3 animate-spin" />}
                                    <span>{isAr ? 'تأكيد الحذف' : 'Delete'}</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                {req.status === 'pending' && (
                                  <button
                                    type="button"
                                    onClick={() => startEditingRequest(req)}
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1d1d1f] hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6] cursor-pointer"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    <span>{isAr ? 'تعديل الطلب' : 'Edit Request'}</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteRequestId(req.id)}
                                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-white px-3.5 py-1.5 text-xs font-semibold text-red-700 hover:border-red-700 dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-red-400 dark:hover:border-red-500 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>{isAr ? 'سحب وحذف' : 'Delete'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ACCOUNT & ROLE SETTINGS */}
        {activeTab === 'account' && (
          <form
            onSubmit={handleProfileSubmit}
            className="mt-6 max-w-2xl space-y-4 rounded-3xl border border-[#d2d2d7]/70 bg-white p-6 sm:p-8 dark:border-[#2c2c2e] dark:bg-[#1c1c1e]"
          >
            <div>
              <h2 className="text-lg font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {isAr ? 'بيانات الحساب والدور' : 'Profile & Account Role'}
              </h2>
              <p className="mt-1 text-xs text-[#515154] dark:text-[#a1a1a6]">
                {user?.email}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr ? 'الاسم المعروض' : 'Display Name'}
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={profName}
                  onChange={(e) => setProfName(e.target.value)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr ? 'نوع الحساب' : 'Account Role'}
                </label>
                <div className="relative mt-1.5">
                  <select
                    value={profType}
                    onChange={(e) => setProfType(e.target.value as AccountType)}
                    className="min-h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-2.5 ps-3.5 pe-9 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff] cursor-pointer"
                  >
                    <option value="startup">
                      {isAr ? 'شركة ناشئة (نشر خدمات ومراجعة طلبات)' : 'Startup (Publish services & decide)'}
                    </option>
                    <option value="client">
                      {isAr ? 'عميل (إرسال ومتابعة الطلبات)' : 'Client (Submit & track requests)'}
                    </option>
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr ? 'اسم الشركة أو الجهة' : 'Organization Name'}
                </label>
                <input
                  type="text"
                  maxLength={140}
                  value={profOrg}
                  onChange={(e) => setProfOrg(e.target.value)}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr ? 'المنطقة الأساسية' : 'Primary Region'}
                </label>
                <div className="relative mt-1.5">
                  <select
                    value={profRegion}
                    onChange={(e) => setProfRegion(e.target.value as RegionId)}
                    className="min-h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-2.5 ps-3.5 pe-9 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff] cursor-pointer"
                  >
                    {REGIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label[lang]}
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
              <label className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                {isAr ? 'وسيلة التواصل الافتراضية' : 'Default Contact Channel'}
              </label>
              <input
                type="text"
                maxLength={200}
                value={profContact}
                onChange={(e) => setProfContact(e.target.value)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff]"
              />
            </div>

            <button
              type="submit"
              disabled={profSaving}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] disabled:opacity-60 cursor-pointer"
            >
              {profSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {profSaving
                  ? isAr
                    ? 'جارٍ الحفظ...'
                    : 'Saving...'
                  : isAr
                    ? 'حفظ إعدادات الحساب'
                    : 'Save Account Settings'}
              </span>
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
