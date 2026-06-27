import * as XLSX from 'xlsx';
import { parseCsv } from './csvParse';

const DATA_SHEET_NAMES = ['البيانات', 'Data', 'Sheet1'];
const SKIP_SHEETS = new Set(['دليل الأعمدة', 'تعليمات', 'الفروع']);

function buildHeaderMap(fields = []) {
  const map = {};
  fields.forEach((f) => {
    map[f.key] = f.key;
    map[f.label] = f.key;
    if (f.labelAr) map[f.labelAr] = f.key;
  });
  return map;
}

function resolveKey(header, headerMap) {
  const h = String(header || '').trim();
  return headerMap[h] || h;
}

export async function readFileAsText(file) {
  return file.text();
}

function matrixToRows(matrix, fields = []) {
  if (!matrix.length) return { headers: [], rows: [] };
  const rawHeaders = matrix[0].map((h) => String(h ?? '').trim());
  const headerMap = buildHeaderMap(fields);
  const headers = rawHeaders.map((h) => resolveKey(h, headerMap)).filter(Boolean);
  const displayHeaders = rawHeaders.filter(Boolean);

  const rows = [];
  for (let i = 1; i < matrix.length; i += 1) {
    const cells = matrix[i];
    if (!cells?.some((c) => String(c ?? '').trim())) continue;
    const obj = { _sheetRow: i + 1 };
    rawHeaders.forEach((h, idx) => {
      if (!h) return;
      const key = resolveKey(h, headerMap);
      obj[key] = String(cells[idx] ?? '').trim();
    });
    if (Object.entries(obj).some(([k, v]) => k !== '_sheetRow' && v)) rows.push(obj);
  }
  return { headers: displayHeaders, rows };
}

export async function parseSpreadsheetFile(file, fields = []) {
  const name = file.name || '';
  if (/\.xlsx$/i.test(name)) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = DATA_SHEET_NAMES.find((n) => workbook.SheetNames.includes(n))
      || workbook.SheetNames.find((n) => !SKIP_SHEETS.has(n))
      || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    return matrixToRows(matrix, fields);
  }
  const text = await file.text();
  const parsed = parseCsv(text);
  const headerMap = buildHeaderMap(fields);
  return {
    headers: parsed.headers,
    rows: parsed.rows.map((row, i) => {
      const out = { _sheetRow: i + 2 };
      Object.entries(row).forEach(([k, v]) => {
        out[resolveKey(k, headerMap)] = v;
      });
      return out;
    }),
  };
}

export function isExampleDriverRow(row, exampleIdentity = '1000000099') {
  const id = String(row?.identityNumber || '').trim();
  return id === exampleIdentity || id.toUpperCase() === 'EXAMPLE';
}
