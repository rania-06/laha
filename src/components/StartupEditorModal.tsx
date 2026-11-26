import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, ChevronDown, Loader2, X } from 'lucide-react';
import {
  CATEGORIES,
  REGIONS,
  type CategoryId,
  type RegionId,
  type StartupService,
} from '../data/startups';
import type { Language } from '../i18n/translations';
import {
  FIELD_LIMITS,
  type StartupMutationInput,
} from '../services/firestoreService';

interface StartupEditorModalProps {
  lang: Language;
  isOpen: boolean;
  editingStartup: StartupService | null;
  defaultStartupName?: string;
  defaultRegionId?: RegionId;
  defaultContact?: string;
  onClose: () => void;
  onSave: (
    input: StartupMutationInput,
    editingId?: string
  ) => Promise<void>;
}

function hasLetters(val: string): boolean {
  return /[\u0600-\u06FFa-zA-Z]{2,}/.test(val.trim());
}

function parseBudgetDigits(raw: string): number {
  const digits = raw.replace(/[^\d]/g, '');
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 10000;
}

export function StartupEditorModal({
  lang,
  isOpen,
  editingStartup,
  defaultStartupName = '',
  defaultRegionId = 'riyadh',
  defaultContact = '',
  onClose,
  onSave,
}: StartupEditorModalProps) {
  const isAr = lang === 'ar';

  const [startupName, setStartupName] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [categoryId, setCategoryId] = useState<CategoryId>('tech');
  const [regionId, setRegionId] = useState<RegionId>(defaultRegionId);
  const [city, setCity] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('21');
  const [startingBudget, setStartingBudget] = useState('');
  const [budgetSar, setBudgetSar] = useState('8000');
  const [summary, setSummary] = useState('');
  const [idealClient, setIdealClient] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [responseTime, setResponseTime] = useState('');
  const [teamAndSupport, setTeamAndSupport] = useState('');
  const [contactChannel, setContactChannel] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (editingStartup) {
      setStartupName(editingStartup.startupName[lang]);
      setServiceTitle(editingStartup.serviceTitle[lang]);
      setCategoryId(editingStartup.categoryId);
      setRegionId(editingStartup.regionId);
      setCity(editingStartup.city[lang]);
      setDeliveryTime(editingStartup.deliveryTime[lang]);
      setDeliveryDays(String(editingStartup.deliveryDays || 21));
      setStartingBudget(editingStartup.startingBudget[lang]);
      setBudgetSar(String(editingStartup.budgetSar || 8000));
      setSummary(editingStartup.summary[lang]);
      setIdealClient(editingStartup.idealClient[lang]);
      setDeliverables(editingStartup.deliverables[lang]);
      setResponseTime(editingStartup.responseTime[lang]);
      setTeamAndSupport(editingStartup.teamAndSupport[lang]);
      setContactChannel(editingStartup.contactChannel || '');
    } else {
      setStartupName(defaultStartupName);
      setServiceTitle('');
      setCategoryId('tech');
      setRegionId(defaultRegionId);
      setCity('');
      setDeliveryTime(isAr ? '3 أسابيع' : '3 weeks');
      setDeliveryDays('21');
      setStartingBudget(isAr ? 'ابتداءً من 8,000 ر.س' : 'From 8,000 SAR');
      setBudgetSar('8000');
      setSummary('');
      setIdealClient('');
      setDeliverables('');
      setResponseTime(isAr ? 'خلال 6 ساعات' : 'Within 6 hours');
      setTeamAndSupport(
        isAr
          ? 'فريق متخصص · دعم بعد التسليم 30 يومًا'
          : 'Dedicated team · 30-day post-launch support'
      );
      setContactChannel(defaultContact);
    }
  }, [
    isOpen,
    editingStartup,
    lang,
    isAr,
    defaultStartupName,
    defaultRegionId,
    defaultContact,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasLetters(startupName) || startupName.trim().length < FIELD_LIMITS.startupName.min) {
      setError(
        isAr
          ? 'يرجى كتابة اسم الشركة الناشئة بوضوح (حرفان على الأقل).'
          : 'Please enter a valid startup name (at least 2 letters).'
      );
      return;
    }
    if (!hasLetters(serviceTitle) || serviceTitle.trim().length < FIELD_LIMITS.serviceTitle.min) {
      setError(
        isAr
          ? 'يرجى كتابة عنوان واضح للخدمة (4 أحرف على الأقل).'
          : 'Please enter a clear service title (at least 4 characters).'
      );
      return;
    }
    if (!hasLetters(summary) || summary.trim().length < FIELD_LIMITS.summary.min) {
      setError(
        isAr
          ? 'يرجى كتابة وصف واضح للخدمة (10 أحرف على الأقل).'
          : 'Please provide a clear service overview (at least 10 characters).'
      );
      return;
    }
    if (!hasLetters(idealClient) || idealClient.trim().length < FIELD_LIMITS.idealClient.min) {
      setError(
        isAr
          ? 'يرجى تحديد معيار العميل الأنسب (6 أحرف على الأقل).'
          : 'Please describe your ideal client (at least 6 characters).'
      );
      return;
    }

    const regionMeta = REGIONS.find((r) => r.id === regionId) ?? REGIONS[0];
    const cleanCity = city.trim() || regionMeta.hubCity[lang];
    const cleanDelivery = deliveryTime.trim() || (isAr ? '3 أسابيع' : '3 weeks');
    const cleanBudgetLabel =
      startingBudget.trim() ||
      (isAr ? `ابتداءً من ${budgetSar} ر.س` : `From ${budgetSar} SAR`);
    const numericBudget = Number.parseInt(budgetSar, 10) || parseBudgetDigits(cleanBudgetLabel);
    const numericDays = Math.min(365, Math.max(1, Number.parseInt(deliveryDays, 10) || 21));
    const cleanDeliverables = deliverables.trim() || summary.trim().slice(0, 120);
    const cleanResponse = responseTime.trim() || (isAr ? 'خلال 24 ساعة' : 'Within 24 hours');
    const cleanTeam =
      teamAndSupport.trim() ||
      (isAr ? 'فريق مخصص · متابعة بعد التسليم' : 'Dedicated team · Post-launch support');

    // Preserve the opposite language text when editing an existing bilingual record
    const mergeLocalized = (
      current: string,
      existing?: { ar: string; en: string }
    ) => {
      if (!existing) return { ar: current, en: current };
      return lang === 'ar'
        ? { ar: current, en: existing.en || current }
        : { ar: existing.ar || current, en: current };
    };

    const payload: StartupMutationInput = {
      categoryId,
      regionId,
      startupName: mergeLocalized(startupName.trim(), editingStartup?.startupName),
      serviceTitle: mergeLocalized(serviceTitle.trim(), editingStartup?.serviceTitle),
      city: mergeLocalized(cleanCity, editingStartup?.city),
      deliveryTime: mergeLocalized(cleanDelivery, editingStartup?.deliveryTime),
      deliveryDays: numericDays,
      startingBudget: mergeLocalized(cleanBudgetLabel, editingStartup?.startingBudget),
      budgetSar: numericBudget,
      summary: mergeLocalized(summary.trim(), editingStartup?.summary),
      idealClient: mergeLocalized(idealClient.trim(), editingStartup?.idealClient),
      deliverables: mergeLocalized(cleanDeliverables, editingStartup?.deliverables),
      responseTime: mergeLocalized(cleanResponse, editingStartup?.responseTime),
      teamAndSupport: mergeLocalized(cleanTeam, editingStartup?.teamAndSupport),
      contactChannel: contactChannel.trim(),
    };

    setSaving(true);
    try {
      await onSave(payload, editingStartup?.id);
      onClose();
    } catch {
      setError(
        isAr
          ? 'تعذّر حفظ بيانات الخدمة في قاعدة البيانات. تحقق من الصلاحيات وحاول مجددًا.'
          : 'Could not save the service right now. Please check permissions and try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'mt-1.5 min-h-11 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]';
  const labelCls = 'block text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-2.5 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="startup-editor-title"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#d2d2d7]/70 bg-white p-5 text-[#1d1d1f] shadow-2xl dark:border-[#38383a] dark:bg-[#161617] dark:text-[#f5f5f7] sm:rounded-3xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#d2d2d7]/70 pb-4 dark:border-[#2c2c2e]">
          <div>
            <p className="text-xs font-semibold text-[#0066cc] dark:text-[#2997ff]">
              {editingStartup
                ? isAr
                  ? 'تعديل خدمة منشورة'
                  : 'Edit Published Service'
                : isAr
                  ? 'إضافة خدمة جديدة للدليل'
                  : 'Publish New Startup Service'}
            </p>
            <h2
              id="startup-editor-title"
              className="mt-1 text-2xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]"
            >
              {editingStartup
                ? editingStartup.serviceTitle[lang]
                : isAr
                  ? 'بيانات خدمة شركتك الناشئة'
                  : 'Your Startup Service Details'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label={isAr ? 'إغلاق' : 'Close'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d2d2d7] text-[#1d1d1f] transition-colors hover:bg-[#f5f5f7] dark:border-[#38383a] dark:text-[#f5f5f7] dark:hover:bg-[#2c2c2e] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                {isAr ? 'اسم الشركة الناشئة *' : 'Startup Name *'}
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.startupName.max}
                value={startupName}
                onChange={(e) => setStartupName(e.target.value)}
                placeholder={isAr ? 'مثال: سحابة للحلول الرقمية' : 'e.g., Cloudline Digital'}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                {isAr ? 'المجال *' : 'Category *'}
              </label>
              <div className="relative mt-1.5">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value as CategoryId)}
                  className="min-h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-2.5 ps-3.5 pe-9 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff] dark:focus:bg-[#242426] cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label[lang]}
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
            <label className={labelCls}>
              {isAr ? 'عنوان الخدمة المقدمة *' : 'Service Title *'}
            </label>
            <input
              type="text"
              maxLength={FIELD_LIMITS.serviceTitle.max}
              value={serviceTitle}
              onChange={(e) => setServiceTitle(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال: تطوير متاجر إلكترونية وتطبيقات حجز'
                  : 'e.g., Custom e-commerce & booking apps'
              }
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                {isAr ? 'المنطقة *' : 'Region *'}
              </label>
              <div className="relative mt-1.5">
                <select
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value as RegionId)}
                  className="min-h-11 w-full appearance-none rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] py-2.5 ps-3.5 pe-9 text-sm text-[#1d1d1f] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:focus:border-[#2997ff] dark:focus:bg-[#242426] cursor-pointer"
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

            <div>
              <label className={labelCls}>
                {isAr ? 'المدينة' : 'City'}
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.city.max}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={isAr ? 'مثال: الرياض' : 'e.g., Riyadh'}
                className={inputCls}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelCls}>
                {isAr ? 'مدة التنفيذ (نص)' : 'Delivery Label'}
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.deliveryTime.max}
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                placeholder={isAr ? '3 أسابيع' : '3 weeks'}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                {isAr ? 'الأيام التقديرية' : 'Est. Days'}
              </label>
              <input
                type="number"
                min={1}
                max={365}
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                className={`${inputCls} tabular-nums`}
              />
            </div>

            <div>
              <label className={labelCls}>
                {isAr ? 'الميزانية (نص)' : 'Budget Label'}
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.startingBudget.max}
                value={startingBudget}
                onChange={(e) => setStartingBudget(e.target.value)}
                placeholder={isAr ? 'ابتداءً من 8,000 ر.س' : 'From 8,000 SAR'}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                {isAr ? 'السعر المبدئي (ر.س)' : 'Budget (SAR)'}
              </label>
              <input
                type="number"
                min={0}
                max={10000000}
                value={budgetSar}
                onChange={(e) => setBudgetSar(e.target.value)}
                className={`${inputCls} tabular-nums`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>
              {isAr ? 'وصف الخدمة *' : 'Service Overview *'}
            </label>
            <textarea
              rows={3}
              maxLength={FIELD_LIMITS.summary.max}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={
                isAr
                  ? 'اشرح القيمة التي تقدمها شركتك بوضوح...'
                  : 'Describe what your startup delivers clearly...'
              }
              className="mt-1.5 w-full rounded-xl border border-[#d2d2d7] bg-[#f5f5f7] px-3.5 py-2.5 text-sm text-[#1d1d1f] placeholder:text-[#6e6e73] focus:border-[#0071e3] focus:bg-white dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7] dark:placeholder:text-[#8e8e93] dark:focus:border-[#2997ff] dark:focus:bg-[#242426]"
            />
          </div>

          <div>
            <label className={labelCls}>
              {isAr ? 'من هو العميل الأنسب؟ *' : 'Ideal Client Criteria *'}
            </label>
            <input
              type="text"
              maxLength={FIELD_LIMITS.idealClient.max}
              value={idealClient}
              onChange={(e) => setIdealClient(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال: العيادات والمتاجر المتنامية التي تحتاج حلًا سريع التنفيذ'
                  : 'e.g., Growing clinics or stores looking for rapid delivery'
              }
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>
              {isAr ? 'أبرز المخرجات' : 'Key Deliverables'}
            </label>
            <input
              type="text"
              maxLength={FIELD_LIMITS.deliverables.max}
              value={deliverables}
              onChange={(e) => setDeliverables(e.target.value)}
              placeholder={
                isAr
                  ? 'مثال: تصميم كامل + برمجة + تدريب الفريق عند التسليم'
                  : 'e.g., Full design + build + team training handover'
              }
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>
                {isAr ? 'سرعة الاستجابة' : 'Response Speed'}
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.responseTime.max}
                value={responseTime}
                onChange={(e) => setResponseTime(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                {isAr ? 'الفريق والدعم' : 'Team & Support'}
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.teamAndSupport.max}
                value={teamAndSupport}
                onChange={(e) => setTeamAndSupport(e.target.value)}
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                {isAr ? 'قناة التواصل العامة' : 'Business Contact'}
              </label>
              <input
                type="text"
                maxLength={FIELD_LIMITS.contactChannel.max}
                value={contactChannel}
                onChange={(e) => setContactChannel(e.target.value)}
                placeholder={isAr ? 'موقع أو بريد العمل' : 'Website or work email'}
                className={inputCls}
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2.5 border-t border-[#d2d2d7]/70 pt-4 dark:border-[#2c2c2e] sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-11 rounded-full border border-[#d2d2d7] bg-white px-5 py-2.5 text-sm font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] cursor-pointer"
            >
              {isAr ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] disabled:opacity-60 cursor-pointer"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>
                {saving
                  ? isAr
                    ? 'جارٍ الحفظ...'
                    : 'Saving...'
                  : editingStartup
                    ? isAr
                      ? 'حفظ التعديلات'
                      : 'Save Changes'
                    : isAr
                      ? 'نشر الخدمة'
                      : 'Publish Service'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
