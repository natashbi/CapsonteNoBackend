import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({
  title, message,
  confirmLabel = 'Confirm', confirmColor = 'red',
  onConfirm, onClose,
  withReason = false, reasonPlaceholder = 'Enter reason (optional)...',
}) => {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fadeInUp">
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${confirmColor === 'red' ? 'bg-red-100' : 'bg-yellow-100'}`}>
            <AlertTriangle className={`w-5 h-5 ${confirmColor === 'red' ? 'text-red-600' : 'text-yellow-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600 mt-1">{message}</p>
          </div>
        </div>
        {withReason && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Reason (optional)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder={reasonPlaceholder}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-red-400 focus:outline-none text-sm resize-none"
            />
          </div>
        )}
        <div className="flex gap-2 justify-end flex-col-reverse sm:flex-row">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-xl font-medium touch-target flex-1 sm:flex-none">Cancel</button>
          <button
            onClick={() => { onConfirm(withReason ? reason : undefined); onClose(); }}
            className={`px-4 py-2.5 text-sm text-white rounded-xl font-semibold touch-target flex-1 sm:flex-none ${confirmColor === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-500 hover:bg-yellow-600 text-emerald-900'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
