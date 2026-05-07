import React, { useEffect } from 'react';
import { LuX } from 'react-icons/lu';

export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose} 
      />
      
      {/* Content */}
      <div 
        className="relative bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      >
        <div className="sticky top-0 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-slate-100 flex items-center justify-between z-10">
          <h3 className="text-xl font-black text-slate-800 tracking-tight">{title}</h3>
          <button 
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:rotate-90 transition-all duration-300"
          >
            <LuX size={20} />
          </button>
        </div>
        
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
