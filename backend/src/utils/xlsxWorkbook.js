const ExcelJS = require('exceljs');
const { rowsToCsv } = require('./csvParser');
const { normalizeFormat } = require('./spreadsheetMime');

const DATA_SHEET = 'البيانات';
const GUIDE_SHEET = 'دليل الأعمدة';
const INSTRUCTIONS_SHEET = 'تعليمات';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } };
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const SUBHEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
const SUBHEADER_FONT = { bold: true, color: { argb: 'FF1E3A8A' }, size: 10 };
const ALT_ROW_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
const BORDER_THIN = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

const EXAMPLE_ROW_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
const EXAMPLE_ROW_FONT = { italic: true, color: { argb: 'FF9A3412' }, size: 10 };

function cellVal(value) {
  if (value == null) return '';
  if (typeof value === 'object' && !(value instanceof Date)) return JSON.stringify(value);
  return value;
}

function styleHeaderRow(row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER_THIN;
  });
  row.height = 28;
}

function styleDataRow(row, zebra) {
  row.eachCell((cell) => {
    if (zebra) cell.fill = ALT_ROW_FILL;
    cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
    cell.border = BORDER_THIN;
  });
}

function autoWidth(sheet, min = 12, max = 42) {
  sheet.columns.forEach((col) => {
    let maxLen = min;
    col.eachCell({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? '').length;
      if (len > maxLen) maxLen = Math.min(len + 2, max);
    });
    col.width = maxLen;
  });
}

function columnsToKeys(columns) {
  return columns.map((c) => c.label || c.key);
}

function rowToValues(row, columns) {
  return columns.map((c) => cellVal(c.get ? c.get(row) : row[c.key]));
}

