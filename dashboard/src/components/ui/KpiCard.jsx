import React from 'react';

export default function KpiCard({ icon: Icon, label, value, color = 'orange' }) {
  const colorMap = {
    orange: { bg: 'bg-brand-light', text: 'text-brand-primary', shadow: 'shadow-orange' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', shadow: 'shadow-blue-500/20' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', shadow: 'shadow-emerald-500/20' },
    red: { bg: 'bg-red-50', text: 'text-red-600', shadow: 'shadow-red-500/20' },
  };

  const theme = colorMap[color] || colorMap.orange;

  return (
    <div className="card flex items-center gap-5 relative overflow-hidden group hover:shadow-premium-hover">
      {/* Decorative Background Blob */}
      <div className={`absolute -top-5 -right-5 w-20 h-20 rounded-full ${theme.bg} blur-3xl opacity-60 z-0`} />

      <div 
        className={`w-14 h-14 rounded-2xl ${theme.bg} ${theme.text} flex items-center justify-center ${theme.shadow} z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
      >
        {Icon && <Icon size={26} strokeWidth={2.5} />}
      </div>
      
      <div className="z-10 flex-1">
        <div className="text-3xl font-extrabold text-slate-800 tracking-tight leading-none mb-1">
          {value !== undefined && value !== null ? value : '—'}
        </div>
        <div className="text-sm text-slate-500 font-semibold uppercase tracking-wide">
          {label}
        </div>
      </div>
    </div>
  );
}
