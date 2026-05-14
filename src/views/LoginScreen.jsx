import { useState, useRef } from 'react';
import {
  ChevronRight, AlertCircle, Sparkles, UserPlus, AlertTriangle,
  Shield, Stethoscope, Activity, Heart, Clock, CheckCircle2,
  User, Plus, Trash2, Lock, Eye, EyeOff, Check, ArrowLeft,
  KeyRound, X, Mail
} from 'lucide-react';
import { api } from '../services/api.js';

const LoginScreen = ({ onLogin, onRegister }) => {
  const [logoError, setLogoError] = useState(false);
  const [mode, setMode] = useState('signin');
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [reg, setReg] = useState({
    lastName: '', firstName: '', middleName: '', suffix: '', employeeId: '',
    department: '', email: '', phone: '', age: '', gender: 'Female',
    civilStatus: 'Single',
    password: '', confirmPassword: '', photo: null, dependents: []
  });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regStep, setRegStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const photoInputRef = useRef(null);
  const depPhotoRefs = useRef({});
  const depValidIdRefs = useRef({});

  const handleLogin = async () => {
    setLoginError('');
    if (!username.trim() || !password.trim()) {
      setLoginError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      const result = await api.login({ username: username.trim(), password });
      api.setAuthToken(result.token);
      onLogin(result);
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setReg(prev => ({ ...prev, photo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleDepValidIdUpload = (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReg(prev => ({
        ...prev,
        dependents: prev.dependents.map((d, i) => i === idx ? { ...d, validId: ev.target.result, validIdName: file.name } : d)
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDepPhotoUpload = (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setReg(prev => ({
        ...prev,
        dependents: prev.dependents.map((d, i) => i === idx ? { ...d, photo: ev.target.result } : d)
      }));
    };
    reader.readAsDataURL(file);
  };

  const addDependent = () => {
    if (reg.dependents.length >= 4) {
      setRegError('You can only add up to 4 dependents.');
      return;
    }
    setReg(prev => ({
      ...prev,
      dependents: [...prev.dependents, { name: '', relationship: 'Spouse', age: '', photo: null, validId: null, validIdName: null }]
    }));
  };

  const updateDependent = (idx, field, value) => {
    setReg(prev => ({
      ...prev,
      dependents: prev.dependents.map((d, i) => i === idx ? { ...d, [field]: value } : d)
    }));
  };

  const removeDependent = (idx) => {
    setReg(prev => ({
      ...prev,
      dependents: prev.dependents.filter((_, i) => i !== idx)
    }));
  };

  const handleNext = () => {
    setRegError('');
    if (regStep === 1) {
      if (!reg.photo) { setRegError('Please upload a photo to proceed.'); return; }
      if (!reg.lastName || !reg.firstName || !reg.middleName || !reg.employeeId || !reg.department || !reg.email || !reg.phone || !reg.age) {
        setRegError('Please complete all required fields (marked with *).'); return;
      }
      setRegStep(2);
    } else if (regStep === 2) {
      setRegStep(3);
    }
  };

  const handleRegister = async () => {
    setRegError('');
    if (!reg.photo) { setRegError('Please upload a photo to proceed.'); return; }
    if (reg.dependents.length > 4) { setRegError('You can only register with up to 4 dependents.'); return; }
    const invalidDependent = reg.dependents.find(d => !d.name?.trim() || !d.age);
    if (invalidDependent) { setRegError('Please fill in both name and age for all dependents.'); return; }
    if (!reg.lastName || !reg.firstName || !reg.middleName || !reg.employeeId || !reg.department || !reg.email || !reg.phone || !reg.age || !reg.password) {
      setRegError('Please complete all required fields (marked with *).'); return;
    }
    if (reg.password !== reg.confirmPassword) { setRegError('Passwords do not match.'); return; }
    if (reg.password.length < 8) { setRegError('Password must be at least 8 characters long.'); return; }
    if (!/[0-9]/.test(reg.password)) { setRegError('Password must contain at least one number.'); return; }
    setLoading(true);
    try {
      const fullName = `${reg.lastName}, ${reg.firstName}${reg.middleName ? ' ' + reg.middleName : ''}${reg.suffix ? ' ' + reg.suffix : ''}`;
      await onRegister({ ...reg, name: fullName });
      setRegSuccess(true);
    } catch (err) {
      setRegError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const iCls = 'w-full px-3 py-2.5 md:py-2 rounded-lg border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-sm transition-colors bg-white';
  const lCls = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 md:mb-1';

  return (
    <div className="h-screen bg-gradient-to-br from-emerald-50 via-white to-yellow-50 flex items-center justify-center p-2 md:p-4 relative overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-200 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-300 rounded-full blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2" />

      {/* ─── Master card: fits viewport on all screens ─── */}
      <div className={`relative w-full max-w-[1150px] flex flex-col md:flex-row overflow-hidden rounded-2xl md:rounded-3xl shadow-2xl border border-emerald-100 bg-white transition-all duration-500 ease-in-out max-h-screen md:max-h-[calc(100vh-2rem)]`}>

        {/* ── LEFT: Green branding panel — hidden on mobile, 50% on desktop ── */}
        <div className={`hidden md:flex overflow-hidden transition-all duration-500 ease-in-out ${
          mode === 'register' ? 'md:w-0 md:opacity-0' : 'md:w-1/2 md:opacity-100'
        } w-full`}>
          {/* Inner wrapper matches parent width for smooth animations */}
          <div className="w-full h-full bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-900 p-6 md:p-10 relative flex flex-col">
            <div className="absolute top-0 right-0 w-56 h-56 bg-yellow-400 rounded-full blur-3xl opacity-20 pointer-events-none" />

            <div className="relative flex flex-col h-full">
              {/* WeCare branding */}
              <div className="mb-10">
                <div className="font-display text-lg font-bold leading-none text-white">WeCare</div>
                <div className="text-[11px] text-emerald-300 mt-0.5">Health Care Services</div>
              </div>

              {/* Headline */}
              <h1 className="font-display text-2xl md:text-4xl font-semibold leading-tight mb-3 tracking-tight text-white">
                Care that follows <em className="text-yellow-300 not-italic font-bold">you</em>.
              </h1>
              <p className="text-emerald-100 text-sm leading-relaxed mb-6 max-w-xs">
                Consultation & Medical Assistance Management for Wesleyan University–Philippines.
              </p>

              {/* Feature bullets */}
              <div className="space-y-2.5 flex-1">
                {[
                  { icon: Shield, text: '₱150,000 annual coverage per member' },
                  { icon: Stethoscope, text: 'Streamlined consultations & LOA' },
                  { icon: Activity, text: 'Real-time balance tracking' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-emerald-100">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-3.5 h-3.5 text-yellow-300" />
                    </div>
                    <span className="text-xs">{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="mt-auto pt-5 border-t border-emerald-600/50">
                <div className="text-[10px] text-emerald-300 tracking-widest uppercase">Wesleyan University — Philippines</div>
                <div className="text-xs text-emerald-100 mt-0.5">Mabini Extension, Cabanatuan City</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Form panel — fills remaining flex space ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white transition-all duration-500 ease-in-out">

          {/* ── Main content — flexible layout ── */}
          <div className="flex-1 overflow-y-auto px-3 md:px-8 pt-4 md:pt-8 pb-4 md:pb-6">

            {/* ════ REGISTRATION SUCCESS ════ */}
            {regSuccess ? (
              <div className="h-full flex flex-col items-center justify-center animate-fadeInUp w-full max-w-md mx-auto">

                {/* Animated check hero with pulse ring */}
                <div className="relative mb-5">
                  <span className="absolute inset-0 rounded-full bg-emerald-300 opacity-40 animate-ping" />
                  <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/40 animate-scaleIn">
                    <CheckCircle2 className="w-11 h-11 text-white" strokeWidth={2.5} />
                  </div>
                </div>

                <h2 className="font-display text-3xl font-semibold text-emerald-900 mb-1.5 text-center">
                  Welcome aboard{reg.firstName ? `, ${reg.firstName}` : ''}!
                </h2>
                <p className="text-gray-500 text-sm mb-5 text-center max-w-sm">
                  Your registration has been submitted successfully. We'll let you know once it's reviewed.
                </p>

                {/* Submission summary */}
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl px-3 py-2.5 mb-4 w-full flex items-center gap-3">
                  {reg.photo ? (
                    <img src={reg.photo} alt="" className="w-10 h-10 rounded-lg object-cover border-2 border-emerald-200 flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-emerald-700" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Application for</div>
                    <div className="text-sm font-semibold text-gray-900 truncate">
                      {reg.firstName} {reg.lastName}{reg.suffix ? ` ${reg.suffix}` : ''}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">{reg.email}</div>
                  </div>
                  <div className="bg-yellow-100 text-yellow-900 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md flex-shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Pending
                  </div>
                </div>

                {/* Status timeline */}
                <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 w-full text-left">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">What happens next?</div>
                  <div className="space-y-3">
                    {[
                      { Icon: CheckCircle2, label: 'Application submitted', sub: 'Just now', state: 'done' },
                      { Icon: Clock, label: 'Coordinator review', sub: 'Usually 1–3 business days', state: 'current' },
                      { Icon: Mail, label: 'Email notification', sub: "We'll notify you once approved", state: 'upcoming' },
                      { Icon: KeyRound, label: 'Sign in to WeCare', sub: 'Use your registered credentials', state: 'upcoming' },
                    ].map((step, i, arr) => (
                      <div key={i} className="flex items-start gap-3 relative">
                        {i < arr.length - 1 && (
                          <span className={`absolute left-3 top-6 w-0.5 h-[calc(100%+0.25rem)] -translate-x-1/2 ${
                            step.state === 'done' ? 'bg-emerald-300' : 'bg-gray-200'
                          }`} />
                        )}
                        <div className={`relative w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          step.state === 'done' ? 'bg-emerald-600' :
                          step.state === 'current' ? 'bg-yellow-100 ring-4 ring-yellow-50' :
                          'bg-gray-100'
                        }`}>
                          <step.Icon className={`w-3 h-3 ${
                            step.state === 'done' ? 'text-white' :
                            step.state === 'current' ? 'text-yellow-700' :
                            'text-gray-400'
                          }`} strokeWidth={2.5} />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className={`text-xs font-semibold ${
                            step.state === 'upcoming' ? 'text-gray-500' : 'text-gray-900'
                          }`}>{step.label}</div>
                          <div className="text-[11px] text-gray-500">{step.sub}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Help */}
                <p className="text-[11px] text-gray-400 mb-4 text-center">
                  Questions? Email{' '}
                  <a href="mailto:wecareteam12345@gmail.com" className="text-emerald-700 hover:text-emerald-900 font-semibold">
                    wecareteam12345@gmail.com
                  </a>
                </p>

                <button
                  onClick={() => {
                    setRegSuccess(false);
                    setMode('signin');
                    setRegStep(1);
                    setReg({ lastName: '', firstName: '', middleName: '', suffix: '', employeeId: '', department: '', email: '', phone: '', age: '', gender: 'Female', civilStatus: 'Single', password: '', confirmPassword: '', photo: null, dependents: [] });
                  }}
                  className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-800/20 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Sign In
                </button>
              </div>

            /* ════ SIGN IN FORM ════ */
            ) : mode === 'signin' ? (
              <div className="flex items-center justify-center w-full">
                <div className="flex flex-col justify-start animate-fadeInUp w-full max-w-[520px] px-4 md:px-0">
                {/* Logo - lifted to align with the top box */}
                <div className="mb-2.5 md:mb-0 h-8 md:h-14 flex items-start overflow-visible">
                  {!logoError ? (
                    <img
                      src="/logos/WCLogo.png"
                      alt="WeCare Logo"
                      className="w-12 h-12 md:w-20 md:h-20 object-contain object-top md:-translate-y-5"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <Heart className="w-12 h-12 md:w-20 md:h-20 text-emerald-600 md:-translate-y-12" fill="currentColor" />
                  )}
                </div>

                <div className="mb-4 md:mb-5">
                  <div className="inline-flex items-center gap-1 px-2 md:px-3 py-0.5 md:py-1 bg-yellow-100 text-yellow-900 rounded-full text-[8px] md:text-xs font-medium mb-2">
                    <Sparkles className="w-2 h-2 md:w-3 md:h-3" /> Internal Access
                  </div>
                  <h2 className="font-display text-base md:text-3xl font-semibold text-emerald-900 mb-1.5 md:mb-2">Welcome back</h2>
                  <p className="text-gray-500 text-[10px] md:text-sm leading-tight">Sign in with your registered account credentials.</p>
                </div>

                <div className="space-y-2.5 md:space-y-4">
                  <div>
                    <label className={`${lCls} text-[10px] md:text-[11px]`}>Username or Email</label>
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="Enter your username" className={`${iCls} py-1.5 md:py-2.5 text-sm`} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] md:text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Password</label>
                      <button
                        type="button"
                        onClick={() => setShowForgot(v => !v)}
                        className="text-[10px] md:text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="Enter your password" className={`${iCls} py-1.5 md:py-2.5 text-sm`} />
                  </div>

                  {showForgot && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5 animate-slideIn">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="flex-1 text-xs">
                        <div className="font-semibold text-emerald-900 mb-0.5">Need to reset your password?</div>
                        <p className="text-emerald-800 leading-relaxed">
                          Please contact your WeCare Coordinator or the system Admin. They can reset it for you from the User Management page.
                        </p>
                        <a href="mailto:wecareteam12345@gmail.com" className="inline-flex items-center gap-1 mt-1.5 text-emerald-700 hover:text-emerald-900 font-semibold">
                          <Mail className="w-3 h-3" /> wecareteam12345@gmail.com
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowForgot(false)}
                        className="text-emerald-600 hover:text-emerald-900 flex-shrink-0 p-1 rounded hover:bg-emerald-100"
                        aria-label="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {loginError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 animate-slideIn">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-red-800">{loginError}</div>
                    </div>
                  )}

                  <button onClick={handleLogin} disabled={loading} className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-2 md:py-3 rounded-xl font-semibold text-sm md:text-base transition-all shadow-lg shadow-emerald-800/20 flex items-center justify-center gap-2 disabled:opacity-60">
                    {loading ? 'Signing in…' : <><span>Sign In</span><ChevronRight className="w-4 h-4" /></>}
                  </button>

                  <div className="hidden md:block pt-3 border-t border-gray-100 mb-4">
                    <p className="text-[11px] text-gray-400 text-center mb-2">Demo credentials for testing</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {[
                        { color: 'purple', role: 'Admin (IT)', cred: 'admin / admin123' },
                        { color: 'emerald', role: 'Coordinator', cred: 'coordinator / coord123' },
                        { color: 'yellow', role: 'Director', cred: 'director / director123' },
                        { color: 'blue', role: 'Member', cred: 'j.delacruz / member123' },
                      ].map(({ color, role, cred }) => (
                        <div key={role} className={`bg-${color}-50 rounded-lg p-2`}>
                          <div className={`font-semibold text-${color}-900`}>{role}</div>
                          <div className="text-gray-500 font-mono">{cred}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1 md:pt-4 text-center">
                    <p className="text-xs text-gray-600">Don't have an account?{' '}
                      <button onClick={() => { setMode('register'); setLoginError(''); }} className="text-emerald-700 hover:text-emerald-900 font-semibold transition-colors">
                        Register here
                      </button>
                    </p>
                  </div>
                </div>
                </div>
              </div>

            /* ════ REGISTER FORM (full-width card) ════ */
            ) : (
              <div className="w-full">

              {regStep === 1 ? (
                <div key="step-1" className="animate-fadeInUp w-full">

                {/* Header section */}
                <div className="mb-2 md:mb-4">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-full text-[10px] font-medium mb-1.5 md:mb-2">
                    <UserPlus className="w-2.5 h-2.5" /> New Member Registration
                  </div>
                  <h1 className="font-display text-lg md:text-2xl font-semibold text-emerald-900 leading-tight">Join WeCare Program</h1>
                  <p className="text-gray-500 text-[10px] md:text-xs mt-2 md:mt-2">For permanent employees of Wesleyan University.</p>

                  {/* Step progress — wraps on mobile */}
                  <div className="flex flex-wrap items-center gap-0.5 md:gap-2 mt-3 md:mt-4">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-emerald-700 text-white text-[8px] md:text-[10px] font-bold flex items-center justify-center ring-2 md:ring-4 ring-emerald-100">1</div>
                      <span className="text-[9px] md:text-[11px] text-emerald-900 font-semibold">Profile</span>
                    </div>
                    <div className="w-4 md:w-8 h-0.5 bg-gray-200 rounded-full" />
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gray-200 text-gray-500 text-[8px] md:text-[10px] font-bold flex items-center justify-center">2</div>
                      <span className="text-[9px] md:text-[11px] text-gray-400 font-semibold">Dependents</span>
                    </div>
                    <div className="w-4 md:w-8 h-0.5 bg-gray-200 rounded-full" />
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-gray-200 text-gray-500 text-[8px] md:text-[10px] font-bold flex items-center justify-center">3</div>
                      <span className="text-[9px] md:text-[11px] text-gray-400 font-semibold">Secure</span>
                    </div>
                  </div>
                </div>

                {/* Warning notice — full width below header */}
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-1.5 md:p-4 flex items-start gap-1.5 md:gap-2 mt-4 md:mt-5 mb-2 md:mb-5">
                  <AlertTriangle className="w-3 h-3 md:w-5 md:h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-semibold text-yellow-900 text-[10px] md:text-xs">Coordinator Approval Required</div>
                    <p className="text-yellow-800 text-[9px] md:text-xs mt-0.5 leading-tight md:leading-relaxed">Only permanent employees are eligible. Your account must be approved before you can sign in.</p>
                  </div>
                </div>

                {/* Photo upload row */}
                <div className="flex items-start gap-2 pb-3 md:pb-4 border-b border-gray-100 mb-3 md:mb-5">
                  {reg.photo ? (
                    <img src={reg.photo} alt="Preview" className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-cover border-2 border-emerald-400 shadow-sm flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 md:w-7 md:h-7 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <label className="block text-[9px] md:text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5 md:mb-1.5">Profile Photo <span className="text-red-500 normal-case">*</span></label>
                    <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    <button type="button" onClick={() => photoInputRef.current?.click()} className="bg-emerald-800 hover:bg-emerald-900 text-white px-2.5 md:px-4 py-1 md:py-1.5 rounded-lg font-semibold text-[10px] md:text-xs transition-colors">
                      {reg.photo ? 'Change' : 'Upload'}
                    </button>
                    <span className="text-[8px] md:text-[11px] text-gray-400 ml-0.5 md:ml-2 block md:inline">JPG/PNG, max 2MB</span>
                  </div>
                </div>

                {/* ── Name Row: Responsive columns ── */}
                <div className="mb-2 md:mb-4">
                  <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2">Full Name</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    <div className="sm:col-span-1">
                      <label className={lCls}>Last Name <span className="text-red-500">*</span></label>
                      <input type="text" value={reg.lastName} onChange={e => setReg(p => ({ ...p, lastName: e.target.value }))} placeholder="e.g., Dela Cruz" className={iCls} />
                    </div>
                    <div className="sm:col-span-1">
                      <label className={lCls}>First Name <span className="text-red-500">*</span></label>
                      <input type="text" value={reg.firstName} onChange={e => setReg(p => ({ ...p, firstName: e.target.value }))} placeholder="e.g., Juan" className={iCls} />
                    </div>
                    <div className="sm:col-span-1">
                      <label className={lCls}>Middle Name <span className="text-red-500">*</span></label>
                      <input type="text" value={reg.middleName} onChange={e => setReg(p => ({ ...p, middleName: e.target.value }))} placeholder="e.g., Reyes" className={iCls} />
                    </div>
                    <div className="sm:col-span-1">
                      <label className={lCls}>Suffix</label>
                      <select value={reg.suffix} onChange={e => setReg(p => ({ ...p, suffix: e.target.value }))} className={iCls}>
                        <option value="">— None —</option>
                        <option value="Jr.">Jr.</option>
                        <option value="Sr.">Sr.</option>
                        <option value="II">II</option>
                        <option value="III">III</option>
                        <option value="IV">IV</option>
                        <option value="V">V</option>
                        <option value="Ph.D.">Ph.D.</option>
                        <option value="M.D.">M.D.</option>
                        <option value="D.D.S.">D.D.S.</option>
                        <option value="Esq.">Esq.</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* ── Details + Contact in one row: Responsive columns ── */}
                <div className="mb-2 md:mb-4">
                  <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2">Employee &amp; Contact</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    <div>
                      <label className={lCls}>Employee ID <span className="text-red-500">*</span></label>
                      <input type="text" value={reg.employeeId} onChange={e => setReg(p => ({ ...p, employeeId: e.target.value }))} placeholder="e.g., WUP-2026-001" className={`${iCls} font-mono`} />
                    </div>
                    <div>
                      <label className={lCls}>Department <span className="text-red-500">*</span></label>
                      <input type="text" value={reg.department} onChange={e => setReg(p => ({ ...p, department: e.target.value }))} placeholder="e.g., Nursing, IT, HR" className={iCls} />
                    </div>
                    <div>
                      <label className={lCls}>Email <span className="text-red-500">*</span></label>
                      <input type="email" value={reg.email} onChange={e => setReg(p => ({ ...p, email: e.target.value }))} placeholder="e.g., juan@wup.edu.ph" className={iCls} />
                    </div>
                    <div>
                      <label className={lCls}>Phone <span className="text-red-500">*</span></label>
                      <input type="tel" value={reg.phone} onChange={e => setReg(p => ({ ...p, phone: e.target.value }))} placeholder="e.g., 0917 XXX XXXX" className={iCls} />
                    </div>
                  </div>
                </div>

                {/* ── Personal — Responsive cols ── */}
                <div className="mb-3 md:mb-5">
                  <p className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2">Personal</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className={lCls}>Age <span className="text-red-500">*</span></label>
                      <input type="number" min="18" value={reg.age} onChange={e => setReg(p => ({ ...p, age: e.target.value }))} placeholder="e.g., 25" className={iCls} />
                    </div>
                    <div>
                      <label className={lCls}>Gender <span className="text-red-500">*</span></label>
                      <select value={reg.gender} onChange={e => setReg(p => ({ ...p, gender: e.target.value }))} className={iCls}>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                      </select>
                    </div>
                    <div>
                      <label className={lCls}>Civil Status <span className="text-red-500">*</span></label>
                      <select value={reg.civilStatus} onChange={e => setReg(p => ({ ...p, civilStatus: e.target.value }))} className={iCls}>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {regError && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-2 md:p-3 mb-2 md:mb-3 flex items-start gap-1.5 md:gap-2 animate-slideIn">
                    <AlertCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-800">{regError}</p>
                  </div>
                )}

                {/* Next button */}
                <div className="flex flex-col gap-2 md:gap-3">
                  <button
                    onClick={handleNext}
                    className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-2 md:py-2.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-800/20 flex items-center justify-center gap-2"
                  >
                    <span>Next</span><ChevronRight className="w-4 h-4" />
                  </button>
                  <p className="text-[10px] md:text-[11px] text-gray-400 text-center">
                    Step 1 of 3 — add your dependents on the next step.
                  </p>
                  <div className="pt-2 border-t border-gray-100 text-center">
                    <p className="text-[11px] md:text-xs text-gray-600">Already have an account?{' '}
                      <button onClick={() => { setMode('signin'); setRegError(''); }} className="text-emerald-700 hover:text-emerald-900 font-semibold transition-colors">
                        Sign in
                      </button>
                    </p>
                  </div>
                </div>

                </div>
              ) : regStep === 2 ? (
                <div key="step-2" className="animate-slideInRight w-full px-4 md:px-0">
                  <div className="max-w-md mx-auto pt-2">

                    {/* Step progress — responsive */}
                    <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2 mb-5">
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border-2 border-emerald-400">
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </div>
                        <span className="text-xs text-emerald-700 font-semibold">Profile</span>
                      </div>
                      <div className="w-6 md:w-12 h-0.5 bg-emerald-400 rounded-full" />
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center ring-4 ring-emerald-100">2</div>
                        <span className="text-xs text-emerald-900 font-semibold">Dependents</span>
                      </div>
                      <div className="w-6 md:w-12 h-0.5 bg-gray-200 rounded-full" />
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center">3</div>
                        <span className="text-xs text-gray-400 font-semibold">Secure</span>
                      </div>
                    </div>

                    <h2 className="font-display text-3xl font-semibold text-emerald-900 text-center mb-1.5 leading-tight">
                      Add Dependents <span className="text-lg text-gray-400 font-normal">(Optional)</span>
                    </h2>
                    <p className="text-gray-500 text-sm text-center mb-5">
                      Not required. Add family members now, or skip to complete registration. You can add them later from your account.
                    </p>

                    {/* Registering as: summary card with edit shortcut */}
                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl px-3 py-2.5 mb-5 flex items-center gap-3">
                      {reg.photo ? (
                        <img src={reg.photo} alt="" className="w-10 h-10 rounded-lg object-cover border-2 border-emerald-200 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-emerald-700" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Registering as</div>
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {reg.firstName} {reg.lastName}{reg.suffix ? ` ${reg.suffix}` : ''}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">{reg.email}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setRegError(''); setRegStep(1); }}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors flex-shrink-0"
                      >
                        Edit
                      </button>
                    </div>

                    {/* ── Dependents Section ── */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">Dependents <span className="font-normal text-gray-400">({reg.dependents.length}/4)</span></span>
                          <span className="text-[11px] text-gray-400 ml-2">optional</span>
                        </div>
                        <button
                          type="button"
                          onClick={addDependent}
                          disabled={reg.dependents.length >= 4}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors ${
                            reg.dependents.length >= 4 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-500 text-emerald-900'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Dependent
                        </button>
                      </div>

                      {reg.dependents.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-4 bg-white rounded-lg border border-gray-200 leading-relaxed">
                          You can add dependents now or proceed without adding anyone. Dependents can be added anytime from your account settings.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
                          {reg.dependents.map((d, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-2 md:p-3 border-2 border-emerald-100">
                              <div className="flex items-center gap-1 md:gap-2 mb-2">
                                {d.photo ? (
                                  <img src={d.photo} alt="" className="w-7 md:w-9 h-7 md:h-9 rounded-lg object-cover flex-shrink-0 border-2 border-emerald-200" />
                                ) : (
                                  <div className="w-7 md:w-9 h-7 md:h-9 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                                    <User className="w-3 md:w-4 h-3 md:h-4 text-gray-400" />
                                  </div>
                                )}
                                <input
                                  type="text" value={d.name}
                                  onChange={e => updateDependent(idx, 'name', e.target.value)}
                                  placeholder="Full name *"
                                  className="flex-1 min-w-0 px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-lg border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-xs transition-colors"
                                />
                                <button type="button" onClick={() => depPhotoRefs.current[idx]?.click()} title="Upload photo" className="px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-lg border-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex-shrink-0 text-[9px] md:text-[10px] font-semibold whitespace-nowrap">
                                  {d.photo ? 'Change' : 'Upload'}
                                </button>
                                <button type="button" onClick={() => removeDependent(idx)} title="Remove" className="w-6 md:w-7 h-6 md:h-7 flex items-center justify-center rounded-lg border-2 border-red-200 text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                                  <Trash2 className="w-2.5 md:w-3 h-2.5 md:h-3" />
                                </button>
                                <input ref={el => depPhotoRefs.current[idx] = el} type="file" accept="image/*" onChange={e => handleDepPhotoUpload(idx, e)} className="hidden" />
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <select value={d.relationship} onChange={e => updateDependent(idx, 'relationship', e.target.value)} className="w-full px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-lg border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-xs bg-white transition-colors">
                                  <option>Spouse</option>
                                  <option>Child</option>
                                  <option>Parent</option>
                                  <option>Sibling</option>
                                </select>
                                <input type="number" value={d.age} onChange={e => updateDependent(idx, 'age', e.target.value)} placeholder="Age *" className="w-full px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-lg border-2 border-gray-200 focus:border-emerald-600 focus:outline-none text-xs transition-colors" />
                              </div>
                              <div className="mt-1 md:mt-2">
                                <input ref={el => depValidIdRefs.current[`validId_${idx}`] = el} type="file" accept="image/*,.pdf" onChange={e => handleDepValidIdUpload(idx, e)} className="hidden" />
                                <button type="button" onClick={() => depValidIdRefs.current[`validId_${idx}`]?.click()} className={`w-full text-[11px] md:text-xs px-1.5 md:px-2 py-1 md:py-1.5 rounded-lg border-2 transition-colors text-left truncate ${d.validId ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-dashed border-gray-300 text-gray-500 hover:border-emerald-400 hover:bg-emerald-50'}`}>
                                  {d.validId ? `ID: ${d.validIdName}` : '+ Upload Valid ID'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Error */}
                    {regError && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 mb-3 flex items-start gap-2 animate-slideIn">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-800">{regError}</p>
                      </div>
                    )}

                    {/* Back + Skip/Next */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { setRegError(''); setRegStep(1); }}
                        className="px-4 py-3 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back
                      </button>
                      <button
                        onClick={handleNext}
                        className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-800/20 flex items-center justify-center gap-2"
                      >
                        <span>{reg.dependents.length === 0 ? 'Skip & Continue' : 'Continue to Secure'}</span><ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div key="step-3" className="animate-slideInRight w-full px-4 md:px-0">
                  <div className="max-w-md mx-auto pt-2">

                    {/* Step progress — responsive */}
                    <div className="flex flex-wrap items-center justify-center gap-1 md:gap-2 mb-5">
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border-2 border-emerald-400">
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </div>
                        <span className="text-xs text-emerald-700 font-semibold">Profile</span>
                      </div>
                      <div className="w-6 md:w-12 h-0.5 bg-emerald-400 rounded-full" />
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center border-2 border-emerald-400">
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </div>
                        <span className="text-xs text-emerald-700 font-semibold">Dependents</span>
                      </div>
                      <div className="w-6 md:w-12 h-0.5 bg-emerald-400 rounded-full" />
                      <div className="flex items-center gap-1 md:gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center ring-4 ring-emerald-100">3</div>
                        <span className="text-xs text-emerald-900 font-semibold">Secure</span>
                      </div>
                    </div>

                    {/* Lock icon hero */}
                    <div className="flex justify-center mb-3">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 flex items-center justify-center shadow-xl shadow-emerald-800/30 animate-scaleIn">
                        <Lock className="w-7 h-7 text-yellow-300" />
                      </div>
                    </div>

                    <h2 className="font-display text-3xl font-semibold text-emerald-900 text-center mb-1.5 leading-tight">
                      Secure your account{reg.firstName ? `, ${reg.firstName}` : ''}
                    </h2>
                    <p className="text-gray-500 text-sm text-center mb-5">
                      Set a strong password to complete your registration.
                    </p>

                    {/* Registering as: summary card with edit shortcut */}
                    <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl px-3 py-2.5 mb-5 flex items-center gap-3">
                      {reg.photo ? (
                        <img src={reg.photo} alt="" className="w-10 h-10 rounded-lg object-cover border-2 border-emerald-200 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-emerald-700" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold">Registering as</div>
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {reg.firstName} {reg.lastName}{reg.suffix ? ` ${reg.suffix}` : ''}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate">{reg.email}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setRegError(''); setRegStep(1); }}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1 rounded-md hover:bg-emerald-100 transition-colors flex-shrink-0"
                      >
                        Edit
                      </button>
                    </div>

                    {/* Password fields */}
                    <div className="space-y-3 mb-4">
                      <div>
                        <label className={lCls}>Password <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={reg.password}
                            onChange={e => setReg(p => ({ ...p, password: e.target.value }))}
                            placeholder="Min. 8 chars, 1+ number"
                            className={`${iCls} pr-10`}
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            tabIndex={-1}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className={lCls}>Confirm Password <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <input
                            type={showConfirm ? 'text' : 'password'}
                            value={reg.confirmPassword}
                            onChange={e => setReg(p => ({ ...p, confirmPassword: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleRegister()}
                            placeholder="Must match password"
                            className={`${iCls} pr-10`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirm(v => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            tabIndex={-1}
                            aria-label={showConfirm ? 'Hide password' : 'Show password'}
                          >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Live requirements checklist */}
                    <div className="bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 mb-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Password requirements</div>
                      <div className="space-y-1.5">
                        {[
                          { ok: reg.password.length >= 8, text: 'At least 8 characters' },
                          { ok: /[0-9]/.test(reg.password), text: 'Contains at least one number' },
                          { ok: reg.password.length > 0 && reg.password === reg.confirmPassword, text: 'Both passwords match' },
                        ].map((req, i) => (
                          <div key={i} className={`flex items-center gap-2 text-xs transition-colors ${req.ok ? 'text-emerald-700' : 'text-gray-500'}`}>
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${req.ok ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                              <Check className={`w-2.5 h-2.5 text-white transition-opacity ${req.ok ? 'opacity-100' : 'opacity-0'}`} strokeWidth={4} />
                            </div>
                            <span className={req.ok ? 'font-medium' : ''}>{req.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Error */}
                    {regError && (
                      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 mb-3 flex items-start gap-2 animate-slideIn">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-800">{regError}</p>
                      </div>
                    )}

                    {/* Back + Submit */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => { setRegError(''); setRegStep(2); }}
                        disabled={loading}
                        className="px-4 py-3 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center gap-1.5"
                      >
                        <ArrowLeft className="w-4 h-4" /> Back
                      </button>
                      <button
                        onClick={handleRegister}
                        disabled={loading}
                        className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-emerald-800/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading ? 'Submitting…' : <><span>Submit Registration</span><ChevronRight className="w-4 h-4" /></>}
                      </button>
                    </div>

                    <p className="text-[11px] text-gray-400 text-center mt-4">
                      Your account will be activated once approved by the Coordinator.
                    </p>
                  </div>
                </div>
              )}

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginScreen;