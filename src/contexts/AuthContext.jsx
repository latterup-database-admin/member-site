import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

const isDevPreview =
  import.meta.env.DEV && import.meta.env.VITE_DEV_PREVIEW === "true";

const devPortalContext = {
  linked: true,
  person: {
    id: "preview-parent",
    preferred_name: "Erika",
    first_name: "Erika",
    last_name: "Preview",
    member_type: "adult",
    status: "active",
  },
  roles: ["site_admin", "parent"],
  households: [
    {
      id: "preview-household",
      family_name: "Sample Family",
      can_manage: true,
      is_primary_contact: true,
    },
  ],
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(
    isDevPreview ? { user: { id: "preview-auth-user" } } : null,
  );
  const [portalContext, setPortalContext] = useState(
    isDevPreview ? devPortalContext : null,
  );
  const [loading, setLoading] = useState(!isDevPreview);
  const [error, setError] = useState(null);

  async function loadPortalContext(activeSession) {
    if (isDevPreview) {
      setPortalContext(devPortalContext);
      setLoading(false);
      return;
    }

    if (!activeSession) {
      setPortalContext(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { error: linkError } = await supabase.rpc("link_current_auth_user");

    if (linkError) {
      await supabase.auth.signOut();

      setSession(null);
      setPortalContext(null);
      setError(linkError.message);
      setLoading(false);
      return;
    }

    const { data, error: contextError } = await supabase.rpc(
      "get_my_portal_context",
    );
    if (contextError) {
      setPortalContext(null);
      setError(contextError.message);
    } else {
      setPortalContext(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (isDevPreview) return undefined;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      loadPortalContext(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        loadPortalContext(nextSession);
      },
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signInWithGoogle() {
    if (isDevPreview) return;

    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (signInError) setError(signInError.message);
  }

  async function signOut() {
    if (isDevPreview) return;

    setError(null);
    await supabase.auth.signOut();
    setPortalContext(null);
  }

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      portalContext,
      loading,
      error,
      signInWithGoogle,
      signOut,
      isDevPreview,
    }),
    [session, portalContext, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
