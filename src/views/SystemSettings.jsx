import { useState } from 'react';
import { Shield, Heart, Lock, CheckCircle2 } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import { api } from '../services/api.js';

const AdminSettingsView = ({ settings, setSettings, onMenuToggle }) => {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const validate = () => {
    if (form.coverageLimit < 1000 || form.coverageLimit > 1000000) return 'Coverage limit must be between ₱1,000 and ₱1,000,000.';
    if (form.memberConsultLimit < 1 || form.memberConsultLimit > 100) return 'Member consultation limit must be between 1 and 100.';
    if (form.dependentConsultLimit < 1 || form.dependentConsultLimit > 50) return 'Dependent consultation limit must be between 1 and 50.';
    if (form.loaValidityDays < 1 || form.loaValidityDays > 365) return 'LOA validity must be between 1 and 365 days.';
    if (form.lowBalanceThreshold < 0 || form.lowBalanceThreshold > 500000) return 'Low balance threshold must be between ₱0 and ₱500,000.';
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateSettings(form);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar title="System Settings" subtitle="Configure program-wide parameters and integrations" onMenuToggle={onMenuToggle} />

      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-3 md:space-y-6">
        {/* Coverage Parameters */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 flex items-center gap-2 md:gap-3">
            <div className="w-9 md:w-10 h-9 md:h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 md:w-5 h-4 md:h-5 text-emerald-800" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base md:text-lg font-semibold text-emerald-900">Coverage Parameters</h3>
              <p className="text-[10px] md:text-xs text-gray-500">These limits apply to all members program-wide</p>
            </div>
          </div>
          <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <label className="block text-[10px] md:text-xs font-semibold text-gray-700 uppercase mb-2">Annual Coverage (₱)</label>
              <input type="number" min="1000" max="1000000" value={form.coverageLimit} onChange={e => setForm({...form, coverageLimit: parseInt(e.target.value) || 0})} className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-sm font-mono" />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-semibold text-gray-700 uppercase mb-2">Member Consultations / Year</label>
              <input type="number" min="1" max="100" value={form.memberConsultLimit} onChange={e => setForm({...form, memberConsultLimit: parseInt(e.target.value) || 0})} className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-sm font-mono" />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-semibold text-gray-700 uppercase mb-2">Dependent Consultations / Year</label>
              <input type="number" min="1" max="50" value={form.dependentConsultLimit} onChange={e => setForm({...form, dependentConsultLimit: parseInt(e.target.value) || 0})} className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-sm font-mono" />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-semibold text-gray-700 uppercase mb-2">LOA Validity (days)</label>
              <input type="number" min="1" max="365" value={form.loaValidityDays} onChange={e => setForm({...form, loaValidityDays: parseInt(e.target.value) || 0})} className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-sm font-mono" />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-semibold text-gray-700 uppercase mb-2">Low-Balance Alert (₱)</label>
              <input type="number" min="0" max="500000" value={form.lowBalanceThreshold} onChange={e => setForm({...form, lowBalanceThreshold: parseInt(e.target.value) || 0})} className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-sm font-mono" />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-semibold text-gray-700 uppercase mb-2">Program Year Start</label>
              <select value={form.programYearStart} onChange={e => setForm({...form, programYearStart: e.target.value})} className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-sm bg-white">
                <option>January</option><option>June</option><option>August</option>
              </select>
            </div>
          </div>
        </div>

        {/* Organization */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 flex items-center gap-2 md:gap-3">
            <div className="w-9 md:w-10 h-9 md:h-10 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
              <Heart className="w-4 md:w-5 h-4 md:h-5 text-yellow-700" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base md:text-lg font-semibold text-emerald-900">Organization</h3>
              <p className="text-[10px] md:text-xs text-gray-500">Appears on printed forms and letters</p>
            </div>
          </div>
          <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] md:text-xs font-semibold text-gray-700 uppercase mb-2">Organization Name</label>
              <input value={form.orgName} onChange={e => setForm({...form, orgName: e.target.value})} className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-semibold text-gray-700 uppercase mb-2">Primary Contact</label>
              <input value={form.primaryContact} onChange={e => setForm({...form, primaryContact: e.target.value})} className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="block text-[10px] md:text-xs font-semibold text-gray-700 uppercase mb-2">Primary Email</label>
              <input value={form.primaryEmail} onChange={e => setForm({...form, primaryEmail: e.target.value})} className="w-full px-3 md:px-4 py-2 md:py-2.5 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-sm" />
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 flex items-center gap-2 md:gap-3">
            <div className="w-9 md:w-10 h-9 md:h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Lock className="w-4 md:w-5 h-4 md:h-5 text-purple-700" />
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-base md:text-lg font-semibold text-emerald-900">Security</h3>
              <p className="text-[10px] md:text-xs text-gray-500">Authentication and access control</p>
            </div>
          </div>
          <div className="p-4 md:p-6 space-y-2 md:space-y-3">
            {[
              { k: 'autoLogout', label: 'Auto-logout after inactivity', desc: 'Sessions expire after 30 minutes idle' },
              { k: 'strongPasswords', label: 'Enforce strong passwords', desc: 'Minimum 12 chars with mixed case, number, symbol' },
              { k: 'auditAllActions', label: 'Log all actions to audit trail', desc: 'Recommended for compliance' },
            ].map(opt => (
              <label key={opt.k} className="flex items-start gap-2 md:gap-3 p-2 md:p-3 hover:bg-gray-50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={!!form[opt.k]} onChange={e => setForm({...form, [opt.k]: e.target.checked})} className="mt-0.5 w-4 h-4 accent-emerald-700 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs md:text-sm font-semibold text-gray-900">{opt.label}</div>
                  <div className="text-[10px] md:text-xs text-gray-500">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Save bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 sticky bottom-4 shadow-lg">
          <div className="text-xs md:text-sm text-gray-600 order-2 md:order-1">
            {error ? (
              <span className="text-red-700 font-semibold">{error}</span>
            ) : saved ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 md:w-4 h-3.5 md:h-4" /> Settings saved.</span>
            ) : (
              'Changes are applied system-wide.'
            )}
          </div>
          <div className="flex gap-2 order-1 md:order-2">
            <button onClick={() => setForm(settings)} className="px-3 md:px-5 py-2 md:py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl text-xs md:text-sm font-semibold">Reset</button>
            <button onClick={handleSave} disabled={saving} className="px-3 md:px-5 py-2 md:py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs md:text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSettingsView;
