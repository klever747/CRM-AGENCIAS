import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, UserCheck, UserX, Shield, Briefcase, Search, 
  Filter, RotateCcw, ChevronLeft, ChevronRight, Plus, 
  Edit2, X, Mail, Building2, CheckCircle2, XCircle
} from 'lucide-react';
import { Usuario, Agencia } from '../types';

interface UsuariosViewProps {
  usuarios: Usuario[];
  agencias?: Agencia[];
  onRefresh: () => void;
  onToggleStatus: (id: number) => void;
}

const PAGE_SIZE = 15;

export const AVAILABLE_ROLES = [
  'Admin',
  'CEO',
  'Director Administrativo',
  'Supervisor Comercial',
  'Supervisor de Cobranzas',
  'Asesora de Cobranzas',
  'Administrativo',
  'Asesor Comercial',
  'Chofer'
];

export default function UsuariosView({ 
  usuarios, 
  agencias = [], 
  onRefresh, 
  onToggleStatus 
}: UsuariosViewProps) {
  // Local agencias state in case not passed or needs fallback
  const [agencyList, setAgencyList] = useState<Agencia[]>(agencias);

  useEffect(() => {
    if (agencias && agencias.length > 0) {
      setAgencyList(agencias);
    } else {
      fetch('/api/agencias')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAgencyList(data);
        })
        .catch(err => console.error('Error loading agencies in UsuariosView:', err));
    }
  }, [agencias]);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedAgency, setSelectedAgency] = useState('Todas');

  // Pagination state (15 per page)
  const [currentPage, setCurrentPage] = useState(1);

  // Modal state (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formRole, setFormRole] = useState('Asesor Comercial');
  const [formAgencyId, setFormAgencyId] = useState<string>('');
  const [formSupervisor, setFormSupervisor] = useState('');
  const [formStatus, setFormStatus] = useState('Activo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Overall metrics / counters (KPIs)
  const totalUsers = usuarios.length;
  const activeCount = usuarios.filter(u => u.status === 'Activo').length;
  const inactiveCount = usuarios.filter(u => u.status !== 'Activo').length;
  const commercialCount = usuarios.filter(u => u.role === 'Asesor Comercial' || u.role === 'Asesor').length;
  const leadershipCount = usuarios.filter(u => ['CEO', 'Director Administrativo', 'Supervisor Comercial', 'Supervisor de Cobranzas', 'Supervisor', 'Administrador'].includes(u.role)).length;

  // Extract unique agency names for filter dropdown
  const uniqueAgencies = useMemo(() => {
    const set = new Set<string>();
    usuarios.forEach(u => {
      if (u.agency_name && u.agency_name.trim()) {
        set.add(u.agency_name.trim());
      }
    });
    // Also add from agencyList if available
    agencyList.forEach(a => {
      if (a.name && a.name.trim()) {
        set.add(a.name.trim());
      }
    });
    return Array.from(set).sort();
  }, [usuarios, agencyList]);

  // Filtered users list
  const filteredUsuarios = useMemo(() => {
    return usuarios.filter(u => {
      // 1. Search query match
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const nameMatch = (u.name || '').toLowerCase().includes(query);
        const emailMatch = (u.email || '').toLowerCase().includes(query);
        const roleMatch = (u.role || '').toLowerCase().includes(query);
        const supervisorMatch = (u.supervisor || '').toLowerCase().includes(query);
        const agencyMatch = (u.agency_name || '').toLowerCase().includes(query) || (u.agency_city || '').toLowerCase().includes(query);

        if (!nameMatch && !emailMatch && !roleMatch && !supervisorMatch && !agencyMatch) {
          return false;
        }
      }

      // 2. Role filter
      if (selectedRole !== 'Todos' && u.role !== selectedRole) {
        return false;
      }

      // 3. Status filter
      if (selectedStatus !== 'Todos' && u.status !== selectedStatus) {
        return false;
      }

      // 4. Agency filter
      if (selectedAgency !== 'Todas') {
        if (selectedAgency === 'Sin agencia' || selectedAgency === 'Corporativo') {
          if (u.agency_name) return false;
        } else if (u.agency_name !== selectedAgency) {
          return false;
        }
      }

      return true;
    });
  }, [usuarios, searchTerm, selectedRole, selectedStatus, selectedAgency]);

  // Reset to page 1 on filter changes
  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<any>>, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedRole('Todos');
    setSelectedStatus('Todos');
    setSelectedAgency('Todas');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm !== '' || selectedRole !== 'Todos' || selectedStatus !== 'Todos' || selectedAgency !== 'Todas';

  // Pagination calculation (15 per page)
  const totalItems = filteredUsuarios.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  const currentUsuarios = filteredUsuarios.slice(startIndex, endIndex);

  // Helper to get the agency manager / jefe de agencia
  const getAgencyManager = (agencyIdStrOrNum: string | number | null | undefined): string => {
    if (!agencyIdStrOrNum) return '';
    const ag = agencyList.find(a => String(a.id) === String(agencyIdStrOrNum));
    return (ag?.manager || ag?.supervisor || '').trim();
  };

  // Get currently selected agency's manager
  const currentAgencyManager = useMemo(() => {
    return getAgencyManager(formAgencyId);
  }, [formAgencyId, agencyList]);

  // Modal open handlers
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormRole('Asesor Comercial');

    // Auto-select first active agency, or first agency in list
    const defaultAgency = agencyList.find(a => a.status === 'Activa') || agencyList[0];
    const initialAgencyId = defaultAgency ? String(defaultAgency.id) : '';
    setFormAgencyId(initialAgencyId);

    // Automatically assign the Jefe de Agencia as supervisor directo
    const autoSupervisor = getAgencyManager(initialAgencyId);
    setFormSupervisor(autoSupervisor || '—');

    setFormStatus('Activo');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: Usuario) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormRole(user.role);
    setFormAgencyId(user.agency_id ? String(user.agency_id) : '');
    setFormSupervisor(user.supervisor || '—');
    setFormStatus(user.status || 'Activo');
    setFormError('');
    setIsModalOpen(true);
  };

  // When agency changes in modal, auto-update supervisor if creating or matching previous manager
  const handleAgencyChange = (newAgencyId: string) => {
    setFormAgencyId(newAgencyId);
    const autoSupervisor = getAgencyManager(newAgencyId);
    if (!editingUser) {
      setFormSupervisor(autoSupervisor || '—');
    } else {
      const previousManager = getAgencyManager(editingUser.agency_id);
      if (!formSupervisor || formSupervisor === '—' || formSupervisor === previousManager) {
        setFormSupervisor(autoSupervisor || '—');
      }
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('El nombre completo es obligatorio.');
      return;
    }
    if (!formEmail.trim()) {
      setFormError('El email corporativo es obligatorio.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const resolvedSupervisor = formSupervisor.trim() || currentAgencyManager || '—';
      const payload = {
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        agency_id: formAgencyId ? Number(formAgencyId) : null,
        supervisor: resolvedSupervisor,
        status: formStatus
      };

      const url = editingUser ? `/api/usuarios/${editingUser.id}` : '/api/usuarios';
      const method = editingUser ? 'PUT' : 'POST';

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
        setFormError(data.message || 'Error al guardar el usuario.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for role badge colors
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'CEO':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Director Administrativo':
        return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'Supervisor Comercial':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Supervisor de Cobranzas':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Asesora de Cobranzas':
        return 'bg-pink-100 text-pink-800 border-pink-300';
      case 'Administrativo':
      case 'Adminstrativo':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'Asesor Comercial':
      case 'Asesor':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Chofer':
        return 'bg-amber-50 text-amber-900 border-amber-300';
      case 'Administrador':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Supervisor':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-[#E11D48] border border-rose-100">
              <Users size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 font-display">Gestión de Usuarios</h2>
              <p className="text-xs text-slate-500 font-medium">
                Control de credenciales, los 8 roles corporativos y supervisores de la organización
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
            <span>Crear Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Counters (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Usuarios</span>
            <Users size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-800 mt-1">{totalUsers}</div>
          <span className="text-[10px] text-slate-400 font-semibold">Cuentas corporativas registradas</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Usuarios Activos</span>
            <UserCheck size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-1">{activeCount}</div>
          <span className="text-[10px] text-emerald-600 font-semibold">
            {totalUsers > 0 ? `${Math.round((activeCount / totalUsers) * 100)}% con acceso habilitado` : 'Habilitados'}
          </span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Inactivos / Pausa</span>
            <UserX size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-700 mt-1">{inactiveCount}</div>
          <span className="text-[10px] text-slate-400 font-semibold">Sin acceso operativo temporal</span>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Fuerza Comercial & Líderes</span>
            <Shield size={16} className="text-[#E11D48]" />
          </div>
          <div className="text-2xl font-black text-slate-800 mt-1">
            {commercialCount} <span className="text-sm font-semibold text-slate-400">/ {leadershipCount} líderes</span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">{commercialCount} asesores y {leadershipCount} directivos</span>
        </div>
      </div>

      {/* Role Quick Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => handleFilterChange(setSelectedRole, 'Todos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
            selectedRole === 'Todos'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
          }`}
        >
          Todos ({totalUsers})
        </button>
        {AVAILABLE_ROLES.map(role => {
          const count = usuarios.filter(u => u.role === role).length;
          return (
            <button
              key={role}
              onClick={() => handleFilterChange(setSelectedRole, role)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition cursor-pointer border ${
                selectedRole === role
                  ? 'bg-[#E11D48] text-white border-[#E11D48] shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <span>{role}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                selectedRole === role ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Search and Filter Toolbar with Counter */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 flex-wrap">
          {/* Left: Search Box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar usuario, email, rol, supervisor, agencia..."
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

          {/* Right: Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter by Role */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Shield size={13} className="text-slate-400" />
              <select
                value={selectedRole}
                onChange={(e) => handleFilterChange(setSelectedRole, e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Todos">Todos los roles</option>
                {AVAILABLE_ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            {/* Filter by Agency */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
              <Building2 size={13} className="text-slate-400" />
              <select
                value={selectedAgency}
                onChange={(e) => handleFilterChange(setSelectedAgency, e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="Todas">Todas las agencias ({uniqueAgencies.length})</option>
                {uniqueAgencies.map(ag => (
                  <option key={ag} value={ag}>{ag}</option>
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
                <option value="Activo">Activos ({activeCount})</option>
                <option value="Inactivo">Inactivos ({inactiveCount})</option>
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

        {/* Counter Info Bar & Quick Status Tabs */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          {/* Live Record Counter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-slate-700">
              {totalItems === 0 ? (
                'No se encontraron usuarios'
              ) : (
                <>
                  Mostrando <strong className="text-slate-900">{startIndex + 1}</strong> a <strong className="text-slate-900">{endIndex}</strong> de <strong className="text-slate-900">{totalItems}</strong> {totalItems === 1 ? 'usuario' : 'usuarios'}
                  {totalItems !== totalUsers && (
                    <span className="text-slate-400 font-normal"> (filtrados de {totalUsers} totales)</span>
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
              Todos ({totalUsers})
            </button>
            <button
              onClick={() => handleFilterChange(setSelectedStatus, 'Activo')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                selectedStatus === 'Activo' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Activos ({activeCount})
            </button>
            <button
              onClick={() => handleFilterChange(setSelectedStatus, 'Inactivo')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                selectedStatus === 'Inactivo' ? 'bg-slate-600 text-white shadow-2xs' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Inactivos ({inactiveCount})
            </button>
          </div>
        </div>
      </div>

      {/* 4. Users Table (15 records per page) */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-50/90 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-200/80">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4 min-w-[200px]">Nombre Completo</th>
                <th className="py-3.5 px-4 min-w-[130px]">Rol de Sistema</th>
                <th className="py-3.5 px-4 min-w-[200px]">Email Corporativo</th>
                <th className="py-3.5 px-4 min-w-[180px]">Agencia / Sucursal</th>
                <th className="py-3.5 px-4 min-w-[160px]">Supervisor Directo</th>
                <th className="py-3.5 px-4 text-center min-w-[110px]">Último Acceso</th>
                <th className="py-3.5 px-4 text-center min-w-[90px]">Estado</th>
                <th className="py-3.5 px-4 text-right min-w-[140px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 space-y-2">
                    <Users size={36} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">No se encontraron usuarios</p>
                    <p className="text-[11px] text-slate-400">Intenta modificando el término de búsqueda o limpiando los filtros.</p>
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
                currentUsuarios.map((u, idx) => {
                  const itemNumber = startIndex + idx + 1;
                  const isActive = u.status === 'Activo';
                  const agencyDisplayName = u.agency_name 
                    ? u.agency_name 
                    : u.agency_id 
                      ? `Agencia #${u.agency_id}` 
                      : 'Corporativo / Central';

                  return (
                    <tr 
                      key={u.id} 
                      className="hover:bg-slate-50/75 transition-colors group"
                    >
                      {/* Row Index */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 text-[11px]">
                        {itemNumber}
                      </td>

                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isActive 
                              ? 'bg-rose-50 text-[#E11D48] border border-rose-100' 
                              : 'bg-slate-100 text-slate-400 border border-slate-200'
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block leading-tight">
                              {u.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                              ID: #{u.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${getRoleBadgeStyle(u.role)}`}>
                          <Shield size={11} />
                          {u.role}
                        </span>
                      </td>

                      {/* Corporate Email */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[190px]">{u.email}</span>
                        </div>
                      </td>

                      {/* Agency */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-800 text-xs block leading-tight">
                              {agencyDisplayName}
                            </span>
                            {u.agency_city && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                {u.agency_city}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Supervisor */}
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        <span className="text-xs font-semibold text-slate-800">
                          {u.supervisor || '—'}
                        </span>
                      </td>

                      {/* Last Access */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                          {u.last_access || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {u.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                            title="Editar usuario"
                          >
                            <Edit2 size={14} />
                          </button>
                          
                          <button 
                            onClick={() => onToggleStatus(u.id)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition cursor-pointer ${
                              isActive 
                                ? 'text-amber-700 hover:bg-amber-50' 
                                : 'text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'Desactivar acceso' : 'Activar acceso'}
                          >
                            {isActive ? 'Inactivar' : 'Activar'}
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
              Página <strong className="text-slate-800 font-bold">{effectivePage}</strong> de <strong className="text-slate-800 font-bold">{totalPages}</strong> • Mostrando {startIndex + 1} a {endIndex} de {totalItems} {totalItems === 1 ? 'usuario' : 'usuarios'} (15 por página)
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

      {/* 6. Create / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-[#E11D48]">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingUser ? `Modificar credenciales de #${editingUser.id}` : 'Registrar nuevo miembro en el equipo'}
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
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Andrea Salazar Moncayo"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#E11D48]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Corporativo *
                </label>
                <input
                  type="email"
                  required
                  placeholder="usuario@grupoterrenos.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#E11D48]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rol de Sistema *
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#E11D48]"
                  >
                    {AVAILABLE_ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Estado Operativo
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#E11D48]"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Agencia Asignada
                </label>
                <select
                  value={formAgencyId}
                  onChange={(e) => handleAgencyChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-1 focus:ring-[#E11D48]"
                >
                  <option value="">Corporativo / Sin agencia específica</option>
                  {agencyList.map(ag => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} ({ag.city}){ag.manager ? ` — Jefe: ${ag.manager}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Supervisor Directo
                  </label>
                  {currentAgencyManager ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      Jefe de Agencia
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400">
                      Sin jefe asignado
                    </span>
                  )}
                </div>

                <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {formSupervisor && formSupervisor !== '—' 
                      ? formSupervisor 
                      : (currentAgencyManager || 'Sin supervisor asignado')}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                    Automático
                  </span>
                </div>

                <p className="text-slate-400 text-[10px] mt-1">
                  {currentAgencyManager 
                    ? `✓ Vinculado automáticamente a ${currentAgencyManager} (Jefe de Agencia).`
                    : 'Seleccione una agencia asignada para vincular automáticamente a su Jefe de Agencia.'}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#E11D48] hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  {isSubmitting ? 'Guardando...' : editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