function applyEnumValidations(sheet, columns, guideFields, startRow = 4, endRow = 1000) {
  if (!guideFields?.length) return;
  const fieldByKey = Object.fromEntries(guideFields.map((f) => [f.key, f]));
  columns.forEach((col, idx) => {
    const field = fieldByKey[col.key];
    if (!field?.allowedValues?.length) return;
    const letter = sheet.getColumn(idx + 1).letter;
    sheet.dataValidations.add(`${letter}${startRow}:${letter}${endRow}`, {
      type: 'list',
      allowBlank: true,
      formulae: [`"${field.allowedValues.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'قيمة غير صالحة',
      error: `اختر: ${field.allowedValues.join(', ')}`,
    });
  });
}

function addReferenceSheets(workbook, referenceSheets = []) {
  referenceSheets.forEach((ref) => {
    const sheet = workbook.addWorksheet(ref.name, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
    const headers = ref.headers || ['القيمة'];
    sheet.addRow(headers);
    styleHeaderRow(sheet.getRow(1));
    (ref.rows || []).forEach((row, i) => {
      const dataRow = sheet.addRow(row);
      styleDataRow(dataRow, i % 2 === 1);
    });
    autoWidth(sheet);
  });
}

async function buildMinimalImportWorkbook({ columns, guideFields }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AAMS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(DATA_SHEET, {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });
  const labelsAr = columns.map((c) => c.labelAr || c.label || c.key);
  const headerRow = sheet.addRow(labelsAr);
  styleHeaderRow(headerRow);
  applyEnumValidations(sheet, columns, guideFields, 2, 2000);
  autoWidth(sheet);
  return workbook.xlsx.writeBuffer();
}

async function buildDataWorkbook({
  columns,
  rows = [],
  title = 'تصدير',
  guideFields = null,
  rulesAr = [],
  exampleRow = null,
  exampleRowNote = null,
  referenceSheets = [],
  minimal = false,
}) {
  if (minimal) {
    return buildMinimalImportWorkbook({ columns, guideFields });
  }
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AAMS';
  workbook.created = new Date();

  if (rulesAr?.length || guideFields?.length) {
    const inst = workbook.addWorksheet(INSTRUCTIONS_SHEET, { views: [{ rightToLeft: true }] });
    inst.getColumn(1).width = 100;
    inst.getCell(1, 1).value = title;
    inst.getCell(1, 1).font = { bold: true, size: 14, color: { argb: 'FF0F172A' } };
    let r = 3;
    if (rulesAr.length) {
      inst.getCell(r, 1).value = 'قواعد الاستخدام:';
      inst.getCell(r, 1).font = SUBHEADER_FONT;
      r += 1;
      rulesAr.forEach((rule) => {
        inst.getCell(r, 1).value = `• ${rule}`;
        inst.getCell(r, 1).alignment = { wrapText: true };
        r += 1;
      });
      r += 1;
    }
    inst.getCell(r, 1).value = 'املأ ورقة «البيانات»: الصف 1 مفاتيح إنجليزية (لا تغيّرها)، الصف 2 وصف عربي، الصف 3 مثال (يُتخطى)، ابدأ بياناتك من الصف 4.';
    inst.getCell(r, 1).font = { italic: true, color: { argb: 'FF64748B' } };
    inst.getCell(r, 1).alignment = { wrapText: true };
  }

  addReferenceSheets(workbook, referenceSheets);

  if (guideFields?.length) {
    const guide = workbook.addWorksheet(GUIDE_SHEET, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
    guide.columns = [
      { header: 'المفتاح (لا تغيّره)', key: 'key', width: 22 },
      { header: 'الوصف بالعربي', key: 'labelAr', width: 24 },
      { header: 'إجباري', key: 'required', width: 10 },
      { header: 'القيم المسموحة', key: 'allowed', width: 36 },
      { header: 'الافتراضي', key: 'def', width: 18 },
      { header: 'ملاحظات', key: 'hint', width: 40 },
    ];
    const h = guide.getRow(1);
    styleHeaderRow(h);
    guideFields.forEach((f, i) => {
      const allowed = f.enumOptions?.map((o) => `${o.value} (${o.labelAr})`).join(' | ')
        || (f.allowedValues?.join(' | ') ?? '');
      const row = guide.addRow({
        key: f.label || f.key,
        labelAr: f.labelAr || '',
        required: f.required ? 'نعم' : 'لا',
        allowed,
        def: f.defaultOnCreate != null ? String(f.defaultOnCreate) : '—',
        hint: f.hintAr || '',
      });
      styleDataRow(row, i % 2 === 1);
    });
    autoWidth(guide);
  }

  const dataSheet = workbook.addWorksheet(DATA_SHEET, {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 2 }],
  });
  const keys = columnsToKeys(columns);
  const labelsAr = columns.map((c) => c.labelAr || c.label || c.key);

  const headerRow = dataSheet.addRow(keys);
  styleHeaderRow(headerRow);
  const subRow = dataSheet.addRow(labelsAr);
  subRow.eachCell((cell) => {
    cell.fill = SUBHEADER_FILL;
    cell.font = SUBHEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER_THIN;
  });
  subRow.height = 24;

  if (exampleRow) {
    const ex = dataSheet.addRow(exampleRow);
    ex.eachCell((cell) => {
      cell.fill = EXAMPLE_ROW_FILL;
      cell.font = EXAMPLE_ROW_FONT;
      cell.alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
      cell.border = BORDER_THIN;
    });
    if (exampleRowNote) {
      const noteCell = ex.getCell(1);
      noteCell.note = exampleRowNote;
    }
  }

  applyEnumValidations(dataSheet, columns, guideFields, exampleRow ? 4 : 3);

  rows.forEach((row, i) => {
    const dataRow = dataSheet.addRow(rowToValues(row, columns));
    styleDataRow(dataRow, i % 2 === 1);
  });

  autoWidth(dataSheet);
  return workbook.xlsx.writeBuffer();
}

async function buildTemplateWorkbook({ columns, guideFields, rulesAr, title, exampleRow, exampleRowNote, referenceSheets, minimal }) {
  return buildDataWorkbook({
    columns,
    rows: [],
    title,
    guideFields,
    rulesAr,
    exampleRow,
    exampleRowNote,
    referenceSheets,
    minimal,
  });
}

async function parseWorkbookBuffer(buffer, { fields = [] } = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  let sheet = workbook.getWorksheet(DATA_SHEET);
  if (!sheet) {
    sheet = workbook.worksheets.find((ws) => ws.name !== GUIDE_SHEET
      && ws.name !== INSTRUCTIONS_SHEET
      && ws.name !== 'الفروع')
      || workbook.worksheets[0];
  }
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = String(cell.value ?? '').trim();
  });
  const cleanHeaders = headers.filter(Boolean);
  if (!cleanHeaders.length) return [];

  const keyByHeader = {};
  fields.forEach((f) => {
    keyByHeader[f.key] = f.key;
    keyByHeader[f.label] = f.key;
    if (f.labelAr) keyByHeader[f.labelAr] = f.key;
  });

  const resolveKey = (header) => keyByHeader[header] || header;

  const rows = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= 1) return;
    const obj = { _sheetRow: rowNumber };
    let hasValue = false;
    cleanHeaders.forEach((h, idx) => {
      const cell = row.getCell(idx + 1);
      const v = cell.value;
      let text = '';
      if (v == null) text = '';
      else if (typeof v === 'object' && v.richText) text = v.richText.map((t) => t.text).join('');
      else if (v instanceof Date) text = v.toISOString().slice(0, 10);
      else text = String(v).trim();
      if (text) hasValue = true;
      obj[resolveKey(h)] = text;
    });
    if (!hasValue) return;
    const firstKey = resolveKey(cleanHeaders[0]);
    if (obj[firstKey] === cleanHeaders[0] || obj[firstKey] === fields.find((f) => f.key === firstKey)?.labelAr) return;
    rows.push(obj);
  });
  return rows;
}

async function exportRows({ columns, rows, format, filename, guideFields, rulesAr, title, exampleRow, exampleRowNote, referenceSheets }) {
  const fmt = normalizeFormat(format);
  const baseName = String(filename || 'export').replace(/\.(csv|xlsx)$/i, '');
  if (fmt === 'csv') {
    return {
      format: 'csv',
      filename: `${baseName}.csv`,
      body: rowsToCsv(rows, columns),
      isBuffer: false,
    };
  }
  const buffer = await buildDataWorkbook({
    columns,
    rows,
    title,
    guideFields,
    rulesAr,
    exampleRow,
    exampleRowNote,
    referenceSheets,
  });
  return {
    format: 'xlsx',
    filename: `${baseName}.xlsx`,
    body: buffer,
    isBuffer: true,
  };
}

async function exportTemplate({ columns, format, filename, guideFields, rulesAr, title, exampleRow, exampleRowNote, referenceSheets, minimal = false }) {
  const fmt = normalizeFormat(format);
  const baseName = String(filename || 'template').replace(/\.(csv|xlsx)$/i, '');
  if (fmt === 'csv') {
    return {
      format: 'csv',
      filename: `${baseName}.csv`,
      body: rowsToCsv([], columns),
      isBuffer: false,
    };
  }
  const buffer = await buildTemplateWorkbook({
    columns,
    guideFields,
    rulesAr,
    title,
    exampleRow,
    exampleRowNote,
    referenceSheets,
    minimal,
  });
  return {
    format: 'xlsx',
    filename: `${baseName}.xlsx`,
    body: buffer,
    isBuffer: true,
  };
}

async function buildMultiSheetWorkbook({ sheets = [], title = 'تصدير' }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AAMS';
  workbook.created = new Date();

  sheets.forEach((sheetDef) => {
    const safeName = String(sheetDef.name || 'ورقة').slice(0, 31);
    const sheet = workbook.addWorksheet(safeName, {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
    });
    const columns = sheetDef.columns || [];
    const labelsAr = columns.map((c) => c.labelAr || c.label || c.key);
    const headerRow = sheet.addRow(labelsAr);
    styleHeaderRow(headerRow);
    (sheetDef.rows || []).forEach((row, i) => {
      const dataRow = sheet.addRow(rowToValues(row, columns));
      styleDataRow(dataRow, i % 2 === 1);
    });
    autoWidth(sheet);
  });

  if (title && sheets.length) {
    workbook.title = title;
  }

  return workbook.xlsx.writeBuffer();
}

async function exportMultiSheet({ sheets, format, filename, title }) {
  const fmt = normalizeFormat(format);
  const baseName = String(filename || 'export').replace(/\.(csv|xlsx)$/i, '');
  if (fmt === 'csv') {
    const first = sheets[0] || { columns: [], rows: [] };
    return {
      format: 'csv',
      filename: `${baseName}.csv`,
      body: rowsToCsv(first.rows || [], first.columns || []),
      isBuffer: false,
    };
  }
  const buffer = await buildMultiSheetWorkbook({ sheets, title });
  return {
    format: 'xlsx',
    filename: `${baseName}.xlsx`,
    body: buffer,
    isBuffer: true,
  };
}

function sendExportResponse(res, result) {
  const { setSpreadsheetDownloadHeaders } = require('./spreadsheetMime');
  setSpreadsheetDownloadHeaders(res, result.filename, result.format);
  return res.send(result.body);
}

module.exports = {
  DATA_SHEET,
  GUIDE_SHEET,
  INSTRUCTIONS_SHEET,
  buildDataWorkbook,
  buildTemplateWorkbook,
  parseWorkbookBuffer,
  exportRows,
  exportTemplate,
  exportMultiSheet,
  buildMultiSheetWorkbook,
  sendExportResponse,
};
