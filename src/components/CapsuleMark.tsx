interface CapsuleMarkProps {
  className?: string;
}

export function CapsuleMark({ className = "h-10 w-10" }: CapsuleMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M27.5 26.2A11.5 11.5 0 0 1 13.8 12.5a11.5 11.5 0 1 0 13.7 13.7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M27 9.5v5M24.5 12h5"
        stroke="#F472B6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="31.5" cy="18" r="1.25" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
