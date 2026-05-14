// LocalStorage-backed API. Mirrors the previous backend's surface so views
// don't need to know whether data lives in Postgres or the browser.
// All methods are async to match the original API.

import {
  initialMembers,
  initialConsultations,
  initialLOAs,
  initialSOAs,
  initialSystemUsers,
  initialAuditLogs,
  initialSettings,
} from '../data/seedData.js';

const DB_KEY = 'wecare_db';
const TOKEN_KEY = 'wecare_token';
const USER_KEY = 'wecare_user';

// ---------- DB helpers ----------
const loadDB = () => {
  const raw = localStorage.getItem(DB_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through to seed */ }
  }
  const seeded = {
    members: structuredClone(initialMembers),
    consultations: structuredClone(initialConsultations),
    loas: structuredClone(initialLOAs),
    soas: structuredClone(initialSOAs),
    users: structuredClone(initialSystemUsers),
    audit: structuredClone(initialAuditLogs),
    notifications: [],
    settings: structuredClone(initialSettings),
  };
  localStorage.setItem(DB_KEY, JSON.stringify(seeded));
  return seeded;
};

const saveDB = (db) => localStorage.setItem(DB_KEY, JSON.stringify(db));

const nextId = (prefix, existing) => {
  const nums = existing
    .map(x => parseInt(String(x.id || '').replace(/\D/g, ''), 10))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return prefix + String(max + 1).padStart(3, '0');
};

const nextSerial = (prefix, existing) => {
  const nums = existing
    .map(x => parseInt(x.serialNo || '0', 10))
    .filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  const padded = String(max + 1).padStart(6, '0');
  return { id: `${prefix}-${padded}`, serialNo: padded };
};

const todayISO = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

const getCurrentUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); }
  catch { return null; }
};

const requireUser = () => {
  const u = getCurrentUser();
  if (!u) throw new Error('Not signed in.');
  return u;
};

const addAudit = (db, action, description) => {
  const u = getCurrentUser();
  db.audit.unshift({
    id: nextId('A', db.audit),
    timestamp: todayISO(),
    user: u?.name || 'System',
    role: u?.role || 'system',
    action,
    description,
    ip: 'local',
  });
};

const pushNotification = (db, n) => {
  db.notifications.unshift({
    id: nextId('N', db.notifications),
    type: n.type || 'info',
    title: n.title,
    message: n.message,
    recipientRole: n.recipientRole || null,
    relatedConsultationId: n.relatedConsultationId || null,
    relatedMemberId: n.relatedMemberId || null,
    read: false,
    createdAt: todayISO(),
  });
};

// ---------- Auth ----------
const setAuthToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};
const getAuthToken = () => localStorage.getItem(TOKEN_KEY);

const sanitizeUser = (u) => {
  if (!u) return null;
  const { password, ...rest } = u;
  return rest;
};

const login = async ({ username, password }) => {
  const db = loadDB();
  const uname = (username || '').trim().toLowerCase();
  const user = db.users.find(u =>
    (u.username || '').toLowerCase() === uname ||
    (u.email || '').toLowerCase() === uname
  );
  if (!user) throw new Error('Invalid username or password.');
  if (user.password !== password) throw new Error('Invalid username or password.');
  if (!user.active) throw new Error('Your account is disabled. Contact your administrator.');

  // Members must be approved before they can sign in.
  if (user.role === 'member') {
    const m = db.members.find(x => x.id === user.memberId);
    if (!m || m.approvalStatus !== 'Approved') {
      throw new Error('Your account is awaiting Coordinator approval.');
    }
  }

  user.lastLogin = today();
  addAudit(db, 'Login', `${user.name} signed in to WeCare`);
  saveDB(db);

  const token = `local-${user.id}-${Date.now()}`;
  return { token, user: sanitizeUser(user) };
};

