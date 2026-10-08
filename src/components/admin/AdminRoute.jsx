import { Navigate } from "react-router-dom";

import { usePermissions } from "../../contexts/PermissionContext";

export default function AdminRoute({ children }) {
  const {
    isAdmin,
    loadingPermissions,
    permissionError,
  } = usePermissions();

  if (loadingPermissions) {
    return (
      <div className="py-12 text-center text-sm text-brand-taupe">
        Loading admin access...
      </div>
    );
  }

  if (permissionError) {
    return (
      <div className="rounded-2xl border border-brand-junior/30 bg-brand-junior/10 px-4 py-3 text-sm font-semibold text-brand-navy">
        Admin access could not be verified.
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}