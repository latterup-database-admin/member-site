import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingScreen from './LoadingScreen'

export default function ProtectedRoute({ children }) {
  const { session, portalContext, loading, error } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen />

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!portalContext?.linked || error) {
    return <Navigate to="/access-pending" replace />
  }

  return children
}
