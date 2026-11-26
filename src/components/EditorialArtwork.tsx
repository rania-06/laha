import type { CategoryId } from '../data/startups';
import { UI_COPY, type Language } from '../i18n/translations';
import { LahaLogo } from './LahaLogo';

interface CategoryArtworkProps {
  categoryId: CategoryId;
  startupName: string;
  compact?: boolean;
}

export function CategoryArtwork({
  categoryId,
  startupName,
  compact = false,
}: CategoryArtworkProps) {
  const aspectClass = compact ? 'aspect-[16/9]' : 'aspect-[16/10]';

  switch (categoryId) {
    case 'tech':
      return (
        <div
          className={`relative ${aspectClass} w-full overflow-hidden bg-[#141416] select-none`}
          aria-label={startupName}
        >
          <svg
            viewBox="0 0 400 250"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <rect width="400" height="250" fill="#141416" />
            <g stroke="#262629" strokeWidth="1">
              <line x1="0" y1="62" x2="400" y2="62" />
              <line x1="0" y1="125" x2="400" y2="125" />
              <line x1="0" y1="188" x2="400" y2="188" />
              <line x1="100" y1="0" x2="100" y2="250" />
              <line x1="200" y1="0" x2="200" y2="250" />
              <line x1="300" y1="0" x2="300" y2="250" />
            </g>
            <rect
              x="64"
              y="46"
              width="272"
              height="158"
              rx="14"
              fill="#1E1E21"
              stroke="#3A3A3D"
              strokeWidth="1.2"
            />
            <rect x="88" y="72" width="96" height="9" rx="4.5" fill="#2997FF" />
            <rect x="88" y="96" width="176" height="7" rx="3.5" fill="#6E6E73" />
            <rect x="88" y="114" width="132" height="7" rx="3.5" fill="#48484A" />
            <rect x="88" y="144" width="100" height="38" rx="8" fill="#141416" stroke="#3A3A3D" />
            <rect
              x="202"
              y="144"
              width="110"
              height="38"
              rx="8"
              fill="#0071E3"
              fillOpacity="0.25"
              stroke="#2997FF"
              strokeOpacity="0.75"
            />
            <circle cx="296" cy="76" r="12" fill="none" stroke="#8E8E93" strokeWidth="1.5" />
            <circle cx="296" cy="76" r="3.5" fill="#2997FF" />
          </svg>
        </div>
      );

    case 'design':
      return (
        <div
          className={`relative ${aspectClass} w-full overflow-hidden bg-[#f2f2f7] dark:bg-[#1c1c1e] select-none`}
          aria-label={startupName}
        >
          <svg
            viewBox="0 0 400 250"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <rect width="400" height="250" className="fill-[#f2f2f7] dark:fill-[#1c1c1e]" />
            <circle cx="288" cy="125" r="76" className="fill-[#e5e5ea] dark:fill-[#2c2c2e]" />
            <circle cx="288" cy="125" r="46" fill="none" className="stroke-[#0071e3] dark:stroke-[#2997ff]" strokeWidth="1.8" />
            <rect
              x="56"
              y="44"
              width="148"
              height="162"
              rx="12"
              className="fill-white stroke-[#d2d2d7] dark:fill-[#141416] dark:stroke-[#38383a]"
              strokeWidth="1.2"
            />
            <rect x="76" y="66" width="44" height="44" rx="8" className="fill-[#1d1d1f] dark:fill-[#f5f5f7]" />
            <rect x="130" y="66" width="54" height="44" rx="8" className="fill-[#0071e3] dark:fill-[#2997ff]" />
            <line x1="76" y1="134" x2="184" y2="134" className="stroke-[#1d1d1f] dark:stroke-[#f5f5f7]" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="76" y1="152" x2="156" y2="152" className="stroke-[#6e6e73] dark:stroke-[#a1a1a6]" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="76" y1="168" x2="136" y2="168" className="stroke-[#d2d2d7] dark:stroke-[#48484a]" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M242 174 L334 76" className="stroke-[#1d1d1f] dark:stroke-[#a1a1a6]" strokeWidth="1.2" strokeDasharray="4 4" />
          </svg>
        </div>
      );

    case 'growth':
      return (
        <div
          className={`relative ${aspectClass} w-full overflow-hidden bg-[#f2f2f7] dark:bg-[#1c1c1e] select-none`}
          aria-label={startupName}
        >
          <svg
            viewBox="0 0 400 250"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <rect width="400" height="250" className="fill-[#f2f2f7] dark:fill-[#1c1c1e]" />
            <line x1="48" y1="200" x2="352" y2="200" className="stroke-[#d2d2d7] dark:stroke-[#38383a]" strokeWidth="1.2" />
            <line x1="48" y1="150" x2="352" y2="150" className="stroke-[#e5e5ea] dark:stroke-[#2c2c2e]" strokeWidth="1" />
            <line x1="48" y1="100" x2="352" y2="100" className="stroke-[#e5e5ea] dark:stroke-[#2c2c2e]" strokeWidth="1" />
            <rect x="72" y="156" width="40" height="44" rx="6" className="fill-[#d2d2d7] dark:fill-[#38383a]" />
            <rect x="134" y="128" width="40" height="72" rx="6" className="fill-[#aeaeb2] dark:fill-[#636366]" />
            <rect x="196" y="96" width="40" height="104" rx="6" className="fill-[#1d1d1f] dark:fill-[#e5e5ea]" />
            <rect x="258" y="64" width="46" height="136" rx="6" className="fill-[#0071e3] dark:fill-[#2997ff]" />
            <path
              d="M92 142 L154 114 L216 84 L281 48"
              fill="none"
              className="stroke-[#1d1d1f] dark:stroke-white"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="281" cy="48" r="5.5" className="fill-[#0071e3] dark:fill-[#2997ff] stroke-white dark:stroke-[#1c1c1e]" strokeWidth="2" />
          </svg>
        </div>
      );

    case 'operations':
    default:
      return (
        <div
          className={`relative ${aspectClass} w-full overflow-hidden bg-[#ececef] dark:bg-[#1c1c1e] select-none`}
          aria-label={startupName}
        >
          <svg
            viewBox="0 0 400 250"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <rect width="400" height="250" className="fill-[#f2f2f7] dark:fill-[#1c1c1e]" />
            <rect x="52" y="52" width="126" height="58" rx="10" className="fill-white stroke-[#d2d2d7] dark:fill-[#141416] dark:stroke-[#38383a]" />
            <rect x="222" y="52" width="126" height="58" rx="10" className="fill-white stroke-[#d2d2d7] dark:fill-[#141416] dark:stroke-[#38383a]" />
            <rect x="137" y="144" width="126" height="58" rx="10" className="fill-[#1d1d1f] dark:fill-[#2c2c2e]" />
            <path d="M178 81 H222" className="stroke-[#0071e3] dark:stroke-[#2997ff]" strokeWidth="2" />
            <path d="M115 110 V173 H137" fill="none" className="stroke-[#86868b] dark:stroke-[#636366]" strokeWidth="1.5" />
            <path d="M285 110 V173 H263" fill="none" className="stroke-[#86868b] dark:stroke-[#636366]" strokeWidth="1.5" />
            <rect x="70" y="73" width="76" height="6" rx="3" className="fill-[#1d1d1f] dark:fill-[#f5f5f7]" />
            <rect x="70" y="87" width="52" height="5" rx="2.5" className="fill-[#aeaeb2] dark:fill-[#636366]" />
            <rect x="240" y="73" width="76" height="6" rx="3" className="fill-[#0071e3] dark:fill-[#2997ff]" />
            <rect x="240" y="87" width="52" height="5" rx="2.5" className="fill-[#aeaeb2] dark:fill-[#636366]" />
            <rect x="157" y="165" width="84" height="6" rx="3" fill="#FFFFFF" />
            <rect x="157" y="179" width="56" height="5" rx="2.5" fill="#64D2FF" />
          </svg>
        </div>
      );
  }
}

interface HeroVisualProps {
  lang: Language;
  totalStartups: number;
  acceptedClientsCount: number;
}

export function HeroEditorialVisual({
  lang,
  totalStartups,
  acceptedClientsCount,
}: HeroVisualProps) {
  const copy = UI_COPY[lang].hero.visual;

  return (
    <div className="relative flex h-full min-h-[290px] flex-col justify-between overflow-hidden rounded-3xl border border-black/10 bg-[#141416] p-5 text-white shadow-xl dark:border-white/12 dark:bg-[#161617] sm:min-h-[340px] sm:p-7 lg:min-h-[380px] lg:p-8">
      <svg
        viewBox="0 0 560 440"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id="apple-grid"
            width="44"
            height="44"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 44 0 L 0 0 0 44"
              fill="none"
              stroke="#2C2C2E"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="560" height="440" fill="url(#apple-grid)" />
        <circle
          cx="450"
          cy="86"
          r="156"
          fill="none"
          stroke="#2997FF"
          strokeOpacity="0.38"
          strokeWidth="1"
        />
        <circle
          cx="450"
          cy="86"
          r="94"
          fill="none"
          stroke="#64D2FF"
          strokeOpacity="0.28"
          strokeWidth="1"
        />
      </svg>

      <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/12 pb-3.5 text-xs text-[#a1a1a6] sm:pb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <LahaLogo className="h-6 w-6 shrink-0" inverted />
          <span className="truncate font-semibold text-white">{copy.headerLeft}</span>
        </div>
        <span className="shrink-0 tabular-nums">{copy.headerRight(totalStartups)}</span>
      </div>

      <div className="relative z-10 my-5 space-y-5 sm:my-7 sm:space-y-6">
        <div className="space-y-1.5 border-b border-white/12 pb-5 sm:pb-6">
          <p className="text-xs font-semibold text-[#2997ff]">{copy.step1Label}</p>
          <p className="text-base font-bold leading-snug text-white sm:text-lg">
            {copy.step1Title}
          </p>
          <p className="text-xs leading-relaxed text-[#b4b4ba] sm:text-sm">{copy.step1Desc}</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-[#2997ff]">{copy.step2Label}</p>
          <p className="text-base font-bold leading-snug text-white sm:text-lg">
            {copy.step2Title}
          </p>
          <p className="text-xs leading-relaxed text-[#b4b4ba] sm:text-sm">{copy.step2Desc}</p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-white/12 pt-4 sm:gap-6 sm:pt-5">
        <div>
          <p className="text-xs text-[#a1a1a6]">{copy.stat1}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-white sm:text-2xl">
            {totalStartups}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#a1a1a6]">{copy.stat2}</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-white sm:text-2xl">
            {acceptedClientsCount}
          </p>
        </div>
      </div>
    </div>
  );
}
