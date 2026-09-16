import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, CircleDollarSign, 
  Handshake, Bookmark, CalendarDays, FileText, MapPin, 
  ChevronRight, Award, Flame, Filter, Target, ArrowUpRight,
  CheckCircle2, AlertCircle, Clock, Sparkles, Building2, User
} from 'lucide-react';
import { StatCard } from './common/StatCard';
import { formatCurrency } from '../lib/utils';
import { subscribeToDbSync } from '../lib/databaseSync';
import { Usuario } from '../types';

interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  citasCount: number;
  proformasCount: number;
  reservasCount: number;
  salesCount: number;
  salesAmount: number;
  goalTarget?: number;
  goalLabel?: string;
  goalUnits?: number;
  goalProformas?: number;
  goalCitas?: number;
  goalRecaudacion?: number;
  goalNotas?: string;
  targetName?: string;
  targetType?: string;
  targetAgency?: string;
  actualRecaudacion?: number;
}

interface TeamMetaItem {
  id: number;
  target_name: string;
  role?: string;
  agency_name?: string;
  meta_monto: number;
  meta_unidades: number;
  meta_proformas?: number;
  meta_citas?: number;
  meta_recaudacion?: number;
  actual_monto: number;
  actual_unidades: number;
  actual_proformas?: number;
  actual_citas?: number;
  pct_monto: number;
  pct_unidades?: number;
  status: 'cumplida' | 'en_camino' | 'en_riesgo';
}

interface RankingItem {
  name: string;
  sales: number;
  amountFmt: string;
}

interface DashboardViewProps {
  userRole: string;
  currentUser?: Usuario | null;
  onChangeScreen: (screen: string) => void;
  onSelectLead: (id: number) => void;
}