const register = async (regData) => {
  const db = loadDB();

  // Reject duplicate employee IDs or emails to mirror typical backend rules.
  if (regData.employeeId && db.members.some(m => m.employeeId === regData.employeeId)) {
    throw new Error('An account with that Employee ID already exists.');
  }
  if (regData.email && db.users.some(u => (u.email || '').toLowerCase() === regData.email.toLowerCase())) {
    throw new Error('An account with that email already exists.');
  }

  const memberId = nextId('M', db.members);
  const dependents = (regData.dependents || []).map((d, i) => ({
    id: `D${Date.now()}${i}`,
    name: d.name,
    relationship: d.relationship,
    age: parseInt(d.age) || 0,
    photo: d.photo || null,
    validId: d.validId || null,
    validIdName: d.validIdName || null,
  }));

  const member = {
    id: memberId,
    employeeId: regData.employeeId,
    name: regData.name,
    department: regData.department,
    status: 'Permanent',
    photo: regData.photo || null,
    email: regData.email,
    phone: regData.phone,
    age: parseInt(regData.age) || 0,
    gender: regData.gender,
    civilStatus: regData.civilStatus,
    dateHired: today(),
    active: true,
    approvalStatus: 'Pending',
    approvedBy: null,
    approvedAt: null,
    dependents,
  };
  db.members.push(member);

  // Create a paired member-user account; remains inactive until approved.
  const username = (regData.email || regData.employeeId || regData.firstName || 'member')
    .split('@')[0]
    .toLowerCase();
  const user = {
    id: nextId('U', db.users),
    name: regData.name,
    username,
    password: regData.password,
    email: regData.email,
    role: 'member',
    active: true,
    memberId,
    photo: regData.photo || null,
    lastLogin: null,
    createdAt: todayISO(),
  };
  db.users.push(user);

  addAudit(db, 'Create', `New member registration submitted: ${regData.name}`);
  pushNotification(db, {
    type: 'pending-member',
    title: 'New member registration',
    message: `${regData.name} has registered and is awaiting approval.`,
    recipientRole: 'coordinator',
    relatedMemberId: memberId,
  });
  saveDB(db);
  return { ok: true };
};

const changePassword = async ({ currentPassword, newPassword }) => {
  const u = requireUser();
  const db = loadDB();
  const user = db.users.find(x => x.id === u.id);
  if (!user) throw new Error('Account not found.');
  if (user.password !== currentPassword) throw new Error('Current password is incorrect.');
  user.password = newPassword;
  addAudit(db, 'Update', `${user.name} changed their password`);
  saveDB(db);
  return { ok: true };
};

const updatePhoto = async (photo) => {
  const u = requireUser();
  const db = loadDB();
  const user = db.users.find(x => x.id === u.id);
  if (!user) throw new Error('Account not found.');
  user.photo = photo;
  // Mirror photo to the linked member record so member directory stays in sync.
  if (user.memberId) {
    const m = db.members.find(x => x.id === user.memberId);
    if (m) m.photo = photo;
  }
  saveDB(db);
  return sanitizeUser(user);
};

// ---------- Members ----------
const getMembers = async () => loadDB().members;

const createMember = async (data) => {
  const db = loadDB();
  const id = nextId('M', db.members);
  const member = {
    id,
    employeeId: data.employeeId,
    name: data.name,
    department: data.department,
    status: data.status || 'Permanent',
    photo: data.photo || null,
    email: data.email,
    phone: data.phone,
    age: parseInt(data.age) || 0,
    gender: data.gender,
    dateHired: data.dateHired || today(),
    active: data.active !== false,
    approvalStatus: 'Approved',
    approvedBy: getCurrentUser()?.name || null,
    approvedAt: today(),
    dependents: data.dependents || [],
  };
  db.members.push(member);

  // Auto-create a member-user with the supplied password so they can sign in.
  if (data.password) {
    const username = (data.email || data.employeeId).split('@')[0].toLowerCase();
    db.users.push({
      id: nextId('U', db.users),
      name: data.name,
      username,
      password: data.password,
      email: data.email,
      role: 'member',
      active: true,
      memberId: id,
      photo: data.photo || null,
      lastLogin: null,
      createdAt: todayISO(),
    });
  }
  addAudit(db, 'Create', `Created member: ${data.name}`);
  saveDB(db);
  return member;
};

