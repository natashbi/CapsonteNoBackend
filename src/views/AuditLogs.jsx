import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';

const AdminAuditLogsView = ({ auditLogs, onMenuToggle }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  const filtered = useMemo(() => {
    let list = auditLogs;
    if (filter !== 'All') list = list.filter(l => l.action === filter);
    if (dateFrom) list = list.filter(l => l.timestamp >= dateFrom);
    if (dateTo) list = list.filter(l => l.timestamp <= dateTo + 'T23:59:59');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l => l.user.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
    }
    return list;
  }, [auditLogs, search, filter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetPage = () => setPage(1);

  const actionColor = (a) => {
    const map = {
      'Login': 'bg-blue-100 text-blue-800',
      'Create': 'bg-emerald-100 text-emerald-800',
      'Update': 'bg-yellow-100 text-yellow-900',
      'Delete': 'bg-red-100 text-red-800',
      'Approve': 'bg-purple-100 text-purple-800',
      'Reject': 'bg-orange-100 text-orange-800',
    };
    return map[a] || 'bg-gray-100 text-gray-800';
  };

  return (
    <>
      <TopBar title="Audit Logs" subtitle="Track all system activity and user actions" onMenuToggle={onMenuToggle}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); resetPage(); }} className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-600 flex-1 md:flex-none" title="From date" />
            <span className="text-gray-400 text-sm hidden md:inline">–</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); resetPage(); }} className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-600 flex-1 md:flex-none" title="To date" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); resetPage(); }} className="p-1.5 md:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg flex-shrink-0" title="Clear date filter">
                <X className="w-3.5 md:w-4 h-3.5 md:h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="relative w-full md:w-auto">
          <Search className="w-3.5 md:w-4 h-3.5 md:h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); resetPage(); }} placeholder="Search logs..." className="w-full md:w-56 pl-10 pr-3 py-1.5 md:py-2 border border-gray-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-600" />
        </div>
        <select value={filter} onChange={e => { setFilter(e.target.value); resetPage(); }} className="px-2 md:px-3 py-1.5 md:py-2 border border-gray-200 rounded-xl text-xs md:text-sm bg-white focus:outline-none focus:border-emerald-600 w-full md:w-auto">
          <option>All</option><option>Login</option><option>Create</option><option>Update</option><option>Delete</option><option>Approve</option><option>Reject</option>
        </select>
      </TopBar>

      <div className="p-2 md:p-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="p-2 md:p-4 bg-gray-50 border-b border-gray-200 text-[10px] md:text-xs text-gray-600 flex items-center justify-between">
            <span><span className="font-semibold">{filtered.length}</span> entries</span>
            <span className="hidden sm:inline">Newest first · Page {page} of {totalPages}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3">Timestamp</th>
                  <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3">User</th>
                  <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3">Action</th>
                  <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3 hidden md:table-cell">Description</th>
                  <th className="text-left text-[10px] md:text-xs font-bold text-gray-500 uppercase px-2 md:px-6 py-2 md:py-3 hidden md:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-2 md:px-6 py-2 md:py-3 text-[9px] md:text-xs font-mono text-gray-600 whitespace-nowrap">{new Date(l.timestamp).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-2 md:px-6 py-2 md:py-3 text-xs md:text-sm">
                      <div className="font-medium text-gray-900 truncate">{l.user}</div>
                      <div className="text-[8px] md:text-xs text-gray-500 capitalize">{l.role}</div>
                    </td>
                    <td className="px-2 md:px-6 py-2 md:py-3">
                      <span className={`text-[9px] md:text-[11px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full whitespace-nowrap ${actionColor(l.action)}`}>{l.action}</span>
                    </td>
                    <td className="px-2 md:px-6 py-2 md:py-3 text-xs md:text-sm text-gray-700 hidden md:table-cell">{l.description}</td>
                    <td className="px-2 md:px-6 py-2 md:py-3 text-[8px] md:text-xs font-mono text-gray-500 hidden md:table-cell">{l.ip}</td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr><td colSpan={5} className="p-8 md:p-12 text-center text-gray-400 text-xs md:text-base">No matching log entries.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="p-2 md:p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-center gap-0.5 md:gap-1 overflow-x-auto">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-40 flex-shrink-0">← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-6 md:w-8 h-6 md:h-8 rounded-lg text-xs md:text-sm font-semibold flex-shrink-0 ${p === page ? 'bg-emerald-800 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-semibold text-gray-600 hover:bg-gray-200 disabled:opacity-40 flex-shrink-0">Next →</button>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminAuditLogsView;
