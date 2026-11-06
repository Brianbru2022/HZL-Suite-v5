import type { DevelopmentAppraisal } from "../types";
import { recordOperationLogEntry } from "./operationLog";

type PdfRuntime = {
  jsPDF: typeof import("jspdf").jsPDF;
  autoTable: typeof import("jspdf-autotable").default;
};

type LandFinderReportSite = DevelopmentAppraisal & {
  offMarket: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  NOT_VIABLE: "Not viable",
  BID_LOST: "Bid lost",
  VIABLE_DISCOUNTED: "Viable, discounted",
  NOT_APPRAISED: "Not appraised",
  APPRAISAL_IN_PROGRESS: "Appraisal in progress",
  APPRAISED_VIABLE: "Appraised viable",
  APPRAISED_PURSUED: "Appraised pursued",
};

const STATUS_COLOURS: Record<string, [number, number, number]> = {
  NOT_VIABLE: [127, 29, 29],
  BID_LOST: [100, 116, 139],
  VIABLE_DISCOUNTED: [190, 18, 60],
  NOT_APPRAISED: [3, 105, 161],
  APPRAISAL_IN_PROGRESS: [15, 118, 110],
  APPRAISED_VIABLE: [109, 40, 217],
  APPRAISED_PURSUED: [180, 83, 9],
};

const PLANNING_LABELS: Record<string, string> = {
  UNKNOWN: "Unknown",
  NONE: "None",
  IN_LDP: "In LDP",
  EXPIRED: "Expired",
  IN_PRINCIPLE: "In principle",
  DETAILED_CONSENT: "Detailed consent",
};

let pdfRuntimePromise: Promise<PdfRuntime> | null = null;

function loadPdfRuntime() {
  pdfRuntimePromise ??= Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]).then(([jspdfModule, autoTableModule]) => ({
    jsPDF: jspdfModule.jsPDF,
    autoTable: autoTableModule.default,
  }));
  return pdfRuntimePromise;
}

function siteGroupKey(appraisal: DevelopmentAppraisal) {
  const site = (appraisal.site || "").trim().toLocaleLowerCase().replace(/\s+/g, " ");
  return site || `appraisal:${appraisal.id}`;
}

function latestLiveSites(appraisals: DevelopmentAppraisal[]): LandFinderReportSite[] {
  const grouped = new Map<string, DevelopmentAppraisal[]>();
  appraisals.forEach((appraisal) => {
    const key = siteGroupKey(appraisal);
    grouped.set(key, [...(grouped.get(key) || []), appraisal]);
  });

  return Array.from(grouped.values())
    .map((versions) => {
      const sorted = versions.slice().sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      const current = sorted.find((appraisal) => appraisal.status !== "ARCHIVED") || sorted[0];
      return { ...current, offMarket: current.siteOffMarket === true };
    })
    .filter((appraisal) => appraisal.siteStatus !== "SITE_ACQUIRED")
    .sort((left, right) =>
      Number(left.offMarket) - Number(right.offMarket) ||
      (left.site || left.name).localeCompare(right.site || right.name),
    );
}

