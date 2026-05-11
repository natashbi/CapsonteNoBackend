import { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Users, BarChart3, User,
  Stethoscope, FileSignature, Receipt, UserCog,
  History, Settings, ShieldCheck, Briefcase, Sparkles,
  UserCheck, Heart, X, KeyRound, LogOut, ChevronUp, Camera
} from 'lucide-react';
import { getInitials } from '../utils/helpers.js';
import { api } from '../services/api.js';
import { useAppUser } from '../context/UserContext.jsx';

// ============ SIDEBAR ============
const Sidebar = ({ currentView, setCurrentView, user, onLogout, counts, isOpen, onClose, onShowChangePassword }) => {
  const [logoError, setLogoError] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const photoInputRef = useRef(null);
  const { setUser } = useAppUser();

  // Close dropdown when clicking outside.
  // Uses a data-attribute (not a ref) because sidebarContent is rendered twice
  // (desktop + mobile) and a shared ref would point to only one of the two.
  useEffect(() => {
    if (!showUserMenu) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-user-menu]')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Photo must be smaller than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      try {
        await api.updatePhoto(dataUrl);
        const updatedUser = { ...user, photo: dataUrl };
        if (setUser) setUser(updatedUser);
        localStorage.setItem('wecare_user', JSON.stringify(updatedUser));
      } catch (err) {
        alert(err.message || 'Failed to update photo.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Role-specific menu items
  const roleMenus = {
    admin: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { id: 'user-management', icon: UserCog, label: 'User Management', badge: counts.users },
      { id: 'audit-logs', icon: History, label: 'Audit Logs' },
      { id: 'settings', icon: Settings, label: 'System Settings' },
      { id: 'reports', icon: BarChart3, label: 'Reports' },
    ],
    coordinator: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { id: 'member-approvals', icon: UserCheck, label: 'Member Approvals', badge: counts.pendingMembers },
      { id: 'members', icon: Users, label: 'Members Directory', badge: counts.members },
      { id: 'consultations', icon: Stethoscope, label: 'Consultation Requests', badge: counts.consultations },
      { id: 'loa', icon: FileSignature, label: 'LOA Requests', badge: counts.loas },
      { id: 'soa', icon: Receipt, label: 'SOA Review', badge: counts.pendingSOAs },
      { id: 'reports', icon: BarChart3, label: 'Reports' },
    ],
    director: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { id: 'members', icon: Users, label: 'Members', badge: counts.members },
      { id: 'loa', icon: FileSignature, label: 'LOA Approvals', badge: counts.loas },
      { id: 'reports', icon: BarChart3, label: 'Reports & Analytics' },
    ],
    member: [
      { id: 'dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
      { id: 'consultations', icon: Stethoscope, label: 'My Consultations' },
      { id: 'loa', icon: FileSignature, label: 'My LOAs' },
      { id: 'soa', icon: Receipt, label: 'History' },
    ],
  };

  const roleLabels = {
    admin: { title: 'IT Administrator', section: 'System Control' },
    coordinator: { title: 'Coordinator', section: 'Operations' },
    director: { title: 'Director', section: 'Executive Oversight' },
    member: { title: 'Member', section: 'Member Portal' },
  };

  const roleBadgeColor = {
    admin: 'bg-purple-100 text-purple-800',
    coordinator: 'bg-emerald-100 text-emerald-800',
    director: 'bg-yellow-100 text-yellow-900',
    member: 'bg-blue-100 text-blue-800',
  };

  const visible = roleMenus[user.role] || [];
  const label = roleLabels[user.role] || { title: user.role, section: 'Main Menu' };

  const sidebarContent = (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!logoError ? (
              <img
                src="/logos/WCLogo.png"
                alt="WeCare Logo"
                className="w-11 h-11 object-contain flex-shrink-0"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Heart className="w-9 h-9 text-emerald-700 flex-shrink-0" fill="currentColor" />
            )}
            <div>
              <div className="font-display text-xl font-bold text-emerald-900 leading-none">WeCare</div>
            </div>
          </div>
          {/* Close button for mobile overlay */}
          <button
            onClick={onClose}
            className="md:hidden w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className={`inline-flex items-center gap-1.5 mt-4 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleBadgeColor[user.role]}`}>
          {user.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
          {user.role === 'coordinator' && <Briefcase className="w-3 h-3" />}
          {user.role === 'director' && <Sparkles className="w-3 h-3" />}
          {user.role === 'member' && <User className="w-3 h-3" />}
          {label.title}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        <div className="px-3 mb-2">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label.section}</div>
        </div>
        {visible.map((item, i) => {
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 transition-all group relative animate-slideIn ${
                active
                  ? 'bg-emerald-800 text-white shadow-md shadow-emerald-800/20'
                  : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-900'
              }`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <item.icon className={`w-5 h-5 ${active ? 'text-yellow-300' : ''}`} />
              <span className="text-sm font-medium flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  active ? 'bg-yellow-400 text-emerald-900' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {item.badge}
                </span>
              )}
              {active && <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-yellow-400 rounded-r-full"></div>}
            </button>
          );
        })}
      </nav>

      {/* User — clickable, opens menu with profile actions */}
      <div data-user-menu className="p-4 border-t border-gray-100 relative">
        {showUserMenu && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-10">
            <button
              onClick={() => { setShowUserMenu(false); photoInputRef.current?.click(); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left"
            >
              <Camera className="w-4 h-4 text-gray-500" /> Update Profile Picture
            </button>
            <button
              onClick={() => { setShowUserMenu(false); onShowChangePassword(); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 text-left border-t border-gray-100"
            >
              <KeyRound className="w-4 h-4 text-gray-500" /> Change Password
            </button>
            <button
              onClick={() => { setShowUserMenu(false); onLogout(); }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 text-left border-t border-gray-100"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="hidden"
        />

        <button
          onClick={() => setShowUserMenu(v => !v)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-emerald-900 font-bold text-sm shadow-md flex-shrink-0">
            {user.photo
              ? <img src={user.photo} alt="" className="w-full h-full object-cover" />
              : getInitials(user.name)
            }
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-semibold text-gray-900 truncate">{user.name}</div>
            <div className="text-xs text-gray-500 capitalize">{user.role}</div>
          </div>
          <ChevronUp className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? '' : 'rotate-180'}`} />
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Desktop: always visible and sticky */}
      <div className="hidden md:block fixed left-0 top-0 h-screen z-40">
        {sidebarContent}
      </div>

      {/* Mobile: slide-in overlay */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 md:hidden ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebarContent}
      </div>
    </>
  );
};

export default Sidebar;
