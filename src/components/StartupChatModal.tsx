import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Loader2,
  MapPin,
  MessageSquare,
  Send,
  X,
} from 'lucide-react';
import {
  getRegionLabel,
  type ChatMessage,
  type Conversation,
  type StartupService,
} from '../data/startups';
import { useAuth } from '../context/AuthContext';
import type { Language } from '../i18n/translations';
import {
  FIELD_LIMITS,
  buildConversationId,
  sendConversationMessage,
  subscribeToConversationMessages,
} from '../services/firestoreService';

interface StartupChatModalProps {
  lang: Language;
  isOpen: boolean;
  startup: StartupService | null;
  conversation: Conversation | null;
  allConversations: Conversation[];
  onClose: () => void;
}

const QUICK_INQUIRIES: Record<Language, string[]> = {
  ar: [
    'مرحبًا، أرغب بالاستفسار عن تفاصيل الخدمة والمدة الزمنية للتنفيذ.',
    'هل هذه الخدمة مناسبة لمشروع ناشئ بميزانية مبدئية؟',
    'هل يمكن ترتيب مكالمة تعريفية سريعة لمناقشة نطاق العمل؟',
  ],
  en: [
    'Hello, I would like to ask about the scope and estimated delivery timeline.',
    'Is this service a good fit for an early-stage business?',
    'Could we schedule a quick intro call to review our project brief?',
  ],
};

