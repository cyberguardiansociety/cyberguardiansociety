/**
 * Line illustration for the deep-pine feature tile: a lab range drawn as a
 * survey map — boundary, a dashed route between stations, and a flag at the
 * end. Built in code, drawn in the surrounding text colour, decorative only.
 */
export default function RangeIllustration({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 150"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="10" width="408" height="130" rx="18" strokeWidth="1.5" opacity="0.4" />
      <rect
        x="30"
        y="32"
        width="360"
        height="86"
        rx="12"
        strokeWidth="1.25"
        opacity="0.22"
        strokeDasharray="3 7"
      />

      <path
        d="M110 112h62a12 12 0 0 0 12-12V74a12 12 0 0 1 12-12h72a12 12 0 0 0 12-12"
        strokeWidth="1.75"
        opacity="0.85"
        strokeDasharray="5 6"
      />

      <circle cx="110" cy="112" r="4.5" fill="currentColor" stroke="none" opacity="0.9" />
      <circle cx="196" cy="62" r="4.5" fill="currentColor" stroke="none" opacity="0.9" />
      <circle cx="298" cy="112" r="4.5" fill="currentColor" stroke="none" opacity="0.9" />

      <path d="M356 50v22" strokeWidth="1.75" opacity="0.8" />
      <path d="M356 50h20l-6 5.5 6 5.5h-20" strokeWidth="1.5" opacity="0.8" />
    </svg>
  )
}
