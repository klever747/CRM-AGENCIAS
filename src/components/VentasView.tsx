import React, { useState, useEffect, useMemo } from 'react';
import { 
  CircleDollarSign, Search, Filter, Plus, Eye, Download, 
  Building2, User, Calendar, CheckCircle2, RotateCcw, 
  FileCheck, BadgePercent, FileText, X, Printer, MapPin,
  TrendingUp, ShieldCheck, UserCheck, AlertCircle
} from 'lucide-react';
import { Venta, Usuario, Lead } from '../types';
import { formatCurrency } from '../lib/utils';

interface VentasViewProps {
  userRole?: string;
  currentUser?: Usuario | null;
  onRefreshLeads?: () => void;
}

export default function VentasView({ 
  userRole = 'gerencial', 
  currentUser,
  onRefreshLeads 
}: VentasViewProps) {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('Todos');
  const [selectedAdvisor, setSelectedAdvisor] = useState('Todos');
  const [selectedStatus, setSelectedStatus] = useState('Todos');

  // Modal states
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isNewVentaModalOpen, setIsNewVentaModalOpen] = useState(false);

  // New Venta Form state
  const [formClient, setFormClient] = useState('');
  const [formProject, setFormProject] = useState('Ciudad Verde Norte');
  const [formLot, setFormLot] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formDown, setFormDown] = useState('');
  const [formFinancing, setFormFinancing] = useState('');
  const [formCloseDate, setFormCloseDate] = useState('');
  const [formAdvisor, setFormAdvisor] = useState('');
  const [formAgency, setFormAgency] = useState('Agencia Quito Norte');
  const [formStatus, setFormStatus] = useState('Cerrada y Escriturada');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleLower = (userRole || '').toLowerCase().trim();
  const isAdmin = roleLower === 'admin' || roleLower.includes('administrador') || roleLower.includes('super admin');
  const isAdvisor = !isAdmin && (userRole === 'asesor' || roleLower.includes('asesor'));
  const currentAdvisorName = (currentUser?.name || (isAdvisor ? 'Andrea Cedeño' : '')).trim();

  // Load ventas from API
  const fetchVentas = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/ventas');
      const data = await res.json();
      if (Array.isArray(data)) {
        setVentas(data);
      }
    } catch (err) {
      console.error('Error fetching ventas:', err);
    } finally {
      setLoading(false);
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  useEffect(() => {
    fetchVentas();
  }, []);

  // Pre-fill advisor in form and filter if advisor role
  useEffect(() => {
    if (isAdvisor && currentAdvisorName) {
      setFormAdvisor(currentAdvisorName);
      setSelectedAdvisor(currentAdvisorName);
    } else {
      setSelectedAdvisor('Todos');
    }
  }, [isAdvisor, currentAdvisorName]);

  // Unique projects and advisors for filter dropdowns
  const uniqueProjects = useMemo(() => {
    const set = new Set<string>();
    ventas.forEach(v => {
      if (v.project && v.project.trim()) set.add(v.project.trim());
    });
    return Array.from(set).sort();
  }, [ventas]);

  const uniqueAdvisors = useMemo(() => {
    const set = new Set<string>();
    ventas.forEach(v => {
      if (v.advisor && v.advisor.trim()) set.add(v.advisor.trim());
    });
    return Array.from(set).sort();
  }, [ventas]);

  // Scoped dataset for role
  const roleFilteredVentas = useMemo(() => {
    return ventas.filter(v => {
      if (isAdvisor && currentAdvisorName) {
        // Asesor sees their own sales
        return v.advisor && v.advisor.toLowerCase() === currentAdvisorName.toLowerCase();
      }
      return true;
    });
  }, [ventas, isAdvisor, currentAdvisorName]);

  // Filtered dataset for display
  const displayVentas = useMemo(() => {
    return roleFilteredVentas.filter(v => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const clientMatch = (v.client || '').toLowerCase().includes(q);
        const lotMatch = (v.lot || '').toLowerCase().includes(q);
        const projectMatch = (v.project || '').toLowerCase().includes(q);
        const advisorMatch = (v.advisor || '').toLowerCase().includes(q);
        const agencyMatch = (v.agency || '').toLowerCase().includes(q);
        if (!clientMatch && !lotMatch && !projectMatch && !advisorMatch && !agencyMatch) {
          return false;
        }
      }

      // Project filter
      if (selectedProject !== 'Todos' && v.project !== selectedProject) {
        return false;
      }

      // Advisor filter (for admins or when enabled)
      if (!isAdvisor && selectedAdvisor !== 'Todos' && v.advisor !== selectedAdvisor) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'Todos' && v.status !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [roleFilteredVentas, searchQuery, selectedProject, selectedAdvisor, selectedStatus, isAdvisor]);

  // Calculated Metrics
  const stats = useMemo(() => {
    const totalCount = displayVentas.length;
    const totalValue = displayVentas.reduce((acc, v) => acc + (Number(v.value) || 0), 0);
    const totalDown = displayVentas.reduce((acc, v) => acc + (Number(v.down) || 0), 0);
    const totalFinancing = displayVentas.reduce((acc, v) => acc + (Number(v.financing) || 0), 0);
    const avgTicket = totalCount > 0 ? totalValue / totalCount : 0;
    // Estimated commission (2.5% standard brokerage)
    const estimatedCommission = totalValue * 0.025;

    return {
      totalCount,
      totalValue,
      totalDown,
      totalFinancing,
      avgTicket,
      estimatedCommission
    };
  }, [displayVentas]);

  // Handler for New Venta submit
  const handleCreateVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClient.trim() || !formLot.trim() || !formValue) {
      alert('Por favor complete el nombre del cliente, lote y valor de la venta.');
      return;
    }

    const val = Number(formValue) || 0;
    const downVal = formDown ? Number(formDown) : val * 0.20;
    const finVal = formFinancing ? Number(formFinancing) : val - downVal;

    setIsSubmitting(true);
    try {
      const payload = {
        client: formClient.trim(),
        project: formProject,
        lot: formLot.trim(),
        value: val,
        down: downVal,
        financing: finVal,
        close_date: formCloseDate || new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }),
        advisor: isAdvisor ? currentAdvisorName : (formAdvisor || 'Andrea Cedeño'),
        agency: formAgency,
        status: formStatus
      };

      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setIsNewVentaModalOpen(false);
        // Reset form
        setFormClient('');
        setFormLot('');
        setFormValue('');
        setFormDown('');
        setFormFinancing('');
        setFormCloseDate('');
        await fetchVentas();
        if (onRefreshLeads) onRefreshLeads();
      } else {
        alert('Error al registrar venta: ' + (data.message || 'Error desconocido'));
      }
    } catch (err: any) {
      alert('Error en la comunicación con el servidor: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (displayVentas.length === 0) {
      alert('No hay ventas para exportar con los filtros actuales.');
      return;
    }
    const headers = ['ID', 'Cliente', 'Proyecto', 'Lote', 'Valor Venta', 'Entrada', 'Financiamiento', 'Fecha Cierre', 'Asesor', 'Agencia', 'Estado'];
    const rows = displayVentas.map(v => [
      `VNT-${v.id.toString().padStart(4, '0')}`,
      `"${v.client.replace(/"/g, '""')}"`,
      `"${v.project.replace(/"/g, '""')}"`,
      `"${v.lot.replace(/"/g, '""')}"`,
      v.value,
      v.down,
      v.financing,
      `"${v.close_date}"`,
      `"${v.advisor}"`,
      `"${v.agency}"`,
      `"${v.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ventas_cerradas_${isAdvisor ? currentAdvisorName.replace(/\s+/g, '_') : 'todas'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900 font-display">Ventas Cerradas</h2>
            {isAdvisor && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                <UserCheck size={13} className="text-[#E11D48]" />
                <span>Cartera de Cierres: {currentAdvisorName}</span>
              </span>
            )}
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              {displayVentas.length} {displayVentas.length === 1 ? 'Cierre' : 'Cierres Registrados'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAdvisor 
              ? 'Registro oficial de escrituración y liquidación de tus terrenos vendidos'
              : 'Consolidado corporativo de lotes adjudicados, escrituras y recaudación de cartera'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition bg-white shadow-xs cursor-pointer"
            title="Exportar listado a formato CSV"
          >
            <Download size={14} className="text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => {
              setFormCloseDate(new Date().toISOString().slice(0, 10));
              setIsNewVentaModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>Registrar Venta Cerrada</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cierres */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cierres Totales</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#E11D48] flex items-center justify-center">
              <FileCheck size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-display">{stats.totalCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Lotes adjudicados con éxito</p>
        </div>

        {/* Volumen Total Facturado */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Volumen Facturado</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <CircleDollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-display">{formatCurrency(stats.totalValue)}</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Ticket promedio: {formatCurrency(stats.avgTicket)}</p>
        </div>

        {/* Cuota Inicial Recaudada */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Entrada Recaudada</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <BadgePercent size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-display">{formatCurrency(stats.totalDown)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Fondos líquidos percibidos</p>
        </div>

        {/* Saldo Financiado o Comisión */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isAdvisor ? 'Comisión Estimada (2.5%)' : 'Saldo por Cobrar'}
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 font-display">
            {isAdvisor ? formatCurrency(stats.estimatedCommission) : formatCurrency(stats.totalFinancing)}
          </p>
          <p className="text-[11px] text-purple-700 font-semibold mt-1">
            {isAdvisor ? 'Por liquidar en fin de mes' : 'Cartera de cuotas activas'}
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="md:col-span-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar por cliente, lote..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-1 focus:ring-[#E11D48]"
            />
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-[#E11D48] cursor-pointer"
            >
              <option value="Todos">Todos los Proyectos</option>
              {uniqueProjects.map(prj => (
                <option key={prj} value={prj}>{prj}</option>
              ))}
            </select>
          </div>

          {/* Advisor Filter (Only shown/editable for Admins) */}
          <div>
            {isAdvisor ? (
              <div className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <User size={13} className="text-[#E11D48]" />
                <span className="truncate">Asesor: {currentAdvisorName}</span>
              </div>
            ) : (
              <select
                value={selectedAdvisor}
                onChange={(e) => setSelectedAdvisor(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-[#E11D48] cursor-pointer"
              >
                <option value="Todos">Todos los Asesores</option>
                {uniqueAdvisors.map(adv => (
                  <option key={adv} value={adv}>{adv}</option>
                ))}
              </select>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-[#E11D48] cursor-pointer"
            >
              <option value="Todos">Todos los Estados</option>
              <option value="Cerrada y Escriturada">Cerrada y Escriturada</option>
              <option value="Cerrada">Cerrada</option>
            </select>

            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedProject('Todos');
                if (!isAdvisor) setSelectedAdvisor('Todos');
                setSelectedStatus('Todos');
              }}
              title="Restablecer filtros"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Ventas Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E11D48]" />
          </div>
        ) : displayVentas.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CircleDollarSign size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No se encontraron ventas cerradas</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {isAdvisor 
                ? `Aún no tienes ventas registradas bajo el asesor ${currentAdvisorName} con los filtros seleccionados.` 
                : 'No existen registros de cierres con los criterios de búsqueda actuales.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedProject('Todos');
                if (!isAdvisor) setSelectedAdvisor('Todos');
                setSelectedStatus('Todos');
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
            >
              Limpiar Filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Cliente Adjudicatario</th>
                  <th className="py-3 px-4">Proyecto y Lote</th>
                  <th className="py-3 px-4 text-right">Valor Venta</th>
                  <th className="py-3 px-4 text-right">Entrada</th>
                  <th className="py-3 px-4 text-right">Saldo Financiado</th>
                  <th className="py-3 px-4">Fecha Cierre</th>
                  <th className="py-3 px-4">Asesor / Agencia</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayVentas.map((venta) => {
                  const isEscriturada = (venta.status || '').toLowerCase().includes('escriturad');
                  return (
                    <tr key={venta.id} className="hover:bg-slate-50/70 transition">
                      {/* Código */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        VNT-{venta.id.toString().padStart(4, '0')}
                      </td>

                      {/* Cliente */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{venta.client}</div>
                        <span className="text-[10px] text-slate-400">Cliente Certificado</span>
                      </td>

                      {/* Proyecto & Lote */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <MapPin size={12} className="text-[#E11D48] shrink-0" />
                          <span>{venta.project}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">{venta.lot}</span>
                      </td>

                      {/* Valor Total */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-display">
                        {formatCurrency(venta.value)}
                      </td>

                      {/* Entrada */}
                      <td className="py-3 px-4 text-right text-emerald-700 font-semibold">
                        {formatCurrency(venta.down)}
                      </td>

                      {/* Saldo Financiado */}
                      <td className="py-3 px-4 text-right text-slate-600 font-medium">
                        {formatCurrency(venta.financing)}
                      </td>

                      {/* Fecha Cierre */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>{venta.close_date}</span>
                        </div>
                      </td>

                      {/* Asesor & Agencia */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{venta.advisor}</div>
                        <div className="text-[10px] text-slate-400">{venta.agency}</div>
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isEscriturada 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          <CheckCircle2 size={11} />
                          <span>{venta.status}</span>
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedVenta(venta);
                            setIsReceiptModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-[#E11D48] hover:bg-rose-50 rounded-md transition cursor-pointer"
                          title="Ver Acta y Certificado de Cierre"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: REGISTRAR NUEVA VENTA CERRADA */}
      {isNewVentaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#E11D48] text-white flex items-center justify-center shadow-xs">
                  <CircleDollarSign size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Registrar Venta Cerrada</h3>
                  <p className="text-[11px] text-slate-400">Formalización de contrato y escrituración de lote</p>
                </div>
              </div>
              <button 
                onClick={() => setIsNewVentaModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateVenta} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Completo del Cliente *</label>
                <input 
                  type="text"
                  required
                  placeholder="Ej. Carmen Benalcázar"
                  value={formClient}
                  onChange={(e) => setFormClient(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#E11D48]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Proyecto / Urbanización *</label>
                  <select
                    value={formProject}
                    onChange={(e) => setFormProject(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#E11D48]"
                  >
                    <option value="Ciudad Verde Norte">Ciudad Verde Norte</option>
                    <option value="Vista del Valle">Vista del Valle</option>
                    <option value="Terrazas del Río">Terrazas del Río</option>
                    <option value="Altos de la Colina">Altos de la Colina</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lote y Manzana *</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ej. Lote 12 - Mz. B"
                    value={formLot}
                    onChange={(e) => setFormLot(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#E11D48]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Valor Venta ($) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="35000"
                    value={formValue}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormValue(v);
                      if (v && !isNaN(Number(v))) {
                        const down = (Number(v) * 0.20).toFixed(2);
                        setFormDown(down);
                        setFormFinancing((Number(v) - Number(down)).toFixed(2));
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#E11D48]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Entrada ($)</label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder="7000"
                    value={formDown}
                    onChange={(e) => {
                      setFormDown(e.target.value);
                      if (formValue && !isNaN(Number(formValue)) && !isNaN(Number(e.target.value))) {
                        setFormFinancing((Number(formValue) - Number(e.target.value)).toFixed(2));
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#E11D48]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Financiamiento ($)</label>
                  <input 
                    type="number"
                    step="0.01"
                    readOnly
                    placeholder="28000"
                    value={formFinancing}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Asesor Comercial</label>
                  <input 
                    type="text"
                    value={isAdvisor ? currentAdvisorName : formAdvisor}
                    disabled={isAdvisor}
                    onChange={(e) => setFormAdvisor(e.target.value)}
                    placeholder="Nombre del asesor"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Agencia</label>
                  <select
                    value={formAgency}
                    onChange={(e) => setFormAgency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#E11D48]"
                  >
                    <option value="Agencia Quito Norte">Agencia Quito Norte</option>
                    <option value="Agencia Guayaquil Centro">Agencia Guayaquil Centro</option>
                    <option value="Agencia Cuenca">Agencia Cuenca</option>
                    <option value="Agencia Santo Domingo">Agencia Santo Domingo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Cierre</label>
                  <input 
                    type="date"
                    value={formCloseDate}
                    onChange={(e) => setFormCloseDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#E11D48]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado Legal</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#E11D48]"
                  >
                    <option value="Cerrada y Escriturada">Cerrada y Escriturada</option>
                    <option value="Cerrada">Cerrada (En Notaría)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewVentaModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Guardando...' : 'Formalizar Venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACTA Y COMPROBANTE DE VENTA CERRADA */}
      {isReceiptModalOpen && selectedVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E11D48] text-white flex items-center justify-center font-bold text-xs">
                  CZ
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Acta de Cierre y Liquidación Comercial</h3>
                  <p className="text-[11px] text-slate-400">VNT-{selectedVenta.id.toString().padStart(4, '0')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition"
                  title="Imprimir Acta"
                >
                  <Printer size={16} />
                </button>
                <button 
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body / Official Receipt style */}
            <div className="p-6 space-y-5 text-xs">
              <div className="border-b border-slate-100 pb-4 flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-base text-slate-900 font-display">Corporación Zavala</h4>
                  <p className="text-slate-500 text-[11px]">Dirección Comercial Inmobiliaria &bull; RUC: 1792834012001</p>
                  <p className="text-slate-500 text-[11px]">{selectedVenta.agency}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full font-bold text-[10px]">
                    {selectedVenta.status}
                  </span>
                  <p className="text-slate-400 text-[10px] mt-1">Fecha: {selectedVenta.close_date}</p>
                </div>
              </div>

              {/* Client & Lot Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Adjudicatario / Cliente</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedVenta.client}</p>
                  <span className="text-slate-500 text-[11px]">Contrato de Adjudicación Directa</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Inmueble / Ubicación</span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedVenta.project}</p>
                  <span className="text-slate-600 text-[11px] font-mono font-semibold">{selectedVenta.lot}</span>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Liquidación Económica</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50/50">
                    <span className="text-slate-600 font-medium">Valor Total del Lote</span>
                    <span className="font-bold text-slate-900 font-display">{formatCurrency(selectedVenta.value)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5">
                    <span className="text-emerald-700 font-medium">Cuota Inicial / Entrada Recibida</span>
                    <span className="font-bold text-emerald-700 font-display">{formatCurrency(selectedVenta.down)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50/50">
                    <span className="text-slate-600 font-medium">Saldo Restante a Financiar</span>
                    <span className="font-semibold text-slate-800 font-display">{formatCurrency(selectedVenta.financing)}</span>
                  </div>
                </div>
              </div>

              {/* Responsible Advisor */}
              <div className="flex items-center justify-between p-3 bg-rose-50/50 border border-rose-100 rounded-xl text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-[#E11D48]" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold uppercase">Asesor Comercial Acreditado</span>
                    <strong className="text-slate-800">{selectedVenta.advisor}</strong>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <span>Comisión liquidada</span>
                </div>
              </div>

              {/* Signature section */}
              <div className="pt-6 grid grid-cols-2 gap-8 border-t border-slate-100 text-center">
                <div>
                  <div className="border-b border-slate-300 w-3/4 mx-auto mb-1.5" />
                  <p className="font-bold text-slate-800 text-[11px]">{selectedVenta.client}</p>
                  <p className="text-slate-400 text-[10px]">Firma del Comprador</p>
                </div>
                <div>
                  <div className="border-b border-slate-300 w-3/4 mx-auto mb-1.5" />
                  <p className="font-bold text-slate-800 text-[11px]">{selectedVenta.advisor}</p>
                  <p className="text-slate-400 text-[10px]">Asesor Corporación Zavala</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
