import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import supabase from "../../Helpers/supabaseClient";

/**
 * RankingPage – Classement global par groupes à positions (highest_position)
 * Règles identiques à GroupTable :
 *  - Tri principal : nb de victoires
 *  - En cas d'égalité à 2 ou 3 joueurs : départage en confrontation directe
 *      * diff sets, puis diff buts (points)
 *  - Sinon : ordre alphabétique (lastname)
 * Attribution des places finales par groupe :
 *  - 1er -> highest_position, 2e -> highest_position+1, etc.
 * Affichage : séparé par group_type, colonnes = Position | Joueur
 */

// ---- Utils --------------------------------------------------------------
function parseMatchPairwise(resultArray) {
  // Attend un tableau de scores set par set : [a1, b1, a2, b2, ...]
  // Retourne {setsA, setsB, goalsA, goalsB}
  if (!Array.isArray(resultArray) || resultArray.length === 0) {
    return null;
  }
  let setsA = 0,
    setsB = 0,
    goalsA = 0,
    goalsB = 0;
  for (let i = 0; i + 1 < resultArray.length; i += 2) {
    const a = Number(resultArray[i] ?? 0);
    const b = Number(resultArray[i + 1] ?? 0);
    if (a > b) setsA += 1;
    else if (b > a) setsB += 1;
    goalsA += a;
    goalsB += b;
  }
  return { setsA, setsB, goalsA, goalsB };
}

function parseMatchRecord(match) {
  // Adapté au schéma SQL: match.player1_id, match.player2_id, match.result (INT[])
  const aId = match?.player1_id;
  const bId = match?.player2_id;
  if (!aId || !bId) return null;
  const pr = parseMatchPairwise(match?.result);
  if (!pr) return null;
  return { playerAId: aId, playerBId: bId, ...pr };
}

function computeStats(players, matches) {
  // Map playerId -> stats
  const acc = new Map();
  const ensure = (p) => {
    if (!acc.has(p.id)) {
      acc.set(p.id, {
        playerId: p.id,
        firstname: p.firstname || "",
        lastname: p.lastname || "",
        played: 0,
        wins: 0,
        losses: 0,
        setsWon: 0,
        setsLost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
      });
    }
  };
  for (const p of players) ensure(p);

  for (const m of matches) {
    const parsed = parseMatchRecord(m);
    if (!parsed) continue;
    const { playerAId, playerBId, setsA, setsB, goalsA, goalsB } = parsed;
    if (!acc.has(playerAId) || !acc.has(playerBId)) continue; // on ne compte que si les 2 joueurs sont dans la liste
    const a = acc.get(playerAId);
    const b = acc.get(playerBId);

    a.played += 1;
    b.played += 1;
    a.setsWon += setsA;
    a.setsLost += setsB;
    a.goalsFor += goalsA;
    a.goalsAgainst += goalsB;
    b.setsWon += setsB;
    b.setsLost += setsA;
    b.goalsFor += goalsB;
    b.goalsAgainst += goalsA;

    if (setsA > setsB) {
      a.wins += 1;
      b.losses += 1;
    } else if (setsB > setsA) {
      b.wins += 1;
      a.losses += 1;
    } else {
      // égalité en sets -> départage aux buts si dispo
      if (goalsA > goalsB) {
        a.wins += 1;
        b.losses += 1;
      } else if (goalsB > goalsA) {
        b.wins += 1;
        a.losses += 1;
      }
    }
  }
  return acc;
}

function directStats(playersSubset, matchesSubset) {
  const idSet = new Set(playersSubset.map((p) => p.id));
  const filtered = matchesSubset.filter(
    (m) => idSet.has(m.player1_id) && idSet.has(m.player2_id)
  );
  return computeStats(playersSubset, filtered);
}

