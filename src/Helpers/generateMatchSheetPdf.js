// src/Helpers/generateMatchSheetPdf.js
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const TEMPLATE_URL_3_SET = "/score-sheets/3_set.pdf";
const TEMPLATE_URL_1_SET = "/score-sheets/1_set.pdf";
const TEMPLATE_URL_5_SET = "/score-sheets/5_set.pdf";
const TEMPLATE_URL_TEAM = "/score-sheets/Team.pdf";

// Helper: remplit une page pour un match donné sur le modèle 3 sets
function fill3SetPage(page, font, fontBold, match, mnr) {
  const { width, height } = page.getSize();
  const fontSize = 12;

  const p1 = match.player1 || {};
  const p2 = match.player2 || {};

  const playerAName = `${(p1.lastname || "").toUpperCase()} ${
    p1.firstname || ""
  }`.trim();
  const playerBName = `${(p2.lastname || "").toUpperCase()} ${
    p2.firstname || ""
  }`.trim();

  const rawDate = match.match_day || "";
  let date = "";
  if (rawDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y, m, d] = rawDate.split("-");
      date = `${d}/${m}`;
    } else {
      date = rawDate;
    }
  }
  const time = (match.match_time || "").slice(0, 5); // "08:00:00" -> "08:00"
  const groupName = match.group?.name || "";
  const tableNumber =
    match.table_number !== null && match.table_number !== undefined
      ? String(match.table_number)
      : "";

  let referee1 = "";
  let referee2 = "";

  // Si l'objet joint existe, on l’utilise
  if (match.referee_1 && match.referee_1.lastname) {
    referee1 = match.referee_1.lastname.toUpperCase();
  }

  if (match.referee_2 && match.referee_2.lastname) {
    referee2 = match.referee_2.lastname.toUpperCase();
  }

  // Player "A"
  page.drawText(p1.lastname || "__________", {
    x: 75,
    y: height - 80,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.firstname || "__________", {
    x: 75,
    y: height - 95,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.lastname || "__________", {
    x: 50,
    y: height - 220,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.lastname || "__________", {
    x: 50,
    y: height - 345,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.lastname || "__________", {
    x: 50,
    y: height - 470,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Player "B"
  page.drawText(p2.lastname || "__________", {
    x: 245, // à ajuster
    y: height - 80,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p2.firstname || "__________", {
    x: 245, // à ajuster
    y: height - 95,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p2.lastname || "__________", {
    x: 50,
    y: height - 265,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p2.lastname || "__________", {
    x: 50,
    y: height - 390,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p2.lastname || "__________", {
    x: 50,
    y: height - 515,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Date
  page.drawText(date || "__________", {
    x: 440, // à ajuster
    y: height - 85,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Time
  page.drawText(time || "__:__", {
    x: 530, // à ajuster
    y: height - 85,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Group
  page.drawText(groupName || "____", {
    x: 590, // à ajuster
    y: height - 85,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Match n° (MNR)
  page.drawText(String(mnr || ""), {
    x: 675, // à ajuster
    y: height - 85,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Table
  page.drawText(tableNumber || "____", {
    x: 740, // à ajuster
    y: height - 85,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(referee1 || "", {
    x: 650,
    y: height - 560,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(referee2 || "", {
    x: 650,
    y: height - 575,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
}

function fill5SetPage(page, font, fontBold, match, mnr) {
  const { width, height } = page.getSize();
  const fontSize = 12;

  const p1 = match.player1 || {};
  const p2 = match.player2 || {};

  const playerAName = `${(p1.lastname || "").toUpperCase()} ${
    p1.firstname || ""
  }`.trim();
  const playerBName = `${(p2.lastname || "").toUpperCase()} ${
    p2.firstname || ""
  }`.trim();

  const rawDate = match.match_day || "";
  let date = "";
  if (rawDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y, m, d] = rawDate.split("-");
      date = `${d}/${m}`;
    } else {
      date = rawDate;
    }
  }
  const time = (match.match_time || "").slice(0, 5); // "08:00:00" -> "08:00"
  const groupName = match.group?.name || "";
  const tableNumber =
    match.table_number !== null && match.table_number !== undefined
      ? String(match.table_number)
      : "";

  let referee1 = "";
  let referee2 = "";

  // Si l'objet joint existe, on l’utilise
  if (match.referee_1 && match.referee_1.lastname) {
    referee1 = match.referee_1.lastname.toUpperCase();
  }

  if (match.referee_2 && match.referee_2.lastname) {
    referee2 = match.referee_2.lastname.toUpperCase();
  }

  // Player "A"
  page.drawText(p1.lastname || "__________", {
    x: 40,
    y: height - 110,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.firstname || "__________", {
    x: 40,
    y: height - 125,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.lastname || "__________", {
    x: 30,
    y: height - 240,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.lastname || "__________", {
    x: 30,
    y: height - 350,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.lastname || "__________", {
    x: 30,
    y: height - 460,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.lastname || "__________", {
    x: 30,
    y: height - 570,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.lastname || "__________", {
    x: 30,
    y: height - 680,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Player "B"
  page.drawText(p2.lastname || "__________", {
    x: 175, // à ajuster
    y: height - 110,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p2.firstname || "__________", {
    x: 175, // à ajuster
    y: height - 125,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p2.lastname || "__________", {
    x: 30,
    y: height - 285,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p2.lastname || "__________", {
    x: 30,
    y: height - 395,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p2.lastname || "__________", {
    x: 30,
    y: height - 505,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p2.lastname || "__________", {
    x: 30,
    y: height - 615,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p2.lastname || "__________", {
    x: 30,
    y: height - 725,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Date
  page.drawText(date || "__________", {
    x: 325, // à ajuster
    y: height - 117,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Time
  page.drawText(time || "__:__", {
    x: 395, // à ajuster
    y: height - 117,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Group
  page.drawText(groupName || "____", {
    x: 450, // à ajuster
    y: height - 117,
    size: 7,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Match n° (MNR)
  page.drawText(String(mnr || ""), {
    x: 505, // à ajuster
    y: height - 117,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Table
  page.drawText(tableNumber || "____", {
    x: 550, // à ajuster
    y: height - 117,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Referees
  page.drawText(referee1 || "", {
    x: 440,
    y: height - 760,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(referee2 || "", {
    x: 440,
    y: height - 775,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
}

function fill1SetPage(page, font, fontBold, match, mnr) {
  const { width, height } = page.getSize();
  const fontSize = 12;

  const p1 = match.player1 || {};
  const p2 = match.player2 || {};

  const playerAName = `${(p1.lastname || "").toUpperCase()} ${
    p1.firstname || ""
  }`.trim();
  const playerBName = `${(p2.lastname || "").toUpperCase()} ${
    p2.firstname || ""
  }`.trim();

  const rawDate = match.match_day || "";
  let date = "";
  if (rawDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y, m, d] = rawDate.split("-");
      date = `${d}/${m}`;
    } else {
      date = rawDate;
    }
  }
  const time = (match.match_time || "").slice(0, 5); // "08:00:00" -> "08:00"
  const groupName = match.group?.name || "";
  const tableNumber =
    match.table_number !== null && match.table_number !== undefined
      ? String(match.table_number)
      : "";

  let referee1 = "";
  let referee2 = "";

  // Si l'objet joint existe, on l’utilise
  if (match.referee_1 && match.referee_1.lastname) {
    referee1 = match.referee_1.lastname.toUpperCase();
  }

  if (match.referee_2 && match.referee_2.lastname) {
    referee2 = match.referee_2.lastname.toUpperCase();
  }

  // Player "A"
  page.drawText(p1.lastname || "__________", {
    x: 50,
    y: height - 155,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.firstname || "__________", {
    x: 50,
    y: height - 170,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.lastname || "__________", {
    x: 45,
    y: height - 315,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Player "B"
  page.drawText(p2.lastname || "__________", {
    x: 220, // à ajuster
    y: height - 155,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p2.firstname || "__________", {
    x: 220, // à ajuster
    y: height - 170,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p2.lastname || "__________", {
    x: 45,
    y: height - 360,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Date
  page.drawText(date || "__________", {
    x: 425, // à ajuster
    y: height - 160,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Time
  page.drawText(time || "__:__", {
    x: 507, // à ajuster
    y: height - 160,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Group
  page.drawText(groupName || "____", {
    x: 575, // à ajuster
    y: height - 160,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Match n° (MNR)
  page.drawText(String(mnr || ""), {
    x: 660, // à ajuster
    y: height - 160,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Table
  page.drawText(tableNumber || "____", {
    x: 725, // à ajuster
    y: height - 160,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(referee1 || "", {
    x: 630,
    y: height - 470,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(referee2 || "", {
    x: 630,
    y: height - 485,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
}

function fillTeamSetPage(page, font, fontBold, match, mnr) {
  const { width, height } = page.getSize();
  const fontSize = 12;

  const p1 = match.player1 || {};
  const p2 = match.player2 || {};

  const playerAName = `${(p1.lastname || "").toUpperCase()} ${
    p1.firstname || ""
  }`.trim();
  const playerBName = `${(p2.lastname || "").toUpperCase()} ${
    p2.firstname || ""
  }`.trim();

  const rawDate = match.match_day || "";
  let date = "";
  if (rawDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const [y, m, d] = rawDate.split("-");
      date = `${d}/${m}`;
    } else {
      date = rawDate;
    }
  }
  const time = (match.match_time || "").slice(0, 5); // "08:00:00" -> "08:00"
  const groupName = match.group?.name || "";
  const tableNumber =
    match.table_number !== null && match.table_number !== undefined
      ? String(match.table_number)
      : "";

  let referee1 = "";
  let referee2 = "";

  // Si l'objet joint existe, on l’utilise
  if (match.referee_1 && match.referee_1.lastname) {
    referee1 = match.referee_1.lastname.toUpperCase();
  }

  if (match.referee_2 && match.referee_2.lastname) {
    referee2 = match.referee_2.lastname.toUpperCase();
  }

  // Player "A"
  page.drawText(p1.lastname || "__________", {
    x: 75,
    y: height - 84,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(p1.lastname || "__________", {
    x: 25,
    y: height - 220,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Player "B"
  page.drawText(p2.lastname || "__________", {
    x: 340, // à ajuster
    y: height - 84,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawText(p2.lastname || "__________", {
    x: 25,
    y: height - 475,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Date
  page.drawText(date || "__________", {
    x: 640, // à ajuster
    y: height - 100,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Time
  page.drawText(time || "__:__", {
    x: 745, // à ajuster
    y: height - 100,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Group
  page.drawText(groupName || "____", {
    x: 615, // à ajuster
    y: height - 155,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Match n° (MNR)
  page.drawText(String(mnr || ""), {
    x: 710, // à ajuster
    y: height - 155,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Table
  page.drawText(tableNumber || "____", {
    x: 775, // à ajuster
    y: height - 155,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(referee1 || "", {
    x: 630,
    y: height - 550,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  page.drawText(referee2 || "", {
    x: 630,
    y: height - 565,
    size: fontSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
}

/**
 * Génère un PDF "3 sets" pour UN match et l'ouvre dans un nouvel onglet.
 * API inchangée, mais implémentation factorisée avec la version batch.
 *
 * @param {Object} match - l'objet match (avec player1, player2, group, etc.)
 * @param {number} mnr   - le numéro MNR du match
 */
export async function generate3SetSheet(match, mnr) {
  // Charger le modèle
  const templateBytes = await fetch(TEMPLATE_URL_3_SET).then((res) =>
    res.arrayBuffer()
  );
  const templateDoc = await PDFDocument.load(templateBytes);

  // Nouveau PDF final (1 seule page)
  const pdfDoc = await PDFDocument.create();

  const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
  const page = pdfDoc.addPage(templatePage);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  fill3SetPage(page, font, fontBold, match, mnr);

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  window.open(url, "_blank");
}

/**
 * Génère un SEUL PDF multi-pages "3 sets" avec une page par match.
 *
 * @param {Array<{match: Object, mnr: number}>} items
 */
export async function generate3SetSheetsBatch(items) {
  if (!items || items.length === 0) return;

  // Charger le modèle une seule fois
  const templateBytes = await fetch(TEMPLATE_URL_3_SET).then((res) =>
    res.arrayBuffer()
  );
  const templateDoc = await PDFDocument.load(templateBytes);

  // Nouveau PDF final
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

  for (const { match, mnr } of items) {
    const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
    const page = pdfDoc.addPage(templatePage);
    fill3SetPage(page, font, fontBold, match, mnr);
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  // Un seul PDF avec toutes les feuilles
  window.open(url, "_blank");
}

export async function generate1SetSheetsBatch(items) {
  if (!items || items.length === 0) return;

  // Charger le modèle 1 set une seule fois
  const templateBytes = await fetch(TEMPLATE_URL_1_SET).then((res) =>
    res.arrayBuffer()
  );
  const templateDoc = await PDFDocument.load(templateBytes);

  // Nouveau PDF final
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  for (const { match, mnr } of items) {
    const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
    const page = pdfDoc.addPage(templatePage);
    // On réutilise le même remplissage d'en-tête (joueurs, date, table, etc.)
    fill1SetPage(page, font, fontBold, match, mnr);
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  // Un seul PDF avec toutes les feuilles 1 set
  window.open(url, "_blank");
}

export async function generate5SetSheetsBatch(items) {
  if (!items || items.length === 0) return;

  // Charger le modèle 1 set une seule fois
  const templateBytes = await fetch(TEMPLATE_URL_5_SET).then((res) =>
    res.arrayBuffer()
  );
  const templateDoc = await PDFDocument.load(templateBytes);

  // Nouveau PDF final
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  for (const { match, mnr } of items) {
    const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
    const page = pdfDoc.addPage(templatePage);
    // On réutilise le même remplissage d'en-tête (joueurs, date, table, etc.)
    fill5SetPage(page, font, fontBold, match, mnr);
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  // Un seul PDF avec toutes les feuilles 1 set
  window.open(url, "_blank");
}

export async function generateTeamSetSheetsBatch(items) {
  if (!items || items.length === 0) return;

  // Charger le modèle 1 set une seule fois
  const templateBytes = await fetch(TEMPLATE_URL_TEAM).then((res) =>
    res.arrayBuffer()
  );
  const templateDoc = await PDFDocument.load(templateBytes);

  // Nouveau PDF final
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.CourierBold);

  for (const { match, mnr } of items) {
    const [templatePage] = await pdfDoc.copyPages(templateDoc, [0]);
    const page = pdfDoc.addPage(templatePage);
    // On réutilise le même remplissage d'en-tête (joueurs, date, table, etc.)
    fillTeamSetPage(page, font, fontBold, match, mnr);
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);

  // Un seul PDF avec toutes les feuilles 1 set
  window.open(url, "_blank");
}