function formatMoney(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `£${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    : "-";
}

function formatArea(value: number | undefined) {
  return typeof value === "number" && value > 0
    ? `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ha`
    : "-";
}

function safeFilename(value: string) {
  return value.replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "") || "land-finder";
}

async function saveBlobToFile(blob: Blob, filename: string) {
  const tauri = typeof window !== "undefined"
    ? (window as unknown as { __TAURI__?: unknown }).__TAURI__
    : undefined;
  if (tauri) {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const { writeFile } = await import("@tauri-apps/plugin-fs");
      const path = await save({ defaultPath: filename, filters: [{ name: "PDF", extensions: ["pdf"] }] });
      if (!path) return false;
      await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
      return true;
    } catch (error) {
      console.warn("Land Finder PDF save failed, falling back to browser download", error);
    }
  }
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function exportLandFinderStatusReport(appraisals: DevelopmentAppraisal[]) {
  const startedAt = performance.now();
  const sites = latestLiveSites(appraisals);
  const { jsPDF, autoTable } = await loadPdfRuntime();
  const doc = new jsPDF({ format: "a3", orientation: "landscape", unit: "mm" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const filename = `${safeFilename(`Land Finder - ${new Date().toISOString().slice(0, 10)} - Site Status Summary`)}.pdf`;

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("LAND FINDER", margin, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text("Site Status Summary", margin, 18);
  doc.text(`Live register snapshot | ${today}`, margin, 23.5);

  const offMarketCount = sites.filter((site) => site.offMarket).length;
  const viableCount = sites.filter((site) => ["APPRAISED_VIABLE", "APPRAISED_PURSUED"].includes(site.siteStatus || "")).length;
  const summary = [
    ["ACTIVE SITES", String(sites.length)],
    ["OFF MARKET", String(offMarketCount)],
    ["VIABLE / PURSUED", String(viableCount)],
  ];
  summary.forEach(([label, value], index) => {
    const x = pageWidth - margin - 92 + index * 30;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(4.8);
    doc.setTextColor(148, 163, 184);
    doc.text(label, x, 10, { align: "center" });
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(value, x, 20, { align: "center" });
  });

  autoTable(doc, {
    startY: 36,
    margin: { left: margin, right: margin, bottom: 15 },
    head: [["#", "Site", "County", "Commercial status", "Planning", "Area", "Land value"]],
    body: sites.map((site, index) => [
      String(index + 1),
      site.site || site.name,
      site.siteCounty || "-",
      STATUS_LABELS[site.siteStatus || ""] || "Not appraised",
      PLANNING_LABELS[site.sitePlanningStatus || ""] || "Unknown",
      formatArea(site.siteAreaHectares),
      site.siteLandPriceKnown ? formatMoney(site.siteLandPrice) : "-",
    ]),
    styles: { font: "helvetica", fontSize: 5.7, cellPadding: 1.45, lineColor: [220, 227, 236], lineWidth: 0.15, overflow: "ellipsize" },
    headStyles: { fillColor: [233, 238, 245], textColor: [100, 116, 139], fontStyle: "bold", fontSize: 5.5, halign: "left" },
    alternateRowStyles: { fillColor: [250, 251, 253] },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 105, fontStyle: "bold" },
      2: { cellWidth: 52 },
      3: { cellWidth: 70 },
      4: { cellWidth: 52 },
      5: { cellWidth: 30, halign: "right" },
      6: { cellWidth: 48, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const site = sites[data.row.index];
      if (!site) return;
      if (site.offMarket) {
        data.cell.styles.fillColor = [238, 241, 244];
        data.cell.styles.textColor = [100, 116, 139];
      }
      if (data.column.index === 3) {
        data.cell.styles.textColor = STATUS_COLOURS[site.siteStatus || ""] || [3, 105, 161];
      }
    },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 1) return;
      const site = sites[data.row.index];
      if (!site?.offMarket) return;
      const pillWidth = 22;
      const pillX = data.cell.x + data.cell.width - pillWidth - 1.5;
      const pillY = data.cell.y + 1.3;
      doc.setFillColor(100, 116, 139);
      doc.roundedRect(pillX, pillY, pillWidth, 4.7, 2.2, 2.2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.2);
      doc.text("OFF MARKET", pillX + pillWidth / 2, pillY + 3.1, { align: "center" });
    },
  });

  doc.setDrawColor(220, 227, 236);
  doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.6);
  doc.setTextColor(100, 116, 139);
  doc.text("Excludes sites recorded as acquired. Off-market opportunities remain listed for audit and tracking.", margin, pageHeight - 5);
  doc.text("HZL QS Suite | Internal opportunity register", pageWidth - margin, pageHeight - 5, { align: "right" });

  const blob = doc.output("blob");
  const saved = await saveBlobToFile(blob, filename);
  recordOperationLogEntry({
    kind: "export",
    status: saved ? "success" : "cancelled",
    subject: "Land Finder site status PDF",
    message: saved ? `Saved or downloaded ${filename}.` : `Land Finder PDF export for ${filename} was cancelled before saving.`,
    path: filename,
    counts: { items: sites.length, files: saved ? 1 : 0 },
    durationMs: Math.round(performance.now() - startedAt),
  });
  return { saved, filename, siteCount: sites.length };
}