export default React.memo(function DashboardView({ userRole, currentUser, onChangeScreen, onSelectLead }: DashboardViewProps) {
  const [dashTab, setDashTab] = useState<'general' | 'agencia' | 'asesor'>('general');
  const [advisorFilter, setAdvisorFilter] = useState('Todos');
  const [agencyFilter, setAgencyFilter] = useState('Agencia Quito Norte');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthlySales, setMonthlySales] = useState<any[]>([]);
  const [salesByProject, setSalesByProject] = useState<any[]>([]);
  const [advisorRanking, setAdvisorRanking] = useState<RankingItem[]>([]);
  const [agencyRanking, setAgencyRanking] = useState<RankingItem[]>([]);
  const [teamAdvisorMetas, setTeamAdvisorMetas] = useState<TeamMetaItem[]>([]);
  const [teamAgencyMetas, setTeamAgencyMetas] = useState<TeamMetaItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Role detection
  const roleLower = (userRole || '').toLowerCase().trim();
  const isAdmin = roleLower === 'admin' || roleLower.includes('administrador') || roleLower.includes('super admin');

  const isAdministrativo = 
    !isAdmin && (
      roleLower.includes('administrativ') && !roleLower.includes('director')
    );

  const isAdvisorUser = 
    !isAdmin && !isAdministrativo && (
      userRole.toLowerCase().includes('asesor') || 
      (currentUser?.role && currentUser.role.toLowerCase().includes('asesor'))
    );

  const isAgencyUser = 
    !isAdmin && !isAdministrativo && (
      userRole.toLowerCase().includes('agencia') || 
      userRole.toLowerCase().includes('supervisor') || 
      (currentUser?.role && currentUser.role.toLowerCase().includes('supervisor'))
    );

  const fetchDashboardStats = (
    tab: 'general' | 'agencia' | 'asesor' = dashTab,
    advisor: string = advisorFilter,
    agency: string = agencyFilter
  ) => {
    setLoading(true);
    fetch(`/api/dashboard/stats?role=${tab}&advisor=${encodeURIComponent(advisor)}&agency=${encodeURIComponent(agency)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStats(data.summary);
          setMonthlySales(data.monthlySales || []);
          setSalesByProject(data.salesByProject || []);
          setAdvisorRanking(data.advisorRanking || []);
          setAgencyRanking(data.agencyRanking || []);
          setTeamAdvisorMetas(data.teamAdvisorMetas || []);
          setTeamAgencyMetas(data.teamAgencyMetas || []);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching stats:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    // Set appropriate starting tab based on role and current logged-in user
    if (isAdvisorUser) {
      setDashTab('asesor');
      const targetName = currentUser?.name || 'Andrea Cedeño';
      setAdvisorFilter(targetName);
      const ag = currentUser?.agency_name || agencyFilter;
      if (currentUser?.agency_name) {
        setAgencyFilter(currentUser.agency_name);
      }
      fetchDashboardStats('asesor', targetName, ag);
    } else if (isAgencyUser || isAdministrativo) {
      setDashTab('agencia');
      const userAgency = currentUser?.agency_name || agencyFilter || 'Agencia Quito Norte';
      setAgencyFilter(userAgency);
      setAdvisorFilter('Todos');
      fetchDashboardStats('agencia', 'Todos', userAgency);
    } else {
      setDashTab('general');
      setAdvisorFilter('Todos');
      fetchDashboardStats('general', 'Todos', agencyFilter);
    }
  }, [userRole, currentUser?.id, currentUser?.name, currentUser?.role, currentUser?.agency_name]);

  useEffect(() => {
    const unsubscribe = subscribeToDbSync(['dashboard', 'all', 'leads', 'ventas', 'metas'], () => {
      fetchDashboardStats();
    });

    return () => {
      unsubscribe();
    };
  }, [dashTab, advisorFilter, agencyFilter]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E11D48]" />
      </div>
    );
  }

  // Dynamic Variable Goal Metric Calculations
  const target = stats?.goalTarget || (dashTab === 'general' ? 840000 : (dashTab === 'agencia' ? 260000 : 70000));
  const current = stats?.salesAmount || 0;
  const goalPercentage = Math.min(200, Math.round((current / (target || 1)) * 100));
  
  const targetUnits = stats?.goalUnits || (dashTab === 'general' ? 26 : (dashTab === 'agencia' ? 8 : 3));
  const currentUnits = stats?.salesCount || 0;
  const unitsPercentage = Math.min(200, Math.round((currentUnits / (targetUnits || 1)) * 100));

  const targetCitas = stats?.goalCitas || (dashTab === 'general' ? 70 : (dashTab === 'agencia' ? 20 : 8));
  const currentCitas = stats?.citasCount || 0;
  const citasPercentage = Math.min(200, Math.round((currentCitas / (targetCitas || 1)) * 100));

  const targetProformas = stats?.goalProformas || (dashTab === 'general' ? 105 : (dashTab === 'agencia' ? 30 : 12));
  const currentProformas = stats?.proformasCount || 0;
  const proformasPercentage = Math.min(200, Math.round((currentProformas / (targetProformas || 1)) * 100));

  const targetRecaudacion = stats?.goalRecaudacion || (dashTab === 'general' ? 180000 : (dashTab === 'agencia' ? 55000 : 15000));
  const currentRecaudacion = stats?.actualRecaudacion || Math.round(current * 0.22);
  const recaudacionPercentage = Math.min(200, Math.round((currentRecaudacion / (targetRecaudacion || 1)) * 100));

  const goalLabel = stats?.goalLabel || (
    isAdministrativo
      ? `Meta de Ventas Mensual (${currentUser?.agency_name || agencyFilter})`
      : (dashTab === 'general' 
          ? 'Cumplimiento de Meta Mensual Corporativa' 
          : (dashTab === 'agencia' 
              ? `Meta de Ventas Mensual (${agencyFilter})` 
              : `Meta de Ventas (${advisorFilter})`))
  );

  // Funnel Data Percentages
  const funnelSteps = [
    { label: 'Leads', value: stats?.totalLeads || 0, color: 'bg-rose-900' },
    { label: 'Contactados', value: stats?.contactedLeads || 0, color: 'bg-[#E11D48]' },
    { label: 'Citas', value: stats?.citasCount || 0, color: 'bg-rose-500' },
    { label: 'Proformas', value: stats?.proformasCount || 0, color: 'bg-rose-400' },
    { label: 'Reservas', value: stats?.reservasCount || 0, color: 'bg-rose-300' },
    { label: 'Ventas Cerradas', value: stats?.salesCount || 0, color: 'bg-rose-200' }
  ];
  const maxFunnelVal = Math.max(...funnelSteps.map(f => f.value), 1);

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-[#E11D48] border border-rose-200/50 flex items-center gap-1">
              {dashTab === 'asesor' ? (
                <>
                  <User size={11} />
                  <span>Meta de Asesor: {stats?.targetName || advisorFilter}</span>
                </>
              ) : (dashTab === 'agencia' || isAdministrativo) ? (
                <>
                  <Building2 size={11} />
                  <span>Meta de Agencia: {stats?.targetAgency || currentUser?.agency_name || agencyFilter}</span>
                </>
              ) : (
                <>
                  <Target size={11} />
                  <span>Meta Corporativa Consolidada</span>
                </>
              )}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">Periodo Julio 2026</span>
          </div>

          <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">
            {isAdministrativo
              ? `Meta de Ventas • ${stats?.targetAgency || currentUser?.agency_name || agencyFilter}`
              : (dashTab === 'general' 
                  ? 'Dashboard Comercial Corporativo' 
                  : (dashTab === 'agencia' 
                      ? `Dashboard Comercial • ${agencyFilter}` 
                      : `Mi Actividad y Metas • ${stats?.targetName || advisorFilter}`))}
          </h2>
          <p className="text-xs text-slate-400">
            {isAdministrativo
              ? `Seguimiento de meta y recaudación comercial de tu agencia asignada (${stats?.targetAgency || currentUser?.agency_name || agencyFilter})`
              : (dashTab === 'general' 
                  ? 'Supervisión de metas corporativas, desempeño por sucursal y cuota individual de asesores' 
                  : (dashTab === 'agencia' 
                      ? 'Métricas y cumplimiento de metas variables para la agencia y su equipo comercial' 
                      : 'Control en tiempo real de tu cuota de ventas, lotes, proformas y visitas programadas'))}
          </p>
        </div>

        {/* Tab filters inside page */}
        <div className="flex flex-wrap items-center gap-2">
          {!isAdvisorUser && !isAdministrativo && (
            <div className="flex bg-slate-100 p-1 rounded-lg self-start border border-slate-200/40">
              <button 
                onClick={() => {
                  setDashTab('general');
                  setAdvisorFilter('Todos');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${dashTab === 'general' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Corporativo
              </button>
              <button 
                onClick={() => {
                  setDashTab('agencia');
                  setAdvisorFilter('Todos');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${dashTab === 'agencia' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Por Agencia
              </button>
              <button 
                onClick={() => {
                  setDashTab('asesor');
                  if (advisorFilter === 'Todos') setAdvisorFilter('Andrea Cedeño');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${dashTab === 'asesor' ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Por Asesor
              </button>
            </div>
          )}

          {isAdministrativo && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200/70 px-3 py-1.5 rounded-lg text-xs font-bold text-[#E11D48] shadow-2xs">
              <Building2 size={14} />
              <span>Agencia Perteneciente: <strong>{currentUser?.agency_name || agencyFilter}</strong></span>
            </div>
          )}

          {/* Quick link to Metas Comerciales module */}
          {!isAdvisorUser && !isAdministrativo && (
            <button
              onClick={() => onChangeScreen('metas')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-[#E11D48] border border-rose-200/60 rounded-lg text-xs font-bold transition shadow-xs"
              title="Configurar y auditar metas de ventas variables por usuario y agencia"
            >
              <Target size={14} />
              <span>Gestionar Metas</span>
            </button>
          )}
        </div>
      </div>

      {/* Agency & Advisor specific selector bar */}
      {dashTab === 'agencia' && (
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-[#E11D48]" />
            <span className="text-xs font-bold text-slate-700">
              {isAdministrativo ? 'Meta de tu Agencia Perteneciente:' : 'Filtrar Metas por Agencia y Asesor:'}
            </span>
            {isAdministrativo && (
              <span className="bg-rose-50 text-[#E11D48] text-xs font-bold px-2.5 py-0.5 rounded-md border border-rose-200/60">
                {currentUser?.agency_name || agencyFilter}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!isAdministrativo ? (
              <select
                value={agencyFilter}
                onChange={(e) => setAgencyFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-semibold focus:ring-1 focus:ring-[#E11D48]"
              >
                <option value="Agencia Quito Norte">Agencia Quito Norte</option>
                <option value="Agencia Guayaquil Centro">Agencia Guayaquil Centro</option>
                <option value="Agencia Cuenca">Agencia Cuenca</option>
                <option value="Agencia Manta">Agencia Manta</option>
              </select>
            ) : (
              <div className="text-xs text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5">
                <MapPin size={12} className="text-slate-400" />
                <span>Sede: {currentUser?.agency_city || 'Quito'} • {currentUser?.agency_name || agencyFilter}</span>
              </div>
            )}

            <select
              value={advisorFilter}
              onChange={(e) => {
                const newAdv = e.target.value;
                setAdvisorFilter(newAdv);
                fetchDashboardStats('agencia', newAdv, currentUser?.agency_name || agencyFilter);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-semibold focus:ring-1 focus:ring-[#E11D48]"
            >
              <option value="Todos">Toda la Agencia (Meta Consolidada)</option>
              <option value="Andrea Cedeño">Andrea Cedeño (Asesor)</option>
              <option value="Juan Pablo Merizalde">Juan Pablo Merizalde (Asesor)</option>
              <option value="Daniela Vera">Daniela Vera (Asesor)</option>
              <option value="Carlos Pinto">Carlos Pinto (Asesor)</option>
              <option value="Luis Fernando Ortiz">Luis Fernando Ortiz (Asesor)</option>
            </select>
          </div>
        </div>
      )}

      {dashTab === 'asesor' && !isAdvisorUser && (
        <div className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-[#E11D48]" />
            <span className="text-xs font-bold text-slate-800">
              Visualizar Meta Asignada del Asesor:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Asesor:</span>
            <select
              value={advisorFilter === 'Todos' ? (currentUser?.name || 'Andrea Cedeño') : advisorFilter}
              onChange={(e) => {
                const newAdv = e.target.value;
                setAdvisorFilter(newAdv);
                fetchDashboardStats('asesor', newAdv, agencyFilter);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-bold focus:ring-1 focus:ring-[#E11D48]"
            >
              <option value="Andrea Cedeño">Andrea Cedeño (Agencia Quito Norte)</option>
              <option value="Juan Pablo Merizalde">Juan Pablo Merizalde (Agencia Guayaquil Centro)</option>
              <option value="Carlos Andrés Pinto">Carlos Andrés Pinto (Agencia Quito Norte)</option>
              <option value="Daniela Vera">Daniela Vera (Agencia Cuenca)</option>
              <option value="Luis Fernando Ortiz">Luis Fernando Ortiz (Agencia Manta)</option>
            </select>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PANEL DE CADA META CORRESPONDIENTE (VARIABLE GOALS METRICS) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-white to-slate-50/50 border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Header of the Goal Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-[#E11D48]/10 text-[#E11D48]">
                <Target size={18} />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {goalLabel}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5">
                  <span>Asignada a: <strong className="text-slate-700">{stats?.targetName || (dashTab === 'asesor' ? advisorFilter : agencyFilter)}</strong></span>
                  <span>•</span>
                  <span>Agencia: <strong className="text-slate-700">{stats?.targetAgency || agencyFilter}</strong></span>
                  {stats?.goalNotas && (
                    <>
                      <span>•</span>
                      <span className="italic text-slate-400">"{stats.goalNotas}"</span>
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <div className="text-right">
              <div className="flex items-center gap-1.5 justify-end">
                <span className="text-xl font-bold text-slate-900">{goalPercentage}%</span>
                {goalPercentage >= 100 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 size={12} /> Meta Superada
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <Clock size={12} /> En Progreso
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {formatCurrency(current, true)} de {formatCurrency(target, true)} facturados
              </p>
            </div>
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${
                goalPercentage >= 100 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-xs' 
                  : 'bg-gradient-to-r from-[#E11D48] to-rose-500'
              }`} 
              style={{ width: `${Math.min(100, goalPercentage)}%` }} 
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-slate-500">
            <span>Inicio del Periodo: $0</span>
            <span className="font-semibold text-slate-700">
              {current >= target ? `Superávit: +${formatCurrency(current - target, true)}` : `Faltan: ${formatCurrency(target - current, true)} para cumplir`}
            </span>
            <span>Meta Objetivo: {formatCurrency(target, true)}</span>
          </div>
        </div>

        {/* REJILLA DE CADA META INDIVIDUAL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-1">
          {/* Card 1: Facturación $ */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs hover:border-rose-200 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">1. Facturación ($)</span>
              <CircleDollarSign size={14} className="text-[#E11D48]" />
            </div>
            <div className="text-lg font-bold text-slate-900 mb-1">
              {formatCurrency(current, true)}
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-2">
              <span>Meta: <strong className="text-slate-600">{formatCurrency(target, true)}</strong></span>
              <span className={`font-bold ${goalPercentage >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>{goalPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${goalPercentage >= 100 ? 'bg-emerald-500' : 'bg-[#E11D48]'}`}
                style={{ width: `${Math.min(100, goalPercentage)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Lotes Cerrados */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs hover:border-rose-200 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">2. Lotes Vendidos</span>
              <Bookmark size={14} className="text-indigo-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 mb-1">
              {currentUnits} <span className="text-xs font-normal text-slate-400">lotes</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-2">
              <span>Meta: <strong className="text-slate-600">{targetUnits} lotes</strong></span>
              <span className={`font-bold ${unitsPercentage >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>{unitsPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${unitsPercentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                style={{ width: `${Math.min(100, unitsPercentage)}%` }}
              />
            </div>
          </div>

          {/* Card 3: Citas / Visitas */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs hover:border-rose-200 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">3. Citas / Visitas</span>
              <CalendarDays size={14} className="text-amber-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 mb-1">
              {currentCitas} <span className="text-xs font-normal text-slate-400">citas</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-2">
              <span>Meta: <strong className="text-slate-600">{targetCitas} citas</strong></span>
              <span className={`font-bold ${citasPercentage >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>{citasPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${citasPercentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, citasPercentage)}%` }}
              />
            </div>
          </div>

          {/* Card 4: Proformas Emitidas */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs hover:border-rose-200 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">4. Proformas</span>
              <FileText size={14} className="text-sky-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 mb-1">
              {currentProformas} <span className="text-xs font-normal text-slate-400">emitidas</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-2">
              <span>Meta: <strong className="text-slate-600">{targetProformas} cotiz.</strong></span>
              <span className={`font-bold ${proformasPercentage >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>{proformasPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${proformasPercentage >= 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
                style={{ width: `${Math.min(100, proformasPercentage)}%` }}
              />
            </div>
          </div>

          {/* Card 5: Recaudación Líquida */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs hover:border-rose-200 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">5. Recaudación</span>
              <Handshake size={14} className="text-emerald-600" />
            </div>
            <div className="text-lg font-bold text-slate-900 mb-1">
              {formatCurrency(currentRecaudacion, true)}
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-2">
              <span>Meta: <strong className="text-slate-600">{formatCurrency(targetRecaudacion, true)}</strong></span>
              <span className={`font-bold ${recaudacionPercentage >= 100 ? 'text-emerald-600' : 'text-slate-700'}`}>{recaudacionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${recaudacionPercentage >= 100 ? 'bg-emerald-500' : 'bg-emerald-600'}`}
                style={{ width: `${Math.min(100, recaudacionPercentage)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Leads */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Leads Totales</span>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/50 text-slate-700">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats?.totalLeads}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp size={12} className="text-emerald-600" />
              <span>+{stats?.newLeads} nuevos registrados</span>
            </p>
          </div>
        </div>

        {/* Card 2: Revenue */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monto Vendido</span>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/50 text-slate-700">
              <CircleDollarSign size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatCurrency(stats?.salesAmount || 0, true)}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp size={12} className="text-emerald-600" />
              <span>{goalPercentage}% de la meta mensual</span>
            </p>
          </div>
        </div>

        {/* Card 3: Reservas */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lotes Reservados</span>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/50 text-slate-700">
              <Bookmark size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats?.reservasCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              En proceso de firma de promesa
            </p>
          </div>
        </div>

        {/* Card 4: Sales */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ventas Cerradas</span>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/50 text-[#E11D48]">
              <Handshake size={16} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {stats?.salesCount}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              Meta: {targetUnits} lotes cerrados
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN: TABLERO DE METAS DE CADA ASESOR Y AGENCIA (VISIBILIDAD TOTAL) */}
      {/* No se muestra en la pestaña o rol de Asesores */}
      {/* ========================================================================= */}
      {dashTab !== 'asesor' && !isAdvisorUser && teamAdvisorMetas.length > 0 && (() => {
        const currentAgency = (currentUser?.agency_name || agencyFilter || 'Agencia Quito Norte').toLowerCase();
        const displayedAdvisorMetas = isAdministrativo
          ? teamAdvisorMetas.filter(adv => {
              const agName = (adv.agency_name || '').toLowerCase();
              return !agName || agName.includes(currentAgency) || currentAgency.includes(agName);
            })
          : teamAdvisorMetas;

        return (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Target size={16} className="text-[#E11D48]" />
                  <span>{isAdministrativo ? `Metas por Asesor • ${currentUser?.agency_name || agencyFilter}` : 'Control de Metas Correspondientes por Asesor'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {isAdministrativo 
                    ? 'Cumplimiento individual de los asesores comerciales adscritos a tu agencia.' 
                    : 'Visualiza y compara el cumplimiento de la meta individual de cada asesor comercial. Haz clic para auditar su panel.'}
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                {displayedAdvisorMetas.length} Asesores con Meta Activa
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedAdvisorMetas.map((adv) => {
                const isSelected = advisorFilter === adv.target_name && dashTab === 'asesor';
                return (
                  <div 
                    key={adv.id} 
                    className={`border rounded-xl p-4 transition duration-200 flex flex-col justify-between ${
                      isSelected 
                        ? 'border-[#E11D48] bg-rose-50/20 shadow-sm ring-1 ring-[#E11D48]/30' 
                        : 'border-slate-200 hover:border-slate-300 bg-white shadow-2xs'
                    }`}
                  >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{adv.target_name}</span>
                          {adv.status === 'cumplida' && <CheckCircle2 size={13} className="text-emerald-500 inline" />}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {adv.agency_name || 'Agencia'} • {adv.role || 'Asesor'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        adv.status === 'cumplida' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : adv.status === 'en_camino'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {adv.pct_monto}%
                      </span>
                    </div>

                    <div className="space-y-1.5 my-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Monto Facturado:</span>
                        <strong className="text-slate-900">{formatCurrency(adv.actual_monto, true)} / {formatCurrency(adv.meta_monto, true)}</strong>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${adv.status === 'cumplida' ? 'bg-emerald-500' : 'bg-[#E11D48]'}`}
                          style={{ width: `${Math.min(100, adv.pct_monto)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                        <span>Lotes: <strong className="text-slate-700">{adv.actual_unidades}/{adv.meta_unidades}</strong></span>
                        <span>Citas: <strong className="text-slate-700">{adv.actual_citas}/{adv.meta_citas || 8}</strong></span>
                        <span>Proformas: <strong className="text-slate-700">{adv.actual_proformas}/{adv.meta_proformas || 10}</strong></span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setDashTab('asesor');
                      setAdvisorFilter(adv.target_name);
                      if (adv.agency_name) setAgencyFilter(adv.agency_name);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`mt-2 w-full py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#E11D48] text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <span>{isSelected ? '✓ Viendo su Meta' : 'Ver Meta de este Asesor'}</span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        );
      })()}

      {/* Main Charts & Funnel Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales Evolution */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} className="text-[#E11D48]" />
              <span>Evolución Mensual de Cierres</span>
            </h4>
            <span className="text-[11px] text-slate-400 font-medium">Últimos 6 meses</span>
          </div>
          <div className="h-56 flex items-end justify-between gap-3 pt-6 border-b border-slate-100">
            {monthlySales.map((item, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded shadow-2xs">
                  {item.fmt}
                </div>
                <div 
                  className="w-full bg-rose-100 group-hover:bg-[#E11D48] rounded-t-md transition-all duration-300 relative"
                  style={{ height: `${item.h}%` }}
                />
                <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-900 transition-colors">
                  {item.month}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Commercial Sales Funnel */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-slate-800" />
            <span>Embudo Comercial de Conversión</span>
          </h4>
          <div className="space-y-2.5">
            {funnelSteps.map((step, idx) => {
              const widthPct = Math.max(10, Math.round((step.value / maxFunnelVal) * 100));
              return (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-24 text-right text-xs text-slate-500 font-semibold truncate">
                    {step.label}
                  </div>
                  <div className="flex-1">
                    <div 
                      className={`h-7 ${step.color} text-white rounded-md flex items-center px-3 text-xs font-bold transition-all duration-300 shadow-sm`}
                      style={{ width: `${widthPct}%` }}
                    >
                      {step.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Rankings Section */}
      {dashTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Advisor Rankings */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award size={14} className="text-amber-500" />
              <span>Desempeño y Cierres por Asesor</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-500">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400 font-bold">
                    <th className="py-3 font-semibold">Asesor</th>
                    <th className="py-3 font-semibold text-center">Cierres</th>
                    <th className="py-3 font-semibold text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {advisorRanking.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="py-3 font-bold text-slate-800 flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                          {idx + 1}
                        </span>
                        <span>{item.name}</span>
                        {idx === 0 && <Flame size={12} className="text-[#E11D48] animate-pulse inline" />}
                      </td>
                      <td className="py-3 text-center font-bold text-slate-700">{item.sales}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{item.amountFmt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Agency Rankings */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award size={14} className="text-slate-800" />
              <span>Rendimiento y Cierres por Agencia</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-500">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400 font-bold">
                    <th className="py-3 font-semibold">Agencia</th>
                    <th className="py-3 font-semibold text-center">Cierres</th>
                    <th className="py-3 font-semibold text-right">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {agencyRanking.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="py-3 font-bold text-slate-800 flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold">
                          {idx + 1}
                        </span>
                        <span>{item.name}</span>
                      </td>
                      <td className="py-3 text-center font-bold text-slate-700">{item.sales}</td>
                      <td className="py-3 text-right font-bold text-slate-900">{item.amountFmt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
