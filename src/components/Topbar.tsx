import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, LogOut, Menu, ArrowRightLeft, Scale, UserCircle, MessageSquare, Clock, MapPin, CheckCheck, Sparkles, Volume2, VolumeX, ChevronRight, X, UserCheck } from 'lucide-react';
import { Usuario } from '../types';

export interface TopbarNotificationItem {
  id: string;
  category?: 'cita' | 'whatsapp' | 'asignacion';
  citaId?: number;
  leadId?: number;
  phone?: string;
  clientName: string;
  type: string;
  location?: string;
  messageText?: string;
  timeRemaining?: string;
  timestamp: number;
  read?: boolean;
  advisorName?: string;
  advisorPhone?: string;
  agencyName?: string;
}

interface TopbarProps {
  currentUser: Usuario | null;
  onLogout: () => void;
  onMenuToggle: () => void;
  role: string;
  onChangeRole: (role: string) => void;
  unassignedCount?: number;
  onGoAsignacion?: () => void;
  onGoPerfil?: () => void;
  notifications?: TopbarNotificationItem[];
  onOpenNotification?: (item: TopbarNotificationItem) => void;
  onClearNotifications?: () => void;
  onMarkAllAsRead?: () => void;
  onTriggerTestNotification?: (targetAdvisor?: string, targetPhone?: string) => void;
  availableUsers?: Usuario[];
  onSelectUser?: (user: Usuario) => void;
}

