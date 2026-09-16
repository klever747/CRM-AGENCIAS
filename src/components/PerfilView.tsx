import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Shield, KeyRound, Lock, Eye, EyeOff, 
  CheckCircle2, AlertCircle, RefreshCw, Send, Building2, MapPin, 
  Calendar, Clock, Check, Copy, ArrowRight, Inbox, FileText,
  BadgeCheck, Laptop, Save, ShieldCheck
} from 'lucide-react';
import { Usuario } from '../types';

interface PerfilViewProps {
  currentUser: Usuario | null;
  onUpdateCurrentUser?: (updated: Usuario) => void;
}

export default function PerfilView({ currentUser, onUpdateCurrentUser }: PerfilViewProps) {
  const [activeTab, setActiveTab] = useState<'datos' | 'seguridad' | 'actividad'>('datos');
  
  // Profile form state
  const [profile, setProfile] = useState<Partial<Usuario>>({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '+593 99 876 5432',
    cedula: currentUser?.cedula || '1720349811',
    bio: currentUser?.bio || 'Asesor comercial inmobiliario en Grupo Terrenos · Corporación Zavala.',
    role: currentUser?.role || 'Asesor',
    agency_name: currentUser?.agency_name || 'Agencia Quito Norte',
    agency_city: currentUser?.agency_city || 'Quito',
    supervisor: currentUser?.supervisor || 'María José Salazar',
    status: currentUser?.status || 'Activo',
    last_access: currentUser?.last_access || 'Hoy, 09:30'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync with prop if it updates
  useEffect(() => {
    if (currentUser) {
      setProfile(prev => ({
        ...prev,
        name: currentUser.name || prev.name,
        email: currentUser.email || prev.email,
        phone: currentUser.phone || prev.phone || '+593 99 876 5432',
        cedula: currentUser.cedula || prev.cedula || '1720349811',
        bio: currentUser.bio || prev.bio || 'Asesor comercial inmobiliario en Grupo Terrenos.',
        role: currentUser.role || prev.role,
        agency_name: currentUser.agency_name || prev.agency_name,
        agency_city: currentUser.agency_city || prev.agency_city,
        supervisor: currentUser.supervisor || prev.supervisor,
        status: currentUser.status || prev.status,
        last_access: currentUser.last_access || prev.last_access
      }));
    }
  }, [currentUser]);

  // -----------------------------------------------------
  // PASSWORD RESET VIA EMAIL STATE & LOGIC
  // -----------------------------------------------------
  const [emailStep, setEmailStep] = useState<1 | 2 | 3>(1); // 1: request, 2: verify code, 3: set new password
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [receivedCodeData, setReceivedCodeData] = useState<{
    code: string;
    email: string;
    expiresIn: number;
    sentAt: string;
  } | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Verification step
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isCodeVerified, setIsCodeVerified] = useState(false);

  // Password reset step
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResettingPass, setIsResettingPass] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Direct password change state
  const [directCurrentPass, setDirectCurrentPass] = useState('');
  const [directNewPass, setDirectNewPass] = useState('');
  const [directConfirmPass, setDirectConfirmPass] = useState('');
  const [isDirectChanging, setIsDirectChanging] = useState(false);
  const [directSuccess, setDirectSuccess] = useState(false);
  const [directError, setDirectError] = useState<string | null>(null);
  const [directShowPass, setDirectShowPass] = useState(false);

  // Dynamic audit logs from database
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  useEffect(() => {
    if (activeTab === 'actividad') {
      setIsLoadingAudit(true);
      fetch('/api/audit')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const relevant = data.filter((l: any) => 
              l.user === profile.name || 
              l.module === 'Seguridad' || 
              (currentUser && l.user === currentUser.name)
            );
            setAuditLogs(relevant.length > 0 ? relevant.slice(0, 15) : data.slice(0, 10));
          }
        })
        .catch(err => console.error('Error fetching audit logs:', err))
        .finally(() => setIsLoadingAudit(false));
    }
  }, [activeTab, profile.name, currentUser]);

  // Countdown timer for code validity
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    let interval: any = null;
    if (secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [secondsRemaining]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Step 1: Request code by email
  const handleRequestCode = async () => {
    setIsRequestingCode(true);
    setRequestError(null);

    const targetEmail = profile.email || currentUser?.email || 'andrea.cedeno@grupoterrenos.com';

    try {
      const res = await fetch('/api/profile/request-password-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail })
      });
      const data = await res.json();

      if (data.success) {
        setReceivedCodeData({
          code: data.code,
          email: targetEmail,
          expiresIn: data.expires_in_minutes || 15,
          sentAt: data.sent_at || 'Ahora'
        });
        setSecondsRemaining((data.expires_in_minutes || 15) * 60);
        setEmailStep(2);
        setIsEmailModalOpen(true); // Open simulated inbox view
      } else {
        setRequestError(data.message || 'Error al solicitar el código de verificación.');
      }
    } catch (err: any) {
      setRequestError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setIsRequestingCode(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setCodeError('Por favor ingresa el código de 6 dígitos.');
      return;
    }

    setIsVerifyingCode(true);
    setCodeError(null);

    const targetEmail = profile.email || currentUser?.email || 'andrea.cedeno@grupoterrenos.com';

    try {
      const res = await fetch('/api/profile/verify-password-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, code: verificationCode.trim() })
      });
      const data = await res.json();

      if (data.success) {
        setIsCodeVerified(true);
        setEmailStep(3);
      } else {
        setCodeError(data.message || 'Código incorrecto o vencido.');
      }
    } catch (err: any) {
      setCodeError(err.message || 'Error de conexión.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (newPassword.length < 6) {
      setResetError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('Las contraseñas no coinciden. Verifica los campos.');
      return;
    }

    setIsResettingPass(true);
    const targetEmail = profile.email || currentUser?.email || 'andrea.cedeno@grupoterrenos.com';

    try {
      const res = await fetch('/api/profile/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          code: verificationCode.trim(),
          newPassword
        })
      });
      const data = await res.json();

      if (data.success) {
        setResetSuccess(true);
        setTimeout(() => {
          setResetSuccess(false);
          setEmailStep(1);
          setVerificationCode('');
          setNewPassword('');
          setConfirmPassword('');
          setReceivedCodeData(null);
        }, 3500);
      } else {
        setResetError(data.message || 'Error al actualizar la contraseña.');
      }
    } catch (err: any) {
      setResetError(err.message || 'Error de conexión.');
    } finally {
      setIsResettingPass(false);
    }
  };

  // Direct password change
  const handleDirectPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectError(null);

    if (directNewPass.length < 6) {
      setDirectError('La nueva contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    if (directNewPass !== directConfirmPass) {
      setDirectError('Las contraseñas no coinciden.');
      return;
    }

    if (!currentUser?.id) {
      setDirectError('Identificador de usuario no disponible.');
      return;
    }

    setIsDirectChanging(true);

    try {
      const res = await fetch('/api/profile/change-password-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          currentPassword: directCurrentPass,
          newPassword: directNewPass
        })
      });
      const data = await res.json();

      if (data.success) {
        setDirectSuccess(true);
        setDirectCurrentPass('');
        setDirectNewPass('');
        setDirectConfirmPass('');
        setTimeout(() => setDirectSuccess(false), 3500);
      } else {
        setDirectError(data.message || 'Error al actualizar contraseña.');
      }
    } catch (err: any) {
      setDirectError(err.message || 'Error de conexión.');
    } finally {
      setIsDirectChanging(false);
    }
  };

  // Save personal profile data
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/profile/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          cedula: profile.cedula,
          bio: profile.bio
        })
      });
      const data = await res.json();

      if (data.success && data.user) {
        setSaveSuccess(true);
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser(data.user);
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(data.message || 'No se pudo guardar la información.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  // Password strength calculator
  const calculateStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Sin ingresar', color: 'bg-slate-200' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Débil', color: 'bg-rose-500' };
    if (score === 2) return { score: 2, label: 'Aceptable', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Buena', color: 'bg-blue-500' };
    return { score: 4, label: 'Muy Segura', color: 'bg-emerald-500' };
  };

  const passStrength = calculateStrength(newPassword);

  const initials = profile.name
    ? profile.name.split(' ').map(n => n[0]).slice(0, 2).join('')
    : 'CZ';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* ----------------------------------------------------- */}
      {/* TOP HEADER & BREADCRUMB                                */}
      {/* ----------------------------------------------------- */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400 mb-1">
            <span>Inicio</span>
            <span>/</span>
            <span className="text-rose-600">Mi Perfil</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight font-display">
            Perfil de Usuario y Seguridad
          </h1>
          <p className="text-xs text-slate-500">
            Consulta tus credenciales corporativas, datos de contacto y gestiona tu contraseña mediante verificación por correo.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition"
          >
            <RefreshCw size={14} className="text-slate-400" />
            <span>Actualizar Estado</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* USER IDENTITY HERO CARD                               */}
      {/* ----------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-rose-50/50 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#E11D48] to-rose-700 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-rose-950/10 border-2 border-white">
                {initials}
              </div>
              <div 
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" 
                title="Usuario activo y conectado"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-black text-slate-900 leading-none">
                  {profile.name || 'Andrea Cedeño'}
                </h2>
                <span className="inline-flex items-center gap-1 bg-rose-50 text-[#E11D48] border border-rose-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  <ShieldCheck size={12} />
                  {profile.role || 'Asesor Comercial'}
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Activo
                </span>
              </div>

              <p className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                <span className="flex items-center gap-1 text-slate-600 font-semibold">
                  <Mail size={13} className="text-rose-600" />
                  {profile.email}
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 text-slate-600">
                  <Building2 size={13} className="text-slate-400" />
                  {profile.agency_name || 'Agencia Corporativa'} ({profile.agency_city || 'Quito'})
                </span>
              </p>

              <div className="pt-1 flex items-center gap-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  Último acceso: <strong className="text-slate-700 font-semibold">{profile.last_access || 'Hoy'}</strong>
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:flex items-center gap-1">
                  <Calendar size={12} />
                  Corporación Zavala CRM
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">ID Usuario</span>
              <span className="text-sm font-black text-slate-800 font-mono">
                #{String(currentUser?.id || 3).padStart(4, '0')}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center min-w-[120px]">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Supervisor</span>
              <span className="text-xs font-bold text-slate-800 truncate block max-w-[120px]" title={profile.supervisor}>
                {profile.supervisor || 'María José S.'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-100 overflow-x-auto">
          <button
            onClick={() => setActiveTab('datos')}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer
              ${activeTab === 'datos'
                ? 'bg-rose-50 text-[#E11D48] border border-rose-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'}
            `}
          >
            <User size={15} />
            <span>Datos Personales</span>
          </button>

          <button
            onClick={() => setActiveTab('seguridad')}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer
              ${activeTab === 'seguridad'
                ? 'bg-rose-50 text-[#E11D48] border border-rose-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'}
            `}
          >
            <KeyRound size={15} />
            <span>Seguridad y Contraseña</span>
            <span className="bg-[#E11D48] text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase">
              Email OTP
            </span>
          </button>

          <button
            onClick={() => setActiveTab('actividad')}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer
              ${activeTab === 'actividad'
                ? 'bg-rose-50 text-[#E11D48] border border-rose-200 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'}
            `}
          >
            <Laptop size={15} />
            <span>Sesiones y Auditoría</span>
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* TAB 1: DATOS PERSONALES                               */}
      {/* ----------------------------------------------------- */}
      {activeTab === 'datos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Edit Form */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">Información de Contacto y Datos</h3>
                <p className="text-xs text-slate-500">Actualiza tus canales de comunicación comercial para los leads</p>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                Campos marcados con <span className="text-rose-600 font-bold">*</span>
              </span>
            </div>

            {saveSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <span>¡Tus datos personales se han guardado exitosamente en el sistema!</span>
              </div>
            )}

            {saveError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2.5">
                <AlertCircle size={16} className="text-rose-600 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nombre Completo <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={profile.name || ''}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-[#E11D48] outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Cédula / Documento de Identidad
                  </label>
                  <div className="relative">
                    <BadgeCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={profile.cedula || ''}
                      onChange={(e) => setProfile({ ...profile, cedula: e.target.value })}
                      placeholder="1720349811"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 font-mono focus:bg-white focus:ring-1 focus:ring-[#E11D48] outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Teléfono Celular / WhatsApp <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      required
                      placeholder="+593 99 876 5432"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 font-semibold focus:bg-white focus:ring-1 focus:ring-[#E11D48] outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Correo Electrónico Institucional
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={profile.email || ''}
                      readOnly
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-500 font-mono cursor-not-allowed select-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Administrado por TI Corporación Zavala
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Presentación Comercial / Biografía
                </label>
                <textarea
                  rows={3}
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Escribe una breve descripción de tu perfil comercial, proyectos destacados o años de experiencia en el sector inmobiliario..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:ring-1 focus:ring-[#E11D48] outline-none transition"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Esta información puede incluirse en el encabezado de las proformas que envíes a tus clientes.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#E11D48] hover:bg-rose-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Guardando Cambios...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Guardar Datos</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Organizational Context Card */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Building2 size={16} className="text-rose-600" />
                <span>Asignación Organizacional</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Sucursal / Agencia</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin size={13} className="text-rose-600" />
                    {profile.agency_name || 'Agencia Quito Norte'}
                  </span>
                  <span className="text-[11px] text-slate-500 ml-4.5 block">
                    Ciudad de operación: {profile.agency_city || 'Quito, Ecuador'}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Cargo / Rol en Sistema</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    {profile.role || 'Asesor Comercial'}
                  </span>
                  <span className="text-[11px] text-slate-500 ml-4.5 block">
                    Acceso a Cotizador, Proformas, Leads propios y Agenda
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Supervisor Inmediato</span>
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User size={13} className="text-slate-600" />
                    {profile.supervisor || 'María José Salazar'}
                  </span>
                  <span className="text-[11px] text-slate-500 ml-4.5 block">
                    Dirección de Ventas & Agencia
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Security Status Box */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-rose-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Protección de Cuenta
                </h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tu cuenta está protegida mediante verificación en dos pasos para restablecimiento de claves por correo institucional.
              </p>
              <button
                onClick={() => setActiveTab('seguridad')}
                className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Gestionar Contraseña</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* TAB 2: SEGURIDAD Y CAMBIO DE CONTRASEÑA POR CORREO    */}
      {/* ----------------------------------------------------- */}
      {activeTab === 'seguridad' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column: Password by Email Reset Flow */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-[#E11D48] rounded-xl">
                  <Mail size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Cambio de Contraseña mediante Correo Electrónico
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proceso seguro con código OTP de 6 dígitos enviado directamente a tu casilla oficial
                  </p>
                </div>
              </div>
            </div>

            {/* Stepper Header */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className={`p-2.5 rounded-xl border transition ${
                emailStep === 1 
                  ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold' 
                  : emailStep > 1 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' 
                    : 'bg-slate-50 border-slate-100 text-slate-400'
              }`}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  {emailStep > 1 ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-[#E11D48] text-white text-[10px] font-black inline-flex items-center justify-center">1</span>
                  )}
                  <span>Solicitar Código</span>
                </div>
                <span className="text-[10px] opacity-75 hidden sm:block">A tu email registrado</span>
              </div>

              <div className={`p-2.5 rounded-xl border transition ${
                emailStep === 2 
                  ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold' 
                  : emailStep > 2 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold' 
                    : 'bg-slate-50 border-slate-100 text-slate-400'
              }`}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  {emailStep > 2 ? (
                    <Check size={14} className="text-emerald-600" />
                  ) : (
                    <span className={`w-4 h-4 rounded-full text-white text-[10px] font-black inline-flex items-center justify-center ${emailStep === 2 ? 'bg-[#E11D48]' : 'bg-slate-300'}`}>2</span>
                  )}
                  <span>Validar Código</span>
                </div>
                <span className="text-[10px] opacity-75 hidden sm:block">6 dígitos numéricos</span>
              </div>

              <div className={`p-2.5 rounded-xl border transition ${
                emailStep === 3 
                  ? 'bg-rose-50 border-rose-300 text-rose-800 font-bold' 
                  : 'bg-slate-50 border-slate-100 text-slate-400'
              }`}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className={`w-4 h-4 rounded-full text-white text-[10px] font-black inline-flex items-center justify-center ${emailStep === 3 ? 'bg-[#E11D48]' : 'bg-slate-300'}`}>3</span>
                  <span>Nueva Clave</span>
                </div>
                <span className="text-[10px] opacity-75 hidden sm:block">Confirmar contraseña</span>
              </div>
            </div>

            {/* Error notifications */}
            {requestError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span>{requestError}</span>
              </div>
            )}

            {/* STEP 1: REQUEST CODE */}
            {emailStep === 1 && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-rose-600 shadow-2xs">
                    <Mail size={24} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">
                      Enviar código de seguridad al correo corporativo
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Se generará un código OTP de un solo uso válido durante 15 minutos y se enviará a:
                    </p>
                    <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-800 mt-1 shadow-2xs">
                      <Mail size={13} className="text-rose-600" />
                      <span>{profile.email || currentUser?.email || 'andrea.cedeno@grupoterrenos.com'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between flex-wrap gap-3">
                  <span className="text-[11px] text-slate-500">
                    🔒 Conexión cifrada de autenticación en dos factores
                  </span>

                  <button
                    onClick={handleRequestCode}
                    disabled={isRequestingCode}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#E11D48] hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                  >
                    {isRequestingCode ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Enviando Código...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Enviar Código a mi Correo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: VERIFY CODE */}
            {emailStep === 2 && (
              <div className="space-y-4">
                {/* Code Dispatched Banner */}
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                      <Mail size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">
                        Código despachado a {profile.email}
                      </h4>
                      <p className="text-[11px] text-emerald-700">
                        Expira en: <strong className="font-mono">{formatTimer(secondsRemaining)}</strong>
                      </p>
                    </div>
                  </div>

                  {receivedCodeData && (
                    <button
                      onClick={() => setIsEmailModalOpen(true)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                    >
                      <Inbox size={13} />
                      <span>Ver Correo Recibido</span>
                    </button>
                  )}
                </div>

                {codeError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                    <AlertCircle size={15} className="text-rose-600 shrink-0" />
                    <span>{codeError}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyCode} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                      Ingresa el Código de 6 Dígitos recibido por Correo
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ej. 654321"
                        autoFocus
                        className="w-full max-w-xs bg-white border border-slate-300 rounded-xl px-4 py-3 text-lg font-mono font-black text-center text-slate-900 tracking-widest focus:ring-2 focus:ring-[#E11D48] outline-none shadow-inner"
                      />

                      {receivedCodeData && (
                        <button
                          type="button"
                          onClick={() => setVerificationCode(receivedCodeData.code)}
                          className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs transition cursor-pointer"
                          title="Auto-completar con el código recibido"
                        >
                          <Copy size={13} className="text-slate-400" />
                          <span>Pegar ({receivedCodeData.code})</span>
                        </button>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-2 block">
                      Revisa también tu carpeta de Spam o Notificaciones si no lo visualizas de inmediato.
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleRequestCode()}
                      disabled={isRequestingCode}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={13} className={isRequestingCode ? 'animate-spin' : ''} />
                      <span>Reenviar código</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isVerifyingCode || verificationCode.length < 6}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#E11D48] hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingCode ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Validando Código...</span>
                        </>
                      ) : (
                        <>
                          <span>Continuar</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: SET NEW PASSWORD */}
            {emailStep === 3 && (
              <div className="space-y-4">
                {resetSuccess ? (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-fadeIn">
                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <CheckCircle2 size={24} />
                    </div>
                    <h4 className="text-base font-bold text-emerald-950">
                      ¡Contraseña Actualizada Exitosamente!
                    </h4>
                    <p className="text-xs text-emerald-800 max-w-md mx-auto">
                      Tu nueva contraseña ha sido guardada en la base de datos de Grupo Terrenos y la acción fue registrada en la auditoría de seguridad.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleResetPassword} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                      <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                      <span>Código de correo verificado correctamente. Ingresa tu nueva contraseña institucional:</span>
                    </div>

                    {resetError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                        <AlertCircle size={15} className="text-rose-600 shrink-0" />
                        <span>{resetError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Nueva Contraseña <span className="text-rose-600">*</span>
                        </label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="Mínimo 6 caracteres"
                            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 focus:ring-1 focus:ring-[#E11D48] outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 mb-1.5">
                          Confirmar Nueva Contraseña <span className="text-rose-600">*</span>
                        </label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="Repite la contraseña"
                            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 focus:ring-1 focus:ring-[#E11D48] outline-none transition"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Password Strength Meter */}
                    {newPassword && (
                      <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Seguridad de la clave:</span>
                          <span className="font-bold text-slate-800">{passStrength.label}</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                          <div className={`h-full flex-1 rounded-full transition-all duration-300 ${passStrength.score >= 1 ? passStrength.color : 'bg-slate-200'}`} />
                          <div className={`h-full flex-1 rounded-full transition-all duration-300 ${passStrength.score >= 2 ? passStrength.color : 'bg-slate-200'}`} />
                          <div className={`h-full flex-1 rounded-full transition-all duration-300 ${passStrength.score >= 3 ? passStrength.color : 'bg-slate-200'}`} />
                          <div className={`h-full flex-1 rounded-full transition-all duration-300 ${passStrength.score >= 4 ? passStrength.color : 'bg-slate-200'}`} />
                        </div>
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setEmailStep(2)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                      >
                        Volver al código
                      </button>

                      <button
                        type="submit"
                        disabled={isResettingPass || !newPassword || newPassword !== confirmPassword}
                        className="flex items-center gap-2 px-6 py-2.5 bg-[#E11D48] hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:opacity-50"
                      >
                        {isResettingPass ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Actualizando Contraseña...</span>
                          </>
                        ) : (
                          <>
                            <KeyRound size={14} />
                            <span>Establecer Nueva Contraseña</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Secondary Column: Direct change alternative & security hints */}
          <div className="lg:col-span-4 space-y-6">
            {/* Direct Password Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Cambio Rápido con Clave Actual
                </h4>
                <p className="text-[11px] text-slate-400">
                  Si conoces tu contraseña vigente, actualízala al instante
                </p>
              </div>

              {directSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>¡Contraseña actualizada correctamente!</span>
                </div>
              )}

              {directError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-600 shrink-0" />
                  <span>{directError}</span>
                </div>
              )}

              <form onSubmit={handleDirectPasswordChange} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <Lock size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={directShowPass ? 'text' : 'password'}
                      value={directCurrentPass}
                      onChange={(e) => setDirectCurrentPass(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#E11D48] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setDirectShowPass(!directShowPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {directShowPass ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={directNewPass}
                    onChange={(e) => setDirectNewPass(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#E11D48] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Confirmar Nueva
                  </label>
                  <input
                    type="password"
                    value={directConfirmPass}
                    onChange={(e) => setDirectConfirmPass(e.target.value)}
                    placeholder="Repite la nueva clave"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#E11D48] outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isDirectChanging || !directCurrentPass || !directNewPass}
                  className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isDirectChanging ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : (
                    <KeyRound size={13} />
                  )}
                  <span>Guardar Clave</span>
                </button>
              </form>
            </div>

            {/* Security Rules Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-[#E11D48]" />
                <span>Recomendaciones de Seguridad</span>
              </h4>
              <ul className="text-[11px] text-slate-600 space-y-2 list-disc pl-4">
                <li>No compartas tu contraseña institucional con terceros.</li>
                <li>Utiliza una combinación de mayúsculas, números y símbolos.</li>
                <li>El código de correo enviado vence a los 15 minutos.</li>
                <li>Todos los cambios de clave quedan asentados en auditoría.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* TAB 3: SESIONES Y AUDITORÍA                           */}
      {/* ----------------------------------------------------- */}
      {activeTab === 'actividad' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-bold text-slate-900 font-display">
              Registro de Actividad y Accesos Recientes
            </h3>
            <p className="text-xs text-slate-500">
              Historial de conexiones y eventos de seguridad asociados a tu cuenta
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Evento / Acción</th>
                  <th className="py-3 px-4">Dispositivo / Navegador</th>
                  <th className="py-3 px-4">IP Origen</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Fecha y Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Active Session Row */}
                <tr className="hover:bg-slate-50/60 transition bg-rose-50/20">
                  <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Sesión Actual Activa</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">Chrome · Web App (Esta Sesión)</td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">127.0.0.1 / Local</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                      Conectado
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-medium text-slate-500">
                    {profile.last_access || 'En línea ahora'}
                  </td>
                </tr>

                {isLoadingAudit ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      <RefreshCw size={16} className="animate-spin inline-block mr-2" />
                      Cargando historial de auditoría...
                    </td>
                  </tr>
                ) : auditLogs.length > 0 ? (
                  auditLogs.map((log: any, idx: number) => {
                    const isSecurity = log.module === 'Seguridad';
                    return (
                      <tr key={log.id || idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isSecurity ? 'bg-[#E11D48]' : 'bg-blue-500'}`} />
                            <span>{log.action}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">{log.record}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {log.module}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {log.ip || '127.0.0.1'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isSecurity 
                              ? 'bg-rose-50 text-rose-700 border-rose-200' 
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {isSecurity ? 'Seguridad' : 'Auditado'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-500 whitespace-nowrap">
                          {log.date || (log.created_at ? new Date(log.created_at).toLocaleString('es-EC') : 'Reciente')}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      Operación en Plataforma
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">Módulo Comercial</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">127.0.0.1</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Comercial
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-500">Hoy</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* MODAL: SIMULADOR DE BANDEJA DE ENTRADA DE CORREO     */}
      {/* ----------------------------------------------------- */}
      {isEmailModalOpen && receivedCodeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-scaleUp">
            {/* Window header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#E11D48] flex items-center justify-center text-white font-black text-xs">
                  CZ
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">Servicio de Correo Corporativo</h4>
                  <p className="text-[10px] text-slate-400">Grupo Terrenos · Notificación de Seguridad</p>
                </div>
              </div>

              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-800"
              >
                ✕ Cerrar
              </button>
            </div>

            {/* Email Body */}
            <div className="p-6 space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 font-mono text-[11px]">
                <div><strong className="text-slate-500">De:</strong> seguridad@grupoterrenos.com</div>
                <div><strong className="text-slate-500">Para:</strong> {receivedCodeData.email}</div>
                <div><strong className="text-slate-500">Asunto:</strong> Código de Verificación para Cambio de Contraseña</div>
                <div><strong className="text-slate-500">Hora:</strong> {receivedCodeData.sentAt}</div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-sm font-bold text-slate-900">
                  Estimado(a) {profile.name || 'Colaborador'},
                </p>
                <p className="leading-relaxed text-slate-600">
                  Hemos recibido una solicitud para cambiar tu contraseña en el sistema CRM de <strong>Grupo Terrenos · Corporación Zavala</strong>. Utiliza el siguiente código de seguridad de 6 dígitos para continuar:
                </p>

                {/* Big Display Code */}
                <div className="my-4 p-5 bg-rose-50 border-2 border-dashed border-rose-300 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-1">
                    Código de Seguridad OTP
                  </span>
                  <div className="text-3xl font-mono font-black text-slate-900 tracking-widest">
                    {receivedCodeData.code}
                  </div>
                  <span className="text-[11px] text-rose-700 mt-1 block">
                    Válido durante {receivedCodeData.expiresIn} minutos
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Si no solicitaste este cambio, por favor ignora este correo o contacta de inmediato al administrador del sistema.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationCode(receivedCodeData.code);
                    setIsEmailModalOpen(false);
                  }}
                  className="w-full py-2.5 bg-[#E11D48] hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check size={14} />
                  <span>Copiar y Usar Código ({receivedCodeData.code})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
