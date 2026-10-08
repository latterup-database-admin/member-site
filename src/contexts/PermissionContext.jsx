import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import { loadMyPermissions } from "../data/permissions";

const PermissionContext = createContext(null);

export function PermissionProvider({ children }) {
  const { portalContext, isDevPreview } = useAuth();

  const [permissions, setPermissions] = useState([]);
  const [loadingPermissions, setLoadingPermissions] =
    useState(!isDevPreview);
  const [permissionError, setPermissionError] =
    useState(null);

  const loadPermissions = useCallback(async () => {
    if (isDevPreview) {
      setPermissions([]);
      setPermissionError(null);
      setLoadingPermissions(false);
      return;
    }

    if (!portalContext?.person) {
      setPermissions([]);
      setPermissionError(null);
      setLoadingPermissions(false);
      return;
    }

    try {
      setLoadingPermissions(true);
      setPermissionError(null);

      const result = await loadMyPermissions();

      setPermissions(result);
    } catch (error) {
      console.error(
        "Permissions failed to load:",
        error,
      );

      setPermissions([]);
      setPermissionError(
        error.message || "Permissions could not be loaded.",
      );
    } finally {
      setLoadingPermissions(false);
    }
  }, [portalContext?.person, isDevPreview]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const permissionKeys = useMemo(
    () => new Set(permissions.map((item) => item.key)),
    [permissions],
  );

  const hasPermission = useCallback(
    (key) => permissionKeys.has(key),
    [permissionKeys],
  );

  const hasAnyPermission = useCallback(
    (...keys) =>
      keys.flat().some((key) =>
        permissionKeys.has(key),
      ),
    [permissionKeys],
  );

  const hasAllPermissions = useCallback(
    (...keys) =>
      keys.flat().every((key) =>
        permissionKeys.has(key),
      ),
    [permissionKeys],
  );

  const isAdmin = useMemo(
    () =>
      [...permissionKeys].some((key) =>
        key.startsWith("admin."),
      ),
    [permissionKeys],
  );

  const value = useMemo(
    () => ({
      permissions,
      permissionKeys,

      loadingPermissions,
      permissionError,

      isAdmin,

      hasPermission,
      hasAnyPermission,
      hasAllPermissions,

      refreshPermissions: loadPermissions,
    }),
    [
      permissions,
      permissionKeys,
      loadingPermissions,
      permissionError,
      isAdmin,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      loadPermissions,
    ],
  );

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error(
      "usePermissions must be used inside PermissionProvider.",
    );
  }

  return context;
}