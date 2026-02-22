import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, message, icon }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Blurred overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="relative bg-white w-[90%] max-w-[400px] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="p-2 bg-[#f8fafc] rounded-lg text-[#0f172a]">
                  {icon}
                </div>
              )}
              <h3 className="text-[16px] font-bold text-[#0f172a] m-0">{title}</h3>
            </div>
            <button 
              onClick={onClose}
              className="text-[#94a3b8] hover:text-[#0f172a] transition-colors cursor-pointer bg-transparent border-none p-1 rounded-md hover:bg-[#f1f5f9]"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-[14px] text-[#475569] leading-relaxed m-0">
            {message}
          </p>
        </div>
        <div className="px-6 py-4 bg-[#f8fafc] border-t border-[#e2e8f0] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#0f172a] text-white text-[13px] font-bold tracking-wide uppercase rounded-lg hover:bg-[#1e293b] transition-colors cursor-pointer border-none"
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  );
}
