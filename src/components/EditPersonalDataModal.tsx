import React, { useState, useEffect } from 'react';
import { X, User, Phone, CreditCard, Mail, MapPin, Building, Briefcase, DollarSign, Heart, Tag, Flame, Shield, Save, Loader2, AlertCircle, Sparkles, CheckCircle2, Lock, Building2, Zap, Snowflake } from 'lucide-react';
import { Lead } from '../types';
import { cleanDigitsPhone, formatDisplayPhone } from '../types';
import { formatInternationalPhone } from './Modals';

export const COUNTRY_OPTIONS = [
  { code: '593', name: 'Ecuador (+593)', flag: '🇪🇨', digitsLength: 9, placeholder: '959412316' },
  { code: '1', name: 'EE.UU. / Canadá (+1)', flag: '🇺🇸', digitsLength: 10, placeholder: '2025550123' },
  { code: '57', name: 'Colombia (+57)', flag: '🇨🇴', digitsLength: 10, placeholder: '3001234567' },
  { code: '51', name: 'Perú (+51)', flag: '🇵🇪', digitsLength: 9, placeholder: '987654321' },
  { code: '34', name: 'España (+34)', flag: '🇪🇸', digitsLength: 9, placeholder: '612345678' },
  { code: '56', name: 'Chile (+56)', flag: '🇨🇱', digitsLength: 9, placeholder: '912345678' },
  { code: '52', name: 'México (+52)', flag: '🇲🇽', digitsLength: 10, placeholder: '5512345678' },
  { code: '54', name: 'Argentina (+54)', flag: '🇦🇷', digitsLength: 10, placeholder: '91112345678' },
  { code: '507', name: 'Panamá (+507)', flag: '🇵🇦', digitsLength: 8, placeholder: '61234567' },
  { code: '506', name: 'Costa Rica (+506)', flag: '🇨🇷', digitsLength: 8, placeholder: '81234567' },
  { code: '58', name: 'Venezuela (+58)', flag: '🇻🇪', digitsLength: 10, placeholder: '4121234567' },
  { code: '591', name: 'Bolivia (+591)', flag: '🇧🇴', digitsLength: 8, placeholder: '71234567' },
  { code: '39', name: 'Italia (+39)', flag: '🇮🇹', digitsLength: 10, placeholder: '3123456789' }
];

export const ECUADOR_CITIES = [
  'Quito',
  'Guayaquil',
  'Cuenca',
  'Santo Domingo',
  'Samborondón',
  'Manta',
  'Portoviejo',
  'Machala',
  'Ambato',
  'Loja',
  'Ibarra',
  'Quevedo',
  'Riobamba',
  'Esmeraldas',
  'Latacunga',
  'Cumbayá / Tumbaco',
  'Otra'
];

export const CIVIL_STATUS_OPTIONS = [
  'Soltero/a',
  'Casado/a',
  'Unión de Hecho',
  'Divorciado/a',
  'Viudo/a'
];

export const OCCUPATION_OPTIONS = [
  'Empleado privado',
  'Profesional independiente',
  'Empresario / Negocio propio',
  'Servidor público',
  'Comerciante',
  'Inversionista',
  'Jubilado / Pensionista',
  'Residente en el exterior (Migrante)',
  'Otro'
];

export const INCOME_RANGE_OPTIONS = [
  'Menos de $800',
  '$800 - $1,500',
  '$1,500 - $2,500',
  '$2,500 - $4,000',
  '$4,000 - $6,000',
  'Más de $6,000'
];

interface EditPersonalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead;
  onSaved: (updatedLead: Lead) => void;
}

