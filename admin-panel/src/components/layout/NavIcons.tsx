// Minimale, handgezeichnete Icons für die Sidebar-Navigation.
// Bewusst ohne Icon-Library — nur schlichte Strichzeichnungen (24x24, stroke currentColor).

type IconProps = { size?: number }

export function DashboardIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
      <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.5" />
      <rect x="13" y="10.5" width="7.5" height="10" rx="1.5" />
      <rect x="3.5" y="13.5" width="7.5" height="7" rx="1.5" />
    </svg>
  )
}

export function OrdersIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 8h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-7a1.5 1.5 0 0 1-1.5-1.5L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  )
}

export function VoucherIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3.5 9.5a2 2 0 0 0 0-4V4.5a1 1 0 0 1 1-1h15a1 1 0 0 1 1 1V5.5a2 2 0 0 0 0 4v0a2 2 0 0 0 0 4v1a2 2 0 0 0 0 4v1a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-1a2 2 0 0 0 0-4v0a2 2 0 0 0 0-4Z" />
      <path d="M9 4v16" strokeDasharray="2.2 2.2" />
    </svg>
  )
}

export function TastingsIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M8 2v3M16 2v3" />
      <rect x="3.5" y="4.5" width="17" height="17" rx="2.5" />
      <path d="M3.5 9.5h17" />
      <circle cx="8" cy="14" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}
