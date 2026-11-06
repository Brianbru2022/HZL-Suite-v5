import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registerPath = process.argv[2] || path.join(root, 'PILOT_RECONCILIATION_REGISTER.md');
const text = readFileSync(registerPath, 'utf8');
const rows = text.split(/\r?\n/)
  .filter((line) => line.startsWith('|'))
  .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
  .filter((cells) => cells.length === 10 && cells[0] !== 'Case' && !cells[0].startsWith('-'));

if (rows.length !== 8) throw new Error(`Expected exactly eight controlled reconciliation rows; found ${rows.length}.`);
const residential = rows.filter((row) => row[1] === 'Residential');
const commercial = rows.filter((row) => row[1] === 'Commercial');
if (residential.length !== 5 || commercial.length !== 3) throw new Error(`Expected five residential and three commercial reconciliations; found ${residential.length} residential and ${commercial.length} commercial.`);

const incomplete = rows.filter((row) => {
  const [caseName, type, workbook, reviewer, date, appraisalTotal, spreadsheetTotal, variance, reportReviewed, status] = row;
  return !caseName || !type || !workbook || /^pending/i.test(workbook) || !reviewer || !date || !appraisalTotal || !spreadsheetTotal || !variance || !/^yes$/i.test(reportReviewed) || !/^passed$/i.test(status);
});
if (incomplete.length) {
  throw new Error(`The controlled reconciliation register is not release-ready. Complete these rows: ${incomplete.map((row) => row[0]).join(', ')}.`);
}

console.log(`Validated ${rows.length} controlled reconciliations from ${path.relative(root, registerPath)}.`);
