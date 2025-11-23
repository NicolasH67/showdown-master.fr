import { useEffect, useState, useCallback, useRef } from "react";
import { me as meApi, post as postApi } from "../Helpers/apiClient";

/**
 * useAuth
 *
 * Synchronise l'état d'auth côté serveur (via cookie httpOnly) avec robustesse :
 *  - évite les mises à jour d'état après un unmount
 *  - évite les courses (race conditions) entre plusieurs refresh
 *  - propose un fallback direct sur /api/* si le wrapper apiClient n'inclut pas correctement les cookies
 *
 * Renvoie: { loading, ok, scope, tournamentId, refresh, logout }
 */
function useAuth() {
  const [state, setState] = useState({
    loading: true,
    ok: false,
    scope: null,
    tournamentId: null,
  });

  // Garde-fous pour éviter les races et setState après unmount
  const mountedRef = useRef(true);
  const lastReqIdRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // --- Helpers réseau avec fallback ---
  const fetchMe = useCallback(async () => {
    // 1) Essaye via le wrapper apiClient
    try {
      const r = await meApi();
      if (r && typeof r === "object") return r;
    } catch (_) {
      // on tente un fallback
    }
    // 2) Fallback: appel direct qui force l'inclusion des cookies
    try {
      const res = await fetch("/api/auth/me?_=" + Date.now(), {
        method: "GET",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (!res.ok) return { ok: false };
      return await res.json();
    } catch {
      return { ok: false };
    }
  }, []);

  const doLogout = useCallback(async () => {
    // 1) via apiClient
    try {
      await postApi("/auth/logout");
    } catch (_) {
      // 2) Fallback direct
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        // ignore
      }
    }
  }, []);

  // --- Actions publiques du hook ---
  const refresh = useCallback(async () => {
    // identifiant de requête pour ignorer les résultats obsolètes
    const reqId = ++lastReqIdRef.current;

    // état "loading" conservant les valeurs actuelles
    setState((s) => ({ ...s, loading: true }));

    const r = await fetchMe();

    // si un autre refresh a déjà rendu un résultat, on ignore celui-ci
    if (!mountedRef.current || reqId !== lastReqIdRef.current) return r;

    setState({
      loading: false,
      ok: !!r?.ok,
      scope: r?.scope ?? null,
      tournamentId: r?.tournamentId ?? null,
    });

    return r;
  }, [fetchMe]);

  const logout = useCallback(async () => {
    await doLogout();
    await refresh();
  }, [doLogout, refresh]);

  // --- Chargement initial ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = await fetchMe();
      if (cancelled || !mountedRef.current) return;
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
  }, [fetchMe]);

  return { ...state, refresh, logout };
}

export default useAuth;
export { useAuth };
