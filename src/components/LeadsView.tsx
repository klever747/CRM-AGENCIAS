import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, MessageSquare, Edit3, Trash2, 
  ChevronLeft, ChevronRight, UserPlus, Info, Scale, AlertTriangle,
  UserCheck, Filter, Users, X, Sparkles, User
} from 'lucide-react';
import { Lead, Usuario, formatDisplayPhone } from '../types';
import { StatusBadge, TempBadge } from './common/StatusBadge';
import { EmptyState } from './common/EmptyState';

interface LeadsViewProps {
  leads: Lead[];
  onOpenLead360: (id: number, activeTab?: string) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (id: number) => void;
  onAddLead: () => void;
  viewMode?: 'leads' | 'contactos';
  userRole?: string;
  currentUser?: Usuario | null;
  onGoAsignacion?: () => void;
  assignmentNotification?: string | null;
  onClearAssignmentNotification?: () => void;
}

// Helper to determine if a lead has not been assigned to any real estate agent
export const isLeadUnassigned = (ld: Lead): boolean => {
  if (!ld || !ld.advisor) return true;
  const adv = ld.advisor.trim().toLowerCase();
  return (
    adv === '' ||
    adv === 'sin asignar' ||
    adv === '—' ||
    adv === '-' ||
    adv === 'ninguno' ||
    adv === 'sin asesor' ||
    adv === 'null' ||
    adv === 'undefined'
  );
};

// Helper to determine if a lead has strictly status "Nuevo"
export const isLeadNew = (ld: Lead): boolean => {
  if (!ld || !ld.status) return false;
  const s = ld.status.trim().toLowerCase();
  return s === 'nuevo' || s === 'nueva' || s === 'new';
};

