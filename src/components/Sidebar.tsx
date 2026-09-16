import React from 'react';
import { 
  LayoutDashboard, Users, UserPlus, Kanban, CalendarRange, 
  MapPin, Calculator, FileText, Bookmark, CircleDollarSign, 
  Settings, History, ShieldCheck, AreaChart, Building2, HelpCircle,
  Menu, X, UserCheck, Scale, UserCircle, Target
} from 'lucide-react';

interface SidebarProps {
  currentScreen: string;
  setScreen: (screen: string) => void;
  userRole: string;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  unassignedCount?: number;
}

export default function Sidebar({ currentScreen, setScreen, userRole, mobileOpen, setMobileOpen, unassignedCount = 0 }: SidebarProps) {
  // Normalize user role string
  const roleLower = (userRole || '').toLowerCase().trim();
  const isAdmin = roleLower === 'admin' || roleLower.includes('administrador') || roleLower.includes('super admin');
  const isCeo = !isAdmin && roleLower.includes('ceo');
  const isDirectorAdmin = !isAdmin && (roleLower.includes('director') || roleLower === 'gerencial');
  const isSupervisorComercial = !isAdmin && (roleLower.includes('supervisor comercial') || roleLower === 'agencia' || roleLower === 'supervisor');
  const isSupervisorCobranzas = !isAdmin && (roleLower.includes('supervisor') && roleLower.includes('cobranza'));
  const isAsesoraCobranzas = !isAdmin && (roleLower.includes('asesora de cobranzas') || (roleLower.includes('asesor') && roleLower.includes('cobranza')));
  const isAdministrativo = !isAdmin && (roleLower.includes('administrativ') && !roleLower.includes('director'));
  const isChofer = !isAdmin && roleLower.includes('chofer');
  const isAsesorComercial = !isAdmin && !isCeo && !isDirectorAdmin && !isSupervisorComercial && !isSupervisorCobranzas && !isAsesoraCobranzas && !isAdministrativo && !isChofer;

  // Build nav groups dynamically based on role
  const getNavGroups = () => {
    if (isAdmin) {
      return [
        {
          title: 'PRINCIPAL',
          items: [
            { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { key: 'leads', label: 'Gestión de Leads', icon: UserPlus },
            { key: 'contactos', label: 'Ficha 360 y Clientes', icon: Users },
            { key: 'kanban', label: 'Kanban de Ventas', icon: Kanban },
            { key: 'agenda', label: 'Agenda y Seguimientos', icon: CalendarRange },
          ]
        },
        {
          title: 'COMERCIAL & VENTAS',
          items: [
            { key: 'proyectos', label: 'Urbanizaciones y Lotes', icon: MapPin },
            { key: 'cotizador', label: 'Cotizador Financiero', icon: Calculator },
            { key: 'proformas', label: 'Proformas Historial', icon: FileText },
            { key: 'reservas', label: 'Reservas y Abonos', icon: Bookmark },
            { key: 'ventas', label: 'Ventas Cerradas', icon: CircleDollarSign },
            { key: 'metas', label: 'Gestión de Metas', icon: Target },
          ]
        },
        {
          title: 'ADMINISTRACIÓN & CONTROL',
          items: [
            { 
              key: 'asignacion', 
              label: 'Asignación de Leads', 
              icon: Scale,
              badge: unassignedCount > 0 ? unassignedCount : undefined
            },
            { key: 'agencias', label: 'Agencias y Sucursales', icon: Building2 },
            { key: 'usuarios', label: 'Usuarios y Personal', icon: Users },
            { key: 'roles', label: 'Roles y Permisos', icon: ShieldCheck },
            { key: 'reportes', label: 'Reportes Gerenciales', icon: AreaChart },
            { key: 'auditoria', label: 'Auditoría del Sistema', icon: History },
            { key: 'configuracion', label: 'Configuración General', icon: Settings },
          ]
        },
        {
          title: 'MI CUENTA',
          items: [
            { key: 'perfil', label: 'Mi Perfil y Seguridad', icon: UserCircle },
          ]
        }
      ];
    }

    if (isChofer) {
      return [
        {
          title: 'LOGÍSTICA & TERRENO',
          items: [
            { key: 'agenda', label: 'Agenda de Visitas', icon: CalendarRange },
          ]
        },
        {
          title: 'MI CUENTA',
          items: [
            { key: 'perfil', label: 'Mi Perfil', icon: UserCircle },
          ]
        }
      ];
    }

    if (isAsesoraCobranzas) {
      return [
        {
          title: 'PRINCIPAL',
          items: [
            { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { key: 'contactos', label: 'Ficha 360 Clientes', icon: Users },
            { key: 'agenda', label: 'Agenda y Compromisos', icon: CalendarRange },
          ]
        },
        {
          title: 'CARTERA & COBRANZAS',
          items: [
            { key: 'proformas', label: 'Proformas Historial', icon: FileText },
            { key: 'ventas', label: 'Ventas y Recaudación', icon: CircleDollarSign },
          ]
        },
        {
          title: 'MI CUENTA',
          items: [
            { key: 'perfil', label: 'Mi Perfil y Seguridad', icon: UserCircle },
          ]
        }
      ];
    }

    if (isSupervisorCobranzas) {
      return [
        {
          title: 'PRINCIPAL',
          items: [
            { key: 'dashboard', label: 'Dashboard Financiero', icon: LayoutDashboard },
            { key: 'contactos', label: 'Clientes y Deudores', icon: Users },
            { key: 'agenda', label: 'Agenda y Compromisos', icon: CalendarRange },
          ]
        },
        {
          title: 'GESTIÓN DE CARTERA',
          items: [
            { key: 'cotizador', label: 'Simulador Financiero', icon: Calculator },
            { key: 'proformas', label: 'Proformas Historial', icon: FileText },
            { key: 'reservas', label: 'Reservas y Abonos', icon: Bookmark },
            { key: 'ventas', label: 'Ventas Cerradas', icon: CircleDollarSign },
          ]
        },
        {
          title: 'AUDITORÍA & REPORTES',
          items: [
            { key: 'reportes', label: 'Reportes de Recaudación', icon: AreaChart },
            { key: 'auditoria', label: 'Auditoría', icon: History },
          ]
        },
        {
          title: 'MI CUENTA',
          items: [
            { key: 'perfil', label: 'Mi Perfil y Seguridad', icon: UserCircle },
          ]
        }
      ];
    }

    if (isAsesorComercial) {
      return [
        {
          title: 'PRINCIPAL',
          items: [
            { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { key: 'leads', label: 'Mis Leads', icon: UserPlus },
            { key: 'contactos', label: 'Mis Contactos', icon: Users },
            { key: 'kanban', label: 'Kanban de Ventas', icon: Kanban },
            { key: 'agenda', label: 'Agenda y Visitas', icon: CalendarRange },
          ]
        },
        {
          title: 'COMERCIAL',
          items: [
            { key: 'cotizador', label: 'Cotizador Financiero', icon: Calculator },
            { key: 'proformas', label: 'Proformas Historial', icon: FileText },
            { key: 'reservas', label: 'Reservas', icon: Bookmark },
            { key: 'ventas', label: 'Ventas Cerradas', icon: CircleDollarSign },
          ]
        },
        {
          title: 'MI CUENTA',
          items: [
            { key: 'perfil', label: 'Mi Perfil y Seguridad', icon: UserCircle },
          ]
        }
      ];
    }

    if (isAdministrativo) {
      return [
        {
          title: 'PRINCIPAL',
          items: [
            { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { 
              key: 'asignacion', 
              label: 'Asignación de Leads', 
              icon: Scale,
              badge: unassignedCount > 0 ? unassignedCount : undefined
            },
          ]
        },
        {
          title: 'MI CUENTA',
          items: [
            { key: 'perfil', label: 'Mi Perfil y Seguridad', icon: UserCircle },
          ]
        }
      ];
    }

    // Default: CEO, Director Administrativo, Supervisor Comercial
    return [
      {
        title: 'PRINCIPAL',
        items: [
          { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { key: 'leads', label: 'Leads', icon: UserPlus },
          { key: 'contactos', label: 'Contactos', icon: Users },
          { key: 'kanban', label: 'Kanban de Ventas', icon: Kanban },
          { key: 'agenda', label: 'Agenda y Seguimientos', icon: CalendarRange },
        ]
      },
      {
        title: 'COMERCIAL',
        items: [
          { key: 'proyectos', label: 'Urbanizaciones', icon: MapPin },
          { key: 'cotizador', label: 'Cotizador Financiero', icon: Calculator },
          { key: 'proformas', label: 'Proformas Historial', icon: FileText },
          { key: 'reservas', label: 'Reservas', icon: Bookmark },
          { key: 'ventas', label: 'Ventas Cerradas', icon: CircleDollarSign },
        ]
      },
      {
        title: 'ADMINISTRACIÓN',
        items: [
          { 
            key: 'asignacion', 
            label: 'Asignación de Leads', 
            icon: Scale,
            badge: unassignedCount > 0 ? unassignedCount : undefined
          },
          { key: 'agencias', label: 'Agencias', icon: Building2 },
          { key: 'usuarios', label: 'Usuarios', icon: Users },
          { key: 'metas', label: 'Gestión de Metas', icon: Target },
          ...(isCeo || isDirectorAdmin ? [
            { key: 'roles', label: 'Roles y Permisos', icon: ShieldCheck }
          ] : []),
          { key: 'reportes', label: 'Reportes Gerenciales', icon: AreaChart },
          { key: 'auditoria', label: 'Auditoría', icon: History },
          ...(isCeo || isDirectorAdmin ? [
            { key: 'configuracion', label: 'Configuración', icon: Settings }
          ] : []),
        ]
      },
      {
        title: 'MI CUENTA',
        items: [
          { key: 'perfil', label: 'Mi Perfil y Seguridad', icon: UserCircle },
        ]
      }
    ];
  };

  const navGroups = getNavGroups();

  const handleScreenChange = (key: string) => {
    setScreen(key);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Scrim */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50 
        transform transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen lg:flex lg:flex-col
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#E11D48] flex items-center justify-center text-white font-bold text-sm shadow-sm">
              CZ
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-slate-900 text-xs tracking-tight leading-tight">CRM Corporación</h1>
                {isAdmin && (
                  <span className="text-[9px] bg-rose-50 text-[#E11D48] border border-rose-200 px-1.5 py-0.2 rounded font-extrabold tracking-wider uppercase">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[10px] text-[#E11D48] font-bold tracking-wider uppercase">Zavala</p>
            </div>
          </div>
          <button 
            className="lg:hidden p-1.5 rounded-md hover:bg-slate-50 text-slate-500"
            onClick={() => setMobileOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <h3 className="text-[10px] font-bold text-slate-400 tracking-wider px-3 uppercase mb-2">
                {group.title}
              </h3>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.key || (item.key === 'leads' && currentScreen === 'cliente360');
                return (
                  <button
                    key={item.key}
                    onClick={() => handleScreenChange(item.key)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 border
                      ${isActive 
                        ? 'bg-rose-50 border-rose-200 text-rose-700 shadow-xs' 
                        : 'bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                    `}
                  >
                    <Icon size={16} className={isActive ? 'text-rose-600' : 'text-slate-400'} />
                    <span className="truncate">{item.label}</span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="ml-auto bg-[#E11D48] text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2 px-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-medium">Grupo Terrenos v2.4</span>
          </div>
        </div>
      </aside>
    </>
  );
}