export default function EditPersonalDataModal({
  isOpen,
  onClose,
  lead,
  onSaved
}: EditPersonalDataModalProps) {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [cedula, setCedula] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('593');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [email, setEmail] = useState('');
  
  // Demographics
  const [country, setCountry] = useState('Ecuador');
  const [city, setCity] = useState('Quito');
  const [civilStatus, setCivilStatus] = useState('Soltero/a');
  const [occupation, setOccupation] = useState('Empleado privado');
  const [incomeRange, setIncomeRange] = useState('$1,500 - $2,500');

  // Commercial
  const [source, setSource] = useState('WhatsApp');
  const [project, setProject] = useState('Vista del Valle');
  const [agency, setAgency] = useState('Agencia Quito Norte');
  const [advisor, setAdvisor] = useState('Sin Asignar');
  const [temp, setTemp] = useState('Tibio');
  const [dealValue, setDealValue] = useState<number>(30000);
  const [proyectosList, setProyectosList] = useState<string[]>([
    'Vista del Valle',
    'Terrazas del Río',
    'Ciudad Verde Norte',
    'Bosques de Samborondón',
    'Altos del Valle'
  ]);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Fetch all urbanizaciones from "proyectos" table
  useEffect(() => {
    fetch('/api/urbanizaciones')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((p: any) => p.nombre || p.name).filter(Boolean);
          if (names.length > 0) {
            setProyectosList(Array.from(new Set(names)));
          }
        }
      })
      .catch(() => {});
  }, []);

  // Initialize data when modal opens
  useEffect(() => {
    if (isOpen && lead) {
      let initialFirst = (lead.first || '').trim();
      let initialLast = (lead.last || '').trim();

      if (!initialFirst && !initialLast && lead.name) {
        const parts = lead.name.trim().split(/\s+/);
        if (parts.length > 1) {
          initialFirst = parts.slice(0, parts.length > 2 ? 2 : 1).join(' ');
          initialLast = parts.slice(parts.length > 2 ? 2 : 1).join(' ');
        } else {
          initialFirst = parts[0] || '';
        }
      }

      setFirst(initialFirst);
      setLast(initialLast);
      setCedula(lead.cedula ? String(lead.cedula).replace(/\D/g, '') : '');
      setEmail(lead.email || '');

      // Parse phone into country code + raw digits
      const raw = (lead.phone || '').trim().replace(/\D/g, '');
      let detectedCode = '593';
      let cleanRemaining = raw;

      // Sort country options by code length descending so longer codes match first (e.g. 593 before 5)
      const sortedOptions = [...COUNTRY_OPTIONS].sort((a, b) => b.code.length - a.code.length);
      for (const c of sortedOptions) {
        if (raw.startsWith(c.code) && raw.length > c.code.length) {
          detectedCode = c.code;
          cleanRemaining = raw.substring(c.code.length);
          break;
        }
      }

      if (cleanRemaining.startsWith('0')) {
        cleanRemaining = cleanRemaining.substring(1);
      }

      setPhoneCountryCode(detectedCode);
      setPhoneDigits(cleanRemaining);

      // Demographics
      setCountry(lead.country || 'Ecuador');
      setCity(lead.city || 'Quito');
      setCivilStatus(lead.civil_status || 'Soltero/a');
      setOccupation(lead.occupation || 'Empleado privado');
      setIncomeRange(lead.income_range || '$1,500 - $2,500');

      // Commercial
      setSource(lead.source || 'WhatsApp');
      setProject(lead.project || 'Vista del Valle');
      setAgency(lead.agency || 'Agencia Quito Norte');
      setAdvisor(lead.advisor || 'Sin Asignar');
      setTemp(lead.temp || 'Tibio');
      setDealValue(Number(lead.deal_value) || 30000);

      setErrors({});
    }
  }, [isOpen, lead]);

  if (!isOpen || !lead) return null;

  // Compute calculated clean phone value (without signs, e.g. "593959412316")
  const computedCleanPhone = cleanDigitsPhone(phoneCountryCode, phoneDigits);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!first.trim()) {
      newErrors.first = 'El primer nombre es obligatorio.';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(first.trim())) {
      newErrors.first = 'El nombre solo debe contener letras.';
    }

    if (!last.trim()) {
      newErrors.last = 'El apellido es obligatorio.';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(last.trim())) {
      newErrors.last = 'El apellido solo debe contener letras.';
    }

    const cleanCedulaVal = cedula.trim().replace(/\D/g, '');
    if (cleanCedulaVal) {
      if (cleanCedulaVal.length !== 10 && cleanCedulaVal.length !== 13) {
        newErrors.cedula = 'La cédula debe tener 10 dígitos o RUC de 13 dígitos.';
      }
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Ingrese un correo electrónico válido.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setErrors({});

    const fullName = `${first.trim()} ${last.trim()}`.trim();

    // RULE: Al editar cualquier campo en este módulo comercial, pasa automáticamente a "Contactado"
    const finalStatus = 'Contactado';
    let finalStage = lead.stage || 'lead';
    if (finalStage === 'lead') {
      finalStage = 'contact';
    }

    const payload = {
      first: first.trim(),
      last: last.trim(),
      name: fullName,
      phone: lead.phone || computedCleanPhone,
      email: email.trim(),
      cedula: cleanCedulaVal,
      country: country.trim() || 'Ecuador',
      city: city.trim() || 'Quito',
      civil_status: civilStatus,
      occupation: occupation,
      income_range: incomeRange,
      source: lead.source || source,
      project: project,
      agency: lead.agency || agency,
      advisor: lead.advisor || advisor,
      status: finalStatus,
      temp: temp,
      deal_value: Number(dealValue) || 30000,
      next_follow: lead.next_follow || '08 Jul 2026',
      stage: finalStage
    };

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success || res.ok) {
        const freshLead: Lead = data.lead || { ...lead, ...payload };
        onSaved(freshLead);
        onClose();
      } else {
        alert('Error al guardar en la base de datos: ' + (data.message || 'Error'));
      }
    } catch (err: any) {
      console.error('Error saving lead:', err);
      alert('Error de conexión al actualizar el lead.');
    } finally {
      setSaving(false);
    }
  };

  const formattedCurrencyPreview = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(dealValue) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="bg-slate-900 text-white px-6 py-4.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <User size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Editar Lead Comercial</h3>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles size={10} />
                  Pasa a Contactado
                </span>
                <span className="bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  ID #{lead.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Actualización comercial del prospecto · Validación estricta y sincronización central
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE FORM) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* SECTION 1: DATOS PERSONALES & CONTACTO */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <User size={15} className="text-[#E11D48]" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                1. Datos de Identificación y Contacto
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Primer Nombre */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Primer Nombre <span className="text-rose-600">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Solo letras</span>
                </label>
                <input
                  type="text"
                  value={first}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
                    setFirst(val);
                    if (errors.first) setErrors(prev => ({ ...prev, first: '' }));
                  }}
                  placeholder="Ej: Silvana"
                  className={`bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 outline-none transition ${
                    errors.first ? 'border-red-500 ring-1 ring-red-200' : 'border-slate-200 focus:border-rose-500 focus:bg-white'
                  }`}
                  required
                />
                {errors.first && (
                  <p className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle size={11} /> {errors.first}
                  </p>
                )}
              </div>

              {/* Primer Apellido */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Primer Apellido <span className="text-rose-600">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Solo letras</span>
                </label>
                <input
                  type="text"
                  value={last}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
                    setLast(val);
                    if (errors.last) setErrors(prev => ({ ...prev, last: '' }));
                  }}
                  placeholder="Ej: Peña"
                  className={`bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 outline-none transition ${
                    errors.last ? 'border-red-500 ring-1 ring-red-200' : 'border-slate-200 focus:border-rose-500 focus:bg-white'
                  }`}
                  required
                />
                {errors.last && (
                  <p className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle size={11} /> {errors.last}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cédula / RUC (Editable) */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Cédula de Identidad / RUC</span>
                  <span className="text-[10px] text-slate-400 font-normal">10 o 13 dígitos</span>
                </label>
                <input
                  type="text"
                  value={cedula}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 13);
                    setCedula(val);
                    if (errors.cedula) setErrors(prev => ({ ...prev, cedula: '' }));
                  }}
                  placeholder="Ej: 1718293849"
                  maxLength={13}
                  className={`bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 font-mono outline-none transition ${
                    errors.cedula ? 'border-red-500 ring-1 ring-red-200' : 'border-slate-200 focus:border-rose-500 focus:bg-white'
                  }`}
                />
                {errors.cedula && (
                  <p className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                    <AlertCircle size={11} /> {errors.cedula}
                  </p>
                )}
              </div>

              {/* Teléfono / WhatsApp (BLOQUEADO / NO MODIFICABLE) */}
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">WhatsApp</label>
                  <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Lock size={10} className="text-slate-500" />
                    No modificable
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={formatInternationalPhone(lead.phone || computedCleanPhone)}
                    readOnly
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono font-semibold cursor-not-allowed select-all"
                  />
                  <Lock size={13} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
                  <span>Número de contacto en base de datos</span>
                  <span className="font-mono text-slate-600">{lead.phone || computedCleanPhone}</span>
                </div>
              </div>
            </div>

            {/* Correo Electrónico (Editable) */}
            <div className="flex flex-col gap-1 text-xs">
              <label className="font-bold text-slate-700">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                placeholder="cliente@correo.com"
                className={`bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 outline-none transition ${
                  errors.email ? 'border-red-500 ring-1 ring-red-200' : 'border-slate-200 focus:border-rose-500 focus:bg-white'
                }`}
              />
              {errors.email && (
                <p className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                  <AlertCircle size={11} /> {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* SECTION 2: DATOS SOCIODEMOGRÁFICOS */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <MapPin size={15} className="text-blue-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Perfil Sociodemográfico & Residencia
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* País de Residencia */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="font-bold text-slate-700">País de Residencia</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Ecuador, EE.UU., España..."
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>

              {/* Ciudad de Residencia */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="font-bold text-slate-700">Ciudad de Residencia</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Quito, Guayaquil, Nueva York..."
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Estado Civil */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="font-bold text-slate-700">Estado Civil</label>
                <select
                  value={civilStatus}
                  onChange={(e) => setCivilStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-rose-500"
                >
                  {CIVIL_STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Ocupación */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="font-bold text-slate-700">Ocupación / Actividad</label>
                <select
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-rose-500"
                >
                  {OCCUPATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* Rango de Ingresos */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="font-bold text-slate-700">Rango de Ingresos</label>
                <select
                  value={incomeRange}
                  onChange={(e) => setIncomeRange(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-rose-500"
                >
                  {INCOME_RANGE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: ASIGNACIÓN Y ESTADO COMERCIAL */}
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
              <Building size={15} className="text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                3. Asignación Comercial y Proyecto
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fuente del Lead (BLOQUEADA / NO MODIFICABLE) */}
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Fuente del Lead</label>
                  <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Lock size={10} className="text-slate-500" />
                    No modificable
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={lead.source || source || 'WhatsApp'}
                    readOnly
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-semibold cursor-not-allowed select-all"
                  />
                  <Lock size={13} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Proyecto de Interés (Listando TODAS las urbanizaciones de la tabla 'proyectos') */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="font-bold text-slate-700 flex items-center justify-between">
                  <span>Proyecto de Interés</span>
                  <span className="text-[10px] text-rose-600 font-semibold">{proyectosList.length} urbanizaciones</span>
                </label>
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-rose-500 font-medium"
                >
                  {proyectosList.map((pName) => (
                    <option key={pName} value={pName}>
                      🏡 {pName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Agencia Asignada (Se muestra de dónde es - Sólo Lectura) */}
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Agencia / Sucursal</label>
                  <span className="text-[10px] text-slate-500 font-medium bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Building2 size={10} className="text-slate-500" />
                    Origen
                  </span>
                </div>
                <div className="w-full bg-slate-100/90 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-semibold flex items-center gap-2 select-all">
                  <Building2 size={13} className="text-slate-500 shrink-0" />
                  <span className="truncate">{lead.agency || agency || 'Agencia Quito Norte'}</span>
                </div>
              </div>

              {/* Temperatura (Solo Mostrar) */}
              <div className="flex flex-col gap-1 text-xs">
                <label className="font-bold text-slate-700">Temperatura Actual</label>
                <div className="w-full">
                  {temp === 'Caliente' || temp === 'Muy Caliente' || temp === 'Cálido' ? (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 font-bold px-3 py-2 rounded-lg flex items-center gap-2">
                      <Flame size={14} className="text-rose-600 animate-pulse shrink-0" />
                      <span>🔥 Caliente (Alta Prioridad)</span>
                    </div>
                  ) : temp === 'Frío' ? (
                    <div className="bg-sky-50 border border-sky-200 text-sky-700 font-bold px-3 py-2 rounded-lg flex items-center gap-2">
                      <Snowflake size={14} className="text-sky-600 shrink-0" />
                      <span>❄️ Frío (Informativo)</span>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 font-bold px-3 py-2 rounded-lg flex items-center gap-2">
                      <Zap size={14} className="text-amber-600 shrink-0" />
                      <span>⚡ Tibio (En Evaluación)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Valor Estimado Lote ($ USD) con formato monetario */}
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Valor Estimado Lote ($ USD)</label>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">
                    {formattedCurrencyPreview}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-2 text-slate-400 font-bold font-mono text-xs">
                    $
                  </div>
                  <input
                    type="number"
                    value={dealValue}
                    onChange={(e) => setDealValue(Number(e.target.value) || 0)}
                    step="500"
                    min="0"
                    placeholder="30000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-14 py-2 text-slate-800 font-mono font-bold outline-none focus:border-rose-500 focus:bg-white"
                  />
                  <span className="absolute right-3 top-2 text-[10px] font-mono text-slate-400 font-semibold">
                    USD
                  </span>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* MODAL FOOTER */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles size={12} className="text-emerald-600" />
            Al guardar, el prospecto pasará automáticamente a estado <strong className="text-emerald-700 font-bold">"Contactado"</strong>.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-200/70 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Guardando en BDD...</span>
                </>
              ) : (
                <>
                  <Save size={15} />
                  <span>Guardar Cambios en BDD</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
