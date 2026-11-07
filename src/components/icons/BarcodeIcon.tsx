type BarcodeIconProps = {
  size?: number;
  className?: string;
};

export function BarcodeIcon({ size = 28, className }: BarcodeIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 7V5a1 1 0 0 1 1-1h2" />
      <path d="M17 4h2a1 1 0 0 1 1 1v2" />
      <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
      <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
      <path d="M7 8v8" />
      <path d="M10 8v8" />
      <path d="M13 8v8" />
      <path d="M16 8v8" />
    </svg>
  );
}
