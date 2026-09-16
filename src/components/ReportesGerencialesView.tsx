import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, CircleDollarSign, Target, Percent, BookmarkCheck, 
  ArrowUpRight, Wallet, AlertTriangle, CheckCircle2, Clock, 
  Building2, Users, Download, Printer, RefreshCw, Filter, 
  ChevronRight, Calendar, Layers, ShieldAlert, Phone, 
  MessageCircle, BarChart3, PieChart, FileText, ChevronDown
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';

export default function ReportesGerencialesView() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);

  // Filters
  const [period, setPeriod] = useState('mes_actual');
  const [agency, setAgency] = useState('Todas');
  const [project, setProject] = useState('Todos');
  const [activeTab, setActiveTab] = useState<'ejecutivo' | 'cartera' | 'agencias' | 'proyectos'>('ejecutivo');

  // Interactive modal for overdue contract management
  const [selectedContrato, setSelectedContrato] = useState<any>(null);
  const [compromisoInput, setCompromisoInput] = useState('');
  const [isCommitmentModalOpen, setIsCommitmentModalOpen] = useState(false);

  const fetchReportes = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams({
        period,
        agency,
        project
      });
      const res = await fetch(`/api/reportes/gerenciales?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching reportes gerenciales:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportes();
  }, [period, agency, project]);

  // Export Executive Summary to CSV
  const handleExportCSV = () => {
    if (!data) return;
    const kpi = data.kpi;
    const rows = [
      ['INFORME GERENCIAL COMERCIAL Y FINANCIERO - GRUPO TERRENOS'],
      [`Período: ${data.period.label}`],
      [`Agencia: ${agency} | Proyecto: ${project}`],
      [`Fecha de Emisión: ${new Date().toLocaleDateString('es-EC')} ${new Date().toLocaleTimeString('es-EC')}`],
      [''],
      ['--- TABLERO DE PRINCIPALES KPIS ---'],
      ['KPI', 'Valor Numérico', 'Unidad / Formato', 'Variación / Estado', 'Detalle'],
      ['Ventas mes', kpi.ventasMes.valor, 'Lotes cerrados', kpi.ventasMes.variacion, kpi.ventasMes.subtexto],
      ['Valor vendido', formatCurrency(kpi.valorVendido.valor), 'USD', kpi.valorVendido.variacion, kpi.valorVendido.subtexto],
      ['Meta comercial', formatCurrency(kpi.meta.valor), 'USD', kpi.meta.variacion, kpi.meta.subtexto],
      ['% Cumplimiento', `${kpi.cumplimiento.valor}%`, 'Porcentaje', kpi.cumplimiento.variacion, kpi.cumplimiento.subtexto],
      ['Reservas', `${kpi.reservas.valor} lotes (${formatCurrency(kpi.reservas.monto)})`, 'Depósitos apartados', kpi.reservas.variacion, kpi.reservas.subtexto],
      ['Conversión', `${kpi.conversion.valor}%`, 'Tasa lead-a-cierre', kpi.conversion.variacion, kpi.conversion.subtexto],
      ['Recaudación', formatCurrency(kpi.recaudacion.valor), 'USD líquido cobrado', kpi.recaudacion.variacion, kpi.recaudacion.subtexto],
      ['Cartera vencida', formatCurrency(kpi.carteraVencida.valor), `USD (${kpi.carteraVencida.morosidad}% mora)`, kpi.carteraVencida.variacion, kpi.carteraVencida.subtexto],
      [''],
      ['--- DESGLOSE POR AGENCIA ---'],
      ['Agencia', 'Ciudad', 'Ventas Mes', 'Valor Vendido', 'Meta', '% Cumplimiento', 'Reservas', 'Recaudación', 'Cartera Vencida', '% Morosidad'],
      ...(data.agenciasReport || []).map((ag: any) => [
        ag.nombre,
        ag.ciudad,
        ag.ventasMes,
        formatCurrency(ag.valorVendido),
        formatCurrency(ag.meta),
        `${ag.cumplimiento}%`,
        ag.reservas,
        formatCurrency(ag.recaudacion),
        formatCurrency(ag.carteraVencida),
        `${ag.morosidad}%`
      ]),
      [''],
      ['--- DESGLOSE DE CARTERA VENCIDA EN MORA ---'],
      ['Contrato', 'Cliente', 'Proyecto', 'Lote', 'Saldo Total', 'Cuotas Vencidas', 'Monto en Mora', 'Días Mora', 'Asesor', 'Agencia', 'Estado Gestión', 'Compromiso Pago'],
      ...(data.contratosMora || []).map((c: any) => [
        c.id,
        c.cliente,
        c.proyecto,
        c.lote,
        formatCurrency(c.saldoTotal),
        c.cuotasVencidas,
        formatCurrency(c.montoVencido),
        c.diasMora,
        c.asesor,
        c.agencia,
        c.estado,
        c.compromisoPago
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Gerencial_${period}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print executive summary
  const handlePrint = () => {
    window.print();
  };

  const kpi = data?.kpi;

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#E11D48]" />
        <p className="text-sm font-medium text-slate-500">Consolidando métricas gerenciales de ventas y cartera...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 font-display">
                Reportes Gerenciales
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Consolidado comercial, cumplimiento de metas corporativas, recaudación y control de cartera
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          {/* Period Filter */}
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg pl-3 pr-8 py-2 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#E11D48] transition cursor-pointer shadow-2xs"
            >
              <option value="mes_actual">Mes Actual (Julio 2026)</option>
              <option value="mes_anterior">Mes Anterior (Junio 2026)</option>
              <option value="trimestre">Trimestre Actual (Q3 2026)</option>
              <option value="anio">Año 2026 Consolidado</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Agency Filter */}
          <div className="relative">
            <select
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg pl-3 pr-8 py-2 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#E11D48] transition cursor-pointer shadow-2xs"
            >
              <option value="Todas">Todas las Agencias</option>
              <option value="Agencia Quito Norte">Agencia Quito Norte</option>
              <option value="Agencia Guayaquil Centro">Agencia Guayaquil Centro</option>
              <option value="Agencia Cuenca">Agencia Cuenca</option>
              <option value="Agencia Manta">Agencia Manta</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Project Filter */}
          <div className="relative">
            <select
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-semibold rounded-lg pl-3 pr-8 py-2 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#E11D48] transition cursor-pointer shadow-2xs"
            >
              <option value="Todos">Todos los Proyectos</option>
              <option value="Terrazas del Río">Terrazas del Río</option>
              <option value="Vista del Valle">Vista del Valle</option>
              <option value="Ciudad Verde Norte">Ciudad Verde Norte</option>
              <option value="Bosques de Samborondón">Bosques de Samborondón</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchReportes}
            disabled={refreshing}
            title="Actualizar datos"
            className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#E11D48]' : ''}`} />
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-lg hover:bg-slate-50 transition shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-black text-white text-xs font-semibold rounded-lg transition shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* THE 8 CORE MANDATORY KPIS REQUESTED BY THE USER */}
      {/* 1. Ventas mes | 2. Valor vendido | 3. Meta | 4. % Cumplimiento | 5. Reservas | 6. Conversión | 7. Recaudación | 8. Cartera vencida */}
      {/* ========================================================================= */}
      {kpi && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#E11D48]"></span>
              Indicadores Clave de Desempeño Comercial (KPIs)
            </h2>
            <span className="text-[11px] font-medium text-slate-400">
              Período: <strong className="text-slate-700 font-semibold">{data.period.label}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1: Ventas mes */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs hover:border-slate-300 transition relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold tracking-tight text-slate-600">Ventas mes</span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-[#E11D48] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {kpi.ventasMes.valor}
                </span>
                <span className="text-xs font-medium text-slate-500">lotes cerrados</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  {kpi.ventasMes.variacion}
                </span>
                <span className="text-slate-400 font-normal truncate">{kpi.ventasMes.subtexto}</span>
              </div>
            </div>

            {/* KPI 2: Valor vendido */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs hover:border-slate-300 transition relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold tracking-tight text-slate-600">Valor vendido</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CircleDollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatCurrency(kpi.valorVendido.valor)}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  {kpi.valorVendido.variacion}
                </span>
                <span className="text-slate-400 font-normal truncate">Facturación neta</span>
              </div>
            </div>

            {/* KPI 3: Meta */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs hover:border-slate-300 transition relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold tracking-tight text-slate-600">Meta</span>
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Target className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {formatCurrency(kpi.meta.valor)}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                <span className="text-slate-600 font-medium">{kpi.meta.variacion}</span>
                <span className="text-slate-400 font-normal truncate">Presupuesto asignado</span>
              </div>
            </div>

            {/* KPI 4: % Cumplimiento */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs hover:border-slate-300 transition relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold tracking-tight text-slate-600">% Cumplimiento</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  kpi.cumplimiento.valor >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  <Percent className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-black tracking-tight ${
                  kpi.cumplimiento.valor >= 90 ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {kpi.cumplimiento.valor}%
                </span>
                <div className="flex-1 max-w-[90px] bg-slate-100 h-2 rounded-full overflow-hidden ml-2">
                  <div 
                    className={`h-full rounded-full ${kpi.cumplimiento.valor >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(kpi.cumplimiento.valor, 100)}%` }}
                  />
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                <span className={`font-semibold ${kpi.cumplimiento.valor >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {kpi.cumplimiento.variacion}
                </span>
                <span className="text-slate-400 font-normal">Objetivo</span>
              </div>
            </div>

            {/* KPI 5: Reservas */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs hover:border-slate-300 transition relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold tracking-tight text-slate-600">Reservas</span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookmarkCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {kpi.reservas.valor}
                </span>
                <span className="text-xs font-medium text-slate-500">lotes apartados</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                <span className="text-indigo-700 font-semibold">
                  {formatCurrency(kpi.reservas.monto)} depósitos
                </span>
                <span className="text-slate-400 font-normal truncate">{kpi.reservas.variacion}</span>
              </div>
            </div>

            {/* KPI 6: Conversión */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs hover:border-slate-300 transition relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold tracking-tight text-slate-600">Conversión</span>
                <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {kpi.conversion.valor}%
                </span>
                <span className="text-xs font-medium text-slate-500">lead-a-venta</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                <span className="text-violet-700 font-semibold">{kpi.conversion.variacion}</span>
                <span className="text-slate-400 font-normal truncate">Eficiencia de embudo</span>
              </div>
            </div>

            {/* KPI 7: Recaudación */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-xs hover:border-slate-300 transition relative overflow-hidden group">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold tracking-tight text-slate-600">Recaudación</span>
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-teal-950 tracking-tight">
                  {formatCurrency(kpi.recaudacion.valor)}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                <span className="text-teal-700 font-semibold">{kpi.recaudacion.variacion}</span>
                <span className="text-slate-400 font-normal truncate">Efectivo en banco</span>
              </div>
            </div>

            {/* KPI 8: Cartera vencida */}
            <div className="bg-white border border-rose-200/90 rounded-xl p-4 shadow-xs hover:border-rose-300 transition relative overflow-hidden group bg-gradient-to-b from-white to-rose-50/20">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold tracking-tight text-rose-900">Cartera vencida</span>
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-700 tracking-tight">
                  {formatCurrency(kpi.carteraVencida.valor)}
                </span>
                <span className="text-[11px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">
                  {kpi.carteraVencida.morosidad}% mora
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] pt-2 border-t border-rose-100">
                <span className="text-rose-700 font-semibold">
                  Saldo financiado: {formatCurrency(kpi.carteraVencida.saldoTotal)}
                </span>
                <span className="text-rose-600 font-medium">Requiere gestión</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECONDARY NAVIGATION TABS */}
      {/* ========================================================================= */}
      <div className="border-b border-slate-200 print:hidden">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('ejecutivo')}
            className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'ejecutivo'
                ? 'border-[#E11D48] text-[#E11D48]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Tablero Ejecutivo & Tendencia</span>
          </button>

          <button
            onClick={() => setActiveTab('cartera')}
            className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'cartera'
                ? 'border-[#E11D48] text-[#E11D48]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Gestión de Cartera Vencida & Cobranzas</span>
            {data?.contratosMora?.length > 0 && (
              <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {data.contratosMora.length} en mora
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('agencias')}
            className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'agencias'
                ? 'border-[#E11D48] text-[#E11D48]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Desempeño por Agencias & Asesores</span>
          </button>

          <button
            onClick={() => setActiveTab('proyectos')}
            className={`pb-3 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'proyectos'
                ? 'border-[#E11D48] text-[#E11D48]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Ventas por Urbanización</span>
          </button>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TABLERO EJECUTIVO & TENDENCIA */}
      {/* ========================================================================= */}
      {activeTab === 'ejecutivo' && (
        <div className="space-y-6">
          {/* Historical Trend & Target Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Trend Chart Representation */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-display">
                    Evolución Mensual: Valor Vendido vs. Meta y Recaudación
                  </h3>
                  <p className="text-xs text-slate-400">
                    Histórico comparativo de los últimos 7 meses comerciales en dólares (USD)
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-[#E11D48]"></span> Vendido
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-slate-300"></span> Meta
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-teal-500"></span> Recaudado
                  </span>
                </div>
              </div>

              {/* High-craft CSS Bar Chart */}
              <div className="pt-4 pb-2">
                <div className="grid grid-cols-7 gap-3 sm:gap-6 items-end h-56 border-b border-slate-100 px-2">
                  {(data?.monthlyTrend || []).map((m: any, idx: number) => {
                    const maxVal = 900000;
                    const hVendido = Math.min(100, Math.round((m.valor / maxVal) * 100));
                    const hMeta = Math.min(100, Math.round((m.meta / maxVal) * 100));
                    const hRecaudado = Math.min(100, Math.round((m.recaudacion / maxVal) * 100));

                    return (
                      <div key={idx} className="flex flex-col items-center gap-1.5 group h-full justify-end">
                        <div className="text-[10px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition whitespace-nowrap bg-slate-900 text-white px-1.5 py-0.5 rounded shadow-xs mb-1">
                          {formatCurrency(m.valor)} ({m.cumplimiento}%)
                        </div>
                        <div className="flex items-end gap-1 w-full justify-center h-44">
                          {/* Bar: Recaudado */}
                          <div 
                            className="w-2 sm:w-3 bg-teal-500/80 hover:bg-teal-600 rounded-t-xs transition-all duration-300"
                            style={{ height: `${hRecaudado}%` }}
                            title={`Recaudado: ${formatCurrency(m.recaudacion)}`}
                          />
                          {/* Bar: Vendido */}
                          <div 
                            className="w-3.5 sm:w-5 bg-[#E11D48] hover:bg-rose-700 rounded-t-xs transition-all duration-300"
                            style={{ height: `${hVendido}%` }}
                            title={`Vendido: ${formatCurrency(m.valor)}`}
                          />
                          {/* Bar: Meta */}
                          <div 
                            className="w-2 sm:w-3 bg-slate-200 hover:bg-slate-300 rounded-t-xs transition-all duration-300"
                            style={{ height: `${hMeta}%` }}
                            title={`Meta: ${formatCurrency(m.meta)}`}
                          />
                        </div>
                        <span className={`text-xs font-bold ${idx === 6 ? 'text-[#E11D48]' : 'text-slate-600'}`}>
                          {m.mes}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-3 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
                <span>
                  Promedio de cumplimiento últimos 6 meses: <strong className="text-slate-800 font-bold">85.4%</strong>
                </span>
                <span>
                  Total recaudado acumulado 2026: <strong className="text-teal-700 font-bold">$819,000</strong>
                </span>
              </div>
            </div>

            {/* Commercial Conversion Funnel */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center justify-between">
                  <span>Embudo de Conversión Comercial</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    Ratio: {kpi?.conversion?.valor}%
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Pérdida y avance de prospectos entre etapas</p>
              </div>

              <div className="space-y-2.5 pt-1">
                {(data?.conversionFunnel || []).map((step: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 truncate">{step.etapa}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{step.valor}</span>
                        <span className="text-[10px] font-semibold text-slate-400">({step.conversionEtapa})</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${step.color}`}
                        style={{ width: step.conversionEtapa }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100 text-xs text-slate-700 space-y-1">
                <span className="font-bold text-[#E11D48] block">Observación Gerencial:</span>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  La etapa con mayor potencial de aceleración es la visita presencial al terreno (38% de conversión inicial). El paso de reserva a cierre mantiene una tasa de efectividad superior al 77%.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Summary of Financial Risk & Liquid Assets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">Recaudación Líquida Inmediata</span>
                <span className="text-lg font-black text-slate-900">{formatCurrency(kpi?.recaudacion?.valor)}</span>
                <span className="text-[11px] text-teal-700 font-semibold block">Entradas + Reservas</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">Cartera Total en Financiamiento Directo</span>
                <span className="text-lg font-black text-slate-900">{formatCurrency(kpi?.carteraVencida?.saldoTotal)}</span>
                <span className="text-[11px] text-sky-700 font-semibold block">92 contratos vigentes</span>
              </div>
            </div>

            <div className="bg-white border border-rose-200 rounded-xl p-4 shadow-xs flex items-center gap-3 bg-gradient-to-r from-white to-rose-50/30">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">Exposición en Cartera Vencida</span>
                <span className="text-lg font-black text-rose-700">{formatCurrency(kpi?.carteraVencida?.valor)}</span>
                <span className="text-[11px] text-rose-600 font-bold block">{kpi?.carteraVencida?.morosidad}% de morosidad global</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GESTIÓN DE CARTERA VENCIDA & COBRANZAS */}
      {/* ========================================================================= */}
      {activeTab === 'cartera' && (
        <div className="space-y-6">
          {/* Overdue buckets / Age analysis */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Distribución de Cartera por Antigüedad de Mora
              </h3>
              <p className="text-xs text-slate-400">
                Segmentación de saldos según días de atraso en cuotas mensuales de financiamiento directo
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Al día */}
              <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Al Día (Vigente)</span>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                    {data?.carteraBuckets?.alDia?.porcentaje}%
                  </span>
                </div>
                <div className="text-xl font-black text-emerald-950">
                  {formatCurrency(data?.carteraBuckets?.alDia?.monto)}
                </div>
                <div className="text-xs text-emerald-700 font-medium">
                  {data?.carteraBuckets?.alDia?.clientes} clientes al corriente
                </div>
              </div>

              {/* 1 - 30 días */}
              <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">1 a 30 Días (Mora Leve)</span>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                    {data?.carteraBuckets?.dias1a30?.porcentaje}% mora
                  </span>
                </div>
                <div className="text-xl font-black text-amber-950">
                  {formatCurrency(data?.carteraBuckets?.dias1a30?.monto)}
                </div>
                <div className="text-xs text-amber-700 font-medium">
                  {data?.carteraBuckets?.dias1a30?.clientes} clientes • Notificación amistosa
                </div>
              </div>

              {/* 31 - 60 días */}
              <div className="border border-orange-200 bg-orange-50/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-800">31 a 60 Días (Mora Media)</span>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full">
                    {data?.carteraBuckets?.dias31a60?.porcentaje}% mora
                  </span>
                </div>
                <div className="text-xl font-black text-orange-950">
                  {formatCurrency(data?.carteraBuckets?.dias31a60?.monto)}
                </div>
                <div className="text-xs text-orange-700 font-medium">
                  {data?.carteraBuckets?.dias31a60?.clientes} clientes • Cobranza activa
                </div>
              </div>

              {/* +60 días */}
              <div className="border border-rose-200 bg-rose-50/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800">+60 Días (Riesgo Alto)</span>
                  <span className="text-[10px] font-black px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full">
                    {data?.carteraBuckets?.diasMas60?.porcentaje}% mora
                  </span>
                </div>
                <div className="text-xl font-black text-rose-950">
                  {formatCurrency(data?.carteraBuckets?.diasMas60?.monto)}
                </div>
                <div className="text-xs text-rose-700 font-medium">
                  {data?.carteraBuckets?.diasMas60?.clientes} clientes • Extrajudicial / Notaría
                </div>
              </div>
            </div>
          </div>

          {/* Delinquent Contracts Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                  <span>Listado de Clientes con Cuotas Vencidas en Cartera</span>
                  <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 font-bold rounded-full">
                    {data?.contratosMora?.length || 0} contratos
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Gestión directa de llamadas, WhatsApp y acuerdos de refinanciamiento
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Monto total en mora:</span>
                <strong className="text-xs font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded-lg">
                  {formatCurrency(kpi?.carteraVencida?.valor)}
                </strong>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">Contrato</th>
                    <th className="py-3 px-4">Cliente</th>
                    <th className="py-3 px-4">Proyecto / Lote</th>
                    <th className="py-3 px-4 text-right">Saldo Financiado</th>
                    <th className="py-3 px-4 text-center">Cuotas Mora</th>
                    <th className="py-3 px-4 text-right">Monto Vencido</th>
                    <th className="py-3 px-4 text-center">Días Mora</th>
                    <th className="py-3 px-4">Asesor Asignado</th>
                    <th className="py-3 px-4">Estado Gestión</th>
                    <th className="py-3 px-4">Compromiso</th>
                    <th className="py-3 px-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(data?.contratosMora || []).map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{c.id}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{c.cliente}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {c.telefono}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 block">{c.proyecto}</span>
                        <span className="text-[11px] text-slate-400">{c.lote}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800">
                        {formatCurrency(c.saldoTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-full text-[11px]">
                          {c.cuotasVencidas} cuota(s)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-700">
                        {formatCurrency(c.montoVencido)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          c.diasMora > 60 
                            ? 'bg-rose-100 text-rose-800' 
                            : c.diasMora > 30 
                              ? 'bg-orange-100 text-orange-800' 
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.diasMora} días
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-800 font-medium block">{c.asesor}</span>
                        <span className="text-[11px] text-slate-400">{c.agencia}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                          {c.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-slate-800 font-semibold block text-[11px]">
                          {c.compromisoPago}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* WhatsApp Action */}
                          <a
                            href={`https://wa.me/${c.telefono.replace(/[^0-9]/g, '')}?text=Estimado(a)%20${encodeURIComponent(c.cliente)},%20le%20saludamos%20de%20Corporaci%C3%B3n%20Zavala.%20Le%20recordamos%20que%20mantiene%20un%20saldo%20vencido%20de%20${encodeURIComponent(formatCurrency(c.montoVencido))}%20en%20su%20lote%20${encodeURIComponent(c.lote)}.`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                            title="Contactar por WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>

                          {/* Commitment Register */}
                          <button
                            onClick={() => {
                              setSelectedContrato(c);
                              setCompromisoInput(c.compromisoPago || '');
                              setIsCommitmentModalOpen(true);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md transition"
                          >
                            Gestionar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DESEMPEÑO POR AGENCIAS & ASESORES */}
      {/* ========================================================================= */}
      {activeTab === 'agencias' && (
        <div className="space-y-6">
          {/* Performance by Agency */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Rendimiento y Cumplimiento por Sucursal / Agencia
                </h3>
                <p className="text-xs text-slate-400">
                  Comparativa de volumen comercial, metas de venta y cobranza
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {data?.agenciasReport?.length || 0} agencias activas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">Agencia</th>
                    <th className="py-3 px-4">Ciudad</th>
                    <th className="py-3 px-4 text-center">Ventas Mes</th>
                    <th className="py-3 px-4 text-right">Valor Vendido</th>
                    <th className="py-3 px-4 text-right">Meta Comercial</th>
                    <th className="py-3 px-4 text-center">% Cumplimiento</th>
                    <th className="py-3 px-4 text-center">Reservas</th>
                    <th className="py-3 px-4 text-right">Recaudación</th>
                    <th className="py-3 px-4 text-right">Cartera Vencida</th>
                    <th className="py-3 px-4 text-center">% Morosidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(data?.agenciasReport || []).map((ag: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" />
                        {ag.nombre}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{ag.ciudad}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {ag.ventasMes}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">
                        {formatCurrency(ag.valorVendido)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600">
                        {formatCurrency(ag.meta)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[11px] ${
                          ag.cumplimiento >= 90
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {ag.cumplimiento}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-700">
                        {ag.reservas}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-teal-800">
                        {formatCurrency(ag.recaudacion)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-700">
                        {formatCurrency(ag.carteraVencida)}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-rose-600">
                        {ag.morosidad}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ranking of Advisors */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Ranking Individual de Asesores Comerciales
                </h3>
                <p className="text-xs text-slate-400">
                  Desempeño y porcentaje de logro individual de metas
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                    <th className="py-3 px-4">Posición</th>
                    <th className="py-3 px-4">Asesor Comercial</th>
                    <th className="py-3 px-4">Agencia</th>
                    <th className="py-3 px-4 text-center">Ventas Mes</th>
                    <th className="py-3 px-4 text-right">Valor Vendido</th>
                    <th className="py-3 px-4 text-right">Meta Individual</th>
                    <th className="py-3 px-4 text-center">% Cumplimiento</th>
                    <th className="py-3 px-4 text-center">Reservas</th>
                    <th className="py-3 px-4 text-right">Recaudación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(data?.asesoresReport || []).map((adv: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-black text-slate-400">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                          idx === 0 ? 'bg-amber-100 text-amber-800 font-black' :
                          idx === 1 ? 'bg-slate-200 text-slate-800 font-black' :
                          idx === 2 ? 'bg-amber-50 text-amber-700' : 'text-slate-500'
                        }`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{adv.asesor}</td>
                      <td className="py-3 px-4 text-slate-600">{adv.agencia}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{adv.ventasMes}</td>
                      <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(adv.valorVendido)}</td>
                      <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(adv.meta)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[11px] ${
                          adv.cumplimiento >= 100
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {adv.cumplimiento}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-indigo-700">{adv.reservas}</td>
                      <td className="py-3 px-4 text-right font-bold text-teal-800">{formatCurrency(adv.recaudacion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: VENTAS POR URBANIZACIÓN */}
      {/* ========================================================================= */}
      {activeTab === 'proyectos' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Rendimiento Comercial por Urbanización / Proyecto
              </h3>
              <p className="text-xs text-slate-400">
                Colocación de lotes, volumen facturado, reservas activas y mora por proyecto
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4">Urbanización / Proyecto</th>
                  <th className="py-3 px-4 text-center">Lotes Vendidos</th>
                  <th className="py-3 px-4 text-right">Facturación Total</th>
                  <th className="py-3 px-4 text-center">Reservas Activas</th>
                  <th className="py-3 px-4 text-right">Recaudación Líquida</th>
                  <th className="py-3 px-4 text-right">Cartera en Mora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {(data?.proyectosReport || []).map((p: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#E11D48]" />
                      {p.proyecto}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{p.lotesVendidos}</td>
                    <td className="py-3 px-4 text-right font-black text-slate-900">{formatCurrency(p.valorTotal)}</td>
                    <td className="py-3 px-4 text-center font-bold text-indigo-700">{p.reservas}</td>
                    <td className="py-3 px-4 text-right font-black text-teal-800">{formatCurrency(p.recaudacion)}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-700">{formatCurrency(p.carteraVencida)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR COMPROMISO DE PAGO / GESTIÓN DE CARTERA */}
      {/* ========================================================================= */}
      {isCommitmentModalOpen && selectedContrato && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  Gestionar Cobro: {selectedContrato.id}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedContrato.cliente} • {selectedContrato.proyecto}
                </p>
              </div>
              <button 
                onClick={() => setIsCommitmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-100 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-rose-700 font-medium">Monto Vencido en Mora:</span>
                <strong className="text-rose-900 font-bold">{formatCurrency(selectedContrato.montoVencido)}</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-rose-700 font-medium">Cuotas Atrasadas:</span>
                <strong className="text-rose-900 font-bold">{selectedContrato.cuotasVencidas} cuota(s) ({selectedContrato.diasMora} días)</strong>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-rose-700 font-medium">Cuota Mensual:</span>
                <strong className="text-rose-900 font-bold">{formatCurrency(selectedContrato.cuotaMensual)}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Compromiso / Fecha Acordada de Pago</label>
              <input 
                type="text"
                placeholder="Ej. 18 Jul 2026 - Transferencia bancaria Banco Pichincha"
                value={compromisoInput}
                onChange={(e) => setCompromisoInput(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-[#E11D48]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCommitmentModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  selectedContrato.compromisoPago = compromisoInput;
                  selectedContrato.estado = 'Compromiso Actualizado';
                  setIsCommitmentModalOpen(false);
                }}
                className="px-4 py-2 bg-[#E11D48] text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition shadow-xs cursor-pointer"
              >
                Guardar Compromiso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
