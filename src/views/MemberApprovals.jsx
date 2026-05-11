import { useState, useMemo } from 'react';
import { X, Check, Eye, Clock, UserCheck, AlertTriangle } from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import ConfirmModal from '../components/shared/ConfirmModal.jsx';
import { getInitials, formatDate } from '../utils/helpers.js';

// ============ MEMBER APPROVALS VIEW (Coordinator) ============
const MemberApprovalsView = ({ members, user, onApprove, onReject, onMenuToggle }) => {
  const [filter, setFilter] = useState('Pending');
  const [reviewing, setReviewing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmApprove, setConfirmApprove] = useState(null);

  const filtered = useMemo(() => {
    return members.filter(m => m.approvalStatus === filter);
  }, [members, filter]);

  const pendingCount = members.filter(m => m.approvalStatus === 'Pending').length;
  const approvedCount = members.filter(m => m.approvalStatus === 'Approved').length;
  const rejectedCount = members.filter(m => m.approvalStatus === 'Rejected').length;

  const handleApproveClick = (member) => {
    setConfirmApprove(member);
  };

  const handleRejectClick = (member) => {
    setRejectModal(member);
    setRejectReason('');
  };

  const confirmReject = () => {
    if (rejectModal) {
      onReject(rejectModal.id, user.name, rejectReason);
      setRejectModal(null);
      setRejectReason('');
    }
  };

  return (
    <>
      <TopBar title="Member Approvals" subtitle="Review and verify permanent employee registrations" onMenuToggle={onMenuToggle} />

      {/* Summary tabs */}
      <div className="px-4 md:px-8 pt-6 overflow-x-auto">
        <div className="flex gap-2 min-w-min">
          {[
            { key: 'Pending', label: 'Pending', count: pendingCount, color: 'yellow' },
            { key: 'Approved', label: 'Approved', count: approvedCount, color: 'emerald' },
            { key: 'Rejected', label: 'Rejected', count: rejectedCount, color: 'red' },
          ].map(t => {
            const active = filter === t.key;
            const colorMap = {
              yellow: active ? 'bg-yellow-400 text-emerald-900 border-yellow-400' : 'bg-white text-gray-700 border-gray-200 hover:border-yellow-300',
              emerald: active ? 'bg-emerald-800 text-white border-emerald-800' : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300',
              red: active ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-200 hover:border-red-300',
            };
            return (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                className={`px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all flex items-center gap-2 ${colorMap[t.color]}`}
              >
                {t.label}
                <span className={`px-2 py-0.5 rounded-full text-xs ${active ? 'bg-white/30' : 'bg-gray-100'}`}>{t.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner for pending */}
      {filter === 'Pending' && pendingCount > 0 && (
        <div className="mx-8 mt-5 bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-300 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-emerald-900" />
          </div>
          <div className="flex-1">
            <div className="font-display text-lg font-semibold text-emerald-900">
              {pendingCount} registration{pendingCount !== 1 ? 's' : ''} awaiting your verification
            </div>
            <div className="text-sm text-gray-700">
              Verify each applicant's permanent employment status with HR before approving. Approved members will receive login access immediately.
            </div>
          </div>
        </div>
      )}

      <div className="p-4 md:p-8">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-16 text-center">
            <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <UserCheck className="w-7 h-7 text-gray-400" />
            </div>
            <div className="text-gray-500 font-medium">No {filter.toLowerCase()} registrations</div>
            <div className="text-xs text-gray-400 mt-1">
              {filter === 'Pending' ? 'All caught up! New registrations will appear here.' : `No ${filter.toLowerCase()} members yet.`}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filtered.map((m, idx) => (
              <div
                key={m.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden animate-fadeInUp"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Header */}
                <div className={`p-5 relative ${
                  m.approvalStatus === 'Pending' ? 'bg-gradient-to-br from-yellow-50 to-yellow-100' :
                  m.approvalStatus === 'Approved' ? 'bg-gradient-to-br from-emerald-50 to-emerald-100' :
                  'bg-gradient-to-br from-red-50 to-red-100'
                }`}>
                  <div className="flex items-start gap-4">
                    {m.photo ? (
                      <img src={m.photo} alt={m.name} className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-md" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-yellow-300 font-bold border-2 border-white shadow-md">
                        {getInitials(m.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-lg font-semibold text-emerald-900 truncate">{m.name}</div>
                      <div className="text-sm text-gray-700 font-mono">{m.employeeId}</div>
                      <div className="text-xs text-gray-600 mt-0.5 truncate">{m.department}</div>
                      <span className={`mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.approvalStatus === 'Pending' ? 'bg-yellow-400 text-emerald-900' :
                        m.approvalStatus === 'Approved' ? 'bg-emerald-600 text-white' :
                        'bg-red-600 text-white'
                      }`}>{m.approvalStatus.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-5 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium text-gray-900 truncate max-w-[180px]">{m.email}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium text-gray-900">{m.phone || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Age / Gender</span><span className="font-medium text-gray-900">{m.age} • {m.gender}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Employment</span><span className="font-medium text-emerald-800">Permanent</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Dependents</span><span className="font-medium text-gray-900">{(m.dependents || []).length}</span></div>
                  {m.approvedBy && (
                    <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between">
                      <span className="text-gray-500">{m.approvalStatus === 'Approved' ? 'Approved by' : 'Reviewed by'}</span>
                      <span className="font-medium text-gray-900">{m.approvedBy}</span>
                    </div>
                  )}
                  {m.rejectionReason && (
                    <div className="bg-red-50 rounded-lg p-2 text-xs text-red-800">
                      <div className="font-semibold mb-0.5">Rejection reason:</div>
                      <div>{m.rejectionReason}</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => setReviewing(m)}
                    className="flex-1 px-3 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 border border-gray-200"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Details
                  </button>
                  {m.approvalStatus === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleRejectClick(m)}
                        className="px-3 py-2 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                      <button
                        onClick={() => handleApproveClick(m)}
                        className="px-3 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review details modal */}
      {reviewing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="font-display text-xl font-semibold text-emerald-900">Registration Details</h3>
                <p className="text-xs text-gray-500">Verify applicant information before approving</p>
              </div>
              <button onClick={() => setReviewing(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-5">
              {/* Applicant */}
              <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                {reviewing.photo ? (
                  <img src={reviewing.photo} alt="" className="w-20 h-20 rounded-2xl object-cover border-4 border-yellow-400" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center text-yellow-300 font-bold text-2xl border-4 border-yellow-400">
                    {getInitials(reviewing.name)}
                  </div>
                )}
                <div>
                  <div className="font-display text-2xl font-semibold text-emerald-900">{reviewing.name}</div>
                  <div className="text-sm text-gray-600 font-mono">{reviewing.employeeId}</div>
                  <div className="text-sm text-gray-600">{reviewing.department}</div>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><div className="text-xs text-gray-500 uppercase font-semibold mb-1">Email</div><div className="text-gray-900">{reviewing.email}</div></div>
                <div><div className="text-xs text-gray-500 uppercase font-semibold mb-1">Phone</div><div className="text-gray-900">{reviewing.phone || '—'}</div></div>
                <div><div className="text-xs text-gray-500 uppercase font-semibold mb-1">Age</div><div className="text-gray-900">{reviewing.age}</div></div>
                <div><div className="text-xs text-gray-500 uppercase font-semibold mb-1">Gender</div><div className="text-gray-900">{reviewing.gender}</div></div>
                <div><div className="text-xs text-gray-500 uppercase font-semibold mb-1">Employment Status</div><div className="text-emerald-800 font-semibold">Permanent Employee</div></div>
                <div><div className="text-xs text-gray-500 uppercase font-semibold mb-1">Date Hired</div><div className="text-gray-900">{formatDate(reviewing.dateHired)}</div></div>
              </div>

              {/* Dependents */}
              <div>
                <div className="text-xs text-gray-500 uppercase font-semibold mb-2">Dependents ({(reviewing.dependents || []).length})</div>
                {(reviewing.dependents || []).length > 0 ? (
                  <div className="space-y-2">
                    {reviewing.dependents.map(d => (
                      <div key={d.id} className="bg-emerald-50 rounded-lg p-3 flex items-center gap-3">
                        {d.photo ? (
                          <img src={d.photo} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-800 flex items-center justify-center font-bold text-xs">
                            {getInitials(d.name)}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{d.name}</div>
                          <div className="text-xs text-gray-600">{d.relationship} • Age {d.age}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">No dependents declared</div>
                )}
              </div>

              {/* HR verification checklist */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-yellow-900">
                    <div className="font-semibold mb-1">Before approving, verify:</div>
                    <ul className="space-y-0.5 list-disc pl-4">
                      <li>Employee ID matches HR records</li>
                      <li>Applicant is a permanent (non-probationary) employee</li>
                      <li>Email address is valid and university-issued</li>
                      <li>Declared dependents match HR-filed documents</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Action footer */}
            {reviewing.approvalStatus === 'Pending' && (
              <div className="p-6 border-t border-gray-100 flex gap-3 justify-end sticky bottom-0 bg-white">
                <button
                  onClick={() => { handleRejectClick(reviewing); setReviewing(null); }}
                  className="px-5 py-2.5 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-semibold flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Reject Registration
                </button>
                <button
                  onClick={() => { handleApproveClick(reviewing); setReviewing(null); }}
                  className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Approve Registration
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm approve modal */}
      {confirmApprove && (
        <ConfirmModal
          title="Approve Member"
          message={`Approve ${confirmApprove.name}? They will be able to sign in after approval.`}
          confirmLabel="Approve"
          confirmColor="yellow"
          onConfirm={() => onApprove(confirmApprove.id, user.name)}
          onClose={() => setConfirmApprove(null)}
        />
      )}

      {/* Reject confirmation modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 no-print">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-semibold text-red-900">Reject Registration</h3>
                <p className="text-xs text-gray-500">{rejectModal.name}</p>
              </div>
              <button onClick={() => setRejectModal(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Reason for rejection</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g., Not a permanent employee — probationary status"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:outline-none text-sm resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">This reason will be visible to the applicant.</p>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2 justify-end">
              <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl text-sm font-semibold">Cancel</button>
              <button onClick={confirmReject} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold">Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MemberApprovalsView;
