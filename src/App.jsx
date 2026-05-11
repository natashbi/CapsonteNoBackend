import { useState, useMemo, useEffect, useCallback } from 'react';
import { initialSettings } from './data/seedData.js';
import { formatPesoShort } from './utils/helpers.js';
import { api } from './services/api.js';
import { SettingsContext } from './context/SettingsContext.jsx';
import { NotificationsContext } from './context/NotificationsContext.jsx';
import { UserContext } from './context/UserContext.jsx';
import { ToastProvider, useToast } from './components/shared/Toast.jsx';
import FontLoader from './components/FontLoader.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import ChangePasswordModal from './components/shared/ChangePasswordModal.jsx';
import LoginScreen from './views/LoginScreen.jsx';
import Dashboard from './views/Dashboard.jsx';
import MembersView from './views/Members.jsx';
import MemberApprovalsView from './views/MemberApprovals.jsx';
import ConsultationsView from './views/Consultations.jsx';
import LOAView from './views/LOA.jsx';
import SOAView from './views/SOA.jsx';
import ReportsView from './views/Reports.jsx';
import AdminUserManagementView from './views/UserManagement.jsx';
import AdminAuditLogsView from './views/AuditLogs.jsx';
import AdminSettingsView from './views/SystemSettings.jsx';

function AppInner() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [members, setMembers] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loas, setLoas] = useState([]);
  const [soas, setSoas] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const refetch = useCallback(async () => {
    setApiError(null);
    setLoading(true);
    try {
      const savedUser = JSON.parse(localStorage.getItem('wecare_user') || 'null');
      const isAdmin = savedUser?.role === 'admin';

      const [membersData, consultationsData, loasData, soasData, settingsData, notificationsData] = await Promise.all([
        api.getMembers(),
        api.getConsultations(),
        api.getLoas(),
        api.getSoas(),
        api.getSettings(),
        api.getNotifications().catch(() => []),
      ]);
      setMembers(membersData);
      setConsultations(consultationsData);
      setLoas(loasData);
      setSoas(soasData);
      setSettings(settingsData);
      setNotifications(notificationsData);

      if (savedUser?.role === 'member') {
        const currentMember = membersData.find(m => m.id === savedUser.memberId);
        if (!currentMember || currentMember.approvalStatus !== 'Approved') {
          localStorage.removeItem('wecare_token');
          localStorage.removeItem('wecare_user');
          setUser(null);
          toast('Your account is awaiting approval. Please sign in again after approval.', 'warning');
          return;
        }
      }

      if (isAdmin) {
        const [usersData, auditData] = await Promise.all([api.getUsers(), api.getAudit()]);
        setSystemUsers(usersData);
        setAuditLogs(auditData);
      }
    } catch (err) {
      setApiError(err.message || 'Failed to connect to the server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('wecare_token');
    const savedUser = localStorage.getItem('wecare_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        refetch();
      } catch {
        localStorage.removeItem('wecare_token');
        localStorage.removeItem('wecare_user');
      }
    }
  }, [refetch]);

  // Poll backend notifications every 30s while signed in
  useEffect(() => {
    if (!user) return;
    const tick = () => api.getNotifications().then(setNotifications).catch(() => {});
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [user]);

  // Auto-expire Approved LOAs whose validity window has passed
  useEffect(() => {
    if (!loas.length) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expired = loas.filter(l => {
      if (l.status !== 'Approved') return false;
      const expiry = new Date(l.dateIssued);
      expiry.setDate(expiry.getDate() + (parseInt(l.validity) || 7));
      expiry.setHours(0, 0, 0, 0);
      return today > expiry;
    });
    if (!expired.length) return;
    expired.forEach(l => api.updateLoa(l.id, { status: 'Expired' }).catch(() => {}));
    setLoas(prev => prev.map(l => expired.find(e => e.id === l.id) ? { ...l, status: 'Expired' } : l));
  }, [loas]); // safe: second run finds 0 expired (already 'Expired') and returns early

  // Auto-logout on inactivity (30 minutes) when setting is enabled
  useEffect(() => {
    if (!user || !settings?.autoLogout) return;
    const TIMEOUT = 30 * 60 * 1000;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        toast('You have been logged out due to inactivity.', 'warning');
        handleLogout();
      }, TIMEOUT);
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [user, settings?.autoLogout]);

  const handleLogin = async (result) => {
    localStorage.setItem('wecare_token', result.token);
    localStorage.setItem('wecare_user', JSON.stringify(result.user));
    setUser(result.user);
    setCurrentView('dashboard');
    await refetch();
  };

  const handleLogout = () => {
    localStorage.removeItem('wecare_token');
    localStorage.removeItem('wecare_user');
    setUser(null);
  };

  const handleRegister = async (regData) => {
    await api.register(regData);
  };

  const handleApproveMember = async (memberId) => {
    try {
      await api.approveMember(memberId);
      const membersData = await api.getMembers();
      setMembers(membersData);
      if (user?.role === 'admin') {
        const [usersData, auditData] = await Promise.all([api.getUsers(), api.getAudit()]);
        setSystemUsers(usersData);
        setAuditLogs(auditData);
      }
      toast('Member approved successfully.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to approve member', 'error');
    }
  };

  const handleRejectMember = async (memberId, _approverName, reason) => {
    try {
      await api.rejectMember(memberId, reason);
      const membersData = await api.getMembers();
      setMembers(membersData);
      if (user?.role === 'admin') {
        const auditData = await api.getAudit();
        setAuditLogs(auditData);
      }
      toast('Member registration rejected.', 'warning');
    } catch (err) {
      toast(err.message || 'Failed to reject member', 'error');
    }
  };

  const alerts = useMemo(() => {
    const arr = [];
    const approvedMembers = members.filter(m => m.approvalStatus === 'Approved');

    if (user?.role !== 'member') {
      const pendingLoas = loas.filter(l => l.status === 'Pending').length;
      if (pendingLoas > 0) arr.push({ type: 'pending-loa', title: `${pendingLoas} Pending LOA${pendingLoas > 1 ? 's' : ''}`, message: 'Awaiting Director approval' });
      const pendingMembers = members.filter(m => m.approvalStatus === 'Pending').length;
      if (pendingMembers > 0) arr.push({ type: 'pending-member', title: `${pendingMembers} Pending Registration${pendingMembers > 1 ? 's' : ''}`, message: 'Members awaiting Coordinator approval' });
    }

    const coverageLimit = settings.coverageLimit || 150000;
    const memberConsultLimit = settings.memberConsultLimit || 24;
    approvedMembers.forEach(m => {
      const spent = soas.filter(s => s.memberId === m.id && s.status === 'Reviewed').reduce((sum, s) => sum + s.total, 0);
      const remaining = coverageLimit - spent;
      if (remaining < settings.lowBalanceThreshold && remaining > 0) {
        arr.push({ type: 'warning', title: 'Low balance', message: `${m.name} has ${formatPesoShort(remaining)} remaining` });
      } else if (remaining <= 0) {
        arr.push({ type: 'danger', title: 'Limit exceeded', message: `${m.name} has exhausted their coverage` });
      }
    });
    const year = new Date().getFullYear();
    approvedMembers.forEach(m => {
      const count = consultations.filter(c => c.memberId === m.id && !c.dependentId && new Date(c.date).getFullYear() === year).length;
      if (count >= memberConsultLimit - 2 && count < memberConsultLimit) {
        arr.push({ type: 'warning', title: 'Nearing consultation limit', message: `${m.name} used ${count}/${memberConsultLimit}` });
      }
    });

    // Backend-stored notifications (e.g., member uploaded a consultation document).
    // Show only unread ones, newest first, capped at 10.
    const backend = notifications
      .filter(n => !n.read)
      .slice(0, 10)
      .map(n => ({ type: n.type || 'info', title: n.title, message: n.message }));
    return [...backend, ...arr];
  }, [user, members, loas, consultations, soas, settings, notifications]);

  const approvedMembers = members.filter(m => m.approvalStatus === 'Approved');
  const counts = {
    members: approvedMembers.length,
    pendingMembers: members.filter(m => m.approvalStatus === 'Pending').length,
    consultations: consultations.filter(c => c.status === 'Pending').length,
    loas: loas.filter(l => l.status === 'Pending').length,
    soas: soas.length,
    pendingSOAs: soas.filter(s => s.status === 'Pending').length,
    users: systemUsers.length,
  };

  if (!user) {
    return (
      <>
        <FontLoader />
        <LoginScreen onLogin={handleLogin} onRegister={handleRegister} settings={settings} />
      </>
    );
  }

  if (loading) {
    return (
      <>
        <FontLoader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-emerald-900 font-semibold text-lg">Loading WeCare...</div>
            <div className="text-gray-500 text-sm mt-1">Fetching latest data</div>
          </div>
        </div>
      </>
    );
  }

  if (apiError) {
    return (
      <>
        <FontLoader />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-semibold text-red-900 mb-2">Connection Error</h2>
            <p className="text-gray-600 text-sm mb-2">Unable to connect to the WeCare server.</p>
            <p className="text-gray-500 text-xs mb-6 font-mono bg-gray-50 rounded-lg p-2">{apiError}</p>
            <button onClick={refetch} className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-3 rounded-xl font-semibold transition-all">
              Retry Connection
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <UserContext.Provider value={{ user, onLogout: handleLogout, setUser }}>
    <NotificationsContext.Provider value={alerts}>
    <SettingsContext.Provider value={settings}>
      <FontLoader />
      <div className="flex min-h-screen bg-gray-50">
        <div className="no-print hidden md:block">
          <Sidebar
            currentView={currentView}
            setCurrentView={(view) => { setCurrentView(view); setSidebarOpen(false); }}
            user={user}
            onLogout={handleLogout}
            counts={counts}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onShowChangePassword={() => setShowChangePassword(true)}
          />
        </div>
        {sidebarOpen && <div className="fixed inset-0 bg-black/50 md:hidden z-40" onClick={() => setSidebarOpen(false)} />}
        {sidebarOpen && (
          <div className="md:hidden">
            <Sidebar
              currentView={currentView}
              setCurrentView={(view) => { setCurrentView(view); setSidebarOpen(false); }}
              user={user}
              onLogout={handleLogout}
              counts={counts}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onShowChangePassword={() => setShowChangePassword(true)}
            />
          </div>
        )}
        <main className="flex-1 min-w-0 md:ml-72 w-full h-screen overflow-y-auto overflow-x-hidden">
          {currentView === 'dashboard' && (
            <>
              <TopBar title="Dashboard" subtitle="Overview of the WeCare program" alerts={alerts} onMenuToggle={() => setSidebarOpen(prev => !prev)} />
              <Dashboard members={members} consultations={consultations} loas={loas} soas={soas} user={user} alerts={alerts} />
            </>
          )}
          {currentView === 'members' && (
            <MembersView members={members} setMembers={setMembers} consultations={consultations} setConsultations={setConsultations} soas={soas} setSoas={setSoas} user={user} onMenuToggle={() => setSidebarOpen(prev => !prev)} />
          )}
          {currentView === 'member-approvals' && (
            <MemberApprovalsView members={members} user={user} onApprove={handleApproveMember} onReject={handleRejectMember} onMenuToggle={() => setSidebarOpen(prev => !prev)} />
          )}
          {currentView === 'consultations' && (
            <ConsultationsView consultations={consultations} setConsultations={setConsultations} members={members} user={user} onMenuToggle={() => setSidebarOpen(prev => !prev)} />
          )}
          {currentView === 'loa' && (
            <LOAView loas={loas} setLoas={setLoas} consultations={consultations} members={members} soas={soas} user={user} onMenuToggle={() => setSidebarOpen(prev => !prev)} />
          )}
          {currentView === 'soa' && (
            <SOAView soas={soas} setSoas={setSoas} loas={loas} members={members} user={user} onMenuToggle={() => setSidebarOpen(prev => !prev)} />
          )}
          {currentView === 'reports' && (
            <ReportsView consultations={consultations} soas={soas} members={members} loas={loas} onMenuToggle={() => setSidebarOpen(prev => !prev)} />
          )}
          {currentView === 'user-management' && (
            <AdminUserManagementView systemUsers={systemUsers} setSystemUsers={setSystemUsers} members={members} onMenuToggle={() => setSidebarOpen(prev => !prev)} settings={settings} />
          )}
          {currentView === 'audit-logs' && (
            <AdminAuditLogsView auditLogs={auditLogs} onMenuToggle={() => setSidebarOpen(prev => !prev)} />
          )}
          {currentView === 'settings' && (
            <AdminSettingsView settings={settings} setSettings={setSettings} onMenuToggle={() => setSidebarOpen(prev => !prev)} />
          )}
        </main>
      </div>
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </SettingsContext.Provider>
    </NotificationsContext.Provider>
    </UserContext.Provider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  );
}
