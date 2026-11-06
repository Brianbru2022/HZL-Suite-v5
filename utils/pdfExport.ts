/**
 * Client-side PDF export for BoQ using jsPDF.
 */
import type { Project, BoQBill, BoQSection, BoQItem, TenderAwardRecord, TradePackage } from '@/types';
import { getSectionItems } from './calculations';
import { recordOperationLogEntry } from './operationLog';
import { stripRichText } from './richText';

const COST_TYPES = ['PRICED', 'EXTRA_OVER_ITEM', 'PROVISIONAL_SUM', 'PC_SUM'] as const;

type PdfRuntime = {
  jsPDF: typeof import('jspdf').jsPDF;
  autoTable: typeof import('jspdf-autotable').default;
};

let pdfRuntimePromise: Promise<PdfRuntime> | null = null;

function loadPdfRuntime() {
  pdfRuntimePromise ??= Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]).then(([jspdfModule, autoTableModule]) => ({
    jsPDF: jspdfModule.jsPDF,
    autoTable: autoTableModule.default,
  }));

  return pdfRuntimePromise;
}

function isCostItem(item: BoQItem): boolean {
  return COST_TYPES.includes(item.type as (typeof COST_TYPES)[number]);
}

function sectionTotal(section: BoQSection): number {
  return getSectionItems(section).reduce((acc, item) => acc + (isCostItem(item) ? item.total : 0), 0);
}

function billNetTotal(bill: BoQBill): number {
  return bill.sections.reduce((acc, section) => acc + sectionTotal(section), 0);
}

