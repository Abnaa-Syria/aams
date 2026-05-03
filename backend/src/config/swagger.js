const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AAMS - Advanced Asset Management System API',
      version: '1.0.0',
      description: [
        'English: REST API for fleet, drivers, shifts, HR requests, compliance, chat, and admin analytics.',
        'العربية: واجهة موحّدة لمسارات التطبيق (سائق / مشرف / لوحة إدارة) مع JWT وصلاحيات دقيقة.',
        '',
        'Suggested flow: Auth (login or OTP) → GET /auth/me → register push token → shifts lifecycle → operational logs (fuel, mid-shift, violations, incidents, daily-reports) → HR modules (leave, salary-advances, maintenance) → documents/licenses → chat/notifications.',
        'All documented paths are relative to the chosen server URL; handlers are identical under /api/v1, /api/v1/admin, and /api/v1/mobile.',
      ].join('\n'),
      contact: {
        name: 'AAMS Team',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'Canonical v1 — use in Swagger "Try it out"',
      },
      {
        url: '/api/v1/admin',
        description: 'Same handlers — dashboard / web admin clients',
      },
      {
        url: '/api/v1/mobile',
        description: 'Same handlers — mobile app (JWT role enforces access)',
      },
    ],
    tags: [
      { name: 'Auth', description: 'تسجيل الدخول، OTP، التوكنات، تسجيل الدفع' },
      { name: 'Dashboard', description: 'مؤشرات لوحة التحكم (صلاحيات إدارية)' },
      { name: 'Users', description: 'السائقين والملفات' },
      { name: 'Supervisors', description: 'المشرفين' },
      { name: 'Vehicles', description: 'المركبات والتعيين' },
      { name: 'Documents', description: 'المستندات' },
      { name: 'Licenses', description: 'الرخص والشهادات' },
      { name: 'Bank Accounts', description: 'الحسابات البنكية' },
      { name: 'Platforms', description: 'منصات التوصيل' },
      { name: 'Platform Accounts', description: 'حسابات المنصات' },
      { name: 'Shifts', description: 'الشفتات' },
      { name: 'Fuel', description: 'سجلات الوقود' },
      { name: 'Violations', description: 'المخالفات' },
      { name: 'Incidents', description: 'الحوادث والطوارئ' },
      { name: 'Daily Reports', description: 'التقارير اليومية' },
      { name: 'Notifications', description: 'الإشعارات والقوالب' },
      { name: 'Chat', description: 'المحادثات' },
      { name: 'Investigations', description: 'التحقيقات' },
      { name: 'Penalties', description: 'الجزاءات' },
      { name: 'Rewards', description: 'المكافآت' },
      { name: 'Ratings', description: 'التقييمات' },
      { name: 'Leave', description: 'الإجازات' },
      { name: 'Salary Advances', description: 'السلف' },
      { name: 'Maintenance', description: 'طلبات الصيانة' },
      { name: 'Mid-shift', description: 'سجلات أثناء الشفت' },
      { name: 'Settings', description: 'الإعدادات والبيانات المرجعية' },
      { name: 'Audit', description: 'سجل العمليات' },
      { name: 'Reports', description: 'تصدير التقارير' },
      { name: 'Admin Users', description: 'المستخدمين الإداريين (سوبر أدمن)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        PaginationMeta: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', example: 5 },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 123 },
            userId: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'تنبيه' },
            body: { type: 'string', example: 'تم تحديث حالتك' },
            category: { type: 'string', example: 'GENERAL' },
            isRead: { type: 'boolean', example: false },
            readAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        NotificationTemplate: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 10 },
            key: { type: 'string', example: 'SHIFT_START_APPROVED' },
            titleAr: { type: 'string', example: 'تمت الموافقة على بدء الشفت' },
            titleEn: { type: 'string', example: 'Shift start approved' },
            bodyAr: { type: 'string', example: 'تمت الموافقة على طلبك' },
            bodyEn: { type: 'string', example: 'Your request was approved' },
            category: { type: 'string', example: 'SHIFT' },
            isActive: { type: 'boolean', example: true },
          },
        },
        RegisterPushTokenRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string', example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' },
            provider: { type: 'string', enum: ['EXPO', 'FCM_LEGACY', 'WEB_PUSH', 'CUSTOM'], example: 'EXPO' },
          },
        },
        RemovePushTokenRequest: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string', example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' },
          },
        },
        BroadcastNotificationRequest: {
          type: 'object',
          required: ['title', 'body'],
          properties: {
            title: { type: 'string', example: 'تنبيه عام' },
            body: { type: 'string', example: 'يرجى تحديث التطبيق' },
            category: { type: 'string', example: 'GENERAL' },
            role: { type: 'string', nullable: true, example: 'DRIVER' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
        ListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'array', items: { type: 'object' } },
            meta: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },
        PaginatedNotificationsResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
            meta: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/modules/**/routes.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
