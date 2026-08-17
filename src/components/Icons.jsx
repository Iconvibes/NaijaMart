// Tiny inline icon set. Functional UI icons only - no placeholder artwork.

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const MenuIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

export const SearchIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.5" y2="16.5" />
  </svg>
)

export const CartIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="17" cy="20" r="1.5" />
    <path d="M3 4h2l2.6 11.2a1.5 1.5 0 0 0 1.5 1.3h7.7a1.5 1.5 0 0 0 1.5-1.2L20 8H6" />
  </svg>
)

export const HomeIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </svg>
)

export const GridIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

export const UserIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
  </svg>
)

export const StarIcon = ({ filled = true, ...props }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} {...props}>
    <path d="M12 2.5l2.9 5.9 6.6 1-4.7 4.6 1.1 6.5L12 17.4l-5.9 3.1 1.1-6.5L2.5 9.4l6.6-1z" />
  </svg>
)

export const ShieldIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

export const TruckIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <path d="M1 5h13v11H1z" />
    <path d="M14 9h4l4 4v3h-8" />
    <circle cx="6" cy="18" r="1.8" />
    <circle cx="18" cy="18" r="1.8" />
  </svg>
)

export const PhoneIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z" />
  </svg>
)

export const ChevronDownIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export const PlusIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export const MinusIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

export const TrashIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <path d="M3 6h18" />
    <path d="M8 6V4h8v2" />
    <path d="M6 6l1 14h10l1-14" />
    <line x1="10" y1="11" x2="10" y2="16" />
    <line x1="14" y1="11" x2="14" y2="16" />
  </svg>
)

export const CloseIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
)

export const CheckIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <path d="M4 12.5l5 5L20 6.5" />
  </svg>
)

export const MapPinIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...stroke} {...props}>
    <path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
)
