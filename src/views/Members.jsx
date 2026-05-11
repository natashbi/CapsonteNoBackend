import { useState, useMemo, useRef } from 'react';
import {
  Search, Plus, Edit, Trash2, Eye, Upload, Camera, AlertCircle
} from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import StatusBadge from '../components/shared/StatusBadge.jsx';
import PatientTypeBadge from '../components/shared/PatientTypeBadge.jsx';
import Modal from '../components/shared/Modal.jsx';
import Field from '../components/shared/Field.jsx';
import ConfirmModal from '../components/shared/ConfirmModal.jsx';
import { useToast } from '../components/shared/Toast.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { api } from '../services/api.js';
import { formatPesoShort, formatDate, getInitials } from '../utils/helpers.js';

// ============ MEMBERS VIEW ============
const MembersView = ({ members, setMembers, consultations, setConsultations, soas, setSoas, user, onMenuToggle }) => {
  const toast = useToast();
  const { coverageLimit, memberConsultLimit } = useSettings();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const isDirector = user?.role === 'director';

  const filtered = useMemo(() => {
    // Only show approved members in directory (pending/rejected go to approval view)
    let list = members.filter(m => m.approvalStatus === 'Approved');
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      m.employeeId.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q)
    );
  }, [members, search]);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.updateMember(editing.id, data);
        setMembers(prev => prev.map(m => m.id === editing.id ? updated : m));
      } else {
        const created = await api.createMember(data);
        setMembers(prev => [...prev, created]);
      }
      setShowModal(false);
      setEditing(null);
      toast(editing ? 'Member updated successfully.' : 'Member registered successfully.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save member', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteMember(id);
      setMembers(prev => prev.filter(m => m.id !== id));
      if (setConsultations) setConsultations(prev => prev.filter(c => c.memberId !== id));
      if (setSoas) setSoas(prev => prev.filter(s => s.memberId !== id));
      toast('Member deleted.', 'warning');
    } catch (err) {
      toast(err.message || 'Failed to delete member', 'error');
    }
  };

  if (viewingMember) {
    return <MemberProfile member={viewingMember} consultations={consultations} soas={soas} onBack={() => setViewingMember(null)} onMenuToggle={onMenuToggle} />;
  }

  return (
    <>
      <TopBar title="Members" subtitle={isDirector ? 'Search, view balances, and review consultation history' : 'Manage employees and their dependents'} onMenuToggle={onMenuToggle}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600"
          />
        </div>
        {!isDirector && (
          <button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Add Member
          </button>
        )}
      </TopBar>

      <div className="p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {filtered.map((m, idx) => {
            const memberConsults = consultations.filter(c => c.memberId === m.id && !c.dependentId);
            const spent = soas.filter(s => s.memberId === m.id && s.status === 'Reviewed').reduce((sum, s) => sum + s.total, 0);
            const remaining = coverageLimit - spent;
            const pct = (spent / coverageLimit) * 100;

            return (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden animate-fadeInUp" style={{ animationDelay: `${idx * 50}ms` }}>
                <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 p-4 relative">
                  <div className="absolute top-4 right-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                      m.status === 'Tenured' ? 'bg-yellow-400 text-emerald-900' :
                      m.status === 'Non-Tenured' ? 'bg-emerald-200 text-emerald-900' :
                      'bg-gray-200 text-gray-800'
                    }`}>{m.status.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.photo ? (
                      <img src={m.photo} alt={m.name} className="w-16 h-16 rounded-full object-cover border-2 border-yellow-400" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-emerald-900 font-bold text-xl border-2 border-white/20">
                        {getInitials(m.name)}
                      </div>
                    )}
                    <div className="text-white flex-1 min-w-0">
                      <div className="font-display text-lg font-semibold truncate">{m.name}</div>
                      <div className="text-emerald-200 text-xs font-mono">{m.employeeId}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="text-sm text-gray-600">{m.department}</div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-emerald-50 rounded-lg p-2">
                      <div className="text-emerald-700 font-semibold">{memberConsults.length}/{memberConsultLimit}</div>
                      <div className="text-gray-500">Consultations</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-2">
                      <div className="text-yellow-800 font-semibold">{(m.dependents || []).length}</div>
                      <div className="text-gray-500">Dependents</div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1.5">
                      <span>Coverage used</span>
                      <span className="font-semibold">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-yellow-500' : 'bg-emerald-600'}`} style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{formatPesoShort(remaining)} remaining</div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button onClick={() => setViewingMember(m)} className="flex-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <button onClick={() => { setEditing(m); setShowModal(true); }} className="flex-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1">
                      <Edit className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button onClick={() => setConfirmDelete(m)} className="text-xs font-semibold text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <MemberFormModal
          member={editing}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null); }}
          saving={saving}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Member"
          message={`Are you sure you want to delete ${confirmDelete.name}? This will also remove their consultations, LOAs, and SOAs.`}
          confirmLabel="Delete"
          confirmColor="red"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
};

