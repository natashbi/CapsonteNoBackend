import { useState, useMemo, useRef } from 'react';
import {
  Search, X, Check, Upload, FileText, AlertCircle, Printer,
  Clock, Receipt, Wallet, Activity, Stethoscope
} from 'lucide-react';
import TopBar from '../components/TopBar.jsx';
import Modal from '../components/shared/Modal.jsx';
import Field from '../components/shared/Field.jsx';
import ConfirmModal from '../components/shared/ConfirmModal.jsx';
import { useToast } from '../components/shared/Toast.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { api } from '../services/api.js';
import { formatDate, formatPeso, formatPesoShort } from '../utils/helpers.js';

// ============ SOA VIEW ============
const SOAView = ({ soas, setSoas, loas, members, user, onMenuToggle }) => {
  const { coverageLimit } = useSettings();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [confirmReject, setConfirmReject] = useState(null);
  const [saving, setSaving] = useState(false);
  const [printSoa, setPrintSoa] = useState(null);

  const toast = useToast();
  const isCoordinator = user.role === 'coordinator';
  const isMember = user.role === 'member';

  const filtered = useMemo(() => {
    let list = isMember ? soas.filter(s => s.memberId === user.memberId) : soas;
    if (filter !== 'All') list = list.filter(s => (s.status || 'Pending') === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => {
        const m = members.find(x => x.id === s.memberId);
        return m?.name.toLowerCase().includes(q) || s.loaId.toLowerCase().includes(q);
      });
    }
    return list.slice().reverse();
  }, [soas, search, filter, members, user, isMember]);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      const created = await api.createSoa({
        ...data,
        status: 'Pending',
        uploadedBy: user.name,
        uploadedAt: new Date().toISOString(),
      });
      setSoas(prev => [...prev, created]);
      setShowModal(false);
      toast('SOA submitted successfully.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to save SOA', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (id) => {
    try {
      const updated = await api.reviewSoa(id);
      setSoas(prev => prev.map(s => s.id === id ? updated : s));
      toast('SOA reviewed and deducted from member balance.', 'success');
    } catch (err) {
      toast(err.message || 'Failed to review SOA', 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      const updated = await api.rejectSoa(id);
      setSoas(prev => prev.map(s => s.id === id ? updated : s));
      toast('SOA rejected.', 'warning');
    } catch (err) {
      toast(err.message || 'Failed to reject SOA', 'error');
    }
  };

  const handleViewDocument = (soa) => {
    if (!soa.documents || soa.documents.length === 0) {
      toast('No documents attached to this SOA.', 'warning');
      return;
    }

    if (soa.documents.length === 1) {
      const doc = soa.documents[0];
      if (doc.data) {
        const a = document.createElement('a');
        a.href = doc.data;
        a.download = doc.name || 'SOA_document';
        a.click();
      } else if (doc.name) {
        toast(`Document on file: ${doc.name}`, 'warning');
      }
    } else {
      toast(`${soa.documents.length} documents attached. Download individual files from the document list.`, 'info');
    }
  };

  const handlePrint = (soa) => {
    setPrintSoa(soa);
  };

  const totalExpenses = filtered.reduce((s, x) => s + x.total, 0);
  const pendingCount = soas.filter(s => (s.status || 'Pending') === 'Pending').length;

  // Get all LOAs available for SOA upload (for coordinator upload form)
  const allAvailableLOAs = useMemo(() => {
    return loas.filter(l =>
      (l.status === 'Approved' || l.status === 'Used' || l.status === 'Completed') &&
      !soas.some(s => s.loaId === l.id)
    );
  }, [loas, soas]);

  return (
    <>
      <TopBar
        title={isMember ? 'History' : 'SOA Management'}
        subtitle={isMember ? 'View all expense statements uploaded by your Coordinator' : 'Upload and review statements of account from members'}
        onMenuToggle={onMenuToggle}
      >
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full md:w-56 pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-600" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none">
          <option>All</option><option>Pending</option><option>Reviewed</option><option>Rejected</option>
        </select>
      </TopBar>

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {isCoordinator && pendingCount > 0 && filter !== 'Pending' && (
          <div className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 flex items-center gap-3">
            <Clock className="w-6 h-6 text-yellow-700 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-emerald-900 text-sm">{pendingCount} SOA{pendingCount !== 1 ? 's' : ''} awaiting your review</div>
              <div className="text-xs text-gray-700">Review uploaded statements and deduct amounts from member balances.</div>
            </div>
            <button onClick={() => setFilter('Pending')} className="bg-emerald-800 hover:bg-emerald-900 text-white px-3 py-2 rounded-lg text-xs font-semibold">Review</button>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
          {[
            { label: isMember ? 'History' : 'Total SOAs', value: filtered.length, icon: Receipt, color: 'emerald' },
            { label: isMember ? 'Total Claimed' : 'Total Expenses', value: formatPesoShort(totalExpenses), icon: Wallet, color: 'yellow' },
            { label: 'Laboratory', value: formatPesoShort(filtered.reduce((s,x) => s + x.laboratory, 0)), icon: Activity, color: 'emerald' },
            { label: 'Medicines', value: formatPesoShort(filtered.reduce((s,x) => s + x.medicines, 0)), icon: Stethoscope, color: 'yellow' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 md:p-5 border border-gray-200 shadow-sm">
              <div className={`w-8 md:w-10 h-8 md:h-10 rounded-lg mb-2 md:mb-3 flex items-center justify-center ${
                s.color === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'
              }`}>
                <s.icon className="w-4 md:w-5 h-4 md:h-5" />
              </div>
              <div className="font-display text-lg md:text-xl font-semibold text-emerald-900">{s.value}</div>
              <div className="text-xs md:text-sm text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Member info: upload handled by coordinator */}
        {isMember && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-blue-900">Coordinator uploads SOAs</div>
              <div className="text-xs text-blue-800 mt-1">Your Coordinator will upload your statement of account for review. You can view all your expenses below.</div>
            </div>
          </div>
        )}

        {/* Coordinator upload button */}
        {isCoordinator && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowModal(true)}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-3 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-1.5 md:gap-2 shadow-sm"
            >
              <Upload className="w-3.5 md:w-4 h-3.5 md:h-4" /> <span className="hidden md:inline">Upload SOA for Member</span><span className="md:hidden">Upload SOA</span>
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-emerald-50 to-yellow-50">
                <tr>
                  {['LOA #', 'Member', 'Date', 'Lab', 'X-ray', 'Meds', 'Prof. Fee', 'Others', 'Total', 'Status', 'Actions'].map(h => (
                    <th key={h} className={`text-left font-bold text-emerald-900 uppercase tracking-wider px-2 md:px-3 py-2 md:py-4 text-[10px] md:text-xs ${['X-ray', 'Others'].includes(h) ? 'hidden md:table-cell' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s, idx) => {
                  const m = members.find(x => x.id === s.memberId);
                  const status = s.status || 'Pending';
                  const linkedLoa = loas.find(l => l.id === s.loaId);
                  const overLoa = linkedLoa && s.total > linkedLoa.approvedAmount;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 animate-fadeInUp" style={{ animationDelay: `${idx * 30}ms` }}>
                      <td className="px-2 md:px-3 py-2 md:py-3 font-mono text-xs md:text-sm font-semibold text-emerald-900">{s.loaId}</td>
                      <td className="px-2 md:px-3 py-2 md:py-3 text-xs md:text-sm font-medium text-gray-900 max-w-[100px] md:max-w-[150px] truncate">{m?.name}</td>
                      <td className="px-2 md:px-3 py-2 md:py-3 text-xs text-gray-600 whitespace-nowrap">{formatDate(s.dateUploaded)}</td>
                      <td className="px-2 md:px-3 py-2 md:py-3 text-xs text-gray-700">{formatPesoShort(s.laboratory)}</td>
                      <td className="px-2 md:px-3 py-2 md:py-3 text-xs text-gray-700 hidden md:table-cell">{formatPesoShort(s.xray)}</td>
                      <td className="px-2 md:px-3 py-2 md:py-3 text-xs text-gray-700">{formatPesoShort(s.medicines)}</td>
                      <td className="px-2 md:px-3 py-2 md:py-3 text-xs text-gray-700">{formatPesoShort(s.professionalFee || 0)}</td>
                      <td className="px-2 md:px-3 py-2 md:py-3 text-xs text-gray-700 hidden md:table-cell">{formatPesoShort(s.others)}</td>
                      <td className="px-2 md:px-3 py-2 md:py-3">
                        <div className={`text-xs md:text-sm font-semibold ${overLoa ? 'text-red-700' : 'text-emerald-900'}`}>
                          {formatPesoShort(s.total)}
                          {overLoa && <span className="ml-1 text-[8px] md:text-[9px] font-bold bg-red-100 text-red-700 px-1 md:px-1.5 py-0.5 rounded-full align-middle whitespace-nowrap">OVER</span>}
                        </div>
                      </td>
                      <td className="px-2 md:px-3 py-2 md:py-3">
                        <span className={`text-[9px] md:text-[10px] font-bold px-1.5 md:px-2 py-0.5 md:py-1 rounded-full whitespace-nowrap ${
                          status === 'Reviewed' ? 'bg-emerald-100 text-emerald-800' :
                          status === 'Rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-900'
                        }`}>{status}</span>
                      </td>
                      <td className="px-2 md:px-3 py-2 md:py-3">
                        <div className="flex items-center gap-0.5 md:gap-1">
                          <button
                            onClick={() => handleViewDocument(s)}
                            className="w-6 md:w-7 h-6 md:h-7 rounded-lg hover:bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0"
                            title={s.document ? `Download: ${s.document}` : 'No document'}
                          >
                            <FileText className="w-3 md:w-3.5 h-3 md:h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePrint(s)}
                            className="w-6 md:w-7 h-6 md:h-7 rounded-lg hover:bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0"
                            title="Print SOA"
                          >
                            <Printer className="w-3 md:w-3.5 h-3 md:h-3.5" />
                          </button>
                          {isCoordinator && status === 'Pending' && (
                            <>
                              <button onClick={() => setConfirmReject(s)} className="w-6 md:w-7 h-6 md:h-7 rounded-lg hover:bg-red-50 text-red-700 flex items-center justify-center flex-shrink-0" title="Reject">
                                <X className="w-3 md:w-3.5 h-3 md:h-3.5" />
                              </button>
                              <button onClick={() => handleReview(s.id)} className="px-1.5 md:px-2 h-6 md:h-7 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white flex items-center gap-0.5 text-[9px] md:text-[10px] font-semibold flex-shrink-0" title="Approve & deduct">
                                <Check className="w-2.5 md:w-3 h-2.5 md:h-3" /> <span className="hidden md:inline">Review</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="p-12 text-center text-gray-400">
                    {isMember ? 'No SOAs uploaded yet.' : 'No SOAs to review.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {confirmReject && (
        <ConfirmModal
          title="Reject SOA"
          message="Reject this SOA? The member will need to resubmit."
          confirmLabel="Reject"
          confirmColor="red"
          onConfirm={() => handleReject(confirmReject.id)}
          onClose={() => setConfirmReject(null)}
        />
      )}
      {printSoa && (
        <SOAPrintView soa={printSoa} members={members} loas={loas} onClose={() => setPrintSoa(null)} />
      )}
      {showModal && isCoordinator && (
        <SOAFormModal loas={allAvailableLOAs} members={members} user={user} onSave={handleSave} onClose={() => setShowModal(false)} saving={saving} />
      )}
    </>
  );
};

// ============ SOA FORM MODAL (COORDINATOR ONLY) ============
const SOAFormModal = ({ loas, members, user, onSave, onClose, saving }) => {
  const [form, setForm] = useState({
    loaId: '', memberId: '', dateUploaded: new Date().toISOString().slice(0,10),
    laboratory: 0, xray: 0, medicines: 0, professionalFee: 0, others: 0, total: 0, documents: [],
    fileDescriptions: [], incompleteItems: [], lineItems: [], remarks: ''
  });
  const [error, setError] = useState('');

  const fileRef = useRef(null);

  const total = Number(form.laboratory||0) + Number(form.xray||0) + Number(form.medicines||0) + Number(form.professionalFee||0) + Number(form.others||0);
  const selectedLoa = loas.find(l => l.id === form.loaId);
  const liveOverBudget = selectedLoa && total > selectedLoa.approvedAmount;

  const handleLOAChange = (loaId) => {
    const l = loas.find(x => x.id === loaId);
    if (l) setForm({ ...form, loaId, memberId: l.memberId });
  };

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    let processed = 0;
    const newDocuments = [];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        newDocuments.push({ name: file.name, data: ev.target.result });
        processed++;
        if (processed === files.length) {
          setForm(prev => ({ ...prev, documents: [...prev.documents, ...newDocuments] }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDocument = (index) => {
    setForm(prev => ({ 
      ...prev, 
      documents: prev.documents.filter((_, i) => i !== index),
      fileDescriptions: prev.fileDescriptions.filter((_, i) => i !== index)
    }));
  };

  const updateFileDescription = (index, description) => {
    setForm(prev => {
      const newDescriptions = [...prev.fileDescriptions];
      newDescriptions[index] = description;
      return { ...prev, fileDescriptions: newDescriptions };
    });
  };

  const addIncompleteItem = () => {
    setForm(prev => ({
      ...prev,
      incompleteItems: [...prev.incompleteItems, { description: '', reason: '' }]
    }));
  };

  const updateIncompleteItem = (index, field, value) => {
    setForm(prev => {
      const items = [...prev.incompleteItems];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, incompleteItems: items };
    });
  };

  const removeIncompleteItem = (index) => {
    setForm(prev => ({
      ...prev,
      incompleteItems: prev.incompleteItems.filter((_, i) => i !== index)
    }));
  };

  // Line items — itemized charge slip entries (Description, Qty, Unit Price, Amount auto)
  const addLineItem = () => {
    setForm(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { description: '', qty: 1, unitPrice: 0 }]
    }));
  };

  const updateLineItem = (index, field, value) => {
    setForm(prev => {
      const items = [...prev.lineItems];
      const next = { ...items[index], [field]: value };
      // qty / unitPrice are numeric; description stays as text
      if (field === 'qty' || field === 'unitPrice') next[field] = Number(value) || 0;
      items[index] = next;
      return { ...prev, lineItems: items };
    });
  };

  const removeLineItem = (index) => {
    setForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index)
    }));
  };

  const lineItemsTotal = form.lineItems.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  const handleSubmit = () => {
    setError('');
    if (!form.loaId || !form.memberId) { setError('Please link to an LOA'); return; }
    if (total === 0) { setError('Please encode at least one expense'); return; }
    if (form.documents.length === 0) { setError('Please upload at least one SOA document'); return; }

    const loa = loas.find(l => l.id === form.loaId);
    if (loa && total > loa.approvedAmount) {
      setError(`Total (₱${total.toLocaleString()}) exceeds LOA approved amount (₱${loa.approvedAmount.toLocaleString()})`);
      return;
    }

    onSave({ 
      ...form, 
      total, 
      laboratory: Number(form.laboratory||0), 
      xray: Number(form.xray||0), 
      medicines: Number(form.medicines||0), 
      professionalFee: Number(form.professionalFee||0),
      others: Number(form.others||0) 
    });
  };

  const availableLoas = loas;

  return (
    <Modal title="Upload Statement of Account" onClose={onClose} size="md">
      <div className="space-y-5">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
          <span className="text-emerald-900">Upload SOA for member review. The member can view it in their History.</span>
        </div>

        <Field label="Linked LOA" required select placeholder="Select LOA..." value={form.loaId}
          options={availableLoas.map(l => {
            const m = members.find(x => x.id === l.memberId);
            return { value: l.id, label: `#${l.serialNo} — ${m?.name} — ₱${(l.approvedAmount || 0).toLocaleString()}` };
          })}
          onChange={handleLOAChange} />

        <Field label="Date Uploaded" type="date" value={form.dateUploaded} onChange={v => setForm({...form, dateUploaded: v})} />

        <div className="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-xl p-4">
          <div className="text-xs font-semibold text-yellow-900 uppercase tracking-wider mb-2">SOA Documents & Supporting Files</div>
          <div className="text-xs text-yellow-800 mb-3">Upload documents like charge slips, lab requests, x-ray results, and other medical files. Specify what test/procedure each file is for.</div>
          <input ref={fileRef} type="file" accept=".pdf,image/*" multiple onChange={handleFiles} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="w-full bg-white border-2 border-yellow-300 hover:border-emerald-600 rounded-lg p-4 text-center transition-colors">
            <div className="text-gray-600 text-sm">
              <Upload className="w-6 h-6 mx-auto mb-1 text-yellow-700" />
              Click to upload PDFs or images (multiple files)
            </div>
          </button>
          
          {form.documents.length > 0 && (
            <div className="mt-3 space-y-3">
              {form.documents.map((doc, idx) => (
                <div key={idx} className="bg-white border border-yellow-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{doc.name}</span>
                    </div>
                    <button
                      onClick={() => removeDocument(idx)}
                      className="p-1 hover:bg-red-50 text-red-600 rounded flex-shrink-0"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="Specify lab test or procedure (e.g., 'CBC results', 'Chest X-ray', 'Charge slip')" 
                    value={form.fileDescriptions[idx] || ''}
                    onChange={(e) => updateFileDescription(idx, e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded border border-yellow-200 bg-yellow-50 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Expenses Breakdown</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Laboratory (₱)" type="number" value={form.laboratory} onChange={v => setForm({...form, laboratory: v})} />
            <Field label="X-ray / Imaging (₱)" type="number" value={form.xray} onChange={v => setForm({...form, xray: v})} />
            <Field label="Medicines (₱)" type="number" value={form.medicines} onChange={v => setForm({...form, medicines: v})} />
            <Field label="Professional Fee - Doctor (₱)" type="number" value={form.professionalFee} onChange={v => setForm({...form, professionalFee: v})} />
            <Field label="Others (₱)" type="number" value={form.others} onChange={v => setForm({...form, others: v})} />
          </div>
        </div>

        {/* Line Items — itemized charge slip entries */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <label className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Line Items (Charge Slip Detail)</label>
              <p className="text-xs text-emerald-800 mt-0.5">Itemize each charge: description, quantity, unit price.</p>
            </div>
            <button
              type="button"
              onClick={addLineItem}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 rounded hover:bg-emerald-100"
            >
              + Add Item
            </button>
          </div>

          {form.lineItems.length === 0 ? (
            <p className="text-xs text-emerald-700 italic">No line items yet — click "+ Add Item" to start itemizing the charge slip.</p>
          ) : (
            <div className="space-y-2">
              <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-[10px] font-bold text-emerald-900 uppercase tracking-wider">
                <div className="col-span-5">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Unit Price (₱)</div>
                <div className="col-span-2 text-right">Amount (₱)</div>
                <div className="col-span-1"></div>
              </div>
              {form.lineItems.map((item, idx) => {
                const amount = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                return (
                  <div key={idx} className="bg-white rounded-lg p-2 border border-emerald-200 grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      placeholder="e.g., CBC, Paracetamol 500mg, Chest X-ray"
                      value={item.description || ''}
                      onChange={(e) => updateLineItem(idx, 'description', e.target.value)}
                      className="col-span-12 md:col-span-5 text-xs px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-emerald-600"
                    />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="Qty"
                      value={item.qty}
                      onChange={(e) => updateLineItem(idx, 'qty', e.target.value)}
                      className="col-span-4 md:col-span-2 text-xs px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-emerald-600 text-center"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(idx, 'unitPrice', e.target.value)}
                      className="col-span-4 md:col-span-2 text-xs px-2 py-1.5 rounded border border-gray-200 focus:outline-none focus:border-emerald-600 text-right"
                    />
                    <div className="col-span-3 md:col-span-2 text-xs text-right font-semibold text-emerald-900 px-2 py-1.5">
                      ₱{amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="col-span-1 text-red-600 hover:bg-red-50 rounded p-1 flex items-center justify-center"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              <div className="flex justify-end pt-2 border-t border-emerald-200">
                <div className="text-xs text-emerald-800">
                  Line items subtotal:
                  <span className="ml-2 font-bold text-emerald-900">
                    ₱{lineItemsTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Incomplete/Unfinished Procedures Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Incomplete or Unfinished Procedures</label>
            <button 
              type="button"
              onClick={addIncompleteItem}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 px-2 py-1 rounded hover:bg-blue-100"
            >
              + Add Item
            </button>
          </div>
          <p className="text-xs text-blue-800 mb-3">Record procedures or tests that were requested but not completed (e.g., stool sample not provided, member unable to complete procedure).</p>
          
          {form.incompleteItems.length === 0 ? (
            <p className="text-xs text-blue-600 italic">No incomplete items yet</p>
          ) : (
            <div className="space-y-3">
              {form.incompleteItems.map((item, idx) => (
                <div key={idx} className="bg-white rounded-lg p-3 border border-blue-200 space-y-2">
                  <input 
                    type="text"
                    placeholder="Procedure/Test name (e.g., 'Stool sample', 'ECG')"
                    value={item.description || ''}
                    onChange={(e) => updateIncompleteItem(idx, 'description', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded border border-blue-200 bg-blue-50 focus:outline-none focus:border-emerald-600"
                  />
                  <textarea 
                    placeholder="Reason not completed (e.g., 'Member unable to provide stool sample')"
                    value={item.reason || ''}
                    onChange={(e) => updateIncompleteItem(idx, 'reason', e.target.value)}
                    rows={2}
                    className="w-full text-xs px-2 py-1.5 rounded border border-blue-200 bg-blue-50 focus:outline-none focus:border-emerald-600 resize-none"
                  />
                  <button 
                    type="button"
                    onClick={() => removeIncompleteItem(idx)}
                    className="text-xs font-semibold text-red-700 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`rounded-xl p-4 ${liveOverBudget ? 'bg-red-700' : 'bg-gradient-to-r from-emerald-700 to-emerald-900'} text-white`}>
          <div className="flex items-center justify-between">
            <div className="text-white/70 text-xs font-bold uppercase tracking-widest">Total Amount</div>
            <div className="font-display text-3xl font-bold">₱{total.toLocaleString()}</div>
          </div>
          {liveOverBudget && (
            <div className="mt-2 text-xs font-semibold text-red-200 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Exceeds LOA approved amount of ₱{selectedLoa.approvedAmount.toLocaleString()} by ₱{(total - selectedLoa.approvedAmount).toLocaleString()}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Field label="Remarks" textarea value={form.remarks} onChange={v => setForm({...form, remarks: v})} placeholder="Optional notes..." />

        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-md disabled:opacity-60">
            {saving ? 'Saving...' : 'Upload SOA'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ============ SOA PRINT VIEW ============
const SOAPrintView = ({ soa, members, loas, onClose }) => {
  const printRef = useRef(null);
  const member = members.find(m => m.id === soa.memberId);
  const loa = loas.find(l => l.id === soa.loaId);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '', 'height=800,width=900');
      printWindow.document.write(printRef.current.innerHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-emerald-900">Statement of Account</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <div ref={printRef} className="bg-white text-gray-900 font-serif">
            {/* Header */}
            <div className="text-center mb-8 pb-4 border-b-2 border-gray-800">
              <h1 className="text-2xl font-bold mb-2">WeCare Healthcare System</h1>
              <p className="text-sm">Statement of Account (SOA)</p>
            </div>

            {/* Patient Information */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-xs font-bold mb-3 uppercase tracking-wide">Patient Information</p>
                <p className="text-sm"><span className="font-semibold">Name:</span> {member?.name}</p>
                <p className="text-sm"><span className="font-semibold">Member ID:</span> {member?.id}</p>
                <p className="text-sm"><span className="font-semibold">Age:</span> {member?.age || 'N/A'}</p>
                <p className="text-sm"><span className="font-semibold">Address:</span> {member?.address || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold mb-3 uppercase tracking-wide">Account Details</p>
                <p className="text-sm"><span className="font-semibold">LOA #:</span> {loa?.serialNo}</p>
                <p className="text-sm"><span className="font-semibold">LOA Amount:</span> ₱{(loa?.approvedAmount || 0).toLocaleString()}</p>
                <p className="text-sm"><span className="font-semibold">Upload Date:</span> {formatDate(soa.dateUploaded)}</p>
                <p className="text-sm"><span className="font-semibold">Status:</span> <span className={`font-semibold ${
                  soa.status === 'Reviewed' ? 'text-emerald-700' :
                  soa.status === 'Rejected' ? 'text-red-700' :
                  'text-yellow-700'
                }`}>{soa.status || 'Pending'}</span></p>
              </div>
            </div>

            {/* Expense Breakdown */}
            <div className="mb-8">
              <p className="text-xs font-bold mb-4 uppercase tracking-wide border-b-2 border-gray-800 pb-2">Expense Breakdown</p>
              <table className="w-full text-sm mb-4">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="py-2 font-semibold">Laboratory & Diagnostics</td>
                    <td className="py-2 text-right">₱{(soa.laboratory || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="py-2 font-semibold">X-ray / Imaging</td>
                    <td className="py-2 text-right">₱{(soa.xray || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="py-2 font-semibold">Medicines & Supplies</td>
                    <td className="py-2 text-right">₱{(soa.medicines || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="py-2 font-semibold">Professional Fee - Physician</td>
                    <td className="py-2 text-right">₱{(soa.professionalFee || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="py-2 font-semibold">Others</td>
                    <td className="py-2 text-right">₱{(soa.others || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="bg-gray-100">
                    <td className="py-3 font-bold">TOTAL AMOUNT</td>
                    <td className="py-3 text-right font-bold text-lg">₱{(soa.total || 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Line Items */}
            {soa.lineItems && soa.lineItems.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-bold mb-3 uppercase tracking-wide border-b-2 border-gray-800 pb-2">Itemized Charges</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-800">
                      <th className="text-left py-2 font-bold">Description</th>
                      <th className="text-center py-2 font-bold w-16">Qty</th>
                      <th className="text-right py-2 font-bold w-32">Unit Price</th>
                      <th className="text-right py-2 font-bold w-32">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soa.lineItems.map((item, idx) => {
                      const amt = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                      return (
                        <tr key={idx} className="border-b border-gray-300">
                          <td className="py-2">{item.description}</td>
                          <td className="py-2 text-center">{item.qty}</td>
                          <td className="py-2 text-right">₱{(Number(item.unitPrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-2 text-right">₱{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Attached Documents */}
            {soa.documents && soa.documents.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-bold mb-3 uppercase tracking-wide border-b-2 border-gray-800 pb-2">Attached Documents</p>
                <ul className="text-sm space-y-1">
                  {soa.documents.map((doc, idx) => (
                    <li key={doc.id || idx} className="flex items-center justify-between border-b border-gray-200 py-1">
                      <span>📎 {doc.name}</span>
                      <span className="text-xs text-gray-600 italic">{doc.description || '—'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Incomplete Items */}
            {soa.incompleteItems && soa.incompleteItems.length > 0 && (
              <div className="mb-8">
                <p className="text-xs font-bold mb-3 uppercase tracking-wide border-b-2 border-gray-800 pb-2">Incomplete/Unfinished Procedures</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-800">
                      <th className="text-left py-2 font-bold">Procedure/Test</th>
                      <th className="text-left py-2 font-bold">Reason Not Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soa.incompleteItems.map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-300">
                        <td className="py-2">{item.description}</td>
                        <td className="py-2">{item.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Remarks */}
            {soa.remarks && (
              <div className="mb-8">
                <p className="text-xs font-bold mb-2 uppercase tracking-wide">Remarks</p>
                <p className="text-sm bg-gray-50 p-3 rounded border border-gray-300">{soa.remarks}</p>
              </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-8 border-t-2 border-gray-800 text-center">
              <p className="text-xs text-gray-600 mb-2">This statement serves as your billing invoice.</p>
              <p className="text-xs text-gray-600">Print Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">
            Close
          </button>
          <button onClick={handlePrint} className="flex-1 py-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold flex items-center justify-center gap-2">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default SOAView;
