interface CapsuleMarkProps {
  className?: string;
}

export function CapsuleMark({ className = "h-10 w-10" }: CapsuleMarkProps) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M 116.02 54.41 A 78 78 0 1 0 201.05 144.16 A 62 62 0 0 1 116.02 54.41 Z"
        fill="currentColor"
      />
      <path
        d="M 179.0 48.0 Q 185.5 73.5 211.0 80.0 Q 185.5 86.5 179.0 112.0 Q 172.5 86.5 147.0 80.0 Q 172.5 73.5 179.0 48.0 Z"
        fill="#F472B6"
      />
    </svg>
  );
}
