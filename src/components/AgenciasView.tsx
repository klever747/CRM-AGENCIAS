import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, MapPin, Users, Plus, Search, Filter, 
  RotateCcw, ChevronLeft, ChevronRight, CheckCircle2, 
  XCircle, Edit2, X, Briefcase, ShieldCheck, UserCheck,
  Sparkles
} from 'lucide-react';
import { Agencia, Usuario } from '../types';

interface AgenciasViewProps {
  agencias: Agencia[];
  usuarios?: Usuario[];
  onRefresh: () => void;
  onToggleStatus: (id: number) => void;
}

const AVAILABLE_PROJECTS = [
  'Vista del Valle',
  'Ciudad Verde Norte',
  'Terrazas del Río',
  'Bosques de Samborondón'
];

const AVAILABLE_CITIES = [
  'Santo Domingo',
  'La Concordia'
];

const PAGE_SIZE = 15;

export default function AgenciasView({ agencias, usuarios, onRefresh, onToggleStatus }: AgenciasViewProps) {
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedProject, setSelectedProject] = useState('Todos');
  
  // Pagination state (15 per page)
  const [currentPage, setCurrentPage] = useState(1);

  // Dynamic projects from database
  const [availableProjects, setAvailableProjects] = useState<string[]>(AVAILABLE_PROJECTS);

  useEffect(() => {
    fetch('/api/urbanizaciones')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((u: any) => u.name);
          setAvailableProjects(names);
        }
      })
      .catch(err => console.warn('Could not load projects for agencias:', err));
  }, []);

  // Modal state (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agencia | null>(null);
  const [formName, setFormName] = useState('');
  const [formCity, setFormCity] = useState('Santo Domingo');
  const [formSupervisor, setFormSupervisor] = useState('');
  const [isCustomSupervisor, setIsCustomSupervisor] = useState(false);
  const [formAdvisors, setFormAdvisors] = useState(5);
  const [formStatus, setFormStatus] = useState('Activa');
  const [formProjects, setFormProjects] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Internal users list (synced with prop or fetched)
  const [internalUsuarios, setInternalUsuarios] = useState<Usuario[]>(usuarios || []);

  useEffect(() => {
    if (usuarios && usuarios.length > 0) {
      setInternalUsuarios(usuarios);
    } else {
      fetch('/api/usuarios')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setInternalUsuarios(data);
        })
        .catch(err => console.error('Error fetching usuarios for agencias:', err));
    }
  }, [usuarios]);

  // Filter all users who are supervisors or directors
  const supervisorUsers = useMemo(() => {
    return internalUsuarios.filter(u => {
      // Exclude inactive users unless they are already the currently assigned supervisor
      if (u.status && u.status.toLowerCase() !== 'activo' && u.status.toLowerCase() !== 'active') {
        if (formSupervisor && u.name.trim().toLowerCase() === formSupervisor.trim().toLowerCase()) return true;
        return false;
      }
      const roleLower = (u.role || '').toLowerCase().trim();
      return (
        roleLower.includes('supervisor') ||
        roleLower.includes('director') ||
        roleLower.includes('jefe') ||
        roleLower.includes('geren') ||
        roleLower === 'ceo'
      );
    });
  }, [internalUsuarios, formSupervisor]);

  // Sort supervisors: Supervisor Comercial first, then other supervisors, then alphabet
  const sortedSupervisorUsers = useMemo(() => {
    return [...supervisorUsers].sort((a, b) => {
      const aCom = a.role.toLowerCase().includes('supervisor comercial');
      const bCom = b.role.toLowerCase().includes('supervisor comercial');
      if (aCom && !bCom) return -1;
      if (!aCom && bCom) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [supervisorUsers]);

  // Selected supervisor details
  const selectedSupervisorUser = useMemo(() => {
    if (!formSupervisor) return null;
    return internalUsuarios.find(u => u.name.trim().toLowerCase() === formSupervisor.trim().toLowerCase()) || null;
  }, [internalUsuarios, formSupervisor]);

  // Extract unique cities from current agencies list
  const uniqueCities = useMemo(() => {
    const citiesSet = new Set<string>();
    agencias.forEach(a => {
      if (a.city && a.city.trim()) {
        citiesSet.add(a.city.trim());
      }
    });
    return Array.from(citiesSet).sort();
  }, [agencias]);

  // Overall counters (KPIs)
  const totalAgencies = agencias.length;
  const activeCount = agencias.filter(a => a.status === 'Activa').length;
  const inactiveCount = agencias.filter(a => a.status !== 'Activa').length;
  const totalAdvisors = agencias.reduce((acc, a) => acc + (a.advisors_count ?? a.advisors ?? 0), 0);

  // Filtered agencies based on search and filters
  const filteredAgencias = useMemo(() => {
    return agencias.filter(ag => {
      // 1. Search term match
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const nameMatch = (ag.name || '').toLowerCase().includes(query);
        const cityMatch = (ag.city || '').toLowerCase().includes(query);
        const supervisorMatch = ((ag.manager || ag.supervisor) || '').toLowerCase().includes(query);
        const projectsMatch = Array.isArray(ag.projects) && ag.projects.some(p => p.toLowerCase().includes(query));
        if (!nameMatch && !cityMatch && !supervisorMatch && !projectsMatch) {
          return false;
        }
      }

      // 2. City filter
      if (selectedCity !== 'Todas' && ag.city !== selectedCity) {
        return false;
      }

      // 3. Status filter
      if (selectedStatus !== 'Todos' && ag.status !== selectedStatus) {
        return false;
      }

      // 4. Project filter
      if (selectedProject !== 'Todos') {
        if (!Array.isArray(ag.projects) || !ag.projects.includes(selectedProject)) {
          return false;
        }
      }

      return true;
    });
  }, [agencias, searchTerm, selectedCity, selectedStatus, selectedProject]);

  // Reset to page 1 whenever filters change
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCity('Todas');
    setSelectedStatus('Todos');
    setSelectedProject('Todos');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || selectedCity !== 'Todas' || selectedStatus !== 'Todos' || selectedProject !== 'Todos';

  // Pagination calculation (15 items per page)
  const totalItems = filteredAgencias.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const currentAgencies = filteredAgencias.slice(startIndex, endIndex);

  // Modal open handlers
  const handleOpenCreateModal = () => {
    setEditingAgency(null);
    setFormName('');
    setFormCity('Santo Domingo');
    setFormSupervisor('');
    setIsCustomSupervisor(false);
    setFormAdvisors(0);
    setFormStatus('Activa');
    setFormProjects(['Vista del Valle']);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ag: Agencia) => {
    setEditingAgency(ag);
    setFormName(ag.name);
    const c = (ag.city || '').trim();
    const validCity = (c.toLowerCase() === 'la concordia') ? 'La Concordia' : 'Santo Domingo';
    setFormCity(validCity);
    const mgr = (ag.manager || ag.supervisor || '').trim();
    setFormSupervisor(mgr);
    // If mgr is specified and not found in supervisor users, enable custom mode
    const isKnownSupervisor = sortedSupervisorUsers.some(u => u.name.trim().toLowerCase() === mgr.toLowerCase());
    setIsCustomSupervisor(Boolean(mgr && !isKnownSupervisor));
    setFormAdvisors(ag.advisors_count ?? ag.advisors ?? 0);
    setFormStatus(ag.status || 'Activa');
    setFormProjects(Array.isArray(ag.projects) ? ag.projects : []);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleToggleProjectCheckbox = (project: string) => {
    setFormProjects(prev => 
      prev.includes(project) ? prev.filter(p => p !== project) : [...prev, project]
    );
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('El nombre de la agencia es obligatorio.');
      return;
    }
    if (!formCity.trim()) {
      setFormError('La ciudad es obligatoria.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload = {
        name: formName.trim(),
        city: formCity.trim(),
        supervisor: editingAgency ? formSupervisor.trim() : '',
        manager: editingAgency ? formSupervisor.trim() : '',
        advisors: editingAgency ? (Number(editingAgency.advisors_count ?? editingAgency.advisors) || 0) : 0,
        advisors_count: editingAgency ? (Number(editingAgency.advisors_count ?? editingAgency.advisors) || 0) : 0,
        status: formStatus,
        projects: formProjects
      };

      const url = editingAgency ? `/api/agencias/${editingAgency.id}` : '/api/agencias';
      const method = editingAgency ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        onRefresh();
      } else {
        setFormError(data.message || 'Error al guardar la agencia.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-[#E11D48] border border-rose-100">
              <Building2 size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 font-display">Gestión de Agencias</h2>
              <p className="text-xs text-slate-500 font-medium">
                Puntos de atención y venta autorizados para urbanizaciones en todo el país
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleOpenCreateModal}
            className="bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Crear Nueva Agencia</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Agencias</span>
            <Building2 size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-800 mt-1">{totalAgencies}</div>
          <span className="text-[10px] text-slate-400 font-semibold">Sucursales a nivel nacional</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Agencias Activas</span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{activeCount}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {totalAgencies > 0 ? `${Math.round((activeCount / totalAgencies) * 100)}% de operatividad` : 'Operativas'}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inactivas / Pausa</span>
            <XCircle size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-700 mt-1">{inactiveCount}</div>
          <span className="text-[10px] text-slate-400 font-semibold">Sin asignación temporal</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fuerza Comercial</span>
            <Users size={16} className="text-[#E11D48]" />
          </div>
          <div className="text-2xl font-black text-slate-800 mt-1">{totalAdvisors}</div>
          <span className="text-[10px] text-slate-400 font-semibold">Asesores en {uniqueCities.length} ciudades</span>
        </div>
      </div>

      {/* 3. Search and Filter Toolbar with Counter */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
          {/* Left: Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar agencia, ciudad, director, proyecto..."
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

          {/* Center / Right: Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by City */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <MapPin size={13} className="text-slate-400" />
              <select
                value={selectedCity}
                onChange={(e) => handleFilterChange(setSelectedCity, e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Todas">Todas las ciudades ({uniqueCities.length})</option>
                {uniqueCities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Filter size={13} className="text-slate-400" />
              <select
                value={selectedStatus}
                onChange={(e) => handleFilterChange(setSelectedStatus, e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Todos">Todos los estados</option>
                <option value="Activa">Activas ({activeCount})</option>
                <option value="Inactiva">Inactivas ({inactiveCount})</option>
              </select>
            </div>

            {/* Filter by Project */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Briefcase size={13} className="text-slate-400" />
              <select
                value={selectedProject}
                onChange={(e) => handleFilterChange(setSelectedProject, e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Todos">Todos los proyectos</option>
                {availableProjects.map(proj => (
                  <option key={proj} value={proj}>{proj}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl flex items-center gap-1 transition"
                title="Limpiar todos los filtros"
              >
                <RotateCcw size={13} />
                <span>Limpiar</span>
              </button>
            )}
          </div>
        </div>

        {/* Counter Info Bar & Quick Status Pills */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {/* Live Record Counter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-700">
              {totalItems === 0 ? (
                'No se encontraron registros'
              ) : (
                <>
                  Mostrando <strong className="text-slate-900">{startIndex + 1}</strong> a <strong className="text-slate-900">{endIndex}</strong> de <strong className="text-slate-900">{totalItems}</strong> {totalItems === 1 ? 'agencia' : 'agencias'}
                  {totalItems !== totalAgencies && (
                    <span className="text-slate-400 font-normal"> (filtradas de {totalAgencies} totales)</span>
                  )}
                </>
              )}
            </span>

            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
              15 por página
            </span>
          </div>

          {/* Quick status tabs */}
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <button
              onClick={() => handleFilterChange(setSelectedStatus, 'Todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                selectedStatus === 'Todos' ? 'bg-slate-800 text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Todas ({totalAgencies})
            </button>
            <button
              onClick={() => handleFilterChange(setSelectedStatus, 'Activa')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                selectedStatus === 'Activa' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Activas ({activeCount})
            </button>
            <button
              onClick={() => handleFilterChange(setSelectedStatus, 'Inactiva')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                selectedStatus === 'Inactiva' ? 'bg-slate-600 text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Inactivas ({inactiveCount})
            </button>
          </div>
        </div>
      </div>

      {/* 4. Agencias Table (15 records per page) */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-50/90 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4 min-w-[200px]">Agencia</th>
                <th className="py-3.5 px-4 min-w-[120px]">Ciudad</th>
                <th className="py-3.5 px-4 min-w-[180px]">Director / Supervisor</th>
                <th className="py-3.5 px-4 text-center min-w-[100px]">N° Asesores</th>
                <th className="py-3.5 px-4 min-w-[220px]">Proyectos Habilitados</th>
                <th className="py-3.5 px-4 text-center min-w-[100px]">Estado</th>
                <th className="py-3.5 px-4 text-right min-w-[140px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentAgencies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                    <Building2 size={36} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">No se encontraron agencias</p>
                    <p className="text-[11px] text-slate-400">Intenta ajustando el término de búsqueda o limpiando los filtros.</p>
                    {hasActiveFilters && (
                      <button
                        onClick={handleClearFilters}
                        className="mt-2 text-xs font-bold text-[#E11D48] hover:underline inline-flex items-center gap-1"
                      >
                        <RotateCcw size={12} />
                        Limpiar filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                currentAgencies.map((ag, idx) => {
                  const itemNumber = startIndex + idx + 1;
                  const supervisorName = ag.manager || ag.supervisor || 'Sin asignar';
                  const advisorsCount = ag.advisors_count ?? ag.advisors ?? 0;
                  const isActive = ag.status === 'Activa';

                  return (
                    <tr 
                      key={ag.id} 
                      className="hover:bg-slate-50/75 transition-colors group"
                    >
                      {/* Row Index */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-[11px]">
                        {itemNumber}
                      </td>

                      {/* Agency Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-rose-50 text-[#E11D48]' : 'bg-slate-100 text-slate-400'}`}>
                            <Building2 size={16} />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                              {ag.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                              ID: #{ag.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* City */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        <span className="inline-flex items-center gap-1 bg-slate-100/90 text-slate-700 px-2.5 py-0.5 rounded-md text-[11px] font-bold">
                          <MapPin size={12} className="text-slate-400" />
                          {ag.city}
                        </span>
                      </td>

                      {/* Supervisor / Director */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                            {supervisorName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800 text-xs truncate max-w-[160px]">
                            {supervisorName}
                          </span>
                        </div>
                      </td>

                      {/* Number of Advisors */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-800">
                          <Users size={12} className="text-slate-500" />
                          {advisorsCount}
                        </span>
                      </td>

                      {/* Projects */}
                      <td className="py-3.5 px-4">
                        <div className="flex gap-1.5 flex-wrap max-w-xs">
                          {Array.isArray(ag.projects) && ag.projects.length > 0 ? (
                            ag.projects.map((p, pIdx) => (
                              <span 
                                key={pIdx} 
                                className="bg-rose-50/80 text-rose-800 border border-rose-100 text-[10px] px-2 py-0.5 rounded-md font-bold"
                              >
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Sin proyectos asignados</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {ag.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleOpenEditModal(ag)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                            title="Editar agencia"
                          >
                            <Edit2 size={14} />
                          </button>
                          
                          <button 
                            onClick={() => onToggleStatus(ag.id)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
                              isActive 
                                ? 'text-amber-700 hover:bg-amber-50' 
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'Desactivar agencia' : 'Activar agencia'}
                          >
                            {isActive ? 'Pausar' : 'Activar'}
                          </button>
                        </div>
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
              Página <strong className="text-slate-800 font-bold">{effectivePage}</strong> de <strong className="text-slate-800 font-bold">{totalPages}</strong> • Mostrando {startIndex + 1} a {endIndex} de {totalItems} {totalItems === 1 ? 'registro' : 'registros'} (15 por página)
            </div>

            {/* Right: Page navigation buttons */}
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

              {/* Page number buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show limited buttons if there are many pages
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

      {/* 6. Create / Edit Agency Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-[#E11D48]">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    {editingAgency ? 'Editar Agencia' : 'Nueva Agencia'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingAgency ? `Modificar datos de #${editingAgency.id}` : 'Registrar nueva sucursal comercial'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Agencia *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Agencia Quito Cumbayá"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#E11D48]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="select-agencia-ciudad" className="block text-xs font-bold text-slate-700">
                    Ciudad *
                  </label>
                  <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                    Ubicación Autorizada
                  </span>
                </div>

                <div className="relative">
                  <select
                    id="select-agencia-ciudad"
                    required
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#E11D48] cursor-pointer appearance-none pr-8"
                  >
                    <option value="Santo Domingo">Santo Domingo</option>
                    <option value="La Concordia">La Concordia</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                    <MapPin size={13} />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ubicaciones comerciales exclusivas: Santo Domingo y La Concordia
                </p>
              </div>

              {/* Director / Supervisor de Agencia (Solo para agencias existentes al editar) */}
              {editingAgency && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Director / Supervisor de Agencia
                    </label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 flex items-center gap-1">
                      <ShieldCheck size={11} className="text-blue-600" />
                      Filtrado: {sortedSupervisorUsers.length} supervisores
                    </span>
                  </div>

                  {!isCustomSupervisor ? (
                    <div className="space-y-2">
                      <select
                        value={formSupervisor}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomSupervisor(true);
                          } else {
                            setFormSupervisor(e.target.value);
                          }
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#E11D48]"
                      >
                        <option value="">-- Seleccionar Director / Supervisor del personal --</option>
                        {sortedSupervisorUsers.map(u => (
                          <option key={u.id} value={u.name}>
                            {u.name} — {u.role} ({u.agency_name || 'Corporativo'})
                          </option>
                        ))}
                        {formSupervisor && !sortedSupervisorUsers.some(u => u.name.trim().toLowerCase() === formSupervisor.trim().toLowerCase()) && (
                          <option value={formSupervisor}>
                            {formSupervisor} (Asignado actualmente)
                          </option>
                        )}
                        <option value="__custom__">✏️ Ingresar otro nombre manualmente...</option>
                      </select>

                      {/* Quick Selected Supervisor Info Card */}
                      {selectedSupervisorUser ? (
                        <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-left">
                          <div className="w-8 h-8 rounded-lg bg-[#E11D48]/10 text-[#E11D48] flex items-center justify-center font-bold text-xs shrink-0">
                            {selectedSupervisorUser.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="text-xs font-bold text-slate-800 truncate">
                                {selectedSupervisorUser.name}
                              </h5>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                {selectedSupervisorUser.role}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {selectedSupervisorUser.email} • {selectedSupervisorUser.agency_name || 'Corporativo'}
                            </p>
                          </div>
                          <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mr-1" />
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400">
                          Solo se listan usuarios con cargo de Supervisor o Director para asegurar la jerarquía de la agencia.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Nombre y apellido del director..."
                          value={formSupervisor}
                          onChange={(e) => setFormSupervisor(e.target.value)}
                          className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-[#E11D48]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setIsCustomSupervisor(false);
                            if (!sortedSupervisorUsers.some(u => u.name === formSupervisor)) {
                              setFormSupervisor(sortedSupervisorUsers[0]?.name || '');
                            }
                          }}
                          className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition whitespace-nowrap"
                        >
                          Volver a lista
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Modo manual activado. Se recomienda seleccionar un usuario del equipo de supervisores.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estado Operativo
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#E11D48]"
                >
                  <option value="Activa">Activa</option>
                  <option value="Inactiva">Inactiva</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Proyectos Habilitados
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  {availableProjects.map(proj => (
                    <label 
                      key={proj} 
                      className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900"
                    >
                      <input
                        type="checkbox"
                        checked={formProjects.includes(proj)}
                        onChange={() => handleToggleProjectCheckbox(proj)}
                        className="rounded text-[#E11D48] focus:ring-[#E11D48]"
                      />
                      <span>{proj}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#E11D48] hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  {isSubmitting ? 'Guardando...' : editingAgency ? 'Actualizar Agencia' : 'Crear Agencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
