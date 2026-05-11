import { useState, useMemo, useRef } from 'react';
import {
  Search, UserPlus, ShieldCheck, Briefcase, Sparkles, User,
  Lock, Edit, Trash2, X, AlertCircle
} from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import ConfirmModal from '../components/shared/ConfirmModal.jsx';
import { useToast } from '../components/shared/Toast.jsx';
import { api } from '../services/api.js';
import { getInitials, formatDate } from '../utils/helpers.js';

const validatePassword = (password, strong) => {
  if (!password) return null;
  if (strong) {
    if (password.length < 12) return 'Password must be at least 12 characters';
    if (!/[A-Z]/.test(password)) return 'Must include an uppercase letter';
    if (!/[a-z]/.test(password)) return 'Must include a lowercase letter';
    if (!/[0-9]/.test(password)) return 'Must include a number';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Must include a special character';
  } else {
    if (password.length < 8) return 'Password must be at least 8 characters';
  }
  return null;
};

// ============ ADMIN: USER MANAGEMENT ============
const AdminUserManagementView = ({ systemUsers, setSystemUsers, members, onMenuToggle, settings }) => {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    let list = systemUsers;
    if (filter !== 'All') list = list.filter(u => u.role === filter.toLowerCase());
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.username?.toLowerCase().includes(q));
    }
    return list;
  }, [systemUsers, search, filter]);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.updateUser(editing.id, data);
        setSystemUsers(prev => prev.map(u => u.id === editing.id ? updated : u));
        toast('User updated successfully.', 'success');
      } else {
        const created = await api.createUser({ ...data, createdAt: new Date().toISOString() });
        setSystemUsers(prev => [...prev, created]);
        toast('User created successfully.', 'success');
      }
      setShowModal(false);
      setEditing(null);
    } catch (err) {
      toast(err.message || 'Failed to save user', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id) => {
    const u = systemUsers.find(x => x.id === id);
    if (!u) return;
    try {
      const updated = await api.updateUser(id, { ...u, active: !u.active });
      setSystemUsers(prev => prev.map(x => x.id === id ? updated : x));
      toast(`Account ${updated.active ? 'enabled' : 'disabled'}.`, updated.active ? 'success' : 'warning');
    } catch (err) {
      toast(err.message || 'Failed to update user', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteUser(id);
      setSystemUsers(prev => prev.filter(u => u.id !== id));
      toast('User deleted.', 'warning');
    } catch (err) {
      toast(err.message || 'Failed to delete user', 'error');
    }
  };

  const roleChip = (role) => {
    const map = { admin: 'bg-purple-100 text-purple-800', coordinator: 'bg-emerald-100 text-emerald-800', director: 'bg-yellow-100 text-yellow-900', member: 'bg-blue-100 text-blue-800' };
    return map[role] || 'bg-gray-100 text-gray-800';
  };

  const roleIcon = (role) => {
    if (role === 'admin') return ShieldCheck;
    if (role === 'coordinator') return Briefcase;
    if (role === 'director') return Sparkles;
    return User;
  };

  return (
    <>
      <TopBar title="User Management" subtitle="Manage system users, roles, and access" onMenuToggle={onMenuToggle}>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." className="w-full md:w-56 pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-emerald-600">
          <option>All</option><option>Admin</option><option>Coordinator</option><option>Director</option><option>Member</option>
        </select>
        <button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </TopBar>

      <div className="p-4 md:p-8 pb-0 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
        {['admin','coordinator','director','member'].map(r => {
          const count = systemUsers.filter(u => u.role === r).length;
          const active = systemUsers.filter(u => u.role === r && u.active).length;
          const Icon = roleIcon(r);
          return (
            <div key={r} className="bg-white rounded-2xl border border-gray-200 p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div className={`w-9 md:w-10 h-9 md:h-10 rounded-lg flex items-center justify-center ${roleChip(r)}`}><Icon className="w-4 md:w-5 h-4 md:h-5" /></div>
                <div className="text-[10px] md:text-xs text-gray-500 font-semibold">{active}/{count}</div>
              </div>
              <div className="font-display text-xl md:text-2xl font-semibold text-emerald-900 mt-2 md:mt-3">{count}</div>
              <div className="text-[10px] md:text-xs text-gray-500 capitalize">{r}s</div>
            </div>
          );
        })}
      </div>

      <div className="p-4 md:p-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3">User</th>
                  <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3 hidden md:table-cell">Username</th>
                  <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3">Role</th>
                  <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3 hidden lg:table-cell">Last Login</th>
                  <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3">Status</th>
                  <th className="text-right text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(u => {
                  const Icon = roleIcon(u.role);
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-2 md:px-6 py-3">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="w-8 md:w-9 h-8 md:h-9 rounded-full bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-yellow-300 font-bold text-xs overflow-hidden flex-shrink-0">
                            {u.photo
                              ? <img src={u.photo} alt="" className="w-full h-full object-cover" />
                              : getInitials(u.name)
                            }
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 text-xs md:text-sm truncate">{u.name}</div>
                            <div className="text-[9px] md:text-xs text-gray-500 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 md:px-6 py-3 font-mono text-xs text-gray-700 hidden md:table-cell">{u.username}</td>
                      <td className="px-2 md:px-6 py-3">
                        <span className={`inline-flex items-center gap-0.5 md:gap-1 text-[9px] md:text-[11px] font-bold px-1.5 md:px-2 py-1 rounded-full whitespace-nowrap ${roleChip(u.role)}`}>
                          <Icon className="w-2.5 md:w-3 h-2.5 md:h-3" /> <span className="hidden md:inline">{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span><span className="md:hidden">{u.role.charAt(0).toUpperCase()}</span>
                        </span>
                      </td>
                      <td className="px-2 md:px-6 py-3 text-[10px] md:text-xs text-gray-600 hidden lg:table-cell">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</td>
                      <td className="px-2 md:px-6 py-3">
                        <span className={`text-[9px] md:text-[11px] font-bold px-1.5 md:px-2 py-1 rounded-full whitespace-nowrap ${u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                          {u.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-2 md:px-6 py-3 text-right">
                        <div className="inline-flex gap-0.5 md:gap-1">
                          <button onClick={() => handleToggleActive(u.id)} className="w-7 md:w-8 h-7 md:h-8 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0" title={u.active ? 'Disable account' : 'Enable account'}>
                            <Lock className="w-3.5 md:w-4 h-3.5 md:h-4" />
                          </button>
                          <button onClick={() => { setEditing(u); setShowModal(true); }} className="w-7 md:w-8 h-7 md:h-8 rounded-lg hover:bg-gray-100 text-gray-600 flex items-center justify-center flex-shrink-0" title="Edit">
                            <Edit className="w-3.5 md:w-4 h-3.5 md:h-4" />
                          </button>
                          <button onClick={() => setConfirmDelete(u)} className="w-7 md:w-8 h-7 md:h-8 rounded-lg hover:bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0" title="Delete">
                            <Trash2 className="w-3.5 md:w-4 h-3.5 md:h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-6 md:p-12 text-center text-gray-400 text-xs md:text-base">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && <AdminUserFormModal user={editing} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null); }} saving={saving} strongPasswords={settings?.strongPasswords} />}
      {confirmDelete && (
        <ConfirmModal
          title="Delete User"
          message={`Are you sure you want to delete ${confirmDelete.name}? This cannot be undone.`}
          confirmLabel="Delete"
          confirmColor="red"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
};

const AdminUserFormModal = ({ user, onSave, onClose, saving, strongPasswords }) => {
  const [form, setForm] = useState(user || { name: '', username: '', email: '', role: 'coordinator', active: true, lastLogin: null, photo: null });
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const photoInputRef = useRef(null);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, photo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.username.trim()) e.username = 'Username is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!user && !password) e.password = 'Password is required for new users';
    if (password) {
      const pwErr = validatePassword(password, strongPasswords);
      if (pwErr) e.password = pwErr;
    }
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const payload = { ...form };
    if (password) payload.password = password;
    onSave(payload);
  };

  const f = (field) => ({
    className: `w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${errors[field] ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-emerald-600'}`
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 no-print">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h3 className="font-display text-xl font-semibold text-emerald-900">{user ? 'Edit User' : 'Add New User'}</h3>
            <p className="text-xs text-gray-500">System access account</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Profile Photo */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-yellow-300 font-bold text-xl flex-shrink-0">
              {form.photo
                ? <img src={form.photo} alt="" className="w-full h-full object-cover" />
                : (form.name ? form.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : <User className="w-7 h-7" />)
              }
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">Profile Photo</label>
              <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <button type="button" onClick={() => photoInputRef.current?.click()} className="bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors">
                {form.photo ? 'Change Photo' : 'Upload Photo'}
              </button>
              {form.photo && (
                <button type="button" onClick={() => setForm(f => ({ ...f, photo: null }))} className="ml-2 text-xs text-red-600 hover:underline">Remove</button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Full Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={e => { setForm({...form, name: e.target.value}); setErrors(p => ({...p, name: ''})); }} {...f('name')} />
            {errors.name && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Username <span className="text-red-500">*</span></label>
              <input value={form.username} onChange={e => { setForm({...form, username: e.target.value}); setErrors(p => ({...p, username: ''})); }} {...f('username')} style={{fontFamily:'monospace'}} />
              {errors.username && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.username}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={e => { setForm({...form, email: e.target.value}); setErrors(p => ({...p, email: ''})); }} {...f('email')} />
              {errors.email && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {['admin','coordinator','director','member'].map(r => (
                <button key={r} type="button" onClick={() => setForm({...form, role: r})} className={`p-3 rounded-xl border-2 text-left text-sm font-semibold capitalize ${form.role === r ? 'border-emerald-700 bg-emerald-50 text-emerald-900' : 'border-gray-200 text-gray-700'}`}>{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              {user ? 'New Password' : 'Password'} {!user && <span className="text-red-500">*</span>}
            </label>
            <input type="password" value={password} onChange={e => { setPassword(e.target.value); setErrors(p => ({...p, password: ''})); }}
              placeholder={user ? 'Leave blank to keep current password' : strongPasswords ? 'Min 12 chars, uppercase, number, symbol' : 'Min 8 characters'}
              className={`w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none text-sm ${errors.password ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-emerald-600'}`} />
            {errors.password && <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.password}</p>}
            {strongPasswords && !errors.password && (
              <p className="text-xs text-gray-500 mt-1">Strong passwords required: min 12 chars, uppercase, lowercase, number, symbol.</p>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} className="w-4 h-4 accent-emerald-700" />
            Account active
          </label>
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl text-sm font-semibold">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-semibold disabled:opacity-60">
            {saving ? 'Saving...' : (user ? 'Save Changes' : 'Create User')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagementView;