const updateMember = async (id, data) => {
  const db = loadDB();
  const idx = db.members.findIndex(m => m.id === id);
  if (idx === -1) throw new Error('Member not found.');
  // Strip password — only writable via auth endpoints.
  const { password, ...patch } = data;
  db.members[idx] = { ...db.members[idx], ...patch };
  addAudit(db, 'Update', `Updated member: ${db.members[idx].name}`);
  saveDB(db);
  return db.members[idx];
};

const deleteMember = async (id) => {
  const db = loadDB();
  const m = db.members.find(x => x.id === id);
  db.members = db.members.filter(x => x.id !== id);
  db.consultations = db.consultations.filter(c => c.memberId !== id);
  db.loas = db.loas.filter(l => l.memberId !== id);
  db.soas = db.soas.filter(s => s.memberId !== id);
  db.users = db.users.filter(u => u.memberId !== id);
  if (m) addAudit(db, 'Delete', `Deleted member: ${m.name}`);
  saveDB(db);
  return { ok: true };
};

const approveMember = async (id) => {
  const db = loadDB();
  const m = db.members.find(x => x.id === id);
  if (!m) throw new Error('Member not found.');
  const approver = getCurrentUser();
  m.approvalStatus = 'Approved';
  m.approvedBy = approver?.name || null;
  m.approvedAt = today();
  // Make sure the paired user account is active.
  const user = db.users.find(u => u.memberId === id);
  if (user) user.active = true;
  addAudit(db, 'Approve', `Approved member: ${m.name}`);
  saveDB(db);
  return m;
};

const rejectMember = async (id, reason) => {
  const db = loadDB();
  const m = db.members.find(x => x.id === id);
  if (!m) throw new Error('Member not found.');
  m.approvalStatus = 'Rejected';
  m.rejectionReason = reason || '';
  m.approvedBy = getCurrentUser()?.name || null;
  m.approvedAt = today();
  const user = db.users.find(u => u.memberId === id);
  if (user) user.active = false;
  addAudit(db, 'Reject', `Rejected member registration: ${m.name}`);
  saveDB(db);
  return m;
};

// ---------- Consultations ----------
const getConsultations = async () => loadDB().consultations;

const createConsultation = async (data) => {
  const db = loadDB();
  const { id, serialNo } = nextSerial('C', db.consultations);
  const consultation = {
    id,
    serialNo: data.serialNo || serialNo,
    memberId: data.memberId,
    dependentId: data.dependentId || null,
    date: data.date,
    patientType: data.patientType || 'Consultation',
    chiefComplaints: data.chiefComplaints || '',
    peFindings: data.peFindings || '',
    plan: data.plan || '',
    diagnosis: data.diagnosis || '',
    status: data.status || 'Pending',
    physician: data.physician || '',
    createdAt: todayISO(),
    documentUploaded: !!data.documentUploaded,
    documentName: data.documentName || null,
    requestedBy: data.requestedBy || null,
  };
  db.consultations.push(consultation);
  const member = db.members.find(m => m.id === consultation.memberId);
  addAudit(db, 'Create', `Created consultation #${serialNo}${member ? ' for ' + member.name : ''}`);
  saveDB(db);
  return consultation;
};

const updateConsultation = async (id, data) => {
  const db = loadDB();
  const idx = db.consultations.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Consultation not found.');
  db.consultations[idx] = { ...db.consultations[idx], ...data };
  saveDB(db);
  return db.consultations[idx];
};

const deleteConsultation = async (id) => {
  const db = loadDB();
  const c = db.consultations.find(x => x.id === id);
  db.consultations = db.consultations.filter(x => x.id !== id);
  if (c) addAudit(db, 'Delete', `Deleted consultation #${c.serialNo}`);
  saveDB(db);
  return { ok: true };
};

// ---------- LOAs ----------
const getLoas = async () => loadDB().loas;

