import React, { useState, useEffect } from 'react';
import { 
  Target, TrendingUp, Building2, Users, ShieldCheck, 
  Plus, Edit2, Trash2, CheckCircle2, AlertTriangle, 
  Calendar, DollarSign, Filter, RefreshCw, Save, X, 
  ArrowUpRight, Award, BarChart3, Check, Layers
} from 'lucide-react';
import { MetaComercial, MetaProgress, Agencia, Usuario } from '../types';
import { formatCurrency } from '../lib/utils';
import { subscribeToDbSync } from '../lib/databaseSync';

interface MetasComercialesViewProps {
  userRole?: string;
  currentUser?: Usuario | null;
  onNavigateToDashboard?: () => void;
}

export default function MetasComercialesView({
  userRole = 'gerencial',
  currentUser,
  onNavigateToDashboard
}: MetasComercialesViewProps) {
  const [activeTab, setActiveTab] = useState<'progreso' | 'agencias' | 'asesores' | 'roles'>('progreso');
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('2026-07');
  const [metas, setMetas] = useState<MetaComercial[]>([]);
  const [progresos, setProgresos] = useState<MetaProgress[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal State for adding/editing meta
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Partial<MetaComercial> | null>(null);

  // Inline edit state
  const [inlineEdits, setInlineEdits] = useState<Record<number, Partial<MetaComercial>>>({});

  const roleLower = (userRole || '').toLowerCase().trim();
  const isAdmin = roleLower === 'admin' || roleLower.includes('administrador') || roleLower.includes('super admin');
  const isEditable = isAdmin || userRole === 'gerencial' || userRole === 'admin' || userRole === 'CEO' || userRole === 'Director Administrativo' || userRole === 'Supervisor Comercial';

  const loadData = async () => {
    try {
      setLoading(true);
      const [metasRes, progresoRes, agRes, usRes] = await Promise.all([
        fetch(`/api/metas?periodo=${selectedPeriodo}`).then(r => r.json()),
        fetch(`/api/metas/progreso?periodo=${selectedPeriodo}`).then(r => r.json()),
        fetch('/api/agencias').then(r => r.json()),
        fetch('/api/usuarios').then(r => r.json())
      ]);

      setMetas(Array.isArray(metasRes) ? metasRes : []);
      setProgresos(Array.isArray(progresoRes) ? progresoRes : []);
      setAgencias(Array.isArray(agRes) ? agRes : []);
      setUsuarios(Array.isArray(usRes) ? usRes : []);
      setInlineEdits({});
    } catch (err) {
      console.error('Error fetching metas data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToDbSync(['dashboard', 'all'], () => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [selectedPeriodo]);

  const handleOpenNewModal = (defaultTipo: 'agencia' | 'usuario' | 'rol') => {
    let defaultTargetId = '';
    let defaultTargetName = '';
    let defaultRole = 'Asesor Comercial';
    let defaultAgencyId: number | null = null;
    let defaultAgencyName = '';

    if (defaultTipo === 'agencia' && agencias.length > 0) {
      defaultTargetId = `agency_${agencias[0].id}`;
      defaultTargetName = agencias[0].name;
      defaultAgencyId = agencias[0].id;
      defaultAgencyName = agencias[0].name;
      defaultRole = 'Agencia';
    } else if (defaultTipo === 'usuario') {
      const asesores = usuarios.filter(u => u.role === 'Asesor' || u.role?.includes('Asesor'));
      const defaultUser = asesores.length > 0 ? asesores[0] : usuarios[0];
      if (defaultUser) {
        defaultTargetId = `user_${defaultUser.id}`;
        defaultTargetName = defaultUser.name;
        defaultRole = defaultUser.role || 'Asesor Comercial';
        defaultAgencyId = defaultUser.agency_id || null;
        const ag = agencias.find(a => a.id === defaultUser.agency_id);
        defaultAgencyName = ag ? ag.name : '';
      }
    } else if (defaultTipo === 'rol') {
      defaultTargetId = 'role_asesor_comercial';
      defaultTargetName = 'Asesor Comercial (Estándar)';
      defaultRole = 'Asesor Comercial';
      defaultAgencyName = 'Todas';
    }

    setEditingMeta({
      tipo: defaultTipo,
      target_id: defaultTargetId,
      target_name: defaultTargetName,
      role: defaultRole,
      agency_id: defaultAgencyId,
      agency_name: defaultAgencyName,
      periodo: selectedPeriodo,
      periodo_tipo: 'mensual',
      meta_monto: defaultTipo === 'agencia' ? 250000 : 60000,
      meta_unidades: defaultTipo === 'agencia' ? 8 : 2,
      meta_proformas: defaultTipo === 'agencia' ? 25 : 10,
      meta_citas: defaultTipo === 'agencia' ? 18 : 8,
      meta_recaudacion: defaultTipo === 'agencia' ? 50000 : 12000,
      notas: ''
    });
    setIsModalOpen(true);
  };

  const handleEditModal = (item: MetaComercial) => {
    setEditingMeta({ ...item });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeta) return;

    try {
      setSaving(true);
      const res = await fetch('/api/metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMeta)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        setEditingMeta(null);
        await loadData();
      } else {
        alert('Error al guardar meta: ' + (data.message || 'Error del servidor'));
      }
    } catch (err: any) {
      alert('Error en conexión: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeta = async (id?: number) => {
    if (!id) return;
    if (!confirm('¿Estás seguro de eliminar esta meta comercial personalizada?')) return;

    try {
      const res = await fetch(`/api/metas/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInlineChange = (id: number, field: keyof MetaComercial, value: any) => {
    setInlineEdits(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: Number(value) || 0
      }
    }));
  };

  const handleSaveInline = async (id: number) => {
    const edits = inlineEdits[id];
    if (!edits) return;

    const original = metas.find(m => m.id === id);
    if (!original) return;

    const payload = {
      ...original,
      ...edits
    };

    try {
      setSaving(true);
      const res = await fetch('/api/metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setInlineEdits(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        await loadData();
      }
    } finally {
      setSaving(false);
    }
  };

  // Aggregated KPIs for the current period
  const totalMetaMonto = metas
    .filter(m => m.tipo === 'agencia')
    .reduce((acc, m) => acc + Number(m.meta_monto || 0), 0);

  const totalActualMonto = progresos
    .filter(p => p.meta.tipo === 'agencia')
    .reduce((acc, p) => acc + Number(p.actual_monto || 0), 0);

  const overallPercentage = totalMetaMonto > 0 
    ? Math.min(100, Math.round((totalActualMonto / totalMetaMonto) * 100)) 
    : 0;

  const totalMetaUnidades = metas
    .filter(m => m.tipo === 'agencia')
    .reduce((acc, m) => acc + Number(m.meta_unidades || 0), 0);

  const totalActualUnidades = progresos
    .filter(p => p.meta.tipo === 'agencia')
    .reduce((acc, p) => acc + Number(p.actual_unidades || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-rose-50 text-[#E11D48] border border-rose-100">
              <Target size={22} className="stroke-[2.2]" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
              Control de Metas Comerciales
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            Administra metas variables y objetivos de ventas por Agencia, Asesor y Tipo de Usuario con sincronización en tiempo real con el Dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar size={15} className="text-slate-500" />
            <span className="text-xs font-semibold text-slate-600">Periodo:</span>
            <select
              value={selectedPeriodo}
              onChange={(e) => setSelectedPeriodo(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="2026-07">Julio 2026 (Actual)</option>
              <option value="2026-08">Agosto 2026</option>
              <option value="2026-09">Septiembre 2026</option>
              <option value="2026-10">Octubre 2026</option>
              <option value="2026-11">Noviembre 2026</option>
              <option value="2026-12">Diciembre 2026</option>
            </select>
          </div>

          <button
            onClick={loadData}
            title="Actualizar datos"
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[#E11D48]' : ''} />
          </button>

          {isEditable && (
            <div className="relative inline-block text-left">
              <button
                onClick={() => handleOpenNewModal(activeTab === 'agencias' ? 'agencia' : (activeTab === 'roles' ? 'rol' : 'usuario'))}
                className="flex items-center gap-2 px-4 py-2 bg-[#E11D48] hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                <Plus size={16} />
                <span>Nueva Meta Variable</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Consolidated KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Total Goal vs Actual */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Meta Corporativa Total
            </span>
            <span className="p-2 rounded-lg bg-rose-50 text-[#E11D48]">
              <DollarSign size={16} />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(totalMetaMonto, true)}
            </h3>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>Alcanzado: <strong className="text-slate-800 font-bold">{formatCurrency(totalActualMonto, true)}</strong></span>
              <span className="font-bold text-[#E11D48]">{overallPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-[#E11D48] h-full rounded-full transition-all duration-500" 
                style={{ width: `${overallPercentage}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Card 2: Units Sold */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Objetivo Unidades (Lotes)
            </span>
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Award size={16} />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {totalActualUnidades} / <span className="text-slate-400 text-lg">{totalMetaUnidades} lotes</span>
            </h3>
            <p className="text-xs text-slate-500 mt-2">
              Cumplimiento de {totalMetaUnidades > 0 ? Math.round((totalActualUnidades / totalMetaUnidades) * 100) : 0}% en contratos cerrados
            </p>
          </div>
        </div>

        {/* Card 3: Metas Activas */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Cobertura de Metas
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <BarChart3 size={16} />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {metas.length} <span className="text-slate-400 text-sm font-normal">metas configuradas</span>
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
              <span>{metas.filter(m => m.tipo === 'agencia').length} Agencias</span>
              <span>•</span>
              <span>{metas.filter(m => m.tipo === 'usuario').length} Asesores</span>
              <span>•</span>
              <span>{metas.filter(m => m.tipo === 'rol').length} Roles</span>
            </div>
          </div>
        </div>

        {/* Card 4: Quick Action to Dashboard */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-wider text-rose-400 uppercase">Impacto en Tiempo Real</span>
              <ArrowUpRight size={16} className="text-rose-400" />
            </div>
            <h4 className="text-sm font-bold mt-2">Sincronizado con Dashboard</h4>
            <p className="text-xs text-slate-300 mt-1">
              Las metas modificadas aquí se reflejan instantáneamente en las barras de progreso del Dashboard.
            </p>
          </div>
          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="mt-3 w-full py-1.5 px-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs font-bold text-center transition"
            >
              Ver en el Dashboard
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('progreso')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'progreso'
                ? 'border-[#E11D48] text-[#E11D48]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp size={16} />
            <span>Progreso y Cumplimiento</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
              {progresos.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('agencias')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'agencias'
                ? 'border-[#E11D48] text-[#E11D48]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 size={16} />
            <span>Metas por Agencia</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
              {metas.filter(m => m.tipo === 'agencia').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('asesores')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'asesores'
                ? 'border-[#E11D48] text-[#E11D48]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={16} />
            <span>Metas por Asesor</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
              {metas.filter(m => m.tipo === 'usuario').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'roles'
                ? 'border-[#E11D48] text-[#E11D48]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck size={16} />
            <span>Metas por Tipo de Usuario (Rol)</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">
              {metas.filter(m => m.tipo === 'rol').length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: PROGRESO Y CUMPLIMIENTO CONSOLIDADO */}
      {activeTab === 'progreso' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Metas por Agencia Progress Cards */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 size={18} className="text-[#E11D48]" />
                  <h3 className="text-sm font-bold text-slate-900">Cumplimiento por Agencia</h3>
                </div>
                <span className="text-xs text-slate-400 font-semibold">{selectedPeriodo}</span>
              </div>

              <div className="space-y-4">
                {progresos.filter(p => p.meta.tipo === 'agencia').map((p, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-slate-800">{p.meta.target_name}</div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'cumplida' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : p.status === 'en_camino' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {p.status === 'cumplida' ? 'Cumplida' : p.status === 'en_camino' ? 'En Progreso' : 'En Riesgo'}
                        </span>
                        <span className="font-bold text-slate-900">{p.pct_monto}%</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          p.pct_monto >= 100 ? 'bg-emerald-500' : p.pct_monto >= 60 ? 'bg-[#E11D48]' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, p.pct_monto)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Vendido: <strong className="text-slate-800">{formatCurrency(p.actual_monto, true)}</strong></span>
                      <span>Meta: <strong className="text-slate-800">{formatCurrency(p.meta.meta_monto, true)}</strong></span>
                      <span>{p.actual_unidades} / {p.meta.meta_unidades} lotes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Metas por Asesor Progress Cards */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Cumplimiento por Asesor Comercial</h3>
                </div>
                <span className="text-xs text-slate-400 font-semibold">{selectedPeriodo}</span>
              </div>

              <div className="space-y-4">
                {progresos.filter(p => p.meta.tipo === 'usuario').map((p, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">{p.meta.target_name}</span>
                        {p.meta.agency_name && (
                          <span className="ml-2 text-[10px] text-slate-400 font-medium">({p.meta.agency_name})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{p.pct_monto}%</span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          p.pct_monto >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, p.pct_monto)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Vendido: <strong className="text-slate-800">{formatCurrency(p.actual_monto, true)}</strong></span>
                      <span>Meta: <strong className="text-slate-800">{formatCurrency(p.meta.meta_monto, true)}</strong></span>
                      <span>{p.actual_unidades} / {p.meta.meta_unidades} lotes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2, 3, 4: GESTIÓN Y CONFIGURACIÓN DE METAS VARIABLES */}
      {activeTab !== 'progreso' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {activeTab === 'agencias' ? 'Metas Asignadas por Agencia' : activeTab === 'asesores' ? 'Metas Individuales de Asesores' : 'Metas Estándar por Tipo de Usuario (Rol)'}
              </h3>
              <p className="text-xs text-slate-400">
                Ajusta montos en dólares, número de lotes objetivo, citas y proformas para el periodo seleccionado.
              </p>
            </div>

            {isEditable && (
              <button
                onClick={() => handleOpenNewModal(activeTab === 'agencias' ? 'agencia' : activeTab === 'roles' ? 'rol' : 'usuario')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold transition"
              >
                <Plus size={14} />
                <span>Agregar Meta</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Destinatario / Entidad</th>
                  <th className="py-3 px-4">Tipo / Rol</th>
                  <th className="py-3 px-4">Agencia</th>
                  <th className="py-3 px-4 text-right">Meta Monto ($)</th>
                  <th className="py-3 px-4 text-center">Lotes</th>
                  <th className="py-3 px-4 text-center">Proformas</th>
                  <th className="py-3 px-4 text-center">Citas</th>
                  <th className="py-3 px-4 text-right">Recaudación ($)</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {metas
                  .filter(m => {
                    if (activeTab === 'agencias') return m.tipo === 'agencia';
                    if (activeTab === 'asesores') return m.tipo === 'usuario';
                    if (activeTab === 'roles') return m.tipo === 'rol';
                    return true;
                  })
                  .map((m) => {
                    const id = m.id!;
                    const hasInlineEdit = !!inlineEdits[id];
                    const currentMonto = inlineEdits[id]?.meta_monto !== undefined ? inlineEdits[id]!.meta_monto : m.meta_monto;
                    const currentUnidades = inlineEdits[id]?.meta_unidades !== undefined ? inlineEdits[id]!.meta_unidades : m.meta_unidades;

                    return (
                      <tr key={id} className="hover:bg-slate-50/60 transition group">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            {m.tipo === 'agencia' ? (
                              <Building2 size={15} className="text-[#E11D48]" />
                            ) : m.tipo === 'usuario' ? (
                              <Users size={15} className="text-indigo-600" />
                            ) : (
                              <ShieldCheck size={15} className="text-purple-600" />
                            )}
                            <span>{m.target_name}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-semibold">
                            {m.role || (m.tipo === 'agencia' ? 'Agencia' : 'Rol')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-500">
                          {m.agency_name || 'Todas'}
                        </td>

                        {/* Inline Editable Meta Monto */}
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                          {isEditable ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-slate-400 text-[11px]">$</span>
                              <input
                                type="number"
                                value={currentMonto}
                                onChange={(e) => handleInlineChange(id, 'meta_monto', e.target.value)}
                                className="w-24 text-right bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-300 rounded px-1.5 py-0.5 font-bold focus:outline-none focus:ring-1 focus:ring-[#E11D48]"
                              />
                            </div>
                          ) : (
                            formatCurrency(m.meta_monto, true)
                          )}
                        </td>

                        {/* Inline Editable Unidades */}
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          {isEditable ? (
                            <input
                              type="number"
                              value={currentUnidades}
                              onChange={(e) => handleInlineChange(id, 'meta_unidades', e.target.value)}
                              className="w-12 text-center bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-slate-300 rounded px-1 py-0.5 font-bold focus:outline-none focus:ring-1 focus:ring-[#E11D48]"
                            />
                          ) : (
                            m.meta_unidades
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center text-slate-600">
                          {m.meta_proformas || '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center text-slate-600">
                          {m.meta_citas || '-'}
                        </td>

                        <td className="py-3.5 px-4 text-right text-slate-600">
                          {m.meta_recaudacion ? formatCurrency(m.meta_recaudacion, true) : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {hasInlineEdit && (
                              <button
                                onClick={() => handleSaveInline(id)}
                                title="Guardar cambios rápidos"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition"
                              >
                                <Save size={15} />
                              </button>
                            )}

                            {isEditable && (
                              <>
                                <button
                                  onClick={() => handleEditModal(m)}
                                  title="Editar meta detallada"
                                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteMeta(m.id)}
                                  title="Eliminar meta"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREAR / EDITAR META VARIABLE */}
      {isModalOpen && editingMeta && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-[#E11D48]" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingMeta.id ? 'Editar Meta Variable' : 'Crear Nueva Meta Variable'}
                </h3>
              </div>
              <button 
                onClick={() => { setIsModalOpen(false); setEditingMeta(null); }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4 text-xs">
              {/* Tipo de Meta Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Meta</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMeta(prev => ({
                        ...prev,
                        tipo: 'agencia',
                        target_id: agencias[0] ? `agency_${agencias[0].id}` : 'agency_1',
                        target_name: agencias[0] ? agencias[0].name : '',
                        role: 'Agencia',
                        agency_id: agencias[0] ? agencias[0].id : null,
                        agency_name: agencias[0] ? agencias[0].name : ''
                      }));
                    }}
                    className={`py-2 px-3 rounded-lg border font-bold text-center transition ${
                      editingMeta.tipo === 'agencia'
                        ? 'border-[#E11D48] bg-rose-50 text-[#E11D48]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Por Agencia
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const firstUser = usuarios[0];
                      setEditingMeta(prev => ({
                        ...prev,
                        tipo: 'usuario',
                        target_id: firstUser ? `user_${firstUser.id}` : 'user_1',
                        target_name: firstUser ? firstUser.name : '',
                        role: firstUser ? firstUser.role : 'Asesor Comercial',
                        agency_id: firstUser ? firstUser.agency_id : null,
                        agency_name: firstUser ? agencias.find(a => a.id === firstUser.agency_id)?.name || '' : ''
                      }));
                    }}
                    className={`py-2 px-3 rounded-lg border font-bold text-center transition ${
                      editingMeta.tipo === 'usuario'
                        ? 'border-[#E11D48] bg-rose-50 text-[#E11D48]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Por Asesor
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingMeta(prev => ({
                        ...prev,
                        tipo: 'rol',
                        target_id: 'role_asesor_comercial',
                        target_name: 'Asesor Comercial (Estándar)',
                        role: 'Asesor Comercial',
                        agency_id: null,
                        agency_name: 'Todas'
                      }));
                    }}
                    className={`py-2 px-3 rounded-lg border font-bold text-center transition ${
                      editingMeta.tipo === 'rol'
                        ? 'border-[#E11D48] bg-rose-50 text-[#E11D48]'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Por Rol
                  </button>
                </div>
              </div>

              {/* Target Selection Dropdown */}
              {editingMeta.tipo === 'agencia' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Seleccionar Agencia</label>
                  <select
                    value={editingMeta.target_name}
                    onChange={(e) => {
                      const selectedAg = agencias.find(a => a.name === e.target.value);
                      setEditingMeta(prev => ({
                        ...prev,
                        target_id: selectedAg ? `agency_${selectedAg.id}` : '',
                        target_name: e.target.value,
                        agency_id: selectedAg ? selectedAg.id : null,
                        agency_name: e.target.value
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-semibold focus:ring-1 focus:ring-[#E11D48]"
                  >
                    {agencias.map(ag => (
                      <option key={ag.id} value={ag.name}>{ag.name} ({ag.city})</option>
                    ))}
                  </select>
                </div>
              )}

              {editingMeta.tipo === 'usuario' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Seleccionar Usuario / Asesor</label>
                  <select
                    value={editingMeta.target_name}
                    onChange={(e) => {
                      const selectedUs = usuarios.find(u => u.name === e.target.value);
                      const userAg = selectedUs ? agencias.find(a => a.id === selectedUs.agency_id) : null;
                      setEditingMeta(prev => ({
                        ...prev,
                        target_id: selectedUs ? `user_${selectedUs.id}` : '',
                        target_name: e.target.value,
                        role: selectedUs?.role || 'Asesor Comercial',
                        agency_id: selectedUs?.agency_id || null,
                        agency_name: userAg?.name || ''
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-semibold focus:ring-1 focus:ring-[#E11D48]"
                  >
                    {usuarios.map(u => (
                      <option key={u.id} value={u.name}>{u.name} - {u.role}</option>
                    ))}
                  </select>
                </div>
              )}

              {editingMeta.tipo === 'rol' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Rol Estándar</label>
                  <select
                    value={editingMeta.target_id}
                    onChange={(e) => {
                      const roleOptions: Record<string, { name: string; role: string }> = {
                        'role_asesor_comercial': { name: 'Asesor Comercial (Estándar)', role: 'Asesor Comercial' },
                        'role_supervisor_comercial': { name: 'Supervisor Comercial (Estándar)', role: 'Supervisor Comercial' },
                        'role_asesora_cobranzas': { name: 'Asesora de Cobranzas (Estándar)', role: 'Asesora de Cobranzas' },
                        'role_supervisor_cobranzas': { name: 'Supervisor de Cobranzas (Estándar)', role: 'Supervisor de Cobranzas' }
                      };
                      const opt = roleOptions[e.target.value];
                      setEditingMeta(prev => ({
                        ...prev,
                        target_id: e.target.value,
                        target_name: opt?.name || e.target.value,
                        role: opt?.role || 'Asesor Comercial'
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 font-semibold focus:ring-1 focus:ring-[#E11D48]"
                  >
                    <option value="role_asesor_comercial">Asesor Comercial</option>
                    <option value="role_supervisor_comercial">Supervisor Comercial</option>
                    <option value="role_asesora_cobranzas">Asesora de Cobranzas</option>
                    <option value="role_supervisor_cobranzas">Supervisor de Cobranzas</option>
                  </select>
                </div>
              )}

              {/* Targets Grid */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Meta Monto ($ USD)</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={editingMeta.meta_monto || ''}
                    onChange={(e) => setEditingMeta(prev => ({ ...prev, meta_monto: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-bold focus:ring-1 focus:ring-[#E11D48]"
                    placeholder="Ej. 75000"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unidades (Lotes)</label>
                  <input
                    type="number"
                    required
                    value={editingMeta.meta_unidades || ''}
                    onChange={(e) => setEditingMeta(prev => ({ ...prev, meta_unidades: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-bold focus:ring-1 focus:ring-[#E11D48]"
                    placeholder="Ej. 3"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Meta Citas / Visitas</label>
                  <input
                    type="number"
                    value={editingMeta.meta_citas || ''}
                    onChange={(e) => setEditingMeta(prev => ({ ...prev, meta_citas: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-bold focus:ring-1 focus:ring-[#E11D48]"
                    placeholder="Ej. 10"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Meta Proformas</label>
                  <input
                    type="number"
                    value={editingMeta.meta_proformas || ''}
                    onChange={(e) => setEditingMeta(prev => ({ ...prev, meta_proformas: Number(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-bold focus:ring-1 focus:ring-[#E11D48]"
                    placeholder="Ej. 15"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Meta de Recaudación Líquida ($ USD)</label>
                <input
                  type="number"
                  step="500"
                  value={editingMeta.meta_recaudacion || ''}
                  onChange={(e) => setEditingMeta(prev => ({ ...prev, meta_recaudacion: Number(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 font-bold focus:ring-1 focus:ring-[#E11D48]"
                  placeholder="Ej. 18000"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notas u Observaciones</label>
                <textarea
                  rows={2}
                  value={editingMeta.notas || ''}
                  onChange={(e) => setEditingMeta(prev => ({ ...prev, notas: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-900 focus:ring-1 focus:ring-[#E11D48]"
                  placeholder="Objetivos específicos de la campaña o zona..."
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setEditingMeta(null); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#E11D48] hover:bg-rose-700 text-white rounded-lg font-bold shadow-sm transition flex items-center gap-2"
                >
                  {saving && <RefreshCw size={14} className="animate-spin" />}
                  <span>{editingMeta.id ? 'Actualizar Meta' : 'Guardar Meta'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
