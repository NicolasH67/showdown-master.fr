// src/Utils/matchUtils.js

/**
 * Normalise différents formats de résultats en un tableau à plat : [a1, b1, a2, b2, ...]
 * @param {any} res - résultat brut (array, objet, string)
 * @returns {number[]} tableau de scores
 */
export const toResultPairs = (res) => {
  if (!res) return [];

  // Déjà un tableau de nombres (ou de strings)
  if (Array.isArray(res)) {
    return res.map((n) => {
      const v = Number(n);
      return Number.isFinite(v) ? v : 0;
    });
  }

  // Objet { sets: [{ p1, p2 }, ...] }
  if (typeof res === "object" && Array.isArray(res.sets)) {
    const pairs = [];
    for (const s of res.sets) {
      const a = Number(s?.p1);
      const b = Number(s?.p2);
      pairs.push(Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0);
    }
    return pairs;
  }

  // Chaîne : JSON ou formats du type "11-6;11-9" ou "11-6, 11-9"
  if (typeof res === "string") {
    try {
      const parsed = JSON.parse(res);
      return toResultPairs(parsed);
    } catch (_) {
      const chunks = res
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const pairs = [];
      for (const ch of chunks) {
        const m = ch.match(/^(\d+)\s*[-:\/]\s*(\d+)$/);
        if (m) {
          const a = Number(m[1]);
          const b = Number(m[2]);
          pairs.push(Number.isFinite(a) ? a : 0, Number.isFinite(b) ? b : 0);
        }
      }
      return pairs;
    }
  }

  return [];
};
