import React from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

export default function Pagination({ meta, onPageChange }) {
  if (!meta || meta.totalPages <= 1) return null;

  const { page, totalPages } = meta;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/30">
      <div className="text-xs font-bold text-slate-400">
        صفحة {page} من {totalPages}
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 hover:text-primary transition-all shadow-sm"
        >
          <LuChevronRight size={18} />
        </button>

        <div className="flex items-center gap-1">
          {[...Array(totalPages)].map((_, i) => {
            const p = i + 1;
            // Only show current page and neighbors if many pages
            if (totalPages > 5 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
               if (Math.abs(p - page) === 3) return <span key={p} className="text-slate-300 mx-1">...</span>;
               return null;
            }
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`
                  w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all
                  ${page === p 
                    ? 'bg-primary text-white shadow-orange' 
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-primary-light hover:text-primary'
                  }
                `}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 hover:text-primary transition-all shadow-sm"
        >
          <LuChevronLeft size={18} />
        </button>
      </div>
    </div>
  );
}
