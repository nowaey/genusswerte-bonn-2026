import { NavLink } from 'react-router-dom'
import { useAuth } from '../../store/auth'
import { DashboardIcon, VoucherIcon, TastingsIcon } from './NavIcons'

const NAV_ITEMS = [
  { to: '/',             label: 'Dashboard',     Icon: DashboardIcon },
  { to: '/vouchers',     label: 'Gutscheine',    Icon: VoucherIcon },
  { to: '/slots',        label: 'Tastings',      Icon: TastingsIcon },
]

export function Sidebar() {
  const { user, signOut } = useAuth()

  return (
    <aside style={styles.aside}>
      <div style={styles.brand}>
        <img src="/genusswerte-logo.png" alt="Genusswerte Bonn" style={styles.logo} />
        <div>
          <span style={styles.brandName}>Genusswerte</span>
          <span style={styles.brandSub}>Admin Panel</span>
        </div>
      </div>

      <nav style={styles.nav}>
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              ...styles.link,
              ...(isActive ? styles.linkActive : {}),
            })}
          >
            <Icon />
            {label}
          </NavLink>
        ))}
      </nav>

      <div style={styles.footer}>
        <span style={styles.userEmail}>{user?.email}</span>
        <button onClick={signOut} style={styles.signOutBtn}>
          Abmelden
        </button>
      </div>
    </aside>
  )
}

const styles: Record<string, React.CSSProperties> = {
  aside: {
    width: 220,
    minHeight: '100vh',
    background: '#1c3a2e',
    color: '#f9f5ef',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 0',
    flexShrink: 0,
    borderRight: '1px solid #c9a84c',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 20px 24px',
    borderBottom: '1px solid rgba(201,168,76,0.25)',
    marginBottom: 16,
  },
  logo: {
    width: 38,
    height: 38,
    objectFit: 'contain',
    flexShrink: 0,
  },
  brandName: {
    display: 'block',
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: '0.02em',
    fontFamily: 'Georgia, serif',
    color: '#f9f5ef',
  },
  brandSub: {
    display: 'block',
    fontSize: 11,
    opacity: 0.65,
    color: '#c9a84c',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  nav: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '0 12px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 12px',
    borderRadius: 6,
    color: 'rgba(249,245,239,0.7)',
    textDecoration: 'none',
    fontSize: 14,
    transition: 'background 0.15s, color 0.15s',
  },
  linkActive: {
    background: 'rgba(201,168,76,0.16)',
    color: '#f9f5ef',
    boxShadow: 'inset 2px 0 0 #c9a84c',
  },
  footer: {
    padding: '16px 20px 0',
    borderTop: '1px solid rgba(201,168,76,0.25)',
    marginTop: 16,
  },
  userEmail: {
    display: 'block',
    fontSize: 12,
    opacity: 0.6,
    marginBottom: 10,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  signOutBtn: {
    background: 'transparent',
    border: '1px solid rgba(201,168,76,0.4)',
    color: 'rgba(249,245,239,0.8)',
    borderRadius: 5,
    padding: '6px 12px',
    fontSize: 13,
    cursor: 'pointer',
    width: '100%',
  },
}
