import { useEffect, useState, useCallback } from "react";
import { me, post } from "../Helpers/apiClient";

/**
 * useAuth
 *
 * Récupère l'état d'auth côté serveur (via /auth/me) en s'appuyant sur le cookie httpOnly.
 * Renvoie: { loading, ok, scope, tournamentId, refresh, logout }
 *  - scope: "admin" | "viewer" | null
 *  - tournamentId: number | null
 *  - refresh(): force la synchro avec le serveur
 *  - logout(): POST /auth/logout puis refresh
 */
function useAuth() {
  const [state, setState] = useState({
    loading: true,
    ok: false,
    scope: null,
    tournamentId: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const r = await me();
      setState({
        loading: false,
        ok: !!r?.ok,
        scope: r?.scope ?? null,
        tournamentId: r?.tournamentId ?? null,
      });
    } catch (e) {
      setState({ loading: false, ok: false, scope: null, tournamentId: null });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await post("/auth/logout");
    } catch (_) {}
    await refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await me();
      if (cancelled) return;
      setState({
        loading: false,
        ok: !!r?.ok,
        scope: r?.scope ?? null,
        tournamentId: r?.tournamentId ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Refresh automatique quand l'onglet reprend le focus (pratique après un login ailleurs)
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return { ...state, refresh, logout };
}

export default useAuth;
export { useAuth };
