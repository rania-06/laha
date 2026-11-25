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
          className={`relative ${aspectClass} w-full overflow-hidden bg-[#1d1d1f] select-none`}
          aria-label={startupName}
        >
          <svg
            viewBox="0 0 400 250"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <rect width="400" height="250" fill="#1D1D1F" />
            <g stroke="#2C2C2E" strokeWidth="1">
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
              fill="#2C2C2E"
              stroke="#48484A"
              strokeWidth="1.2"
            />
            <rect x="88" y="72" width="96" height="9" rx="4.5" fill="#0071E3" />
            <rect x="88" y="96" width="176" height="7" rx="3.5" fill="#636366" />
            <rect x="88" y="114" width="132" height="7" rx="3.5" fill="#48484A" />
            <rect x="88" y="144" width="100" height="38" rx="8" fill="#1D1D1F" stroke="#48484A" />
            <rect
              x="202"
              y="144"
              width="110"
              height="38"
              rx="8"
              fill="#0071E3"
              fillOpacity="0.22"
              stroke="#0071E3"
              strokeOpacity="0.7"
            />
            <circle cx="296" cy="76" r="12" fill="none" stroke="#86868B" strokeWidth="1.5" />
            <circle cx="296" cy="76" r="3.5" fill="#0071E3" />
          </svg>
        </div>
      );

    case 'design':
      return (
        <div
          className={`relative ${aspectClass} w-full overflow-hidden bg-[#f5f5f7] select-none`}
          aria-label={startupName}
        >
          <svg
            viewBox="0 0 400 250"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <rect width="400" height="250" fill="#F5F5F7" />
            <circle cx="288" cy="125" r="76" fill="#E8E8ED" />
            <circle cx="288" cy="125" r="46" fill="none" stroke="#0071E3" strokeWidth="1.6" />
            <rect
              x="56"
              y="44"
              width="148"
              height="162"
              rx="12"
              fill="#FFFFFF"
              stroke="#D2D2D7"
              strokeWidth="1.2"
            />
            <rect x="76" y="66" width="44" height="44" rx="8" fill="#1D1D1F" />
            <rect x="130" y="66" width="54" height="44" rx="8" fill="#0071E3" />
            <line x1="76" y1="134" x2="184" y2="134" stroke="#1D1D1F" strokeWidth="2.2" strokeLinecap="round" />
            <line x1="76" y1="152" x2="156" y2="152" stroke="#86868B" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="76" y1="168" x2="136" y2="168" stroke="#D2D2D7" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M242 174 L334 76" stroke="#1D1D1F" strokeWidth="1.2" strokeDasharray="4 4" />
          </svg>
        </div>
      );

    case 'growth':
      return (
        <div
          className={`relative ${aspectClass} w-full overflow-hidden bg-[#f5f5f7] select-none`}
          aria-label={startupName}
        >
          <svg
            viewBox="0 0 400 250"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <rect width="400" height="250" fill="#F5F5F7" />
            <line x1="48" y1="200" x2="352" y2="200" stroke="#D2D2D7" strokeWidth="1.2" />
            <line x1="48" y1="150" x2="352" y2="150" stroke="#E8E8ED" strokeWidth="1" />
            <line x1="48" y1="100" x2="352" y2="100" stroke="#E8E8ED" strokeWidth="1" />
            <rect x="72" y="156" width="40" height="44" rx="6" fill="#D2D2D7" />
            <rect x="134" y="128" width="40" height="72" rx="6" fill="#AEAEB2" />
            <rect x="196" y="96" width="40" height="104" rx="6" fill="#1D1D1F" />
            <rect x="258" y="64" width="46" height="136" rx="6" fill="#0071E3" />
            <path
              d="M92 142 L154 114 L216 84 L281 48"
              fill="none"
              stroke="#1D1D1F"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <circle cx="281" cy="48" r="5.5" fill="#0071E3" stroke="#FFFFFF" strokeWidth="2" />
          </svg>
        </div>
      );

    case 'operations':
    default:
      return (
        <div
          className={`relative ${aspectClass} w-full overflow-hidden bg-[#ececef] select-none`}
          aria-label={startupName}
        >
          <svg
            viewBox="0 0 400 250"
            className="h-full w-full"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <rect width="400" height="250" fill="#F2F2F7" />
            <rect x="52" y="52" width="126" height="58" rx="10" fill="#FFFFFF" stroke="#D2D2D7" />
            <rect x="222" y="52" width="126" height="58" rx="10" fill="#FFFFFF" stroke="#D2D2D7" />
            <rect x="137" y="144" width="126" height="58" rx="10" fill="#1D1D1F" />
            <path d="M178 81 H222" stroke="#0071E3" strokeWidth="2" />
            <path d="M115 110 V173 H137" fill="none" stroke="#86868B" strokeWidth="1.5" />
            <path d="M285 110 V173 H263" fill="none" stroke="#86868B" strokeWidth="1.5" />
            <rect x="70" y="73" width="76" height="6" rx="3" fill="#1D1D1F" />
            <rect x="70" y="87" width="52" height="5" rx="2.5" fill="#AEAEB2" />
            <rect x="240" y="73" width="76" height="6" rx="3" fill="#0071E3" />
            <rect x="240" y="87" width="52" height="5" rx="2.5" fill="#AEAEB2" />
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
    <div className="relative flex h-full min-h-[360px] flex-col justify-between overflow-hidden rounded-3xl bg-[#1d1d1f] p-7 text-white sm:p-8">
      <svg
        viewBox="0 0 560 440"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
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
          stroke="#0071E3"
          strokeOpacity="0.4"
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

      <div className="relative z-10 flex items-center justify-between border-b border-white/12 pb-4 text-xs text-[#a1a1a6]">
        <div className="flex items-center gap-2.5">
          <LahaLogo className="h-6 w-6" inverted />
          <span className="font-medium text-white">{copy.headerLeft}</span>
        </div>
        <span className="tabular-nums">{copy.headerRight(totalStartups)}</span>
      </div>

      <div className="relative z-10 my-7 space-y-6">
        <div className="space-y-1.5 border-b border-white/12 pb-6">
          <p className="text-xs font-medium text-[#2997ff]">{copy.step1Label}</p>
          <p className="text-lg font-semibold leading-snug text-white">
            {copy.step1Title}
          </p>
          <p className="text-sm leading-relaxed text-[#a1a1a6]">{copy.step1Desc}</p>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#2997ff]">{copy.step2Label}</p>
          <p className="text-lg font-semibold leading-snug text-white">
            {copy.step2Title}
          </p>
          <p className="text-sm leading-relaxed text-[#a1a1a6]">{copy.step2Desc}</p>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-6 border-t border-white/12 pt-5">
        <div>
          <p className="text-xs text-[#a1a1a6]">{copy.stat1}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {totalStartups}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#a1a1a6]">{copy.stat2}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {acceptedClientsCount}
          </p>
        </div>
      </div>
    </div>
  );
}
