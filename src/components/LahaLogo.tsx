interface LahaLogoProps {
  className?: string;
  inverted?: boolean;
}

/**
 * Minimalist geometric emblem for Laha (لها):
 * Two interlocking precision arcs symbolizing a startup and its ideal client locking into alignment,
 * echoing both the Arabic "ل" curve and the Latin "L" angle.
 */
export function LahaLogo({ className = 'h-7 w-7', inverted = false }: LahaLogoProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="34"
        height="34"
        rx="9"
        className={
          inverted
            ? 'fill-[#1d1d1f] stroke-[#3a3a3c]'
            : 'fill-[#f5f5f7] stroke-[#d2d2d7] dark:fill-[#1c1c1e] dark:stroke-[#38383a]'
        }
        strokeWidth="1.25"
      />
      {/* Startup geometric stroke */}
      <path
        d="M12 10.5V20.5C12 23.5376 14.4624 26 17.5 26H24.5"
        className={inverted ? 'stroke-white' : 'stroke-[#1d1d1f] dark:stroke-white'}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Client interlocking precision arc */}
      <path
        d="M24 11.5C20.6863 11.5 18 14.1863 18 17.5C18 19.4 18.9 21 20.4 22"
        className="stroke-[#0071e3] dark:stroke-[#2997ff]"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle
        cx="24"
        cy="11.5"
        r="2.1"
        className="fill-[#0071e3] dark:fill-[#2997ff]"
      />
    </svg>
  );
}
