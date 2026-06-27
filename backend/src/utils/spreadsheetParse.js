const { parseCsv } = require('./csvParser');
const { isXlsxBuffer } = require('./spreadsheetMime');
const { parseWorkbookBuffer } = require('./xlsxWorkbook');

async function parseSpreadsheetToRows(buffer, filename = '', options = {}) {
  if (isXlsxBuffer(buffer, filename)) {
    return parseWorkbookBuffer(buffer, options);
  }
  return parseCsv(buffer.toString('utf8'));
}

module.exports = { parseSpreadsheetToRows };
