import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, Shield, Key, Users, Check, X, Search, 
  RotateCcw, Save, Plus, Trash2, Copy, Sparkles, AlertTriangle,
  Building2, CheckCircle2, ChevronRight, Eye, Layers, Filter,
  Sliders, ArrowRight, Info, CheckCheck, RefreshCw, BarChart3,
  TrendingUp, Wallet, FileText, Calendar, Settings, Lock,
  UserCheck, UserPlus, UserX, Star, HelpCircle, Tag
} from 'lucide-react';
import { RoleDefinition, PermissionDefinition, UserGroupDefinition, UserPermissionOverride } from '../types';

interface RolesPermisosViewProps {
  currentUser?: any;
  userRole?: string;
}

interface CategoryMeta {
  id: string;
  name: string;
  description: string;
  icon: any;
  color: string;
  bgLight: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: 'comercial',
    name: 'Gestión Comercial & Pipeline de Leads',
    description: 'Prospección, captura de leads, embudo kanban y ficha de cliente 360',
    icon: TrendingUp,
    color: 'text-blue-600',
    bgLight: 'bg-blue-50/60 border-blue-200/80'
  },
  {
    id: 'operaciones',
    name: 'Operaciones de Campo, Agenda & Terrenos',
    description: 'Agendamiento de visitas guiadas, retroalimentación e inventario de lotes',
    icon: Calendar,
    color: 'text-emerald-600',
    bgLight: 'bg-emerald-50/60 border-emerald-200/80'
  },
  {
    id: 'ventas',
    name: 'Cotizador, Proformas & Ventas Cerradas',
    description: 'Simulador financiero, historial de cotizaciones, actas y formalización de contratos',
    icon: FileText,
    color: 'text-rose-600',
    bgLight: 'bg-rose-50/60 border-rose-200/80'
  },
  {
    id: 'finanzas',
    name: 'Reportes Gerenciales, Recaudación & Cartera Vencida',
    description: 'Indicadores comerciales ejecutivos (8 KPIs), recaudación líquida y gestión de cobranza',
    icon: Wallet,
    color: 'text-teal-600',
    bgLight: 'bg-teal-50/60 border-teal-200/80'
  },
  {
    id: 'administracion',
    name: 'Administración, Seguridad & Auditoría',
    description: 'Control de agencias, usuarios, trazabilidad de eventos y automatización n8n',
    icon: Settings,
    color: 'text-purple-600',
    bgLight: 'bg-purple-50/60 border-purple-200/80'
  }
];

