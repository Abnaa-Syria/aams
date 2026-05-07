import React from 'react';

export default function DataTable({ columns, data, loading, onRowClick, emptyMessage = 'لا توجد بيانات' }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500 bg-white rounded-2xl shadow-premium border border-slate-100">
        <div className="w-10 h-10 border-4 border-brand-light border-t-brand-primary rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-bold text-slate-400">جاري تحميل البيانات...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-2xl shadow-premium border border-slate-100 m-4">
        <p className="text-sm font-bold">{emptyMessage}</p>
      </div>
    );
  }

  return (
    /* التعديل الجوهري: تغليف الجدول بالكامل داخل كارت أبيض ذو حواف ناعمة وظل */
    <div className="bg-white rounded-2xl shadow-premium border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-start border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {columns.map((col) => (
                <th 
                  key={col.key} 
                  /* تخفيف سماكة الخط ليتناسب مع الإسكندرية واستخدام text-start */
                  className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wide text-start"
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr 
                key={row.id || idx} 
                onClick={() => onRowClick?.(row)} 
                className={`
                  group transition-colors duration-200 bg-white
                  /* إضافة لمسة احترافية بتلوين الخلفية بلون البراند الخفيف عند المرور */
                  ${onRowClick ? 'cursor-pointer hover:bg-brand-light/30' : ''}
                `}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                    <span
                      onClick={(e) => {
                        if (col.stopRowClick) e.stopPropagation();
                      }}
                      className={`
                        text-[0.9rem] font-medium text-slate-700 transition-colors duration-200
                        /* تصحيح اسم متغير اللون ليقرأ من إعداداتنا الجديدة */
                        ${onRowClick ? 'group-hover:text-brand-primary' : ''}
                      `}
                      style={col.stopRowClick ? { display: 'inline-flex' } : undefined}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}