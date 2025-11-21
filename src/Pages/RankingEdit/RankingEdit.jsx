import React, { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import useRankingData from "../../Hooks/useRankingData";

/**
 * RankingEdit – Version admin du classement global par groupes à positions (highest_position)
 * Règles identiques à GroupTable / RankingPage :
 *  - Tri principal : nb de victoires
 *  - En cas d'égalité à 2 ou 3 joueurs : départage en confrontation directe
 *      * diff sets, puis diff buts (points)
 *  - Sinon : ordre alphabétique (lastname)
 * Attribution des places finales par groupe :
 *  - 1er -> highest_position, 2e -> highest_position+1, etc.
 * Affichage : séparé par group_type, colonnes = Position | Joueur | Provenance
 * Particularité : permet l'export CSV et affiche les groupes même non complets
 * (avec un indicateur "provisoire").
 */

// ---- Utils (identiques à RankingPage) ---------------------------------
function parseMatchPairwise(match) {
  // Accepts match.result_pairs (array), match.result (array), match.result (JSON string), or match.result as "11-2;11-9" etc.
  const toPairs = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((n) => Number(n) || 0);
    if (typeof val === "string") {
      // try JSON first
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed.map((n) => Number(n) || 0);
      } catch (_) {
        // parse formats like "11-6;11-9" or "11:6, 11:9"
        const chunks = val
          .split(/[;,]/)
          .map((s) => s.trim())
          .filter(Boolean);
        const arr = [];
        for (const ch of chunks) {
          const m = ch.match(/^(\d+)\s*[-:\/]\s*(\d+)$/);
          if (m) {
            arr.push(Number(m[1]) || 0, Number(m[2]) || 0);
          }
        }
        return arr;
      }
    }
    if (typeof val === "object" && Array.isArray(val.result_pairs)) {
      return val.result_pairs.map((n) => Number(n) || 0);
    }
    return [];
  };

  // accept various shapes
  const pairs = Array.isArray(match?.result_pairs)
    ? toPairs(match.result_pairs)
    : toPairs(match?.result) || toPairs(match);

  if (!pairs.length) return null;

  let setsA = 0,
    setsB = 0,
    goalsA = 0,
    goalsB = 0;
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const a = Number(pairs[i] ?? 0);
    const b = Number(pairs[i + 1] ?? 0);
    if (a > b) setsA += 1;
    else if (b > a) setsB += 1;
    goalsA += a;
    goalsB += b;
  }
  return { setsA, setsB, goalsA, goalsB };
}

function parseMatchRecord(match) {
  const aId = Number(match?.player1_id ?? match?.player1?.id);
  const bId = Number(match?.player2_id ?? match?.player2?.id);
  if (!Number.isFinite(aId) || !Number.isFinite(bId)) return null;
  const pr = parseMatchPairwise(match);
  if (!pr) return null;
  return { playerAId: aId, playerBId: bId, ...pr };
}

