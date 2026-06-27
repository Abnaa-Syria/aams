/** Import page routes for list modules. */
export const IMPORT_MODULE_PATHS = {
  users: '/import/users',
  vehicles: '/import/vehicles',
};

export function importPagePath(module) {
  return IMPORT_MODULE_PATHS[module] || `/import/${module}`;
}

export function operationalImportPath(category, { reportDate, cityId } = {}) {
  const params = new URLSearchParams();
  if (reportDate) params.set('reportDate', reportDate);
  if (cityId) params.set('cityId', cityId);
  const qs = params.toString();
  return `/operational-reports/import/${category}${qs ? `?${qs}` : ''}`;
}
