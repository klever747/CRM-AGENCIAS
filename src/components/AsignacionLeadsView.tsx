import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserCheck, Shuffle, Scale, Users, Building2, CheckCircle2, 
  AlertCircle, Search, Filter, ArrowRight, RefreshCw, Sparkles,
  Shield, Check, UserPlus, Phone, MessageSquare, Briefcase, Info,
  TrendingUp, BarChart3, AlertTriangle, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { Lead, AdvisorWorkload, Agencia } from '../types';
import { StatusBadge, TempBadge } from './common/StatusBadge';
import { isLeadUnassigned } from './LeadsView';
import { subscribeToDbSync } from '../lib/databaseSync';

interface AsignacionLeadsViewProps {
  leads: Lead[];
  onRefreshLeads: () => void;
  userRole: string;
  currentUserName?: string;
  onOpenLead360?: (id: number) => void;
  onGoLeads?: (message?: string) => void;
}

export default function AsignacionLeadsView({
  leads,
  onRefreshLeads,
  userRole,
  currentUserName = 'Administrador',
  onOpenLead360,
  onGoLeads
}: AsignacionLeadsViewProps) {
  // Workload state from API
  const [advisors, setAdvisors] = useState<AdvisorWorkload[]>([]);
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [loadingAdvisors, setLoadingAdvisors] = useState(false);

  // Filters
  const [selectedAgency, setSelectedAgency] = useState<string>('Todas');
  const [leadFilterTab, setLeadFilterTab] = useState<'unassigned' | 'all' | 'assigned'>('unassigned');
  const [filterAdvisorName, setFilterAdvisorName] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);

  // Assignment Configuration
  const [assignmentMode, setAssignmentMode] = useState<'equitable' | 'manual'>('equitable');
  const [equitableStrategy, setEquitableStrategy] = useState<'load_balance' | 'round_robin'>('load_balance');
  const [manualAdvisor, setManualAdvisor] = useState<string>('');

  // Participating advisors for equitable distribution (set of advisor IDs or names)
  const [participatingAdvisorNames, setParticipatingAdvisorNames] = useState<string[]>([]);

  // Processing & Feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastActionResult, setLastActionResult] = useState<{
    success: boolean;
    message: string;
    details?: Array<{ leadName: string; advisor: string; agency: string }>;
  } | null>(null);

  // Fetch advisors workload and agencies
  const fetchWorkloadData = async () => {
    setLoadingAdvisors(true);
    try {
      const [resWorkload, resAgencias] = await Promise.all([
        fetch('/api/advisors/workload'),
        fetch('/api/agencias')
      ]);
      const dataWorkload = await resWorkload.json();
      const dataAgencias = await resAgencias.json();

      if (dataWorkload.success && Array.isArray(dataWorkload.advisors)) {
        setAdvisors(dataWorkload.advisors);
        // By default, participate all active advisors
        const activeNames = dataWorkload.advisors
          .filter((a: AdvisorWorkload) => a.status === 'Activo' && (a.role === 'Asesor' || a.role === 'Supervisor'))
          .map((a: AdvisorWorkload) => a.name);
        setParticipatingAdvisorNames(activeNames);

        if (activeNames.length > 0 && !manualAdvisor) {
          setManualAdvisor(activeNames[0]);
        }
      }

      if (Array.isArray(dataAgencias)) {
        setAgencias(dataAgencias);
      }
    } catch (err) {
      console.error('Error fetching workload data:', err);
    } finally {
      setLoadingAdvisors(false);
    }
  };

  useEffect(() => {
    fetchWorkloadData();

    const unsubscribe = subscribeToDbSync(['leads', 'usuarios', 'agencias', 'all'], () => {
      fetchWorkloadData();
      onRefreshLeads();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filtered advisors based on selected agency
  const availableAdvisors = useMemo(() => {
    return advisors.filter(adv => {
      if (adv.status !== 'Activo') return false;
      if (selectedAgency !== 'Todas' && adv.agency !== selectedAgency) return false;
      return true;
    });
  }, [advisors, selectedAgency]);

  // Leads filtering
  const filteredLeads = useMemo(() => {
    return leads.filter(ld => {
      const isUnassigned = isLeadUnassigned(ld);
      
      if (leadFilterTab === 'unassigned' && !isUnassigned) return false;
      if (leadFilterTab === 'assigned') {
        if (isUnassigned) return false;
        if (filterAdvisorName !== 'all' && ld.advisor !== filterAdvisorName) return false;
      }

      if (selectedAgency !== 'Todas' && ld.agency && ld.agency !== selectedAgency) {
        // If lead already has a different agency, filter it out (unless it's unassigned)
        if (ld.agency !== selectedAgency && !isUnassigned) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = (ld.name || '').toLowerCase().includes(q);
        const phoneMatch = (ld.phone || '').includes(q);
        const projectMatch = (ld.project || '').toLowerCase().includes(q);
        const sourceMatch = (ld.source || '').toLowerCase().includes(q);
        const advisorMatch = (ld.advisor || '').toLowerCase().includes(q);
        return nameMatch || phoneMatch || projectMatch || sourceMatch || advisorMatch;
      }

      return true;
    });
  }, [leads, leadFilterTab, selectedAgency, searchQuery, filterAdvisorName]);

  // Unassigned count
  const unassignedCount = useMemo(() => {
    return leads.filter(isLeadUnassigned).length;
  }, [leads]);

  // Assigned count
  const assignedCount = useMemo(() => {
    return leads.filter(l => !isLeadUnassigned(l)).length;
  }, [leads]);

  // Summary of assigned leads per advisor
  const assignedAdvisorsSummary = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach(ld => {
      if (!isLeadUnassigned(ld)) {
        map.set(ld.advisor, (map.get(ld.advisor) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [leads]);

  // Selected participating advisors objects
  const activeSelectedAdvisors = useMemo(() => {
    return availableAdvisors.filter(adv => participatingAdvisorNames.includes(adv.name));
  }, [availableAdvisors, participatingAdvisorNames]);

  // Calculate live equitable distribution simulation
  const distributionSimulation = useMemo(() => {
    if (selectedLeadIds.length === 0 || activeSelectedAdvisors.length === 0) {
      return { advisorAllocations: new Map<string, number>(), leadAllocations: new Map<number, string>() };
    }

    const advisorAllocations = new Map<string, number>();
    const leadAllocations = new Map<number, string>();
    activeSelectedAdvisors.forEach(a => advisorAllocations.set(a.name, 0));

    if (equitableStrategy === 'round_robin') {
      // Pure round-robin
      selectedLeadIds.forEach((leadId, index) => {
        const targetAdv = activeSelectedAdvisors[index % activeSelectedAdvisors.length];
        leadAllocations.set(leadId, targetAdv.name);
        advisorAllocations.set(targetAdv.name, (advisorAllocations.get(targetAdv.name) || 0) + 1);
      });
    } else {
      // Equitable by load balance (least loaded first)
      const pool = activeSelectedAdvisors.map(a => ({
        name: a.name,
        count: a.activeLeads || 0,
        allocated: 0
      }));

      selectedLeadIds.forEach(leadId => {
        pool.sort((a, b) => {
          const totalA = a.count + a.allocated;
          const totalB = b.count + b.allocated;
          if (totalA !== totalB) return totalA - totalB;
          return a.name.localeCompare(b.name);
        });

        const chosen = pool[0];
        chosen.allocated += 1;
        leadAllocations.set(leadId, chosen.name);
        advisorAllocations.set(chosen.name, chosen.allocated);
      });
    }

    return { advisorAllocations, leadAllocations };
  }, [selectedLeadIds, activeSelectedAdvisors, equitableStrategy]);

  // Multi-selection handlers
  const handleToggleLead = (id: number) => {
    setSelectedLeadIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredLeads.map(l => l.id);
    setSelectedLeadIds(ids);
  };

  const handleClearSelection = () => {
    setSelectedLeadIds([]);
  };

  const handleToggleAdvisorParticipation = (name: string) => {
    setParticipatingAdvisorNames(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  // Perform assignment execution
  const handleExecuteAssignment = async () => {
    if (selectedLeadIds.length === 0) {
      alert('Por favor selecciona al menos un prospecto para asignar.');
      return;
    }

    if (assignmentMode === 'manual' && !manualAdvisor) {
      alert('Por favor selecciona el asesor comercial de destino.');
      return;
    }

    if (assignmentMode === 'equitable' && activeSelectedAdvisors.length === 0) {
      alert('Debes tener al menos un asesor comercial activo habilitado en el reparto equitativo.');
      return;
    }

    setIsSubmitting(true);
    setLastActionResult(null);

    try {
      const modeParam = assignmentMode === 'manual' 
        ? 'manual' 
        : equitableStrategy === 'load_balance' ? 'equitable_load_balance' : 'equitable_round_robin';

      const payload = {
        leadIds: selectedLeadIds,
        mode: modeParam,
        advisor: manualAdvisor,
        agency: selectedAgency !== 'Todas' ? selectedAgency : undefined,
        targetAdvisors: activeSelectedAdvisors.map(a => ({
          name: a.name,
          agency: a.agency,
          activeLeads: a.activeLeads
        })),
        adminUser: currentUserName
      };

      const res = await fetch('/api/leads/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        const successMsg = assignmentMode === 'manual'
          ? `🎯 Asignación completada: Se asignaron ${data.count} prospecto(s) al asesor "${manualAdvisor}". Notificación enviada al asesor.`
          : `🎯 Asignación equitativa completada: Se distribuyeron ${data.count} prospectos entre los asesores. Notificaciones enviadas.`;

        setLastActionResult({
          success: true,
          message: successMsg,
          details: data.assignments
        });
        setSelectedLeadIds([]);
        onRefreshLeads();
        fetchWorkloadData();

        if (onGoLeads) {
          onGoLeads(successMsg);
        }
      } else {
        setLastActionResult({
          success: false,
          message: data.message || 'Ocurrió un error al procesar la asignación.'
        });
      }
    } catch (err: any) {
      console.error('Error assigning leads:', err);
      setLastActionResult({
        success: false,
        message: 'Error de conexión con el servidor.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick inline manual assignment for a single lead
  const handleQuickAssignSingle = async (leadId: number, targetAdvisorName: string) => {
    const advObj = advisors.find(a => a.name === targetAdvisorName);
    const targetAgency = advObj ? advObj.agency : undefined;

    try {
      const res = await fetch('/api/leads/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadIds: [leadId],
          mode: 'manual',
          advisor: targetAdvisorName,
          agency: targetAgency,
          adminUser: currentUserName
        })
      });
      const data = await res.json();
      if (data.success) {
        onRefreshLeads();
        fetchWorkloadData();

        if (onGoLeads) {
          const leadObj = leads.find(l => l.id === leadId);
          const leadName = leadObj ? leadObj.name : 'Prospecto';
          onGoLeads(`🎯 Prospecto "${leadName}" asignado con éxito al asesor inmobiliario "${targetAdvisorName}". Notificación enviada.`);
        }
      }
    } catch (err) {
      console.error('Error in quick assign:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner with Administrative Status */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-600/20 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <Shield size={12} />
                Cuenta Administrativa / Gerencia
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-200">
                <Building2 size={11} />
                Corporación Zavala
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display">
              Módulo de Asignación y Distribución de Leads
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Distribuye los prospectos entrantes de manera <strong>manual</strong> o <strong>aleatoria equitativa</strong> entre los asesores comerciales de la agencia, garantizando un reparto equilibrado y justo de la carga de trabajo.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchWorkloadData(); onRefreshLeads(); }}
              disabled={loadingAdvisors}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border border-white/15"
              title="Recargar datos"
            >
              <RefreshCw size={14} className={loadingAdvisors ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar Datos</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10 text-left">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 font-semibold">Sin Asignar</span>
              <AlertTriangle size={15} className={unassignedCount > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'} />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {unassignedCount}
            </div>
            <span className="text-[10px] text-amber-300 font-medium">Requieren asesor asignado</span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 font-semibold">Asesores Activos</span>
              <Users size={15} className="text-rose-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {availableAdvisors.length}
            </div>
            <span className="text-[10px] text-slate-300 font-medium">{participatingAdvisorNames.length} en reparto</span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 font-semibold">Seleccionados</span>
              <CheckCircle2 size={15} className="text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {selectedLeadIds.length}
            </div>
            <span className="text-[10px] text-emerald-300 font-medium">Listos para distribuir</span>
          </div>

          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 font-semibold">Equidad Garantizada</span>
              <Scale size={15} className="text-sky-400" />
            </div>
            <div className="text-sm font-bold text-white mt-2 truncate">
              {equitableStrategy === 'load_balance' ? 'Balance de Carga' : 'Round-Robin'}
            </div>
            <span className="text-[10px] text-sky-300 font-medium">Algoritmo de paridad</span>
          </div>
        </div>
      </div>

      {/* 2. Action Result Alert (if any) */}
      {lastActionResult && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-xs animate-in fade-in duration-200 ${
          lastActionResult.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          {lastActionResult.success ? (
            <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-sm leading-tight">
              {lastActionResult.success ? 'Distribución Ejecutada' : 'Error en la Asignación'}
            </h4>
            <p className="mt-1 font-medium leading-relaxed">{lastActionResult.message}</p>
            {lastActionResult.details && lastActionResult.details.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex flex-wrap gap-2">
                {lastActionResult.details.slice(0, 8).map((d, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-[10px] font-semibold text-emerald-800">
                    <span className="font-bold">{d.leadName}:</span> → {d.advisor} ({d.agency})
                  </span>
                ))}
                {lastActionResult.details.length > 8 && (
                  <span className="text-[10px] text-emerald-700 font-bold self-center">
                    +{lastActionResult.details.length - 8} más...
                  </span>
                )}
              </div>
            )}
          </div>
          <button 
            onClick={() => setLastActionResult(null)}
            className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* 3. Agency Selector & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Agency Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 size={14} className="text-[#E11D48]" />
            Agencia:
          </span>
          <select
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-[#E11D48]"
          >
            <option value="Todas">Todas las Agencias (Corporativo)</option>
            {agencias.map(ag => (
              <option key={ag.id} value={ag.name}>{ag.name} ({ag.city})</option>
            ))}
          </select>

          {/* Lead Filter Tabs */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              onClick={() => { setLeadFilterTab('unassigned'); setFilterAdvisorName('all'); }}
              className={`px-3 py-1 rounded-md transition ${
                leadFilterTab === 'unassigned' 
                  ? 'bg-white text-slate-900 shadow-xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sin Asignar ({unassignedCount})
            </button>
            <button
              onClick={() => { setLeadFilterTab('all'); setFilterAdvisorName('all'); }}
              className={`px-3 py-1 rounded-md transition ${
                leadFilterTab === 'all' 
                  ? 'bg-white text-slate-900 shadow-xs font-bold' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos los Leads ({leads.length})
            </button>
            <button
              onClick={() => setLeadFilterTab('assigned')}
              className={`px-3 py-1 rounded-md transition flex items-center gap-1.5 ${
                leadFilterTab === 'assigned' 
                  ? 'bg-white text-emerald-800 shadow-xs font-black' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck size={13} className={leadFilterTab === 'assigned' ? 'text-emerald-600' : 'text-slate-400'} />
              <span>Ya Asignados ({assignedCount})</span>
            </button>
          </div>
        </div>

        {/* Right: Search box */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 w-full md:w-64">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Buscar prospecto, teléfono, asesor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs w-full text-slate-700 placeholder-slate-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[10px] text-slate-400 hover:text-slate-600">✕</button>
            )}
          </div>
        </div>

        {/* Sub-toolbar when 'Ya Asignados' tab is active: Quick filter by assigned advisor */}
        {leadFilterTab === 'assigned' && (
          <div className="w-full pt-3 mt-1 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck size={14} className="text-emerald-600" />
                Filtrar por Asesor Asignado:
              </span>
              <button
                type="button"
                onClick={() => setFilterAdvisorName('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterAdvisorName === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({assignedCount})
              </button>
              {assignedAdvisorsSummary.map(adv => (
                <button
                  key={adv.name}
                  type="button"
                  onClick={() => setFilterAdvisorName(adv.name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    filterAdvisorName === adv.name
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  <span>{adv.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    filterAdvisorName === adv.name ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {adv.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 font-semibold shrink-0">
              {filterAdvisorName === 'all' 
                ? `Mostrando los ${assignedCount} prospectos ya asignados` 
                : `Mostrando prospectos asignados a ${filterAdvisorName}`}
            </div>
          </div>
        )}
      </div>

      {/* 4. Two-Column Workspace: Left (Leads) & Right (Allocation Engine) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Leads Selection List (7 Cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
            {/* Header with Selection Summary */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="selectAllCheckbox"
                  checked={filteredLeads.length > 0 && selectedLeadIds.length === filteredLeads.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      handleSelectAllFiltered();
                    } else {
                      handleClearSelection();
                    }
                  }}
                  className="rounded text-[#E11D48] focus:ring-[#E11D48] cursor-pointer w-4 h-4"
                />
                <label htmlFor="selectAllCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                  {selectedLeadIds.length > 0 ? `${selectedLeadIds.length} seleccionados de ${filteredLeads.length}` : `Seleccionar todos (${filteredLeads.length})`}
                </label>
              </div>

              <div className="flex items-center gap-2">
                {selectedLeadIds.length > 0 && (
                  <button
                    onClick={handleClearSelection}
                    className="text-[11px] font-bold text-slate-500 hover:text-rose-600 transition"
                  >
                    Deseleccionar
                  </button>
                )}
                {leadFilterTab === 'unassigned' && unassignedCount > 0 && (
                  <button
                    onClick={handleSelectAllFiltered}
                    className="text-[11px] font-bold text-[#E11D48] hover:underline transition"
                  >
                    Elegir todos los sin asignar
                  </button>
                )}
              </div>
            </div>

            {/* Leads List */}
            {filteredLeads.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Users size={32} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-700">No hay prospectos con los filtros actuales</p>
                <p className="text-[11px] text-slate-400">Prueba cambiando la agencia o el filtro de búsqueda.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {filteredLeads.map(lead => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  const simulatedAdvisor = distributionSimulation.leadAllocations.get(lead.id);
                  const isUnassigned = isLeadUnassigned(lead);

                  return (
                    <div
                      key={lead.id}
                      onClick={() => handleToggleLead(lead.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected 
                          ? 'bg-rose-50/50 border-rose-300 shadow-xs' 
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleLead(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 rounded text-[#E11D48] focus:ring-[#E11D48] cursor-pointer w-4 h-4"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                              {lead.name}
                            </h4>
                            <TempBadge temp={lead.temp} />
                            {isUnassigned ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                ⚠️ Sin Asignar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-2xs">
                                <UserCheck size={13} className="text-emerald-600 shrink-0" />
                                <span>Asesor Asignado: <strong className="text-emerald-950 font-black underline decoration-emerald-400">{lead.advisor}</strong></span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-1.5 flex-wrap">
                            <span className="font-semibold text-slate-700">{lead.phone}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-600">{lead.project || 'Proyecto General'}</span>
                            <span>•</span>
                            <span className="text-slate-400 capitalize">{lead.source || 'WhatsApp'}</span>
                            {!isUnassigned && (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                                  <Building2 size={11} className="text-slate-400" />
                                  {lead.agency || 'Agencia Asignada'}
                                </span>
                              </>
                            )}
                          </div>

                          {/* Simulation preview badge if selected and equitable mode is active */}
                          {isSelected && assignmentMode === 'equitable' && simulatedAdvisor && (
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold animate-in fade-in">
                              <Sparkles size={11} className="text-emerald-600" />
                              <span>Se asignará equitativamente a: <strong>{simulatedAdvisor}</strong></span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Inline Quick Action Dropdown */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-end">
                          <label className="text-[9px] font-bold text-slate-400 uppercase">
                            {isUnassigned ? 'Asignar directo:' : 'Reasignar a:'}
                          </label>
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleQuickAssignSingle(lead.id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="bg-slate-50 border border-slate-200 hover:border-[#E11D48] text-slate-800 text-[11px] font-bold py-1 px-2 rounded-lg outline-none cursor-pointer"
                          >
                            <option value="" disabled>{isUnassigned ? 'Seleccionar asesor...' : 'Cambiar asesor...'}</option>
                            {availableAdvisors.map(adv => (
                              <option key={adv.id} value={adv.name}>
                                {adv.name} ({adv.activeLeads} activos)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Allocation Engine & Advisors Panel (5 Cols on desktop) */}
        <div className="lg:col-span-5 space-y-4 sticky top-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
            {/* Mode Header */}
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 font-display">
                  Configurar Regla de Asignación
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 text-[#E11D48] border border-rose-200">
                  {selectedLeadIds.length} leads listos
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Elige el método de asignación para los prospectos seleccionados.
              </p>
            </div>

            {/* Mode Switcher Tabs: Equitable vs Manual */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setAssignmentMode('equitable')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  assignmentMode === 'equitable'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scale size={14} className={assignmentMode === 'equitable' ? 'text-[#E11D48]' : 'text-slate-400'} />
                <span>Aleatoria y Equitativa</span>
              </button>

              <button
                type="button"
                onClick={() => setAssignmentMode('manual')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  assignmentMode === 'manual'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserCheck size={14} className={assignmentMode === 'manual' ? 'text-[#E11D48]' : 'text-slate-400'} />
                <span>Asignación Manual</span>
              </button>
            </div>

            {/* Mode 1: Equitable Distribution Options */}
            {assignmentMode === 'equitable' && (
              <div className="space-y-4 pt-1">
                {/* Equitable Algorithm Strategy */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Scale size={13} className="text-[#E11D48]" />
                    Criterio de Equidad:
                  </label>
                  
                  <div className="space-y-2">
                    {/* Strategy A: Load Balance (Recommended) */}
                    <div 
                      onClick={() => setEquitableStrategy('load_balance')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        equitableStrategy === 'load_balance'
                          ? 'bg-rose-50/60 border-[#E11D48] ring-1 ring-[#E11D48]'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <TrendingUp size={13} className="text-[#E11D48]" />
                          Balanceo de Carga Actual (Recomendado)
                        </span>
                        {equitableStrategy === 'load_balance' && (
                          <Check size={14} className="text-[#E11D48] font-bold" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Nivela la carga: da prioridad a los asesores que tienen <strong>menos prospectos activos</strong> para alcanzar un equilibrio 100% equitativo entre todos.
                      </p>
                    </div>

                    {/* Strategy B: Pure Round-Robin */}
                    <div 
                      onClick={() => setEquitableStrategy('round_robin')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition ${
                        equitableStrategy === 'round_robin'
                          ? 'bg-rose-50/60 border-[#E11D48] ring-1 ring-[#E11D48]'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                          <Shuffle size={13} className="text-[#E11D48]" />
                          Round-Robin Aleatorio (Partes Iguales)
                        </span>
                        {equitableStrategy === 'round_robin' && (
                          <Check size={14} className="text-[#E11D48] font-bold" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        Divide el lote de prospectos en partes exactamente iguales entre los asesores habilitados en secuencia aleatoria cíclica.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Participating Advisors List & Live Allocation Preview */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-700">
                      Asesores Participantes ({activeSelectedAdvisors.length}):
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Desmarca para excluir asesores ausentes
                    </span>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {availableAdvisors.map(adv => {
                      const isParticipating = participatingAdvisorNames.includes(adv.name);
                      const simulatedCount = distributionSimulation.advisorAllocations.get(adv.name) || 0;
                      const newTotal = (adv.activeLeads || 0) + simulatedCount;

                      return (
                        <div
                          key={adv.id}
                          onClick={() => handleToggleAdvisorParticipation(adv.name)}
                          className={`p-2.5 rounded-lg border flex items-center justify-between transition cursor-pointer text-xs ${
                            isParticipating 
                              ? 'bg-slate-50 border-slate-200 hover:border-slate-300' 
                              : 'bg-slate-100/60 border-slate-200 text-slate-400 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isParticipating}
                              onChange={() => handleToggleAdvisorParticipation(adv.name)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded text-[#E11D48] focus:ring-[#E11D48] w-3.5 h-3.5 cursor-pointer"
                            />
                            <div>
                              <h5 className="font-extrabold text-slate-900 leading-tight">{adv.name}</h5>
                              <p className="text-[10px] text-slate-500">{adv.agency}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                              <span className="text-[11px] font-semibold text-slate-600">
                                {adv.activeLeads} activos
                              </span>
                              {selectedLeadIds.length > 0 && isParticipating && simulatedCount > 0 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                                  +{simulatedCount} → ({newTotal})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Live Distribution Summary Card */}
                {selectedLeadIds.length > 0 && activeSelectedAdvisors.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <BarChart3 size={13} className="text-[#E11D48]" />
                        Simulación de Paridad:
                      </span>
                      <span className="text-[10px] font-extrabold bg-rose-100 text-[#E11D48] px-2 py-0.5 rounded-full">
                        {selectedLeadIds.length} leads entre {activeSelectedAdvisors.length} asesores
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[9px] font-bold uppercase">Promedio</span>
                        <span className="font-extrabold text-slate-800">
                          {(selectedLeadIds.length / activeSelectedAdvisors.length).toFixed(1)} leads / asesor
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-400 block text-[9px] font-bold uppercase">Garantía</span>
                        <span className="font-extrabold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          Reparto Equitativo
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode 2: Manual Assignment Options */}
            {assignmentMode === 'manual' && (
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700">
                    Seleccionar Asesor Comercial Destino:
                  </label>
                  <select
                    value={manualAdvisor}
                    onChange={(e) => setManualAdvisor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-1 focus:ring-[#E11D48]"
                  >
                    {availableAdvisors.map(adv => (
                      <option key={adv.id} value={adv.name}>
                        {adv.name} — {adv.agency} ({adv.activeLeads} leads activos)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Advisor Card Preview */}
                {manualAdvisor && (
                  <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-3.5 space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#E11D48] text-white flex items-center justify-center font-bold text-xs">
                        {manualAdvisor.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900">{manualAdvisor}</h4>
                        <p className="text-[10px] text-slate-500">
                          Recibirá {selectedLeadIds.length} nuevo(s) prospecto(s)
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Execute Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleExecuteAssignment}
                disabled={isSubmitting || selectedLeadIds.length === 0}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer ${
                  isSubmitting || selectedLeadIds.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-[#E11D48] hover:bg-rose-700 text-white shadow-rose-200'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Asignando prospectos...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>
                      {selectedLeadIds.length === 0
                        ? 'Selecciona prospectos a la izquierda'
                        : assignmentMode === 'equitable'
                          ? `Ejecutar Asignación Equitativa (${selectedLeadIds.length} Leads)`
                          : `Asignar ${selectedLeadIds.length} Lead(s) a ${manualAdvisor}`}
                    </span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-slate-400 mt-2">
                Toda asignación queda registrada en la bitácora de auditoría corporativa.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