const createLoa = async (data) => {
  const db = loadDB();
  const { id, serialNo } = nextSerial('L', db.loas);
  const loa = {
    id,
    serialNo,
    consultationId: data.consultationId || null,
    memberId: data.memberId,
    hospital: data.hospital,
    procedures: data.procedures,
    approvedAmount: Number(data.approvedAmount) || 0,
    requestingDoctor: data.requestingDoctor || '',
    status: data.status || 'Pending',
    dateIssued: data.dateIssued || today(),
    validity: data.validity || db.settings.loaValidityDays || 7,
    clinicalImpression: data.clinicalImpression || '',
    rbPerDay: data.rbPerDay || '',
    mbl: data.mbl || '',
  };
  db.loas.push(loa);
  addAudit(db, 'Create', `Created LOA #${serialNo}`);
  saveDB(db);
  return loa;
};

const updateLoa = async (id, data) => {
  const db = loadDB();
  const idx = db.loas.findIndex(l => l.id === id);
  if (idx === -1) throw new Error('LOA not found.');
  db.loas[idx] = { ...db.loas[idx], ...data };
  saveDB(db);
  return db.loas[idx];
};

const approveLoa = async (id) => {
  const db = loadDB();
  const loa = db.loas.find(l => l.id === id);
  if (!loa) throw new Error('LOA not found.');
  loa.status = 'Approved';
  loa.approvedBy = getCurrentUser()?.name || null;
  loa.approvedAt = todayISO();
  addAudit(db, 'Approve', `Approved LOA #${loa.serialNo}`);
  saveDB(db);
  return loa;
};

const rejectLoa = async (id, reason) => {
  const db = loadDB();
  const loa = db.loas.find(l => l.id === id);
  if (!loa) throw new Error('LOA not found.');
  loa.status = 'Rejected';
  loa.rejectionReason = reason || '';
  loa.approvedBy = getCurrentUser()?.name || null;
  loa.approvedAt = todayISO();
  addAudit(db, 'Reject', `Rejected LOA #${loa.serialNo}`);
  saveDB(db);
  return loa;
};

const recordLoaVisit = async (id, data) => {
  const db = loadDB();
  const loa = db.loas.find(l => l.id === id);
  if (!loa) throw new Error('LOA not found.');
  loa.status = 'Used';
  loa.visitDate = data.visitDate;
  loa.doctorSeen = data.doctorSeen || '';
  loa.visitNotes = data.visitNotes || '';
  addAudit(db, 'Update', `Recorded hospital visit for LOA #${loa.serialNo}`);
  saveDB(db);
  return loa;
};

// ---------- SOAs ----------
const getSoas = async () => loadDB().soas;

const createSoa = async (data) => {
  const db = loadDB();
  const soa = {
    id: nextId('S', db.soas),
    loaId: data.loaId,
    memberId: data.memberId,
    dateUploaded: data.dateUploaded || today(),
    laboratory: Number(data.laboratory) || 0,
    xray: Number(data.xray) || 0,
    medicines: Number(data.medicines) || 0,
    professionalFee: Number(data.professionalFee) || 0,
    others: Number(data.others) || 0,
    total: Number(data.total) || 0,
    documents: data.documents || [],
    fileDescriptions: data.fileDescriptions || [],
    incompleteItems: data.incompleteItems || [],
    lineItems: data.lineItems || [],
    remarks: data.remarks || '',
    status: data.status || 'Pending',
    uploadedBy: data.uploadedBy || getCurrentUser()?.name || null,
    uploadedAt: data.uploadedAt || todayISO(),
    reviewedBy: null,
    reviewedAt: null,
    document: data.documents?.[0]?.name || null,
  };
  db.soas.push(soa);
  addAudit(db, 'Create', `Uploaded SOA for LOA ${soa.loaId}`);
  saveDB(db);
  return soa;
};

const reviewSoa = async (id) => {
  const db = loadDB();
  const soa = db.soas.find(s => s.id === id);
  if (!soa) throw new Error('SOA not found.');
  soa.status = 'Reviewed';
  soa.reviewedBy = getCurrentUser()?.name || null;
  soa.reviewedAt = today();
  addAudit(db, 'Approve', `Reviewed SOA ${soa.id} — ₱${soa.total.toLocaleString()} deducted`);
  saveDB(db);
  return soa;
};

