export default function VerifiedBadge({
  size = 20,
  gradId = 'verifiedGrad',
}: {
  size?: number
  gradId?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ flexShrink: 0 }}
      aria-label="Верифицированный канал"
    >
      <title>Верифицированный канал</title>
      <circle cx="12" cy="12" r="11" fill="#22c55e" />
      <circle cx="12" cy="12" r="11" fill={`url(#${gradId})`} />
      <path
        d="M7.5 12.5L10.5 15.5L16.5 9"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <radialGradient id={gradId} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#15803d" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}
