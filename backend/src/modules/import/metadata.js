const { ValidationError } = require('../../utils/errors');

const EMPLOYMENT_STATUSES = ['ON_DUTY', 'ON_LEAVE', 'SUSPENDED', 'RUNAWAY', 'FINAL_EXIT'];
const TRANSPORT_TYPES = ['CAR', 'MOTORCYCLE', 'TRUCK'];
const VEHICLE_STATUSES = [
  'ACTIVE',
  'IN_MAINTENANCE',
  'OUT_OF_SERVICE',
  'RESERVED',
  'DECOMMISSIONED',
  'PENDING_VERIFICATION',
  'PENDING_REPLACEMENT',
];

/** Example row identity — skipped automatically during import */
const DRIVER_EXAMPLE_IDENTITY = '1000000099';

const ENUM_LABELS_AR = {
  ON_DUTY: 'على الخدمة',
  ON_LEAVE: 'في إجازة',
  SUSPENDED: 'موقوف',
  RUNAWAY: 'هروب',
  FINAL_EXIT: 'خروج نهائي',
  CAR: 'سيارة',
  MOTORCYCLE: 'دراجة نارية',
  TRUCK: 'شاحنة',
  ACTIVE: 'نشطة',
  IN_MAINTENANCE: 'في الصيانة',
  OUT_OF_SERVICE: 'خارج الخدمة',
  RESERVED: 'محجوزة',
  DECOMMISSIONED: 'مُستبعدة',
  PENDING_VERIFICATION: 'بانتظار التحقق',
  PENDING_REPLACEMENT: 'بانتظار الاستبدال',
};

function enumOptions(values) {
  return values.map((value) => ({
    value,
    labelAr: ENUM_LABELS_AR[value] || value,
  }));
}