function formatMoney(value: number): string {
  return `GBP ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function saveBlobToFile(blob: Blob, filename: string, filters: Array<{ name: string; extensions: string[] }>) {
  const tauri = typeof window !== 'undefined' ? (window as unknown as { __TAURI__?: unknown }).__TAURI__ : undefined;
  if (tauri) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const path = await save({
        defaultPath: filename,
        filters,
      });
      if (!path) return false;
      const buf = await blob.arrayBuffer();
      await writeFile(path, new Uint8Array(buf));
      return true;
    } catch (error) {
      console.warn('Tauri save failed, falling back to browser download', error);
    }
  }

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
  return true;
}

export async function exportBillToPdf(project: Project, bill: BoQBill): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF, autoTable } = await loadPdfRuntime();
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(project.name, margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(
    `${project.client || '-'} | ${project.location || '-'} | REF: ${project.reference || '-'}`,
    margin,
    y
  );
  y += 6;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BILL OF QUANTITIES', pageW - margin, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generated ${new Date().toLocaleDateString()}`, pageW - margin, y + 5, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 14;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 15;

  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y, pageW - 2 * margin, 12, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(bill.name, margin + 4, y + 8);
  y += 20;

  const head = [['Ref', 'Description', 'Unit', 'Qty', 'Rate', 'Total']];
  const body: string[][] = [];

  for (const section of bill.sections) {
    body.push(['', section.name, '', '', '', 'SECTION']);

    for (const item of getSectionItems(section)) {
      const cost = isCostItem(item);
      body.push([
        cost ? item.reference || '' : '',
        item.description,
        cost ? String(item.unit || '') : '',
        cost ? Number(item.quantity).toFixed(3) : '',
        cost ? `GBP ${Number(item.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '',
        cost ? `GBP ${Number(item.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '',
      ]);
    }

    const subTotal = sectionTotal(section);
    body.push(['', '', '', '', 'Section Sub-Total', `GBP ${subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`]);
  }

  autoTable(doc, {
    head,
    body,
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'plain',
    headStyles: { fontStyle: 'bold', fontSize: 8, fillColor: [255, 255, 255] },
    bodyStyles: { fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 18 },
      3: { cellWidth: 22, halign: 'right' },
      4: { cellWidth: 28, halign: 'right' },
      5: { cellWidth: 28, halign: 'right' },
    },
  });

  const tableMeta = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
  y = (tableMeta?.finalY ?? y) + 20;

  const net = billNetTotal(bill);
  const ohpPct = project.ohpPercentage ?? 0;
  const ohp = net * (ohpPct / 100);
  const gross = net + ohp;

  const totalX = pageW - margin - 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Net Total', totalX - 45, y);
  doc.text(`GBP ${net.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, totalX + 30, y);
  y += 10;

  doc.text(`OH&P (${ohpPct}%)`, totalX - 45, y);
  doc.text(`GBP ${ohp.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, totalX + 30, y);
  y += 12;

  doc.setLineWidth(0.3);
  doc.line(totalX - 50, y, totalX + 50, y);
  y += 10;

  doc.setFontSize(12);
  doc.text('Gross Total', totalX - 45, y);
  doc.text(`GBP ${gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, totalX + 30, y);

  const buildUps = bill.sections.flatMap((section) => getSectionItems(section)
    .filter((item) => item.rateBuildUp?.mode === 'DERIVED')
    .map((item) => ({ section, item })));
  if (buildUps.length > 0) {
    doc.addPage();
    doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text('Rate Build-up Appendix', margin, margin);
    const appendixRows = buildUps.flatMap(({ section, item }) => (item.rateBuildUp?.components || []).map((component) => [
      section.name, item.reference || '-', item.description, component.categoryLabel || component.category, component.description,
      String(component.quantity), component.unit, formatMoney(component.rate), formatMoney(component.included === false ? 0 : component.quantity * component.rate),
    ]));
    autoTable(doc, { head: [['Section', 'Ref', 'Item', 'Category', 'Component', 'Qty', 'Unit', 'Rate', 'Total']], body: appendixRows, startY: margin + 8, margin: { left: margin, right: margin }, styles: { fontSize: 7 }, headStyles: { fillColor: [30, 41, 59] }, columnStyles: { 2: { cellWidth: 34 }, 4: { cellWidth: 42 } } });
  }

  const filename = `${project.name}-${bill.name}.pdf`.replace(/\s+/g, '_');
  const blob = doc.output('blob');
  return { blob, filename };
}

export async function exportTenderApprovalPdf(
  project: Project,
  trade: TradePackage,
  award: TenderAwardRecord
): Promise<{ blob: Blob; filename: string }> {
  const { jsPDF, autoTable } = await loadPdfRuntime();
  const doc = new jsPDF({ format: 'a4', unit: 'mm', orientation: 'landscape' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = 12;
  const budgetValue = project.tenderTradeStatus?.[trade.id]?.budgetValue || 0;
  const winnerRationale = project.tenderTradeStatus?.[trade.id]?.winnerRationale || 'No rationale recorded.';

  const analysis = (trade.contractors || [])
    .map((contractor) => {
      let total = 0;
      let pricedItems = 0;

      project.bills.forEach((bill) => {
        bill.sections.forEach((section) => {
          getSectionItems(section).forEach((item) => {
            if (item.type === 'PRICED' && item.tradePackageId === trade.id) {
              const rate = project.tenderData?.[item.id]?.[contractor.id] || 0;
              total += item.quantity * rate;
              if (rate > 0) pricedItems += 1;
            }
          });
        });
      });

      return {
        contractorId: contractor.id,
        contractorName: contractor.name,
        total,
        pricedItems,
        budgetVariance: budgetValue > 0 ? total - budgetValue : 0,
        budgetVariancePct: budgetValue > 0 ? (total - budgetValue) / budgetValue : 0,
      };
    })
    .sort((a, b) => a.total - b.total);

  const selectedSummary = analysis.find((entry) => entry.contractorId === award.contractorId);
  const selectedTotal = selectedSummary?.total || 0;
  const selectedBudgetVariance = budgetValue > 0 ? selectedTotal - budgetValue : 0;
  const selectedBudgetVariancePct = budgetValue > 0 ? selectedBudgetVariance / budgetValue : 0;
  const decision = award.approvalStatus === 'REJECTED' ? 'Refused' : award.approvalStatus === 'APPROVED' ? 'Approved' : 'In review';
  const comparisonRows = analysis.slice(0, 8);
  if (analysis.length > comparisonRows.length) {
    const selectedIsShown = comparisonRows.some((entry) => entry.contractorId === award.contractorId);
    if (!selectedIsShown && selectedSummary) {
      comparisonRows[comparisonRows.length - 1] = selectedSummary;
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Tender Approval For ${project.name}`, margin, y);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('PDF approval issue. Intended for review/signing and not for live tender editing.', pageW - margin, y, { align: 'right' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Trade package: ${trade.name}`, margin, y);
  doc.text(`Generated ${new Date().toLocaleString()}`, pageW - margin, y, { align: 'right' });
  doc.setTextColor(15, 23, 42);
  y += 5;
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    body: [
      ['Project', project.name, 'Decision', decision],
      ['Trade package', trade.name, 'Winner selected', new Date(award.selectedAt).toLocaleString()],
      ['Chosen contractor', award.contractorName, 'Tender due date', project.tenderTradeStatus?.[trade.id]?.dueDate || 'Not recorded'],
      ['Tender budget', budgetValue > 0 ? formatMoney(budgetValue) : 'Not recorded', 'Response state', project.tenderTradeStatus?.[trade.id]?.responseState || 'Not recorded'],
      ['Chosen tender', formatMoney(selectedTotal), 'Approval PDF created', award.approvalFormCreatedAt ? new Date(award.approvalFormCreatedAt).toLocaleString() : 'On issue'],
      ['Difference to budget', budgetValue > 0 ? formatMoney(selectedBudgetVariance) : 'Budget not recorded', 'Difference to budget (%)', budgetValue > 0 ? `${(selectedBudgetVariancePct * 100).toFixed(2)}%` : 'Budget not recorded'],
    ],
    styles: { fontSize: 7.4, cellPadding: 1.45, valign: 'middle', overflow: 'linebreak' },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 34 },
      1: { cellWidth: 92 },
      2: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 34 },
      3: { cellWidth: 101 },
    },
    pageBreak: 'avoid',
  });
  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 5;

  const midX = margin + (pageW - margin * 2) * 0.55;
  const rightX = midX + 6;
  const leftW = midX - margin - 4;
  const rightW = pageW - rightX - margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Commercial rationale', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  const rationaleLines = doc.splitTextToSize(stripRichText(winnerRationale), leftW);
  doc.text(rationaleLines.slice(0, 7), margin, y + 5);

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rightX, y - 4, rightW, 36, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Director decision', rightX + 3, y + 2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`${award.approvalStatus === 'APPROVED' ? '[X]' : '[ ]'} Approved`, rightX + 3, y + 9);
  doc.text(`${award.approvalStatus === 'REJECTED' ? '[X]' : '[ ]'} Refused`, rightX + 42, y + 9);
  doc.text(`Current status: ${decision}`, rightX + 82, y + 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Director refusal/comment', rightX + 3, y + 17);
  doc.setDrawColor(148, 163, 184);
  doc.line(rightX + 3, y + 23, rightX + rightW - 3, y + 23);
  doc.line(rightX + 3, y + 29, rightX + rightW - 3, y + 29);
  y += 38;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Selected', 'Tenderer', 'Tender total', 'Budget variance', 'Budget variance %', 'Priced items']],
    body: comparisonRows.map((entry) => [
      entry.contractorId === award.contractorId ? 'SELECTED' : '',
      entry.contractorName,
      formatMoney(entry.total),
      budgetValue > 0 ? formatMoney(entry.budgetVariance) : 'Budget not recorded',
      budgetValue > 0 ? `${(entry.budgetVariancePct * 100).toFixed(2)}%` : 'Budget not recorded',
      String(entry.pricedItems),
    ]),
    styles: { fontSize: 7.2, cellPadding: 1.35, valign: 'middle' },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    pageBreak: 'avoid',
    didParseCell: (data) => {
      const row = comparisonRows[data.row.index];
      if (data.section === 'body' && row?.contractorId === award.contractorId) {
        data.cell.styles.fillColor = [224, 242, 254];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 4;
  if (analysis.length > comparisonRows.length) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Comparison table condensed to ${comparisonRows.length} tenderers to keep this approval form on one A4 page. Full tender analysis remains in the Tender Analysis workspace.`, margin, y);
    doc.setTextColor(15, 23, 42);
    y += 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Approval signatures', margin, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(51, 65, 85);
  doc.text(`Prepared by: ${award.preparedBy || ''}`, margin, y + 4);
  doc.text(`Prepared date: ${award.approvalFormCreatedAt ? new Date(award.approvalFormCreatedAt).toLocaleDateString() : ''}`, margin + 92, y + 4);
  y += 11;

  const signatureRows = ['Director approval 1', 'Director approval 2'];
  const rowHeight = 13;
  signatureRows.forEach((role) => {
    doc.setDrawColor(148, 163, 184);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.4);
    doc.text(role, margin, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.text('Signature:', margin + 62, y + 4);
    doc.text('Date:', margin + 196, y + 4);
    doc.line(margin + 62, y + 8, margin + 188, y + 8);
    doc.line(margin + 196, y + 8, pageW - margin, y + 8);
    y += rowHeight;
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('This PDF is the controlled approval issue. Keep the returned signed/refused PDF against the tender record.', margin, pageH - 8);

  const filename = `Tender-Approval-${project.name.replace(/\s+/g, '_')}-${trade.name.replace(/\s+/g, '_')}.pdf`;
  const blob = doc.output('blob');
  return { blob, filename };
}

export async function saveTenderApprovalPdf(blob: Blob, filename: string) {
  const startedAt = performance.now();
  const saved = await saveBlobToFile(blob, filename, [{ name: 'PDF', extensions: ['pdf'] }]);
  recordOperationLogEntry({
    kind: 'export',
    status: saved ? 'success' : 'cancelled',
    subject: 'Tender approval PDF export',
    message: saved ? `Saved or downloaded ${filename}.` : `Tender approval PDF export for ${filename} was cancelled before saving.`,
    path: filename,
    counts: { files: saved ? 1 : 0 },
    durationMs: Math.round(performance.now() - startedAt),
  });
  return saved;
}
