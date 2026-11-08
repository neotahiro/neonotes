/** The NeoNotes mark: a lowercase "n" whose right leg folds like a page corner. */
export function Logo({
  size = 64,
  className,
  decorative = false,
}: {
  size?: number;
  className?: string;
  /** Hide from screen readers when the name "NeoNotes" is written next to it. */
  decorative?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": "NeoNotes" })}
      // Same corner radius as the tile itself, so rings and shadows follow its shape exactly.
      style={{ borderRadius: size * (112 / 512) }}
      className={className}
    >
      <rect width="512" height="512" rx="112" fill="#0B1220" />
      <g transform="translate(47.9 70.3) scale(0.52)">
        <path
          d="M447 95 L700 330 C735 370 745 410 745 450 V650 Q745 680 715 680 H530 Q500 680 500 650 V265 Z"
          fill="#22D3EE"
        />
        <path
          d="M55 65 Q55 35 85 35 H300 C420 35 500 110 500 265 H300 V650 Q300 680 270 680 H85 Q55 680 55 650 Z"
          fill="#F1F5F9"
        />
      </g>
    </svg>
  );
}
