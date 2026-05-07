import React from 'react';

const statusMap = {
  ACTIVE: { label: 'نشط', variant: 'success' },
  TEMPORARILY_SUSPENDED: { label: 'موقف مؤقتاً', variant: 'danger' },
  RESTRICTED: { label: 'مقيّد', variant: 'warning' },
  UNDER_INVESTIGATION: { label: 'تحت التحقيق', variant: 'warning' },
  PENDING_APPROVAL: { label: 'بانتظار الموافقة', variant: 'info' },
  INCOMPLETE_PROFILE: { label: 'ملف غير مكتمل', variant: 'neutral' },
  ARCHIVED: { label: 'مؤرشف', variant: 'neutral' },
  REQUESTED: { label: 'مطلوب', variant: 'info' },
  APPROVED: { label: 'مقبول', variant: 'success' },
  REJECTED: { label: 'مرفوض', variant: 'danger' },
  ENDED: { label: 'منتهي', variant: 'neutral' },
  CANCELLED: { label: 'ملغي', variant: 'neutral' },
  PENDING: { label: 'معلق', variant: 'info' },
  SUBMITTED: { label: 'مقدم', variant: 'info' },
  UNDER_REVIEW: { label: 'قيد المراجعة', variant: 'warning' },
  NEEDS_REVISION: { label: 'يحتاج تعديل', variant: 'warning' },
  VALID: { label: 'صالح', variant: 'success' },
  NEAR_EXPIRY: { label: 'قارب الانتهاء', variant: 'warning' },
  EXPIRED: { label: 'منتهي', variant: 'danger' },
  VERIFIED: { label: 'موثق', variant: 'success' },
  OPEN: { label: 'مفتوح', variant: 'info' },
  IN_PROGRESS: { label: 'قيد التنفيذ', variant: 'warning' },
  ESCALATED: { label: 'مصعّد', variant: 'danger' },
  RESOLVED: { label: 'تم الحل', variant: 'success' },
  CLOSED: { label: 'مغلق', variant: 'neutral' },
  REPORTED: { label: 'مبلغ عنه', variant: 'info' },
  CONFIRMED: { label: 'مؤكد', variant: 'danger' },
  DISMISSED: { label: 'مرفوض', variant: 'neutral' },
  PENALIZED: { label: 'معاقب', variant: 'danger' },
  FLAGGED: { label: 'مشبوه', variant: 'warning' },
  APPLIED: { label: 'مطبق', variant: 'success' },
  APPEALED: { label: 'معترض', variant: 'warning' },
  COMPLETED: { label: 'مكتمل', variant: 'success' },
  PENDING_RESPONSE: { label: 'بانتظار الرد', variant: 'info' },
  PENDING_VERIFICATION: { label: 'بانتظار التحقق', variant: 'info' },
  INACTIVE: { label: 'غير نشط', variant: 'neutral' },
  SUSPENDED: { label: 'موقف', variant: 'danger' },
  IN_MAINTENANCE: { label: 'في الصيانة', variant: 'warning' },
  OUT_OF_SERVICE: { label: 'خارج الخدمة', variant: 'danger' },
  DECOMMISSIONED: { label: 'خارج العمل', variant: 'neutral' },
  LOW: { label: 'منخفض', variant: 'success' },
  MEDIUM: { label: 'متوسط', variant: 'warning' },
  HIGH: { label: 'عالي', variant: 'danger' },
  CRITICAL: { label: 'حرج', variant: 'danger' },
  URGENT: { label: 'عاجل', variant: 'danger' },
};

export default function StatusBadge({ status }) {
  const config = statusMap[status] || { label: status, variant: 'neutral' };

  const variants = {
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    danger: 'bg-red-50 text-red-700 ring-red-600/10',
    warning: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    info: 'bg-blue-50 text-blue-700 ring-blue-600/10',
    neutral: 'bg-slate-50 text-slate-600 ring-slate-600/10',
  };

  return (
    <span 
      className={`
        inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset
        ${variants[config.variant]}
      `}
    >
      {config.label}
    </span>
  );
}
