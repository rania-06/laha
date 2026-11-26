import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Briefcase,
  Building2,
  ChevronDown,
  Loader2,
  LogIn,
  User,
  X,
} from 'lucide-react';
import {
  REGIONS,
  type AccountType,
  type RegionId,
} from '../data/startups';
import { useAuth } from '../context/AuthContext';
import type { Language } from '../i18n/translations';

interface AuthOnboardingModalProps {
  lang: Language;
  isOpen: boolean;
  reason?: 'startup' | 'client' | 'dashboard' | 'message' | 'general';
  onClose: () => void;
  onCompleted?: () => void;
}

export function AuthOnboardingModal({
  lang,
  isOpen,
  reason = 'general',
  onClose,
  onCompleted,
}: AuthOnboardingModalProps) {
  const {
    user,
    profile,
    needsOnboarding,
    authError,
    signInWithGoogle,
    saveUserProfile,
    clearAuthError,
  } = useAuth();

  const isAr = lang === 'ar';
  const [signingIn, setSigningIn] = useState(false);

  // Onboarding form state
  const [accountType, setAccountType] = useState<AccountType>(
    reason === 'client' ? 'client' : 'startup'
  );
  const [displayName, setDisplayName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [regionId, setRegionId] = useState<RegionId>('riyadh');
  const [contactInfo, setContactInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (reason === 'client') setAccountType('client');
    if (reason === 'startup') setAccountType('startup');
  }, [reason]);

  useEffect(() => {
    if (user && !displayName) {
      setDisplayName(user.displayName || '');
    }
  }, [user, displayName]);

  useEffect(() => {
    if (!isOpen && !needsOnboarding) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !needsOnboarding) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, needsOnboarding, onClose]);

  const showOnboarding = Boolean(user && needsOnboarding);
  const visible = isOpen || showOnboarding;

  if (!visible) return null;

  // If user is already signed in AND has profile, close automatically
  if (user && profile && isOpen) {
    return null;
  }

  const handleGoogleLogin = async () => {
    setSigningIn(true);
    clearAuthError();
    const ok = await signInWithGoogle();
    setSigningIn(false);
    if (ok && onCompleted && !needsOnboarding) {
      // Wait for profile state to resolve naturally via effect
    }
  };

  const handleOnboardingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = displayName.trim();
    if (cleanName.length < 2) {
      setFormError(
        isAr
          ? 'يرجى إدخال اسمك الكامل (حرفان على الأقل).'
          : 'Please enter your name (at least 2 characters).'
      );
      return;
    }

    setSaving(true);
    try {
      await saveUserProfile({
        displayName: cleanName,
        accountType,
        organizationName: organizationName.trim(),
        regionId,
        contactInfo: contactInfo.trim(),
      });
      onCompleted?.();
      onClose();
    } catch {
      setFormError(
        isAr
          ? 'تعذّر حفظ بيانات حسابك حاليًا. يرجى المحاولة مجددًا.'
          : 'Could not save your profile right now. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const reasonSubtitle = (() => {
    if (reason === 'startup') {
      return isAr
        ? 'سجّل دخولك لنشر خدمة شركتك الناشئة وحفظها بشكل دائم وإدارة التعديلات والطلبات الواردة.'
        : 'Sign in to publish your startup service permanently and manage incoming client requests.';
    }
    if (reason === 'client') {
      return isAr
        ? 'سجّل دخولك لإرسال طلب مطابقة محفوظ ومتابعة قرار الشركة الناشئة وردّها من لوحتك.'
        : 'Sign in to submit a saved match request and track startup decisions in your dashboard.';
    }
    if (reason === 'dashboard') {
      return isAr
        ? 'سجّل دخولك للوصول إلى لوحتك الخاصة لإدارة الخدمات والطلبات والرسائل.'
        : 'Sign in to access your personal dashboard for managing services, requests, and messages.';
    }
    if (reason === 'message') {
      return isAr
        ? 'سجّل دخولك لبدء محادثة مباشرة ومحفوظة مع هذه الشركة الناشئة داخل المنصة.'
        : 'Sign in to start a direct saved conversation with this startup right inside Laha.';
    }
    return isAr
      ? 'سجّل دخولك بحساب Google للاستفادة من الحفظ الدائم والمراسلة ولوحة الإدارة، بينما يبقى التصفح والمقارنة متاحين دائمًا للجميع.'
      : 'Sign in with Google for permanent cloud storage, direct messaging, and your management dashboard. Browsing stays open to everyone.';
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-2.5 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={() => {
        if (!showOnboarding) onClose();
      }}
    >
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#d2d2d7]/70 bg-white p-5 text-[#1d1d1f] shadow-2xl dark:border-[#38383a] dark:bg-[#161617] dark:text-[#f5f5f7] sm:rounded-3xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-[#0066cc] dark:text-[#2997ff]">
              {showOnboarding
                ? isAr
                  ? 'إعداد الحساب · خطوة واحدة'
                  : 'Account Setup · One Quick Step'
                : isAr
                  ? 'حسابك في منصة لها'
                  : 'Your Laha Account'}
            </p>
            <h2
              id="auth-modal-title"
              className="mt-1.5 text-2xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]"
            >
              {showOnboarding
                ? isAr
                  ? 'اختر دورك في المنصة'
                  : 'Choose your role on Laha'
                : isAr
                  ? 'تسجيل الدخول للمتابعة'
                  : 'Sign in to continue'}
            </h2>
          </div>

          {!showOnboarding && (
            <button
              type="button"
              onClick={onClose}
              aria-label={isAr ? 'إغلاق' : 'Close'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d2d2d7] text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] dark:border-[#38383a] dark:text-[#f5f5f7] dark:hover:bg-[#2c2c2e] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!showOnboarding ? (
          <div className="mt-4 space-y-5">
            <p className="text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
              {reasonSubtitle}
            </p>

            <div className="grid grid-cols-1 gap-3 rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#1c1c1e] sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr ? 'لحسابات الشركات الناشئة' : 'For Startups'}
                </p>
                <p className="text-xs leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                  {isAr
                    ? 'إضافة وتعديل وحذف الخدمات، الرد على رسائل العملاء، والبت في الطلبات.'
                    : 'Manage listings, reply to client messages, and approve or decline requests.'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {isAr ? 'لحسابات العملاء' : 'For Clients'}
                </p>
                <p className="text-xs leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                  {isAr
                    ? 'مراسلة الشركات مباشرة، إرسال طلبات موجهة، ومتابعة الردود في لوحتك.'
                    : 'Message startups directly, send targeted requests, and track decisions.'}
                </p>
              </div>
            </div>

            {authError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" />
                <span>
                  {authError === 'popup-blocked'
                    ? isAr
                      ? 'قام المتصفح بحظر نافذة تسجيل الدخول. يرجى السماح بالنوافذ المنبثقة لهذا الموقع ثم المحاولة مجددًا.'
                      : 'The browser blocked the sign-in popup. Please allow popups for this site and try again.'
                    : isAr
                      ? 'تعذّر تسجيل الدخول حاليًا. يرجى المحاولة مرة أخرى.'
                      : 'Sign-in failed right now. Please try again.'}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={signingIn}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] disabled:opacity-60 cursor-pointer"
            >
              {signingIn ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <LogIn className="h-4 w-4" aria-hidden="true" />
              )}
              <span>
                {signingIn
                  ? isAr
                    ? 'جارٍ فتح نافذة Google...'
                    : 'Opening Google Sign-In...'
                  : isAr
                    ? 'المتابعة باستخدام Google'
                    : 'Continue with Google'}
              </span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleOnboardingSubmit} className="mt-5 space-y-4">
            <p className="text-sm leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
              {isAr
                ? 'أكمل ملفك السريع لتخصيص لوحتك. يمكنك تعديل دورك وبياناتك في أي وقت من إعدادات الحساب.'
                : 'Complete your quick profile to personalize your workspace. You can update your role anytime in account settings.'}
            </p>

            {/* Role Selection Cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setAccountType('startup')}
                aria-pressed={accountType === 'startup'}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-start transition-colors cursor-pointer ${
                  accountType === 'startup'
                    ? 'border-[#0071e3] bg-[#0071e3]/8 dark:border-[#2997ff] dark:bg-[#2997ff]/12'
                    : 'border-[#d2d2d7] bg-white hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:hover:border-[#a1a1a6]'
                }`}
              >
                <Building2
                  className={`h-5 w-5 ${
                    accountType === 'startup'
                      ? 'text-[#0071e3] dark:text-[#2997ff]'
                      : 'text-[#515154] dark:text-[#a1a1a6]'
                  }`}
                />
                <div>
                  <p className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {isAr ? 'حساب شركة ناشئة' : 'Startup Account'}
                  </p>
                  <p className="mt-0.5 text-xs text-[#515154] dark:text-[#a1a1a6]">
                    {isAr
                      ? 'اعرض خدماتك وأدر طلبات العملاء'
                      : 'Publish services & review client requests'}
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAccountType('client')}
                aria-pressed={accountType === 'client'}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-start transition-colors cursor-pointer ${
                  accountType === 'client'
                    ? 'border-[#0071e3] bg-[#0071e3]/8 dark:border-[#2997ff] dark:bg-[#2997ff]/12'
                    : 'border-[#d2d2d7] bg-white hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:hover:border-[#a1a1a6]'
                }`}
              >
                <Briefcase
                  className={`h-5 w-5 ${
                    accountType === 'client'
                      ? 'text-[#0071e3] dark:text-[#2997ff]'
                      : 'text-[#515154] dark:text-[#a1a1a6]'
                  }`}
                />
                <div>
                  <p className="text-sm font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                    {isAr ? 'حساب عميل' : 'Client Account'}
                  </p>
                  <p className="mt-0.5 text-xs text-[#515154] dark:text-[#a1a1a6]">
                    {isAr
                      ? 'أرسل احتياجاتك وتابع ردود الشركات'
                      : 'Submit briefs & track startup decisions'}
                  </p>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="onboard-name"
                  className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                >
                  {isAr ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <div className="relative mt-1.5">
                  <User
                    className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                  />
                  <input
                    id="onboard-name"
                    type="text"
                    required
                    maxLength={120}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-2.5 ps-10 pe-3.5 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="onboard-org"
                  className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                >
                  {accountType === 'startup'
                    ? isAr
                      ? 'اسم الشركة الناشئة'
                      : 'Startup Name'
                    : isAr
                      ? 'اسم المشروع أو الجهة (اختياري)'
                      : 'Company / Project (optional)'}
                </label>
                <input
                  id="onboard-org"
                  type="text"
                  maxLength={140}
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder={
                    accountType === 'startup'
                      ? isAr
                        ? 'مثال: سحابة للحلول الرقمية'
                        : 'e.g., Cloudline Digital'
                      : isAr
                        ? 'مثال: محمصة سدرة'
                        : 'e.g., Sidra Coffee'
                  }
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="onboard-region"
                  className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                >
                  {isAr ? 'المنطقة الأساسية' : 'Primary Region'}
                </label>
                <div className="relative mt-1.5">
                  <select
                    id="onboard-region"
                    value={regionId}
                    onChange={(e) => setRegionId(e.target.value as RegionId)}
                    className="min-h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-2.5 ps-3.5 pe-9 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff] dark:focus:bg-[#242426] cursor-pointer"
                  >
                    {REGIONS.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.label[lang]}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515154] dark:text-[#a1a1a6]"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="onboard-contact"
                  className="block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]"
                >
                  {isAr ? 'وسيلة التواصل المفضلة (اختياري)' : 'Preferred Contact (optional)'}
                </label>
                <input
                  id="onboard-contact"
                  type="text"
                  maxLength={200}
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  placeholder={
                    isAr ? 'بريد عمل أو جوال للتنسيق' : 'Work email or phone'
                  }
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]"
                />
              </div>
            </div>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] disabled:opacity-60 cursor-pointer"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {saving
                  ? isAr
                    ? 'جارٍ حفظ حسابك...'
                    : 'Saving profile...'
                  : isAr
                    ? 'حفظ والبدء في المنصة'
                    : 'Save & Continue'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
