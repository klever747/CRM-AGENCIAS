import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, CheckCircle2, Lock, Building2, DollarSign, Flame, Zap, Snowflake, Sparkles } from 'lucide-react';
import { Lead } from '../types';
import { COUNTRY_CODES, validateLeadData } from '../lib/utils';

/**
 * Formats a phone string into international format (e.g. "+593 959412316")
 */
export function formatInternationalPhone(raw?: string | null): string {
  if (!raw || !String(raw).trim()) return '';
  const str = String(raw).trim();
  const digits = str.replace(/\D/g, '');
  if (!digits) return str;

  // Ordered prefixes to detect country code
  const countryCodes = [
    '593', '1787', '1809', '507', '506', '503', '502', '504', '505',
    '595', '598', '591', '52', '57', '51', '54', '56', '34', '58',
    '39', '33', '49', '44', '1'
  ];

  for (const cc of countryCodes) {
    if (digits.startsWith(cc) && digits.length > cc.length) {
      let rest = digits.slice(cc.length);
      if (rest.startsWith('0')) rest = rest.slice(1);
      return `+${cc} ${rest}`;
    }
  }

  // If already with '+'
  if (str.startsWith('+')) {
    const parts = str.split(/\s+/);
    if (parts.length >= 2) return `${parts[0]} ${parts.slice(1).join('')}`;
    return str;
  }

  let rest = digits;
  if (rest.startsWith('0')) rest = rest.slice(1);
  return `+593 ${rest}`;
}

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (leadData: any) => Promise<void>;
  editingLead: Lead | null;
}

