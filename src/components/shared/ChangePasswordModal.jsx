import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { api } from '../../services/api.js';

const ChangePasswordModal = ({ onClose }) => {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!form.current || !form.next || !form.confirm) { setError('All fields are required.'); return; }
    if (form.next.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (form.next !== form.confirm) { setError('New passwords do not match.'); return; }
    setSaving(true);
    try {
      await api.changePassword({ currentPassword: form.current, newPassword: form.next });
      setSuccess(true);
      setTimeout(onClose, 1800);
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 md:p-6 backdrop-blur-sm" style={{ zIndex: 99999 }}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold text-emerald-900">Change Password</h3>
            <p className="text-xs text-gray-500 mt-0.5">Minimum 8 characters</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 text-xl leading-none flex-shrink-0 ml-2 touch-target">×</button>
        </div>
        <div className="p-4 md:p-6 space-y-4">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-6 h-6 text-emerald-700" />
              </div>
              <div className="font-semibold text-emerald-900">Password changed successfully.</div>
            </div>
          ) : (
            <>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
              {[
                { label: 'Current Password', key: 'current' },
                { label: 'New Password', key: 'next' },
                { label: 'Confirm New Password', key: 'confirm' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">{label}</label>
                  <input
                    type="password"
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-sm"
                  />
                </div>
              ))}
            </>
          )}
        </div>
        {!success && (
          <div className="p-4 md:p-6 pt-0 flex gap-3 flex-col-reverse sm:flex-row">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 touch-target">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-semibold disabled:opacity-60 touch-target">
              {saving ? 'Saving...' : 'Update Password'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
