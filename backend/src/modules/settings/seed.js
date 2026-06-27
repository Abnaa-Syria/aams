const prisma = require('../../config/database');

const settingsData = [
  // =====================
  // General Settings
  // =====================
  { key: 'system.name', value: 'AAMS', labelAr: 'اسم النظام', descriptionAr: 'الاسم المعروض في واجهة المستخدم', type: 'text', category: 'general', sortOrder: 1 },
  { key: 'system.logo', value: '/logo.png', labelAr: 'شعار النظام', descriptionAr: 'رابط شعار النظام', type: 'text', category: 'general', sortOrder: 2 },
  { key: 'system.timezone', value: 'Asia/Riyadh', labelAr: 'المنطقة الزمنية', descriptionAr: 'المنطقة الزمنية المستخدمة في النظام', type: 'select', options: JSON.stringify([{value: 'Asia/Riyadh', label: 'الرياض'}, {value: 'Asia/Dubai', label: 'دبي'}, {value: 'UTC', label: 'UTC'}]), category: 'general', sortOrder: 3 },
  { key: 'system.language', value: 'ar', labelAr: 'اللغة الافتراضية', descriptionAr: 'اللغة الافتراضية للنظام', type: 'select', options: JSON.stringify([{value: 'ar', label: 'العربية'}, {value: 'en', label: 'الإنجليزية'}]), category: 'general', sortOrder: 4 },
  { key: 'system.currency', value: 'SAR', labelAr: 'العملة', descriptionAr: 'العملة الافتراضية للنظام', type: 'select', options: JSON.stringify([{value: 'SAR', label: 'ريال سعودي'}, {value: 'AED', label: 'درهم إماراتي'}, {value: 'USD', label: 'دولار أمريكي'}]), category: 'general', sortOrder: 5 },
  { key: 'system.dateFormat', value: 'YYYY-MM-DD', labelAr: 'تنسيق التاريخ', descriptionAr: 'تنسيق عرض التواريخ', type: 'select', options: JSON.stringify([{value: 'YYYY-MM-DD', label: 'YYYY-MM-DD'}, {value: 'DD-MM-YYYY', label: 'DD-MM-YYYY'}, {value: 'MM-DD-YYYY', label: 'MM-DD-YYYY'}]), category: 'general', sortOrder: 6 },

  // =====================
  // Session Settings
  // =====================
  { key: 'session.timeout', value: '30', labelAr: 'مهلة الجلسة (دقائق)', descriptionAr: 'مدة انتهاء الجلسة تلقائياً بسبب عدم النشاط', type: 'number', category: 'session', sortOrder: 1 },
  { key: 'session.maxAge', value: '480', labelAr: 'الحد الأقصى للجلسة (دقائق)', descriptionAr: 'أقصى مدة للجلسة قبل انتهاء الصلاحية', type: 'number', category: 'session', sortOrder: 2 },
  { key: 'session.rememberMe', value: 'true', labelAr: 'تفعيل تذكرني', descriptionAr: 'السماح للمستخدمين بالبقاء مُسجلين', type: 'boolean', category: 'session', sortOrder: 3 },

  // =====================
  // Password Settings
  // =====================
  { key: 'password.minLength', value: '8', labelAr: 'الحد الأدنى للطول', descriptionAr: 'أقل عدد أحرف مسموح لكلمة المرور', type: 'number', category: 'password', sortOrder: 1 },
  { key: 'password.requireNumber', value: 'true', labelAr: 'يتطلب رقم', descriptionAr: 'إجخال رقم في كلمة المرور', type: 'boolean', category: 'password', sortOrder: 2 },
  { key: 'password.requireSpecial', value: 'true', labelAr: 'يتطلب رمز خاص', descriptionAr: 'إجخال رمز خاص في كلمة المرور (!@#$%)', type: 'boolean', category: 'password', sortOrder: 3 },
  { key: 'password.requireUppercase', value: 'true', labelAr: 'يتطلب حرف كبير', descriptionAr: 'إجخال حرف كبير في كلمة المرور', type: 'boolean', category: 'password', sortOrder: 4 },
  { key: 'password.expiryDays', value: '90', labelAr: 'مدة كلمة المرور (أيام)', descriptionAr: 'عدد الأيام قبل طلب تغيير كلمة المرور', type: 'number', category: 'password', sortOrder: 5 },
  { key: 'password.maxHistory', value: '5', labelAr: 'حد سجل كلمات المرور', descriptionAr: 'عدد كلمات المرور السابقة التي لا يمكن إعادة استخدامها', type: 'number', category: 'password', sortOrder: 6 },

  // =====================
  // OTP Settings
  // =====================
  { key: 'otp.expiry', value: '300', labelAr: 'مهلة رمز التحقق (ثواني)', descriptionAr: 'مدة صلاحية رمز التحقق', type: 'number', category: 'otp', sortOrder: 1 },
  { key: 'otp.length', value: '6', labelAr: 'طول رمز التحقق', descriptionAr: 'عدد أرقام رمز التحقق', type: 'number', category: 'otp', sortOrder: 2 },
  { key: 'otp.resendDelay', value: '60', labelAr: 'مهلة إعادة الإرسال (ثواني)', descriptionAr: 'الوقت الأدنى بين طلبات الرمز', type: 'number', category: 'otp', sortOrder: 3 },
  { key: 'otp.maxAttempts', value: '3', labelAr: 'أقصى محاولات', descriptionAr: 'أقصى محاولات إدخال خاطئة قبل القفل', type: 'number', category: 'otp', sortOrder: 4 },

  // =====================
  // Rate Limiting
  // =====================
  { key: 'rateLimit.login', value: '5', labelAr: 'حد محاولات تسجيل الدخول', descriptionAr: 'أقصى محاولات تسجيل فاشلة قبل القفل', type: 'number', category: 'rate_limit', sortOrder: 1 },
  { key: 'rateLimit.otp', value: '10', labelAr: 'حد طلبات OTP', descriptionAr: 'أقصى طلبات OTP في الدقيقة', type: 'number', category: 'rate_limit', sortOrder: 2 },
  { key: 'rateLimit.api', value: '100', labelAr: 'حد طلبات API', descriptionAr: 'أقصى طلبات API في الدقيقة', type: 'number', category: 'rate_limit', sortOrder: 3 },

  // =====================
  // Notifications
  // =====================
  { key: 'notification.email.enabled', value: 'true', labelAr: 'تفعيل البريد الإلكتروني', descriptionAr: 'إرسال الإشعارات عبر البريد الإلكتروني', type: 'boolean', category: 'notifications', sortOrder: 1 },
  { key: 'notification.sms.enabled', value: 'true', labelAr: 'تفعيل الرسائل النصية', descriptionAr: 'إرسال الإشعارات عبر الرسائل النصية', type: 'boolean', category: 'notifications', sortOrder: 2 },
  { key: 'notification.push.enabled', value: 'true', labelAr: 'تفعيل الإشعارات الفورية', descriptionAr: 'إرسال الإشعارات push للتطبيقات', type: 'boolean', category: 'notifications', sortOrder: 3 },
  { key: 'notification.telegram.enabled', value: 'false', labelAr: 'تفعيل Telegram', descriptionAr: 'إرسال الإشعارات عبر Telegram', type: 'boolean', category: 'notifications', sortOrder: 4 },
  { key: 'notification.emailFrom', value: 'noreply@aams.com', labelAr: 'بريد المرسل', descriptionAr: 'البريد الإلكتروني المُرسل منه', type: 'text', category: 'notifications', sortOrder: 5 },

  // =====================
  // Maintenance
  // =====================
  { key: 'maintenance.mode', value: 'false', labelAr: 'وضع الصيانة', descriptionAr: 'تفعيل وضع الصيانة (يوقف الوصول للمستخدمين)', type: 'boolean', category: 'maintenance', sortOrder: 1, isEditable: true },
  { key: 'maintenance.message', value: 'النظام قيد الصيانة مؤقتاً', labelAr: 'رسالة الصيانة', descriptionAr: 'الرسالة المعروضة للمستخدمين أثناء الصيانة', type: 'text', category: 'maintenance', sortOrder: 2 },
  { key: 'maintenance.allowedIps', value: '', labelAr: 'العناوين المسموحة', descriptionAr: 'عناوين IP المسموح لها الوصول أثناء الصيانة (مفصولة بفواصل)', type: 'text', category: 'maintenance', sortOrder: 3 },

  // =====================
  // Backup
  // =====================
  { key: 'backup.enabled', value: 'true', labelAr: 'تفعيل النسخ الاحتياطي التلقائي', descriptionAr: 'تفعيل النسخ الاحتياطي اليومي', type: 'boolean', category: 'backup', sortOrder: 1 },
  { key: 'backup.frequency', value: 'daily', labelAr: 'تكرار النسخ الاحتياطي', descriptionAr: 'تكرار إنشاء النسخ الاحتياطية', type: 'select', options: JSON.stringify([{value: 'hourly', label: 'كل ساعة'}, {value: 'daily', label: 'يومي'}, {value: 'weekly', label: 'أسبوعي'}]), category: 'backup', sortOrder: 2 },
  { key: 'backup.time', value: '02:00', labelAr: 'وقت النسخ الاحتياطي', descriptionAr: 'وقت إنشاء النسخ الاحتياطية (24 ساعة)', type: 'text', category: 'backup', sortOrder: 3 },
  { key: 'backup.retention', value: '30', labelAr: 'الاحتفاظ بالنسخ (أيام)', descriptionAr: 'عدد الأيام للاحتفاظ بالنسخ الاحتياطية', type: 'number', category: 'backup', sortOrder: 4 },

  // =====================
  // Logs
  // =====================
  { key: 'log.level', value: 'info', labelAr: 'مستوى السجلات', descriptionAr: 'مستوى تفصيل السجلات', type: 'select', options: JSON.stringify([{value: 'debug', label: 'تصحيح'}, {value: 'info', label: 'معلومات'}, {value: 'warn', label: 'تحذير'}, {value: 'error', label: 'خطأ'}]), category: 'logs', sortOrder: 1 },
  { key: 'log.retentionDays', value: '90', labelAr: 'مدة الاحتفاظ بالسجلات (أيام)', descriptionAr: 'عدد أيام الاحتفاظ بسجلات النظام', type: 'number', category: 'logs', sortOrder: 2 },
  { key: 'log.requestBody', value: 'false', labelAr: 'تسجيل جسم الطلب', descriptionAr: 'تسجيل جسم الطلبات في السجلات', type: 'boolean', category: 'logs', sortOrder: 3 },
  { key: 'log.sqlQueries', value: 'false', labelAr: 'تسجيل استعلامات SQL', descriptionAr: 'تسجيل استعلامات قاعدة البيانات', type: 'boolean', category: 'logs', sortOrder: 4 },

  // =====================
  // Analytics
  // =====================
  { key: 'analytics.enabled', value: 'true', labelAr: 'تفعيل التحليلات', descriptionAr: 'تفعيل تتبع التحليلات', type: 'boolean', category: 'analytics', sortOrder: 1 },
  { key: 'analytics.provider', value: 'internal', labelAr: 'مزود التحليلات', descriptionAr: 'مزود التحليلات', type: 'select', options: JSON.stringify([{value: 'internal', label: 'داخلي'}, {value: 'google', label: 'Google Analytics'}, {value: 'mixpanel', label: 'Mixpanel'}]), category: 'analytics', sortOrder: 2 },

  // =====================
  // Features
  // =====================
  { key: 'feature.driverApp', value: 'true', labelAr: 'تطبيق السائق', descriptionAr: 'تفعيل تطبيق السائق', type: 'boolean', category: 'features', sortOrder: 1 },
  { key: 'feature.supervisorApp', value: 'true', labelAr: 'تطبيق المشرف', descriptionAr: 'تفعيل تطبيق المشرف', type: 'boolean', category: 'features', sortOrder: 2 },
  { key: 'feature.vehicleTracking', value: 'true', labelAr: 'تتبع المركبات', descriptionAr: 'تفعيل تتبع المركبات', type: 'boolean', category: 'features', sortOrder: 3 },
  { key: 'feature.fuelTracking', value: 'true', labelAr: 'تتبع الوقود', descriptionAr: 'تفعيل تتبع الوقود', type: 'boolean', category: 'features', sortOrder: 4 },
  { key: 'feature.documents', value: 'true', labelAr: 'إدارة الوثائق', descriptionAr: 'تفعيل إدارة الوثائق', type: 'boolean', category: 'features', sortOrder: 5 },
  { key: 'feature.chat', value: 'true', labelAr: 'الدردشة', descriptionAr: 'تفعيل نظام الدردشة', type: 'boolean', category: 'features', sortOrder: 6 },
  { key: 'feature.reports', value: 'true', labelAr: 'التقارير', descriptionAr: 'تفعيل التقارير', type: 'boolean', category: 'features', sortOrder: 7 },
  { key: 'feature.incidents', value: 'true', labelAr: 'الحوادث', descriptionAr: 'تفعيل إدارة الحوادث', type: 'boolean', category: 'features', sortOrder: 8 },
  { key: 'feature.violations', value: 'true', labelAr: 'المخالفات', descriptionAr: 'تفعيل إدارة المخالفات', type: 'boolean', category: 'features', sortOrder: 9 },
  { key: 'feature.leaves', value: 'true', labelAr: 'الإجازات', descriptionAr: 'تفعيل إدارة الإجازات', type: 'boolean', category: 'features', sortOrder: 10 },
  { key: 'feature.salaryAdvances', value: 'true', labelAr: 'السلف', descriptionAr: 'تفعيل إدارة السلف', type: 'boolean', category: 'features', sortOrder: 11 },
  { key: 'feature.rewards', value: 'true', labelAr: 'المكافآت', descriptionAr: 'تفعيل نظام المكافآت', type: 'boolean', category: 'features', sortOrder: 12 },
  { key: 'feature.maintenance', value: 'true', labelAr: 'الصيانة', descriptionAr: 'تفعيل إدارة صيانة المركبات', type: 'boolean', category: 'features', sortOrder: 13 },

  // =====================
  // Fuel efficiency (#15) — الأدمن يحدد المعيار من الإعدادات
  // =====================
  {
    key: 'FUEL_LITERS_PER_100KM',
    value: '10',
    labelAr: 'المعيار المعتمد: لتر لكل 100 كم',
    descriptionAr: 'كل 100 كم يفترض أن تستهلك المركبة هذا القدر من اللترات. يُستخدم لمقارنة الاستهلاك الفعلي واكتشاف الحالات المشبوهة.',
    type: 'number',
    category: 'fuel',
    sortOrder: 1,
  },
  {
    key: 'FUEL_VARIANCE_THRESHOLD_PERCENT',
    value: '25',
    labelAr: 'حد التجاوز المشبوه (%)',
    descriptionAr: 'إذا تجاوز الاستهلاك الفعلي المتوقع بهذه النسبة يُعلَّم السجل كمشبوه تلقائياً',
    type: 'number',
    category: 'fuel',
    sortOrder: 2,
  },

  // =====================
  // Company Info
  // =====================
  { key: 'company.name', value: 'AAMS Logistics', labelAr: 'اسم الشركة', descriptionAr: 'اسم الشركة المُعرَّفة في النظام', type: 'text', category: 'company', sortOrder: 1 },
  { key: 'company.phone', value: '', labelAr: 'رقم الهاتف', descriptionAr: 'رقم هاتف الشركة', type: 'text', category: 'company', sortOrder: 2 },
  { key: 'company.email', value: '', labelAr: 'البريد الإلكتروني', descriptionAr: 'بريد الشركة الإلكتروني', type: 'text', category: 'company', sortOrder: 3 },
  { key: 'company.address', value: '', labelAr: 'العنوان', descriptionAr: 'عنوان الشركة', type: 'text', category: 'company', sortOrder: 4 },
  { key: 'company.website', value: '', labelAr: 'الموقع', descriptionAr: 'رابط موقع الشركة', type: 'text', category: 'company', sortOrder: 5 },

  // =====================
  // API Settings
  // =====================
  { key: 'api.version', value: 'v1', labelAr: 'إصدار API', descriptionAr: 'الإصدار الحالي لـ API', type: 'text', category: 'api', sortOrder: 1, isEditable: false },
  { key: 'api.timeout', value: '30', labelAr: 'مهلة API (ثواني)', descriptionAr: 'مهلة انتهاء طلبات API', type: 'number', category: 'api', sortOrder: 2 },
  { key: 'api.rateLimit', value: '1000', labelAr: 'حد المعدل', descriptionAr: 'أقصى طلبات API في الساعة', type: 'number', category: 'api', sortOrder: 3 },
];

async function seedSettings() {
  console.log('🌱 Seeding system settings...');
  
  for (const setting of settingsData) {
    try {
      await prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: { ...setting, isVisible: true, isEditable: setting.isEditable !== false },
        create: { ...setting, isVisible: true, isEditable: setting.isEditable !== false },
      });
      console.log(`  ✓ ${setting.key}`);
    } catch (err) {
      console.error(`  ✗ ${setting.key}:`, err.message);
    }
  }
  
  console.log('✅ Settings seeded successfully!');
}

module.exports = seedSettings;

// Run if called directly
if (require.main === module) {
  seedSettings()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}