export function LeadModal({ isOpen, onClose, onSubmit, editingLead }: LeadModalProps) {
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [countryCode, setCountryCode] = useState('+593');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState('WhatsApp');
  const [project, setProject] = useState('Vista del Valle');
  const [agency, setAgency] = useState('Agencia Quito Norte');
  const [advisor, setAdvisor] = useState('Sin Asignar');
  const [temp, setTemp] = useState('Tibio');
  const [dealValue, setDealValue] = useState<number>(30000);
  const [cedula, setCedula] = useState('');
  const [saving, setSaving] = useState(false);
  const [proyectosList, setProyectosList] = useState<string[]>([
    'Vista del Valle',
    'Terrazas del Río',
    'Ciudad Verde Norte',
    'Bosques de Samborondón',
    'Altos del Valle'
  ]);

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

  useEffect(() => {
    if (editingLead) {
      setFirst(editingLead.first || '');
      setLast(editingLead.last || '');
      setEmail(editingLead.email || '');
      setSource(editingLead.source || 'WhatsApp');
      setProject(editingLead.project || 'Vista del Valle');
      setAgency(editingLead.agency || 'Agencia Quito Norte');
      setAdvisor(editingLead.advisor || 'Sin Asignar');
      setTemp(editingLead.temp || 'Tibio');
      setDealValue(Number(editingLead.deal_value) || 30000);
      setCedula(editingLead.cedula || '');
      setErrors({});

      // Parse phone and country code
      const rawPhone = (editingLead.phone || '').trim();
      let matchedCode = '+593';
      let remaining = rawPhone;

      for (const item of COUNTRY_CODES) {
        if (rawPhone.startsWith(item.code)) {
          matchedCode = item.code;
          remaining = rawPhone.substring(item.code.length);
          break;
        }
      }

      let digitsOnly = remaining.replace(/\D/g, '');
      if (digitsOnly.startsWith('0')) {
        digitsOnly = digitsOnly.substring(1);
      }
      setCountryCode(matchedCode);
      setPhoneDigits(digitsOnly.slice(0, 9));
    } else {
      setFirst('');
      setLast('');
      setCountryCode('+593');
      setPhoneDigits('');
      setEmail('');
      setSource('WhatsApp');
      setProject('Vista del Valle');
      setAgency('Agencia Quito Norte');
      setAdvisor('Sin Asignar');
      setTemp('Tibio');
      setDealValue(30000);
      setCedula('');
      setErrors({});
    }
  }, [editingLead, isOpen]);

  if (!isOpen) return null;

  // Handlers with strict live filtering
  const handleFirstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only letters, spaces, diacritics
    const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    setFirst(val);
    if (errors.first) setErrors(prev => ({ ...prev, first: '' }));
  };

  const handleLastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only letters, spaces, diacritics
    const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    setLast(val);
    if (errors.last) setErrors(prev => ({ ...prev, last: '' }));
  };

  const handleCedulaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only numbers, max 13 chars
    const val = e.target.value.replace(/\D/g, '').slice(0, 13);
    setCedula(val);
    if (errors.cedula) setErrors(prev => ({ ...prev, cedula: '' }));
  };

  const handlePhoneDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only numbers, max 9 chars. Strip leading zero if present
    let val = e.target.value.replace(/\D/g, '');
    if (val.startsWith('0')) {
      val = val.substring(1);
    }
    val = val.slice(0, 9);
    setPhoneDigits(val);
    if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    // 1. Nombre validation (Solo Letras)
    if (!first.trim()) {
      newErrors.first = 'El nombre es obligatorio.';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(first.trim())) {
      newErrors.first = 'El nombre debe contener solo letras.';
    }

    // 2. Apellido validation (Solo Letras)
    if (!last.trim()) {
      newErrors.last = 'El apellido es obligatorio.';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(last.trim())) {
      newErrors.last = 'El apellido debe contener solo letras.';
    }

    // 3. Cédula / RUC validation (Solo números, 10 o 13)
    const cleanCedula = cedula.trim();
    if (!cleanCedula) {
      newErrors.cedula = 'La Cédula/RUC es obligatoria.';
    } else if (!/^\d+$/.test(cleanCedula)) {
      newErrors.cedula = 'La Cédula/RUC solo debe contener números.';
    } else if (cleanCedula.length !== 10 && cleanCedula.length !== 13) {
      newErrors.cedula = `Debe tener exactamente 10 dígitos (Cédula) o 13 dígitos (RUC). Actual: ${cleanCedula.length} dígitos.`;
    }

    // 4. Phone validation (9 dígitos si es nuevo lead)
    if (!editingLead) {
      if (!phoneDigits) {
        newErrors.phone = 'El número celular es obligatorio.';
      } else if (phoneDigits.length !== 9) {
        newErrors.phone = `El celular debe tener exactamente 9 dígitos (sin el 0 inicial). Actual: ${phoneDigits.length} dígitos.`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const formattedPhone = editingLead 
      ? (editingLead.phone || `${countryCode} ${phoneDigits}`) 
      : `${countryCode} ${phoneDigits}`;

    // RULE: Al editar cualquier campo, pasa automáticamente a "Contactado"
    const finalStatus = 'Contactado';
    let finalStage = editingLead?.stage || 'lead';
    if (finalStage === 'lead') {
      finalStage = 'contact';
    }

    setSaving(true);
    try {
      await onSubmit({
        first: first.trim(),
        last: last.trim(),
        phone: formattedPhone,
        email: email.trim(),
        source: editingLead ? (editingLead.source || source) : source,
        project: (project || editingLead?.project || 'Vista del Valle').trim(),
        agency: editingLead ? (editingLead.agency || agency) : agency,
        advisor: editingLead ? (editingLead.advisor || advisor) : advisor,
        status: finalStatus,
        temp,
        deal_value: Number(dealValue) || 30000,
        cedula: cleanCedula,
        stage: finalStage
      });
      setSaving(false);
      onClose();
    } catch (err) {
      setSaving(false);
    }
  };

  // Helper for currency format display
  const formattedCurrencyPreview = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(dealValue) || 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Head */}
        <div className="h-14 border-b border-slate-100 px-6 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-sm font-display">
                {editingLead ? 'Editar Lead Comercial' : 'Registrar Nuevo Lead'}
              </h3>
              {editingLead && (
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Sparkles size={10} className="text-emerald-600" />
                  Pasa a Contactado
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              {editingLead ? 'Actualización comercial de datos del prospecto' : 'Registro de nuevo prospecto en la base de datos'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <X size={16} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Nombre & Apellido (Editables) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 text-xs">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Nombre *</span>
                <span className="text-[10px] text-slate-400 font-normal">Solo letras</span>
              </label>
              <input 
                type="text" 
                value={first || ''}
                onChange={handleFirstChange}
                placeholder="Ej: Silvana"
                className={`bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 outline-none transition ${
                  errors.first ? 'border-red-500 ring-1 ring-red-200' : 'border-slate-200 focus:border-rose-500 focus:bg-white'
                }`}
                required
              />
              {errors.first ? (
                <p className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                  <AlertCircle size={11} /> {errors.first}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Apellido *</span>
                <span className="text-[10px] text-slate-400 font-normal">Solo letras</span>
              </label>
              <input 
                type="text" 
                value={last || ''}
                onChange={handleLastChange}
                placeholder="Ej: Peña"
                className={`bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 outline-none transition ${
                  errors.last ? 'border-red-500 ring-1 ring-red-200' : 'border-slate-200 focus:border-rose-500 focus:bg-white'
                }`}
                required
              />
              {errors.last ? (
                <p className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                  <AlertCircle size={11} /> {errors.last}
                </p>
              ) : null}
            </div>
          </div>

          {/* Cédula/RUC & Celular WhatsApp */}
          <div className="grid grid-cols-2 gap-4">
            {/* Cédula / RUC (Editable) */}
            <div className="flex flex-col gap-1 text-xs">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Cédula / RUC *</span>
                <span className="text-[10px] text-slate-400 font-normal">10 o 13 números</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={cedula || ''}
                  onChange={handleCedulaChange}
                  maxLength={13}
                  placeholder="Ej: 1712345678 (10) / 001 (13)"
                  className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 outline-none font-mono transition ${
                    errors.cedula ? 'border-red-500 ring-1 ring-red-200' : 'border-slate-200 focus:border-rose-500 focus:bg-white'
                  }`}
                  required
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] font-mono text-slate-400">
                  {(cedula || '').length}/13
                </span>
              </div>

              {errors.cedula ? (
                <p className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                  <AlertCircle size={11} /> {errors.cedula}
                </p>
              ) : (cedula || '').length === 10 ? (
                <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                  <CheckCircle2 size={11} /> Cédula válida (10 dígitos)
                </p>
              ) : (cedula || '').length === 13 ? (
                <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                  <CheckCircle2 size={11} /> RUC válido (13 dígitos)
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Solo números. Cédula: 10 dígitos | RUC: 13 dígitos
                </p>
              )}
            </div>

            {/* Celular WhatsApp (BLOQUEADO / NO MODIFICABLE si se está editando) */}
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">WhatsApp</label>
                {editingLead ? (
                  <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Lock size={10} className="text-slate-500" />
                    No modificable
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-normal">9 dígitos sin '0'</span>
                )}
              </div>

              {editingLead ? (
                /* Campo bloqueado de sólo lectura en formato internacional e.g. +593 959412316 */
                <div className="relative">
                  <input
                    type="text"
                    value={formatInternationalPhone(editingLead.phone || `${countryCode} ${phoneDigits}`)}
                    readOnly
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono font-semibold cursor-not-allowed select-all"
                  />
                  <Lock size={13} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              ) : (
                /* Campo editable sólo para registro nuevo */
                <div className="flex gap-1.5">
                  <select
                    value={countryCode || '+593'}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-800 font-semibold outline-none focus:border-rose-500 text-xs shrink-0 max-w-[110px]"
                    title="Seleccionar código de país"
                  >
                    {COUNTRY_CODES.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.flag} {item.code}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={phoneDigits || ''}
                      onChange={handlePhoneDigitsChange}
                      maxLength={9}
                      placeholder="998123344"
                      className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-slate-800 font-mono outline-none transition ${
                        errors.phone ? 'border-red-500 ring-1 ring-red-200' : 'border-slate-200 focus:border-rose-500'
                      }`}
                      required
                    />
                    <span className="absolute right-2 top-2.5 text-[10px] font-mono text-slate-400">
                      {(phoneDigits || '').length}/9
                    </span>
                  </div>
                </div>
              )}

              {errors.phone ? (
                <p className="text-[10px] text-red-600 font-medium flex items-center gap-1 mt-0.5">
                  <AlertCircle size={11} /> {errors.phone}
                </p>
              ) : null}
            </div>
          </div>

          {/* Email (Editable) y Fuente de Lead (BLOQUEADA / NO MODIFICABLE si se está editando) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 text-xs">
              <label className="font-bold text-slate-700">Email Contacto</label>
              <input 
                type="email" 
                value={email || ''}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ej: cliente@correo.com"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-rose-500 focus:bg-white transition"
              />
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">Fuente de Lead</label>
                {editingLead && (
                  <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Lock size={10} className="text-slate-500" />
                    No modificable
                  </span>
                )}
              </div>

              {editingLead ? (
                <div className="relative">
                  <input
                    type="text"
                    value={source || editingLead.source || 'WhatsApp'}
                    readOnly
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-semibold cursor-not-allowed select-all"
                  />
                  <Lock size={13} className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
                </div>
              ) : (
                <select 
                  value={source || 'WhatsApp'}
                  onChange={(e) => setSource(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-rose-500 transition"
                >
                  <option value="WhatsApp">WhatsApp Directo</option>
                  <option value="Facebook">Campaña Facebook</option>
                  <option value="Instagram">Campaña Instagram</option>
                  <option value="TikTok">Campaña TikTok</option>
                  <option value="Referido">Referido Comercial</option>
                  <option value="Llamada">Llamada Telefónica</option>
                  <option value="Formulario web">Formulario Sitio Web</option>
                </select>
              )}
            </div>
          </div>

          {/* Proyecto de Interés (Listando TODAS las urbanizaciones de la tabla "proyectos") y Agencia (Muestra de dónde es) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 text-xs">
              <label className="font-bold text-slate-700 flex items-center justify-between">
                <span>Proyecto de Interés *</span>
                <span className="text-[10px] text-rose-600 font-semibold">{proyectosList.length} urbanizaciones</span>
              </label>
              <select 
                value={project || 'Vista del Valle'}
                onChange={(e) => setProject(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-rose-500 focus:bg-white transition font-medium"
              >
                {proyectosList.map((pName) => (
                  <option key={pName} value={pName}>
                    🏡 {pName}
                  </option>
                ))}
              </select>
            </div>

            {/* Agencia: Se muestra de dónde es (informativo / solo lectura) */}
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">Agencia / Sucursal</label>
                <span className="text-[10px] text-slate-500 font-medium bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Building2 size={10} className="text-slate-500" />
                  Origen
                </span>
              </div>
              <div className="relative">
                <div className="w-full bg-slate-100/90 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-semibold flex items-center gap-2 select-all">
                  <Building2 size={13} className="text-slate-500 shrink-0" />
                  <span className="truncate">{editingLead?.agency || agency || 'Agencia Quito Norte'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Temperatura (Solo Mostrar) y Valor Estimado Lote ($ USD con formato de dinero) */}
          <div className="grid grid-cols-2 gap-4">
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

            {/* Valor Estimado Lote ($ USD) en formato de dinero */}
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
                  step="500"
                  min="0"
                  value={dealValue ?? 30000}
                  onChange={(e) => setDealValue(Number(e.target.value) || 0)}
                  placeholder="30000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-14 py-2 text-slate-800 outline-none focus:border-rose-500 focus:bg-white transition font-mono font-bold"
                />
                <span className="absolute right-3 top-2 text-[10px] font-mono text-slate-400 font-semibold">
                  USD
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Formato monetario: <span className="font-mono font-semibold text-slate-600">{formattedCurrencyPreview}</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 font-bold text-xs transition cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="bg-[#E11D48] hover:bg-rose-700 text-white font-bold text-xs px-5 py-2 rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              <span>{editingLead ? 'Actualizar Lead y Pasar a Contactado' : 'Guardar Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