const rejectSoa = async (id) => {
  const db = loadDB();
  const soa = db.soas.find(s => s.id === id);
  if (!soa) throw new Error('SOA not found.');
  soa.status = 'Rejected';
  soa.reviewedBy = getCurrentUser()?.name || null;
  soa.reviewedAt = today();
  addAudit(db, 'Reject', `Rejected SOA ${soa.id}`);
  saveDB(db);
  return soa;
};

// ---------- Users ----------
const getUsers = async () => loadDB().users.map(sanitizeUser);

const createUser = async (data) => {
  const db = loadDB();
  if (db.users.some(u => (u.username || '').toLowerCase() === (data.username || '').toLowerCase())) {
    throw new Error('A user with that username already exists.');
  }
  const user = {
    id: nextId('U', db.users),
    name: data.name,
    username: data.username,
    password: data.password,
    email: data.email,
    role: data.role,
    active: data.active !== false,
    memberId: data.memberId || null,
    photo: data.photo || null,
    lastLogin: null,
    createdAt: data.createdAt || todayISO(),
  };
  db.users.push(user);
  addAudit(db, 'Create', `Created user account: ${user.name} (${user.role})`);
  saveDB(db);
  return sanitizeUser(user);
};

const updateUser = async (id, data) => {
  const db = loadDB();
  const idx = db.users.findIndex(u => u.id === id);
  if (idx === -1) throw new Error('User not found.');
  // If no password supplied, keep the existing one.
  const existing = db.users[idx];
  const next = { ...existing, ...data };
  if (!data.password) next.password = existing.password;
  db.users[idx] = next;
  addAudit(db, 'Update', `Updated user: ${next.name}`);
  saveDB(db);
  return sanitizeUser(next);
};

const deleteUser = async (id) => {
  const db = loadDB();
  const u = db.users.find(x => x.id === id);
  db.users = db.users.filter(x => x.id !== id);
  if (u) addAudit(db, 'Delete', `Deleted user: ${u.name}`);
  saveDB(db);
  return { ok: true };
};

// ---------- Settings ----------
const getSettings = async () => loadDB().settings;

const updateSettings = async (data) => {
  const db = loadDB();
  db.settings = { ...db.settings, ...data };
  addAudit(db, 'Update', 'Updated system settings');
  saveDB(db);
  return db.settings;
};

// ---------- Notifications ----------
const getNotifications = async () => {
  const u = getCurrentUser();
  const db = loadDB();
  if (!u) return [];
  return db.notifications.filter(n => !n.recipientRole || n.recipientRole === u.role);
};

const createNotification = async (data) => {
  const db = loadDB();
  pushNotification(db, data);
  saveDB(db);
  return db.notifications[0];
};

const markNotificationRead = async (id) => {
  const db = loadDB();
  const n = db.notifications.find(x => x.id === id);
  if (n) n.read = true;
  saveDB(db);
  return n || null;
};

const markAllNotificationsRead = async () => {
  const u = getCurrentUser();
  const db = loadDB();
  db.notifications.forEach(n => {
    if (!u || !n.recipientRole || n.recipientRole === u.role) n.read = true;
  });
  saveDB(db);
  return { ok: true };
};

const deleteNotification = async (id) => {
  const db = loadDB();
  db.notifications = db.notifications.filter(n => n.id !== id);
  saveDB(db);
  return { ok: true };
};

// ---------- Audit ----------
const getAudit = async () => loadDB().audit;

// ---------- Logout ----------
const logout = () => {
  setAuthToken(null);
  localStorage.removeItem(USER_KEY);
};

export const api = {
  // Auth
  login,
  register,
  changePassword,
  updatePhoto,

  // Members
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  approveMember,
  rejectMember,

  // Consultations
  getConsultations,
  createConsultation,
  updateConsultation,
  deleteConsultation,

  // LOAs
  getLoas,
  createLoa,
  updateLoa,
  approveLoa,
  rejectLoa,
  recordLoaVisit,

  // SOAs
  getSoas,
  createSoa,
  reviewSoa,
  rejectSoa,

  // Users
  getUsers,
  createUser,
  updateUser,
  deleteUser,

  // Settings
  getSettings,
  updateSettings,

  // Notifications
  getNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,

  // Audit
  getAudit,

  // Session
  setAuthToken,
  getAuthToken,
  logout,
};
