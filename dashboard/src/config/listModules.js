/** Maps list API paths to export/import module keys. */
const API_PATH_TO_MODULE = {
  '/users': 'users',
  '/vehicles': 'vehicles',
  '/shifts': 'shifts',
  '/maintenance-requests': 'maintenance-requests',
  '/leave-requests': 'leave-requests',
  '/incidents': 'incidents',
  '/fuel-logs': 'fuel-logs',
  '/documents': 'documents',
  '/licenses': 'licenses',
  '/violations': 'violations',
  '/penalties': 'penalties',
  '/rewards': 'rewards',
  '/investigations': 'investigations',
  '/permission-requests': 'permission-requests',
  '/salary-advances': 'salary-advances',
  '/daily-reports': 'daily-reports',
  '/bank-accounts': 'bank-accounts',
  '/platform-accounts': 'platform-accounts',
  '/tickets': 'tickets',
  '/audit-logs': 'audit-logs',
};

export const IMPORTABLE_MODULES = new Set(['users', 'vehicles']);

export function moduleFromApiUrl(apiUrl = '') {
  const path = apiUrl.split('?')[0].replace(/\/$/, '');
  if (API_PATH_TO_MODULE[path]) return API_PATH_TO_MODULE[path];
  return path.replace(/^\//, '') || null;
}

export function isExportableModule(module) {
  return !!module && Object.values(API_PATH_TO_MODULE).includes(module);
}

export function isImportableModule(module) {
  return IMPORTABLE_MODULES.has(module);
}

/** Quick report presets for driver list (#13 operational reports). */
export const DRIVER_FILTER_PRESETS = [
  { key: 'onShift', value: 'true', label: 'شغالين الآن (شفت نشط)' },
  { key: 'onShift', value: 'false', label: 'غير شغالين الآن' },
  { key: 'availabilityStatus', value: 'ON_SHIFT', label: 'على شفت' },
  { key: 'availabilityStatus', value: 'AVAILABLE', label: 'متاحين' },
  { key: 'availabilityStatus', value: 'OFF_DUTY', label: 'خارج الخدمة' },
  { key: 'availabilityStatus', value: 'ON_LEAVE', label: 'في إجازة' },
  { key: 'hasVehicle', value: 'false', label: 'بدون مركبة' },
  { key: 'hasBankAccount', value: 'false', label: 'بدون حساب بنكي' },
  { key: 'accountStatus', value: 'TEMPORARILY_SUSPENDED', label: 'موقوفين مؤقتاً' },
  { key: 'accountStatus', value: 'UNDER_INVESTIGATION', label: 'تحت التحقيق' },
];
