import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Compass,
  Loader2,
  MessageSquare,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import {
  getCategoryLabel,
  type RegionId,
  type StartupService,
} from '../data/startups';
import type { Language } from '../i18n/translations';
import { askSmartAdvisor, type AdvisorTurn } from '../services/aiAdvisorService';

interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendedStartupIds?: string[];
  followUpSuggestions?: string[];
}

interface SmartAdvisorDrawerProps {
  lang: Language;
  isOpen: boolean;
  startups: StartupService[];
  selectedRegion: RegionId | 'all';
  onClose: () => void;
  onViewStartup: (startup: StartupService) => void;
  onMessageStartup: (startup: StartupService) => void;
  onRequestStartup: (startup: StartupService) => void;
}

const STARTER_OPTIONS: Record<Language, Array<{ title: string; prompt: string }>> = {
  ar: [
    {
      title: 'محتار بين أكثر من شركة',
      prompt: 'أنا محتار بين عدة شركات ناشئة في المنصة ولا أعرف كيف أختار الأنسب لمشروعي، بماذا تنصحني؟',
    },
    {
      title: 'ميزانية محدودة وبداية سريعة',
      prompt: 'ميزانيتي محدودة وأريد إطلاق موقع أو متجر إلكتروني بسرعة وبأفضل قيمة ممكنة، ما الخيار الأنسب؟',
    },
    {
      title: 'نمو ومبيعات في منطقتي',
      prompt: 'لدي مشروع قائم وأريد زيادة العملاء والمبيعات في منطقتي بحملة واضحة ومقاسة، كيف أبدأ؟',
    },
    {
      title: 'تنظيم وأتمتة العمليات',
      prompt: 'أواجه ضغطًا في إدارة المواعيد والعمليات اليومية وأحتاج أتمتة ذكية تقلل العمل اليدوي، ما اقتراحك؟',
    },
  ],
  en: [
    {
      title: 'Undecided between startups',
      prompt: 'I am undecided between a few startups on the platform and not sure how to pick the best fit. How should I decide?',
    },
    {
      title: 'Lean budget & fast launch',
      prompt: 'I have a lean budget and want to launch a website or online store quickly with strong value. What do you suggest?',
    },
    {
      title: 'Local growth & acquisition',
      prompt: 'I run an existing business and want measurable customer growth in my region. Where should I start?',
    },
    {
      title: 'Operations & automation',
      prompt: 'My team spends too much time on manual bookings and daily operations. Which service can help us automate?',
    },
  ],
};

