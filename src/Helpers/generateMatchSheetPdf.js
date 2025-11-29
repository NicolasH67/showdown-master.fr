// src/Helpers/generateMatchSheetPdf.js
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const TEMPLATE_URL_3_SET = "/score-sheets/3_set.pdf";

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

  const date = match.match_day || "";
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

  // ⚠️ Coordonnées (x, y) à ajuster en fonction de la maquette PDF réelle.
  // Commence avec ces valeurs puis affine si besoin.

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
    x: 430, // à ajuster
    y: height - 85,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });

  // Time
  page.drawText(time || "__:__", {
    x: 530, // à ajuster
    y: height - 85,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });

  // Group
  page.drawText(groupName || "____", {
    x: 590, // à ajuster
    y: height - 85,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });

  // Match n° (MNR)
  page.drawText(String(mnr || ""), {
    x: 675, // à ajuster
    y: height - 85,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });

  // Table
  page.drawText(tableNumber || "____", {
    x: 740, // à ajuster
    y: height - 85,
    size: fontSize,
    font,
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

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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
