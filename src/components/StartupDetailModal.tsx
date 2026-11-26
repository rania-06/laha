import { useEffect } from 'react';
import {
  Banknote,
  Check,
  Clock,
  Layers,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  Scale,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  getCategoryLabel,
  getRegionLabel,
  type StartupService,
} from '../data/startups';
import { UI_COPY, type Language } from '../i18n/translations';
import { CategoryArtwork } from './EditorialArtwork';

interface StartupDetailModalProps {
  lang: Language;
  startup: StartupService | null;
  isInCompare: boolean;
  canEdit?: boolean;
  onClose: () => void;
  onEdit?: (startup: StartupService) => void;
  onToggleCompare: (startupId: string) => void;
  onMessageStartup: (startup: StartupService) => void;
  onRequestStartup: (startup: StartupService) => void;
}

export function StartupDetailModal({
  lang,
  startup,
  isInCompare,
  canEdit = false,
  onClose,
  onEdit,
  onToggleCompare,
  onMessageStartup,
  onRequestStartup,
}: StartupDetailModalProps) {
  useEffect(() => {
    if (!startup) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startup, onClose]);

  if (!startup) return null;

  const t = UI_COPY[lang].modal;
  const isAr = lang === 'ar';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-2.5 backdrop-blur-xs sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="startup-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#d2d2d7]/70 bg-white text-[#1d1d1f] shadow-2xl dark:border-[#38383a] dark:bg-[#161617] dark:text-[#f5f5f7] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Media Header with Close Button */}
        <div className="relative">
          <CategoryArtwork
            categoryId={startup.categoryId}
            startupName={startup.startupName[lang]}
            compact
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeAria}
            className="absolute end-3.5 top-3.5 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#1d1d1f] shadow-sm backdrop-blur-sm transition-colors hover:bg-white dark:bg-black/75 dark:text-white dark:hover:bg-black cursor-pointer sm:end-4 sm:top-4"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#515154] dark:text-[#a1a1a6]">
            <span className="font-semibold text-[#0066cc] dark:text-[#2997ff]">
              {getCategoryLabel(startup.categoryId, lang)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-[#1d1d1f] dark:text-[#f5f5f7]">
              {startup.city[lang]}
            </span>
            <span aria-hidden="true">·</span>
            <span>{getRegionLabel(startup.regionId, lang)}</span>
          </div>

          <h3
            id="startup-modal-title"
            className="mt-2.5 text-2xl font-bold text-[#1d1d1f] dark:text-[#f5f5f7]"
          >
            {startup.serviceTitle[lang]}
          </h3>
          <p className="mt-1 text-sm font-medium text-[#515154] dark:text-[#a1a1a6]">
            {startup.startupName[lang]}
          </p>

          {/* Key Specs Strip */}
          <div className="mt-6 grid grid-cols-1 gap-4 border-y border-[#d2d2d7]/80 py-5 dark:border-[#2c2c2e] sm:grid-cols-3">
            <div className="flex items-start gap-2.5">
              <Banknote
                className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc] dark:text-[#2997ff]"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs text-[#515154] dark:text-[#a1a1a6]">
                  {t.budgetTitle}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {startup.startingBudget[lang]}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock
                className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc] dark:text-[#2997ff]"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs text-[#515154] dark:text-[#a1a1a6]">
                  {t.deliveryTitle}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {startup.deliveryTime[lang]}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-[#0066cc] dark:text-[#2997ff]"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs text-[#515154] dark:text-[#a1a1a6]">
                  {t.locationTitle}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {startup.city[lang]}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <h4 className="text-xs font-semibold text-[#515154] dark:text-[#a1a1a6]">
                {t.overviewTitle}
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-[#1d1d1f] dark:text-[#e5e5ea]">
                {startup.summary[lang]}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-[#515154] dark:text-[#a1a1a6]">
                {t.idealClientTitle}
              </h4>
              <p className="mt-1.5 text-sm leading-relaxed text-[#1d1d1f] dark:text-[#e5e5ea]">
                {startup.idealClient[lang]}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 rounded-2xl bg-[#f5f5f7] p-4 dark:bg-[#1c1c1e] sm:grid-cols-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  <Layers
                    className="h-3.5 w-3.5 text-[#0066cc] dark:text-[#2997ff]"
                    aria-hidden="true"
                  />
                  <span>{t.deliverablesTitle}</span>
                </div>
                <p className="text-xs leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                  {startup.deliverables[lang]}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  <Zap
                    className="h-3.5 w-3.5 text-[#0066cc] dark:text-[#2997ff]"
                    aria-hidden="true"
                  />
                  <span>{t.responseTitle}</span>
                </div>
                <p className="text-xs leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                  {startup.responseTime[lang]}
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  <Users
                    className="h-3.5 w-3.5 text-[#0066cc] dark:text-[#2997ff]"
                    aria-hidden="true"
                  />
                  <span>{t.teamTitle}</span>
                </div>
                <p className="text-xs leading-relaxed text-[#515154] dark:text-[#a1a1a6]">
                  {startup.teamAndSupport[lang]}
                </p>
              </div>
            </div>

            {startup.contactChannel && (
              <div className="flex items-center gap-2 rounded-2xl border border-[#d2d2d7]/70 px-4 py-3 text-xs text-[#1d1d1f] dark:border-[#2c2c2e] dark:text-[#f5f5f7]">
                <Mail
                  className="h-4 w-4 shrink-0 text-[#0066cc] dark:text-[#2997ff]"
                  aria-hidden="true"
                />
                <span className="font-semibold">
                  {isAr ? 'قناة التواصل العامة:' : 'Business contact:'}
                </span>
                <span className="truncate text-[#515154] dark:text-[#a1a1a6]">
                  {startup.contactChannel}
                </span>
              </div>
            )}
          </div>

          {/* Modal Action Footer */}
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(startup);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#d2d2d7] bg-[#f5f5f7] px-4 py-2.5 text-xs font-semibold text-[#1d1d1f] transition-colors hover:border-[#1d1d1f] hover:bg-white dark:border-[#38383a] dark:bg-[#2c2c2e] dark:text-[#f5f5f7] whitespace-nowrap cursor-pointer"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isAr ? 'تعديل' : 'Edit'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onToggleCompare(startup.id)}
              aria-pressed={isInCompare}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isInCompare
                  ? 'border-[#1d1d1f] bg-[#1d1d1f] text-white dark:border-[#f5f5f7] dark:bg-[#f5f5f7] dark:text-black'
                  : 'border-[#d2d2d7] bg-white text-[#1d1d1f] hover:border-[#1d1d1f] dark:border-[#38383a] dark:bg-[#1c1c1e] dark:text-[#f5f5f7]'
              }`}
            >
              {isInCompare ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Scale className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{isInCompare ? t.comparedBtn : t.compareBtn}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onMessageStartup(startup);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#1d1d1f] bg-[#1d1d1f] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#323236] dark:border-[#f5f5f7] dark:bg-[#f5f5f7] dark:text-black dark:hover:bg-white whitespace-nowrap cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              <span>{isAr ? 'مراسلة الشركة' : 'Message Startup'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestStartup(startup);
              }}
              className="min-h-11 rounded-full bg-[#0071e3] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0062c4] whitespace-nowrap cursor-pointer"
            >
              {t.requestBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
