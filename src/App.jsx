import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import AccessPendingPage from './pages/AccessPendingPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import PlaceholderPage from './pages/PlaceholderPage'

function ProtectedShell() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/access-pending" element={<AccessPendingPage />} />

      <Route element={<ProtectedShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/classes" element={<PlaceholderPage title="Classes" description="Browse the class catalog by program, term/session, age group, day, and time." />} />
        <Route path="/registration" element={<PlaceholderPage title="Registration" description="Register your students, see class limits, join waitlists, and review schedule conflicts." />} />
        <Route path="/contributions" element={<PlaceholderPage title="Contributions" description="Browse opportunities, apply, and track your household's approved contribution benefits." />} />
        <Route path="/payments" element={<PlaceholderPage title="Payments" description="View membership dues, class fees, balances, and payment history." />} />
        <Route path="/directory" element={<PlaceholderPage title="Member Directory" description="The member directory will combine Workspace identities with Supabase profile and privacy data." />} />
        <Route path="/account" element={<PlaceholderPage title="Account & Family" description="Manage household details, member preferences, and directory privacy settings." />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