const MODULE_META = {
  users: {
    titleAr: 'استيراد السائقين',
    descriptionAr: 'حمّل القالب، املأ البيانات تحت رؤوس الأعمدة، ثم ارفع الملف.',
    backPath: '/drivers',
    templateFilename: 'drivers-import-template.xlsx',
    exampleIdentity: DRIVER_EXAMPLE_IDENTITY,
    rulesAr: [
      'القالب ورقة واحدة «البيانات» — صف 1 رؤوس الأعمدة، ابدأ التعبئة من الصف 2.',
      'الحقول الإجبارية: رقم الهوية والاسم بالعربي.',
      'رقم الهوية مفتاح المطابقة — موجود يُحدَّث، جديد يُنشأ كسائق.',
      'الفرع: اكتب اسم المدينة بالعربي (مثل: الرياض، جدة).',
      'حالة التوظيف ونوع النقل: اختر من القائمة في Excel أو اكتب ON_DUTY / CAR.',
    ],
    fields: [
      {
        key: 'identityNumber',
        label: 'identityNumber',
        labelAr: 'رقم الهوية / الإقامة',
        required: true,
        type: 'string',
        hintAr: '10 أرقام — مفتاح المطابقة للإضافة أو التحديث',
      },
      {
        key: 'fullNameAr',
        label: 'fullNameAr',
        labelAr: 'الاسم بالعربي',
        required: true,
        type: 'string',
        hintAr: 'الاسم الكامل كما يظهر في التقارير',
      },
      {
        key: 'fullNameEn',
        label: 'fullNameEn',
        labelAr: 'الاسم بالإنجليزي',
        required: false,
        type: 'string',
      },
      {
        key: 'mobileNumber',
        label: 'mobileNumber',
        labelAr: 'رقم الجوال',
        required: false,
        type: 'string',
        hintAr: 'مثال: 05xxxxxxxx',
      },
      {
        key: 'email',
        label: 'email',
        labelAr: 'البريد الإلكتروني',
        required: false,
        type: 'string',
      },
      {
        key: 'employeeNumber',
        label: 'employeeNumber',
        labelAr: 'الرقم الوظيفي',
        required: false,
        type: 'string',
        hintAr: 'فريد لكل موظف إن وُجد',
      },
      {
        key: 'cityNameAr',
        label: 'cityNameAr',
        labelAr: 'الفرع / المدينة',
        required: false,
        type: 'string',
        hintAr: 'اسم الفرع بالعربي — راجع ورقة «الفروع»',
      },
      {
        key: 'supervisorIdentityNumber',
        label: 'supervisorIdentityNumber',
        labelAr: 'رقم هوية المشرف',
        required: false,
        type: 'string',
        hintAr: 'هوية المشرف المسؤول عن السائق',
      },
      {
        key: 'sevenHundredNumber',
        label: 'sevenHundredNumber',
        labelAr: 'رقم 700',
        required: false,
        type: 'string',
      },
      {
        key: 'roomNumber',
        label: 'roomNumber',
        labelAr: 'رقم الغرفة / السكن',
        required: false,
        type: 'string',
      },
      {
        key: 'employmentStatus',
        label: 'employmentStatus',
        labelAr: 'حالة التوظيف',
        required: false,
        type: 'enum',
        allowedValues: EMPLOYMENT_STATUSES,
        enumOptions: enumOptions(EMPLOYMENT_STATUSES),
        defaultOnCreate: 'ON_DUTY',
        hintAr: 'اختر من القائمة — ON_DUTY افتراضياً للجديد',
      },
      {
        key: 'transportType',
        label: 'transportType',
        labelAr: 'نوع النقل',
        required: false,
        type: 'enum',
        allowedValues: TRANSPORT_TYPES,
        enumOptions: enumOptions(TRANSPORT_TYPES),
        defaultOnCreate: null,
        hintAr: 'CAR | MOTORCYCLE | TRUCK',
      },
      {
        key: 'password',
        label: 'password',
        labelAr: 'كلمة المرور',
        required: false,
        type: 'string',
        defaultOnCreate: 'driver123',
        hintAr: 'للسجلات الجديدة فقط — يُتجاهل عند التحديث',
      },
    ],
  },
  vehicles: {
    titleAr: 'استيراد المركبات',
    descriptionAr: 'رفع ملف Excel لإضافة مركبات أو تحديث بياناتها برقم اللوحة.',
    backPath: '/vehicles',
    templateFilename: 'vehicles-import-template.xlsx',
    rulesAr: [
      'الحقل الإجباري: رقم اللوحة فقط.',
      'إذا وُجدت اللوحة مسبقاً تُحدَّث بيانات المركبة.',
      'المركبة الجديدة تُنشأ بحالة ACTIVE افتراضياً.',
      'اترك الحقول الاختيارية فارغة لاستخدام القيم الافتراضية عند الإنشاء.',
    ],
    fields: [
      {
        key: 'plateNumber',
        label: 'plateNumber',
        labelAr: 'رقم اللوحة',
        required: true,
        type: 'string',
        hintAr: 'مفتاح المطابقة — فريد لكل مركبة',
      },
      {
        key: 'manufacturer',
        label: 'manufacturer',
        labelAr: 'الشركة المصنعة',
        required: false,
        type: 'string',
        defaultOnCreate: '—',
      },
      {
        key: 'model',
        label: 'model',
        labelAr: 'الموديل',
        required: false,
        type: 'string',
        defaultOnCreate: '—',
      },
      {
        key: 'year',
        label: 'year',
        labelAr: 'سنة الصنع',
        required: false,
        type: 'number',
        defaultOnCreate: 'السنة الحالية',
      },
      {
        key: 'color',
        label: 'color',
        labelAr: 'اللون',
        required: false,
        type: 'string',
      },
      {
        key: 'status',
        label: 'status',
        labelAr: 'حالة المركبة',
        required: false,
        type: 'enum',
        allowedValues: VEHICLE_STATUSES,
        enumOptions: enumOptions(VEHICLE_STATUSES),
        defaultOnCreate: 'ACTIVE',
        hintAr: 'اكتب القيمة الإنجليزية بالضبط',
      },
      {
        key: 'odometerKm',
        label: 'odometerKm',
        labelAr: 'عداد الكيلومترات',
        required: false,
        type: 'number',
        defaultOnCreate: '0',
      },
    ],
  },
};

function validateEnumField(value, field) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (!field.allowedValues.includes(upper)) {
    throw new ValidationError(
      `${field.labelAr}: قيمة غير صالحة «${trimmed}». المسموح: ${field.allowedValues.join(', ')}`,
    );
  }
  return upper;
}

module.exports = {
  MODULE_META,
  EMPLOYMENT_STATUSES,
  TRANSPORT_TYPES,
  VEHICLE_STATUSES,
  DRIVER_EXAMPLE_IDENTITY,
  validateEnumField,
};
