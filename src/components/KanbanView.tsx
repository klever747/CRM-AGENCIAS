import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  UserCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  Database, 
  Phone, 
  MapPin, 
  Calendar, 
  FileText, 
  CreditCard, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Building,
  DollarSign,
  Clock,
  User,
  ExternalLink,
  Flame,
  Zap,
  Snowflake,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { Lead, Usuario } from '../types';
import { TempBadge } from './common/StatusBadge';
import { formatCurrency } from '../lib/utils';
import { subscribeToDbSync, notifyDbChange } from '../lib/databaseSync';

interface KanbanViewProps {
  leads?: Lead[];
  onUpdateStage?: (id: number, stage: string, status?: string) => Promise<void>;
  onOpenLead360: (id: number, tab?: string) => void;
  onGoCotizador?: (name: string, phone: string, cedula?: string) => void;
  userRole?: string;
  currentUser?: Usuario | null;
}

// Map various stage / status string variants to standard Kanban column keys
export function normalizeStageKey(stage?: string, status?: string): string {
  const s = (stage || '').toLowerCase().trim();
  const st = (status || '').toLowerCase().trim();

  // Retry / Cold / Discarded
  if (s === 'retry' || s === 'frio' || s === 'reintentar' || s === 'descartado' || st === 'reintentar' || st === 'descartado') {
    return 'retry';
  }
  // Closed / Won / Sold
  if (s === 'close' || s === 'cerrado' || s === 'ganado' || s === 'vendido' || st === 'vendido' || st === 'cerrado ganado') {
    return 'close';
  }
  // Reservation
  if (s === 'reserve' || s === 'reserva' || s === 'reservado' || st === 'reservado' || st === 'reserva') {
    return 'reserve';
  }
  // Proforma
  if (s === 'proforma' || s === 'cotizacion' || s === 'cotizado' || st === 'proforma' || st === 'cotización enviada') {
    return 'proforma';
  }
  // Presentation / Appointment / Visit
  if (s === 'present' || s === 'cita' || s === 'cita agendada' || s === 'visita' || st === 'cita agendada' || st === 'visita realizada') {
    return 'present';
  }
  // Discovery / Contacted
  if (s === 'discover' || s === 'contact' || s === 'contactado' || s === 'descubrimiento' || st === 'contactado' || st === 'en seguimiento') {
    return 'discover';
  }
  // Initial Contact / New / Default
  return 'lead';
}