export default function Topbar({ 
  currentUser, 
  onLogout, 
  onMenuToggle, 
  role, 
  onChangeRole,
  unassignedCount = 0,
  onGoAsignacion,
  onGoPerfil,
  notifications = [],
  onOpenNotification,
  onClearNotifications,
  onMarkAllAsRead,
  onTriggerTestNotification,
  availableUsers = [],
  onSelectUser
}: TopbarProps) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotifOpen]);

  const isAdministrative = 
    role === 'gerencial' || 
    role === 'agencia' || 
    role === 'CEO' || 
    role === 'Director Administrativo' || 
    role === 'Supervisor Comercial' ||
    role === 'Administrativo';

  const initials = currentUser 
    ? currentUser.name.split(' ').map(n => n[0]).slice(0, 2).join('') 
    : 'U';

  const unreadCount = notifications.filter(n => !n.read).length;
  const hasUnreadWhatsApp = notifications.some(n => n.category === 'whatsapp' && !n.read);

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Mobile Hamburger toggle */}
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2 -ml-2 rounded-md hover:bg-slate-50 text-slate-600"
        >
          <Menu size={20} />
        </button>

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 w-80">
          <Search size={15} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por lote, proyecto o cliente..." 
            className="bg-transparent border-none outline-none text-xs w-full text-slate-700 placeholder-slate-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Unassigned Leads Alert Pill for Administrative Users */}
        {isAdministrative && unassignedCount > 0 && onGoAsignacion && (
          <button
            onClick={onGoAsignacion}
            className="hidden sm:inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer shadow-xs"
            title="Ir al módulo de Asignación y Distribución de Leads"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <Scale size={13} className="text-amber-700" />
            <span>{unassignedCount} lead{unassignedCount > 1 ? 's' : ''} por asignar</span>
          </button>
        )}

        {/* Role & User Quick Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
          <span className="text-[10px] font-bold text-slate-400 px-1.5 uppercase hidden sm:inline">Rol:</span>
          <select 
            value={role} 
            onChange={(e) => {
              const newRole = e.target.value;
              onChangeRole(newRole);
              if (onSelectUser && availableUsers.length > 0) {
                const targetRole = newRole.toLowerCase().trim();
                const matchedUser = availableUsers.find(u => {
                  const uRole = (u.role || '').toLowerCase().trim();
                  if (targetRole === 'administrativo') {
                    return uRole === 'administrativo' || (uRole.includes('administrativ') && !uRole.includes('director'));
                  }
                  if (targetRole === 'director administrativo') {
                    return uRole.includes('director');
                  }
                  if (targetRole === 'admin' || targetRole === 'administrador') {
                    return (uRole === 'admin' || uRole === 'administrador') && !uRole.includes('director') && !uRole.includes('administrativ');
                  }
                  if (targetRole === 'ceo' || targetRole.includes('dirección')) {
                    return uRole.includes('ceo') || uRole.includes('dirección') || uRole.includes('gerente');
                  }
                  if (targetRole.includes('supervisor comercial')) {
                    return uRole.includes('supervisor comercial');
                  }
                  if (targetRole.includes('supervisor de cobranzas')) {
                    return uRole.includes('supervisor') && uRole.includes('cobranza');
                  }
                  if (targetRole.includes('asesora de cobranzas') || targetRole.includes('asesor de cobranzas')) {
                    return uRole.includes('asesor') && uRole.includes('cobranza');
                  }
                  if (targetRole.includes('asesor')) {
                    return uRole.includes('asesor') && !uRole.includes('cobranza');
                  }
                  if (targetRole.includes('chofer')) {
                    return uRole.includes('chofer');
                  }
                  return uRole.includes(targetRole);
                });
                if (matchedUser) {
                  onSelectUser(matchedUser);
                }
              }
            }}
            className="bg-transparent outline-none border-none text-[11px] font-bold text-slate-800 cursor-pointer pr-1"
          >
            <option value="Admin">Admin (Control Total)</option>
            <option value="CEO">CEO / Dirección General</option>
            <option value="Director Administrativo">Director Administrativo</option>
            <option value="Supervisor Comercial">Supervisor Comercial</option>
            <option value="Supervisor de Cobranzas">Supervisor de Cobranzas</option>
            <option value="Asesora de Cobranzas">Asesora de Cobranzas</option>
            <option value="Administrativo">Administrativo</option>
            <option value="Asesor Comercial">Asesor Comercial</option>
            <option value="Chofer">Chofer</option>
          </select>

          {/* Quick Profile Switcher for Active Role */}
          {availableUsers.length > 0 && onSelectUser && (
            <>
              <span className="h-3.5 w-px bg-slate-200" />
              <select
                value={currentUser?.id || ''}
                onChange={(e) => {
                  const targetUser = availableUsers.find(u => u.id === Number(e.target.value));
                  if (targetUser) onSelectUser(targetUser);
                }}
                title="Cambiar usuario/perfil activo"
                className="bg-transparent outline-none border-none text-[11px] font-bold text-emerald-800 cursor-pointer max-w-[130px] truncate"
              >
                {(() => {
                  const roleLower = (role || '').toLowerCase().trim();
                  const isAdministrativoRole = roleLower.includes('administrativ') && !roleLower.includes('director');
                  const isDirectorAdminRole = roleLower.includes('director');
                  const isAdminRole = (roleLower === 'admin' || roleLower === 'administrador') && !isAdministrativoRole && !isDirectorAdminRole;
                  const isCeoRole = roleLower.includes('ceo') || roleLower.includes('dirección');
                  const isSupComRole = roleLower.includes('supervisor comercial');
                  const isSupCobRole = roleLower.includes('supervisor') && roleLower.includes('cobranza');
                  const isAsesoraCobRole = roleLower.includes('asesor') && roleLower.includes('cobranza');
                  const isAdvRole = (role === 'Asesor Comercial' || role === 'asesor' || roleLower.includes('asesor')) && !isAsesoraCobRole;
                  const isChoferRole = roleLower.includes('chofer');
                  
                  const filtered = availableUsers.filter(u => {
                    const uRole = (u.role || '').toLowerCase().trim();
                    if (isAdministrativoRole) return uRole.includes('administrativ') && !uRole.includes('director');
                    if (isDirectorAdminRole) return uRole.includes('director');
                    if (isAdminRole) return (uRole === 'admin' || uRole === 'administrador') && !uRole.includes('director') && !uRole.includes('administrativ');
                    if (isCeoRole) return uRole.includes('ceo') || uRole.includes('gerente');
                    if (isSupComRole) return uRole.includes('supervisor comercial');
                    if (isSupCobRole) return uRole.includes('supervisor') && uRole.includes('cobranza');
                    if (isAsesoraCobRole) return uRole.includes('asesor') && uRole.includes('cobranza');
                    if (isAdvRole) return uRole.includes('asesor') && !uRole.includes('cobranza');
                    if (isChoferRole) return uRole.includes('chofer');
                    return true;
                  });

                  const list = filtered.length > 0 ? filtered : availableUsers;
                  return list.map(adv => (
                    <option key={adv.id} value={adv.id}>
                      {adv.name}
                    </option>
                  ));
                })()}
              </select>
            </>
          )}
        </div>

        {/* Global Notifications Bell with Interactive Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            title="Centro global de notificaciones"
            className={`p-2 rounded-full relative transition cursor-pointer ${
              isNotifOpen 
                ? 'bg-slate-100 text-slate-800' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Bell size={19} className={hasUnreadWhatsApp ? 'text-emerald-600' : ''} />
            
            {unreadCount > 0 ? (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center text-white shadow-sm ${
                hasUnreadWhatsApp ? 'bg-emerald-600 animate-pulse' : 'bg-[#E11D48]'
              }`}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-slate-300 rounded-full" />
            )}
          </button>

          {/* Notifications Dropdown Flyout */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Dropdown Header */}
              <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                    <Bell size={13} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800">Notificaciones</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-600 font-semibold truncate max-w-[150px]">
                        {currentUser?.name || 'Usuario'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {onTriggerTestNotification && (
                    <button
                      onClick={() => {
                        onTriggerTestNotification(currentUser?.name);
                      }}
                      title={`Simular notificación dirigida a ${currentUser?.name || 'este asesor'}`}
                      className="text-[10px] bg-white hover:bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded-md border border-slate-200 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Sparkles size={11} />
                      <span>Probar</span>
                    </button>
                  )}

                  {unreadCount > 0 && onMarkAllAsRead && (
                    <button
                      onClick={() => {
                        onMarkAllAsRead();
                      }}
                      title="Marcar todas como leídas"
                      className="text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold px-2 py-1 rounded-md transition cursor-pointer flex items-center gap-1"
                    >
                      <CheckCheck size={11} />
                      <span>Leer todo</span>
                    </button>
                  )}

                  {notifications.length > 0 && onClearNotifications && (
                    <button
                      onClick={() => {
                        onClearNotifications();
                      }}
                      title="Limpiar historial"
                      className="text-[10px] text-slate-400 hover:text-slate-700 font-medium px-1.5 py-1 rounded-md transition cursor-pointer"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-10 h-10 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center mx-auto mb-2.5">
                      <CheckCheck size={20} />
                    </div>
                    <p className="text-xs font-bold text-slate-700">Sin notificaciones para este perfil</p>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Mostrando solo eventos vinculados a <strong className="text-slate-600">{currentUser?.name || 'tu usuario'}</strong>.
                    </p>
                    {onTriggerTestNotification && (
                      <button
                        onClick={() => onTriggerTestNotification(currentUser?.name)}
                        className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-emerald-600 hover:text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        <Sparkles size={12} />
                        <span>Simular notificación de WhatsApp</span>
                      </button>
                    )}
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isWa = notif.category === 'whatsapp';
                    const isAssignment = notif.category === 'asignacion' || notif.type.includes('Asignad');
                    const isRead = !!notif.read;

                    return (
                      <div 
                        key={notif.id}
                        onClick={() => {
                          if (onOpenNotification) {
                            onOpenNotification(notif);
                            setIsNotifOpen(false);
                          }
                        }}
                        className={`p-3.5 transition cursor-pointer hover:bg-slate-50/90 flex items-start gap-3 ${
                          !isRead 
                            ? (isAssignment 
                                ? 'bg-indigo-50/50 border-l-3 border-indigo-600' 
                                : isWa 
                                  ? 'bg-emerald-50/40 border-l-3 border-emerald-500' 
                                  : 'bg-rose-50/25 border-l-3 border-[#E11D48]') 
                            : 'opacity-70 bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${
                          !isRead
                            ? (isAssignment 
                                ? 'bg-indigo-100 text-indigo-700' 
                                : isWa 
                                  ? 'bg-emerald-100 text-emerald-600' 
                                  : 'bg-rose-100 text-[#E11D48]')
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {isAssignment ? <UserCheck size={16} /> : isWa ? <MessageSquare size={16} /> : <Clock size={16} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                              !isRead
                                ? (isAssignment 
                                    ? 'bg-indigo-100 text-indigo-800 font-extrabold' 
                                    : isWa 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-rose-100 text-rose-800')
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isAssignment ? 'Lead Asignado' : isWa ? 'WhatsApp Entrante' : 'Cita Programada'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isRead ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-slate-400 font-semibold">
                                  <CheckCheck size={11} className="text-emerald-500" />
                                  <span>Leído</span>
                                </span>
                              ) : (
                                <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[8px] font-extrabold text-white uppercase ${
                                  isAssignment ? 'bg-indigo-600' : 'bg-emerald-500'
                                }`}>
                                  Nuevo
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-medium">
                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          <h4 className={`text-xs mt-1 truncate ${!isRead ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                            {notif.clientName} {notif.phone ? <span className="text-slate-400 font-normal">({notif.phone})</span> : ''}
                          </h4>

                          {/* Advisor attribution info */}
                          {notif.advisorName && (
                            <div className="flex items-center gap-1.5 mt-1 text-[9px]">
                              <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                isAssignment ? 'bg-indigo-50 text-indigo-800 border border-indigo-100' : 'bg-slate-100 text-slate-700'
                              }`}>
                                Asesor asignado: {notif.advisorName}
                              </span>
                            </div>
                          )}

                          {isAssignment ? (
                            <p className="text-[11px] text-slate-700 mt-1 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                              {notif.messageText}
                            </p>
                          ) : isWa ? (
                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 italic font-medium">
                              "{notif.messageText}"
                            </p>
                          ) : (
                            <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                              <span>Faltan {notif.timeRemaining}</span> · <span className="text-slate-400">{notif.location}</span>
                            </div>
                          )}

                          {notif.leadId && (
                            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-indigo-700 hover:text-indigo-900">
                              <span>Ver prospecto en Cliente 360°</span>
                              <ChevronRight size={12} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-semibold text-slate-400">Corporación Zavala Live Sync</span>
                <span className="font-bold text-slate-700">
                  {unreadCount > 0 ? `${unreadCount} pendiente${unreadCount > 1 ? 's' : ''}` : 'Todo al día'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Badge Info & Profile trigger */}
        <div className="h-8 w-px bg-slate-200" />

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onGoPerfil}
            title="Ver mi perfil y gestionar credenciales"
            className="flex items-center gap-2.5 p-1 -m-1 rounded-xl hover:bg-slate-50 transition text-left cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-full bg-[#E11D48] group-hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center shadow-inner transition">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <h4 className="text-xs font-bold text-slate-800 leading-tight group-hover:text-[#E11D48] transition">
                {currentUser?.name || 'Usuario'}
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold">
                {currentUser?.role || role}
              </p>
            </div>
          </button>
          
          <button 
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-1.5 text-slate-400 hover:text-slate-950 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