export default function RolesPermisosView({ currentUser, userRole }: RolesPermisosViewProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Main Entities
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [groups, setGroups] = useState<UserGroupDefinition[]>([]);
  const [userOverrides, setUserOverrides] = useState<Record<string, UserPermissionOverride>>({});
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Navigation mode: 'roles' | 'groups' | 'users' | 'matrix'
  const [activeTab, setActiveTab] = useState<'roles' | 'groups' | 'users' | 'matrix'>('roles');

  // Selected State
  const [activeRoleId, setActiveRoleId] = useState<string>('ceo');
  const [activeGroupId, setActiveGroupId] = useState<string>('grupo_ventas_sierra');
  const [activeUserId, setActiveUserId] = useState<number>(3); // Default Andrea Cedeño

  // Matrix sub-view
  const [matrixTarget, setMatrixTarget] = useState<'roles' | 'groups' | 'users'>('roles');

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userAgencyFilter, setUserAgencyFilter] = useState('all');

  // Modals
  const [showRoleUsersModal, setShowRoleUsersModal] = useState(false);
  const [showGroupMembersModal, setShowGroupMembersModal] = useState(false);
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showUserGroupsModal, setShowUserGroupsModal] = useState(false);

  // Form states: New Role
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleLabel, setNewRoleLabel] = useState('');
  const [newRoleDescription, setNewRoleDescription] = useState('');
  const [cloneFromRoleId, setCloneFromRoleId] = useState('asesor_comercial');

  // Form states: New Group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('bg-blue-100 text-blue-800 border-blue-200');
  const [newGroupInitialMembers, setNewGroupInitialMembers] = useState<number[]>([]);

  // Fetch initial data
  const fetchRolesData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/roles-permisos');
      const data = await res.json();
      if (data.success) {
        setRoles(data.roles || []);
        setGroups(data.groups || []);
        setUserOverrides(data.userOverrides || {});
        setPermissions(data.permissions || []);
        setUsers(data.users || []);

        if (data.roles?.length > 0 && !data.roles.some((r: any) => r.id === activeRoleId)) {
          setActiveRoleId(data.roles[0].id);
        }
        if (data.groups?.length > 0 && !data.groups.some((g: any) => g.id === activeGroupId)) {
          setActiveGroupId(data.groups[0].id);
        }
        if (data.users?.length > 0 && !data.users.some((u: any) => u.id === activeUserId)) {
          setActiveUserId(data.users[0].id);
        }
      }
    } catch (err) {
      console.error('Error cargando roles y permisos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRolesData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Selected entities
  const activeRole = useMemo(() => {
    return roles.find(r => r.id === activeRoleId) || roles[0];
  }, [roles, activeRoleId]);

  const activeGroup = useMemo(() => {
    return groups.find(g => g.id === activeGroupId) || groups[0];
  }, [groups, activeGroupId]);

  const activeUser = useMemo(() => {
    return users.find(u => u.id === activeUserId) || users[0];
  }, [users, activeUserId]);

  // Role users
  const assignedRoleUsers = useMemo(() => {
    if (!activeRole) return [];
    return users.filter(u => u.role?.toLowerCase() === activeRole.name?.toLowerCase());
  }, [users, activeRole]);

  // Group users
  const assignedGroupUsers = useMemo(() => {
    if (!activeGroup) return [];
    const memberIds = activeGroup.userIds || [];
    return users.filter(u => memberIds.includes(u.id));
  }, [users, activeGroup]);

  // Groups that the active user belongs to
  const userGroups = useMemo(() => {
    if (!activeUser) return [];
    return groups.filter(g => (g.userIds || []).includes(activeUser.id));
  }, [groups, activeUser]);

  // User effective permissions calculator
  const userEffectivePermissions = useMemo(() => {
    if (!activeUser) return { effective: new Set<string>(), origins: new Map<string, string>() };

    const effective = new Set<string>();
    const origins = new Map<string, string>(); // permissionId -> 'role' | 'group:GroupName' | 'custom' | 'denied'

    // 1. Inherited from Base Role
    const userRoleObj = roles.find(r => r.name.toLowerCase() === (activeUser.role || '').toLowerCase());
    if (userRoleObj) {
      userRoleObj.permissions.forEach(pId => {
        effective.add(pId);
        origins.set(pId, `Rol (${userRoleObj.label})`);
      });
    }

    // 2. Inherited from Groups
    userGroups.forEach(g => {
      (g.permissions || []).forEach(pId => {
        effective.add(pId);
        if (!origins.has(pId)) {
          origins.set(pId, `Grupo: ${g.name}`);
        } else {
          origins.set(pId, `${origins.get(pId)} + Grupo: ${g.name}`);
        }
      });
    });

    // 3. User Overrides (Direct Exceptions & Denials)
    const override = userOverrides[String(activeUser.id)];
    if (override) {
      // Explicit denials
      (override.deniedPermissions || []).forEach(pId => {
        effective.delete(pId);
        origins.set(pId, 'Revocado Expresamente');
      });
      // Explicit grants
      (override.customPermissions || []).forEach(pId => {
        effective.add(pId);
        origins.set(pId, 'Excepción Directa');
      });
    }

    return { effective, origins };
  }, [activeUser, roles, userGroups, userOverrides]);

  // -------------------------------------------------------------
  // HANDLERS: ROLES
  // -------------------------------------------------------------
  const handleToggleRolePermission = (permId: string) => {
    if (!activeRole) return;
    setRoles(prev => prev.map(r => {
      if (r.id !== activeRole.id) return r;
      const exists = r.permissions.includes(permId);
      const next = exists ? r.permissions.filter(p => p !== permId) : [...r.permissions, permId];
      return { ...r, permissions: next };
    }));
    setHasUnsavedChanges(true);
  };

  const handleRoleSelectAll = () => {
    if (!activeRole) return;
    const allIds = permissions.map(p => p.id);
    setRoles(prev => prev.map(r => r.id === activeRole.id ? { ...r, permissions: allIds } : r));
    setHasUnsavedChanges(true);
    showToast(`Todos los permisos asignados a ${activeRole.label}`);
  };

  const handleRoleDeselectAll = () => {
    if (!activeRole) return;
    setRoles(prev => prev.map(r => r.id === activeRole.id ? { ...r, permissions: [] } : r));
    setHasUnsavedChanges(true);
    showToast(`Todos los permisos removidos de ${activeRole.label}`);
  };

  const handleToggleRoleCategory = (catKey: string) => {
    if (!activeRole) return;
    const catIds = permissions.filter(p => p.category === catKey).map(p => p.id);
    const activeInCat = catIds.filter(id => activeRole.permissions.includes(id));
    const allEnabled = activeInCat.length === catIds.length;

    setRoles(prev => prev.map(r => {
      if (r.id !== activeRole.id) return r;
      const next = allEnabled
        ? r.permissions.filter(id => !catIds.includes(id))
        : [...r.permissions, ...catIds.filter(id => !r.permissions.includes(id))];
      return { ...r, permissions: next };
    }));
    setHasUnsavedChanges(true);
  };

  // -------------------------------------------------------------
  // HANDLERS: USER GROUPS
  // -------------------------------------------------------------
  const handleToggleGroupPermission = (permId: string) => {
    if (!activeGroup) return;
    setGroups(prev => prev.map(g => {
      if (g.id !== activeGroup.id) return g;
      const exists = g.permissions.includes(permId);
      const next = exists ? g.permissions.filter(p => p !== permId) : [...g.permissions, permId];
      return { ...g, permissions: next };
    }));
    setHasUnsavedChanges(true);
  };

  const handleGroupSelectAll = () => {
    if (!activeGroup) return;
    const allIds = permissions.map(p => p.id);
    setGroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, permissions: allIds } : g));
    setHasUnsavedChanges(true);
    showToast(`Todos los permisos asignados al grupo "${activeGroup.name}"`);
  };

  const handleGroupDeselectAll = () => {
    if (!activeGroup) return;
    setGroups(prev => prev.map(g => g.id === activeGroup.id ? { ...g, permissions: [] } : g));
    setHasUnsavedChanges(true);
    showToast(`Todos los permisos removidos del grupo "${activeGroup.name}"`);
  };

  const handleToggleGroupCategory = (catKey: string) => {
    if (!activeGroup) return;
    const catIds = permissions.filter(p => p.category === catKey).map(p => p.id);
    const activeInCat = catIds.filter(id => activeGroup.permissions.includes(id));
    const allEnabled = activeInCat.length === catIds.length;

    setGroups(prev => prev.map(g => {
      if (g.id !== activeGroup.id) return g;
      const next = allEnabled
        ? g.permissions.filter(id => !catIds.includes(id))
        : [...g.permissions, ...catIds.filter(id => !g.permissions.includes(id))];
      return { ...g, permissions: next };
    }));
    setHasUnsavedChanges(true);
  };

  const handleToggleGroupMember = (userId: number) => {
    if (!activeGroup) return;
    setGroups(prev => prev.map(g => {
      if (g.id !== activeGroup.id) return g;
      const exists = (g.userIds || []).includes(userId);
      const next = exists 
        ? g.userIds.filter(id => id !== userId)
        : [...(g.userIds || []), userId];
      return { ...g, userIds: next, memberCount: next.length };
    }));
    setHasUnsavedChanges(true);
  };

  const handleDeleteGroup = (groupToDelete: UserGroupDefinition) => {
    if (groupToDelete.isSystem) {
      alert('Los grupos de sistema corporativos no pueden eliminarse.');
      return;
    }
    if (!window.confirm(`¿Deseas eliminar el grupo de usuarios "${groupToDelete.name}"?`)) return;

    const filtered = groups.filter(g => g.id !== groupToDelete.id);
    setGroups(filtered);
    setActiveGroupId(filtered[0]?.id || 'grupo_ventas_sierra');
    setHasUnsavedChanges(true);
    showToast(`Grupo "${groupToDelete.name}" eliminado.`);
  };

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      alert('Por favor especifica un nombre para el grupo.');
      return;
    }
    const cleanId = 'grupo_' + newGroupName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (groups.some(g => g.id === cleanId || g.name.toLowerCase() === newGroupName.trim().toLowerCase())) {
      alert('Ya existe un grupo con este nombre.');
      return;
    }

    const newGroup: UserGroupDefinition = {
      id: cleanId,
      name: newGroupName.trim(),
      description: newGroupDescription.trim() || `Equipo de trabajo para ${newGroupName.trim()}`,
      badgeColor: newGroupColor,
      isSystem: false,
      userIds: [...newGroupInitialMembers],
      permissions: ['leads.view_assigned', 'leads.create', 'agenda.manage', 'terrenos.inventory'],
      createdAt: new Date().toLocaleDateString('es-EC')
    };

    const updated = [...groups, newGroup];
    setGroups(updated);
    setActiveGroupId(newGroup.id);
    setShowNewGroupModal(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setNewGroupInitialMembers([]);
    setHasUnsavedChanges(true);
    showToast(`Grupo "${newGroup.name}" creado con éxito.`);
  };

  // -------------------------------------------------------------
  // HANDLERS: INDIVIDUAL USER OVERRIDES & EXCEPTIONS
  // -------------------------------------------------------------
  const handleToggleUserPermission = (permId: string) => {
    if (!activeUser) return;
    const uKey = String(activeUser.id);
    const currOverride = userOverrides[uKey] || { userId: activeUser.id, customPermissions: [], deniedPermissions: [] };

    const isCurrentlyEffective = userEffectivePermissions.effective.has(permId);
    let nextCustom = [...(currOverride.customPermissions || [])];
    let nextDenied = [...(currOverride.deniedPermissions || [])];

    if (isCurrentlyEffective) {
      // User currently has it -> revoke it (deny)
      nextCustom = nextCustom.filter(id => id !== permId);
      if (!nextDenied.includes(permId)) {
        nextDenied.push(permId);
      }
    } else {
      // User does not have it -> grant it (exception)
      nextDenied = nextDenied.filter(id => id !== permId);
      if (!nextCustom.includes(permId)) {
        nextCustom.push(permId);
      }
    }

    setUserOverrides(prev => ({
      ...prev,
      [uKey]: {
        userId: activeUser.id,
        customPermissions: nextCustom,
        deniedPermissions: nextDenied,
        notes: currOverride.notes
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleResetUserToInherited = (permId?: string) => {
    if (!activeUser) return;
    const uKey = String(activeUser.id);
    const currOverride = userOverrides[uKey];
    if (!currOverride) return;

    if (permId) {
      // Reset single permission
      setUserOverrides(prev => ({
        ...prev,
        [uKey]: {
          ...currOverride,
          customPermissions: (currOverride.customPermissions || []).filter(id => id !== permId),
          deniedPermissions: (currOverride.deniedPermissions || []).filter(id => id !== permId)
        }
      }));
      showToast('Permiso restablecido a la herencia automática de rol y grupo.');
    } else {
      // Reset ALL permissions for this user
      const nextOverrides = { ...userOverrides };
      delete nextOverrides[uKey];
      setUserOverrides(nextOverrides);
      showToast(`Excepciones de ${activeUser.name} eliminadas. Permisos sincronizados con rol y grupos.`);
    }
    setHasUnsavedChanges(true);
  };

  const handleGrantAllToUser = () => {
    if (!activeUser) return;
    const uKey = String(activeUser.id);
    const allIds = permissions.map(p => p.id);
    setUserOverrides(prev => ({
      ...prev,
      [uKey]: {
        userId: activeUser.id,
        customPermissions: allIds,
        deniedPermissions: [],
        notes: 'Acceso total concedido por excepción'
      }
    }));
    setHasUnsavedChanges(true);
    showToast(`Acceso total concedido a ${activeUser.name}`);
  };

  const handleToggleUserGroupMembership = (groupId: string) => {
    if (!activeUser) return;
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const exists = (g.userIds || []).includes(activeUser.id);
      const next = exists 
        ? g.userIds.filter(id => id !== activeUser.id)
        : [...(g.userIds || []), activeUser.id];
      return { ...g, userIds: next, memberCount: next.length };
    }));
    setHasUnsavedChanges(true);
  };

  // Copy permissions between users
  const handleCopyFromOtherUser = (sourceUserId: number) => {
    const sourceOverride = userOverrides[String(sourceUserId)];
    const targetKey = String(activeUser.id);
    if (!sourceOverride) {
      const nextOverrides = { ...userOverrides };
      delete nextOverrides[targetKey];
      setUserOverrides(nextOverrides);
    } else {
      setUserOverrides(prev => ({
        ...prev,
        [targetKey]: {
          userId: activeUser.id,
          customPermissions: [...(sourceOverride.customPermissions || [])],
          deniedPermissions: [...(sourceOverride.deniedPermissions || [])],
          notes: `Copiado de usuario #${sourceUserId}`
        }
      }));
    }
    setHasUnsavedChanges(true);
    showToast(`Excepciones copiadas al usuario ${activeUser.name}`);
  };

  // -------------------------------------------------------------
  // SAVE & FACTORY RESET
  // -------------------------------------------------------------
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/roles-permisos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles,
          groups,
          userOverrides,
          updatedBy: currentUser?.name || 'Administrador'
        })
      });
      const data = await res.json();
      if (data.success) {
        setHasUnsavedChanges(false);
        showToast('¡Configuración de roles, grupos y usuarios guardada con éxito!');
      } else {
        alert('Error al guardar: ' + data.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error en la comunicación con el servidor');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToFactory = async () => {
    if (!window.confirm('¿Deseas restablecer todos los roles, grupos de usuarios y excepciones individuales a los valores de fábrica?')) {
      return;
    }
    try {
      setResetting(true);
      const res = await fetch('/api/roles-permisos/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updatedBy: currentUser?.name || 'Administrador'
        })
      });
      const data = await res.json();
      if (data.success) {
        setRoles(data.roles || []);
        setGroups(data.groups || []);
        setUserOverrides(data.userOverrides || {});
        setHasUnsavedChanges(false);
        showToast('Configuración corporativa restablecida a valores estándar.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  // Filtered permissions list
  const filteredPermissions = useMemo(() => {
    return permissions.filter(p => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return p.name.toLowerCase().includes(q) || 
               p.description.toLowerCase().includes(q) || 
               p.id.toLowerCase().includes(q);
      }
      return true;
    });
  }, [permissions, categoryFilter, searchQuery]);

  const groupedPermissions = useMemo(() => {
    const map: Record<string, PermissionDefinition[]> = {};
    filteredPermissions.forEach(p => {
      if (!map[p.category]) map[p.category] = [];
      map[p.category].push(p);
    });
    return map;
  }, [filteredPermissions]);

  // Filtered users for user picker
  const filteredUsersList = useMemo(() => {
    return users.filter(u => {
      if (userAgencyFilter !== 'all' && u.agency_name !== userAgencyFilter) return false;
      if (userSearchQuery.trim()) {
        const q = userSearchQuery.toLowerCase();
        return u.name.toLowerCase().includes(q) || 
               u.email.toLowerCase().includes(q) || 
               (u.role || '').toLowerCase().includes(q) ||
               (u.agency_name || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [users, userAgencyFilter, userSearchQuery]);

  const uniqueAgencies = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => {
      if (u.agency_name) set.add(u.agency_name);
    });
    return Array.from(set);
  }, [users]);

  if (loading && roles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E11D48]" />
        <p className="text-sm font-medium text-slate-500">Cargando matriz de seguridad, grupos y usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 border border-slate-700 animate-in fade-in slide-in-from-bottom-2 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER WITH ACTIONS */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 font-display flex items-center gap-2.5">
                <span>Roles, Grupos y Permisos por Usuario</span>
                {hasUnsavedChanges && (
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                    Cambios sin guardar
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Gestiona la seguridad y accesos a nivel de Roles (Perfiles), Grupos de Usuarios (Equipos) o Excepciones Directas por Colaborador
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleResetToFactory}
            disabled={resetting}
            title="Restablecer valores predeterminados corporativos"
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>Restablecer Fábrica</span>
          </button>

          <button
            onClick={handleSaveChanges}
            disabled={saving || !hasUnsavedChanges}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition shadow-xs cursor-pointer ${
              hasUnsavedChanges
                ? 'bg-[#E11D48] hover:bg-rose-700 text-white shadow-rose-200/50 ring-2 ring-[#E11D48]/30 animate-pulse'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Guardando...' : 'Guardar Todo'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TOP NAVIGATION SEGMENTS: [POR ROL] | [POR GRUPO] | [POR USUARIO] | [MATRIZ] */}
      {/* ========================================================================= */}
      <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 max-w-2xl">
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'roles'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-rose-500" />
          <span>Por Roles ({roles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'groups'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-blue-500" />
          <span>Por Grupos de Usuarios ({groups.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Por Usuario Individual ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'matrix'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-purple-500" />
          <span>Matriz Global</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: POR ROLES (PERFILES BASE) */}
      {/* ========================================================================= */}
      {activeTab === 'roles' && (
        <div className="space-y-5">
          {/* Role Picker Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Seleccionar Perfil / Rol:</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowNewRoleModal(true)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Nuevo Rol</span>
                </button>

                {activeRole && (
                  <button
                    onClick={() => setShowRoleUsersModal(true)}
                    className="text-xs font-semibold text-slate-600 hover:text-rose-600 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{assignedRoleUsers.length} usuario(s) asignados</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Role Tabs */}
            <div className="flex flex-wrap gap-2">
              {roles.map(r => {
                const isActive = r.id === activeRoleId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRoleId(r.id)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <Shield className={`w-3.5 h-3.5 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                    <span>{r.label}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {r.permissions.length}/{permissions.length}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Role Meta Card */}
            {activeRole && (
              <div className="pt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/70">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{activeRole.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeRole.badgeColor}`}>
                      {activeRole.isSystem ? 'Rol Base de Sistema' : 'Rol Personalizado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    {activeRole.description}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleRoleSelectAll}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-700 text-xs font-semibold rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Marcar Todo ({permissions.length})</span>
                  </button>

                  <button
                    onClick={handleRoleDeselectAll}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-700 text-slate-700 text-xs font-semibold rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500" />
                    <span>Desmarcar Todo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar permiso (ej: cartera, ventas, agenda)..."
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg pl-8 pr-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#E11D48] transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({permissions.length})
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    categoryFilter === c.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name.split('&')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Categorized Permissions Grid */}
          <div className="space-y-5">
            {CATEGORIES.map(category => {
              const categoryPerms = groupedPermissions[category.id] || [];
              if (categoryPerms.length === 0) return null;

              const activeInCategory = categoryPerms.filter(p => activeRole?.permissions.includes(p.id)).length;
              const isAllCategoryActive = activeInCategory === categoryPerms.length;
              const CategoryIcon = category.icon;

              return (
                <div key={category.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className={`p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${category.bgLight}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs ${category.color}`}>
                        <CategoryIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 font-display">{category.name}</h3>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-700 border border-slate-200">
                            {activeInCategory} de {categoryPerms.length} activos
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{category.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleRoleCategory(category.id)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg transition shadow-2xs flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
                    >
                      {isAllCategoryActive ? <X className="w-3.5 h-3.5 text-rose-500" /> : <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>{isAllCategoryActive ? 'Desactivar Módulo' : 'Activar Todo el Módulo'}</span>
                    </button>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryPerms.map(perm => {
                      const isEnabled = activeRole?.permissions.includes(perm.id) || false;
                      return (
                        <div
                          key={perm.id}
                          onClick={() => handleToggleRolePermission(perm.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                            isEnabled
                              ? 'bg-slate-50/70 border-slate-300'
                              : 'bg-white border-slate-200/80 opacity-75'
                          }`}
                        >
                          <div className="space-y-1 pr-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isEnabled ? 'text-slate-900' : 'text-slate-600'}`}>{perm.name}</span>
                              {perm.isNew && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                                  Nueva función
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{perm.description}</p>
                            <span className="text-[10px] font-mono text-slate-400 block pt-0.5">ID: {perm.id}</span>
                          </div>

                          <div className="pt-0.5 shrink-0">
                            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${isEnabled ? 'bg-[#E11D48]' : 'bg-slate-300'}`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: POR GRUPOS DE USUARIOS (EQUIPOS & DEPARTAMENTOS) */}
      {/* ========================================================================= */}
      {activeTab === 'groups' && (
        <div className="space-y-5">
          {/* Group Picker Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Seleccionar Grupo de Usuarios:</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowNewGroupModal(true)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Nuevo Grupo</span>
                </button>

                {activeGroup && (
                  <button
                    onClick={() => setShowGroupMembersModal(true)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Administrar Miembros ({assignedGroupUsers.length})</span>
                    <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Group Tabs */}
            <div className="flex flex-wrap gap-2">
              {groups.map(g => {
                const isActive = g.id === activeGroupId;
                const memberCount = (g.userIds || []).length;
                return (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroupId(g.id)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <Users className={`w-3.5 h-3.5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                    <span>{g.name}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {memberCount} miembros • {g.permissions.length} perms
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Group Meta Card */}
            {activeGroup && (
              <div className="pt-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/70">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{activeGroup.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeGroup.badgeColor}`}>
                      {activeGroup.isSystem ? 'Grupo de Sistema' : 'Grupo Personalizado'}
                    </span>
                    {!activeGroup.isSystem && (
                      <button
                        onClick={() => handleDeleteGroup(activeGroup)}
                        className="text-xs text-rose-600 hover:text-rose-800 p-1 rounded transition"
                        title="Eliminar este grupo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                    {activeGroup.description}
                  </p>

                  {/* Members badges quick view */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[11px] font-bold text-slate-400 mr-1">Colaboradores en este grupo:</span>
                    {assignedGroupUsers.length === 0 ? (
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Sin miembros asignados
                      </span>
                    ) : (
                      assignedGroupUsers.map(u => (
                        <span key={u.id} className="text-[10px] font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                          {u.name} ({u.role})
                        </span>
                      ))
                    )}
                    <button
                      onClick={() => setShowGroupMembersModal(true)}
                      className="text-[10px] font-bold text-blue-600 hover:underline ml-1"
                    >
                      + Gestionar
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={handleGroupSelectAll}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-700 text-xs font-semibold rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Marcar Todo ({permissions.length})</span>
                  </button>

                  <button
                    onClick={handleGroupDeselectAll}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-rose-300 hover:text-rose-700 text-slate-700 text-xs font-semibold rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 text-rose-500" />
                    <span>Desmarcar Todo</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar permiso para el grupo..."
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg pl-8 pr-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({permissions.length})
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    categoryFilter === c.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name.split('&')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Group Permissions Cards */}
          <div className="space-y-5">
            {CATEGORIES.map(category => {
              const categoryPerms = groupedPermissions[category.id] || [];
              if (categoryPerms.length === 0) return null;

              const activeInCategory = categoryPerms.filter(p => activeGroup?.permissions.includes(p.id)).length;
              const isAllCategoryActive = activeInCategory === categoryPerms.length;
              const CategoryIcon = category.icon;

              return (
                <div key={category.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className={`p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${category.bgLight}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs ${category.color}`}>
                        <CategoryIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 font-display">{category.name}</h3>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-slate-700 border border-slate-200">
                            {activeInCategory} de {categoryPerms.length} activos para el grupo
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{category.description}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleGroupCategory(category.id)}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg transition shadow-2xs flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer"
                    >
                      {isAllCategoryActive ? <X className="w-3.5 h-3.5 text-rose-500" /> : <CheckCheck className="w-3.5 h-3.5 text-blue-600" />}
                      <span>{isAllCategoryActive ? 'Desactivar Módulo' : 'Activar Todo el Módulo'}</span>
                    </button>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryPerms.map(perm => {
                      const isEnabled = activeGroup?.permissions.includes(perm.id) || false;
                      return (
                        <div
                          key={perm.id}
                          onClick={() => handleToggleGroupPermission(perm.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                            isEnabled ? 'bg-blue-50/40 border-blue-200' : 'bg-white border-slate-200/80 opacity-75'
                          }`}
                        >
                          <div className="space-y-1 pr-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${isEnabled ? 'text-slate-900' : 'text-slate-600'}`}>{perm.name}</span>
                              {perm.isNew && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                                  Nueva función
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 leading-snug">{perm.description}</p>
                            <span className="text-[10px] font-mono text-slate-400 block pt-0.5">ID: {perm.id}</span>
                          </div>

                          <div className="pt-0.5 shrink-0">
                            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${isEnabled ? 'bg-blue-600' : 'bg-slate-300'}`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POR USUARIO INDIVIDUAL (GESTIÓN Y EXCEPCIONES DIRECTAS) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="space-y-5">
          {/* User Selection Drawer / Horizontal Cards */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Seleccionar Colaborador para Administrar:</span>
                <p className="text-xs text-slate-400">Verifica permisos heredados de su rol/grupos y aplica excepciones personalizadas</p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={userAgencyFilter}
                  onChange={(e) => setUserAgencyFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none"
                >
                  <option value="all">Todas las agencias</option>
                  {uniqueAgencies.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Buscar asesor..."
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg pl-7 pr-2.5 py-1.5 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Users Horizontal Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {filteredUsersList.map(u => {
                const isSelected = u.id === activeUserId;
                const override = userOverrides[String(u.id)];
                const hasExceptions = override && ((override.customPermissions?.length || 0) > 0 || (override.deniedPermissions?.length || 0) > 0);

                return (
                  <div
                    key={u.id}
                    onClick={() => setActiveUserId(u.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/80 text-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="font-bold text-xs truncate">{u.name}</div>
                      {hasExceptions && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          isSelected ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          ⭐ Excepción
                        </span>
                      )}
                    </div>
                    <div className={`text-[11px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {u.email}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-white border border-slate-200 text-slate-700'
                      }`}>
                        {u.role || 'Asesor'}
                      </span>
                      <span className={`text-[10px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                        {u.agency_name || 'Corporativo'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active User Detailed Inspector Card */}
            {activeUser && (
              <div className="pt-3 border-t border-slate-100 bg-slate-50/70 rounded-xl p-4 border border-slate-200/70 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900">{activeUser.name}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {activeUser.email}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Rol: {activeUser.role}
                      </span>
                      <span className="text-xs text-slate-500">
                        Sede: {activeUser.agency_name || 'Corporativo'}
                      </span>
                    </div>

                    {/* Group memberships */}
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      <span className="text-xs font-bold text-slate-600">Grupos a los que pertenece:</span>
                      {userGroups.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No pertenece a ningún grupo especial</span>
                      ) : (
                        userGroups.map(g => (
                          <span key={g.id} className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${g.badgeColor}`}>
                            {g.name}
                          </span>
                        ))
                      )}
                      <button
                        onClick={() => setShowUserGroupsModal(true)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer ml-1"
                      >
                        Modificar Grupos
                      </button>
                    </div>
                  </div>

                  {/* Effective count & Reset overrides button */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 shadow-2xs">
                      Permisos Efectivos: <span className="text-rose-600 font-black">{userEffectivePermissions.effective.size}</span> / {permissions.length}
                    </div>

                    {userOverrides[String(activeUser.id)] && (
                      <button
                        onClick={() => handleResetUserToInherited()}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                        title="Eliminar excepciones y volver a los permisos de rol y grupo"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restablecer a Herencia</span>
                      </button>
                    )}

                    <button
                      onClick={handleGrantAllToUser}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-700 text-slate-700 text-xs font-semibold rounded-lg transition shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Conceder Todos</span>
                    </button>
                  </div>
                </div>

                {/* Legend explaining origins */}
                <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-200/50 flex-wrap">
                  <span className="font-bold text-slate-700">Guía de Origen del Permiso:</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Heredado por Rol
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Heredado por Grupo
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Excepción Directa
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Revocado Expresamente
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Search Perms for this user */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar permisos para este usuario..."
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-lg pl-8 pr-3 py-2 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  categoryFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos ({permissions.length})
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    categoryFilter === c.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name.split('&')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* User Permissions List with Inherited Origins & Overrides */}
          <div className="space-y-5">
            {CATEGORIES.map(category => {
              const categoryPerms = groupedPermissions[category.id] || [];
              if (categoryPerms.length === 0) return null;

              const CategoryIcon = category.icon;

              return (
                <div key={category.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className={`p-4 border-b border-slate-200 flex items-center justify-between gap-3 ${category.bgLight}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-2xs ${category.color}`}>
                        <CategoryIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 font-display">{category.name}</h3>
                        <p className="text-xs text-slate-500">{category.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryPerms.map(perm => {
                      const isEffective = userEffectivePermissions.effective.has(perm.id);
                      const origin = userEffectivePermissions.origins.get(perm.id);

                      // Check if user has explicit override
                      const uOverride = userOverrides[String(activeUser?.id)];
                      const isCustomGranted = uOverride?.customPermissions?.includes(perm.id);
                      const isExplicitlyDenied = uOverride?.deniedPermissions?.includes(perm.id);

                      return (
                        <div
                          key={perm.id}
                          className={`p-3.5 rounded-xl border transition-all select-none flex items-start justify-between gap-3 ${
                            isEffective
                              ? isCustomGranted
                                ? 'bg-purple-50/50 border-purple-200'
                                : 'bg-slate-50/70 border-slate-300'
                              : isExplicitlyDenied
                              ? 'bg-rose-50/50 border-rose-200'
                              : 'bg-white border-slate-200/80 opacity-70'
                          }`}
                        >
                          <div className="space-y-1 pr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-bold ${isEffective ? 'text-slate-900' : 'text-slate-600'}`}>{perm.name}</span>
                              
                              {/* Origin Badge */}
                              {isCustomGranted && (
                                <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.2 rounded-full border border-purple-200">
                                  ⭐ Excepción Concedida
                                </span>
                              )}
                              {isExplicitlyDenied && (
                                <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.2 rounded-full border border-rose-200">
                                  🚫 Revocado Directamente
                                </span>
                              )}
                              {!isCustomGranted && !isExplicitlyDenied && isEffective && (
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.2 rounded-full border border-emerald-200">
                                  {origin || 'Heredado'}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-500 leading-snug">{perm.description}</p>
                            
                            {(isCustomGranted || isExplicitlyDenied) && (
                              <button
                                onClick={() => handleResetUserToInherited(perm.id)}
                                className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline pt-0.5 inline-block cursor-pointer"
                              >
                                Revertir a herencia automática
                              </button>
                            )}
                          </div>

                          <div className="pt-0.5 shrink-0 flex flex-col items-end gap-1">
                            <div
                              onClick={() => handleToggleUserPermission(perm.id)}
                              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                                isEffective 
                                  ? isCustomGranted 
                                    ? 'bg-purple-600' 
                                    : 'bg-emerald-600' 
                                  : 'bg-slate-300'
                              }`}
                              title={isEffective ? 'Clic para revocar a este usuario' : 'Clic para conceder excepción a este usuario'}
                            >
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isEffective ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MATRIZ GLOBAL COMPARATIVA */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-3">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/60">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Matriz Comparativa Global
              </h3>
              <p className="text-xs text-slate-500">
                Visualiza y conmuta permisos de forma simultánea
              </p>
            </div>

            {/* Matrix target selector */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
              <button
                onClick={() => setMatrixTarget('roles')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  matrixTarget === 'roles' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Roles ({roles.length})
              </button>
              <button
                onClick={() => setMatrixTarget('groups')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  matrixTarget === 'groups' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Grupos ({groups.length})
              </button>
              <button
                onClick={() => setMatrixTarget('users')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                  matrixTarget === 'users' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Usuarios ({users.length})
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3.5 px-4 min-w-[280px]">Función / Permiso del Sistema</th>
                  <th className="py-3.5 px-3 w-28">Módulo</th>

                  {matrixTarget === 'roles' && roles.map(r => (
                    <th key={r.id} className="py-3.5 px-3 text-center min-w-[110px]">
                      <div className="font-bold text-slate-900">{r.label}</div>
                      <div className="text-[10px] font-normal text-slate-500">{r.permissions.length} perms</div>
                    </th>
                  ))}

                  {matrixTarget === 'groups' && groups.map(g => (
                    <th key={g.id} className="py-3.5 px-3 text-center min-w-[130px]">
                      <div className="font-bold text-slate-900">{g.name}</div>
                      <div className="text-[10px] font-normal text-slate-500">{(g.userIds || []).length} miembros</div>
                    </th>
                  ))}

                  {matrixTarget === 'users' && users.map(u => (
                    <th key={u.id} className="py-3.5 px-3 text-center min-w-[120px]">
                      <div className="font-bold text-slate-900 truncate max-w-[110px]">{u.name}</div>
                      <div className="text-[10px] font-normal text-slate-500">{u.role}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredPermissions.map(perm => {
                  return (
                    <tr key={perm.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{perm.name}</span>
                          {perm.isNew && (
                            <span className="text-[9px] font-black uppercase bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded">
                              Nuevo
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 leading-snug">{perm.description}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 uppercase tracking-tight">
                          {perm.category}
                        </span>
                      </td>

                      {/* ROLES CELLS */}
                      {matrixTarget === 'roles' && roles.map(role => {
                        const isAllowed = role.permissions.includes(perm.id);
                        return (
                          <td key={role.id} className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                setRoles(prev => prev.map(r => {
                                  if (r.id !== role.id) return r;
                                  const exists = r.permissions.includes(perm.id);
                                  return { ...r, permissions: exists ? r.permissions.filter(p => p !== perm.id) : [...r.permissions, perm.id] };
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition cursor-pointer ${
                                isAllowed
                                  ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-300 hover:bg-slate-200/80 border border-slate-200'
                              }`}
                            >
                              {isAllowed ? <Check className="w-4 h-4 stroke-[2.5]" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        );
                      })}

                      {/* GROUPS CELLS */}
                      {matrixTarget === 'groups' && groups.map(group => {
                        const isAllowed = group.permissions.includes(perm.id);
                        return (
                          <td key={group.id} className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                setGroups(prev => prev.map(g => {
                                  if (g.id !== group.id) return g;
                                  const exists = g.permissions.includes(perm.id);
                                  return { ...g, permissions: exists ? g.permissions.filter(p => p !== perm.id) : [...g.permissions, perm.id] };
                                }));
                                setHasUnsavedChanges(true);
                              }}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition cursor-pointer ${
                                isAllowed
                                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                                  : 'bg-slate-100 text-slate-300 hover:bg-slate-200/80 border border-slate-200'
                              }`}
                            >
                              {isAllowed ? <Check className="w-4 h-4 stroke-[2.5]" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        );
                      })}

                      {/* USERS CELLS (EFFECTIVE) */}
                      {matrixTarget === 'users' && users.map(user => {
                        // Calculate effective for this user
                        const uRole = roles.find(r => r.name.toLowerCase() === (user.role || '').toLowerCase());
                        const roleHas = uRole?.permissions.includes(perm.id) || false;
                        const uGroups = groups.filter(g => (g.userIds || []).includes(user.id));
                        const groupHas = uGroups.some(g => g.permissions.includes(perm.id));

                        const uOverride = userOverrides[String(user.id)];
                        const customHas = uOverride?.customPermissions?.includes(perm.id) || false;
                        const deniedHas = uOverride?.deniedPermissions?.includes(perm.id) || false;

                        const isEffective = (roleHas || groupHas || customHas) && !deniedHas;

                        return (
                          <td key={user.id} className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                setActiveUserId(user.id);
                                handleToggleUserPermission(perm.id);
                              }}
                              className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition cursor-pointer ${
                                isEffective
                                  ? customHas
                                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                  : deniedHas
                                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                  : 'bg-slate-100 text-slate-300 border border-slate-200'
                              }`}
                              title={`${user.name}: ${isEffective ? 'Permitido' : 'No permitido'}`}
                            >
                              {isEffective ? <Check className="w-4 h-4 stroke-[2.5]" /> : <X className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: MANAGE GROUP MEMBERS */}
      {/* ========================================================================= */}
      {showGroupMembersModal && activeGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Administrar Miembros del Grupo</h3>
                  <p className="text-xs text-slate-500">Grupo: <strong className="text-slate-800">{activeGroup.name}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setShowGroupMembersModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Marca o desmarca los colaboradores para agregarlos o retirarlos de este grupo de trabajo:
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {users.map(u => {
                const isMember = (activeGroup.userIds || []).includes(u.id);
                return (
                  <div
                    key={u.id}
                    onClick={() => handleToggleGroupMember(u.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                      isMember
                        ? 'bg-blue-50/60 border-blue-200'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500">{u.email} • {u.role} ({u.agency_name || 'Corporativo'})</div>
                    </div>

                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition ${
                      isMember ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                    }`}>
                      {isMember && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowGroupMembersModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition"
              >
                Listo ({assignedGroupUsers.length} miembros)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: USER GROUPS MEMBERSHIP (ASSIGN USER TO GROUPS) */}
      {/* ========================================================================= */}
      {showUserGroupsModal && activeUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Membresía de Grupos</h3>
                  <p className="text-xs text-slate-500">Colaborador: <strong className="text-slate-800">{activeUser.name}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setShowUserGroupsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Selecciona a qué grupos pertenece este colaborador para que herede sus permisos especiales:
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {groups.map(g => {
                const isMember = (g.userIds || []).includes(activeUser.id);
                return (
                  <div
                    key={g.id}
                    onClick={() => handleToggleUserGroupMembership(g.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                      isMember ? 'bg-blue-50/60 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{g.name}</div>
                      <div className="text-[11px] text-slate-500 leading-snug">{g.description}</div>
                    </div>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition shrink-0 ${
                      isMember ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                    }`}>
                      {isMember && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowUserGroupsModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition"
              >
                Guardar Membresías
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW GROUP */}
      {/* ========================================================================= */}
      {showNewGroupModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Crear Nuevo Grupo de Usuarios</h3>
                  <p className="text-xs text-slate-500">Agrupación para equipos de ventas o departamentos</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewGroupModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre del Grupo / Equipo</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="ej: Equipo Comercial Cuenca & Loja"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Descripción</label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Objetivo y responsabilidades del grupo..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Color de Distintivo</label>
                <div className="flex items-center gap-2">
                  {[
                    { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Azul' },
                    { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Verde' },
                    { color: 'bg-rose-100 text-rose-800 border-rose-200', label: 'Rojo' },
                    { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Ámbar' },
                    { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Púrpura' }
                  ].map(c => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() => setNewGroupColor(c.color)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${c.color} ${
                        newGroupColor === c.color ? 'ring-2 ring-slate-900' : 'opacity-70'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNewGroupModal(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
              >
                Crear Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ASSIGNED ROLE USERS LIST */}
      {/* ========================================================================= */}
      {showRoleUsersModal && activeRole && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Usuarios con este Rol</h3>
                  <p className="text-xs text-slate-500">Rol: <strong className="text-slate-800">{activeRole.label}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setShowRoleUsersModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {assignedRoleUsers.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No hay usuarios asignados a este rol actualmente.
                </div>
              ) : (
                assignedRoleUsers.map(u => (
                  <div key={u.id} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{u.name}</div>
                      <div className="text-[11px] text-slate-500">{u.email}</div>
                    </div>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600">
                      {u.agency_name || 'Corporativo'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowRoleUsersModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW ROLE */}
      {/* ========================================================================= */}
      {showNewRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Crear Nuevo Perfil / Rol</h3>
                  <p className="text-xs text-slate-500">Configura un perfil de acceso base</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewRoleModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Técnico / Clave</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="ej: Auditor, Marketing"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-1 focus:ring-[#E11D48] outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Etiqueta Visible</label>
                <input
                  type="text"
                  value={newRoleLabel}
                  onChange={(e) => setNewRoleLabel(e.target.value)}
                  placeholder="ej: Auditor de Procesos Externo"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-1 focus:ring-[#E11D48] outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Descripción</label>
                <textarea
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  placeholder="Responsabilidades y alcance..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-1 focus:ring-[#E11D48] outline-none resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Clonar Permisos de:</label>
                <select
                  value={cloneFromRoleId}
                  onChange={(e) => setCloneFromRoleId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-1 focus:ring-[#E11D48] outline-none"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.label} ({r.permissions.length} permisos)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowNewRoleModal(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!newRoleName.trim() || !newRoleLabel.trim()) {
                    alert('Por favor especifica un nombre y título para el rol.');
                    return;
                  }
                  const cleanId = newRoleName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
                  const templateRole = roles.find(r => r.id === cloneFromRoleId) || roles[0];
                  const newRole: RoleDefinition = {
                    id: cleanId,
                    name: newRoleName.trim(),
                    label: newRoleLabel.trim(),
                    description: newRoleDescription.trim() || `Rol para ${newRoleLabel.trim()}`,
                    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
                    isSystem: false,
                    permissions: [...(templateRole ? templateRole.permissions : [])],
                    userCount: 0
                  };
                  setRoles([...roles, newRole]);
                  setActiveRoleId(newRole.id);
                  setShowNewRoleModal(false);
                  setNewRoleName('');
                  setNewRoleLabel('');
                  setNewRoleDescription('');
                  setHasUnsavedChanges(true);
                  showToast(`Rol "${newRole.label}" creado.`);
                }}
                className="px-4 py-2 bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
              >
                Crear Rol
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
