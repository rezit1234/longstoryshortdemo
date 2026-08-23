export function AdminDismissButton({
  className,
  onClick,
  label = "Zavřít",
}: {
  className?: string;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={className ? `admin-dismiss-btn ${className}` : "admin-dismiss-btn"}
      aria-label={label}
      onClick={onClick}
    >
      <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M8.25 8.25l7.5 7.5M15.75 8.25l-7.5 7.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