function formatMessageTime(ms: number | undefined, lang: Language): string {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export function StartupChatModal({
  lang,
  isOpen,
  startup,
  conversation,
  allConversations,
  onClose,
}: StartupChatModalProps) {
  const { user, profile, isAdmin } = useAuth();
  const isAr = lang === 'ar';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Resolve existing conversation either directly passed or matched by deterministic ID
  const resolvedConversation = useMemo<Conversation | null>(() => {
    if (conversation) return conversation;
    if (!startup || !user) return null;
    const expectedId = buildConversationId(startup.id, user.uid);
    return (
      allConversations.find(
        (c) =>
          c.id === expectedId ||
          (c.startupId === startup.id && c.clientUid === user.uid)
      ) ?? null
    );
  }, [conversation, startup, user, allConversations]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !user || !resolvedConversation) {
      setMessages([]);
      setLoadingMsgs(false);
      return;
    }

    setLoadingMsgs(true);
    setError(null);
    const participantField: 'clientUid' | 'startupOwnerId' =
      resolvedConversation.clientUid === user.uid
        ? 'clientUid'
        : 'startupOwnerId';

    const unsub = subscribeToConversationMessages(
      resolvedConversation.id,
      participantField,
      user.uid,
      isAdmin,
      (items) => {
        setMessages(items);
        setLoadingMsgs(false);
      },
      () => {
        setLoadingMsgs(false);
        setError(
          isAr
            ? 'تعذّر تحميل الرسائل حاليًا. حاول مجددًا.'
            : 'Could not load messages right now.'
        );
      }
    );

    return () => unsub();
  }, [isOpen, user, resolvedConversation, isAdmin, isAr]);

  useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 50);
  }, [messages, isOpen]);

  if (!isOpen || (!startup && !resolvedConversation)) return null;

  const titleName = resolvedConversation
    ? resolvedConversation.startupName[lang]
    : startup?.startupName[lang] ?? '';
  const serviceSubtitle = resolvedConversation
    ? resolvedConversation.serviceTitle[lang]
    : startup?.serviceTitle[lang] ?? '';

  const isStartupReplying =
    Boolean(user && resolvedConversation) &&
    resolvedConversation!.startupOwnerId === user!.uid &&
    resolvedConversation!.clientUid !== user!.uid;

  const peerHeaderLabel = isStartupReplying
    ? `${isAr ? 'محادثة مع العميل' : 'Chat with client'}: ${resolvedConversation!.clientName}`
    : titleName;

  const handleSend = async (rawText: string) => {
    if (!user) return;
    const clean = rawText.trim();
    if (!clean || sending) return;

    if (!resolvedConversation && (!startup || !startup.ownerId)) {
      setError(
        isAr
          ? 'جارٍ مزامنة بيانات هذه الشركة مع قاعدة البيانات. يرجى المحاولة بعد لحظات.'
          : 'This startup is still syncing with the database. Please try again in a moment.'
      );
      return;
    }

    setSending(true);
    setError(null);
    try {
      const senderRole: 'client' | 'startup' = isStartupReplying
        ? 'startup'
        : 'client';
      const senderName =
        (isStartupReplying
          ? resolvedConversation?.startupName[lang]
          : profile?.displayName || user.displayName || user.email?.split('@')[0]) ||
        (isAr ? 'مستخدم' : 'User');

      await sendConversationMessage({
        existingConversation: resolvedConversation,
        startup: startup,
        clientUid: resolvedConversation ? resolvedConversation.clientUid : user.uid,
        clientName:
          resolvedConversation?.clientName ||
          profile?.displayName ||
          user.displayName ||
          (isAr ? 'عميل' : 'Client'),
        senderUid: user.uid,
        senderName,
        senderRole,
        body: clean,
      });
      setDraft('');
    } catch {
      setError(
        isAr
          ? 'تعذّر إرسال الرسالة حاليًا. تحقق من الاتصال وحاول مجددًا.'
          : 'Could not send message right now. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSend(draft);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-2 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="startup-chat-title"
      onClick={onClose}
    >
      <div
        className="flex h-[min(680px,92dvh)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-[#d2d2d7]/80 bg-white text-[#1d1d1f] shadow-2xl dark:border-[#38383a] dark:bg-[#161617] dark:text-[#f5f5f7] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#d2d2d7]/80 bg-[#f5f5f7]/80 px-5 py-4 backdrop-blur-md dark:border-[#2c2c2e] dark:bg-[#1c1c1e]/90">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#0066cc] dark:text-[#2997ff]">
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span>
                {isAr ? 'مراسلة مباشرة عبر لها' : 'Direct Laha Messaging'}
              </span>
            </div>
            <h2
              id="startup-chat-title"
              className="mt-1 truncate text-lg font-bold text-[#1d1d1f] dark:text-[#f5f5f7]"
            >
              {peerHeaderLabel}
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#515154] dark:text-[#a1a1a6]">
              <span className="truncate">{serviceSubtitle}</span>
              {startup && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {startup.city[lang]} ({getRegionLabel(startup.regionId, lang)})
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d2d2d7] bg-white text-[#1d1d1f] transition-colors hover:bg-[#e8e8ed] dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] dark:hover:bg-[#3a3a3c] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages Stream */}
        <div
          ref={listRef}
          className="flex-1 space-y-3 overflow-y-auto bg-white px-5 py-5 dark:bg-[#0d0d0f]"
        >
          {loadingMsgs ? (
            <div className="flex h-full items-center justify-center gap-2 text-xs text-[#515154] dark:text-[#a1a1a6]">
              <Loader2 className="h-4 w-4 animate-spin text-[#0071e3] dark:text-[#2997ff]" />
              <span>{isAr ? 'جارٍ تحميل المحادثة...' : 'Loading messages...'}</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="space-y-5 py-4">
              <div className="rounded-2xl bg-[#f5f5f7] p-4 text-center dark:bg-[#1c1c1e]">
                <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr
                    ? `ابدأ محادثتك المباشرة مع ${titleName}`
                    : `Start a direct chat with ${titleName}`}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                  {isAr
                    ? 'تُحفظ رسائلك بأمان وتظهر للشركة مباشرة في لوحتها للرد عليك داخل المنصة.'
                    : 'Your messages are saved securely and delivered directly to the startup dashboard.'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#515154] dark:text-[#a1a1a6]">
                  {isAr ? 'رسائل افتتاحية جاهزة' : 'Quick starter messages'}
                </p>
                <div className="flex flex-col gap-2">
                  {QUICK_INQUIRIES[lang].map((text) => (
                    <button
                      key={text}
                      type="button"
                      disabled={sending}
                      onClick={() => void handleSend(text)}
                      className="rounded-2xl border border-[#d2d2d7] bg-[#f5f5f7]/60 px-4 py-2.5 text-start text-xs font-medium text-[#1d1d1f] transition-colors hover:border-[#0071e3] hover:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#2997ff] cursor-pointer"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderUid === user?.uid;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      isMine
                        ? 'bg-[#0071e3] text-white'
                        : 'bg-[#e8e8ed] text-[#1d1d1f] dark:bg-[#262629] dark:text-[#f5f5f7]'
                    }`}
                  >
                    {msg.body}
                  </div>
                  <span className="mt-1 px-1 text-[11px] text-[#515154] dark:text-[#8e8e93] tabular-nums">
                    {msg.senderName}
                    {msg.createdAtMs ? ` · ${formatMessageTime(msg.createdAtMs, lang)}` : ''}
                  </span>
                </div>
              );
            })
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-[#d2d2d7]/80 bg-[#f5f5f7]/70 p-4 dark:border-[#2c2c2e] dark:bg-[#161617]"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              maxLength={FIELD_LIMITS.chatMessageBody.max}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                isAr
                  ? 'اكتب رسالتك للشركة هنا...'
                  : 'Write your message here...'
              }
              className="min-h-11 flex-1 rounded-2xl border border-[#d2d2d7] bg-white px-4 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff]"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label={isAr ? 'إرسال الرسالة' : 'Send message'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-white transition-colors hover:bg-[#0062c4] disabled:opacity-45 cursor-pointer"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