// ---- Component ----------------------------------------------------------
const RankingPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [players, setPlayers] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      // 1) Groupes avec highest_position non NULL
      const { data: gData, error: gErr } = await supabase
        .from("group")
        .select("id,name,highest_position,group_type")
        .eq("tournament_id", id)
        .not("highest_position", "is", null)
        .order("highest_position", { ascending: true });
      if (!alive) return;
      if (gErr) {
        setError(gErr.message);
        setLoading(false);
        return;
      }

      // 2) Joueurs du tournoi
      const { data: pData, error: pErr } = await supabase
        .from("player")
        .select("id,firstname,lastname,group_id,club_id")
        .eq("tournament_id", id);
      if (!alive) return;
      if (pErr) {
        setError(pErr.message);
        setLoading(false);
        return;
      }

      // 2bis) Clubs du tournoi (pour la provenance)
      const { data: cData, error: cErr } = await supabase
        .from("club")
        .select("id,name,abbreviation")
        .eq("tournament_id", id);
      if (!alive) return;
      if (cErr) {
        setError(cErr.message);
        setLoading(false);
        return;
      }

      // 3) Matchs du tournoi (IMPORTANT: filtrer par tournament_id)
      const { data: mData, error: mErr } = await supabase
        .from("match")
        .select("id,group_id,player1_id,player2_id,result,tournament_id")
        .eq("tournament_id", id);
      if (!alive) return;
      if (mErr) {
        setError(mErr.message);
        setLoading(false);
        return;
      }

      setGroups(gData || []);
      setPlayers(pData || []);
      setClubs(cData || []);
      setMatches(mData || []);
      setLoading(false);
    };
    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const clubsById = useMemo(() => {
    const m = new Map();
    for (const c of clubs) m.set(c.id, c);
    return m;
  }, [clubs]);

  const rowsByType = useMemo(() => {
    if (loading || error) return new Map();

    // Regrouper les matchs par groupe pour rapidité
    const matchesByGroup = new Map();
    for (const m of matches) {
      if (!matchesByGroup.has(m.group_id)) matchesByGroup.set(m.group_id, []);
      matchesByGroup.get(m.group_id).push(m);
    }

    const allRows = [];

    for (const g of groups) {
      const gId = g.id;
      const gMatches = matchesByGroup.get(gId) || [];

      // joueurs appartenant à ce groupe (player.group_id est un ARRAY d'int)
      const gPlayers = players.filter((p) =>
        Array.isArray(p.group_id) ? p.group_id.includes(gId) : false
      );

      // Stats globales pour le groupe
      const stats = computeStats(gPlayers, gMatches);

      // Tri selon les règles GroupTable
      const sorted = [...gPlayers].sort((a, b) => {
        const sa = stats.get(a.id);
        const sb = stats.get(b.id);
        if (!sa || !sb) return 0;
        const dWins = sb.wins - sa.wins;
        if (dWins !== 0) return dWins;
        const tied = gPlayers.filter(
          (p) => (stats.get(p.id)?.wins ?? -1) === sa.wins
        );
        if (tied.length === 2 || tied.length === 3) {
          const dStats = directStats(tied, gMatches);
          const da = dStats.get(a.id);
          const db = dStats.get(b.id);
          if (da && db) {
            const setDiff =
              db.setsWon - db.setsLost - (da.setsWon - da.setsLost);
            if (setDiff !== 0) return setDiff;
            const goalDiff =
              db.goalsFor - db.goalsAgainst - (da.goalsFor - da.goalsAgainst);
            if (goalDiff !== 0) return goalDiff;
          }
        }
        return (a.lastname || "").localeCompare(b.lastname || "", undefined, {
          sensitivity: "base",
        });
      });

      // Attribution des places
      const start = Number(g.highest_position) || 1;
      sorted.forEach((p, idx) => {
        const club = clubsById.get(p.club_id);
        const prov = club
          ? `${club.name}${club.abbreviation ? ` (${club.abbreviation})` : ""}`
          : "—";
        allRows.push({
          playerId: p.id,
          firstname: p.firstname || "",
          lastname: p.lastname || "",
          groupId: gId,
          groupName: g.name,
          groupType: g.group_type || "unknown",
          finalPosition: start + idx,
          provenance: prov,
        });
      });
    }

    // Trie global par position finale
    allRows.sort((a, b) => a.finalPosition - b.finalPosition);

    // Regroupement par type
    const byType = new Map();
    for (const row of allRows) {
      const key = row.groupType || "unknown";
      if (!byType.has(key)) byType.set(key, []);
      byType.get(key).push(row);
    }
    return byType;
  }, [groups, players, matches, loading, error, clubsById]);

  const renderSections = () => {
    const order = ["men", "women", "mix", "team", "unknown"]; // ordre d'affichage
    const label = (gt) => {
      switch (gt) {
        case "men":
          return t("men", { defaultValue: "Hommes" });
        case "women":
          return t("women", { defaultValue: "Femmes" });
        case "mix":
          return t("mix", { defaultValue: "Mixte" });
        case "team":
          return t("team", { defaultValue: "Équipes" });
        default:
          return t("others", { defaultValue: "Autres" });
      }
    };

    const sections = [];
    for (const gt of order) {
      if (!rowsByType.has(gt)) continue;
      const list = rowsByType.get(gt);
      if (!list || list.length === 0) continue;
      sections.push(
        <section key={gt}>
          <h2 className="text-xl font-semibold mb-3">{label(gt)}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border px-3 py-2 text-left">
                    {t("position", { defaultValue: "#" })}
                  </th>
                  <th className="border px-3 py-2 text-left">
                    {t("player", { defaultValue: "Joueur" })}
                  </th>
                  <th className="border px-3 py-2 text-left">
                    {t("provenance", { defaultValue: "Provenance" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={`${gt}-${r.groupId}-${r.playerId}`}>
                    <td className="border px-3 py-2">{r.finalPosition}</td>
                    <td className="border px-3 py-2">
                      {r.lastname?.toUpperCase()} {r.firstname}
                    </td>
                    <td className="border px-3 py-2">{r.provenance || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    }
    // Autres types non listés dans 'order'
    for (const [gt, list] of rowsByType.entries()) {
      if (order.includes(gt)) continue;
      if (!list || list.length === 0) continue;
      sections.push(
        <section key={gt}>
          <h2 className="text-xl font-semibold mb-3">{label(gt)}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th className="border px-3 py-2 text-left">
                    {t("position", { defaultValue: "#" })}
                  </th>
                  <th className="border px-3 py-2 text-left">
                    {t("player", { defaultValue: "Joueur" })}
                  </th>
                  <th className="border px-3 py-2 text-left">
                    {t("provenance", { defaultValue: "Provenance" })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={`${gt}-${r.groupId}-${r.playerId}`}>
                    <td className="border px-3 py-2">{r.finalPosition}</td>
                    <td className="border px-3 py-2">
                      {r.lastname?.toUpperCase()} {r.firstname}
                    </td>
                    <td className="border px-3 py-2">{r.provenance || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      );
    }
    return sections;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">{t("rankingNavbar")}</h1>

      {loading && <p>{t("loading", { defaultValue: "Chargement…" })}</p>}
      {error && (
        <div className="text-red-600 mb-4">
          {t("error_loading", { defaultValue: "Erreur de chargement:" })}{" "}
          {error}
        </div>
      )}

      {!loading && !error && (!rowsByType || rowsByType.size === 0) && (
        <p>
          {t("no_data", {
            defaultValue: "Aucune donnée de match pour calculer le classement.",
          })}
        </p>
      )}

      {!loading && !error && rowsByType && rowsByType.size > 0 && (
        <div className="space-y-8">{renderSections()}</div>
      )}

      <div className="sr-only" aria-hidden></div>
    </div>
  );
};

export default RankingPage;