// ============ MEMBER PROFILE ============
const MemberProfile = ({ member, consultations, soas, onBack, onMenuToggle }) => {
  const { coverageLimit, dependentConsultLimit } = useSettings();
  const memberConsults = consultations.filter(c => c.memberId === member.id);
  const spent = soas.filter(s => s.memberId === member.id && s.status === 'Reviewed').reduce((sum, s) => sum + s.total, 0);

  return (
    <>
      <TopBar title={member.name} subtitle={`Employee ID: ${member.employeeId} — ${member.department}`} onMenuToggle={onMenuToggle}>
        <button onClick={onBack} className="text-xs md:text-sm text-gray-600 hover:bg-gray-50 px-2 md:px-4 py-2 rounded-xl font-medium">← Back</button>
      </TopBar>
      <div className="p-4 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-6">
            <div className="flex flex-col items-center text-center">
              {member.photo ? (
                <img src={member.photo} alt={member.name} className="w-24 md:w-32 h-24 md:h-32 rounded-2xl object-cover border-4 border-yellow-400" />
              ) : (
                <div className="w-24 md:w-32 h-24 md:h-32 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-yellow-300 font-bold text-3xl md:text-4xl border-4 border-yellow-400">
                  {getInitials(member.name)}
                </div>
              )}
              <div className="font-display text-lg md:text-2xl font-semibold text-emerald-900 mt-3 md:mt-4">{member.name}</div>
              <div className="text-xs md:text-sm text-gray-500 font-mono mt-1">{member.employeeId}</div>
              <span className={`mt-2 text-xs font-bold px-2 md:px-3 py-1 rounded-full ${
                member.status === 'Tenured' ? 'bg-yellow-400 text-emerald-900' :
                member.status === 'Non-Tenured' ? 'bg-emerald-200 text-emerald-900' :
                'bg-gray-200 text-gray-800'
              }`}>{member.status}</span>
            </div>
            <div className="mt-4 md:mt-6 space-y-2 md:space-y-3 text-xs md:text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Department</span><span className="font-medium text-gray-900">{member.department}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Age</span><span className="font-medium text-gray-900">{member.age}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Gender</span><span className="font-medium text-gray-900">{member.gender}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium text-gray-900 text-[10px] md:text-xs">{member.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium text-gray-900">{member.phone}</span></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-4 md:p-6 text-white">
            <div className="text-emerald-200 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-2">Coverage Balance</div>
            <div className="font-display text-2xl md:text-3xl font-semibold">{formatPesoShort(coverageLimit - spent)}</div>
            <div className="text-xs md:text-sm text-emerald-200 mt-1">of {formatPesoShort(coverageLimit)} total</div>
            <div className="mt-3 md:mt-4 h-2 bg-emerald-950/50 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 transition-all" style={{ width: `${100 - (spent / coverageLimit) * 100}%` }}></div>
            </div>
            <div className="text-xs text-emerald-200 mt-2">{formatPesoShort(spent)} used this year</div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100">
              <h3 className="font-display text-lg md:text-xl font-semibold text-emerald-900">Dependents ({(member.dependents || []).length})</h3>
            </div>
            {(member.dependents || []).length > 0 ? (
              <div className="divide-y divide-gray-100">
                {member.dependents.map(d => {
                  const dConsults = consultations.filter(c => c.dependentId === d.id).length;
                  return (
                    <div key={d.id} className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
                      {d.photo ? (
                        <img src={d.photo} alt={d.name} className="w-10 md:w-12 h-10 md:h-12 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 md:w-12 h-10 md:h-12 rounded-xl bg-yellow-100 text-yellow-800 flex items-center justify-center font-bold text-sm flex-shrink-0">
                          {getInitials(d.name)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">{d.name}</div>
                        <div className="text-xs text-gray-500">{d.relationship} • Age {d.age}</div>
                      </div>
                      <div className="text-right text-xs md:text-sm flex-shrink-0">
                        <div className="font-semibold text-emerald-800">{dConsults}/{dependentConsultLimit}</div>
                        <div className="text-xs text-gray-500 hidden md:inline">consults</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 md:p-8 text-center text-gray-400 text-xs md:text-sm">No dependents registered</div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100">
              <h3 className="font-display text-lg md:text-xl font-semibold text-emerald-900">Consultation History</h3>
              <p className="text-xs md:text-sm text-gray-500">{memberConsults.length} total consultations</p>
            </div>
            {memberConsults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3">Serial</th>
                      <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3">Date</th>
                      <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3">Type</th>
                      <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3 hidden md:table-cell">Diagnosis</th>
                      <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {memberConsults.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-2 md:px-6 py-2 md:py-3 font-mono text-xs md:text-sm">#{c.serialNo}</td>
                        <td className="px-2 md:px-6 py-2 md:py-3 text-xs md:text-sm">{formatDate(c.date)}</td>
                        <td className="px-2 md:px-6 py-2 md:py-3"><PatientTypeBadge type={c.patientType} /></td>
                        <td className="px-2 md:px-6 py-2 md:py-3 text-xs md:text-sm text-gray-600 max-w-xs truncate hidden md:table-cell">{c.diagnosis || <span className="text-gray-400 italic">Not yet diagnosed</span>}</td>
                        <td className="px-2 md:px-6 py-2 md:py-3"><StatusBadge status={c.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 md:p-8 text-center text-gray-400 text-xs md:text-sm">No consultation records</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ============ MEMBER FORM MODAL ============
const MemberFormModal = ({ member, onSave, onClose, saving }) => {
  const [form, setForm] = useState(member || {
    name: '', employeeId: '', department: '', email: '', phone: '', age: '',
    gender: 'Female', status: 'Tenured', photo: null, dateHired: '', password: '', active: true, dependents: []
  });
  const [formError, setFormError] = useState('');

  const photoInput = useRef(null);

  const handlePhotoUpload = (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => callback(ev.target.result);
    reader.readAsDataURL(file);
  };

  const addDependent = () => {
    setForm({
      ...form,
      dependents: [...(form.dependents || []), { id: 'D' + Date.now(), name: '', relationship: 'Spouse', age: '', photo: null }]
    });
  };

  const updateDependent = (id, field, value) => {
    setForm({
      ...form,
      dependents: form.dependents.map(d => d.id === id ? { ...d, [field]: value } : d)
    });
  };

  const removeDependent = (id) => {
    setForm({ ...form, dependents: form.dependents.filter(d => d.id !== id) });
  };

  const handleSubmit = () => {
    setFormError('');
    if (!form.name.trim() || !form.employeeId.trim() || !form.department.trim()) {
      setFormError('Please fill in all required fields: Name, Employee ID, and Department.');
      return;
    }
    if (!member && !form.password) {
      setFormError('Please set a login password for the new member.');
      return;
    }
    if (!form.photo && !member) {
      setFormError('Please upload a member photo.');
      return;
    }
    const age = parseInt(form.age);
    if (form.age !== '' && (isNaN(age) || age < 18 || age > 100)) {
      setFormError('Member age must be between 18 and 100.');
      return;
    }
    if (form.phone && form.phone.trim()) {
      const phone = form.phone.trim().replace(/[-\s]/g, '');
      if (!/^(09\d{9}|\+639\d{9}|\d{7,11})$/.test(phone)) {
        setFormError('Phone number must be a valid Philippine number (e.g. 0917-555-0101).');
        return;
      }
    }
    for (const dep of (form.dependents || [])) {
      if (!dep.name?.trim()) { setFormError('All dependent entries must have a name.'); return; }
      const dAge = parseInt(dep.age);
      if (dep.age !== '' && dep.age !== undefined && (isNaN(dAge) || dAge < 0 || dAge > 100)) {
        setFormError(`Dependent "${dep.name}" age must be between 0 and 100.`);
        return;
      }
    }
    onSave(form);
  };

  return (
    <Modal title={member ? 'Edit Member' : 'Register New Member'} onClose={onClose} size="xl">
      <div className="space-y-6">
        {/* Photo Upload */}
        <div className="bg-gradient-to-br from-emerald-50 to-yellow-50 rounded-2xl p-6 flex items-center gap-6 border-2 border-dashed border-emerald-200">
          <div className="relative">
            {form.photo ? (
              <img src={form.photo} alt="" className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-white border-4 border-dashed border-emerald-300 flex items-center justify-center">
                <Camera className="w-8 h-8 text-emerald-600" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-emerald-900 mb-1">Member Photo <span className="text-red-600">*</span></div>
            <div className="text-sm text-gray-600 mb-3">Upload a clear ID-style photo. JPG or PNG, max 5MB.</div>
            <input ref={photoInput} type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, (data) => setForm({ ...form, photo: data }))} className="hidden" />
            <button onClick={() => photoInput.current?.click()} className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4" /> {form.photo ? 'Change Photo' : 'Upload Photo'}
            </button>
          </div>
        </div>

        {/* Basic Info */}
        <div>
          <h4 className="font-display text-lg font-semibold text-emerald-900 mb-3">Personal Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full Name" required value={form.name} onChange={v => setForm({...form, name: v})} />
            <Field label="Employee ID" required value={form.employeeId} onChange={v => setForm({...form, employeeId: v})} />
            <Field label="Department / College" required value={form.department} onChange={v => setForm({...form, department: v})} />
            <Field label="Email" type="email" value={form.email} onChange={v => setForm({...form, email: v})} />
            <Field label="Phone" value={form.phone} onChange={v => setForm({...form, phone: v})} />
            <Field label="Age" type="number" value={form.age} onChange={v => setForm({...form, age: v})} />
            <Field label="Gender" select options={['Female', 'Male']} value={form.gender} onChange={v => setForm({...form, gender: v})} />
            <Field label="Employee Status" select options={['Tenured', 'Non-Tenured', 'Contractual']} value={form.status} onChange={v => setForm({...form, status: v})} />
            <Field label="Date Hired" type="date" value={form.dateHired} onChange={v => setForm({...form, dateHired: v})} />
            {!member && <Field label="Login Password" required type="password" value={form.password} onChange={v => setForm({...form, password: v})} placeholder="Set member's login password" />}
          </div>
        </div>

        {/* Dependents */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-display text-lg font-semibold text-emerald-900">Dependents ({(form.dependents || []).length})</h4>
            <button onClick={addDependent} className="text-sm font-semibold text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Dependent
            </button>
          </div>
          {(form.dependents || []).length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center text-sm text-gray-500">No dependents added yet.</div>
          ) : (
            <div className="space-y-3">
              {form.dependents.map(d => (
                <DependentRow key={d.id} dep={d} onUpdate={(f, v) => updateDependent(d.id, f, v)} onRemove={() => removeDependent(d.id)} />
              ))}
            </div>
          )}
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{formError}</span>
          </div>
        )}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-md disabled:opacity-60">
            {saving ? 'Saving...' : (member ? 'Update Member' : 'Register Member')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ============ DEPENDENT ROW ============
const DependentRow = ({ dep, onUpdate, onRemove }) => {
  const inp = useRef(null);
  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onUpdate('photo', ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3 items-start">
      <div className="flex-shrink-0">
        {dep.photo ? (
          <div className="relative">
            <img src={dep.photo} alt="" className="w-20 h-20 rounded-lg object-cover border-2 border-white" />
            <button onClick={() => inp.current?.click()} className="absolute inset-0 rounded-lg bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera className="w-5 h-5 text-white" />
            </button>
          </div>
        ) : (
          <button onClick={() => inp.current?.click()} className="w-20 h-20 rounded-lg bg-white border-2 border-dashed border-yellow-400 flex flex-col items-center justify-center hover:bg-yellow-50 hover:border-yellow-500 cursor-pointer transition-all">
            <Upload className="w-6 h-6 text-emerald-700 mb-1" />
            <span className="text-[10px] font-bold text-emerald-700 text-center leading-tight">Upload<br/>Photo</span>
          </button>
        )}
        <input ref={inp} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
      </div>
      <div className="flex-1 grid grid-cols-3 gap-2">
        <input value={dep.name} onChange={e => onUpdate('name', e.target.value)} placeholder="Full name" className="col-span-2 px-3 py-2 rounded-lg border border-yellow-300 bg-white text-sm focus:outline-none focus:border-emerald-600" />
        <input value={dep.age} onChange={e => onUpdate('age', e.target.value)} type="number" placeholder="Age" className="px-3 py-2 rounded-lg border border-yellow-300 bg-white text-sm focus:outline-none focus:border-emerald-600" />
        <select value={dep.relationship} onChange={e => onUpdate('relationship', e.target.value)} className="col-span-3 px-3 py-2 rounded-lg border border-yellow-300 bg-white text-sm focus:outline-none focus:border-emerald-600">
          <option>Spouse</option><option>Child</option><option>Parent</option><option>Sibling</option>
        </select>
      </div>
      <button onClick={onRemove} className="w-8 h-8 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center flex-shrink-0">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

export default MembersView;
