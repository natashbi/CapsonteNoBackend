import { useState } from 'react';
import { Bell, AlertTriangle, Menu, Clock, UserCheck } from 'lucide-react';
import { useNotifications } from '../context/NotificationsContext.jsx';

// ============ TOPBAR ============
const TopBar = ({ title, subtitle, children, alerts = [], onMenuToggle }) => {
  const [showAlerts, setShowAlerts] = useState(false);
  const contextAlerts = useNotifications();
  const allAlerts = [...contextAlerts, ...alerts];

  return (
    <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-5 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-3 md:gap-6 flex-wrap md:flex-nowrap">
        <div className="flex items-center gap-2 min-w-0 w-full md:w-auto">
          {/* Hamburger menu — mobile only */}
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 mr-1 flex-shrink-0 touch-target"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          )}
          <div className="min-w-0">
            <h1 className="font-display text-2xl md:text-3xl font-semibold text-emerald-900 tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs md:text-sm text-gray-500 mt-1 hidden sm:block">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 w-full md:w-auto md:justify-end overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          {children}

          {/* Notification bell — only top-right action; profile actions live in the sidebar */}
          <div className="relative">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors touch-target"
            >
              <Bell className="w-4 h-4 text-gray-700" />
              {allAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-emerald-900 text-xs font-bold rounded-full flex items-center justify-center animate-pulse-glow">
                  {allAlerts.length}
                </span>
              )}
            </button>
            {showAlerts && allAlerts.length > 0 && (
              <div className="absolute right-0 mt-2 w-72 md:w-80 max-h-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                <div className="p-3 border-b border-gray-100 bg-yellow-50">
                  <div className="font-semibold text-emerald-900 text-sm">Notifications</div>
                </div>
                <div className="max-h-96 overflow-y-auto scrollbar-thin">
                  {allAlerts.map((a, i) => (
                    <div key={i} className="p-3 border-b border-gray-50 hover:bg-gray-50 flex gap-3">
                      <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                        a.type === 'pending-loa' ? 'bg-blue-100 text-blue-700' :
                        a.type === 'pending-member' ? 'bg-purple-100 text-purple-700' :
                        a.type === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {a.type === 'pending-loa' ? <Clock className="w-4 h-4" /> :
                         a.type === 'pending-member' ? <UserCheck className="w-4 h-4" /> :
                         <AlertTriangle className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{a.title}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{a.message}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
