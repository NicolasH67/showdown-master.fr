import { useMemo } from "react";

function toValidNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

export default function useTournamentId(explicitId) {
  return useMemo(() => {
    // 1) Paramètre explicite
    const fromParam = toValidNumber(explicitId);
    if (!Number.isNaN(fromParam)) return fromParam;

    // 2) Query string (?id= / ?t= / ?tid=)
    try {
      if (typeof window !== "undefined" && window.location?.search) {
        const sp = new URLSearchParams(window.location.search);
        const q = sp.get("id") || sp.get("t") || sp.get("tid");
        const fromQuery = toValidNumber(q);
        if (!Number.isNaN(fromQuery)) return fromQuery;
      }
    } catch (_) {}

    // 3) Pathname (/tournaments/123 ou /tournament/123)
    try {
      if (typeof window !== "undefined" && window.location?.pathname) {
        const path = window.location.pathname;
        const m = path.match(/\/tour(nament|naments)\/(\d+)/i);
        if (m) {
          const fromPath = toValidNumber(m[2]);
          if (!Number.isNaN(fromPath)) return fromPath;
        }
      }
    } catch (_) {}

    // 4) LocalStorage (fallback)
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const ls = window.localStorage.getItem("activeTournamentId");
        const fromLS = toValidNumber(ls);
        if (!Number.isNaN(fromLS)) return fromLS;
      }
    } catch (_) {}

    // Rien trouvé → NaN (le hook appelant gère l'erreur/guard)
    return NaN;
  }, [explicitId]);
}
