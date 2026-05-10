import { useState, useRef } from 'react';
import { LuUpload, LuX, LuFile } from 'react-icons/lu';
import toast from 'react-hot-toast';

export default function FileUploadField({ 
  label, 
  value, 
  onChange, 
  multiple = false,
  accept = '*/*',
  maxSize = 10 * 1024 * 1024, // 10MB default
  optional = true
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    const fileArray = Array.from(files);

    // Validate file sizes
    for (const file of fileArray) {
      if (file.size > maxSize) {
        toast.error(`الملف "${file.name}" كبير جداً (الحد الأقصى: ${Math.round(maxSize / 1024 / 1024)}MB)`);
        return;
      }
    }

    if (multiple) {
      const currentFiles = value || [];
      onChange([...currentFiles, ...fileArray]);
    } else {
      onChange(fileArray[0]);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemove = (index) => {
    if (multiple && Array.isArray(value)) {
      onChange(value.filter((_, i) => i !== index));
    } else {
      onChange(null);
    }
  };

  const renderFileList = () => {
    if (!value) return null;
    
    const files = multiple && Array.isArray(value) ? value : (value ? [value] : []);
    
    return (
      <div className="space-y-2">
        {files.map((file, idx) => {
          const fileName = file?.name || (typeof file === 'string' ? file.split('/').pop() : 'ملف');
          const isUrl = typeof file === 'string';
          
          return (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <LuFile size={16} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-600 truncate">{fileName}</span>
              </div>
              {!isUrl && (
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <LuX size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-bold text-slate-600 mb-2">
          {label}
          {!optional && <span className="text-red-500"> *</span>}
        </label>
      )}
      
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-primary bg-primary/5'
            : 'border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />
        <div className="flex flex-col items-center gap-2">
          <LuUpload size={24} className="text-slate-400" />
          <p className="text-sm font-bold text-slate-600">
            اسحب الملفات هنا أو اضغط للتحديد
          </p>
          <p className="text-xs text-slate-400">
            {multiple ? 'يمكنك رفع عدة ملفات' : 'ملف واحد فقط'}
            {maxSize && ` (الحد الأقصى: ${Math.round(maxSize / 1024 / 1024)}MB)`}
          </p>
        </div>
      </div>

      {renderFileList()}
    </div>
  );
}
