import { useState, useMemo } from 'react';
import {
  Search, Edit, Printer, X, Check, CheckCircle2, Clock,
  AlertCircle, FileSignature, Heart, Activity
} from 'lucide-react';
import { useToast } from '../components/shared/Toast.jsx';
import TopBar from '../components/TopBar.jsx';
import StatusBadge from '../components/shared/StatusBadge.jsx';
import Modal from '../components/shared/Modal.jsx';
import Field from '../components/shared/Field.jsx';
import ConfirmModal from '../components/shared/ConfirmModal.jsx';
import ProcedureTagInput, { tagsToString, stringToTags } from '../components/ProcedureTagInput.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { api } from '../services/api.js';
import { formatDate, formatPeso, formatPesoShort, generateSerialNo } from '../utils/helpers.js';

// ============ LOA VIEW ============
const LOAView = ({ loas, setLoas, consultations, members, soas, user, onMenuToggle }) => {
  const { coverageLimit } = useSettings();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [filter, setFilter] = useState('All');
  const [confirmReject, setConfirmReject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [postLoaModal, setPostLoaModal] = useState(null);

  const toast = useToast();
  const isCoordinator = user.role === 'coordinator';
  const isDirector = user.role === 'director';
  const isMember = user.role === 'member';

  const filtered = useMemo(() => {
    let list = isMember ? loas.filter(l => l.memberId === user.memberId) : loas;
    if (filter !== 'All') list = list.filter(l => l.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(l => {
        const m = members.find(x => x.id === l.memberId);
        return (l.serialNo || '').includes(q) || m?.name.toLowerCase().includes(q) || l.procedures?.toLowerCase().includes(q);
      });
    }
    return list.slice().reverse();
  }, [loas, search, filter, members, user, isMember]);

  const pendingCount = loas.filter(l => l.status === 'Pending').length;

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.updateLoa(editing.id, data);
        setLoas(prev => prev.map(l => l.id === editing.id ? updated : l));
      } else {
        const created = await api.createLoa(data);
        setLoas(prev => [...prev, created]);
      }
      setShowModal(false);
      setEditing(null);
      toast(editing ? 'LOA updated.' : 'LOA request submitted.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save LOA', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      // Use the dedicated approve endpoint — admin/coordinator/director allowed.
      // PUT /:id is admin/coordinator only and would 403 the director.
      const updated = await api.approveLoa(id);
      setLoas(prev => prev.map(l => l.id === id ? updated : l));
      toast('LOA approved.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to approve LOA', 'error');
    }
  };

  const handleReject = async (id, reason) => {
    try {
      const updated = await api.rejectLoa(id, reason);
      setLoas(prev => prev.map(l => l.id === id ? updated : l));
      toast('LOA rejected.', 'warning');
    } catch (err) {
      toast(err.message || 'Failed to reject LOA', 'error');
    }
  };

  const canApprove = isCoordinator || isDirector;

  const handlePostLoa = async (id, visitData) => {
    try {
      // Use the dedicated record-visit endpoint (verifyToken only) so members
      // can record their own hospital visit without hitting the admin-gated PUT.
      const updated = await api.recordLoaVisit(id, {
        visitDate: visitData.visitDate,
        doctorSeen: visitData.doctorSeen,
        visitNotes: visitData.notes,
      });
      setLoas(prev => prev.map(l => l.id === id ? updated : l));
      toast('Hospital visit recorded. LOA marked as Used.', 'success');
      setPostLoaModal(null);
    } catch (err) {
      toast(err.message || 'Failed to record visit', 'error');
    }
  };

  // For members: check which of their consultations have uploaded docs and no LOA yet
  const memberEligibleConsultations = useMemo(() => {
    if (!isMember) return [];
    return consultations.filter(c =>
      c.memberId === user.memberId &&
      c.documentUploaded === true &&
      (c.status === 'Approved' || c.status === 'Completed') &&
      !loas.some(l => l.consultationId === c.id)
    );
  }, [consultations, loas, isMember, user]);

  return (
    <>
      <TopBar
        title={isDirector ? 'LOA Approvals' : isMember ? 'My Letters of Authorization' : 'Letters of Authorization'}
        subtitle={
          isDirector ? 'Review and approve LOA requests from members' :
          isMember ? 'Request LOAs for diagnostic exams after consultation' :
          'LOAs issued for diagnostic exams and procedures'
        }
        onMenuToggle={onMenuToggle}
      >
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search LOAs..." className="w-full md:w-56 pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-emerald-600">
          <option>All</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
          <option>Used</option>
          <option>Expired</option>
        </select>
        {isMember && (
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            disabled={memberEligibleConsultations.length === 0}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm ${
              memberEligibleConsultations.length === 0
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-800 hover:bg-emerald-900 text-white'
            }`}
            title={memberEligibleConsultations.length === 0 ? 'Upload a consultation document first' : 'Request a new LOA'}
          >
            <FileSignature className="w-4 h-4" /> Request LOA
          </button>
        )}
        {isCoordinator && (
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-1.5 md:gap-2 shadow-sm bg-emerald-800 hover:bg-emerald-900 text-white"
            title="Create a new LOA on behalf of a member"
          >
            <FileSignature className="w-3.5 md:w-4 h-3.5 md:h-4" /> <span className="hidden md:inline">Upload LOA</span><span className="md:hidden">Upload</span>
          </button>
        )}
      </TopBar>

      {/* Member eligibility banner */}
      {isMember && (
        <div className="mx-2 md:mx-8 mt-4 md:mt-5">
          {memberEligibleConsultations.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 md:p-4 flex items-start gap-2 md:gap-3">
              <AlertCircle className="w-4 md:w-5 h-4 md:h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs md:text-sm text-gray-700">
                <div className="font-semibold text-gray-900">No eligible consultations yet</div>
                <div className="text-[10px] md:text-xs mt-1">
                  To request an LOA, you need an approved consultation with the uploaded consultation document.
                  Go to "My Consultations" to upload documents for approved visits.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 md:p-4 flex items-start gap-2 md:gap-3">
              <CheckCircle2 className="w-4 md:w-5 h-4 md:h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs md:text-sm text-emerald-900">
                <div className="font-semibold">You have {memberEligibleConsultations.length} consultation{memberEligibleConsultations.length !== 1 ? 's' : ''} eligible for LOA request</div>
                <div className="text-[10px] md:text-xs mt-1 text-emerald-800">
                  Click "Request LOA" above to submit. LOAs must be approved by the Coordinator or Director before you can print them.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Director approval banner */}
      {isDirector && pendingCount > 0 && (
        <div className="mx-2 md:mx-8 mt-4 md:mt-6 bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-300 rounded-2xl p-3 md:p-5 flex items-center gap-2 md:gap-4">
          <div className="w-10 md:w-12 h-10 md:h-12 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 md:w-6 h-5 md:h-6 text-emerald-900" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm md:text-lg font-semibold text-emerald-900">{pendingCount} LOA{pendingCount !== 1 ? 's' : ''} awaiting your approval</div>
            <div className="text-xs md:text-sm text-gray-700">Review each request carefully. Approved LOAs will be forwarded to the partner hospital.</div>
          </div>
          <button onClick={() => setFilter('Pending')} className="bg-emerald-800 hover:bg-emerald-900 text-white px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold flex-shrink-0">
            Review
          </button>
        </div>
      )}

      {/* Coordinator approval banner */}
      {isCoordinator && pendingCount > 0 && filter !== 'Pending' && (
        <div className="mx-2 md:mx-8 mt-4 md:mt-6 bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-300 rounded-2xl p-3 md:p-4 flex items-center gap-2 md:gap-3">
          <Clock className="w-5 md:w-6 h-5 md:h-6 text-yellow-700 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-emerald-900 text-xs md:text-sm">{pendingCount} LOA request{pendingCount !== 1 ? 's' : ''} from members awaiting approval</div>
          </div>
          <button onClick={() => setFilter('Pending')} className="bg-emerald-800 hover:bg-emerald-900 text-white px-2 md:px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0">Review</button>
        </div>
      )}

      <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
        {filtered.map((l, idx) => {
          const m = members.find(x => x.id === l.memberId);
          const memberSpent = m ? (soas || []).filter(s => s.memberId === m.id && s.status === 'Reviewed').reduce((sum, s) => sum + s.total, 0) : 0;
          const memberRemaining = coverageLimit - memberSpent;
          return (
            <div key={l.id} className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl border-2 border-yellow-300 p-3 md:p-5 shadow-sm hover:shadow-lg transition-all animate-fadeInUp" style={{ animationDelay: `${idx * 50}ms` }}>
              <div className="flex items-start justify-between mb-2 md:mb-3">
                <div>
                  <div className="text-[10px] md:text-xs text-yellow-800 font-bold tracking-widest uppercase">LOA #</div>
                  <div className="font-mono text-lg md:text-xl font-bold text-emerald-900">{l.serialNo}</div>
                </div>
                <StatusBadge status={l.status} />
              </div>
              <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Member</span>
                  <span className="font-semibold text-gray-900 truncate max-w-[120px] md:max-w-[180px]">{m?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hospital</span>
                  <span className="font-semibold text-gray-900 truncate">{l.hospital}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date Issued</span>
                  <span className="font-semibold text-gray-900">{formatDate(l.dateIssued)}</span>
                </div>
                {/* Show member balance for director review */}
                {isDirector && m && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member Balance</span>
                    <span className={`font-semibold ${memberRemaining < 30000 ? 'text-red-700' : 'text-emerald-800'}`}>{formatPesoShort(memberRemaining)}</span>
                  </div>
                )}
                <div className="pt-1.5 md:pt-2 border-t border-yellow-300">
                  <div className="text-[10px] md:text-xs text-gray-600 mb-1">Procedure(s)</div>
                  <div className="text-xs md:text-sm text-gray-800">{l.procedures}</div>
                </div>
                {l.approvedBy && (
                  <div className="pt-1.5 md:pt-2 border-t border-yellow-300 text-[10px] md:text-xs text-gray-600">
                    <span className="font-semibold">{l.status}</span> by {l.approvedBy}
                  </div>
                )}
              </div>
              <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-yellow-300 flex items-end justify-between">
                <div>
                  <div className="text-[10px] md:text-xs text-gray-600">Approved Amount</div>
                  <div className="font-display text-xl md:text-2xl font-bold text-emerald-900">{formatPesoShort(l.approvedAmount)}</div>
                </div>
                <div className="flex gap-0.5 md:gap-1 flex-wrap justify-end">
                  {/* Print: only if approved/used/completed */}
                  {(l.status === 'Approved' || l.status === 'Used' || l.status === 'Completed') ? (
                    <button onClick={() => setPrinting(l)} className="px-2 md:px-3 h-8 md:h-9 rounded-lg bg-white hover:bg-emerald-50 text-emerald-700 flex items-center gap-1 shadow-sm text-xs font-semibold" title="Print LOA">
                      <Printer className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden md:inline">Print</span>
                    </button>
                  ) : (
                    <button disabled className="px-2 md:px-3 h-8 md:h-9 rounded-lg bg-gray-50 text-gray-300 cursor-not-allowed flex items-center gap-1 shadow-sm text-xs font-semibold" title="Available after approval">
                      <Printer className="w-3 md:w-3.5 h-3 md:h-3.5" />
                    </button>
                  )}
                  {/* Post-LOA: member records hospital visit after LOA is Approved */}
                  {isMember && l.status === 'Approved' && (
                    <button onClick={() => setPostLoaModal(l)} className="px-2 md:px-3 h-8 md:h-9 rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1 shadow-sm text-xs font-semibold" title="Record Hospital Visit">
                      <Activity className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden md:inline">Visit</span>
                    </button>
                  )}
                  {isCoordinator && (
                    <button onClick={() => { setEditing(l); setShowModal(true); }} className="px-2 md:px-3 h-8 md:h-9 rounded-lg bg-white hover:bg-gray-50 text-gray-700 flex items-center gap-1 shadow-sm text-xs font-semibold" title="Edit">
                      <Edit className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden md:inline">Edit</span>
                    </button>
                  )}
                  {canApprove && l.status === 'Pending' && (
                    <>
                      <button onClick={() => setConfirmReject(l)} className="w-8 md:w-9 h-8 md:h-9 rounded-lg bg-white hover:bg-red-50 text-red-700 border border-red-200 flex items-center justify-center shadow-sm" title="Reject">
                        <X className="w-3.5 md:w-4 h-3.5 md:h-4" />
                      </button>
                      <button onClick={() => handleApprove(l.id)} className="px-2 md:px-3 h-8 md:h-9 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white flex items-center gap-1 shadow-sm text-xs font-semibold" title="Approve">
                        <Check className="w-3.5 md:w-4 h-3.5 md:h-4" /> <span className="hidden md:inline">OK</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-6 md:p-12 text-center text-gray-400 text-xs md:text-base">No LOAs found.</div>
        )}
      </div>

      {showModal && <LOAFormModal loa={editing} consultations={consultations} members={members} loas={loas} user={user} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null); }} saving={saving} />}
      {printing && <LOAPrintModal loa={printing} member={members.find(m => m.id === printing.memberId)} onClose={() => setPrinting(null)} />}
      {postLoaModal && (
        <PostLoaModal
          loa={postLoaModal}
          member={members.find(m => m.id === postLoaModal.memberId)}
          onSave={(visitData) => handlePostLoa(postLoaModal.id, visitData)}
          onClose={() => setPostLoaModal(null)}
        />
      )}
      {confirmReject && (
        <ConfirmModal
          title="Reject LOA"
          message="Reject this LOA request?"
          confirmLabel="Reject"
          confirmColor="red"
          withReason
          reasonPlaceholder="Reason for rejection..."
          onConfirm={(reason) => handleReject(confirmReject.id, reason)}
          onClose={() => setConfirmReject(null)}
        />
      )}
    </>
  );
};

// ============ LOA FORM MODAL ============
const LOAFormModal = ({ loa, consultations, members, loas, user, onSave, onClose, saving }) => {
  const isMember = user?.role === 'member';
  const [form, setForm] = useState(loa || {
    consultationId: '', memberId: isMember ? user.memberId : '',
    hospital: 'WUP-H', procedures: '',
    approvedAmount: '', requestingDoctor: '', status: 'Pending',
    dateIssued: new Date().toISOString().slice(0,10), validity: 7,
    clinicalImpression: '', rbPerDay: '', mbl: ''
  });
  const [procedureTags, setProcedureTags] = useState(() => stringToTags(loa?.procedures || ''));

  const handleTagsChange = (tags) => {
    setProcedureTags(tags);
    setForm(f => ({ ...f, procedures: tagsToString(tags) }));
  };

  // Filter eligible consultations:
  // - Must be approved/completed (Bug 4 fix)
  // - If member: only their own + document must be uploaded + no existing LOA
  const eligibleConsultations = useMemo(() => {
    let list = consultations.filter(c => c.status === 'Approved' || c.status === 'Completed');
    if (isMember) {
      list = list.filter(c =>
        c.memberId === user.memberId &&
        c.documentUploaded === true &&
        !(loas || []).some(l => l.consultationId === c.id && l.id !== loa?.id)
      );
    }
    return list;
  }, [consultations, loas, isMember, user, loa]);

  const handleConsultChange = (id) => {
    const c = consultations.find(x => x.id === id);
    if (c) {
      setForm({
        ...form, consultationId: id, memberId: c.memberId,
        requestingDoctor: c.physician, clinicalImpression: c.diagnosis
      });
    }
  };

  const handleSubmit = () => {
    if (!form.memberId || !form.procedures) {
      alert('Please fill required fields'); return;
    }
    if (!isMember && !form.approvedAmount) {
      alert('Please fill required fields'); return;
    }
    if (isMember && !form.consultationId) {
      alert('Please select the consultation this LOA is for');
      return;
    }
    onSave({ ...form, approvedAmount: Number(form.approvedAmount) || 0 });
  };

  const selectedMember = members.find(m => m.id === form.memberId);

  return (
    <Modal title={loa ? `Edit LOA #${loa.serialNo}` : (isMember ? 'Request Letter of Authorization' : 'Create Letter of Authorization')} onClose={onClose} size="lg">
      <div className="space-y-5">
        <div className="bg-gradient-to-r from-yellow-50 to-emerald-50 rounded-xl p-3 flex items-center gap-2 text-sm border border-yellow-200">
          <FileSignature className="w-4 h-4 text-emerald-700" />
          <span className="text-emerald-900">
            {isMember
              ? 'Your LOA request will be reviewed by the Coordinator or Director before you can print it.'
              : 'LOA serial will be auto-generated'}
          </span>
        </div>

        <div>
          <Field label={isMember ? 'Select Your Consultation (Required) — Only approved/completed consultations are eligible' : 'Link to Consultation'} select placeholder="Select consultation..." value={form.consultationId}
            options={eligibleConsultations.map(c => {
              const m = members.find(x => x.id === c.memberId);
              return { value: c.id, label: `#${c.serialNo} — ${isMember ? c.diagnosis || 'Consultation' : m?.name} — ${formatDate(c.date)}` };
            })}
            onChange={handleConsultChange} />
          {!isMember && (
            <p className="text-xs text-gray-500 mt-1">Only approved/completed consultations are eligible.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {isMember ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Member</label>
              <div className="px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 font-medium">
                {selectedMember ? `${selectedMember.name}` : 'Loading...'}
              </div>
            </div>
          ) : (
            <Field label="Member" required select placeholder="Select member..." value={form.memberId}
              options={members.map(m => ({ value: m.id, label: `${m.name} (${m.employeeId})` }))}
              onChange={v => setForm({...form, memberId: v})} />
          )}
          <Field label="Hospital" required value={form.hospital} onChange={v => setForm({...form, hospital: v})} placeholder="WUP-H, etc." />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Date Issued" required type="date" value={form.dateIssued} onChange={v => setForm({...form, dateIssued: v})} />
          <Field label="Validity (days)" type="number" value={form.validity} onChange={v => setForm({...form, validity: v})} />
          <Field label="Requesting Doctor" value={form.requestingDoctor} onChange={v => setForm({...form, requestingDoctor: v})} />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
            Covered Out-patient Diagnostic Exam / Procedures <span className="text-red-500">*</span>
          </label>
          <ProcedureTagInput value={procedureTags} onChange={handleTagsChange} />
        </div>

        <Field label="Clinical Impression" value={form.clinicalImpression} onChange={v => setForm({...form, clinicalImpression: v})} />

        {/* Financial fields — only for coordinator/admin, not members */}
        {!isMember && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Approved Amount (₱)" required type="number" value={form.approvedAmount} onChange={v => setForm({...form, approvedAmount: v})} />
              <Field label="R/B per day (₱)" value={form.rbPerDay} onChange={v => setForm({...form, rbPerDay: v})} />
              <Field label="MBL (₱)" value={form.mbl} onChange={v => setForm({...form, mbl: v})} />
            </div>

            <Field label="Status" select options={['Pending', 'Approved', 'Used']} value={form.status} onChange={v => setForm({...form, status: v})} />
          </>
        )}

        {isMember && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>The approved amount, daily R/B, and MBL will be set by the Coordinator upon approval based on hospital rates and your remaining balance.</div>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-md disabled:opacity-60">
            {saving ? 'Saving...' : (loa ? 'Update LOA' : (isMember ? 'Submit Request' : 'Create LOA'))}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ============ LOA PRINT MODAL ============
const LOAPrintModal = ({ loa, member, onClose }) => {
  const handlePrint = () => window.print();
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between no-print bg-emerald-50">
          <h3 className="font-display font-semibold text-emerald-900">Print Letter of Authorization</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-white flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 bg-gray-100">
          <div className="print-area">
            <LOADoc loa={loa} member={member} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ POST-LOA MODAL ============
const PostLoaModal = ({ loa, member, onSave, onClose }) => {
  const [form, setForm] = useState({
    visitDate: new Date().toISOString().slice(0, 10),
    doctorSeen: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.visitDate) { alert('Please enter the visit date.'); return; }
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Record Hospital Visit" onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
          <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>Record your hospital visit for LOA <strong>#{loa.serialNo}</strong> — <em>{loa.procedures}</em>. This will mark the LOA as Used.</div>
        </div>
        <Field label="Visit Date" required type="date" value={form.visitDate} onChange={v => setForm({ ...form, visitDate: v })} />
        <Field label="Doctor / Specialist Seen" value={form.doctorSeen} onChange={v => setForm({ ...form, doctorSeen: v })} placeholder="e.g. Dr. Reyes — Internal Medicine" />
        <Field label="Notes / Findings (optional)" textarea value={form.notes} onChange={v => setForm({ ...form, notes: v })} placeholder="Brief summary of findings, outcome, or follow-up instructions..." />
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold disabled:opacity-60">
            {saving ? 'Saving...' : 'Submit Visit Report'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ============ LOA DOCUMENT ============
const LOADoc = ({ loa, member }) => {
  const [logoError, setLogoError] = useState(false);
  return (
  <div className="bg-white border-2 border-gray-800 p-6 max-w-3xl mx-auto text-[13px]" style={{ fontFamily: 'Georgia, serif' }}>
    <div className="flex items-start gap-4 mb-3">
      <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
        {!logoError
          ? <img src="/logos/WCLogo.png" alt="WeCare" className="w-full h-full object-contain" onError={() => setLogoError(true)} />
          : <Heart className="w-10 h-10 text-emerald-700" fill="currentColor" />
        }
      </div>
      <div className="flex-1 text-center">
        <div className="font-bold text-lg tracking-wider">WESLEYAN UNIVERSITY – PHILIPPINES</div>
        <div className="text-sm font-semibold">HEALTH CARE PROGRAM DEPARTMENT</div>
        <div className="text-xs">Mabini Extension, Cabanatuan City</div>
        <div className="text-xs">Tels. (044) 463-2162 / 463-2074</div>
        <div className="text-xs">Local # 114</div>
      </div>
    </div>

    <h2 className="text-center text-xl font-bold tracking-wider my-4">LETTER OF AUTHORIZATION</h2>

    <div className="flex justify-between items-start mb-4">
      <div className="flex-1">
        <div className="border-b border-gray-800 pb-0.5 mb-0.5 font-semibold">{loa.hospital}</div>
        <div className="text-xs">Hospital</div>
      </div>
      <div className="text-right ml-4">
        <div className="border-2 border-red-600 px-2 py-1 inline-block mb-2">
          <div className="text-[10px]">No.</div>
          <div className="font-bold text-red-600 text-lg">{loa.serialNo}</div>
        </div>
        <div className="text-xs"><strong>Date Issued:</strong> {formatDate(loa.dateIssued)}</div>
        <div className="text-xs"><strong>Validity:</strong> {loa.validity} days</div>
      </div>
    </div>

    <div className="grid grid-cols-[2fr_1fr_1fr] border border-gray-800 mb-3">
      <div className="p-2 border-r border-gray-800">
        <div className="text-xs font-semibold">Name of Member:</div>
        <div className="font-semibold">{member?.name}</div>
      </div>
      <div className="p-2 border-r border-gray-800">
        <div className="text-xs font-semibold">Age:</div>
        <div>{member?.age}</div>
      </div>
      <div className="p-2">
        <div className="text-xs font-semibold">Gender:</div>
        <div>{member?.gender}</div>
      </div>
    </div>

    <div className="mb-3">
      <div className="text-xs mb-1"><strong>Attention:</strong> {loa.hospital}</div>
      <div className="text-xs mb-2"><strong>Sir/Madam,</strong></div>
      <div className="text-xs leading-relaxed">
        This is to authorize the availment of <u className="font-semibold">{loa.procedures}</u> of the member in good standing with ID No. <u className="font-semibold">{member?.employeeId}</u>.
      </div>
      <div className="text-xs mt-2">
        <strong>Employee Status:</strong> {(member?.status === 'Tenured' || member?.status === 'Permanent') ? '☑' : '☐'} Tenured &nbsp; {member?.status === 'Non-Tenured' ? '☑' : '☐'} Non-Tenured &nbsp; {member?.status === 'Contractual' ? '☑' : '☐'} Contractual
      </div>
    </div>

    <div className="border border-gray-800 mb-3">
      <div className="text-center bg-gray-100 p-1.5 border-b border-gray-800 font-semibold text-xs">Covered Out-patient Diagnostic Exam</div>
      <div className="p-3 min-h-[100px] text-sm">
        {loa.procedures.split(',').map((p, i) => <div key={i}>• {p.trim()}</div>)}
      </div>
    </div>

    <div className="text-xs space-y-1 mb-4">
      <div><strong>CLINICAL IMPRESSION:</strong> <u>{loa.clinicalImpression}</u></div>
      <div><strong>R/B per day:</strong> <u>{loa.rbPerDay ? formatPeso(loa.rbPerDay) : '—'}</u> &nbsp; <strong>MBL:</strong> <u>{loa.mbl ? formatPeso(loa.mbl) : '—'}</u></div>
      <div><strong>Health Plan</strong></div>
      <div className="italic text-[10px]">Please attach complete supporting papers to your statement of account. Please mandate patient to submit Philhealth / ECC forms duly accomplished before discharge. Please write below for non-covered charges which shall be paid by the member before a discharge.</div>
    </div>

    <div className="grid grid-cols-2 gap-3 text-xs mb-4">
      {[1,2,3,4,5,6].map(n => (
        <div key={n} className="flex items-center gap-2">
          <span>{n}.</span><span className="border-b border-gray-600 flex-1"></span>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-3 gap-4 mt-8 pt-4">
      <div>
        <div className="border-b border-gray-800 h-6 text-xs italic flex items-end pb-0.5">Prepared by</div>
        <div className="text-[10px] mt-1">Signature over Printed Name</div>
      </div>
      <div className="text-center">
        <div className="border-b border-gray-800 h-6"></div>
        <div className="text-[10px] mt-1">WU-P HCP Approval No.</div>
      </div>
      <div className="text-center">
        <div className="border-b border-gray-800 h-6 italic text-sm flex items-end justify-center pb-0.5">{loa.requestingDoctor}</div>
        <div className="text-[10px] mt-1">Requesting Doctor</div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4 mt-6 pt-2 text-xs">
      <div>
        <div>Truly yours,</div>
        <div className="border-b border-gray-800 h-6 mt-4"></div>
        <div className="text-[10px] mt-1">WU-P Health Care Program Director</div>
      </div>
      <div>
        <div className="border-b border-gray-800 h-6 mt-4"></div>
        <div className="text-[10px] mt-1">Signature of member over Printed Name</div>
      </div>
    </div>

    <div className="grid grid-cols-3 text-[10px] text-gray-700 mt-3 pt-2 border-t border-gray-400 font-semibold">
      <div>Original: Audit</div>
      <div className="text-center">Pink: Hospital</div>
      <div className="text-right">Yellow: WUP-Care</div>
    </div>
  </div>
  );
};

export default LOAView;
