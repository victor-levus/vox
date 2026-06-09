interface VoxLogoProps {
  className?: string;
}

export function VoxLogo({ className }: VoxLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vox-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      {/* Hexagon — evokes a 6-blade camera aperture */}
      <path d="M16 2L28.1 9V23L16 30L3.9 23V9L16 2Z" fill="url(#vox-grad)" />
      {/* Subtle lens ring */}
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
      {/* Play triangle */}
      <path d="M13.5 11.5L22.5 16L13.5 20.5V11.5Z" fill="white" />
    </svg>
  );
}
