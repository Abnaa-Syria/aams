import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/api';
import GenericListPage from '../../components/ui/GenericListPage';
import StatusBadge from '../../components/ui/StatusBadge';
import { LuPlus, LuTicket, LuMessageSquare, LuClock } from 'react-icons/lu';

const STATUS_MAP = {
  OPEN: { label: 'مفتوحة', color: 'blue' },
  IN_PROGRESS: { label: 'قيد المعالجة', color: 'orange' },
  PENDING_CUSTOMER: { label: 'بانتظار المستخدم', color: 'purple' },
  RESOLVED: { label: 'تم الحل', color: 'green' },
  CLOSED: { label: 'مغلقة', color: 'slate' },
};

const PRIORITY_MAP = {
  LOW: { label: 'منخفضة', color: 'slate' },
  MEDIUM: { label: 'متوسطة', color: 'blue' },
  HIGH: { label: 'عالية', color: 'orange' },
  URGENT: { label: 'عاجلة', color: 'red' },
};

const CATEGORY_MAP = {
  TECHNICAL: 'تقنية',
  HR: 'موارد بشرية',
  FINANCIAL: 'مالية',
  FLEET: 'الأسطول',
  OTHER: 'أخرى',
};

export default function TicketsPage() {
  const navigate = useNavigate();

  const columns = [
    { 
      key: 'id', 
      label: 'رقم التذكرة', 
      render: (v) => <span className="font-mono font-bold text-slate-400">#{v}</span> 
    },
    { 
      key: 'title', 
      label: 'الموضوع',
      render: (v, item) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800">{v}</span>
          <span className="text-xs text-slate-400">{CATEGORY_MAP[item.category] || item.category}</span>
        </div>
      )
    },
    { 
      key: 'user', 
      label: 'بواسطة',
      render: (v) => v?.fullNameAr || '—'
    },
    { 
      key: 'priority', 
      label: 'الأولوية',
      render: (v) => {
        const p = PRIORITY_MAP[v] || { label: v, color: 'slate' };
        return (
          <span className={`px-2.5 py-1 rounded-full text-[0.7rem] font-black uppercase tracking-wider bg-${p.color}-50 text-${p.color}-600 border border-${p.color}-100`}>
            {p.label}
          </span>
        );
      }
    },
    { 
      key: 'status', 
      label: 'الحالة',
      render: (v) => <StatusBadge status={v} />
    },
    { 
      key: '_count', 
      label: 'الردود',
      render: (v) => (
        <div className="flex items-center gap-1 text-slate-400 font-bold">
          <LuMessageSquare size={14} />
          {v?.messages || 0}
        </div>
      )
    },
    { 
      key: 'updatedAt', 
      label: 'آخر تحديث',
      render: (v) => v ? new Date(v).toLocaleDateString('ar-SA') : '—'
    },
  ];

  return (
    <div className="page-container">
      <GenericListPage
        title="تذاكر الدعم الفني"
        apiUrl="/tickets"
        columns={columns}
        onRowClick={(item) => navigate(`/tickets/${item.id}`)}
        actions={
          <button className="btn btn-primary flex items-center gap-2">
            <LuPlus size={18} />
            تذكرة جديدة
          </button>
        }
      />
    </div>
  );
}
