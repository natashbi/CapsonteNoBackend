import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Printer, Download } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { formatPeso, formatPesoShort, getInitials } from '../utils/helpers.js';

// Returns the last 6 months as ['Jan', 'Feb', ...] based on the current date
const getLastSixMonths = () => {
  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ label: months[d.getMonth()], month: d.getMonth(), year: d.getFullYear() });
  }
  return result;
};

// ============ REPORTS VIEW ============
const ReportsView = ({ consultations, soas, members, loas, onMenuToggle }) => {
  const { coverageLimit } = useSettings();
  const [range, setRange] = useState('monthly');
  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const years = new Set();
    consultations.forEach(c => { if (c.date) years.add(new Date(c.date).getFullYear()); });
    soas.forEach(s => { if (s.dateUploaded) years.add(new Date(s.dateUploaded).getFullYear()); });
    years.add(currentYear);
    return Array.from(years).sort((a, b) => b - a);
  }, [consultations, soas, currentYear]);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const handleExportCSV = () => {
    const rows = [
      [`WeCare Report — ${selectedYear} (${range})`, '', ''],
      ['Period', 'Consultations', 'Expenses (PHP)'],
      ...data.map(d => [d.label, d.consultations, d.expenses]),
      ['', '', ''],
      ['Total Consultations', consultations.length, ''],
      ['Total LOAs', loas.length, ''],
      ['Total Expenses (Reviewed)', '', soas.filter(s => s.status === 'Reviewed').reduce((s, x) => s + x.total, 0)],
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `wecare-report-${selectedYear}-${range}.csv`;
    a.click();
  };

  const data = useMemo(() => {
    if (range === 'weekly') {
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      return days.map((d, i) => ({
        label: d,
        consultations: consultations.filter(c => new Date(c.date).getDay() === i && new Date(c.date).getFullYear() === selectedYear).length,
        expenses: soas.filter(s => new Date(s.dateUploaded).getDay() === i && new Date(s.dateUploaded).getFullYear() === selectedYear).reduce((sum, x) => sum + x.total, 0),
      }));
    }
    if (range === 'monthly') {
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return months.map((m, i) => ({
        label: m,
        consultations: consultations.filter(c => { const d = new Date(c.date); return d.getMonth() === i && d.getFullYear() === selectedYear; }).length,
        expenses: soas.filter(s => { const d = new Date(s.dateUploaded); return d.getMonth() === i && d.getFullYear() === selectedYear; }).reduce((sum, x) => sum + x.total, 0),
      }));
    }
    // quarterly
    return ['Q1','Q2','Q3','Q4'].map((q, i) => ({
      label: q,
      consultations: consultations.filter(c => { const d = new Date(c.date); return Math.floor(d.getMonth()/3) === i && d.getFullYear() === selectedYear; }).length,
      expenses: soas.filter(s => { const d = new Date(s.dateUploaded); return Math.floor(d.getMonth()/3) === i && d.getFullYear() === selectedYear; }).reduce((sum, x) => sum + x.total, 0),
    }));
  }, [range, selectedYear, consultations, soas]);

  // Dynamic last 6 months data
  const last6Months = useMemo(() => {
    return getLastSixMonths().map(({ label, month, year }) => ({
      label,
      consultations: consultations.filter(c => {
        const d = new Date(c.date);
        return d.getMonth() === month && d.getFullYear() === year;
      }).length,
      expenses: soas.filter(s => {
        const d = new Date(s.dateUploaded);
        return d.getMonth() === month && d.getFullYear() === year;
      }).reduce((sum, x) => sum + x.total, 0),
    }));
  }, [consultations, soas]);

  const approvedMembers = useMemo(() => members.filter(m => m.approvalStatus === 'Approved'), [members]);

  const topMembers = useMemo(() => {
    return approvedMembers.map(m => ({
      ...m,
      totalSpent: soas.filter(s => s.memberId === m.id && s.status === 'Reviewed').reduce((sum, s) => sum + s.total, 0),
      consultCount: consultations.filter(c => c.memberId === m.id).length,
    })).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  }, [approvedMembers, soas, consultations]);

  const totalSpent = soas.filter(s => s.status === 'Reviewed').reduce((s, x) => s + x.total, 0);
  const totalBudget = approvedMembers.length * coverageLimit;

  return (
    <>
      <TopBar title="Reports & Analytics" subtitle="Insights into consultation patterns and expenses" onMenuToggle={onMenuToggle}>
        <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-emerald-600 font-semibold">
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
          {['weekly', 'monthly', 'quarterly'].map(r => (
            <button key={r} onClick={() => setRange(r)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              range === r ? 'bg-white text-emerald-800 shadow-sm' : 'text-gray-600'
            }`}>{r}</button>
          ))}
        </div>
        <button onClick={handleExportCSV} className="no-print flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <Download className="w-4 h-4" /> Export CSV
        </button>
        <button onClick={() => window.print()} className="no-print flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          <Printer className="w-4 h-4" /> Print Report
        </button>
      </TopBar>

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 lg:gap-4">
          <div className="bg-white rounded-2xl p-3 md:p-5 border border-gray-200">
            <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-wider">Total Consultations</div>
            <div className="font-display text-2xl md:text-3xl font-semibold text-emerald-900 mt-1">{consultations.length}</div>
            <div className="text-[10px] md:text-xs text-gray-500 mt-1">
              <span className="text-emerald-700 font-semibold">{consultations.filter(c => c.status === 'Completed').length}</span> completed
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3 md:p-5 border border-gray-200">
            <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-wider">Total LOAs</div>
            <div className="font-display text-2xl md:text-3xl font-semibold text-emerald-900 mt-1">{loas.length}</div>
            <div className="text-[10px] md:text-xs text-gray-500 mt-1">Approved: {formatPesoShort(loas.filter(l=>l.status==='Approved'||l.status==='Used').reduce((s,l)=>s+l.approvedAmount,0))}</div>
          </div>
          <div className="bg-white rounded-2xl p-3 md:p-5 border border-gray-200">
            <div className="text-[10px] md:text-xs text-gray-500 uppercase font-bold tracking-wider">Total Expenses</div>
            <div className="font-display text-2xl md:text-3xl font-semibold text-emerald-900 mt-1">{formatPesoShort(totalSpent)}</div>
            <div className="text-[10px] md:text-xs text-gray-500 mt-1">{totalBudget > 0 ? ((totalSpent/totalBudget)*100).toFixed(1) : '0.0'}% of allocation</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 rounded-2xl p-3 md:p-5 text-white">
            <div className="text-[10px] md:text-xs text-emerald-200 uppercase font-bold tracking-wider">Available Budget</div>
            <div className="font-display text-2xl md:text-3xl font-semibold mt-1">{formatPesoShort(totalBudget - totalSpent)}</div>
            <div className="text-[10px] md:text-xs text-emerald-200 mt-1">of {formatPesoShort(totalBudget)} total</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
          <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200">
            <h3 className="font-display text-lg md:text-xl font-semibold text-emerald-900 mb-3 md:mb-4">Consultation Volume</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
                <Bar dataKey="consultations" fill="#166534" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200">
            <h3 className="font-display text-lg md:text-xl font-semibold text-emerald-900 mb-3 md:mb-4">Expense Trends</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="label" stroke="#9ca3af" fontSize={10} />
                <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={v => '₱' + (v/1000).toFixed(0) + 'k'} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} formatter={v => formatPeso(v)} />
                <Line type="monotone" dataKey="expenses" stroke="#eab308" strokeWidth={2} dot={{ r: 3, fill: '#eab308' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Last 6 months trend */}
        <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200">
          <h3 className="font-display text-lg md:text-xl font-semibold text-emerald-900 mb-1">Last 6 Months Activity</h3>
          <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">Rolling 6-month view from today</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={last6Months}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" stroke="#9ca3af" fontSize={10} />
              <YAxis stroke="#9ca3af" fontSize={10} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
              <Bar dataKey="consultations" fill="#166534" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Members */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100">
            <h3 className="font-display text-lg md:text-xl font-semibold text-emerald-900">Top 5 Members by Expenses</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {topMembers.map((m, i) => (
              <div key={m.id} className="p-3 md:p-4 flex items-center gap-2 md:gap-4">
                <div className="w-7 md:w-8 h-7 md:h-8 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs md:text-sm flex items-center justify-center flex-shrink-0">{i+1}</div>
                <div className="w-9 md:w-10 h-9 md:h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center text-emerald-900 font-bold text-xs md:text-sm flex-shrink-0">
                  {getInitials(m.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-xs md:text-base truncate">{m.name}</div>
                  <div className="text-[10px] md:text-xs text-gray-500 truncate">{m.department} • {m.consultCount}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-display text-lg md:text-xl font-semibold text-emerald-900">{formatPesoShort(m.totalSpent)}</div>
                  <div className="text-[10px] md:text-xs text-gray-500">{coverageLimit > 0 ? ((m.totalSpent/coverageLimit)*100).toFixed(1) : '0.0'}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ReportsView;
