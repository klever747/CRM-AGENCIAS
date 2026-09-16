import React, { useState, useMemo } from 'react';
import { 
  History, Search, Filter, RotateCcw, ChevronLeft, ChevronRight, 
  ShieldAlert, RefreshCw, Download, Calendar, User, Laptop, 
  Layers, CheckCircle2, AlertTriangle, Eye, X, Activity, ArrowUpDown
} from 'lucide-react';
import { AuditLog } from '../types';

interface AuditoriaViewProps {
  logs: AuditLog[];
  onRefresh: () => void;
}

const PAGE_SIZE = 15;

export default function AuditoriaView({ logs, onRefresh }: AuditoriaViewProps) {
  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('Todos');
  const [selectedAction, setSelectedAction] = useState('Todas');
  const [selectedUser, setSelectedUser] = useState('Todos');

  // Pagination state (15 per page)
  const [currentPage, setCurrentPage] = useState(1);

  // Detail Modal state
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Refresh spinner state
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Extract unique modules, actions, and users
  const uniqueModules = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.module && l.module.trim()) set.add(l.module.trim());
    });
    return Array.from(set).sort();
  }, [logs]);

  const uniqueActions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.action && l.action.trim()) set.add(l.action.trim());
    });
    return Array.from(set).sort();
  }, [logs]);

  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => {
      if (l.user && l.user.trim()) set.add(l.user.trim());
    });
    return Array.from(set).sort();
  }, [logs]);

  // Overall counters (KPIs)
  const totalLogs = logs.length;
  const modulesCount = uniqueModules.length;
  const usersCount = uniqueUsers.length;
  const criticalActionsCount = useMemo(() => {
    return logs.filter(l => {
      const act = (l.action || '').toLowerCase();
      return act.includes('cambió') || act.includes('eliminó') || act.includes('asign') || act.includes('creó');
    }).length;
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      // 1. Search text match
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const userMatch = (l.user || '').toLowerCase().includes(q);
        const actionMatch = (l.action || '').toLowerCase().includes(q);
        const moduleMatch = (l.module || '').toLowerCase().includes(q);
        const recordMatch = (l.record || '').toLowerCase().includes(q);
        const ipMatch = (l.ip || '').toLowerCase().includes(q);
        const dateMatch = (l.date || '').toLowerCase().includes(q);

        if (!userMatch && !actionMatch && !moduleMatch && !recordMatch && !ipMatch && !dateMatch) {
          return false;
        }
      }

      // 2. Module filter
      if (selectedModule !== 'Todos' && l.module !== selectedModule) {
        return false;
      }

      // 3. Action filter
      if (selectedAction !== 'Todas' && l.action !== selectedAction) {
        return false;
      }

      // 4. User filter
      if (selectedUser !== 'Todos' && l.user !== selectedUser) {
        return false;
      }

      return true;
    });
  }, [logs, searchTerm, selectedModule, selectedAction, selectedUser]);

  // Reset to page 1 on filter changes
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedModule('Todos');
    setSelectedAction('Todas');
    setSelectedUser('Todos');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || selectedModule !== 'Todos' || selectedAction !== 'Todas' || selectedUser !== 'Todos';

  // Pagination calculation (15 per page)
  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const currentLogs = filteredLogs.slice(startIndex, endIndex);

  // CSV Export utility
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Fecha y Hora', 'Usuario Responsable', 'Operacion / Accion', 'Modulo', 'Registro / Detalle', 'IP'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${(l.date || '').replace(/"/g, '""')}"`,
      `"${(l.user || '').replace(/"/g, '""')}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.module || '').replace(/"/g, '""')}"`,
      `"${(l.record || '').replace(/"/g, '""')}"`,
      `"${(l.ip || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_corporacion_zavala_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for action badge styles
  const getActionBadge = (action: string) => {
    const act = (action || '').toLowerCase();
    if (act.includes('creó') || act.includes('insert')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('actualiz') || act.includes('modific') || act.includes('update')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('cambió estado') || act.includes('toggle') || act.includes('inactiv') || act.includes('activ')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (act.includes('asign') || act.includes('lead')) {
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }
    if (act.includes('elimin') || act.includes('delete') || act.includes('borr')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  // Helper for module badge styles
  const getModuleBadge = (moduleName: string) => {
    const m = (moduleName || '').toLowerCase();
    if (m.includes('lead')) return 'bg-rose-50 text-[#E11D48] border-rose-100 font-bold';
    if (m.includes('usuario')) return 'bg-purple-50 text-purple-700 border-purple-100 font-bold';
    if (m.includes('agencia')) return 'bg-blue-50 text-blue-700 border-blue-100 font-bold';
    if (m.includes('reserva') || m.includes('venta')) return 'bg-emerald-50 text-emerald-700 border-emerald-100 font-bold';
    if (m.includes('proforma')) return 'bg-amber-50 text-amber-700 border-amber-100 font-bold';
    return 'bg-slate-100 text-slate-700 border-slate-200 font-bold';
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-[#E11D48] border border-rose-100">
              <History size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 font-display">Trazabilidad de Acciones (Auditoría)</h2>
              <p className="text-xs text-slate-500 font-medium">
                Historial completo de auditoría, accesos y operaciones críticas registradas en la base de datos
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            title="Recargar eventos recientes"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-[#E11D48]' : ''} />
            <span>Actualizar</span>
          </button>

          <button 
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="bg-[#E11D48] hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            title="Exportar registros filtrados a CSV"
          >
            <Download size={14} />
            <span>Exportar Bitácora</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Counters (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Eventos</span>
            <Activity size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-800 mt-1">{totalLogs}</div>
          <span className="text-[10px] text-slate-400 font-semibold">Trazas históricas almacenadas</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Módulos Auditados</span>
            <Layers size={16} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-1">{modulesCount}</div>
          <span className="text-[10px] text-indigo-600 font-semibold">
            Áreas de negocio con registro
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Usuarios Actores</span>
            <User size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-700 mt-1">{usersCount}</div>
          <span className="text-[10px] text-slate-400 font-semibold">Operadores con eventos generados</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Cambios Críticos</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{criticalActionsCount}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">Creación, asignación y estados</span>
        </div>
      </div>

      {/* 3. Search and Filter Toolbar with Counter */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuario, acción, módulo, detalle, IP, fecha..."
              value={searchTerm}
              onChange={(e) => handleFilterChange(setSearchTerm, e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:ring-1 focus:ring-[#E11D48] transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => handleFilterChange(setSearchTerm, '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by Module */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Layers size={13} className="text-slate-400" />
              <select
                value={selectedModule}
                onChange={(e) => handleFilterChange(setSelectedModule, e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Todos">Todos los módulos ({uniqueModules.length})</option>
                {uniqueModules.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Filter by Action */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Filter size={13} className="text-slate-400" />
              <select
                value={selectedAction}
                onChange={(e) => handleFilterChange(setSelectedAction, e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Todas">Todas las acciones ({uniqueActions.length})</option>
                {uniqueActions.map(act => (
                  <option key={act} value={act}>{act}</option>
                ))}
              </select>
            </div>

            {/* Filter by User */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <User size={13} className="text-slate-400" />
              <select
                value={selectedUser}
                onChange={(e) => handleFilterChange(setSelectedUser, e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Todos">Todos los usuarios ({uniqueUsers.length})</option>
                {uniqueUsers.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl flex items-center gap-1 transition cursor-pointer"
                title="Limpiar todos los filtros"
              >
                <RotateCcw size={13} />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Counter Info Bar & Quick Module Pills */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {/* Live Record Counter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-700">
              {totalItems === 0 ? (
                'No se encontraron eventos de auditoría'
              ) : (
                <>
                  Mostrando <strong className="text-slate-900">{startIndex + 1}</strong> a <strong className="text-slate-900">{endIndex}</strong> de <strong className="text-slate-900">{totalItems}</strong> {totalItems === 1 ? 'evento' : 'eventos'}
                  {totalItems !== totalLogs && (
                    <span className="text-slate-400 font-normal"> (filtrados de {totalLogs} totales)</span>
                  )}
                </>
              )}
            </span>

            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
              15 por página
            </span>
          </div>

          {/* Quick Module Tabs */}
          <div className="flex items-center gap-1.5 self-start sm:self-center flex-wrap">
            <button
              onClick={() => handleFilterChange(setSelectedModule, 'Todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedModule === 'Todos' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Todos ({totalLogs})
            </button>
            {uniqueModules.slice(0, 4).map(mod => {
              const count = logs.filter(l => l.module === mod).length;
              return (
                <button
                  key={mod}
                  onClick={() => handleFilterChange(setSelectedModule, mod)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedModule === mod ? 'bg-[#E11D48] text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {mod} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Audit Table (15 records per page) */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-50/90 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4 min-w-[150px]">Fecha y Hora</th>
                <th className="py-3.5 px-4 min-w-[170px]">Usuario Responsable</th>
                <th className="py-3.5 px-4 min-w-[150px]">Operación / Acción</th>
                <th className="py-3.5 px-4 min-w-[120px]">Módulo</th>
                <th className="py-3.5 px-4 min-w-[240px]">Registro Identificado / Detalle</th>
                <th className="py-3.5 px-4 text-center min-w-[110px]">Dirección IP</th>
                <th className="py-3.5 px-4 text-right min-w-[90px]">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                    <History size={36} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">No se encontraron eventos</p>
                    <p className="text-[11px] text-slate-400">Intenta modificando el término de búsqueda o limpiando los filtros.</p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-2 text-xs font-bold text-[#E11D48] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw size={12} />
                        Limpiar filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                currentLogs.map((log, idx) => {
                  const itemNumber = startIndex + idx + 1;
                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-slate-50/75 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Row Index */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-[11px]">
                        {itemNumber}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <Calendar size={13} className="text-slate-400 shrink-0" />
                          <span className="whitespace-nowrap">{log.date}</span>
                        </div>
                      </td>

                      {/* Responsible User */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-extrabold text-[11px] shrink-0">
                            {(log.user || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                              {log.user}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold block">
                              ID Log: #{log.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Operation / Action */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getActionBadge(log.action)}`}>
                          {log.action}
                        </span>
                      </td>

                      {/* Module */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] border ${getModuleBadge(log.module)}`}>
                          {log.module}
                        </span>
                      </td>

                      {/* Identified Record / Detail */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-800 text-xs block leading-snug">
                          {log.record}
                        </span>
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 inline-flex items-center gap-1">
                          <Laptop size={11} className="text-slate-400" />
                          {log.ip}
                        </span>
                      </td>

                      {/* Action: Inspect */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Ver detalle del evento"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Controls (Strict 15 records per page) */}
        {totalItems > 0 && (
          <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {/* Left: Summary text */}
            <div className="text-slate-500 font-medium text-center sm:text-left">
              Página <strong className="text-slate-800 font-bold">{effectivePage}</strong> de <strong className="text-slate-800 font-bold">{totalPages}</strong> • Mostrando {startIndex + 1} a {endIndex} de {totalItems} {totalItems === 1 ? 'evento' : 'eventos'} (15 por página)
            </div>

            {/* Right: Navigation buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={effectivePage === 1}
                className={`p-1.5 rounded-lg border flex items-center gap-1 font-bold text-xs transition ${
                  effectivePage === 1 
                    ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50' 
                    : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-100 cursor-pointer shadow-2xs'
                }`}
                title="Página anterior"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline pr-1">Anterior</span>
              </button>

              {/* Page buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (totalPages > 7) {
                    if (page !== 1 && page !== totalPages && Math.abs(page - effectivePage) > 1) {
                      if (page === 2 || page === totalPages - 1) {
                        return <span key={page} className="px-1 text-slate-400">...</span>;
                      }
                      return null;
                    }
                  }

                  const isCurrent = page === effectivePage;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg font-bold text-xs transition cursor-pointer ${
                        isCurrent
                          ? 'bg-[#E11D48] text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={effectivePage === totalPages}
                className={`p-1.5 rounded-lg border flex items-center gap-1 font-bold text-xs transition ${
                  effectivePage === totalPages 
                    ? 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50' 
                    : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-100 cursor-pointer shadow-2xs'
                }`}
                title="Página siguiente"
              >
                <span className="hidden sm:inline pl-1">Siguiente</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Detail Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-[#E11D48]">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Detalle del Evento de Auditoría
                  </h3>
                  <p className="text-xs text-slate-400">
                    Registro inmutable #{selectedLog.id}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Usuario</span>
                  <span className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
                    <User size={14} className="text-slate-400" />
                    {selectedLog.user}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Fecha y Hora</span>
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar size={14} className="text-slate-400" />
                    {selectedLog.date}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Módulo Afectado</span>
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs ${getModuleBadge(selectedLog.module)}`}>
                    {selectedLog.module}
                  </span>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Operación Realizada</span>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-extrabold border ${getActionBadge(selectedLog.action)}`}>
                    {selectedLog.action}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Descripción del Registro</span>
                <p className="text-xs font-bold text-slate-900 leading-relaxed">
                  {selectedLog.record}
                </p>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Dirección IP de Origen</span>
                  <span className="font-mono text-xs font-bold text-slate-800">{selectedLog.ip}</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Verificado
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
