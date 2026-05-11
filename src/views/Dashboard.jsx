import { useMemo } from 'react';
import {
  Users, Activity, Wallet, ClipboardList, AlertTriangle,
  Heart, UserCheck
} from 'lucide-react';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/shared/StatusBadge.jsx';
import PatientTypeBadge from '../components/shared/PatientTypeBadge.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { formatPeso, formatPesoShort, formatDate } from '../utils/helpers.js';

// ============ DASHBOARD ============
const Dashboard = ({ members, consultations, loas, soas, user, alerts }) => {
  const { coverageLimit } = useSettings();
  const isMember = user.role === 'member';
  const myMember = isMember ? members.find(m => m.id === user.memberId) : null;

  const stats = useMemo(() => {
    const approvedMembers = members.filter(m => m.approvalStatus === 'Approved');
    const filteredMembers = isMember ? [myMember].filter(Boolean) : approvedMembers;
    const filteredConsultations = isMember ? consultations.filter(c => c.memberId === user.memberId) : consultations.filter(c => approvedMembers.some(m => m.id === c.memberId));
    const filteredSOAs = isMember ? soas.filter(s => s.memberId === user.memberId) : soas.filter(s => approvedMembers.some(m => m.id === s.memberId));

    const totalSpent = filteredSOAs.filter(s => s.status === 'Reviewed').reduce((sum, s) => sum + s.total, 0);
    const totalBudget = filteredMembers.length * coverageLimit;
    const remaining = totalBudget - totalSpent;

    // Compute real member trend vs last quarter
    const now = new Date();
    const thisQStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const lastQStart = new Date(thisQStart.getFullYear(), thisQStart.getMonth() - 3, 1);
    const newThisQ = approvedMembers.filter(m => m.createdAt && new Date(m.createdAt) >= thisQStart).length;
    const newLastQ = approvedMembers.filter(m => {
      if (!m.createdAt) return false;
      const d = new Date(m.createdAt);
      return d >= lastQStart && d < thisQStart;
    }).length;
    const memberTrend = newThisQ > 0 ? `+${newThisQ} this quarter` : newLastQ > 0 ? `${newLastQ} last quarter` : null;

    return {
      totalMembers: filteredMembers.length,
      activeConsultations: filteredConsultations.filter(c => c.status === 'Pending' || c.status === 'Approved').length,
      totalConsultations: filteredConsultations.length,
      totalSpent,
      totalBudget,
      remaining,
      pendingConsults: filteredConsultations.filter(c => c.status === 'Pending').length,
      pendingLOAs: loas.filter(l => l.status === 'Pending' && (!isMember || l.memberId === user.memberId)).length,
      pendingMemberApprovals: members.filter(m => m.approvalStatus === 'Pending').length,
      memberTrend,
    };
  }, [members, consultations, loas, soas, user, isMember, myMember, coverageLimit]);

  // Monthly chart data — rolling last 6 months so Oct/Nov/Dec data is never missed
  const monthlyData = useMemo(() => {
    const now = new Date();
    const labels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth();
      const year = d.getFullYear();
      result.push({
        month: labels[month],
        consultations: consultations.filter(c => { const cd = new Date(c.date); return cd.getMonth() === month && cd.getFullYear() === year; }).length,
        expenses: soas.filter(s => { const sd = new Date(s.dateUploaded); return sd.getMonth() === month && sd.getFullYear() === year; }).reduce((sum, x) => sum + x.total, 0),
      });
    }
    return result;
  }, [consultations, soas]);

  const expenseBreakdown = useMemo(() => {
    const filtered = isMember ? soas.filter(s => s.memberId === user.memberId) : soas;
    return [
      { name: 'Laboratory', value: filtered.reduce((s, x) => s + x.laboratory, 0), color: '#166534' },
      { name: 'X-ray', value: filtered.reduce((s, x) => s + x.xray, 0), color: '#15803d' },
      { name: 'Medicines', value: filtered.reduce((s, x) => s + x.medicines, 0), color: '#eab308' },
      { name: 'Professional Fee', value: filtered.reduce((s, x) => s + (x.professionalFee || 0), 0), color: '#f97316' },
      { name: 'Others', value: filtered.reduce((s, x) => s + x.others, 0), color: '#ca8a04' },
    ].filter(x => x.value > 0);
  }, [soas, isMember, user]);

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900 rounded-2xl p-4 md:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-400 rounded-full blur-3xl opacity-20 -translate-y-1/3 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400 rounded-full blur-3xl opacity-20 translate-y-1/3"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <div className="text-yellow-300 text-[10px] md:text-xs font-bold tracking-widest uppercase mb-1 md:mb-2">
              {new Date().toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <h2 className="font-display text-2xl md:text-4xl font-semibold mb-1 md:mb-2 leading-tight">
              {user.role === 'member' ? `Good day, ${user.name}.` :
               user.role === 'admin' ? 'System Overview.' :
               user.role === 'director' ? `Good day, Director ${user.name.split(' ').slice(-1)[0]}.` :
               'Good day, Coordinator.'}
            </h2>
            <p className="text-emerald-100 text-xs md:text-base max-w-xl">
              {user.role === 'member'
                ? `Your WeCare coverage remains a vital part of your well-being. You have ${formatPesoShort(coverageLimit - stats.totalSpent)} available this year.`
                : user.role === 'admin'
                ? `System is operating normally. ${stats.totalMembers} active members, ${stats.activeConsultations} active consultations across all services.`
                : user.role === 'director'
                ? `${stats.pendingLOAs} LOAs are awaiting your approval. Program utilization stands at ${stats.totalBudget > 0 ? ((stats.totalSpent / stats.totalBudget) * 100).toFixed(1) : '0.0'}%.`
                : `You have ${stats.pendingConsults} pending consultations and ${stats.pendingLOAs} pending LOAs awaiting action.`}
            </p>
          </div>
          <div className="hidden lg:flex items-center justify-center w-32 h-32 bg-white/10 backdrop-blur rounded-2xl border border-white/20">
            <Heart className="w-16 h-16 text-yellow-300" fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-yellow-900 text-sm mb-1">{alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'} requiring attention</div>
            <div className="space-y-1">
              {alerts.slice(0, 3).map((a, i) => (
                <div key={i} className="text-sm text-yellow-800">• {a.title}: {a.message}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        <StatCard
          icon={Users}
          label={isMember ? 'My Profile' : 'Total Members'}
          value={stats.totalMembers}
          trend={stats.memberTrend}
          color="emerald"
        />
        <StatCard
          icon={Activity}
          label="Active Consultations"
          value={stats.activeConsultations}
          sub={`${stats.totalConsultations} total`}
          color="emerald"
        />
        {/* Remaining Budget — hidden for coordinator (per policy: coordinators only approve/review) */}
        {user.role !== 'coordinator' && (
          <StatCard
            icon={Wallet}
            label={isMember ? 'My Balance' : 'Remaining Budget'}
            value={formatPesoShort(stats.remaining)}
            sub={`of ${formatPesoShort(stats.totalBudget)}`}
            color="yellow"
            percent={(stats.remaining / stats.totalBudget) * 100}
          />
        )}
        {user.role === 'coordinator' ? (
          <StatCard
            icon={UserCheck}
            label="Pending Approvals"
            value={stats.pendingMemberApprovals || 0}
            sub="member registrations"
            color="yellow"
          />
        ) : null}
        <StatCard
          icon={ClipboardList}
          label="Pending Actions"
          value={stats.pendingConsults + stats.pendingLOAs}
          sub={`${stats.pendingConsults} consults, ${stats.pendingLOAs} LOAs`}
          color="red"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display text-xl font-semibold text-emerald-900">Usage Trends</h3>
              <p className="text-sm text-gray-500">Consultations and expenses over time</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full bg-emerald-700"></div>
                <span className="text-gray-600">Consultations</span>
              </div>
              <div className="flex items-center gap-2 text-xs ml-3">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span className="text-gray-600">Expenses</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#166534" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#166534" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gradYellow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
              <Area type="monotone" dataKey="consultations" stroke="#166534" strokeWidth={2.5} fill="url(#gradEmerald)" />
              <Area type="monotone" dataKey="expenses" stroke="#eab308" strokeWidth={2.5} fill="url(#gradYellow)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="font-display text-xl font-semibold text-emerald-900 mb-1">Expense Breakdown</h3>
          <p className="text-sm text-gray-500 mb-4">By category</p>
          {expenseBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={expenseBreakdown}
                    cx="50%" cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expenseBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatPeso(v)} contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {expenseBreakdown.map((e, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: e.color }}></div>
                      <span className="text-gray-700">{e.name}</span>
                    </div>
                    <span className="font-semibold text-gray-900">{formatPesoShort(e.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No expense data yet</div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg md:text-xl font-semibold text-emerald-900">Recent Consultations</h3>
            <p className="text-xs md:text-sm text-gray-500">Latest activity from members</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Serial', 'Member', 'Type', 'Date', 'Status'].map(h => (
                  <th key={h} className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wider px-2 md:px-6 py-2 md:py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(isMember ? consultations.filter(c => c.memberId === user.memberId) : consultations)
                .slice(-5).reverse().map(c => {
                  const m = members.find(x => x.id === c.memberId);
                  const d = m?.dependents?.find(x => x.id === c.dependentId);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 md:px-6 py-2 md:py-4 font-mono text-xs md:text-sm text-gray-900">#{c.serialNo}</td>
                      <td className="px-2 md:px-6 py-2 md:py-4">
                        <div className="text-xs md:text-sm font-medium text-gray-900">{d ? d.name : m?.name}</div>
                        {d && <div className="text-[9px] text-gray-500">Dep. of {m?.name}</div>}
                      </td>
                      <td className="px-2 md:px-6 py-2 md:py-4"><PatientTypeBadge type={c.patientType} /></td>
                      <td className="px-2 md:px-6 py-2 md:py-4 text-xs md:text-sm text-gray-600 whitespace-nowrap">{formatDate(c.date)}</td>
                      <td className="px-2 md:px-6 py-2 md:py-4"><StatusBadge status={c.status} /></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