export default React.memo(function KanbanView({ 
  leads: propLeads = [], 
  onUpdateStage, 
  onOpenLead360, 
  onGoCotizador,
  userRole = 'gerencial',
  currentUser
}: KanbanViewProps) {
  // Direct BDD state
  const [dbLeads, setDbLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  
  // Drag and drop state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedAdvisor, setSelectedAdvisor] = useState('ALL');

  const roleLower = (userRole || '').toLowerCase().trim();
  const isAdmin = roleLower === 'admin' || roleLower.includes('administrador') || roleLower.includes('super admin');
  const isAgent = !isAdmin && (userRole === 'asesor' || userRole === 'Asesor Comercial' || roleLower.includes('asesor'));
  const currentAdvisorName = (currentUser?.name || (isAgent ? 'Andrea Cedeño' : '')).trim();

  // Function to load leads directly from database endpoint
  const loadLeadsFromDb = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/leads');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setDbLeads(data);
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.error('Error fetching leads for Kanban:', err);
      // Fallback to props if fetch fails
      if (propLeads && propLeads.length > 0) {
        setDbLeads(propLeads);
      }
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, [propLeads]);

  // Initial load and real-time subscription
  useEffect(() => {
    loadLeadsFromDb();

    // Subscribe to DB mutations
    const unsubscribe = subscribeToDbSync(['leads', 'all'], () => {
      loadLeadsFromDb();
    });

    return () => {
      unsubscribe();
    };
  }, [loadLeadsFromDb]);

  // If prop leads change and we have no dbLeads, use propLeads as initial
  useEffect(() => {
    if (propLeads && propLeads.length > 0 && dbLeads.length === 0) {
      setDbLeads(propLeads);
    }
  }, [propLeads, dbLeads.length]);

  // Distinct list of projects and advisors for filter dropdowns
  const availableProjects = useMemo(() => {
    const set = new Set<string>();
    dbLeads.forEach(l => {
      if (l.project && l.project.trim()) set.add(l.project.trim());
    });
    return Array.from(set).sort();
  }, [dbLeads]);

  const availableAdvisors = useMemo(() => {
    const set = new Set<string>();
    dbLeads.forEach(l => {
      if (l.advisor && l.advisor.trim()) set.add(l.advisor.trim());
    });
    return Array.from(set).sort();
  }, [dbLeads]);

  // Filter pipeline leads based on role, search term, project, and advisor
  const filteredLeads = useMemo(() => {
    return dbLeads.filter(l => {
      // Role enforcement
      if (isAgent && currentAdvisorName) {
        if (!l.advisor || l.advisor.toLowerCase() !== currentAdvisorName.toLowerCase()) {
          return false;
        }
      } else if (selectedAdvisor !== 'ALL') {
        if (l.advisor !== selectedAdvisor) return false;
      }

      // Project filter
      if (selectedProject !== 'ALL' && l.project !== selectedProject) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const name = (l.name || '').toLowerCase();
        const phone = (l.phone || '').toLowerCase();
        const cedula = (l.cedula || '').toLowerCase();
        const project = (l.project || '').toLowerCase();
        const advisor = (l.advisor || '').toLowerCase();
        return name.includes(query) || phone.includes(query) || cedula.includes(query) || project.includes(query) || advisor.includes(query);
      }

      return true;
    });
  }, [dbLeads, isAgent, currentAdvisorName, selectedAdvisor, selectedProject, searchTerm]);

  // Grand total sum across all filtered leads in pipeline
  const grandTotalValue = useMemo(() => {
    return filteredLeads.reduce((acc, l) => acc + (Number(l.deal_value) || 0), 0);
  }, [filteredLeads]);

  // Kanban Stage Columns Configuration
  const columns = [
    { 
      key: 'lead', 
      title: 'Contacto Inicial', 
      tagColor: 'bg-slate-100 text-slate-700 border-slate-300',
      headerAccent: 'border-t-rose-500', 
      defaultStatus: 'Nuevo',
      description: 'Prospectos recién ingresados'
    },
    { 
      key: 'discover', 
      title: 'Descubrimiento', 
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
      headerAccent: 'border-t-blue-500', 
      defaultStatus: 'Contactado',
      description: 'Calificación de necesidad y perfil'
    },
    { 
      key: 'present', 
      title: 'Cita / Visita', 
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      headerAccent: 'border-t-amber-500', 
      defaultStatus: 'Cita agendada',
      description: 'Cita agendada o visita a obra'
    },
    { 
      key: 'proforma', 
      title: 'Proformado', 
      tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
      headerAccent: 'border-t-purple-500', 
      defaultStatus: 'Proforma',
      description: 'Cotización formal entregada'
    },
    { 
      key: 'reserve', 
      title: 'Reservación', 
      tagColor: 'bg-teal-50 text-teal-700 border-teal-200',
      headerAccent: 'border-t-teal-500', 
      defaultStatus: 'Reservado',
      description: 'Depósito de reserva recibido'
    },
    { 
      key: 'close', 
      title: 'Cerrado Ganado', 
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      headerAccent: 'border-t-emerald-500', 
      defaultStatus: 'Vendido',
      description: 'Promesa firmada / Venta cerrada'
    },
    { 
      key: 'retry', 
      title: 'Reintentar / Frío', 
      tagColor: 'bg-slate-50 text-slate-500 border-slate-200',
      headerAccent: 'border-t-slate-400', 
      defaultStatus: 'Reintentar',
      description: 'En espera de reactivación'
    }
  ];

  // Drag & Drop Handlers
  const handleDragStart = (id: number) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, colKey: string) => {
    e.preventDefault();
    if (dragOverColumn !== colKey) {
      setDragOverColumn(colKey);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (stageKey: string, defaultStatus: string) => {
    setDragOverColumn(null);
    if (draggedId === null) return;
    
    const matchedLead = dbLeads.find(l => l.id === draggedId);
    if (!matchedLead) return;

    setDraggedId(null);

    // Optimistically update local state for smooth UX
    setDbLeads(prev => prev.map(l => l.id === matchedLead.id ? { ...l, stage: stageKey, status: defaultStatus } : l));

    try {
      // Execute database update
      if (onUpdateStage) {
        await onUpdateStage(matchedLead.id, stageKey, defaultStatus);
      } else {
        const res = await fetch(`/api/leads/${matchedLead.id}/stage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: stageKey, status: defaultStatus })
        });
        if (res.ok) {
          notifyDbChange('leads');
        }
      }

      // Special contextual actions
      if (stageKey === 'present') {
        onOpenLead360(matchedLead.id, 'citas');
      } else if (stageKey === 'proforma' && onGoCotizador) {
        onGoCotizador(matchedLead.name, matchedLead.phone, matchedLead.cedula || '');
      }
    } catch (error) {
      console.error('Error updating stage in BDD:', error);
      // Reload on error
      loadLeadsFromDb();
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* KANBAN CONTROL HEADER */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
                Embudo de Ventas Kanban
              </h2>
              
              {/* LIVE DATABASE BADGE */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Database size={12} className="text-emerald-600 animate-pulse" />
                <span>BDD Conectada ({filteredLeads.length} prospectos)</span>
              </span>

              {isAgent && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                  <UserCheck size={12} className="text-[#E11D48]" />
                  <span>Mis prospectos: {currentAdvisorName}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Visualización y gestión en tiempo real de prospectos sincronizados desde la base de datos central.
            </p>
          </div>

          {/* TOTAL IN PIPELINE & REFRESH BUTTON */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-2.5 text-right shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Valor Total en Embudo
              </span>
              <span className="text-base sm:text-lg font-extrabold text-[#E11D48] tracking-tight">
                {formatCurrency(grandTotalValue, true)}
              </span>
            </div>

            <button
              onClick={() => loadLeadsFromDb(true)}
              disabled={refreshing}
              title="Refrescar datos desde la Base de Datos"
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-3 rounded-xl transition shadow-xs cursor-pointer disabled:opacity-60 shrink-0"
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin text-rose-400' : ''} />
              <span className="hidden sm:inline">Refrescar BDD</span>
            </button>
          </div>
        </div>

        {/* SEARCH AND FILTERS BAR */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-100">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, celular, cédula, proyecto..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-rose-500 focus:bg-white transition"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Project Filter */}
          <div className="w-full sm:w-52">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-rose-500 font-medium"
            >
              <option value="ALL">🏡 Todos los Proyectos ({availableProjects.length})</option>
              {availableProjects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Advisor Filter (if not locked to single agent) */}
          {!isAgent && (
            <div className="w-full sm:w-52">
              <select
                value={selectedAdvisor}
                onChange={(e) => setSelectedAdvisor(e.target.value)}
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 outline-none focus:border-rose-500 font-medium"
              >
                <option value="ALL">👤 Todos los Asesores ({availableAdvisors.length})</option>
                {availableAdvisors.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* LOADING STATE */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
          <RefreshCw size={28} className="animate-spin text-[#E11D48]" />
          <p className="text-sm font-semibold text-slate-700">Cargando prospectos desde la Base de Datos...</p>
          <span className="text-xs text-slate-400">Sincronizando estado comercial y registros</span>
        </div>
      ) : (
        /* KANBAN BOARD COLUMNS */
        <div className="flex gap-4 overflow-x-auto pb-4 items-stretch min-h-[580px] h-[calc(100vh-270px)]">
          {columns.map((col) => {
            // Filter leads whose normalized stage key matches this column
            const colLeads = filteredLeads.filter(l => normalizeStageKey(l.stage, l.status) === col.key);
            const totalValue = colLeads.reduce((acc, l) => acc + (Number(l.deal_value) || 0), 0);
            const isTarget = dragOverColumn === col.key;

            return (
              <div 
                key={col.key}
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(col.key, col.defaultStatus)}
                className={`flex-1 min-w-[270px] max-w-[310px] rounded-2xl p-3 flex flex-col h-full transition-all duration-150 border ${
                  isTarget 
                    ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-200' 
                    : 'bg-slate-100/70 border-slate-200/90'
                }`}
              >
                {/* COLUMN HEADER */}
                <div className="bg-white border border-slate-200 rounded-xl p-3 mb-2 shadow-2xs">
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${col.headerAccent.replace('border-t-', 'bg-')}`} />
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {col.title}
                      </span>
                    </div>
                    <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Subtotal of Column */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                    <span className="text-slate-400 font-medium">Monto Etapa:</span>
                    <span className="font-extrabold text-slate-800 font-mono">
                      {formatCurrency(totalValue, true)}
                    </span>
                  </div>
                </div>

                {/* COLUMN BODY / CARDS CONTAINER */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                  {colLeads.map((ld) => (
                    <div
                      key={ld.id}
                      draggable
                      onDragStart={() => handleDragStart(ld.id)}
                      onClick={() => onOpenLead360(ld.id, 'datos')}
                      className="group bg-white border border-slate-200/90 hover:border-rose-400 rounded-xl p-3.5 shadow-2xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-t-3 border-t-[#E11D48] space-y-2.5 relative"
                    >
                      {/* Card Header: Name + Temperature */}
                      <div className="flex justify-between items-start gap-1.5">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 group-hover:text-[#E11D48] transition line-clamp-1">
                            {ld.name || `${ld.first || ''} ${ld.last || ''}`.trim() || 'Prospecto Sin Nombre'}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID #{ld.id}
                          </span>
                        </div>
                        <TempBadge temp={ld.temp} />
                      </div>

                      {/* Card Details */}
                      <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50/80 p-2 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building size={12} className="text-rose-600 shrink-0" />
                          <span className="text-slate-700 font-semibold truncate">{ld.project || 'Proyecto General'}</span>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone size={12} className="text-slate-400 shrink-0" />
                          <span className="font-mono text-[10.5px]">{ld.phone || 'Sin WhatsApp'}</span>
                        </div>

                        {ld.cedula && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                            <span className="font-bold text-slate-400">CI:</span>
                            <span className="font-mono">{ld.cedula}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                          <span className="truncate">Asesor: <strong>{ld.advisor || 'Sin asignar'}</strong></span>
                        </div>
                      </div>

                      {/* Card Value and Source Footer */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                        <span className="font-extrabold text-slate-900 font-mono text-xs">
                          {formatCurrency(Number(ld.deal_value) || 0, true)}
                        </span>
                        <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                          {ld.source || 'Directo'}
                        </span>
                      </div>

                      {/* Quick Hover Action Trigger */}
                      <div className="opacity-0 group-hover:opacity-100 transition flex items-center justify-end gap-1 pt-1 text-[10px] text-rose-600 font-bold">
                        <span>Ver Ficha 360</span>
                        <ChevronRight size={12} />
                      </div>
                    </div>
                  ))}

                  {/* Empty state for column */}
                  {colLeads.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center text-center p-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                      <span>Sin prospectos en esta etapa</span>
                      <span className="text-[10px] text-slate-400 mt-1">Arrastra aquí para mover</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
