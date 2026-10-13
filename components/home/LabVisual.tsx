/**
 * Three small supporting visuals for the lab features, drawn in code rather
 * than photographed: an isolated boundary, a guided hint path, and a
 * scoreboard. Decorative — the copy carries the meaning.
 */
export default function LabVisual({ variant }: { variant: string }) {
  return (
    <div className="flex h-[92px] w-full items-center justify-center rounded-card border border-line bg-surface sm:w-[168px]">
      <svg
        viewBox="0 0 150 84"
        className="h-[76px] w-full max-w-[150px]"
        fill="none"
        aria-hidden="true"
      >
        {variant === 'isolated' ? (
          <>
            <rect
              x="14"
              y="14"
              width="122"
              height="56"
              rx="14"
              stroke="var(--line)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
            />
            <rect
              x="42"
              y="30"
              width="66"
              height="24"
              rx="8"
              stroke="var(--pine-600)"
              strokeWidth="1.75"
            />
            <circle cx="75" cy="42" r="4" fill="var(--pine-600)" />
            <path d="M14 42h20M136 42h-20" stroke="var(--line)" strokeWidth="1.5" />
          </>
        ) : null}

        {variant === 'guided' ? (
          <>
            <path d="M18 42h114" stroke="var(--line)" strokeWidth="1.5" />
            <path d="M18 42h58" stroke="var(--pine-600)" strokeWidth="2" />
            <circle cx="18" cy="42" r="5" fill="var(--pine-600)" />
            <circle cx="76" cy="42" r="5" fill="var(--pine-600)" />
            <circle
              cx="132"
              cy="42"
              r="5"
              stroke="var(--pine-600)"
              strokeWidth="1.75"
            />
            <path
              d="M26 26h28M26 20v12"
              stroke="var(--line)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M96 62h28M96 56v12"
              stroke="var(--line)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </>
        ) : null}

        {variant === 'score' ? (
          <>
            <path d="M20 66h110" stroke="var(--line)" strokeWidth="1.5" />
            <rect x="30" y="44" width="18" height="22" rx="4" fill="var(--pine-500)" opacity="0.25" />
            <rect x="66" y="30" width="18" height="36" rx="4" fill="var(--pine-600)" />
            <rect x="102" y="50" width="18" height="16" rx="4" fill="var(--pine-500)" opacity="0.25" />
            <path d="M39 34v-6M75 20v-6M111 40v-6" stroke="var(--line)" strokeWidth="1.5" />
          </>
        ) : null}
      </svg>
    </div>
  )
}
