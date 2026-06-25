const { AuthorizationError } = require('../../utils/errors');
const { rowsToCsv } = require('../../utils/csvParser');
const { EXPORT_REGISTRY } = require('./registry');

class ExportService {
  static supportedModules() {
    return Object.keys(EXPORT_REGISTRY);
  }

  static async exportSelected(module, ids, format = 'csv', filters = {}, req = null) {
    const handler = EXPORT_REGISTRY[module];
    if (!handler) throw new AuthorizationError(`Export module not supported: ${module}`);

    const parsedIds = ids?.length ? ids.map((id) => parseInt(id, 10)).filter((n) => !Number.isNaN(n)) : null;
    let rows;
    if (parsedIds?.length) {
      rows = await handler.fetchIds(parsedIds);
    } else if (handler.fetchFiltered && req) {
      rows = await handler.fetchFiltered(filters, req);
    } else {
      rows = await handler.fetchIds([]);
    }

    if (format === 'json') return { rows, columns: handler.columns };
    return { csv: rowsToCsv(rows, handler.columns), filename: `${module}-export.csv` };
  }

  static templateCsv(module) {
    const handler = EXPORT_REGISTRY[module];
    if (!handler) throw new AuthorizationError(`Export module not supported: ${module}`);
    return { csv: rowsToCsv([], handler.columns), filename: `${module}-template.csv` };
  }
}

module.exports = ExportService;