function computeStats(players, matches) {
  // Map playerId -> stats
  const acc = new Map();
  const ensure = (p) => {
    const pid = Number(p.id);
    if (!Number.isFinite(pid)) return;
    if (!acc.has(pid)) {
      acc.set(pid, {
        playerId: pid,
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
  const idSet = new Set(
    playersSubset.map((p) => Number(p.id)).filter(Number.isFinite)
  );
  const filtered = matchesSubset.filter(
    (m) =>
      idSet.has(Number(m.player1_id ?? m.player1?.id)) &&
      idSet.has(Number(m.player2_id ?? m.player2?.id))
  );
  return computeStats(playersSubset, filtered);
}

function isGroupComplete(gPlayers, gMatches) {
  const ids = new Set(
    gPlayers.map((p) => Number(p.id)).filter(Number.isFinite)
  );
  const n = gPlayers.length;
  const expected = n >= 2 ? (n * (n - 1)) / 2 : 0;
  let completed = 0;
  for (const m of gMatches) {
    const aOk = ids.has(Number(m.player1_id ?? m.player1?.id));
    const bOk = ids.has(Number(m.player2_id ?? m.player2?.id));
    if (!aOk || !bOk) continue;
    if (Array.isArray(m.result_pairs) && m.result_pairs.length > 0)
      completed += 1;
  }
  return expected > 0 && completed === expected;
}

// ---- Component ----------------------------------------------------------
const RankingEdit = () => {
  const { t } = useTranslation();
  const { id } = useParams();

  const { groups, players, clubs, matches, loading, error } =
    useRankingData(id);

  const clubsById = useMemo(() => {
    const m = new Map();
    (clubs || []).forEach((c) => m.set(c.id, c));
    return m;
  }, [clubs]);

  const rowsByType = useMemo(() => {
    if (loading || error) return new Map();

    // Regrouper les matchs par groupe pour rapidité
    const matchesByGroup = new Map();
    for (const m of matches || []) {
      const gid = Number(m.group_id ?? m.group?.id);
      if (!Number.isFinite(gid)) continue;
      if (!matchesByGroup.has(gid)) matchesByGroup.set(gid, []);
      matchesByGroup.get(gid).push(m);
    }

    const allRows = [];

    // Garder uniquement les groupes avec highest_position non nul/undefined et trier par ordre croissant
    const rankedGroups = [...(groups || [])]
      .filter((g) => g?.highest_position != null)
      .sort((a, b) => Number(a.highest_position) - Number(b.highest_position));

    for (const g of rankedGroups) {
      const gId = Number(g.id);
      const gMatches = matchesByGroup.get(gId) || [];

      // joueurs du groupe : priorité aux ids présents dans les matchs, fallback sur player.group_id
      const idsFromMatches = new Set(
        gMatches
          .flatMap((m) => [
            Number(m.player1_id ?? m.player1?.id),
            Number(m.player2_id ?? m.player2?.id),
          ])
          .filter(Number.isFinite)
      );

      let gPlayers = (players || []).filter((p) =>
        idsFromMatches.has(Number(p.id))
      );

      if (gPlayers.length === 0) {
        gPlayers = (players || []).filter((p) => {
          if (!Array.isArray(p.group_id)) return false;
          const gids = p.group_id.map((x) => Number(x)).filter(Number.isFinite);
          return gids.includes(gId);
        });
      }

      if (!gPlayers.length) continue;

      // Statut de complétion du groupe
      const groupIsComplete = isGroupComplete(gPlayers, gMatches);

      // Stats globales pour le groupe
      const stats = computeStats(gPlayers, gMatches);

      // Tri selon les règles GroupTable
      const sorted = [...gPlayers].sort((a, b) => {
        const ga = stats.get(Number(a.id));
        const gb = stats.get(Number(b.id));
        if (!ga || !gb) return 0;

        // 1) Victoires (desc)
        const dWins = gb.wins - ga.wins;
        if (dWins !== 0) return dWins;

        // 2) Confrontation directe si 2 ou 3 joueurs ex æquo sur les victoires
        const tied = gPlayers.filter(
          (p) => (stats.get(Number(p.id))?.wins ?? -1) === ga.wins
        );
        if (tied.length === 2 || tied.length === 3) {
          const dStats = directStats(tied, gMatches);
          const da = dStats.get(Number(a.id));
          const db = dStats.get(Number(b.id));
          if (da && db) {
            // 2.a) Diff sets (desc)
            const setDiffH2HA = da.setsWon - da.setsLost;
            const setDiffH2HB = db.setsWon - db.setsLost;
            if (setDiffH2HA !== setDiffH2HB) return setDiffH2HB - setDiffH2HA;
            // 2.b) Diff points (desc)
            const goalDiffH2HA = da.goalsFor - da.goalsAgainst;
            const goalDiffH2HB = db.goalsFor - db.goalsAgainst;
            if (goalDiffH2HA !== goalDiffH2HB)
              return goalDiffH2HB - goalDiffH2HA;
          }
        }

        // 3) Diff sets global (desc)
        const setDiffGA = ga.setsWon - ga.setsLost;
        const setDiffGB = gb.setsWon - gb.setsLost;
        if (setDiffGA !== setDiffGB) return setDiffGB - setDiffGA;

        // 4) Diff points global (desc)
        const goalDiffGA = ga.goalsFor - ga.goalsAgainst;
        const goalDiffGB = gb.goalsFor - gb.goalsAgainst;
        if (goalDiffGA !== goalDiffGB) return goalDiffGB - goalDiffGA;

        // 5) Fallback stable : ordre alphabétique sur le nom de famille
        return (a.lastname || "").localeCompare(b.lastname || "");
      });

      // Attribution des places
      const start = Number(g.highest_position);
      sorted.forEach((p, idx) => {
        // Résolution robuste du club
        const pickFirst = (arr) =>
          Array.isArray(arr) && arr.length ? arr[0] : undefined;
        const rawClubId =
          (Array.isArray(p.club_id) ? pickFirst(p.club_id) : p.club_id) ??
          p.clubId ??
          p.club?.id;
        const clubIdNum = Number(rawClubId);

        let club = Number.isFinite(clubIdNum)
          ? clubsById.get(clubIdNum)
          : undefined;
        if (!club && p.club && (p.club.name || p.club.abbreviation)) {
          club = p.club;
        }

        let clubName = "";
        let clubAbbrev = "";
        let provenance = "—";

        if (Array.isArray(p.club_id) && p.club_id.length > 1) {
          const names = p.club_id
            .map((cid) => clubsById.get(Number(cid)))
            .filter(Boolean)
            .map((c) =>
              c.abbreviation ? `${c.name} (${c.abbreviation})` : `${c.name}`
            );
          if (names.length) {
            provenance = names.join(", ");
            clubName = clubsById.get(Number(p.club_id[0]))?.name || "";
            clubAbbrev =
              clubsById.get(Number(p.club_id[0]))?.abbreviation || "";
          }
        } else if (club) {
          clubName = club.name || "";
          clubAbbrev = club.abbreviation || "";
          provenance = clubName
            ? `${clubName}${clubAbbrev ? ` (${clubAbbrev})` : ""}`
            : "—";
        }

        allRows.push({
          playerId: p.id,
          firstname: p.firstname || "",
          lastname: p.lastname || "",
          groupId: gId,
          groupName: g.name,
          groupType: g.group_type || "unknown",
          finalPosition: start + idx,
          provenance,
          clubId: Number.isFinite(clubIdNum) ? clubIdNum : null,
          clubName,
          clubAbbrev,
          provisional: !groupIsComplete,
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

  const typeOrder = ["men", "women", "mix", "team", "unknown"]; // ordre d'affichage commun export + UI

  const flattenRowsForExport = () => {
    const flat = [];
    // Parcourt selon l'ordre défini
    for (const gt of typeOrder) {
      if (!rowsByType.has(gt)) continue;
      const list = rowsByType.get(gt) || [];
      for (const r of list) flat.push(r);
    }
    // Ajoute les autres types non listés
    for (const [gt, list] of rowsByType.entries()) {
      if (typeOrder.includes(gt)) continue;
      for (const r of list || []) flat.push(r);
    }
    return flat;
  };

  const downloadCSV = () => {
    const rows = flattenRowsForExport();
    const header = "Position;Player;Provenance";
    const esc = (v) => {
      const s = String(v ?? "");
      // Si le champ contient ; ou " ou des retours, on l'encadre de quotes et on double les quotes
      if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };
    const lines = [
      header,
      ...rows.map((r) => {
        const player = `${r.lastname?.toUpperCase() || ""} ${
          r.firstname || ""
        }`.trim();
        return [r.finalPosition, player, r.provenance || ""].map(esc).join(";");
      }),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ranking.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSections = () => {
    const order = typeOrder; // ordre d'affichage
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
          <h2 className="text-xl font-semibold mb-3">
            {label(gt)}
            {list?.some((r) => r.provisional) ? " (provisoire)" : ""}
          </h2>
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
                      <Link
                        to={`/tournament/${id}/players/${r.playerId}`}
                        style={{ textDecoration: "none" }}
                      >
                        {r.lastname?.toUpperCase()} {r.firstname}
                      </Link>
                    </td>
                    <td className="border px-3 py-2">
                      {r.clubId ? (
                        <Link
                          to={`/tournament/${id}/provenance/${r.clubId}`}
                          style={{ textDecoration: "none" }}
                        >
                          {r.provenance || "—"}
                        </Link>
                      ) : (
                        r.provenance || "—"
                      )}
                    </td>
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
          <h2 className="text-xl font-semibold mb-3">
            {label(gt)}
            {list?.some((r) => r.provisional) ? " (provisoire)" : ""}
          </h2>
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
                      <Link
                        to={`/tournament/${id}/players/${r.playerId}`}
                        style={{ textDecoration: "none" }}
                      >
                        {r.lastname?.toUpperCase()} {r.firstname}
                      </Link>
                    </td>
                    <td className="border px-3 py-2">
                      {r.clubId ? (
                        <Link
                          to={`/tournament/${id}/provenance/${r.clubId}`}
                          style={{ textDecoration: "none" }}
                        >
                          {r.provenance || "—"}
                        </Link>
                      ) : (
                        r.provenance || "—"
                      )}
                    </td>
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
      <h1 className="text-2xl font-semibold mb-4">
        {t("adminRanking", { defaultValue: "Classement (admin)" })}
      </h1>

      <div className="mb-4">
        <button
          type="button"
          onClick={downloadCSV}
          className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !!error || !rowsByType || rowsByType.size === 0}
          aria-disabled={
            loading || !!error || !rowsByType || rowsByType.size === 0
          }
        >
          {t("export_csv", { defaultValue: "Exporter en CSV" })}
        </button>
      </div>

      {loading && <p>{t("loading", { defaultValue: "Chargement…" })}</p>}
      {error && (
        <div className="text-red-600 mb-4">
          {t("error_loading", {
            defaultValue: "Erreur de chargement:",
          })}{" "}
          {error}
        </div>
      )}

      {!loading && !error && (!rowsByType || rowsByType.size === 0) && (
        <p>
          {t("no_data_ranking", {
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

export default RankingEdit;