export default React.memo(function LeadsView({ 
  leads = [], 
  onOpenLead360, 
  onEditLead, 
  onDeleteLead, 
  onAddLead, 
  viewMode = 'leads',
  userRole = 'gerencial',
  currentUser,
  onGoAsignacion,
  assignmentNotification,
  onClearAssignmentNotification
}: LeadsViewProps) {
  const roleLower = (userRole || '').toLowerCase().trim();
  const isAdvisorUser = roleLower === 'asesor' || roleLower === 'asesor comercial' || roleLower.includes('asesor');
  const isAdmin = roleLower === 'admin' || roleLower.includes('administrador') || roleLower.includes('super admin');
  const isAdministrative = !isAdvisorUser && (isAdmin || userRole === 'gerencial' || userRole === 'agencia' || roleLower.includes('ceo') || roleLower.includes('director') || roleLower.includes('supervisor'));
  const [leadScope, setLeadScope] = useState<'mis_leads' | 'todos_leads'>(
    isAdvisorUser ? 'mis_leads' : (isAdministrative ? 'todos_leads' : 'mis_leads')
  );

  useEffect(() => {
    if (isAdvisorUser) {
      setLeadScope('mis_leads');
    }
  }, [isAdvisorUser]);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAdvisorFilter, setSelectedAdvisorFilter] = useState<string>('Todos');
  const itemsPerPage = 8;

  const safeLeads = Array.isArray(leads) ? leads : [];

  // Determine current agent name
  const currentAdvisorName = (
    currentUser?.name || 
    (isAdvisorUser ? 'Andrea Cedeño' : '')
  ).trim();

  // RULE 1: Unassigned leads do NOT belong in the Leads module (they belong in Asignación de Leads)
  const allAssignedLeads = useMemo(() => {
    return safeLeads.filter(l => !isLeadUnassigned(l));
  }, [safeLeads]);

  // Overall unassigned count across system for administrative alerts
  const unassignedCount = useMemo(() => {
    return safeLeads.filter(isLeadUnassigned).length;
  }, [safeLeads]);

  // Leads belonging specifically to the logged-in commercial advisor
  const myAssignedLeads = useMemo(() => {
    if (!currentAdvisorName) return [];
    return allAssignedLeads.filter(
      l => l.advisor && l.advisor.toLowerCase() === currentAdvisorName.toLowerCase()
    );
  }, [allAssignedLeads, currentAdvisorName]);

  // Counts for tabs
  const myNewCount = useMemo(() => myAssignedLeads.filter(isLeadNew).length, [myAssignedLeads]);
  const myContactsCount = useMemo(() => myAssignedLeads.filter(l => !isLeadNew(l)).length, [myAssignedLeads]);
  const allNewCount = useMemo(() => allAssignedLeads.filter(isLeadNew).length, [allAssignedLeads]);
  const allContactsCount = useMemo(() => allAssignedLeads.filter(l => !isLeadNew(l)).length, [allAssignedLeads]);

  // List of distinct assigned advisors for the manager filter
  const distinctAdvisors = useMemo(() => {
    const set = new Set<string>();
    allAssignedLeads.forEach(l => {
      if (l.advisor && !isLeadUnassigned(l)) {
        set.add(l.advisor.trim());
      }
    });
    return Array.from(set).sort();
  }, [allAssignedLeads]);

  // Filtered leads based on scope (Mis Leads vs Todos los Leads), viewMode, and search query
  const filteredLeads = useMemo(() => {
    return allAssignedLeads.filter(l => {
      // 1. Stage / viewMode filter: In "Nuevos Leads Recibidos", list strictly if status is "Nuevo"
      const isNew = isLeadNew(l);
      const matchesMode = viewMode === 'leads' ? isNew : !isNew;
      if (!matchesMode) return false;

      // 2. Scope filter (Mis Leads vs Todos los Leads)
      if (isAdvisorUser || leadScope === 'mis_leads') {
        if (currentAdvisorName) {
          if (!l.advisor || l.advisor.toLowerCase() !== currentAdvisorName.toLowerCase()) {
            return false;
          }
        }
      } else {
        // In "Todos los Leads", if administrative user picked a specific advisor
        if (isAdministrative && selectedAdvisorFilter !== 'Todos' && l.advisor !== selectedAdvisorFilter) {
          return false;
        }
      }

      // 3. Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (l.name || '').toLowerCase().includes(q) ||
        (l.phone || '').includes(q) ||
        (l.project || '').toLowerCase().includes(q) ||
        (l.advisor || '').toLowerCase().includes(q) ||
        (l.agency || '').toLowerCase().includes(q) ||
        (l.cedula && l.cedula.includes(q))
      );
    });
  }, [allAssignedLeads, viewMode, leadScope, currentAdvisorName, isAdministrative, selectedAdvisorFilter, searchQuery]);

  // Pagination calculations
  const totalItems = filteredLeads.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  const pageLeads = useMemo(() => {
    return filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  const handlePrevPage = useCallback(() => setCurrentPage(p => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setCurrentPage(p => Math.min(totalPages, p + 1)), [totalPages]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  }, []);

  const handleScopeChange = useCallback((scope: 'mis_leads' | 'todos_leads') => {
    setLeadScope(scope);
    setCurrentPage(1);
  }, []);

  return (
    <div className="space-y-6">
      {/* Administrative Notice: Unassigned Leads Pool Alert */}
      {isAdministrative && unassignedCount > 0 && onGoAsignacion && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 shrink-0 font-bold">
              <AlertTriangle size={18} className="animate-pulse" />
            </div>
            <div>
              <h4 className="font-extrabold text-amber-950 text-xs sm:text-sm">
                Tienes {unassignedCount} prospecto{unassignedCount > 1 ? 's' : ''} pendiente{unassignedCount > 1 ? 's' : ''} en cola de asignación
              </h4>
              <p className="text-[11px] text-amber-800 font-medium">
                Los prospectos sin asignar no se muestran en las carteras de los agentes hasta que sean distribuidos.
              </p>
            </div>
          </div>
          <button
            onClick={onGoAsignacion}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition shrink-0 cursor-pointer shadow-xs flex items-center justify-center gap-2"
          >
            <Scale size={14} />
            <span>Módulo de Asignación de Leads →</span>
          </button>
        </div>
      )}

      {/* Header Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 font-display">
              {viewMode === 'leads' ? 'Nuevos Leads Recibidos' : 'Contactos Atendidos'}
            </h2>
            {isAdvisorUser || leadScope === 'mis_leads' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
                <UserCheck size={12} className="text-[#E11D48]" />
                <span>Mis Leads ({currentAdvisorName || 'Mi Cartera'})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                <Users size={12} className="text-slate-600" />
                <span>Todos los Leads del Sistema</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {isAdvisorUser || leadScope === 'mis_leads'
              ? `Listando prospectos con etiqueta "Nuevo" asignados a ${currentAdvisorName || 'tu cartera comercial'}.`
              : 'Listando todos los prospectos de la empresa con etiqueta "Nuevo" distribuidos entre asesores comerciales.'}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={onAddLead}
            className="bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs transition-colors duration-200 cursor-pointer"
          >
            <UserPlus size={15} />
            <span>Registrar Lead</span>
          </button>
        </div>
      </div>

      {/* Dynamic Lead Assignment Notification Alert */}
      {assignmentNotification && (
        <div className="bg-emerald-50 border-2 border-emerald-500/80 rounded-xl p-4 text-emerald-950 shadow-md flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-md">
                  Notificación al Asesor Inmobiliario
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <p className="text-sm font-bold text-emerald-900 mt-1">
                {assignmentNotification}
              </p>
              <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                El asesor inmobiliario ha recibido la notificación en su bandeja y el prospecto está listo en la lista de gestión comercial.
              </p>
            </div>
          </div>
          {onClearAssignmentNotification && (
            <button 
              onClick={onClearAssignmentNotification}
              className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-200/50 transition cursor-pointer shrink-0"
              title="Cerrar notificación"
            >
              <X size={18} />
            </button>
          )}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        {/* Scope Selector Tabs (Mis Leads / Todos los Leads) + Controls Row */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 border-b border-slate-100 pb-4">
          {/* Scope Segmented Control */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 w-fit">
            <button
              type="button"
              onClick={() => handleScopeChange('mis_leads')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                isAdvisorUser || leadScope === 'mis_leads'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <UserCheck size={14} className={isAdvisorUser || leadScope === 'mis_leads' ? 'text-[#E11D48]' : 'text-slate-500'} />
              <span>Mis Leads</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                isAdvisorUser || leadScope === 'mis_leads' ? 'bg-rose-100 text-[#E11D48]' : 'bg-slate-200 text-slate-700'
              }`}>
                {viewMode === 'leads' ? myNewCount : myContactsCount}
              </span>
            </button>

            {!isAdvisorUser && (
              <button
                type="button"
                onClick={() => handleScopeChange('todos_leads')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  leadScope === 'todos_leads'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Users size={14} className={leadScope === 'todos_leads' ? 'text-[#E11D48]' : 'text-slate-500'} />
                <span>Todos los Leads</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  leadScope === 'todos_leads' ? 'bg-rose-100 text-[#E11D48]' : 'bg-slate-200 text-slate-700'
                }`}>
                  {viewMode === 'leads' ? allNewCount : allContactsCount}
                </span>
              </button>
            )}
          </div>

          {/* Right side controls: Manager advisor filter + search input */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Manager: Filter by Real Estate Agent (when in Todos los Leads) */}
            {isAdministrative && leadScope === 'todos_leads' && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                <Filter size={13} className="text-slate-400 shrink-0" />
                <label className="text-[11px] font-bold text-slate-500 shrink-0">Agente:</label>
                <select
                  value={selectedAdvisorFilter}
                  onChange={(e) => {
                    setSelectedAdvisorFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-transparent border-none outline-none text-xs font-bold text-slate-800 cursor-pointer pr-2"
                >
                  <option value="Todos">Todos los Asesores ({allAssignedLeads.length})</option>
                  {distinctAdvisors.map(adv => {
                    const cnt = allAssignedLeads.filter(l => l.advisor === adv).length;
                    return (
                      <option key={adv} value={adv}>
                        {adv} ({cnt})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Search bar */}
            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-1.5 w-full sm:w-64">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar cliente, teléfono, proyecto..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="bg-transparent border-none outline-none text-xs w-full text-slate-700 placeholder-slate-400"
              />
            </div>
          </div>
        </div>

        {/* Dynamic List Rendering */}
        {totalItems === 0 ? (
          <EmptyState
            title={
              isAdvisorUser || leadScope === 'mis_leads' 
                ? `Sin leads asignados para ${currentAdvisorName || 'tu usuario'}` 
                : 'No se encontraron prospectos'
            }
            description={
              isAdvisorUser || leadScope === 'mis_leads'
                ? (isAdvisorUser
                    ? 'Actualmente no tienes prospectos asignados en tu cartera con este estado. Espera nuevas asignaciones de la jefatura comercial.'
                    : 'Actualmente no tienes prospectos asignados en tu cartera con este estado. Puedes revisar la pestaña "Todos los Leads" para ver los prospectos del equipo o esperar nuevas asignaciones.')
                : (unassignedCount > 0 
                    ? `Hay ${unassignedCount} prospectos sin asignar pendientes de distribución en el Módulo de Asignación de Leads.` 
                    : 'No hay leads que coincidan con los filtros seleccionados.')
            }
            icon={Info}
          />
        ) : viewMode === 'leads' ? (
          /* Bento Grid Layout for New (Nuevos) leads */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-1">
            {pageLeads.map((ld) => {
              const isAssignedToMe = currentAdvisorName && ld.advisor && ld.advisor.toLowerCase() === currentAdvisorName.toLowerCase();
              return (
                <div 
                  key={ld.id} 
                  onClick={() => onOpenLead360(ld.id, 'datos')}
                  className={`bg-white border rounded-xl p-4 flex flex-col justify-between transition cursor-pointer space-y-4 hover:shadow-md ${
                    isAssignedToMe 
                      ? 'border-rose-200 hover:border-[#E11D48] ring-1 ring-rose-100' 
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div>
                    {/* Header with Name, Phone, and prominent NUEVO Tag + Temp Badge */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-800 tracking-tight leading-tight truncate">{ld.name}</h4>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{formatDisplayPhone(ld.phone)}</p>
                        {ld.cedula && <p className="text-[10px] text-slate-500 font-bold mt-0.5">CI: {ld.cedula}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                          <Sparkles size={11} className="text-emerald-600" />
                          Nuevo
                        </span>
                        <TempBadge temp={ld.temp} />
                      </div>
                    </div>

                    {/* Metadata fields */}
                    <div className="mt-3.5 space-y-1.5 text-slate-500 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-400 w-16 shrink-0">Proyecto:</span>
                        <span className="text-slate-700 font-semibold truncate">{ld.project || 'General'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-400 w-16 shrink-0">Agencia:</span>
                        <span className="text-slate-700 font-semibold truncate">{ld.agency || 'Principal'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-400 w-16 shrink-0">Asesor:</span>
                        {isAssignedToMe ? (
                          <span className="text-rose-900 font-bold truncate flex items-center gap-1 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[10px]">
                            <UserCheck size={11} className="text-[#E11D48] shrink-0" />
                            <span>{ld.advisor}</span>
                            <span className="text-[9px] font-black text-[#E11D48] ml-0.5 bg-white px-1 rounded shadow-2xs">TÚ</span>
                          </span>
                        ) : (
                          <span className="text-slate-800 font-bold truncate flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                            <UserCheck size={11} className="text-emerald-600 shrink-0" />
                            <span>{ld.advisor}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenLead360(ld.id, 'whatsapp'); }}
                      className="flex-1 bg-[#E11D48] hover:bg-rose-700 text-white font-semibold text-[10px] py-1.5 rounded-md flex items-center justify-center gap-1 shadow-xs transition cursor-pointer"
                    >
                      <MessageSquare size={12} />
                      <span>Responder</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onEditLead(ld); }}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-[10px] px-2.5 py-1.5 rounded-md transition cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteLead(ld.id); }}
                      className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-[10px] p-1.5 rounded-md transition cursor-pointer"
                      title="Eliminar lead"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table Layout for Atendidos/Respondidos leads */
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-500 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400 font-bold">
                  <th className="py-3 px-2">Cliente</th>
                  <th className="py-3 px-2">Celular</th>
                  <th className="py-3 px-2">Proyecto</th>
                  <th className="py-3 px-2">Agente Asignado</th>
                  <th className="py-3 px-2 text-center">Fase</th>
                  <th className="py-3 px-2 text-center">Interés</th>
                  <th className="py-3 px-2 text-center">Próx. Seguimiento</th>
                  <th className="py-3 px-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageLeads.map((ld) => (
                  <tr 
                    key={ld.id} 
                    onClick={() => onOpenLead360(ld.id, 'datos')}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 cursor-pointer"
                  >
                    <td className="py-4 px-2 font-bold text-slate-800">
                      <div>{ld.name}</div>
                      {ld.cedula && <div className="text-[10px] text-slate-400 font-bold mt-0.5">CI: {ld.cedula}</div>}
                    </td>
                    <td className="py-4 px-2 font-medium text-slate-600">{formatDisplayPhone(ld.phone)}</td>
                    <td className="py-4 px-2 text-slate-700 font-semibold">{ld.project || 'General'}</td>
                    <td className="py-4 px-2">
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <UserCheck size={12} className="text-emerald-600 shrink-0" />
                        <span>{ld.advisor}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">{ld.agency || 'Agencia'}</div>
                    </td>
                    <td className="py-4 px-2 text-center">
                      <StatusBadge status={ld.status} size="sm" />
                    </td>
                    <td className="py-4 px-2 text-center">
                      <TempBadge temp={ld.temp} />
                    </td>
                    <td className="py-4 px-2 text-center font-bold text-slate-500">
                      {ld.next_follow || '—'}
                    </td>
                    <td className="py-4 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenLead360(ld.id, 'whatsapp')}
                          className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition"
                          title="Conversación de WhatsApp"
                        >
                          <MessageSquare size={14} />
                        </button>
                        <button
                          onClick={() => onEditLead(ld)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteLead(ld.id)}
                          className="p-1.5 text-slate-400 hover:text-black hover:bg-slate-100 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Pagination Controls */}
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 flex-wrap gap-4 text-xs font-medium text-slate-500">
          <span>
            Mostrando <strong>{totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</strong>–
            <strong>{Math.min(currentPage * itemsPerPage, totalItems)}</strong> de <strong>{totalItems}</strong> prospectos asignados
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-slate-700">Página {currentPage} de {totalPages}</span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="p-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
