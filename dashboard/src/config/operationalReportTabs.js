/** Driver roster tabs shown in the operational daily report UI. */
export const DRIVER_ROSTER_TABS = [
  { id: 'ON_LEAVE', label: 'الإجازات', auto: true },
  { id: 'PERMISSION', label: 'الاستئذانات', auto: true },
  { id: 'ABSENT', label: 'الغيابات', auto: true },
  { id: 'SICK', label: 'المرضى', auto: true },
  { id: 'LICENSE_FOLLOWUP', label: 'متابعة دلة', auto: true },
  { id: 'NOT_DEPLOYED', label: 'غير نازل', auto: true },
];

/** Hidden until staff tagging / manual roster is needed. Backend still supports import. */
export const HIDDEN_ROSTER_CATEGORIES = new Set([
  'MANAGEMENT',
  'OPERATIONS_DEPT',
  'MECHANICS',
  'BOX_MANUFACTURING',
  'EXTERNAL_WORK',
  'CUSTOM',
]);

export const MAIN_TABS = [
  { id: 'summary', label: 'الملخص' },
  { id: 'DEPLOYED', label: 'نزول الميدان', auto: false },
  ...DRIVER_ROSTER_TABS,
  { id: 'financial', label: 'الكشف المالي' },
];
