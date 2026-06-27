const { AuthorizationError } = require('../../utils/errors');
const { EXPORT_REGISTRY } = require('./registry');
const { exportRows, exportTemplate } = require('../../utils/xlsxWorkbook');
const { normalizeFormat } = require('../../utils/spreadsheetMime');

class ExportService {
  static supportedModules() {
    return Object.keys(EXPORT_REGISTRY);
  }

  static async exportSelected(module, ids, format = 'xlsx', filters = {}, req = null) {
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

    if (String(format).toLowerCase() === 'json') return { rows, columns: handler.columns };

    return exportRows({
      columns: handler.columns,
      rows,
      format,
      filename: `${module}-export`,
      title: `تصدير — ${module}`,
    });
  }

  static async template(module, format = 'xlsx') {
    const handler = EXPORT_REGISTRY[module];
    if (!handler) throw new AuthorizationError(`Export module not supported: ${module}`);
    return exportTemplate({
      columns: handler.columns,
      format,
      filename: `${module}-template`,
      title: `قالب تصدير — ${module}`,
    });
  }
}

module.exports = ExportService;
