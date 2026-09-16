import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Search, Filter, RotateCcw, ChevronLeft, ChevronRight, 
  Eye, X, Calendar, DollarSign, CheckCircle2, Clock, 
  Building2, User, Download, RefreshCw, ArrowUpDown, Tag,
  Layers, AlertCircle
} from 'lucide-react';
import { Proforma, Usuario } from '../types';
import { formatCurrency } from '../lib/utils';
import { ProformaModal } from './ProformaModal';
import { UserCheck } from 'lucide-react';

interface ProformasHistorialViewProps {
  proformas: Proforma[];
  onRefresh?: () => void | Promise<any>;
  userRole?: string;
  currentUser?: Usuario | null;
}

export default function ProformasHistorialView({ 
  proformas, 
  onRefresh,
  userRole = 'gerencial',
  currentUser
}: ProformasHistorialViewProps) {
  const isAdvisor = userRole === 'asesor';
  const currentAdvisorName = (currentUser?.name || (isAdvisor ? 'Andrea Cedeño' : '')).trim();

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedAdvisor, setSelectedAdvisor] = useState(isAdvisor && currentAdvisorName ? currentAdvisorName : 'Todos');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'val_desc' | 'val_asc' | 'client_asc'>('date_desc');

  // Sync advisor filter when role or user changes
  useEffect(() => {
    if (isAdvisor && currentAdvisorName) {
      setSelectedAdvisor(currentAdvisorName);
    }
  }, [isAdvisor, currentAdvisorName]);

  // Pagination state: default 15 records per page as requested
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal & details state
  const [selectedProforma, setSelectedProforma] = useState<Proforma | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Refresh spinner
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Extract unique filter dropdown values
  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    proformas.forEach(p => {
      if (p.project && p.project.trim()) set.add(p.project.trim());
    });
    return Array.from(set).sort();
  }, [proformas]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set<string>();
    proformas.forEach(p => {
      if (p.status && p.status.trim()) set.add(p.status.trim());
    });
    return Array.from(set).sort();
  }, [proformas]);

  const uniqueAdvisors = useMemo(() => {
    const set = new Set<string>();
    proformas.forEach(p => {
      if (p.advisor && p.advisor.trim()) set.add(p.advisor.trim());
    });
    return Array.from(set).sort();
  }, [proformas]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    proformas.forEach(p => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    return Array.from(set).sort();
  }, [proformas]);

  // Overall metrics / counters
  const totalCount = proformas.length;
  const totalValue = useMemo(() => {
    return proformas.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }, [proformas]);

  const acceptedCount = useMemo(() => {
    return proformas.filter(p => (p.status || '').toLowerCase().includes('aceptad')).length;
  }, [proformas]);

  const pendingCount = useMemo(() => {
    return proformas.filter(p => {
      const st = (p.status || '').toLowerCase();
      return st.includes('enviad') || st.includes('negoci');
    }).length;
  }, [proformas]);

  // Filtering logic
  const filteredProformas = useMemo(() => {
    return proformas.filter(pf => {
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const numberMatch = (pf.number || '').toLowerCase().includes(q);
        const clientMatch = (pf.client_name || '').toLowerCase().includes(q);
        const projectMatch = (pf.project || '').toLowerCase().includes(q);
        const advisorMatch = (pf.advisor || '').toLowerCase().includes(q);
        const categoryMatch = (pf.category || '').toLowerCase().includes(q);
        const statusMatch = (pf.status || '').toLowerCase().includes(q);
        const phoneMatch = pf.details?.celular ? pf.details.celular.toLowerCase().includes(q) : false;
        const cedulaMatch = pf.details?.cedula ? pf.details.cedula.toLowerCase().includes(q) : false;

        if (!numberMatch && !clientMatch && !projectMatch && !advisorMatch && !categoryMatch && !statusMatch && !phoneMatch && !cedulaMatch) {
          return false;
        }
      }

      // Project filter
      if (selectedProject !== 'Todos' && pf.project !== selectedProject) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'Todos' && pf.status !== selectedStatus) {
        return false;
      }

      // Advisor filter
      if (selectedAdvisor !== 'Todos' && pf.advisor !== selectedAdvisor) {
        return false;
      }

      // Category filter
      if (selectedCategory !== 'Todas' && pf.category !== selectedCategory) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'val_desc') return (Number(b.value) || 0) - (Number(a.value) || 0);
      if (sortBy === 'val_asc') return (Number(a.value) || 0) - (Number(b.value) || 0);
      if (sortBy === 'client_asc') return (a.client_name || '').localeCompare(b.client_name || '');
      if (sortBy === 'date_asc') return (a.id || 0) - (b.id || 0);
      // default: date_desc (newest first by id)
      return (b.id || 0) - (a.id || 0);
    });
  }, [proformas, searchTerm, selectedProject, selectedStatus, selectedAdvisor, selectedCategory, sortBy]);

  // Reset page to 1 when filters change
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedProject('Todos');
    setSelectedStatus('Todos');
    setSelectedAdvisor('Todos');
    setSelectedCategory('Todas');
    setSortBy('date_desc');
    setCurrentPage(1);
  };

  const isFilteringActive = searchTerm.trim() !== '' || selectedProject !== 'Todos' || selectedStatus !== 'Todos' || selectedAdvisor !== 'Todos' || selectedCategory !== 'Todas';

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredProformas.length / pageSize));
  const currentPageClamped = Math.min(currentPage, totalPages);
  const startIndex = (currentPageClamped - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredProformas.length);
  const paginatedProformas = filteredProformas.slice(startIndex, endIndex);

  // Status badge styling
  const getStatusBadge = (status: string) => {
    const st = (status || '').toLowerCase();
    if (st.includes('aceptad')) {
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          {status}
        </span>
      );
    }
    if (st.includes('vencid') || st.includes('cancel')) {
      return (
        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          {status}
        </span>
      );
    }
    if (st.includes('negoci')) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
        {status || 'Enviada'}
      </span>
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredProformas.length === 0) return;
    const headers = ['Nro Proforma', 'Cliente', 'Proyecto', 'Categoria', 'Valor USD', 'Asesor', 'Fecha', 'Estado'];
    const rows = filteredProformas.map(p => [
      `"${p.number || ''}"`,
      `"${p.client_name || ''}"`,
      `"${p.project || ''}"`,
      `"${p.category || ''}"`,
      p.value || 0,
      `"${p.advisor || ''}"`,
      `"${p.date || ''}"`,
      `"${p.status || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historial_proformas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-[#E11D48]">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-800 font-display">Historial General de Proformas</h2>
                {isAdvisor && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                    <UserCheck size={12} className="text-[#E11D48]" />
                    <span>Mis Proformas: {currentAdvisorName}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {isAdvisor 
                  ? 'Cotizaciones y propuestas comerciales generadas para tus clientes' 
                  : 'Cotizaciones, planes de financiamiento y propuestas comerciales emitidas'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-60"
              title="Actualizar datos"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-rose-600' : 'text-slate-400'} />
              <span>Actualizar</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={filteredProformas.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Descargar lista filtrada en CSV"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Counters (Contadores de resumen) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Proformas</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <FileText size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-display">{totalCount}</span>
            <span className="text-[11px] text-slate-400 font-medium">emitidas</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Monto Cotizado</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 font-display">{formatCurrency(totalValue, true)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Aceptadas</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700 font-display">{acceptedCount}</span>
            <span className="text-[11px] text-emerald-600 font-medium">cerradas</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">En Seguimiento</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock size={15} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-700 font-display">{pendingCount}</span>
            <span className="text-[11px] text-blue-600 font-medium">vigentes</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por N° proforma, cliente, proyecto, asesor, teléfono, cédula..."
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-[#E11D48] transition"
            />
            {searchTerm && (
              <button
                onClick={() => handleFilterChange(setSearchTerm, '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Clear Button */}
          {isFilteringActive && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition cursor-pointer shrink-0"
              title="Restablecer todos los filtros"
            >
              <RotateCcw size={13} />
              <span>Limpiar filtros</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-1">
          {/* Proyecto */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Building2 size={11} className="text-slate-400" />
              <span>Proyecto</span>
            </label>
            <select
              value={selectedProject}
              onChange={(e) => handleFilterChange(setSelectedProject, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:bg-white focus:border-[#E11D48] cursor-pointer"
            >
              <option value="Todos">Todos los proyectos</option>
              {uniqueProjects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={11} className="text-slate-400" />
              <span>Estado</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => handleFilterChange(setSelectedStatus, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:bg-white focus:border-[#E11D48] cursor-pointer"
            >
              <option value="Todos">Todos los estados</option>
              {uniqueStatuses.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Asesor */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <User size={11} className="text-slate-400" />
              <span>Asesor</span>
            </label>
            <select
              value={selectedAdvisor}
              onChange={(e) => handleFilterChange(setSelectedAdvisor, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:bg-white focus:border-[#E11D48] cursor-pointer"
            >
              <option value="Todos">Todos los asesores</option>
              {uniqueAdvisors.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Categoría */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Tag size={11} className="text-slate-400" />
              <span>Categoría</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => handleFilterChange(setSelectedCategory, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:bg-white focus:border-[#E11D48] cursor-pointer"
            >
              <option value="Todas">Todas las categorías</option>
              {uniqueCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Ordenar */}
          <div className="space-y-1 col-span-2 sm:col-span-2 lg:col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown size={11} className="text-slate-400" />
              <span>Ordenar por</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => handleFilterChange(setSortBy, e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:bg-white focus:border-[#E11D48] cursor-pointer"
            >
              <option value="date_desc">Más recientes primero</option>
              <option value="date_asc">Más antiguas primero</option>
              <option value="val_desc">Mayor valor USD</option>
              <option value="val_asc">Menor valor USD</option>
              <option value="client_asc">Cliente (A - Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Subheader: Results Counter and Page Size */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-800">
            Contador de registros:
          </span>
          <span className="bg-rose-50 text-rose-700 font-bold px-2.5 py-0.5 rounded-full border border-rose-200 text-[11px]">
            {filteredProformas.length} {filteredProformas.length === 1 ? 'proforma encontrada' : 'proformas encontradas'}
          </span>
          {isFilteringActive && (
            <span className="text-slate-400 text-[11px]">
              (filtrado de {totalCount} en total)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-slate-500 text-[11px]">Ver por página:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-200 text-slate-700 rounded-lg px-2 py-1 text-xs font-semibold outline-none focus:border-[#E11D48] cursor-pointer shadow-2xs"
          >
            <option value={15}>15 registros</option>
            <option value={30}>30 registros</option>
            <option value={50}>50 registros</option>
          </select>
        </div>
      </div>

      {/* Main Proformas Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">N° Proforma</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Proyecto</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Valor Total USD</th>
                <th className="py-3 px-4">Entrada / Plazo</th>
                <th className="py-3 px-4">Asesor</th>
                <th className="py-3 px-4 text-center">Fecha</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProformas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Search size={18} />
                      </div>
                      <p className="font-semibold text-slate-700 text-sm">No se encontraron proformas</p>
                      <p className="text-xs text-slate-400">
                        Intenta ajustar los criterios de búsqueda o limpia los filtros activos para ver todos los registros.
                      </p>
                      {isFilteringActive && (
                        <button
                          onClick={handleClearFilters}
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                        >
                          <RotateCcw size={12} />
                          <span>Restablecer filtros</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProformas.map((pf, idx) => {
                  const itemNumber = startIndex + idx + 1;
                  const details = pf.details || {};
                  const downPayment = details.down || 0;
                  const termMonths = details.term || 0;

                  return (
                    <tr key={pf.id || pf.number} className="hover:bg-slate-50/80 transition group">
                      {/* Row Index */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 font-medium">
                        {itemNumber}
                      </td>

                      {/* Number */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-mono text-[11px] border border-slate-200/60">
                          {pf.number}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 leading-snug">{pf.client_name}</div>
                        {(details.celular || details.cedula) && (
                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            {details.cedula && <span>CI: {details.cedula}</span>}
                            {details.cedula && details.celular && <span>•</span>}
                            {details.celular && <span>{details.celular}</span>}
                          </div>
                        )}
                      </td>

                      {/* Project */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50/70 px-2 py-0.5 rounded text-[11px] border border-rose-100">
                          <Building2 size={11} className="text-rose-500" />
                          {pf.project}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {pf.category || 'Estándar'}
                      </td>

                      {/* Total Value */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 text-sm whitespace-nowrap">
                        {formatCurrency(pf.value, true)}
                      </td>

                      {/* Down Payment & Term */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-slate-500">
                        {downPayment > 0 ? (
                          <div>
                            <span className="font-semibold text-slate-700">{formatCurrency(downPayment, true)}</span>
                            {termMonths > 0 && <span className="text-[10px] text-slate-400 block">{termMonths} meses</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Advisor */}
                      <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                        {pf.advisor || 'Andrea Cedeño'}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-center text-slate-500 font-medium whitespace-nowrap text-[11px]">
                        {pf.date}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(pf.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedProforma(pf);
                            setIsModalOpen(true);
                          }}
                          className="bg-[#E11D48] hover:bg-rose-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                          title="Ver detalle de cotización"
                        >
                          <Eye size={13} />
                          <span>Ver Proforma</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer (15 registros por página) */}
        <div className="bg-slate-50/90 border-t border-slate-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          {/* Contador de registros en página actual */}
          <div className="flex items-center gap-1.5 font-medium">
            {filteredProformas.length > 0 ? (
              <span>
                Mostrando <strong className="text-slate-800 font-bold">{startIndex + 1}</strong> a <strong className="text-slate-800 font-bold">{endIndex}</strong> de <strong className="text-slate-800 font-bold">{filteredProformas.length}</strong> registros
              </span>
            ) : (
              <span>0 registros encontrados</span>
            )}
          </div>

          {/* Navigation Controls */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPageClamped === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer text-slate-700"
                title="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  // If lots of pages, only show nearby pages
                  if (
                    totalPages > 7 &&
                    pageNum !== 1 &&
                    pageNum !== totalPages &&
                    Math.abs(pageNum - currentPageClamped) > 1
                  ) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return <span key={pageNum} className="text-slate-400 px-1">...</span>;
                    }
                    return null;
                  }

                  const isActive = pageNum === currentPageClamped;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isActive
                          ? 'bg-[#E11D48] text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPageClamped === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition cursor-pointer text-slate-700"
                title="Página siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Proforma View Modal */}
      <ProformaModal
        proforma={selectedProforma}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProforma(null);
        }}
      />
    </div>
  );
}
