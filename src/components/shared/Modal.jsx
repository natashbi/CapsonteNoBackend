import { X } from 'lucide-react';

// ============ MODAL ============
const Modal = ({ title, children, onClose, size = 'md' }) => {
  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 bg-emerald-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeInUp no-print">
      <div className={`bg-white rounded-2xl md:rounded-3xl shadow-2xl w-full ${sizes[size]} max-h-[90vh] overflow-hidden flex flex-col`}>
        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-yellow-50">
          <h2 className="font-display text-xl md:text-2xl font-semibold text-emerald-900 truncate">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-white/60 flex items-center justify-center flex-shrink-0 ml-2 touch-target">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
