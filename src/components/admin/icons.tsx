export function IconGrid({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13.5" y="5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="5" y="13.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
      <rect x="13.5" y="13.5" width="5.5" height="5.5" rx="1.2" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function IconTicket({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v1a1.5 1.5 0 0 0 0 3v1A2.5 2.5 0 0 1 17.5 16h-11A2.5 2.5 0 0 1 4 13.5v-1a1.5 1.5 0 0 0 0-3v-1Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M12 8v8" stroke="currentColor" strokeWidth="1.75" strokeDasharray="2 3" />
    </svg>
  );
}

export function IconRedeem({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9.5A2.5 2.5 0 0 1 6.5 7h11A2.5 2.5 0 0 1 20 9.5v.8a1.4 1.4 0 0 0 0 2.8v.4A2.5 2.5 0 0 1 17.5 16h-11A2.5 2.5 0 0 1 4 13.5v-.4a1.4 1.4 0 0 0 0-2.8V9.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="m9.5 12 1.6 1.6 3.4-3.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconShop({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 9.5 5.4 5.8A2 2 0 0 1 7.3 4.5h9.4a2 2 0 0 1 1.9 1.3L20 9.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M4 9.5h16v8A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-8Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path d="M9.5 20v-5h5v5" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

export function IconChart({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19h16M6.5 15.5 10 11l3 3 4.5-6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTeam({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="16.5" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M3.5 18.5c.8-2.6 2.9-4 5.5-4s4.7 1.4 5.5 4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M14.2 14.4c1.5-.5 3.2-.3 4.5 1.1.6.7 1 1.5 1.2 2.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconHelp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M9.7 9.4a2.4 2.4 0 1 1 3.7 2c-.7.5-1.4 1-1.4 2.1"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.4" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconSearch({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="m16 16 3.5 3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M18.5 14.2A7.2 7.2 0 0 1 9.8 5.5 7.5 7.5 0 1 0 18.5 14.2Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 16.5h11l-1.1-1.4V11a4.4 4.4 0 1 0-8.8 0v4.1L6.5 16.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 18.2a1.8 1.8 0 0 0 3.6 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconSave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.6206 2.76232C12.4868 2.75064 12.3532 2.75 12 2.75C9.62178 2.75 7.91356 2.7516 6.61358 2.92637C5.33517 3.09825 4.56445 3.42514 3.9948 3.9948C3.42514 4.56445 3.09825 5.33518 2.92637 6.61358C2.75159 7.91356 2.75 9.62178 2.75 12C2.75 14.3782 2.75159 16.0864 2.92637 17.3864C3.09825 18.6648 3.42514 19.4355 3.9948 20.0052C4.50829 20.5187 5.18517 20.8349 6.25 21.0182L6.25 20.948C6.24997 20.0495 6.24995 19.3003 6.32991 18.7055C6.41432 18.0777 6.59999 17.5109 7.05546 17.0555C7.51093 16.6 8.07773 16.4143 8.70552 16.3299C9.3003 16.2499 10.0495 16.25 10.948 16.25H13.052C13.9505 16.25 14.6997 16.2499 15.2945 16.3299C15.9223 16.4143 16.4891 16.6 16.9445 17.0555C17.4 17.5109 17.5857 18.0777 17.6701 18.7055C17.7501 19.3003 17.75 20.0495 17.75 20.948L17.75 21.0182C18.8148 20.8349 19.4917 20.5187 20.0052 20.0052C20.5749 19.4355 20.9018 18.6648 21.0736 17.3864C21.2484 16.0864 21.25 14.3782 21.25 12C21.25 11.6468 21.2494 11.5132 21.2377 11.3794C21.1804 10.7235 20.9125 10.0768 20.4892 9.57254C20.403 9.46978 20.3063 9.37221 20.0502 9.11611L14.8839 3.94977C14.6278 3.69368 14.5302 3.59701 14.4275 3.51076C13.9232 3.08746 13.2765 2.81957 12.6206 2.76232ZM16.25 21.18V21C16.25 20.036 16.2484 19.3884 16.1835 18.9054C16.1214 18.4439 16.0142 18.2464 15.8839 18.1161C15.7536 17.9858 15.5561 17.8786 15.0946 17.8165C14.6116 17.7516 13.964 17.75 13 17.75H11C10.036 17.75 9.38843 17.7516 8.90539 17.8165C8.44393 17.8786 8.24643 17.9858 8.11612 18.1161C7.9858 18.2464 7.87858 18.4439 7.81654 18.9054C7.75159 19.3884 7.75 20.036 7.75 21V21.18C8.87584 21.2491 10.2582 21.25 12 21.25C13.7418 21.25 15.1242 21.2491 16.25 21.18ZM12.0315 1.25C12.3431 1.24998 12.5445 1.24997 12.751 1.268C13.7138 1.35204 14.6517 1.74054 15.3919 2.36187C15.5507 2.49517 15.696 2.64055 15.9213 2.86587L15.9446 2.88911L21.1341 8.07862C21.3594 8.30396 21.5048 8.44933 21.6381 8.60814C22.2595 9.34833 22.648 10.2862 22.732 11.249C22.75 11.4555 22.75 11.6569 22.75 11.9684V12.0574C22.75 14.3658 22.75 16.1748 22.5603 17.5863C22.366 19.031 21.9607 20.1711 21.0659 21.0659C20.1711 21.9607 19.031 22.366 17.5863 22.5603C16.1748 22.75 14.3658 22.75 12.0574 22.75H11.9426C9.63423 22.75 7.82519 22.75 6.41371 22.5603C4.96897 22.366 3.82895 21.9607 2.93414 21.0659C2.03933 20.1711 1.63399 19.031 1.43975 17.5863C1.24998 16.1748 1.24999 14.3658 1.25 12.0574V11.9426C1.24999 9.63423 1.24998 7.82519 1.43975 6.41371C1.63399 4.96897 2.03933 3.82895 2.93414 2.93414C3.82895 2.03933 4.96897 1.63399 6.41371 1.43975C7.82519 1.24998 9.63423 1.24999 11.9426 1.25L12.0315 1.25ZM6.25 8C6.25 7.58579 6.58579 7.25 7 7.25H13C13.4142 7.25 13.75 7.58579 13.75 8C13.75 8.41422 13.4142 8.75 13 8.75H7C6.58579 8.75 6.25 8.41422 6.25 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M6 15V6.8A1.8 1.8 0 0 1 7.8 5H15"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconExternal({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 5h5v5M19 5l-9 9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 6H7.5A2.5 2.5 0 0 0 5 8.5v8A2.5 2.5 0 0 0 7.5 19h8a2.5 2.5 0 0 0 2.5-2.5V13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
