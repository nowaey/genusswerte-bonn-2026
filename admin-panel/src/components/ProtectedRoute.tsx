import { Navigate } from 'react-router-dom'
import { useAuth } from '../store/auth'

interface Props {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const { session, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div style={styles.loading}>
        <span>Laden …</span>
      </div>
    )
  }

  // Nicht eingeloggt → Login-Seite
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Eingeloggt aber kein Admin → Zugriff verweigert
  if (!isAdmin) {
    return (
      <div style={styles.denied}>
        <h2>Kein Zugriff</h2>
        <p>Dieser Account hat keine Admin-Berechtigung.</p>
      </div>
    )
  }

  return <>{children}</>
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: 14,
    color: '#666',
  },
  denied: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: 8,
    color: '#333',
  },
}
