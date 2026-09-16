import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, MapPin, X, MessageSquare, UserCheck, AlertTriangle, RotateCcw, ShieldCheck } from 'lucide-react';
import { Usuario, Lead } from './types';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import DashboardView from './components/DashboardView';
import LeadsView from './components/LeadsView';
import KanbanView from './components/KanbanView';
import AgendaView from './components/AgendaView';
import CotizadorView from './components/CotizadorView';
import Cliente360View from './components/Cliente360View';
import ProyectosView from './components/ProyectosView';
import OtherViews from './components/OtherViews';
import { LeadModal } from './components/Modals';
import PublicConsentView from './components/PublicConsentView';
import AsignacionLeadsView from './components/AsignacionLeadsView';
import PerfilView from './components/PerfilView';
import MetasComercialesView from './components/MetasComercialesView';
import { subscribeToDbSync } from './lib/databaseSync';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [userRole, setUserRole] = useState('Admin'); 
  
  const [screen, setScreen] = useState('dashboard');
  const [mobileMenuOpen, setMobileOpen] = useState(false);

  // Public consent parameters detection
  const [publicConsentId, setPublicConsentId] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const consentIdParam = params.get('consentId') || params.get('publicConsent');
    if (consentIdParam) {
      setPublicConsentId(Number(consentIdParam));
    }
  }, []);

  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [selectedLeadTab, setSelectedLeadTab] = useState('datos');

  // Modal control
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Cotizador pre-population
  const [cotClientName, setCotClientName] = useState('');
  const [cotClientPhone, setCotClientPhone] = useState('');
  const [cotClientCedula, setCotClientCedula] = useState('');
  const [assignmentBannerMessage, setAssignmentBannerMessage] = useState<string | null>(null);

  // Notifications state (Citas, WhatsApp messages, and Lead assignments)
  interface NotificationItem {
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
    isOverdue?: boolean;
    dateStr?: string;
  }
  const [activeNotifications, setActiveNotifications] = useState<NotificationItem[]>([]);
  const [allNotifications, setAllNotifications] = useState<NotificationItem[]>([]);
  const [notifiedCitas, setNotifiedCitas] = useState<string[]>([]);
  const [notifiedWhatsAppIds, setNotifiedWhatsAppIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<Usuario[]>([]);

  // Mark notification as read in server and state
  const handleMarkNotificationAsRead = async (id: string, leadId?: number, phone?: string) => {
    try {
      fetch('/api/whatsapp/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, leadId, phone })
      }).catch(() => {});

      setActiveNotifications(prev => prev.filter(n => n.id !== id));
      setAllNotifications(prev => prev.map(n => 
        (n.id === id || (leadId && n.leadId === leadId)) ? { ...n, read: true } : n
      ));
    } catch (e) {}
  };

  // Quick update appointment status from notifications or overlays
  const handleQuickUpdateCitaStatus = async (citaId: number, newStatus: string, notifId?: string) => {
    try {
      const res = await fetch(`/api/citas/${citaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        if (notifId) {
          handleMarkNotificationAsRead(notifId);
        }
      }
    } catch (e) {
      console.error('Error updating cita status:', e);
    }
  };

  // Mark all notifications as read in server and state
  const handleMarkAllNotificationsAsRead = async () => {
    try {
      fetch('/api/whatsapp/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      }).catch(() => {});

      setActiveNotifications([]);
      setAllNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {}
  };

  // Auto-dismiss floating toasts after 14 seconds without removing from allNotifications
  useEffect(() => {
    if (activeNotifications.length === 0) return;
    const timer = setTimeout(() => {
      setActiveNotifications(prev => prev.slice(1));
    }, 14000);
    return () => clearTimeout(timer);
  }, [activeNotifications]);

  const parseCitaDate = (dateStr: string): Date | null => {
    try {
      if (!dateStr || typeof dateStr !== 'string') return null;
      const str = dateStr.trim();
      
      // Standard ISO like YYYY-MM-DDTHH:mm
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      }

      // Format YYYY-MM-DD HH:mm
      if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
        const d = new Date(str.slice(0, 10) + 'T' + str.slice(11, 16));
        return isNaN(d.getTime()) ? null : d;
      }

      const monthMap: Record<string, number> = {
        ene: 0, jan: 0, feb: 1, mar: 2, abr: 3, apr: 3,
        may: 4, jun: 5, jul: 6, ago: 7, aug: 7, sep: 8,
        sept: 8, oct: 9, nov: 10, dic: 11, dec: 11
      };

      const lower = str.toLowerCase();
      const isPM = lower.includes('p. m.') || lower.includes('p.m.') || lower.includes('pm');
      const isAM = lower.includes('a. m.') || lower.includes('a.m.') || lower.includes('am');

      const nums = str.match(/\d+/g);
      if (nums && nums.length >= 2) {
        let year = new Date().getFullYear();
        let monthIndex = 0;
        let day = 1;
        let hour = 10;
        let minute = 0;

        let foundMonth = false;
        for (const [key, val] of Object.entries(monthMap)) {
          if (lower.includes(key)) {
            monthIndex = val;
            foundMonth = true;
            break;
          }
        }

        const yearIndex = nums.findIndex(n => n.length === 4);
        if (yearIndex !== -1) {
          year = parseInt(nums[yearIndex], 10);
          if (yearIndex > 0) {
            day = parseInt(nums[0], 10);
          }
          const remaining = nums.filter((_, idx) => idx !== yearIndex && idx !== 0);
          if (!foundMonth && remaining.length > 0) {
            monthIndex = Math.max(0, Math.min(11, parseInt(remaining[0], 10) - 1));
            remaining.shift();
          }
          if (remaining.length >= 2) {
            hour = parseInt(remaining[0], 10);
            minute = parseInt(remaining[1], 10);
          } else if (remaining.length === 1) {
            hour = parseInt(remaining[0], 10);
          }
        } else {
          if (nums.length >= 3) {
            day = parseInt(nums[0], 10);
            monthIndex = Math.max(0, Math.min(11, parseInt(nums[1], 10) - 1));
            year = parseInt(nums[2].length === 2 ? '20' + nums[2] : nums[2], 10);
            if (nums.length >= 5) {
              hour = parseInt(nums[3], 10);
              minute = parseInt(nums[4], 10);
            }
          }
        }

        if (isNaN(hour)) hour = 10;
        if (isPM && hour < 12) hour += 12;
        if (isAM && hour === 12) hour = 0;

        const d = new Date(year, monthIndex, day, hour, isNaN(minute) ? 0 : minute, 0, 0);
        return isNaN(d.getTime()) ? null : d;
      }
      return null;
    } catch (e) {
      console.error('Error parsing spanish date:', dateStr, e);
      return null;
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;

    let isMounted = true;
    const controller = new AbortController();

    const checkCitasForNotifications = async () => {
      try {
        const res = await fetch('/api/citas', { signal: controller.signal });
        if (!res.ok) return;
        const cList = await res.json();
        if (!isMounted || !Array.isArray(cList)) return;

        const now = new Date();
        const newNotifications: NotificationItem[] = [];
        const updatedNotified = [...notifiedCitas];
        let changed = false;

        cList.forEach((cita) => {
          if (cita.status === 'Cancelada' || cita.status === 'Realizada' || cita.status === 'Reprogramada' || cita.status === 'No asistió') return;
          const citaTime = parseCitaDate(cita.date);
          if (!citaTime) return;

          const diffMs = citaTime.getTime() - now.getTime();
          const diffMins = Math.round(diffMs / 60000);

          // Determine client name and advisor
          const matchedLead = leads.find(l => l.id === cita.lead_id);
          const clientName = matchedLead ? matchedLead.name : 'Cliente General';
          const assignedAdvisor = matchedLead?.user || matchedLead?.assigned_to;

          // Route to relevant users: Gerencial / Admin receives all; Advisor receives their assigned leads' appointments
          const isRelevantToUser = !currentUser || 
            currentUser.role?.toLowerCase() === 'gerencial' || 
            currentUser.role?.toLowerCase() === 'admin' || 
            currentUser.role?.toLowerCase() === 'superadmin' ||
            !assignedAdvisor || 
            assignedAdvisor.trim().toLowerCase() === (currentUser.name || '').trim().toLowerCase();

          if (!isRelevantToUser) return;

          // Check Overdue rule: appointment passed (diffMins < 0 or status is 'Vencida')
          const isOverdue = cita.status === 'Vencida' || diffMins < 0;
          const keyVencida = `${cita.id}-vencida-${currentUser?.id || 'all'}`;
          if (isOverdue && !updatedNotified.includes(keyVencida)) {
            newNotifications.push({
              id: keyVencida,
              category: 'cita',
              citaId: cita.id,
              leadId: cita.lead_id,
              clientName,
              type: cita.type,
              location: cita.location,
              timeRemaining: 'Vencida',
              isOverdue: true,
              dateStr: cita.date,
              timestamp: Date.now()
            });
            updatedNotified.push(keyVencida);
            changed = true;
          }

          // Check 30 minutes rule: between 25 and 35 mins remaining
          const key30 = `${cita.id}-30min-${currentUser?.id || 'all'}`;
          if (!isOverdue && diffMins >= 25 && diffMins <= 35 && !updatedNotified.includes(key30)) {
            newNotifications.push({
              id: key30,
              category: 'cita',
              citaId: cita.id,
              leadId: cita.lead_id,
              clientName,
              type: cita.type,
              location: cita.location,
              timeRemaining: '30 minutos',
              dateStr: cita.date,
              timestamp: Date.now()
            });
            updatedNotified.push(key30);
            changed = true;
          }

          // Check 5 minutes rule: between 0 and 7 mins remaining
          const key5 = `${cita.id}-5min-${currentUser?.id || 'all'}`;
          if (!isOverdue && diffMins >= 0 && diffMins <= 7 && !updatedNotified.includes(key5)) {
            newNotifications.push({
              id: key5,
              category: 'cita',
              citaId: cita.id,
              leadId: cita.lead_id,
              clientName,
              type: cita.type,
              location: cita.location,
              timeRemaining: '5 minutos',
              dateStr: cita.date,
              timestamp: Date.now()
            });
            updatedNotified.push(key5);
            changed = true;
          }
        });

        if (changed) {
          setNotifiedCitas(updatedNotified);
        }

        if (newNotifications.length > 0) {
          setActiveNotifications(prev => [...prev, ...newNotifications]);
          setAllNotifications(prev => {
            const ids = new Set(prev.map(p => p.id));
            const fresh = newNotifications.filter(n => !ids.has(n.id));
            return [...fresh, ...prev].slice(0, 30);
          });
          
          // Audio feedback using Web Audio API
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5 note
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.4);
          } catch (e) {
            // Browser block / ignore
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          // Gracefully suppress network/transient hiccups during periodic polling
        }
      }
    };

    checkCitasForNotifications();
    const interval = setInterval(checkCitasForNotifications, 15000);
    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [isLoggedIn, leads, notifiedCitas, currentUser?.id, currentUser?.name, currentUser?.role]);

  // Load all system users to enable seamless advisor switching and profile binding
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch('/api/usuarios')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllUsers(data);
        }
      })
      .catch(() => {});
  }, [isLoggedIn]);

  // Check for incoming WhatsApp messages from n8n webhook to show live toast alerts (filtered per user profile & phone)
  useEffect(() => {
    if (!isLoggedIn) return;

    const checkWhatsAppIncoming = async () => {
      try {
        const params = new URLSearchParams();
        params.set('since', String(Date.now() - 40000));
        if (currentUser?.name) params.set('advisor', currentUser.name);
        if (currentUser?.phone) params.set('phone', currentUser.phone);
        if (currentUser?.role || userRole) params.set('role', currentUser?.role || userRole);

        const res = await fetch(`/api/whatsapp/notifications/recent?${params.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.events) && data.events.length > 0) {
          const newWaNotifications: NotificationItem[] = [];
          const updatedWaNotified = [...notifiedWhatsAppIds];
          let changed = false;

          data.events.forEach((evt: any) => {
            if (!updatedWaNotified.includes(evt.id)) {
              // Match lead if not provided in event
              let targetLeadId = evt.leadId;
              let targetLeadName = evt.leadName;
              if (!targetLeadId && evt.phone) {
                const clean = evt.phone.replace(/\D/g, '');
                const found = leads.find(l => l.phone && l.phone.replace(/\D/g, '').endsWith(clean.slice(-8)));
                if (found) {
                  targetLeadId = found.id;
                  targetLeadName = found.name;
                }
              }

              // Only show toast if user is not already inside Cliente360 on the WhatsApp tab for this exact lead
              const isLookingAtThisChat = screen === 'cliente360' && selectedLeadId === targetLeadId && selectedLeadTab === 'whatsapp';
              if (isLookingAtThisChat) {
                // If user is already active in this chat, mark read immediately so it never spams or alerts
                fetch('/api/whatsapp/notifications/read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: evt.id, leadId: targetLeadId })
                }).catch(() => {});
              } else {
                const isAssignmentEvt = evt.sender === 'asignacion' || (evt.text && evt.text.includes('Asignad'));
                newWaNotifications.push({
                  id: evt.id,
                  category: isAssignmentEvt ? 'asignacion' : 'whatsapp',
                  leadId: targetLeadId,
                  phone: evt.phone,
                  clientName: targetLeadName || 'Cliente',
                  type: isAssignmentEvt ? 'Nuevo Lead Asignado' : 'Mensaje de WhatsApp',
                  messageText: evt.text,
                  timestamp: evt.timestamp,
                  read: false,
                  advisorName: evt.advisorName,
                  advisorPhone: evt.advisorPhone,
                  agencyName: evt.agencyName
                });
              }
              updatedWaNotified.push(evt.id);
              changed = true;
            }
          });

          if (changed) {
            setNotifiedWhatsAppIds(updatedWaNotified.slice(-100));
          }

          if (newWaNotifications.length > 0) {
            setActiveNotifications(prev => [...prev, ...newWaNotifications]);
            setAllNotifications(prev => {
              const ids = new Set(prev.map(p => p.id));
              const fresh = newWaNotifications.filter(n => !ids.has(n.id));
              return [...fresh, ...prev].slice(0, 35);
            });

            // Gentle WhatsApp-style chime
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc1 = audioCtx.createOscillator();
              const osc2 = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc1.type = 'sine';
              osc2.type = 'sine';
              osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime);
              osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
              osc2.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.1);
              gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
              osc1.connect(gain);
              osc2.connect(gain);
              gain.connect(audioCtx.destination);
              osc1.start(audioCtx.currentTime);
              osc2.start(audioCtx.currentTime + 0.1);
              osc1.stop(audioCtx.currentTime + 0.5);
              osc2.stop(audioCtx.currentTime + 0.5);
            } catch (e) {}

            // Native desktop notification if permitted
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              newWaNotifications.forEach(n => {
                try {
                  new Notification(`WhatsApp: ${n.clientName}`, {
                    body: n.messageText,
                    icon: '/favicon.ico'
                  });
                } catch (e) {}
              });
            }
          }
        }
      } catch (e) {}
    };

    const waInterval = setInterval(checkWhatsAppIncoming, 3500);
    checkWhatsAppIncoming();
    return () => clearInterval(waInterval);
  }, [isLoggedIn, screen, selectedLeadId, selectedLeadTab, leads, notifiedWhatsAppIds, currentUser?.name, currentUser?.phone, currentUser?.role, userRole]);

  // Load existing notifications on login or profile switch for the notification center
  useEffect(() => {
    if (!isLoggedIn) return;
    const params = new URLSearchParams();
    if (currentUser?.name) params.set('advisor', currentUser.name);
    if (currentUser?.phone) params.set('phone', currentUser.phone);
    if (currentUser?.role || userRole) params.set('role', currentUser?.role || userRole);

    fetch(`/api/whatsapp/notifications/all?${params.toString()}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.notifications)) {
          const mapped: NotificationItem[] = data.notifications.map((n: any) => ({
            id: n.id,
            category: 'whatsapp',
            leadId: n.leadId,
            phone: n.phone,
            clientName: n.leadName || 'Cliente',
            type: 'Mensaje de WhatsApp',
            messageText: n.text,
            timestamp: n.timestamp,
            read: n.read === 1 || n.read === true,
            advisorName: n.advisorName,
            advisorPhone: n.advisorPhone,
            agencyName: n.agencyName
          }));
          setAllNotifications(mapped.slice(0, 35));
        }
      })
      .catch(() => {});
  }, [isLoggedIn, currentUser?.name, currentUser?.phone, currentUser?.role, userRole]);

  // Function to simulate / trigger a global WhatsApp notification scoped to target advisor / phone
  const handleTriggerTestNotification = async (targetAdvisor?: string, targetPhone?: string) => {
    try {
      const adv = targetAdvisor || currentUser?.name || 'Andrea Cedeño';
      const ph = targetPhone || currentUser?.phone || '+593 99 812 0001';
      const res = await fetch('/api/whatsapp/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advisor: adv,
          phone: ph,
          text: `¡Hola ${adv.split(' ')[0]}! Quisiera información y agendar una visita a los terrenos este fin de semana.`
        })
      });
      const data = await res.json();
      if (data.success && data.event) {
        const testItem: NotificationItem = {
          id: data.event.id,
          category: 'whatsapp',
          leadId: data.event.leadId,
          phone: data.event.phone,
          clientName: data.event.leadName || `Cliente asignado a ${adv}`,
          type: 'Mensaje de WhatsApp',
          messageText: data.event.text,
          timestamp: data.event.timestamp,
          read: false,
          advisorName: data.event.advisorName,
          advisorPhone: data.event.advisorPhone,
          agencyName: data.event.agencyName
        };
        setActiveNotifications(prev => [...prev, testItem]);
        setAllNotifications(prev => [testItem, ...prev.filter(p => p.id !== testItem.id)].slice(0, 35));

        // WhatsApp-style sound chime
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc1 = audioCtx.createOscillator();
          const osc2 = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime);
          osc1.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
          osc2.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(audioCtx.destination);
          osc1.start(audioCtx.currentTime);
          osc2.start(audioCtx.currentTime + 0.1);
          osc1.stop(audioCtx.currentTime + 0.5);
          osc2.stop(audioCtx.currentTime + 0.5);
        } catch (e) {}
      }
    } catch (err) {
      console.error('Error triggering test notification:', err);
    }
  };

  // Auto-authenticate with seed database user depending on current role
  useEffect(() => {
    // Map each of the 8 roles to a representative user in the database
    let email = 'maria.salazar@grupoterrenos.com'; // default: Director Administrativo

    switch (userRole) {
      case 'Admin':
      case 'admin':
      case 'Administrador':
        email = 'admin@grupoterrenos.com';
        break;
      case 'CEO':
        email = 'gabriel.ramos@grupoterrenos.com';
        break;
      case 'Director Administrativo':
      case 'gerencial':
        email = 'maria.salazar@grupoterrenos.com';
        break;
      case 'Supervisor Comercial':
      case 'agencia':
        email = 'carlos.pinto@grupoterrenos.com';
        break;
      case 'Supervisor de Cobranzas':
        email = 'daniela.vera@grupoterrenos.com';
        break;
      case 'Asesora de Cobranzas':
        email = 'veronica.alarcon@grupoterrenos.com';
        break;
      case 'Administrativo':
        email = 'lorena.aguirre@grupoterrenos.com';
        break;
      case 'Asesor Comercial':
      case 'asesor':
        email = 'andrea.cedeno@grupoterrenos.com';
        break;
      case 'Chofer':
        email = 'jorge.cevallos@grupoterrenos.com';
        break;
      default:
        email = 'maria.salazar@grupoterrenos.com';
    }

    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentUser(data.user);
        }
      })
      .catch(err => console.error('Auth error:', err));
  }, [userRole]);

  // Fetch leads from database
  const fetchLeads = () => {
    fetch('/api/leads')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setLeads(data);
        } else {
          console.error('Expected array of leads, got:', data);
          setLeads([]);
        }
      })
      .catch(err => {
        console.error('Error fetching leads:', err);
        setLeads([]);
      });
  };

  const fetchUsuarios = () => {
    fetch('/api/usuarios')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAllUsers(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchLeads();
    fetchUsuarios();

    // Subscribe to real-time database mutations & background poller events
    const unsubscribe = subscribeToDbSync(['leads', 'usuarios', 'all'], (detail) => {
      if (detail.entity === 'leads' || detail.entity === 'all') {
        fetchLeads();
      }
      if (detail.entity === 'usuarios' || detail.entity === 'all') {
        fetchUsuarios();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Guard role-based screen access
  useEffect(() => {
    const roleLower = (userRole || '').toLowerCase().trim();
    if (roleLower === 'admin' || roleLower.includes('administrador') || roleLower.includes('super admin')) {
      // Admin profile has unrestricted access to all modules and all functions
      return;
    }

    if (userRole === 'Chofer') {
      const allowedForChofer = ['agenda', 'perfil'];
      if (!allowedForChofer.includes(screen)) {
        setScreen('agenda');
      }
      return;
    }

    if (userRole === 'Asesora de Cobranzas') {
      const allowedForAsesoraCobranzas = [
        'dashboard', 'contactos', 'agenda', 'proformas', 'ventas', 'perfil', 'cliente360'
      ];
      if (!allowedForAsesoraCobranzas.includes(screen)) {
        setScreen('dashboard');
      }
      return;
    }

    if (userRole === 'Supervisor de Cobranzas') {
      const allowedForSupCobranzas = [
        'dashboard', 'contactos', 'agenda', 'cotizador', 'proformas', 
        'reservas', 'ventas', 'reportes', 'auditoria', 'perfil', 'cliente360'
      ];
      if (!allowedForSupCobranzas.includes(screen)) {
        setScreen('dashboard');
      }
      return;
    }

    if (userRole === 'Asesor Comercial' || userRole === 'asesor') {
      const allowedForAsesor = [
        'dashboard', 'leads', 'contactos', 'kanban', 'agenda', 
        'cotizador', 'proformas', 'reservas', 'ventas', 'perfil', 'cliente360'
      ];
      if (!allowedForAsesor.includes(screen)) {
        setScreen('dashboard');
      }
      return;
    }

    const isAdministrativoRole = roleLower.includes('administrativ') && !roleLower.includes('director');
    if (isAdministrativoRole || userRole === 'Administrativo') {
      const allowedForAdmin = [
        'dashboard', 'asignacion', 'perfil'
      ];
      if (!allowedForAdmin.includes(screen)) {
        setScreen('dashboard');
      }
      return;
    }
  }, [userRole, screen]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let email = 'admin@grupoterrenos.com';
    const rLower = (userRole || '').toLowerCase().trim();
    if (rLower === 'administrativo' || (rLower.includes('administrativ') && !rLower.includes('director'))) {
      email = 'lorena.aguirre@grupoterrenos.com';
    } else if (rLower.includes('director') || userRole === 'gerencial') {
      email = 'maria.salazar@grupoterrenos.com';
    } else if (rLower === 'admin' || rLower === 'administrador') {
      email = 'admin@grupoterrenos.com';
    } else if (rLower.includes('ceo')) {
      email = 'gabriel.ramos@grupoterrenos.com';
    } else if (rLower.includes('supervisor comercial') || userRole === 'agencia') {
      email = 'carlos.pinto@grupoterrenos.com';
    } else if (rLower.includes('supervisor') && rLower.includes('cobranza')) {
      email = 'daniela.vera@grupoterrenos.com';
    } else if (rLower.includes('asesor') && rLower.includes('cobranza')) {
      email = 'veronica.alarcon@grupoterrenos.com';
    } else if (rLower.includes('asesor')) {
      email = 'andrea.cedeno@grupoterrenos.com';
    } else if (rLower.includes('chofer')) {
      email = 'jorge.cevallos@grupoterrenos.com';
    } else if (rLower.includes('admin')) {
      email = 'admin@grupoterrenos.com';
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setCurrentUser(data.user);
      }
    } catch (err) {
      console.error('Auth error on login:', err);
    }

    setIsLoggedIn(true);
    fetchLeads();
  };

  // CRUD operation handlers connected to SQLite backend!
  const handleSaveLead = async (leadData: any) => {
    const isEdit = !!editingLead;
    const url = isEdit ? `/api/leads/${editingLead!.id}` : '/api/leads';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { ...editingLead, ...leadData } : leadData)
      });
      const data = await res.json();
      if (data.success || res.ok) {
        fetchLeads();
        setEditingLead(null);
        setIsLeadModalOpen(false);
      }
    } catch (err) {
      console.error('Error saving lead:', err);
    }
  };

  const handleUpdateStage = async (id: number, stage: string, status?: string) => {
    try {
      const res = await fetch(`/api/leads/${id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, status })
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
      }
    } catch (err) {
      console.error('Error updating stage:', err);
    }
  };

  const handleDeleteLead = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este prospecto del sistema?')) return;
    try {
      const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchLeads();
      }
    } catch (err) {
      console.error('Error deleting lead:', err);
    }
  };

  // Save Proforma generated in Cotizador
  const handleSaveProforma = async (proformaData: any) => {
    try {
      const res = await fetch('/api/proformas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...proformaData,
          advisor: currentUser?.name || 'Andrea Cedeño'
        })
      });
      const data = await res.json();
      if (data.success) {
        fetchLeads(); // Refresh leads stages
        return data.number;
      }
      return null;
    } catch (err) {
      console.error('Error saving proforma:', err);
      return null;
    }
  };

  // Switcher to Cotizador with pre-population
  const handleGoCotizador = (name: string, phone: string, cedula: string = '') => {
    setCotClientName(name);
    setCotClientPhone(phone);
    setCotClientCedula(cedula);
    setScreen('cotizador');
  };

  const handleOpenLead360 = (id: number, tab: string = 'datos') => {
    setSelectedLeadId(id);
    setSelectedLeadTab(tab);
    setScreen('cliente360');

    // Automatically mark notifications for this lead as read both in backend and state
    fetch('/api/whatsapp/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: id })
    }).catch(() => {});

    setActiveNotifications(prev => prev.filter(n => n.leadId !== id));
    setAllNotifications(prev => prev.map(n => n.leadId === id ? { ...n, read: true } : n));
  };

  // Render public consent view if requested via URL
  if (publicConsentId) {
    return <PublicConsentView leadId={publicConsentId} />;
  }

  // Render authentic login screen matching design
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-rose-950 via-rose-900 to-rose-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-8 space-y-6 animate-in fade-in duration-300">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-[#E11D48] rounded-xl flex items-center justify-center text-white font-extrabold text-2xl mx-auto shadow">
              CZ
            </div>
            <h1 className="font-extrabold text-slate-800 text-lg tracking-tight font-display">
              CRM Corporación Zavala
            </h1>
            <p className="text-[11px] text-[#E11D48] font-bold uppercase tracking-wider">
              Plataforma Corporativa de Ventas
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {/* Quick Admin Access Card */}
            {(() => {
              const r = (userRole || '').toLowerCase().trim();
              const isStrictAdmin = r === 'admin' || r === 'administrador';
              return (
                <>
                  <div 
                    onClick={() => setUserRole('Admin')}
                    className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between text-left ${
                      isStrictAdmin
                        ? 'bg-rose-50/90 border-[#E11D48] ring-1 ring-[#E11D48]/30 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isStrictAdmin ? 'bg-[#E11D48] text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                      }`}>
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          Administrador General
                          <span className="text-[9px] bg-[#E11D48] text-white font-extrabold px-1.5 py-0.5 rounded tracking-wide uppercase">
                            Total
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          admin@grupoterrenos.com
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                      isStrictAdmin
                        ? 'bg-[#E11D48] text-white border-[#E11D48]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}>
                      {isStrictAdmin ? 'Activo' : 'Seleccionar'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs text-left">
                    <label className="font-bold text-slate-600">Usuario Comercial o Perfil *</label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-700 font-semibold outline-none focus:ring-1 focus:ring-[#E11D48]"
                    >
                      <option value="Admin">admin@grupoterrenos.com — Admin (Control Total)</option>
                      <option value="CEO">gabriel.ramos@grupoterrenos.com — CEO / Dirección General</option>
                      <option value="Director Administrativo">maria.salazar@grupoterrenos.com — Director Administrativo</option>
                      <option value="Supervisor Comercial">carlos.pinto@grupoterrenos.com — Supervisor Comercial</option>
                      <option value="Supervisor de Cobranzas">daniela.vera@grupoterrenos.com — Supervisor de Cobranzas</option>
                      <option value="Asesor Comercial">andrea.cedeno@grupoterrenos.com — Asesor Comercial</option>
                      <option value="Asesora de Cobranzas">veronica.alarcon@grupoterrenos.com — Asesora de Cobranzas</option>
                      <option value="Administrativo">lorena.aguirre@grupoterrenos.com — Administrativo</option>
                      <option value="Chofer">jorge.cevallos@grupoterrenos.com — Chofer (Logística y Visitas)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs text-left">
                    <label className="font-bold text-slate-600">Contraseña Corporativa</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      defaultValue="••••••••"
                      className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs text-slate-700 outline-none"
                      disabled
                    />
                  </div>

                  {isStrictAdmin && (
                    <div className="text-[10px] bg-rose-50 text-rose-800 border border-rose-200 rounded-lg p-2 text-left flex items-start gap-1.5">
                      <span className="font-bold text-rose-600 mt-0.5">⭐</span>
                      <span>
                        <strong>Modo Administrador:</strong> Acceso irrestricto a todos los módulos (Comercial, Operaciones, Ventas, Finanzas, Auditoría, Configuración y Permisos).
                      </span>
                    </div>
                  )}

                  {r === 'administrativo' && (
                    <div className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 rounded-lg p-2 text-left flex items-start gap-1.5">
                      <span className="font-bold text-blue-600 mt-0.5">🏢</span>
                      <span>
                        <strong>Perfil Administrativo:</strong> Gestión operativa y comercial de agencia, asignación de leads y control de metas de asesores.
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-[#E11D48] hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <span>Ingresar al Sistema</span>
                    {isStrictAdmin && (
                      <span className="text-[10px] bg-rose-800/80 px-1.5 py-0.5 rounded text-white font-bold uppercase">
                        Admin
                      </span>
                    )}
                  </button>
                </>
              );
            })()}
          </form>

          <p className="text-[10px] text-center text-slate-400 font-medium">
            Desarrollado para Corporación Zavala · Santo Domingo, Ecuador
          </p>
        </div>
      </div>
    );
  }

  const unassignedLeadsCount = leads.filter(
    l => !l.advisor || l.advisor.trim() === '' || l.advisor.toLowerCase() === 'sin asignar'
  ).length;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50/50">
      {/* 1. Sidebar Nav */}
      <Sidebar 
        currentScreen={screen} 
        setScreen={setScreen} 
        userRole={userRole}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileOpen}
        unassignedCount={unassignedLeadsCount}
      />

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <Topbar 
          currentUser={currentUser} 
          onLogout={() => setIsLoggedIn(false)}
          onMenuToggle={() => setMobileOpen(true)}
          role={userRole}
          onChangeRole={(role) => setUserRole(role)}
          unassignedCount={unassignedLeadsCount}
          onGoAsignacion={() => setScreen('asignacion')}
          onGoPerfil={() => setScreen('perfil')}
          notifications={allNotifications}
          onOpenNotification={(item) => {
            handleMarkNotificationAsRead(item.id, item.leadId, item.phone);
            if (item.leadId) {
              handleOpenLead360(item.leadId, item.category === 'whatsapp' ? 'whatsapp' : 'datos');
            } else if (item.category === 'cita') {
              setScreen('agenda');
            }
          }}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          onClearNotifications={() => {
            setAllNotifications([]);
            setActiveNotifications([]);
            fetch('/api/whatsapp/notifications/clear', { method: 'POST' }).catch(() => {});
          }}
          onTriggerTestNotification={handleTriggerTestNotification}
          availableUsers={allUsers}
          onSelectUser={(u) => {
            setCurrentUser(u);
            if (u.role) {
              setUserRole(u.role);
            }
          }}
        />

        {/* Dynamic Route Screen */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {screen === 'perfil' && (
            <PerfilView 
              currentUser={currentUser}
              onUpdateCurrentUser={(updated) => setCurrentUser(updated)}
            />
          )}
          {screen === 'dashboard' && (
            <DashboardView 
              userRole={userRole} 
              currentUser={currentUser}
              onChangeScreen={setScreen}
              onSelectLead={handleOpenLead360}
            />
          )}

          {screen === 'asignacion' && (
            <AsignacionLeadsView 
              leads={leads}
              onRefreshLeads={fetchLeads}
              userRole={userRole}
              currentUserName={currentUser?.name || 'Administrador'}
              onOpenLead360={handleOpenLead360}
              onGoLeads={(msg) => {
                setScreen('leads');
                if (msg) {
                  setAssignmentBannerMessage(msg);
                }
              }}
            />
          )}

          {screen === 'leads' && (
            <LeadsView 
              leads={leads}
              onOpenLead360={handleOpenLead360}
              onEditLead={(ld) => { setEditingLead(ld); setIsLeadModalOpen(true); }}
              onDeleteLead={handleDeleteLead}
              onAddLead={() => { setEditingLead(null); setIsLeadModalOpen(true); }}
              viewMode="leads"
              userRole={userRole}
              currentUser={currentUser}
              onGoAsignacion={() => setScreen('asignacion')}
              assignmentNotification={assignmentBannerMessage}
              onClearAssignmentNotification={() => setAssignmentBannerMessage(null)}
            />
          )}

          {screen === 'contactos' && (
            <LeadsView 
              leads={leads}
              onOpenLead360={handleOpenLead360}
              onEditLead={(ld) => { setEditingLead(ld); setIsLeadModalOpen(true); }}
              onDeleteLead={handleDeleteLead}
              onAddLead={() => { setEditingLead(null); setIsLeadModalOpen(true); }}
              viewMode="contactos"
              userRole={userRole}
              currentUser={currentUser}
              onGoAsignacion={() => setScreen('asignacion')}
            />
          )}

          {screen === 'kanban' && (
            <KanbanView 
              leads={leads}
              onUpdateStage={handleUpdateStage}
              onOpenLead360={handleOpenLead360}
              onGoCotizador={handleGoCotizador}
              userRole={userRole}
              currentUser={currentUser}
            />
          )}

          {screen === 'agenda' && (
            <AgendaView 
              userRole={userRole}
              currentUser={currentUser}
            />
          )}

          {screen === 'proyectos' && userRole !== 'Asesor Comercial' && userRole !== 'asesor' && (
            <ProyectosView />
          )}

          {screen === 'cotizador' && (
            <CotizadorView 
              initialLeadName={cotClientName}
              initialPhone={cotClientPhone}
              initialCedula={cotClientCedula}
              onSaveProforma={handleSaveProforma}
            />
          )}

          {screen === 'cliente360' && selectedLeadId !== null && (
            <Cliente360View 
              leadId={selectedLeadId}
              onBack={() => setScreen('leads')}
              onGoCotizador={handleGoCotizador}
              initialTab={selectedLeadTab}
              onEditLead={(ld) => { setEditingLead(ld); setIsLeadModalOpen(true); }}
              leads={leads}
              onRefreshLeads={fetchLeads}
            />
          )}

          {screen === 'metas' && userRole !== 'Asesor Comercial' && userRole !== 'asesor' && (
            <MetasComercialesView 
              userRole={userRole}
              currentUser={currentUser}
              onNavigateToDashboard={() => setScreen('dashboard')}
            />
          )}

          {/* Fallback to other tables/views */}
          {['agencias', 'usuarios', 'roles', 'auditoria', 'configuracion', 'proformas', 'reservas', 'ventas', 'reportes'].includes(screen) && (
            <OtherViews 
              screen={screen} 
              onAddUsuario={() => alert('Para agregar usuarios o modificar roles, utiliza la CLI de administración o el gestor SQLite.')}
              onAddAgencia={() => alert('Para configurar nuevas sucursales, utiliza el panel de configuración de base de datos.')}
              userRole={userRole}
              currentUser={currentUser}
              onRefreshLeads={fetchLeads}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <LeadModal 
        isOpen={isLeadModalOpen}
        onClose={() => { setIsLeadModalOpen(false); setEditingLead(null); }}
        onSubmit={handleSaveLead}
        editingLead={editingLead}
      />

      {/* Dynamic Slide-in Notifications Toast Stack */}
      <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {activeNotifications.map((notif) => {
            const isWhatsApp = notif.category === 'whatsapp';
            const isAssignment = notif.category === 'asignacion' || notif.type.includes('Asignad');
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                className={`bg-white rounded-xl shadow-xl p-4 flex items-start gap-3 pointer-events-auto border ${
                  isAssignment
                    ? 'border-l-4 border-indigo-600 border-slate-200'
                    : isWhatsApp 
                      ? 'border-l-4 border-emerald-500 border-slate-200' 
                      : 'border-l-4 border-[#E11D48] border-slate-200'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  isAssignment
                    ? 'bg-indigo-50 text-indigo-600'
                    : isWhatsApp 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-rose-50 text-[#E11D48]'
                }`}>
                  {isAssignment ? <UserCheck size={16} /> : isWhatsApp ? <MessageSquare size={16} /> : <Clock size={16} />}
                </div>

                <div className="flex-1 min-w-0 text-left">
                  {isAssignment ? (
                    <>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          <span>Nuevo Lead Asignado</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
                        </h4>
                        <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase ml-auto">
                          Asignación
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-800 mt-1 font-bold truncate">
                        {notif.clientName} {notif.phone ? <span className="text-slate-400 font-normal">({notif.phone})</span> : null}
                      </p>
                      {notif.advisorName && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-[9px]">
                          <span className="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded font-semibold border border-indigo-100">
                            Asesor: {notif.advisorName}
                          </span>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-700 mt-1 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                        "{notif.messageText}"
                      </p>
                      <div className="mt-3 flex justify-end items-center gap-2">
                        {notif.leadId ? (
                          <button
                            onClick={() => {
                              handleMarkNotificationAsRead(notif.id, notif.leadId, notif.phone);
                              handleOpenLead360(notif.leadId!, 'datos');
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-3 py-1 rounded-md transition cursor-pointer shadow-xs flex items-center gap-1"
                          >
                            <span>Ver en Cliente 360</span>
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleMarkNotificationAsRead(notif.id, notif.leadId, notif.phone)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[10px] px-2.5 py-1 rounded-md transition cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                    </>
                  ) : isWhatsApp ? (
                    <>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          <span>WhatsApp Nuevo</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        </h4>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase ml-auto">
                          Entrante
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-800 mt-1 font-bold truncate">
                        {notif.clientName} {notif.phone ? <span className="text-slate-400 font-normal">({notif.phone})</span> : null}
                      </p>
                      {notif.advisorName && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-[9px]">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                            Asesor: {notif.advisorName}
                          </span>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                        "{notif.messageText}"
                      </p>
                      <div className="mt-3 flex justify-end items-center gap-2">
                        {notif.leadId ? (
                          <button
                            onClick={() => {
                              handleMarkNotificationAsRead(notif.id, notif.leadId, notif.phone);
                              handleOpenLead360(notif.leadId!, 'whatsapp');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1 rounded-md transition cursor-pointer shadow-xs flex items-center gap-1"
                          >
                            <span>Ver en Chat</span>
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleMarkNotificationAsRead(notif.id, notif.leadId, notif.phone)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-[10px] px-2.5 py-1 rounded-md transition cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                    </>
                  ) : notif.isOverdue ? (
                    <>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-rose-800 flex items-center gap-1.5">
                          <AlertTriangle size={14} className="text-rose-600 animate-pulse shrink-0" />
                          <span>Cita Vencida</span>
                        </h4>
                        <span className="text-[9px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-black uppercase ml-auto">
                          Pasó la hora
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700 mt-1.5 font-semibold leading-relaxed">
                        La cita ({notif.type}) con <strong className="text-slate-900">{notif.clientName}</strong> ha concluido. Por favor selecciona el estado final o reprograma:
                      </p>
                      {notif.dateStr && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 font-medium">
                          <Clock size={10} />
                          <span>Fecha: {notif.dateStr}</span>
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-end flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                        {notif.citaId && (
                          <>
                            <button
                              onClick={() => {
                                handleMarkNotificationAsRead(notif.id);
                                setScreen('agenda');
                              }}
                              className="bg-[#E11D48] hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-md transition shadow-2xs flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw size={11} />
                              <span>Reprogramar</span>
                            </button>
                            <button
                              onClick={() => {
                                handleQuickUpdateCitaStatus(notif.citaId!, 'No asistió', notif.id);
                              }}
                              className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[10px] px-2 py-1 rounded-md transition cursor-pointer"
                            >
                              No asistió
                            </button>
                            <button
                              onClick={() => {
                                handleQuickUpdateCitaStatus(notif.citaId!, 'Cancelada', notif.id);
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[10px] px-2 py-1 rounded-md transition cursor-pointer"
                            >
                              Cancelada
                            </button>
                            <button
                              onClick={() => {
                                handleQuickUpdateCitaStatus(notif.citaId!, 'Realizada', notif.id);
                              }}
                              className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[10px] px-2 py-1 rounded-md transition cursor-pointer"
                            >
                              Realizada
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleMarkNotificationAsRead(notif.id)}
                          className="text-slate-400 hover:text-slate-600 font-semibold text-[10px] px-1.5 py-1 transition cursor-pointer ml-auto"
                        >
                          Descartar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-extrabold text-slate-800">
                          Recordatorio de Cita
                        </h4>
                        <span className="text-[9px] bg-rose-50 text-[#E11D48] px-2 py-0.5 rounded-full font-extrabold uppercase ml-auto">
                          Faltan {notif.timeRemaining}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5 font-semibold leading-relaxed">
                        Tu {notif.type.toLowerCase()} con <strong className="text-slate-800">{notif.clientName}</strong> está por comenzar.
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1.5 font-medium">
                        <MapPin size={10} />
                        <span className="truncate">{notif.location}</span>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => handleMarkNotificationAsRead(notif.id)}
                          className="bg-[#E11D48] hover:bg-rose-700 text-white font-bold text-[10px] px-3 py-1 rounded-md transition cursor-pointer shadow-xs"
                        >
                          Entendido
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => handleMarkNotificationAsRead(notif.id, notif.leadId, notif.phone)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
