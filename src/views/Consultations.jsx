import { useState, useMemo, useRef } from 'react';
import {
  Search, Plus, Edit, Printer, X, Check, CheckCircle2, Trash2,
  FileUp, FileCheck, FileText, Upload, AlertCircle, Sparkles,
  ShieldCheck, Activity, Clock, Heart, Download
} from 'lucide-react';
import { useToast } from '../components/shared/Toast.jsx';
import TopBar from '../components/TopBar.jsx';
import StatusBadge from '../components/shared/StatusBadge.jsx';
import PatientTypeBadge from '../components/shared/PatientTypeBadge.jsx';
import Modal from '../components/shared/Modal.jsx';
import Field from '../components/shared/Field.jsx';
import ConfirmModal from '../components/shared/ConfirmModal.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { api } from '../services/api.js';
import { formatDate, generateSerialNo } from '../utils/helpers.js';

// ============ CONSULTATIONS VIEW ============
const ConsultationsView = ({ consultations, setConsultations, members, user, onMenuToggle }) => {
  const { memberConsultLimit, dependentConsultLimit } = useSettings();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [confirmReject, setConfirmReject] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const toast = useToast();
  const isCoordinator = user.role === 'coordinator';
  const isMember = user.role === 'member';

  const missingDocCount = !isMember ? consultations.filter(c => c.status === 'Approved' && !c.documentUploaded).length : 0;

  const filtered = useMemo(() => {
    let list = isMember ? consultations.filter(c => c.memberId === user.memberId) : consultations;
    if (filter === 'Missing Docs') list = list.filter(c => c.status === 'Approved' && !c.documentUploaded);
    else if (filter !== 'All') list = list.filter(c => c.status === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => {
        const m = members.find(x => x.id === c.memberId);
        return (c.serialNo && String(c.serialNo).includes(q)) || (m?.name && m.name.toLowerCase().includes(q)) || (c.diagnosis && c.diagnosis.toLowerCase().includes(q));
      });
    }
    return list.slice().reverse();
  }, [consultations, search, filter, members, user, isMember]);

  const pendingCount = isCoordinator ? consultations.filter(c => c.status === 'Pending').length : 0;

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.updateConsultation(editing.id, data);
        setConsultations(prev => prev.map(c => c.id === editing.id ? updated : c));
      } else {
        const serialNo = generateSerialNo('C', consultations);
        const created = await api.createConsultation({
          ...data,
          serialNo: serialNo,
          status: 'Pending',
          requestedBy: isMember ? user.name : null,
          documentUploaded: false,
          documentName: null,
        });
        setConsultations(prev => [...prev, created]);
      }
      setShowModal(false);
      setEditing(null);
      toast(editing ? 'Consultation updated.' : 'Consultation request submitted.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save consultation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      const updated = await api.updateConsultation(id, {
        status: 'Approved',
        approvedBy: user.name,
        approvedAt: new Date().toISOString(),
      });
      setConsultations(prev => prev.map(c => c.id === id ? updated : c));
    } catch (err) {
      toast(err.message || 'Failed to approve consultation', 'error');
    }
  };

  const handleReject = async (id, reason) => {
    try {
      const updated = await api.updateConsultation(id, {
        status: 'Rejected',
        approvedBy: user.name,
        approvedAt: new Date().toISOString(),
        rejectionReason: reason || '',
      });
      setConsultations(prev => prev.map(c => c.id === id ? updated : c));
      toast('Consultation rejected.', 'warning');
    } catch (err) {
      toast(err.message || 'Failed to reject consultation', 'error');
    }
  };

  const handleComplete = async (id) => {
    try {
      const updated = await api.updateConsultation(id, { status: 'Completed' });
      setConsultations(prev => prev.map(c => c.id === id ? updated : c));
      toast('Consultation marked as completed.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to complete consultation', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteConsultation(id);
      setConsultations(prev => prev.filter(c => c.id !== id));
      toast('Consultation deleted.', 'warning');
    } catch (err) {
      toast(err.message || 'Failed to delete consultation', 'error');
    }
    setConfirmDelete(null);
  };

  const handlePrintConsultation = async (id) => {
    try {
      const updated = await api.updateConsultation(id, {
        printedAt: new Date().toISOString(),
      });
      setConsultations(prev => prev.map(c => c.id === id ? updated : c));
    } catch (err) {
      toast(err.message || 'Failed to update print status', 'error');
    }
  };

  const handleUploadDoc = async (id, fileName, documentData) => {
    try {
      const consultation = consultations.find(c => c.id === id);
      const member = members.find(m => m.id === consultation?.memberId);
      
      const updated = await api.updateConsultation(id, {
        documentUploaded: true,
        documentName: fileName,
        documentData: documentData,
        documentUploadedAt: new Date().toISOString(),
      });
      setConsultations(prev => prev.map(c => c.id === id ? updated : c));
      
      // Create notification for coordinator
      if (consultation && member) {
        await api.createNotification({
          type: 'document_upload',
          title: 'New Document Upload',
          message: `${member.name} has uploaded a consultation document (Consultation #${consultation.serialNo})`,
          recipientRole: 'coordinator',
          relatedConsultationId: id,
          relatedMemberId: consultation.memberId,
        });
      }
      
      toast('Document uploaded successfully.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to upload document', 'error');
    }
    setUploadingDoc(null);
  };

  return (
    <>
      <TopBar
        title={isMember ? 'My Consultations' : 'Consultation Requests'}
        subtitle={isMember ? 'Request consultations and upload documents after visits' : 'Review and approve consultation requests from members'}
        onMenuToggle={onMenuToggle}
      >
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full md:w-56 pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
          <option>All</option><option>Pending</option><option>Approved</option><option>Completed</option><option>Rejected</option>
          {!isMember && <option>Missing Docs</option>}
        </select>
        {!isMember && missingDocCount > 0 && filter !== 'Missing Docs' && (
          <button onClick={() => setFilter('Missing Docs')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-300 hover:bg-amber-200">
            <AlertCircle className="w-3.5 h-3.5" /> {missingDocCount} missing doc{missingDocCount !== 1 ? 's' : ''}
          </button>
        )}
        {isMember && (
          <button onClick={() => { setEditing(null); setShowModal(true); }} className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Request Consultation
          </button>
        )}
      </TopBar>

      {/* Coordinator banner: pending approvals */}
      {isCoordinator && pendingCount > 0 && filter !== 'Pending' && (
        <div className="mx-8 mt-5 bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 flex items-center gap-3">
          <Clock className="w-6 h-6 text-yellow-700 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-emerald-900 text-sm">{pendingCount} consultation request{pendingCount !== 1 ? 's' : ''} awaiting approval</div>
          </div>
          <button onClick={() => setFilter('Pending')} className="bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-2 rounded-lg text-xs font-semibold">Review</button>
        </div>
      )}

      {/* Member workflow guide */}
      {isMember && (
        <div className="mx-8 mt-5 bg-white border border-gray-200 rounded-2xl p-5">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">How it works</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { n: 1, t: 'Request', d: 'Submit a consultation request', icon: Plus },
              { n: 2, t: 'Approval', d: 'Coordinator reviews your request', icon: ShieldCheck },
              { n: 3, t: 'Print & Visit', d: 'Print slip then see the doctor', icon: Printer },
              { n: 4, t: 'Upload Document', d: 'Upload the completed consultation', icon: FileUp },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-800 text-yellow-300 flex items-center justify-center font-bold text-xs flex-shrink-0">{s.n}</div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm text-emerald-900">{s.t}</div>
                  <div className="text-xs text-gray-600">{s.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-2 md:p-8">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm overflow-x-auto">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-emerald-50 to-yellow-50">
                <tr>
                  {['Serial', 'Patient', 'Date', 'Type', 'Diagnosis', 'Doc', 'Status', 'Action'].map(h => (
                    <th key={h} className={`text-left font-bold text-emerald-900 uppercase tracking-wider px-2 md:px-5 py-3 md:py-4 text-[10px] md:text-xs ${h === 'Diagnosis' ? 'hidden md:table-cell' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c, idx) => {
                  const m = members.find(x => x.id === c.memberId);
                  const d = m?.dependents?.find(x => x.id === c.dependentId);
                  const canPrint = c.status === 'Approved' || c.status === 'Completed';
                  const canUploadDoc = (c.status === 'Approved' || c.status === 'Completed') && !c.documentUploaded && c.printedAt;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors animate-fadeInUp" style={{ animationDelay: `${idx * 30}ms` }}>
                      <td className="px-2 md:px-5 py-2 md:py-4">
                        <div className="font-mono text-xs md:text-sm font-semibold text-emerald-900">#{c.serialNo}</div>
                        <div className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleDateString()}</div>
                      </td>
                      <td className="px-2 md:px-5 py-2 md:py-4">
                        <div className="font-medium text-gray-900 text-xs md:text-sm">{d ? d.name : m?.name}</div>
                        {d && <div className="text-[9px] text-yellow-700 bg-yellow-50 inline-block px-1.5 py-0.5 rounded mt-0.5">Dep. of {m?.name}</div>}
                        {!d && <div className="text-[9px] text-gray-500">{m?.employeeId}</div>}
                      </td>
                      <td className="px-2 md:px-5 py-2 md:py-4 text-xs md:text-sm text-gray-700 whitespace-nowrap">{formatDate(c.date)}</td>
                      <td className="px-2 md:px-5 py-2 md:py-4"><PatientTypeBadge type={c.patientType} /></td>
                      <td className="px-2 md:px-5 py-2 md:py-4 text-xs text-gray-700 max-w-xs truncate hidden md:table-cell">{c.diagnosis || <span className="text-gray-400 italic">Not yet diagnosed</span>}</td>
                      <td className="px-2 md:px-5 py-2 md:py-4">
                        {c.documentUploaded ? (
                          <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full bg-emerald-100 text-emerald-800" title={c.documentName}>
                            <FileCheck className="w-2.5 md:w-3 h-2.5 md:h-3" /> Uploaded
                          </span>
                        ) : (
                          <span className="text-[9px] md:text-[10px] text-gray-400 italic">Not yet</span>
                        )}
                      </td>
                      <td className="px-2 md:px-5 py-2 md:py-4">
                        <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
                          <StatusBadge status={c.status} />
                          {!isMember && c.status === 'Approved' && !c.documentUploaded && (
                            <span className="text-[8px] md:text-[9px] font-bold bg-amber-100 text-amber-700 px-1 md:px-1.5 py-0.5 rounded-full border border-amber-200 whitespace-nowrap">No Doc</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 md:px-5 py-2 md:py-4">
                        <div className="flex items-center gap-1 md:gap-2 flex-wrap">
                          {/* Main Print button */}
                          <button
                            onClick={() => setPrinting(c)}
                            disabled={!canPrint}
                            className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 rounded-lg font-semibold text-xs md:text-sm transition-colors ${
                              canPrint
                                ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                            title={canPrint ? 'Print consultation slip' : 'Available after coordinator approval'}
                          >
                            <Printer className="w-3 md:w-4 h-3 md:h-4" />
                            <span className="hidden md:inline">Print</span>
                          </button>

                          {/* Coordinator: Approve/Reject pending */}
                          {isCoordinator && c.status === 'Pending' && (
                            <>
                              <button onClick={() => setConfirmReject(c)} className="w-6 md:w-8 h-6 md:h-8 rounded-lg hover:bg-red-50 text-red-700 flex items-center justify-center" title="Reject">
                                <X className="w-3 md:w-4 h-3 md:h-4" />
                              </button>
                              <button onClick={() => handleApprove(c.id)} className="px-1.5 md:px-2.5 h-6 md:h-8 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs font-semibold" title="Approve">
                                <Check className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden md:inline">Approve</span>
                              </button>
                            </>
                          )}

                          {/* Coordinator: Complete button for approved consultations */}
                          {isCoordinator && c.status === 'Approved' && (
                            <button onClick={() => handleComplete(c.id)} className="px-1.5 md:px-2.5 h-6 md:h-8 rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-0.5 md:gap-1 text-[10px] md:text-xs font-semibold">
                              <CheckCircle2 className="w-3 md:w-3.5 h-3 md:h-3.5" /> <span className="hidden md:inline">Complete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="p-12 text-center text-gray-400">
                    {isMember ? 'No consultations yet. Click "Request Consultation" to get started.' : 'No consultations found.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && <ConsultationFormModal consultation={editing} members={members} consultations={consultations} user={user} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null); }} saving={saving} />}
      {printing && <ConsultationPrintModal consultation={printing} member={members.find(m => m.id === printing.memberId)} dependent={members.find(m => m.id === printing.memberId)?.dependents?.find(d => d.id === printing.dependentId)} onClose={() => setPrinting(null)} onPrinted={handlePrintConsultation} />}
      {uploadingDoc && <DocumentUploadModal consultation={uploadingDoc} onSave={(fileName, documentData) => handleUploadDoc(uploadingDoc.id, fileName, documentData)} onClose={() => setUploadingDoc(null)} />}
      {confirmReject && (
        <ConfirmModal
          title="Reject Consultation"
          message="Reject this consultation request?"
          confirmLabel="Reject"
          confirmColor="red"
          withReason
          reasonPlaceholder="Reason for rejection..."
          onConfirm={(reason) => handleReject(confirmReject.id, reason)}
          onClose={() => setConfirmReject(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Consultation"
          message={`Delete pending consultation #${confirmDelete.serialNo}? This cannot be undone.`}
          confirmLabel="Delete"
          confirmColor="red"
          onConfirm={() => handleDelete(confirmDelete.id)}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
};

// ============ DOCUMENT UPLOAD MODAL ============
const DocumentUploadModal = ({ consultation, onSave, onClose }) => {
  const [fileName, setFileName] = useState('');
  const [documentData, setDocumentData] = useState(null);
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setDocumentData(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!fileName) {
      alert('Please select a file to upload.');
      return;
    }
    onSave(fileName, documentData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 no-print">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-emerald-900">Upload Consultation Document</h3>
            <p className="text-xs text-gray-500">Consultation #{consultation.serialNo}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-700" />
            <div><strong>✓ Consultation form has been printed.</strong></div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>Please upload the completed consultation document from your attending physician. This is required before you can request an LOA.</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Consultation Document</label>
            <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFile} className="hidden" />
            {!fileName ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 hover:border-emerald-600 hover:bg-emerald-50 rounded-xl p-8 text-center transition-colors"
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <div className="text-sm font-semibold text-gray-700">Click to select file</div>
                <div className="text-xs text-gray-500 mt-1">PDF, JPG, or PNG (max 10MB)</div>
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="w-10 h-10 bg-emerald-200 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-800" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{fileName}</div>
                  <div className="text-xs text-emerald-700">Ready to upload</div>
                </div>
                <button onClick={() => { setFileName(''); setDocumentData(null); }} className="w-7 h-7 rounded-lg hover:bg-white flex items-center justify-center">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Any additional notes about this consultation..."
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-sm resize-none" />
          </div>
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl text-sm font-semibold">Cancel</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-sm font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ CONSULTATION FORM MODAL ============
// ============ CONSULTATION FORM MODAL ============
const ConsultationFormModal = ({ consultation, members, consultations, user, onSave, onClose, saving }) => {
  const { memberConsultLimit, dependentConsultLimit } = useSettings();
  const isMember = user?.role === 'member';

  const [form, setForm] = useState(consultation || {
    memberId: isMember ? user.memberId : '',
    dependentId: null, 
    date: new Date().toISOString().slice(0,10),
    patientType: 'Consultation', 
    chiefComplaints: '', 
    peFindings: '', 
    plan: '', 
    diagnosis: '',
    status: 'Pending', 
    physician: ''
  });
  const [isDep, setIsDep] = useState(!!consultation?.dependentId);

  const member = members.find(m => String(m.id) === String(form.memberId));

  // Count existing consultations to check limits
  const limitInfo = useMemo(() => {
    if (!form.memberId) return null;
    const year = new Date(form.date).getFullYear();
    if (isDep && form.dependentId) {
      const count = consultations.filter(c => c.dependentId === form.dependentId && new Date(c.date).getFullYear() === year && c.id !== consultation?.id).length;
      return { count, limit: dependentConsultLimit, label: 'Dependent' };
    } else {
      const count = consultations.filter(c => c.memberId === form.memberId && !c.dependentId && new Date(c.date).getFullYear() === year && c.id !== consultation?.id).length;
      return { count, limit: memberConsultLimit, label: 'Member' };
    }
  }, [form, consultations, isDep, consultation, memberConsultLimit, dependentConsultLimit]);

  // Validate Chief Complaints — requires symptom duration of at least 3 days.
  // Returns { ok: boolean, reason?: string } so the caller can show a specific message.
  const validateChiefComplaints = (complaints) => {
    if (!complaints || complaints.trim() === '') {
      return { ok: false, reason: 'Please describe your symptoms and how long you have had them (e.g., "Fever for 3 days").' };
    }

    const text = complaints.toLowerCase();

    // Phrases that imply <3 day onset, reject regardless of unit
    const sameDayPhrases = ['since yesterday', 'started today', 'this morning', 'today only', 'just started', 'few hours'];
    if (sameDayPhrases.some(p => text.includes(p))) {
      return { ok: false, reason: 'Symptoms must be at least 3 days old. Phrases like "since yesterday" or "started today" are not yet eligible. Please come back if symptoms persist.' };
    }

    // Find numeric durations: "1 day", "2 days", "1 week", "2 months"
    const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(day|days|week|weeks|wk|wks|month|months|mo|mos|hour|hours|hr|hrs)/g)];
    if (matches.length === 0) {
      return { ok: false, reason: 'Please specify how long you have had the symptoms (e.g., "Fever for 3 days", "Cough for 1 week").' };
    }

    const inDays = (n, unit) => {
      const u = unit.toLowerCase();
      if (u.startsWith('hour') || u === 'hr' || u === 'hrs') return n / 24;
      if (u.startsWith('day')) return n;
      if (u.startsWith('week') || u === 'wk' || u === 'wks') return n * 7;
      if (u.startsWith('month') || u === 'mo' || u === 'mos') return n * 30;
      return n;
    };

    // Use the LONGEST mentioned duration (so "fever for 3 days, started today" still passes the 3-day rule)
    const maxDays = Math.max(...matches.map(m => inDays(parseFloat(m[1]), m[2])));
    if (maxDays < 3) {
      return { ok: false, reason: `Symptoms must be at least 3 days old. You indicated approximately ${maxDays.toFixed(0)} day${maxDays === 1 ? '' : 's'}. Please come back if symptoms persist.` };
    }

    return { ok: true };
  };

  const handleSubmit = () => {
    if (!form.memberId || !form.date) { alert('Please select a member and date'); return; }
    if (isDep && !form.dependentId) { alert('Please select a dependent'); return; }
    
    // Validate Chief Complaints for members
    if (isMember) {
      const check = validateChiefComplaints(form.chiefComplaints);
      if (!check.ok) {
        alert(check.reason);
        return;
      }
    }
    
    if (limitInfo && limitInfo.count >= limitInfo.limit) {
      if (!window.confirm(`Warning: ${limitInfo.label} has reached annual consultation limit (${limitInfo.limit}). Continue anyway?`)) return;
    }
    onSave({ ...form, dependentId: isDep ? form.dependentId : null });
  };

  return (
    <Modal title={consultation ? `Edit Consultation #${consultation.serialNo}` : (isMember ? 'Request a Consultation' : 'New Consultation')} onClose={onClose} size="lg">
      <div className="space-y-5">
        {!consultation && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <span className="text-emerald-900">
              {isMember
                ? 'Your request will be sent to the Coordinator for approval. You can print the consultation slip once approved.'
                : 'Serial number will be auto-generated upon save'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {isMember ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Member</label>
              <div className="px-3 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-900 font-medium">
                {member ? `${member.name} (${member.employeeId})` : 'Loading...'}
              </div>
            </div>
          ) : (
            <Field label="Member" required select placeholder="Select member..." value={form.memberId}
              options={members.map(m => ({ value: m.id, label: `${m.name} (${m.employeeId})` }))}
              onChange={v => setForm({...form, memberId: v, dependentId: null})} />
          )}
          <Field label="Date" required type="date" value={form.date} onChange={v => setForm({...form, date: v})} />
        </div>

        {member && (member.dependents || []).length > 0 && (
          <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <label className="flex items-center gap-2 text-sm font-semibold text-yellow-900 mb-2">
              <input type="checkbox" checked={isDep} onChange={e => setIsDep(e.target.checked)} className="w-4 h-4 rounded" />
              This consultation is for a dependent
            </label>
            {isDep && (
              <select value={form.dependentId || ''} onChange={e => setForm({...form, dependentId: e.target.value})} className="w-full mt-2 px-3 py-2 rounded-lg border border-yellow-300 bg-white text-sm">
                <option value="">Select dependent...</option>
                {member.dependents.map(d => <option key={d.id} value={d.id}>{d.name} — {d.relationship}</option>)}
              </select>
            )}
          </div>
        )}

        {limitInfo && (
          <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
            limitInfo.count >= limitInfo.limit ? 'bg-red-50 text-red-800 border border-red-200' :
            limitInfo.count >= limitInfo.limit * 0.8 ? 'bg-yellow-50 text-yellow-900 border border-yellow-200' :
            'bg-gray-50 text-gray-700'
          }`}>
            <Activity className="w-4 h-4" />
            <span>{limitInfo.label} has used <strong>{limitInfo.count} of {limitInfo.limit}</strong> annual consultations</span>
          </div>
        )}

        <Field label="Patient Type" select options={['Consultation', 'Outpatient', 'Inpatient', 'Emergency']} value={form.patientType} onChange={v => setForm({...form, patientType: v})} />

        <div>
          <Field label="Chief Complaints" textarea value={form.chiefComplaints} onChange={v => setForm({...form, chiefComplaints: v})} placeholder={isMember ? 'Describe your symptoms or reason for consultation' : ''} />
          {isMember && (
            <div className="mt-2 text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-2">
              <strong>✓ Important:</strong> Please specify the duration of your symptoms. Symptoms must be at least 3 days old. Examples: "Fever for 5 days", "Persistent cough for 1 week", "Body ache for 4 days", etc.
            </div>
          )}
        </div>

        {/* Members cannot fill in medical findings — those are entered by physician/coordinator */}
        {!isMember && (
          <>
            <Field label="Pertinent P.E. Findings" textarea value={form.peFindings} onChange={v => setForm({...form, peFindings: v})} />
            <Field label="Plan" textarea value={form.plan} onChange={v => setForm({...form, plan: v})} />
            <Field label="Diagnosis" textarea value={form.diagnosis} onChange={v => setForm({...form, diagnosis: v})} />

            <div className="grid grid-cols-2 gap-4">
              <Field label="Attending Physician" value={form.physician} onChange={v => setForm({...form, physician: v})} placeholder="Dr. Name" />
              <Field label="Status" select options={['Pending', 'Approved', 'Completed']} value={form.status} onChange={v => setForm({...form, status: v})} />
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-md disabled:opacity-60">
            {saving ? 'Saving...' : (consultation ? 'Update' : (isMember ? 'Submit Request' : 'Create Consultation'))}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ============ CONSULTATION PRINT ============
const ConsultationPrintModal = ({ consultation, member, dependent, onClose, onPrinted }) => {
  const handlePrint = () => {
    if (onPrinted) {
      onPrinted(consultation.id);
    }
    window.print();
  };
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between no-print bg-emerald-50">
          <h3 className="font-display font-semibold text-emerald-900">Print Consultation Slip</h3>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print 2 Copies
            </button>
            <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-white flex items-center justify-center"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 bg-gray-100">
          <div className="print-area consultation-slip-pair">
            <ConsultationSlipDoc consultation={consultation} member={member} dependent={dependent} copy="Original: Audit" />
            <div className="border-t-2 border-dashed border-gray-400 my-4 no-print"></div>
            <ConsultationSlipDoc consultation={consultation} member={member} dependent={dependent} copy="Pink: Attending Physician" />
          </div>
        </div>
      </div>
    </div>
  );
};

const ConsultationSlipDoc = ({ consultation, member, dependent, copy }) => {
  const [logoError, setLogoError] = useState(false);
  return (
  <div className="consultation-slip bg-white border-2 border-gray-800 p-8 mb-4 max-w-2xl mx-auto text-[13px] font-mono" style={{ fontFamily: 'Georgia, serif' }}>
    {/* Header */}
    <div className="flex items-start gap-4 mb-4">
      <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
        {!logoError
          ? <img src="/logos/WCLogo.png" alt="WeCare" className="w-full h-full object-contain" onError={() => setLogoError(true)} />
          : <Heart className="w-10 h-10 text-emerald-700" fill="currentColor" />
        }
      </div>
      <div className="flex-1 text-center">
        <div className="font-bold text-lg" style={{ fontFamily: 'Georgia, serif', letterSpacing: '0.05em' }}>WESLEYAN UNIVERSITY – PHILIPPINES</div>
        <div className="text-sm font-semibold">WeCare Health Care Services Department</div>
        <div className="text-xs">Mabini Extension, Cabanatuan City</div>
        <div className="text-xs">Tel. (044) 4110-048 to 051</div>
      </div>
      <div className="border-2 border-red-600 px-2 py-1 flex-shrink-0">
        <div className="text-[10px] text-gray-700">No.</div>
        <div className="font-bold text-red-600 text-lg">{consultation.serialNo}</div>
      </div>
    </div>

    <h2 className="text-center text-2xl font-bold tracking-wider my-4" style={{ fontFamily: 'Georgia, serif' }}>CONSULTATION SLIP</h2>

    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
      <div><strong>Date Issued:</strong> <u className="inline-block min-w-[100px]">{formatDate(consultation.date)}</u></div>
      <div><strong>Validity Date:</strong> <u className="inline-block min-w-[60px]">7 days</u></div>
    </div>

    <div className="border border-gray-800">
      <div className="grid grid-cols-[2fr_1fr_1fr] border-b border-gray-800">
        <div className="p-2 border-r border-gray-800">
          <div className="text-xs font-semibold">Name of Member / Dependent:</div>
          <div className="text-base mt-1">{dependent ? `${dependent.name} (${dependent.relationship})` : member?.name}</div>
        </div>
        <div className="p-2 border-r border-gray-800">
          <div className="text-xs font-semibold">Age:</div>
          <div className="text-base mt-1">{dependent ? dependent.age : member?.age}</div>
        </div>
        <div className="p-2">
          <div className="text-xs font-semibold">Gender:</div>
          <div className="text-base mt-1">{member?.gender?.[0] || ''}</div>
        </div>
      </div>
      <div className="grid grid-cols-2">
        <div className="p-2 border-r border-gray-800">
          <div className="text-xs font-semibold">College / Department:</div>
          <div className="text-base mt-1">{member?.department}</div>
        </div>
        <div className="p-2">
          <div className="text-xs font-semibold">Employee Status:</div>
          <div className="text-xs mt-1 space-y-0.5">
            <div>{(member?.status === 'Tenured' || member?.status === 'Permanent') ? '☑' : '☐'} Tenured &nbsp; {member?.status === 'Non-Tenured' ? '☑' : '☐'} Non-Tenured</div>
            <div>{member?.status === 'Contractual' ? '☑' : '☐'} Contractual (Validity) ______</div>
          </div>
        </div>
      </div>
    </div>

    <div className="border border-gray-800 border-t-0 p-3 min-h-[300px]">
      <div className="mb-3">
        <div className="text-xs font-semibold">Chief Complaints</div>
        <div className="border-b border-gray-400 min-h-[1.25rem] text-sm pb-1">{consultation.chiefComplaints}</div>
      </div>
      <div className="mb-3">
        <div className="text-xs font-semibold">Pertinent P.E. Findings</div>
        <div className="border-b border-gray-400 min-h-[1.25rem] text-sm pb-1">{consultation.peFindings}</div>
      </div>
      <div className="mb-3">
        <div className="text-xs font-semibold">Plan</div>
        <div className="border-b border-gray-400 min-h-[1.25rem] text-sm pb-1">{consultation.plan}</div>
      </div>
      <div className="mb-3">
        <div className="text-xs font-semibold">Diagnosis</div>
        <div className="border-b border-gray-400 min-h-[1.25rem] text-sm pb-1">{consultation.diagnosis}</div>
      </div>
      <div className="grid grid-cols-2 gap-8 mt-12 pt-4">
        <div className="text-center">
          <div className="border-b border-gray-800 h-6"></div>
          <div className="text-xs mt-1">Patient's Signature</div>
        </div>
        <div className="text-center">
          <div className="border-b border-gray-800 h-6 italic text-sm flex items-end justify-center pb-0.5">{consultation.physician || 'Dr. ____________'}</div>
          <div className="text-xs mt-1">Attending Physician<br/>Signature Over Printed Name</div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-3 text-[10px] text-gray-700 mt-2 font-semibold">
      <div>Original: Audit</div>
      <div className="text-center">Pink: Attending Physician</div>
      <div className="text-right">Yellow: WUP-Care</div>
    </div>
    <div className="text-center text-[10px] text-emerald-700 font-bold mt-2">— {copy} —</div>
  </div>
  );
};

export default ConsultationsView;
