import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CalendarRange, Clock, Plus, CheckCircle2, 
  Edit, Trash2, X, Calendar, MapPin, Loader2, Check,
  RotateCcw, Search, Filter, AlertTriangle, ListFilter,
  CheckCircle, CalendarClock, User, UserX, UserCheck
} from 'lucide-react';
import { Cita, Lead, Usuario } from '../types';
import { EmptyState } from './common/EmptyState';
import { subscribeToDbSync, notifyDbChange } from '../lib/databaseSync';

interface AgendaViewProps {
  userRole?: string;
  currentUser?: Usuario | null;
}

export default function AgendaView({ userRole = 'gerencial', currentUser }: AgendaViewProps) {
  const roleLower = (userRole || '').toLowerCase();
  const isAdvisor = roleLower === 'asesor' || roleLower === 'asesor comercial';
  const isChofer = roleLower.includes('chofer') || (currentUser?.role || '').toLowerCase().includes('chofer');
  const currentAdvisorName = (currentUser?.name || (isAdvisor ? 'Andrea Cedeño' : '')).trim();

  const [citas, setCitas] = useState<Cita[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [proyectosList, setProyectosList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  
  // Navigation View Mode
  const [viewTab, setViewTab] = useState<'calendar' | 'list'>('calendar');
  const [listFilter, setListFilter] = useState<'todas' | 'pendientes' | 'vencidas' | 'noasistio' | 'reprogramadas' | 'realizadas' | 'canceladas'>('todas');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReprogramming, setIsReprogramming] = useState(false);
  const [editingCita, setEditingCita] = useState<Cita | null>(null);
  const [citaLeadId, setCitaLeadId] = useState<number | ''>('');
  const [citaType, setCitaType] = useState('Visita de Campo');
  const [citaDate, setCitaDate] = useState('');
  const [citaLocation, setCitaLocation] = useState('');
  const [citaStatus, setCitaStatus] = useState('Programada');
  const [saving, setSaving] = useState(false);

  const daysInMonth = 31;
  const firstDayOffset = 2; // Tuesday is 1st of July 2026

  // Helper to parse date back for datetime-local input (YYYY-MM-DDTHH:MM)
  const parseCitaDateForInput = (dateStr: string): string => {
    if (!dateStr || typeof dateStr !== 'string') {
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      return new Date(now.getTime() - offset).toISOString().slice(0, 16);
    }

    const str = dateStr.trim();
    
    // Case 1: Standard ISO like YYYY-MM-DDTHH:mm
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
      return str.slice(0, 16);
    }

    // Case 2: YYYY-MM-DD HH:mm
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(str)) {
      return str.slice(0, 10) + 'T' + str.slice(11, 16);
    }

    const monthMap: Record<string, string> = {
      ene: '01', jan: '01', feb: '02', mar: '03', abr: '04', apr: '04',
      may: '05', jun: '06', jul: '07', ago: '08', aug: '08', sep: '09',
      sept: '09', oct: '10', nov: '11', dic: '12', dec: '12'
    };

    const lower = str.toLowerCase();
    const isPM = lower.includes('p. m.') || lower.includes('p.m.') || lower.includes('pm');
    const isAM = lower.includes('a. m.') || lower.includes('a.m.') || lower.includes('am');

    const nums = str.match(/\d+/g);
    if (nums && nums.length >= 2) {
      let year = String(new Date().getFullYear());
      let month = '01';
      let day = '01';
      let hour = '10';
      let minute = '00';

      let foundMonth = false;
      for (const [key, val] of Object.entries(monthMap)) {
        if (lower.includes(key)) {
          month = val;
          foundMonth = true;
          break;
        }
      }

      const yearIndex = nums.findIndex(n => n.length === 4);
      if (yearIndex !== -1) {
        year = nums[yearIndex];
        if (yearIndex > 0) {
          day = nums[0];
        }
        const remaining = nums.filter((_, idx) => idx !== yearIndex && idx !== 0);
        if (!foundMonth && remaining.length > 0) {
          month = String(Number(remaining[0])).padStart(2, '0');
          remaining.shift();
        }
        if (remaining.length >= 2) {
          hour = remaining[0];
          minute = remaining[1];
        } else if (remaining.length === 1) {
          hour = remaining[0];
        }
      } else {
        if (nums.length >= 3) {
          day = nums[0];
          month = String(Number(nums[1])).padStart(2, '0');
          year = nums[2].length === 2 ? '20' + nums[2] : nums[2];
          if (nums.length >= 5) {
            hour = nums[3];
            minute = nums[4];
          }
        }
      }

      let h = parseInt(hour, 10);
      if (isNaN(h)) h = 10;
      if (isPM && h < 12) h += 12;
      if (isAM && h === 12) h = 0;

      const formattedDay = String(parseInt(day, 10) || 1).padStart(2, '0');
      const formattedMonth = String(parseInt(month, 10) || 1).padStart(2, '0');
      const formattedHour = String(h).padStart(2, '0');
      const formattedMin = String(parseInt(minute, 10) || 0).padStart(2, '0');

      return `${year}-${formattedMonth}-${formattedDay}T${formattedHour}:${formattedMin}`;
    }

    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  // Helper to check if a cita's scheduled time is in the past
  const isCitaPast = (dateStr: string): boolean => {
    try {
      const iso = parseCitaDateForInput(dateStr);
      const dateObj = new Date(iso);
      const now = new Date();
      return dateObj < now;
    } catch (e) {
      return false;
    }
  };

  const isCitaOverdue = (cita: Cita): boolean => {
    return cita.status === 'Vencida' || (cita.status === 'Programada' && isCitaPast(cita.date));
  };

  const getSuggestedFutureDate = (existingDateStr: string): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const timezoneOffset = tomorrow.getTimezoneOffset() * 60000;
    return new Date(tomorrow.getTime() - timezoneOffset).toISOString().slice(0, 16);
  };

  const getCitaDay = (dateStr: string): number | null => {
    try {
      if (!dateStr) return null;
      if (dateStr.includes('T')) {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length >= 3) {
          return parseInt(parts[2]);
        }
      }
      if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        const parts = dateStr.split('-');
        return parseInt(parts[2]);
      }
      
      const normalized = dateStr.toLowerCase();
      const yearMatch = normalized.match(/\b\d{4}\b/);
      let textWithoutYear = normalized;
      if (yearMatch) {
        textWithoutYear = textWithoutYear.replace(yearMatch[0], '');
      }
      const smallNumbers = textWithoutYear.match(/\b\d{1,2}\b/g);
      if (smallNumbers && smallNumbers.length >= 1) {
        return parseInt(smallNumbers[0]);
      }
    } catch (e) {
      console.error('Error parsing day for calendar grid:', e);
    }
    return null;
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/citas').then(res => res.json()).catch(() => []),
      fetch('/api/leads').then(res => res.json()).catch(() => []),
      fetch('/api/urbanizaciones').then(res => res.json()).catch(() => [])
    ])
      .then(([cList, lList, pList]) => {
        setCitas(Array.isArray(cList) ? cList : []);
        setLeads(Array.isArray(lList) ? lList : []);
        if (Array.isArray(pList) && pList.length > 0) {
          const names = pList.map((p: any) => (p.nombre || p.name || '').trim()).filter(Boolean);
          if (names.length > 0) {
            setProyectosList(Array.from(new Set(names)));
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading agenda data:', err);
        setCitas([]);
        setLeads([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();

    const unsubscribe = subscribeToDbSync(['citas', 'leads', 'all'], () => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleOpenModal = (cita?: any, modeReprogram: boolean = false) => {
    if (isChofer) return;
    setIsReprogramming(modeReprogram);
    const isValidCita = cita && typeof cita === 'object' && 'id' in cita && typeof (cita as any).preventDefault !== 'function';
    if (isValidCita) {
      setEditingCita(cita);
      setCitaLeadId(cita.lead_id || '');
      const validTypes = ['Visita de Campo', 'Reunión en Oficina', 'Videollamada', 'Llamada de Seguimiento'];
      const matched = validTypes.find(t => t.toLowerCase() === String(cita.type || '').trim().toLowerCase());
      setCitaType(matched || 'Visita de Campo');
      setCitaLocation(cita.location || proyectosList[0] || 'Vista del Valle');
      setCitaStatus('Programada'); // Reset to Programada for the new/updated appointment
      setCitaDate(modeReprogram ? getSuggestedFutureDate(cita.date) : parseCitaDateForInput(cita.date));
    } else {
      setEditingCita(null);
      const firstLead = leads[0];
      setCitaLeadId(firstLead?.id || '');
      setCitaType('Visita de Campo');
      setCitaLocation(firstLead?.project || proyectosList[0] || 'Vista del Valle');
      setCitaStatus('Programada');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);
      const timezoneOffset = tomorrow.getTimezoneOffset() * 60000;
      setCitaDate(new Date(tomorrow.getTime() - timezoneOffset).toISOString().slice(0, 16));
    }
    setIsModalOpen(true);
  };

  const handleSaveCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChofer) return;
    if (!citaDate || !citaType || !citaLocation) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    setSaving(true);

    const dateObj = new Date(citaDate);
    const now = new Date();
    // Allow a 60-second tolerance for time spent filling the form
    if (!isNaN(dateObj.getTime()) && dateObj.getTime() < now.getTime() - 60000) {
      setSaving(false);
      alert('No es posible agendar citas con fecha y hora anteriores a la actual. Por favor seleccione una fecha y hora futura.');
      return;
    }

    let formattedDate = citaDate;
    try {
      if (!isNaN(dateObj.getTime())) {
        formattedDate = dateObj.toLocaleDateString('es-EC', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (e) {}

    try {
      if (isReprogramming && editingCita && editingCita.id) {
        // 1. Mark previous cita as 'Reprogramada'
        await fetch(`/api/citas/${editingCita.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: editingCita.lead_id ? Number(editingCita.lead_id) : null,
            date: editingCita.date,
            type: editingCita.type,
            location: editingCita.location,
            status: 'Reprogramada'
          })
        });

        // 2. Create the brand NEW appointment
        const resNew = await fetch('/api/citas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: citaLeadId ? Number(citaLeadId) : null,
            date: formattedDate,
            type: citaType,
            location: citaLocation,
            status: 'Programada'
          })
        });
        const dataNew = await resNew.json();
        setSaving(false);
        if (dataNew.success) {
          notifyDbChange('citas');
          notifyDbChange('leads');
          setIsModalOpen(false);
          loadData();
        } else {
          alert('Hubo un error al reprogramar la cita.');
        }
      } else {
        // Standard Edit or Create
        const isEditing = Boolean(editingCita && editingCita.id && Number(editingCita.id) > 0);
        const url = isEditing ? `/api/citas/${editingCita!.id}` : '/api/citas';
        const method = isEditing ? 'PUT' : 'POST';

        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: citaLeadId ? Number(citaLeadId) : null,
            date: formattedDate,
            type: citaType,
            location: citaLocation,
            status: isEditing ? (editingCita?.status || 'Programada') : 'Programada'
          })
        });
        const data = await res.json();
        setSaving(false);
        if (data.success) {
          notifyDbChange('citas');
          notifyDbChange('leads');
          setIsModalOpen(false);
          loadData();
        } else {
          alert('Hubo un error al guardar la cita.');
        }
      }
    } catch (err) {
      console.error(err);
      setSaving(false);
      alert('Error de conexión.');
    }
  };

  const handleUpdateStatus = (cita: Cita, newStatus: string) => {
    if (isChofer) return;
    if (!cita || !cita.id || Number(cita.id) <= 0) {
      alert('ID de cita no válido.');
      return;
    }

    fetch(`/api/citas/${cita.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: cita.lead_id ? Number(cita.lead_id) : null,
        date: cita.date,
        type: cita.type,
        location: cita.location,
        status: newStatus
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          notifyDbChange('citas');
          loadData();
        } else {
          alert('Error al actualizar el estado de la cita.');
        }
      })
      .catch(err => {
        console.error(err);
        alert('Error de conexión.');
      });
  };

  const handleDeleteCita = (citaId: number) => {
    if (isChofer) return;
    if (!citaId || Number(citaId) <= 0) return;
    if (!confirm('¿Está seguro de que desea eliminar esta cita?')) return;
    fetch(`/api/citas/${citaId}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          notifyDbChange('citas');
          loadData();
        } else {
          alert('Error al eliminar la cita.');
        }
      })
      .catch(err => {
        console.error(err);
        alert('Error de conexión.');
      });
  };

  // Filtered Citas for List View
  const filteredCitas = useMemo(() => {
    return citas.filter(c => {
      const isPast = isCitaPast(c.date);
      const isOverdue = isCitaOverdue(c);
      const isPending = c.status === 'Programada' && !isPast;

      // Filter by Status Tab
      if (listFilter === 'pendientes' && !isPending) return false;
      if (listFilter === 'vencidas' && !isOverdue) return false;
      if (listFilter === 'noasistio' && c.status !== 'No asistió') return false;
      if (listFilter === 'reprogramadas' && c.status !== 'Reprogramada') return false;
      if (listFilter === 'realizadas' && c.status !== 'Realizada') return false;
      if (listFilter === 'canceladas' && c.status !== 'Cancelada') return false;

      // Filter by Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchedLead = leads.find(l => l.id === c.lead_id);
      const clientName = matchedLead ? matchedLead.name.toLowerCase() : 'cliente general';
      return (
        clientName.includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q) ||
        c.date.toLowerCase().includes(q)
      );
    });
  }, [citas, leads, listFilter, searchQuery]);

  // Statistics counters
  const stats = useMemo(() => {
    let pendientesCount = 0;
    let vencidasCount = 0;
    let noAsistioCount = 0;
    let reprogramadasCount = 0;
    let realizadasCount = 0;
    let canceladasCount = 0;

    citas.forEach(c => {
      if (c.status === 'Realizada') {
        realizadasCount++;
      } else if (c.status === 'Cancelada') {
        canceladasCount++;
      } else if (c.status === 'No asistió') {
        noAsistioCount++;
      } else if (c.status === 'Reprogramada') {
        reprogramadasCount++;
      } else if (isCitaOverdue(c)) {
        vencidasCount++;
      } else {
        pendientesCount++;
      }
    });

    return { 
      total: citas.length, 
      pendientesCount, 
      vencidasCount, 
      noAsistioCount,
      reprogramadasCount,
      realizadasCount, 
      canceladasCount 
    };
  }, [citas]);

  const weekdays = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  // Fill calendar grid cells
  const gridCells = [];
  for (let i = 0; i < firstDayOffset; i++) {
    gridCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    gridCells.push(d);
  }

  // Find events for the selected day in Calendar View
  const selectedDayEvents = citas.filter(c => getCitaDay(c.date) === selectedDay);
  const daysWithEvents = new Set(citas.map(c => getCitaDay(c.date)).filter(d => d !== null) as number[]);

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 font-display">
              {isChofer ? 'Agenda de Visitas a Proyectos' : 'Agenda y Seguimientos'}
            </h2>
            {isChofer ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <CalendarRange size={12} className="text-amber-600" />
                <span>Modo Solo Lectura • Chofer de Logística</span>
              </span>
            ) : isAdvisor ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                <UserCheck size={12} className="text-[#E11D48]" />
                <span>Mis Citas y Seguimientos: {currentAdvisorName}</span>
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-400">
            {isChofer
              ? 'Consulta las citas y visitas de campo agendadas para traslados y logística a proyectos (modo solo lectura)'
              : isAdvisor 
              ? 'Organiza tus visitas a proyectos, llamadas de seguimiento y recordatorios' 
              : 'Organiza visitas presenciales, llamadas de recordatorio de cuotas y reprogramación de citas'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewTab('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewTab === 'calendar' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar size={14} />
              <span>Vista Calendario</span>
            </button>
            <button
              onClick={() => setViewTab('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                viewTab === 'list' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListFilter size={14} />
              <span>Listado General ({citas.length})</span>
            </button>
          </div>

          {!isChofer && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition duration-150 shadow-xs cursor-pointer"
            >
              <Plus size={15} />
              <span>Planificar Cita</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => { setViewTab('list'); setListFilter('todas'); }}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            viewTab === 'list' && listFilter === 'todas' 
              ? 'bg-rose-50 border-[#E11D48] ring-1 ring-[#E11D48]' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Total Citas</span>
            <Calendar size={13} className="text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1">{stats.total}</div>
        </div>

        <div 
          onClick={() => { setViewTab('list'); setListFilter('pendientes'); }}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            viewTab === 'list' && listFilter === 'pendientes' 
              ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Pendientes</span>
            <Clock size={13} className="text-amber-500" />
          </div>
          <div className="text-lg font-bold text-amber-600 mt-1">{stats.pendientesCount}</div>
        </div>

        <div 
          onClick={() => { setViewTab('list'); setListFilter('vencidas'); }}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            viewTab === 'list' && listFilter === 'vencidas' 
              ? 'bg-rose-50 border-[#E11D48] ring-1 ring-[#E11D48]' 
              : stats.vencidasCount > 0
              ? 'bg-rose-50/70 border-rose-300 hover:border-rose-400'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Vencidas</span>
            <AlertTriangle size={13} className="text-rose-600" />
          </div>
          <div className="text-lg font-bold text-[#E11D48] mt-1 flex items-center gap-1.5">
            <span>{stats.vencidasCount}</span>
            {stats.vencidasCount > 0 && (
              <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">Por actuar</span>
            )}
          </div>
        </div>

        <div 
          onClick={() => { setViewTab('list'); setListFilter('noasistio'); }}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            viewTab === 'list' && listFilter === 'noasistio' 
              ? 'bg-orange-50 border-orange-500 ring-1 ring-orange-500' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>No Asistió</span>
            <UserX size={13} className="text-orange-500" />
          </div>
          <div className="text-lg font-bold text-orange-600 mt-1">{stats.noAsistioCount}</div>
        </div>

        <div 
          onClick={() => { setViewTab('list'); setListFilter('reprogramadas'); }}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            viewTab === 'list' && listFilter === 'reprogramadas' 
              ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Reprogramadas</span>
            <RotateCcw size={13} className="text-purple-500" />
          </div>
          <div className="text-lg font-bold text-purple-700 mt-1">{stats.reprogramadasCount}</div>
        </div>

        <div 
          onClick={() => { setViewTab('list'); setListFilter('realizadas'); }}
          className={`p-3 rounded-xl border transition cursor-pointer ${
            viewTab === 'list' && listFilter === 'realizadas' 
              ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500' 
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            <span>Realizadas</span>
            <CheckCircle size={13} className="text-emerald-500" />
          </div>
          <div className="text-lg font-bold text-emerald-700 mt-1">{stats.realizadasCount}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-[#E11D48]" size={32} />
        </div>
      ) : viewTab === 'calendar' ? (
        /* CALENDAR VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Calendar Grid Card */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm">Julio 2026</h3>
              <span className="text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold uppercase">
                Zona Horaria: Santo Domingo
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {weekdays.map(d => <span key={d}>{d}</span>)}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {gridCells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="aspect-square bg-slate-50/50 rounded-lg" />;
                }

                const hasEvents = daysWithEvents.has(day);
                const isSelected = selectedDay === day;
                const isToday = day === new Date().getDate();

                return (
                  <button
                    key={`day-${day}`}
                    onClick={() => setSelectedDay(day)}
                    className={`
                      aspect-square rounded-lg flex flex-col justify-between p-1.5 text-xs font-semibold border transition relative cursor-pointer
                      ${isSelected 
                        ? 'border-rose-600 bg-rose-50/50 text-rose-950' 
                        : isToday
                        ? 'border-slate-900 bg-slate-950 text-white font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'}
                    `}
                  >
                    <div className="flex justify-between w-full items-center">
                      <span>{day}</span>
                      {isToday && (
                        <span className={`text-[8px] px-1 rounded ${isToday && !isSelected ? 'bg-white text-slate-950' : 'bg-rose-900 text-white'}`}>Hoy</span>
                      )}
                    </div>
                    
                    {hasEvents && (
                      <span className={`w-1.5 h-1.5 rounded-full self-center ${isToday && !isSelected ? 'bg-white' : 'bg-[#E11D48]'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Agenda Information */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
              Actividades del {selectedDay} de Julio
            </h3>

            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                <CalendarRange size={24} className="mx-auto text-slate-300 mb-2" />
                No tienes seguimientos planificados para esta fecha.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedDayEvents.map((ev) => {
                  const matchedLead = leads.find(l => l.id === ev.lead_id);
                  const clientName = matchedLead ? matchedLead.name : 'Cliente General';
                  const overdue = isCitaOverdue(ev);

                  return (
                    <div 
                      key={ev.id} 
                      className={`border rounded-xl p-3.5 transition flex justify-between items-start gap-2 ${
                        overdue 
                          ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200' 
                          : ev.status === 'No asistió'
                          ? 'bg-orange-50/50 border-orange-200'
                          : ev.status === 'Reprogramada'
                          ? 'bg-purple-50/50 border-purple-200'
                          : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`border-l-4 ${overdue ? 'border-rose-600' : 'border-[#E11D48]'} pl-3 py-0.5 space-y-2 text-xs flex-1`}>
                        <div className="flex justify-between items-start flex-wrap gap-1">
                          <span className="font-bold text-slate-800 uppercase tracking-tight">{clientName}</span>
                          <span className="bg-slate-100 text-slate-800 font-bold text-[9px] px-2 py-0.5 rounded flex items-center gap-1">
                            <Clock size={10} />
                            <span>{ev.date.split(',')[1] || ev.date}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400" />
                          <span>{ev.location}</span>
                        </p>
                        
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <span className="inline-block text-[9px] font-bold uppercase text-[#E11D48] bg-rose-50 px-1.5 py-0.5 rounded tracking-wide border border-rose-100">
                            {ev.type}
                          </span>
                          
                          <span className={`inline-block text-[9px] font-bold uppercase px-2 py-0.5 rounded tracking-wide border ${
                            ev.status === 'Realizada'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : ev.status === 'Cancelada'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : ev.status === 'No asistió'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : ev.status === 'Reprogramada'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : overdue
                              ? 'bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            {overdue ? '⚠️ Vencida (Pasó la hora)' : ev.status}
                          </span>
                        </div>

                        {/* Status Action Buttons for Overdue Appointments */}
                        {!isChofer && overdue && (
                          <div className="pt-2 border-t border-rose-200/60 mt-2 space-y-1.5">
                            <div className="text-[10px] font-bold text-rose-800 flex items-center gap-1">
                              <AlertTriangle size={11} className="text-rose-600" />
                              <span>Cita vencida. Cambiar de estado o reprogramar:</span>
                            </div>
                            <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                              <button
                                onClick={() => handleOpenModal(ev, true)}
                                className="bg-[#E11D48] hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                title="Reprogramar (crea una nueva cita)"
                              >
                                <RotateCcw size={11} />
                                <span>Reprogramar</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(ev, 'No asistió')}
                                className="bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold text-[10px] px-2 py-1 rounded-md border border-orange-200 transition cursor-pointer"
                                title="Marcar como No asistió"
                              >
                                <span>No asistió</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(ev, 'Cancelada')}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] px-2 py-1 rounded-md border border-slate-200 transition cursor-pointer"
                                title="Marcar como Cancelada"
                              >
                                <span>Cancelada</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(ev, 'Realizada')}
                                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[10px] px-2 py-1 rounded-md border border-emerald-200 transition cursor-pointer"
                                title="Marcar como Realizada"
                              >
                                <span>Realizada</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {!isChofer && (
                        <div className="flex flex-col gap-1">
                          {!overdue && ev.status === 'Programada' && (
                            <button
                              onClick={() => handleUpdateStatus(ev, 'Realizada')}
                              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Marcar como Realizada"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenModal(ev, false)}
                            className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                            title="Editar Cita"
                          >
                            <Edit size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteCita(ev.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Eliminar Cita"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!isChofer ? (
              <button 
                onClick={() => handleOpenModal()}
                className="w-full mt-4 border border-dashed border-slate-300 text-slate-600 hover:text-slate-800 hover:bg-slate-50 font-bold text-xs py-2 rounded-lg transition text-center cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus size={13} />
                <span>Planificar Seguimiento</span>
              </button>
            ) : (
              <div className="mt-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-center text-[11px] text-slate-500 font-medium">
                Visualización de itinerario en modo solo lectura para traslados.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* GENERAL LIST VIEW (PENDIENTES, VENCIDAS, NO ASISTIO, REPROGRAMADAS, REALIZADAS, CANCELADAS) */
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          {/* Filters & Search Header */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 text-xs font-semibold">
              <button
                onClick={() => setListFilter('todas')}
                className={`px-3 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap ${
                  listFilter === 'todas'
                    ? 'bg-slate-900 text-white border-slate-900 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Todas ({citas.length})
              </button>
              <button
                onClick={() => setListFilter('pendientes')}
                className={`px-3 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap ${
                  listFilter === 'pendientes'
                    ? 'bg-amber-500 text-white border-amber-500 font-bold'
                    : 'bg-slate-50 text-amber-700 border-amber-200 hover:bg-amber-50'
                }`}
              >
                Pendientes ({stats.pendientesCount})
              </button>
              <button
                onClick={() => setListFilter('vencidas')}
                className={`px-3 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  listFilter === 'vencidas'
                    ? 'bg-[#E11D48] text-white border-[#E11D48] font-bold'
                    : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                }`}
              >
                <AlertTriangle size={12} />
                <span>Vencidas ({stats.vencidasCount})</span>
              </button>
              <button
                onClick={() => setListFilter('noasistio')}
                className={`px-3 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap ${
                  listFilter === 'noasistio'
                    ? 'bg-orange-500 text-white border-orange-500 font-bold'
                    : 'bg-slate-50 text-orange-700 border-orange-200 hover:bg-orange-50'
                }`}
              >
                No Asistió ({stats.noAsistioCount})
              </button>
              <button
                onClick={() => setListFilter('reprogramadas')}
                className={`px-3 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap ${
                  listFilter === 'reprogramadas'
                    ? 'bg-purple-600 text-white border-purple-600 font-bold'
                    : 'bg-slate-50 text-purple-700 border-purple-200 hover:bg-purple-50'
                }`}
              >
                Reprogramadas ({stats.reprogramadasCount})
              </button>
              <button
                onClick={() => setListFilter('realizadas')}
                className={`px-3 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap ${
                  listFilter === 'realizadas'
                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                    : 'bg-slate-50 text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Realizadas ({stats.realizadasCount})
              </button>
              <button
                onClick={() => setListFilter('canceladas')}
                className={`px-3 py-1.5 rounded-lg border transition cursor-pointer whitespace-nowrap ${
                  listFilter === 'canceladas'
                    ? 'bg-slate-600 text-white border-slate-600 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Canceladas ({stats.canceladasCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-1.5 w-full md:w-64 text-xs">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, tipo, ubicación..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-slate-700 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Table List of All Citas */}
          {filteredCitas.length === 0 ? (
            <EmptyState
              title="No hay citas en este listado"
              description="No se encontraron citas o seguimientos que coincidan con el filtro seleccionado."
              icon={CalendarClock}
              actionText={isChofer ? undefined : "Planificar Nueva Cita"}
              onAction={isChofer ? undefined : () => handleOpenModal()}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left text-slate-500 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400 font-bold">
                    <th className="py-3 px-3">Cliente / Lead</th>
                    <th className="py-3 px-3">Tipo de Cita</th>
                    <th className="py-3 px-3">Fecha y Hora</th>
                    <th className="py-3 px-3">Ubicación / Enlace</th>
                    <th className="py-3 px-3 text-center">Estado</th>
                    {!isChofer && <th className="py-3 px-3 text-right">Acciones y Cambio de Estado</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredCitas.map((c) => {
                    const matchedLead = leads.find(l => l.id === c.lead_id);
                    const clientName = matchedLead ? matchedLead.name : 'Cliente General';
                    const projectName = matchedLead ? matchedLead.project : null;
                    const overdue = isCitaOverdue(c);

                    return (
                      <tr key={c.id} className={`border-b border-slate-100 last:border-0 transition ${
                        overdue ? 'bg-rose-50/50 hover:bg-rose-50/80 font-medium' : 'hover:bg-slate-50/50'
                      }`}>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            <User size={13} className="text-slate-400" />
                            <span>{clientName}</span>
                          </div>
                          {projectName && (
                            <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 ml-4">
                              Proyecto: {projectName}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="inline-block text-[10px] font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                            {c.type}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 font-semibold text-slate-700">
                          <div className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-400" />
                            <span>{c.date}</span>
                          </div>
                          {overdue && (
                            <span className="text-[9px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                              <AlertTriangle size={10} />
                              <span>Vencida (pasó su hora)</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-slate-600">
                          <div className="flex items-center gap-1 max-w-xs truncate">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{c.location}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                            c.status === 'Realizada'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : c.status === 'Cancelada'
                              ? 'bg-slate-100 text-slate-600 border-slate-200'
                              : c.status === 'No asistió'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : c.status === 'Reprogramada'
                              ? 'bg-purple-100 text-purple-800 border-purple-200'
                              : overdue
                              ? 'bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}>
                            {overdue ? '⚠️ Vencida' : c.status}
                          </span>
                        </td>

                        {!isChofer && (
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end flex-wrap gap-1.5">
                              {/* Actions for overdue appointment: Reprogramar, No asistió, Cancelada */}
                              {overdue && (
                                <>
                                  <button
                                    onClick={() => handleOpenModal(c, true)}
                                    className="bg-[#E11D48] hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 shadow-2xs transition cursor-pointer"
                                    title="Reprogramar (crea una nueva cita)"
                                  >
                                    <RotateCcw size={11} />
                                    <span>Reprogramar</span>
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(c, 'No asistió')}
                                    className="bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold text-[10px] px-2 py-1 rounded-md border border-orange-200 transition cursor-pointer"
                                    title="Marcar como No asistió"
                                  >
                                    <span>No asistió</span>
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(c, 'Cancelada')}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] px-2 py-1 rounded-md border border-slate-200 transition cursor-pointer"
                                    title="Marcar como Cancelada"
                                  >
                                    <span>Cancelada</span>
                                  </button>
                                </>
                              )}

                              {!overdue && (c.status === 'Programada' || c.status === 'Cancelada' || c.status === 'No asistió') && (
                                <button
                                  onClick={() => handleOpenModal(c, true)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 transition flex items-center gap-1"
                                  title="Reprogramar cita"
                                >
                                  <RotateCcw size={11} />
                                  <span>Reprogramar</span>
                                </button>
                              )}

                              {!overdue && c.status === 'Programada' && (
                                <button
                                  onClick={() => handleUpdateStatus(c, 'Realizada')}
                                  className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                  title="Marcar como Realizada"
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenModal(c, false)}
                                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                title="Editar Cita"
                              >
                                <Edit size={14} />
                              </button>

                              <button
                                onClick={() => handleDeleteCita(c.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Eliminar Cita"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PLANIFICAR / EDITAR / REPROGRAMAR CITA MODAL */}
      {isModalOpen && !isChofer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="h-14 bg-gradient-to-r from-rose-900 to-[#E11D48] px-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <CalendarClock size={18} />
                <h3 className="font-bold text-sm tracking-tight font-display">
                  {isReprogramming 
                    ? '🔄 Reprogramar Cita / Visita' 
                    : editingCita 
                    ? 'Editar Cita / Visita' 
                    : 'Planificar Nuevo Seguimiento'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1 rounded-lg text-rose-100 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveCita} className="p-6 space-y-4 text-left">
              {isReprogramming && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Modo Reprogramación Activo</strong>
                    Selecciona una nueva fecha y hora futura para reactivar la cita con el cliente.
                  </div>
                </div>
              )}

              {/* Cliente Selector */}
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Cliente / Lead *</label>
                <select
                  value={citaLeadId}
                  onChange={(e) => setCitaLeadId(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-850 outline-none focus:ring-1 focus:ring-[#E11D48] cursor-pointer"
                  required
                >
                  <option value="" disabled>Seleccione un cliente...</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.project})</option>
                  ))}
                </select>
              </div>

              {/* Tipo de cita */}
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Tipo de Cita *</label>
                <select
                  value={citaType}
                  onChange={(e) => setCitaType(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-850 outline-none focus:ring-1 focus:ring-[#E11D48] cursor-pointer"
                  required
                >
                  <option value="Visita de Campo">Visita de Campo</option>
                  <option value="Reunión en Oficina">Reunión en Oficina</option>
                  <option value="Videollamada">Videollamada</option>
                  <option value="Llamada de Seguimiento">Llamada de Seguimiento</option>
                </select>
              </div>

              {/* Nueva Fecha y Hora */}
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-600 uppercase text-[10px]">
                  {isReprogramming ? 'Nueva Fecha y Hora *' : 'Fecha y Hora *'}
                </label>
                <input
                  type="datetime-local"
                  value={citaDate}
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  onChange={(e) => setCitaDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-850 outline-none focus:ring-1 focus:ring-[#E11D48] font-medium"
                  required
                />
              </div>

              {/* Ubicacion / Proyecto */}
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Ubicación / Proyecto *</label>
                <select
                  value={citaLocation || (proyectosList[0] || 'Vista del Valle')}
                  onChange={(e) => setCitaLocation(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-850 outline-none focus:ring-1 focus:ring-[#E11D48] cursor-pointer"
                  required
                >
                  {proyectosList.length > 0 ? (
                    proyectosList.map((pName) => (
                      <option key={pName} value={pName}>
                        🏡 {pName}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Vista del Valle">🏡 Vista del Valle</option>
                      <option value="Colinas del Sol">🏡 Colinas del Sol</option>
                      <option value="Altos del Valle">🏡 Altos del Valle</option>
                      <option value="Prados del Río">🏡 Prados del Río</option>
                      <option value="Bosques de la Costa">🏡 Bosques de la Costa</option>
                      <option value="Mirador del Valle">🏡 Mirador del Valle</option>
                    </>
                  )}
                </select>
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#E11D48] hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>{isReprogramming ? 'Guardar Reprogramación' : editingCita ? 'Guardar Cambios' : 'Planificar'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