export function SmartAdvisorDrawer({
  lang,
  isOpen,
  startups,
  selectedRegion,
  onClose,
  onViewStartup,
  onMessageStartup,
  onRequestStartup,
}: SmartAdvisorDrawerProps) {
  const isAr = lang === 'ar';
  const ArrowIcon = isAr ? ArrowLeft : ArrowRight;

  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 60);
    }
  }, [messages, loading, isOpen]);

  if (!isOpen) return null;

  const runAdvisorRequest = async (historyMessages: AdvisorMessage[]) => {
    setError(null);
    setLoading(true);

    try {
      const history: AdvisorTurn[] = historyMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await askSmartAdvisor({
        messages: history,
        startups,
        lang,
        selectedRegion,
      });

      const assistantMsg: AdvisorMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
        recommendedStartupIds: result.recommendedStartupIds,
        followUpSuggestions: result.followUpSuggestions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : isAr
            ? 'تعذّر الاتصال بالمستشار الذكي حاليًا. حاول مجددًا.'
            : 'Unable to reach Smart Advisor right now. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const sendPrompt = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || loading) return;

    const userMsg: AdvisorMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    await runAdvisorRequest(nextMessages);
  };

  const handleRetryLast = () => {
    if (loading || messages.length === 0) return;
    void runAdvisorRequest(messages);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendPrompt(input);
  };

  const handleReset = () => {
    setMessages([]);
    setError(null);
    setInput('');
    inputRef.current?.focus();
  };

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((m) => m.role === 'assistant');

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-advisor-title"
      onClick={onClose}
    >
      <div
        className="flex h-[100dvh] w-full max-w-lg flex-col bg-white text-[#1d1d1f] shadow-2xl dark:bg-[#111113] dark:text-[#f5f5f7] sm:border-s sm:border-[#d2d2d7]/80 dark:sm:border-[#2c2c2e]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-[#d2d2d7]/80 px-5 py-4 dark:border-[#2c2c2e]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1d1d1f] text-white dark:bg-[#2997ff] dark:text-black">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="smart-advisor-title"
                className="truncate text-base font-bold text-[#1d1d1f] dark:text-[#f5f5f7]"
              >
                {isAr ? 'مستشارك الذكي' : 'Smart Advisor'}
              </h2>
              <p className="truncate text-xs text-[#515154] dark:text-[#a1a1a6]">
                {isAr
                  ? 'استشارة سريعة تساعدك على اختيار الخدمة الأنسب'
                  : 'Quick guidance to choose the right startup'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleReset}
                title={isAr ? 'محادثة جديدة' : 'New consultation'}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-3 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#a1a1a6] cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {isAr ? 'جديد' : 'Reset'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={isAr ? 'إغلاق' : 'Close'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d2d2d7] text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] dark:border-[#38383a] dark:text-[#f5f5f7] dark:hover:bg-[#1c1c1e] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Conversation Body */}
        <div
          ref={scrollRef}
          className="flex-1 space-y-5 overflow-y-auto px-5 py-5"
        >
          {/* Welcome Intro & Quick Conversation Starters */}
          {messages.length === 0 ? (
            <div className="space-y-6">
              <div className="rounded-3xl bg-[#f5f5f7] p-5 dark:bg-[#1c1c1e]">
                <p className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr
                    ? 'مرحبًا بك! محتار في اختيار الشركة أو نطاق مشروعك؟'
                    : 'Welcome! Unsure which startup or scope fits your project?'}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                  {isAr
                    ? 'احكِ لي باختصار عمّا يدور في ذهنك، أو ابدأ فورًا بأحد الخيارات التالية لأرشدك إلى الخيار العملي الأنسب لك.'
                    : 'Tell me briefly what you are considering, or pick a quick starter below for tailored advice.'}
                </p>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-[#515154] dark:text-[#a1a1a6]">
                  {isAr ? 'خيارات سريعة لبدء المحادثة' : 'Quick conversation starters'}
                </p>
                <div className="grid grid-cols-1 gap-2.5">
                  {STARTER_OPTIONS[lang].map((option) => (
                    <button
                      key={option.title}
                      type="button"
                      onClick={() => void sendPrompt(option.prompt)}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-[#d2d2d7]/90 bg-white px-4 py-3.5 text-start transition-all duration-150 hover:border-[#0071e3] hover:bg-[#f5f5f7] dark:border-[#2c2c2e] dark:bg-[#1c1c1e] dark:hover:border-[#2997ff] dark:hover:bg-[#242426] cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                          {option.title}
                        </p>
                        <p className="text-xs leading-relaxed text-[#515154] dark:text-[#a1a1a6] line-clamp-2">
                          {option.prompt}
                        </p>
                      </div>
                      <ArrowIcon
                        className="h-4 w-4 shrink-0 text-[#515154] transition-transform duration-150 group-hover:text-[#0071e3] dark:text-[#a1a1a6] dark:group-hover:text-[#2997ff]"
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                const matchedStartups = (msg.recommendedStartupIds ?? [])
                  .map((id) => startups.find((s) => s.id === id))
                  .filter((s): s is StartupService => Boolean(s));

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col gap-2.5 ${
                      isUser ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                        isUser
                          ? 'bg-[#0071e3] text-white'
                          : 'bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#1c1c1e] dark:text-[#f5f5f7]'
                      }`}
                    >
                      {msg.content}
                    </div>

                    {!isUser && matchedStartups.length > 0 && (
                      <div className="w-full max-w-[94%] space-y-2.5 pt-0.5">
                        <p className="text-xs font-semibold text-[#515154] dark:text-[#a1a1a6]">
                          {isAr
                            ? 'شركات مقترحة تناسب استشارتك'
                            : 'Suggested startups for your case'}
                        </p>
                        {matchedStartups.map((st) => (
                          <div
                            key={st.id}
                            className="rounded-2xl border border-[#d2d2d7]/80 bg-white p-3.5 dark:border-[#38383a] dark:bg-[#1c1c1e]"
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px] text-[#515154] dark:text-[#a1a1a6]">
                              <span className="font-semibold text-[#0066cc] dark:text-[#2997ff]">
                                {getCategoryLabel(st.categoryId, lang)}
                              </span>
                              <span className="tabular-nums">
                                {st.startingBudget[lang]}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                              {st.startupName[lang]}
                            </p>
                            <p className="mt-0.5 text-xs text-[#515154] dark:text-[#a1a1a6]">
                              {st.serviceTitle[lang]}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onMessageStartup(st);
                                }}
                                className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-[#0071e3] px-3.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#0062c4] whitespace-nowrap cursor-pointer"
                              >
                                <MessageSquare className="h-3 w-3" />
                                <span>
                                  {isAr ? 'مراسلة الشركة' : 'Message'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onRequestStartup(st);
                                }}
                                className="inline-flex min-h-8 items-center rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-3 py-1 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] whitespace-nowrap cursor-pointer"
                              >
                                {isAr ? 'طلب مطابقة' : 'Request Match'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onViewStartup(st);
                                }}
                                className="text-xs font-semibold text-[#0066cc] hover:underline dark:text-[#2997ff] cursor-pointer"
                              >
                                {isAr ? 'التفاصيل' : 'Details'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-[#f5f5f7] px-4 py-3 text-xs font-medium text-[#515154] dark:bg-[#1c1c1e] dark:text-[#a1a1a6] w-fit">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#0071e3] dark:text-[#2997ff]" />
                  <span>
                    {isAr
                      ? 'مستشارك يحلل خياراتك...'
                      : 'Advisor is reviewing your options...'}
                  </span>
                </div>
              )}

              {!loading &&
                lastAssistantMessage?.followUpSuggestions &&
                lastAssistantMessage.followUpSuggestions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[11px] font-semibold text-[#515154] dark:text-[#a1a1a6]">
                      {isAr ? 'أسئلة مقترحة للمتابعة' : 'Suggested follow-ups'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {lastAssistantMessage.followUpSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void sendPrompt(s)}
                          className="rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-start text-xs font-medium text-[#1d1d1f] transition-colors hover:border-[#0071e3] hover:text-[#0066cc] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:hover:border-[#2997ff] dark:hover:text-[#2997ff] cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRetryLast}
                  className="shrink-0 rounded-full border border-red-300 bg-white px-3 py-1 text-[11px] font-semibold text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-[#1c1c1e] dark:text-red-200 cursor-pointer"
                >
                  {isAr ? 'إعادة المحاولة' : 'Retry'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Input Composer */}
        <form
          onSubmit={handleSubmit}
          className="border-t border-[#d2d2d7]/80 bg-white p-4 dark:border-[#2c2c2e] dark:bg-[#111113]"
        >
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              maxLength={600}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                isAr
                  ? 'اكتب استشارتك أو سؤالك السريع هنا...'
                  : 'Ask your quick question here...'
              }
              className="min-h-11 flex-1 rounded-2xl border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label={isAr ? 'إرسال' : 'Send'}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0071e3] text-white transition-colors hover:bg-[#0062c4] disabled:opacity-45 cursor-pointer"
            >
              {loading ? (
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
