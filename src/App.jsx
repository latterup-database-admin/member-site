import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import ProtectedRoute from "./components/ProtectedRoute";
import AccessPendingPage from "./pages/AccessPendingPage";
import ClassesPage from "./pages/ClassesPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import PaymentsPage from "./pages/PaymentsPage";
import AnnualProfileReviewPage from "./pages/AnnualProfileReviewPage";
import DirectoryPage from "./pages/DirectoryPage";
import ContributionsPage from "./pages/ContributionsPage";
import AdminRoute from "./components/admin/AdminRoute";
import AdminPage from "./pages/AdminPage";
import AdminClassProposalsPage from "./pages/AdminClassProposalsPage";
import AdminContributionApplicationsPage from "./pages/AdminContributionApplicationsPage";
import AdminContributionOpportunitiesPage from "./pages/AdminContributionOpportunitiesPage";
import AdminContributionSettingsPage from "./pages/AdminContributionSettingsPage";
import AdminRegistrationPage from "./pages/AdminRegistrationPage";
import MyClassesPage from "./pages/MyClassesPage";
import TeacherClassManagementPage from "./pages/TeacherClassManagementPage";

function ProtectedShell() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/access-pending" element={<AccessPendingPage />} />

      <Route element={<ProtectedShell />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/classes/proposals"
          element={
            <AdminRoute>
              <AdminClassProposalsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/contributions/applications"
          element={
            <AdminRoute>
              <AdminContributionApplicationsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/contributions/opportunities"
          element={
            <AdminRoute>
              <AdminContributionOpportunitiesPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/contributions/settings"
          element={
            <AdminRoute>
              <AdminContributionSettingsPage />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/registration"
          element={
            <AdminRoute>
              <AdminRegistrationPage />
            </AdminRoute>
          }
        />

        <Route
          path="/annual-profile-review"
          element={<AnnualProfileReviewPage />}
        />

        <Route path="/classes" element={<ClassesPage />} />
        <Route
          path="/registration"
          element={
            <PlaceholderPage
              title="Registration"
              description="Register your students, see class limits, join waitlists, and review schedule conflicts."
            />
          }
        />
        <Route path="/my-classes" element={<MyClassesPage />} />
        <Route
          path="/my-classes/:classOfferingId"
          element={<TeacherClassManagementPage />}
        />

        <Route path="/contributions" element={<ContributionsPage />} />
        <Route
          path="/payments"
          element={
            <PaymentsPage
              title="Payments"
              description="View membership dues, class fees, balances, and payment history."
            />
          }
        />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route
          path="/account"
          element={
            <PlaceholderPage
              title="Account & Family"
              description="Manage household details, member preferences, and directory privacy settings."
            />
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
