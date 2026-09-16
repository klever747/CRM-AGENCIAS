import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, RefreshCw, Printer, MessageSquare, 
  TableProperties, Send, Plus, HelpCircle, Check, Loader2, Lock, Eye,
  Building, MapPin, ChevronDown, ShieldCheck, AlertTriangle, Info, ArrowRight,
  Search, CheckCircle2, FileSpreadsheet, Download, ChevronLeft, ChevronRight, X, Maximize2
} from 'lucide-react';
import { Proforma } from '../types';
import { formatPhoneToEcuador, formatCurrency } from '../lib/utils';
import { ProformaModal } from './ProformaModal';

interface CotizadorViewProps {
  initialLeadName?: string;
  initialPhone?: string;
  initialCedula?: string;
  onSaveProforma: (proforma: any) => Promise<string | null>;
}

// Real Spanish-style standard Reducing Amortization Schedule calculation
interface AmortizationRow {
  n: number;
  start: number;
  installment: number;
  interest: number;
  principal: number;
  end: number;
}

export default React.memo(function CotizadorView({ 
  initialLeadName = '', 
  initialPhone = '', 
  initialCedula = '',
  onSaveProforma 
}: CotizadorViewProps) {
  // Input fields
  const [clientName, setClientName] = useState(initialLeadName || '');
  const [phone, setPhone] = useState(formatPhoneToEcuador(initialPhone) || '');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [cedula, setCedula] = useState(initialCedula || '');

  useEffect(() => {
    if (initialLeadName !== undefined) setClientName(initialLeadName || '');
    if (initialPhone !== undefined) setPhone(formatPhoneToEcuador(initialPhone) || '');
    if (initialCedula !== undefined) setCedula(initialCedula || '');
  }, [initialLeadName, initialPhone, initialCedula]);

  const [project, setProject] = useState('DIVINA MISERICORDIA I');
  const [category, setCategory] = useState('COMERCIAL');
  const [manzana, setManzana] = useState('1');
  const [lote, setLote] = useState('1');
  
  const [area, setArea] = useState(200);
  const [costoM2, setCostoM2] = useState(140);
  const [entrada, setEntrada] = useState(5000);
  const [descuentoPct, setDescuentoPct] = useState(0);
  const [plazoMeses, setPlazoMeses] = useState(36);
  const [tasaAnual, setTasaAnual] = useState(8);

  const [urbanizacionesList, setUrbanizacionesList] = useState<any[]>([]);
  const [showFullSchedule, setShowFullSchedule] = useState(false);

  // Selected Urbanizacion and Plan derived objects
  const selectedUrb = useMemo(() => {
    return urbanizacionesList.find((u: any) => u.name === project) || urbanizacionesList[0] || null;
  }, [urbanizacionesList, project]);

  const selectedPlan = useMemo(() => {
    if (!selectedUrb || !selectedUrb.categories || selectedUrb.categories.length === 0) return null;
    return selectedUrb.categories.find((c: any) => c.name === category) || selectedUrb.categories[0] || null;
  }, [selectedUrb, category]);

  // Derived minimum constraints and plazo ranges
  const minArea = useMemo(() => {
    return Number(selectedPlan?.area_minima ?? selectedPlan?.area) || 0;
  }, [selectedPlan]);

  const minEntrada = useMemo(() => {
    return Number(selectedPlan?.entrada_minima ?? selectedPlan?.down) || 0;
  }, [selectedPlan]);

  const { minPlazo, maxPlazo, availablePlazos } = useMemo(() => {
    if (!selectedUrb || !selectedUrb.categories || selectedUrb.categories.length === 0) {
      return { 
        minPlazo: 12, 
        maxPlazo: 36, 
        availablePlazos: [
          { meses: 12, anio: 1, label: '12 meses (1 Año)' },
          { meses: 24, anio: 2, label: '24 meses (2 Año)' },
          { meses: 36, anio: 3, label: '36 meses (3 Año)' }
        ]
      };
    }
    const terms = selectedUrb.categories
      .map((c: any) => Number(c.meses_plazo ?? c.term))
      .filter((t: number) => !isNaN(t) && t > 0);

    const minP = terms.length > 0 ? Math.min(...terms) : 12;
    const maxP = terms.length > 0 ? Math.max(...terms) : 36;

    // Calcular la cantidad de años hasta el máximo de financiamiento (ej: 36 meses -> 3 años, 48 meses -> 4 años, etc.)
    const maxYears = Math.max(1, Math.round(maxP / 12));
    const plazosList: { meses: number; anio: number; label: string }[] = [];

    for (let yr = 1; yr <= maxYears; yr++) {
      const m = yr * 12;
      if (m <= maxP) {
        plazosList.push({
          meses: m,
          anio: yr,
          label: `${m} meses (${yr} Año)`
        });
      }
    }

    // Si por alguna razón no se incluyó el maxPlazo exacto (por no ser múltiplo exacto de 12)
    if (plazosList.length === 0 || !plazosList.some(p => p.meses === maxP)) {
      const yrExact = (maxP / 12).toFixed(1).replace('.0', '');
      plazosList.push({
        meses: maxP,
        anio: Math.round(maxP / 12),
        label: `${maxP} meses (${yrExact} Año)`
      });
      plazosList.sort((a, b) => a.meses - b.meses);
    }

    return { 
      minPlazo: minP, 
      maxPlazo: maxP, 
      availablePlazos: plazosList
    };
  }, [selectedUrb]);

  useEffect(() => {
    fetch('/api/urbanizaciones')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setUrbanizacionesList(data);
          const currentExists = data.some((u: any) => u.name === project);
          const targetUrb = currentExists ? data.find((u: any) => u.name === project) : data[0];
          setProject(targetUrb.name);
          if (targetUrb.categories && targetUrb.categories.length > 0) {
            const currentCatExists = targetUrb.categories.some((c: any) => c.name === category);
            const targetCat = currentCatExists ? targetUrb.categories.find((c: any) => c.name === category) : targetUrb.categories[0];
            setCategory(targetCat.name);
            setCostoM2(Number(targetCat.costo_m2 ?? targetCat.cost) || targetUrb.refPrice || 140);
            
            // Cargar área mínima y entrada mínima
            const catMinArea = Number(targetCat.area_minima ?? targetCat.area) || 200;
            const catMinEntrada = Number(targetCat.entrada_minima ?? targetCat.down) || 0;
            setArea(catMinArea);
            setEntrada(catMinEntrada);

            // Plazo y tasa fija al 8%
            const terms = targetUrb.categories
              .map((c: any) => Number(c.meses_plazo ?? c.term))
              .filter((t: number) => !isNaN(t) && t > 0);
            const minP = terms.length > 0 ? Math.min(...terms) : 12;
            const maxP = terms.length > 0 ? Math.max(...terms) : 36;

            if (targetCat.es_contado) {
              setPlazoMeses(0);
              setTasaAnual(0);
            } else {
              const catTerm = Number(targetCat.meses_plazo ?? targetCat.term) || minP;
              setPlazoMeses(Math.max(minP, Math.min(maxP, catTerm)));
              setTasaAnual(8); // Tasa siempre 8% para financiamiento
            }
          }
        }
      })
      .catch(err => console.warn('Could not load urbanizaciones in cotizador:', err));
  }, []);

  const handleProjectSelect = (projectName: string) => {
    setProject(projectName);
    const selected = urbanizacionesList.find((u: any) => u.name === projectName);
    if (selected && selected.categories && selected.categories.length > 0) {
      const firstCat = selected.categories[0];
      setCategory(firstCat.name);
      setCostoM2(Number(firstCat.costo_m2 ?? firstCat.cost) || selected.refPrice || 140);
      
      const newMinArea = Number(firstCat.area_minima ?? firstCat.area) || 200;
      setArea(newMinArea);

      const newMinEntrada = Number(firstCat.entrada_minima ?? firstCat.down) || 0;
      setEntrada(newMinEntrada);

      // Calcular rango de plazos del proyecto
      const terms = selected.categories
        .map((c: any) => Number(c.meses_plazo ?? c.term))
        .filter((t: number) => !isNaN(t) && t > 0);
      const minP = terms.length > 0 ? Math.min(...terms) : 12;
      const maxP = terms.length > 0 ? Math.max(...terms) : 36;

      if (firstCat.es_contado) {
        setPlazoMeses(0);
        setTasaAnual(0);
      } else {
        const catTerm = Number(firstCat.meses_plazo ?? firstCat.term) || minP;
        setPlazoMeses(Math.max(minP, Math.min(maxP, catTerm)));
        setTasaAnual(8); // Tasa siempre 8%
      }
    } else if (selected) {
      setCostoM2(Number(selected.refPrice || selected.ref_price) || 140);
      setTasaAnual(8);
    }
    setCalculated(false);
  };

  const handleCategorySelect = (catName: string) => {
    setCategory(catName);
    const selected = urbanizacionesList.find((u: any) => u.name === project);
    if (selected && selected.categories) {
      const cat = selected.categories.find((c: any) => c.name === catName);
      if (cat) {
        setCostoM2(Number(cat.costo_m2 ?? cat.cost) || 140);
        
        const catMinArea = Number(cat.area_minima ?? cat.area) || 200;
        // Cargar área mínima y no permitir que sea inferior
        setArea(prev => Math.max(prev, catMinArea));

        const catMinEntrada = Number(cat.entrada_minima ?? cat.down) || 0;
        // Cargar entrada inicial mínima y que no disminuya
        setEntrada(catMinEntrada);

        // Plazos
        const terms = selected.categories
          .map((c: any) => Number(c.meses_plazo ?? c.term))
          .filter((t: number) => !isNaN(t) && t > 0);
        const minP = terms.length > 0 ? Math.min(...terms) : 12;
        const maxP = terms.length > 0 ? Math.max(...terms) : 36;

        if (cat.es_contado) {
          setPlazoMeses(0);
          setTasaAnual(0);
        } else {
          const catTerm = Number(cat.meses_plazo ?? cat.term) || minP;
          setPlazoMeses(Math.max(minP, Math.min(maxP, catTerm)));
          setTasaAnual(8); // Tasa siempre 8%
        }
      }
    }
    setCalculated(false);
  };

  const [saving, setSaving] = useState(false);
  const [calculated, setCalculated] = useState(true);
  const [calculationFeedback, setCalculationFeedback] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isFullTableModalOpen, setIsFullTableModalOpen] = useState(false);
  const [searchCuota, setSearchCuota] = useState('');

  // Computed Values
  const precioTotal = (area || 0) * (costoM2 || 0);
  const descuentoMonto = precioTotal * ((descuentoPct || 0) / 100);
  const precioDescuento = Math.max(0, precioTotal - descuentoMonto);
  const financiado = Math.max(0, precioDescuento - (entrada || 0));
  const isContado = plazoMeses === 0;

  // Real-time French Amortization Engine (8% fixed annual interest rate)
  const amortizationData = useMemo(() => {
    if (isContado || plazoMeses <= 0 || financiado <= 0) {
      return {
        cuotaMensual: 0,
        totalInteres: 0,
        schedule: [] as AmortizationRow[],
        totalPagar: precioDescuento
      };
    }

    // Tasa mensualizada francesa: i = 8% / 12 = 0.08 / 12 = 0.0066666...
    const r = (8 / 12) / 100;
    // R = P * [ r / (1 - (1 + r)^(-n)) ]
    const monthlyPayment = financiado * (r / (1 - Math.pow(1 + r, -plazoMeses)));

    let balance = financiado;
    let interestSum = 0;
    const computedRows: AmortizationRow[] = [];

    for (let i = 1; i <= plazoMeses; i++) {
      const interest = balance * r;
      let principal = monthlyPayment - interest;
      
      // En la última cuota o si la diferencia es mínima, liquidar saldo exacto a cero
      if (i === plazoMeses || balance - principal < 0.01) {
        principal = balance;
      }
      const endBalance = Math.max(0, balance - principal);
      const actualInstallment = principal + interest;
      interestSum += interest;

      computedRows.push({
        n: i,
        start: balance,
        installment: i === plazoMeses ? actualInstallment : monthlyPayment,
        interest: interest,
        principal: principal,
        end: endBalance
      });
      balance = endBalance;
    }

    return {
      cuotaMensual: monthlyPayment,
      totalInteres: interestSum,
      schedule: computedRows,
      totalPagar: entrada + (monthlyPayment * plazoMeses)
    };
  }, [isContado, plazoMeses, financiado, precioDescuento, entrada]);

  const cuotaMensual = amortizationData.cuotaMensual;
  const totalInteres = amortizationData.totalInteres;
  const schedule = amortizationData.schedule;
  const totalPagar = amortizationData.totalPagar;

  // Schedule filtered for modal if searching by cuota #
  const modalSchedule = useMemo(() => {
    if (!searchCuota.trim()) return schedule;
    const q = searchCuota.trim().toLowerCase().replace('cuota', '').replace('#', '').trim();
    const num = parseInt(q, 10);
    if (!isNaN(num)) {
      return schedule.filter(r => r.n === num);
    }
    return schedule;
  }, [schedule, searchCuota]);

  const currentProformaObject: Proforma = useMemo(() => ({
    id: 9999,
    number: 'PF-2026-COT',
    client_name: clientName || 'Cliente Prospecto',
    project,
    category,
    value: isContado ? precioDescuento : (entrada + cuotaMensual * plazoMeses),
    status: 'En Cotización',
    date: new Date().toLocaleDateString('es-EC'),
    advisor: 'Andrea Cedeño',
    details: {
      area,
      costoM2,
      discount: descuentoPct,
      down: entrada,
      rate: isContado ? 0 : 8,
      term: plazoMeses,
      celular: phone,
      cedula,
      correo: email,
      direccion: address,
      sistema: 'Sistema Francés (Cuota Fija)'
    }
  }), [clientName, project, category, isContado, precioDescuento, entrada, cuotaMensual, plazoMeses, area, costoM2, descuentoPct, phone, cedula, email, address]);

  const runCalculations = () => {
    // Controlar que el área no sea menos del metro cuadrado mínimo
    if (minArea > 0 && area < minArea) {
      alert(`El área ingresada (${area} m²) no puede ser menor al área mínima requerida de ${minArea} m² para esta categoría en ${project}.`);
      setArea(minArea);
      return;
    }
    if (area <= 0 || costoM2 <= 0) {
      alert('Ingresa valores de área y costo m² válidos.');
      return;
    }
    // Controlar que la entrada no disminuya de la entrada mínima
    if (minEntrada > 0 && entrada < minEntrada) {
      alert(`La entrada inicial ($${entrada.toLocaleString()} USD) no puede ser menor a la entrada mínima establecida de $${minEntrada.toLocaleString()} USD.`);
      setEntrada(minEntrada);
      return;
    }
    if (entrada > precioDescuento) {
      alert('La entrada no puede ser mayor al valor neto con descuento del terreno.');
      return;
    }
    // Controlar que el plazo esté entre el plazo mínimo y máximo de la urbanización seleccionada
    if (!isContado && (plazoMeses < minPlazo || plazoMeses > maxPlazo)) {
      alert(`El plazo debe estar comprendido entre ${minPlazo} y ${maxPlazo} meses para la urbanización ${project}.`);
      setPlazoMeses(minPlazo);
      return;
    }

    setCalculated(true);
    setCalculationFeedback(true);
    setTimeout(() => setCalculationFeedback(false), 3000);

    const tableEl = document.getElementById('tabla-amortizacion-container');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSave = async () => {
    if (!clientName.trim()) {
      alert('Por favor, ingresa el nombre del cliente para registrar la proforma.');
      return;
    }
    if (minArea > 0 && area < minArea) {
      alert(`El área no puede ser menor al mínimo de ${minArea} m².`);
      return;
    }
    if (minEntrada > 0 && entrada < minEntrada) {
      alert(`La entrada inicial no puede ser menor a $${minEntrada.toLocaleString()} USD.`);
      return;
    }

    setSaving(true);
    const details = {
      area,
      costoM2,
      discount: descuentoPct,
      down: entrada,
      rate: isContado ? 0 : 8,
      term: plazoMeses,
      celular: phone,
      cedula,
      correo: email,
      direccion: address,
      sistema: 'Sistema Francés (Cuota Fija)'
    };

    const num = await onSaveProforma({
      client_name: clientName,
      project,
      category,
      value: isContado ? precioDescuento : (entrada + cuotaMensual * plazoMeses),
      status: 'Enviada',
      details
    });

    setSaving(false);
    if (num) {
      alert(`¡Proforma ${num} guardada con éxito en la base de datos!`);
    }
  };

  const handlePrintPdf = () => {
    const totalPagar = isContado ? precioDescuento : (entrada + cuotaMensual * plazoMeses);
    const num = 'PF-2026-NUEVA';

    const rowsHtml = isContado ? '' : schedule.map(r => `
      <tr style="border-bottom: 1px solid #f1f5f9; text-align: left; font-size: 11px;">
        <td style="padding: 6px;">${r.n}</td>
        <td style="padding: 6px;">$${Math.round(r.start).toLocaleString()}</td>
        <td style="padding: 6px;">$${Math.round(r.installment).toLocaleString()}</td>
        <td style="padding: 6px;">$${Math.round(r.interest).toLocaleString()}</td>
        <td style="padding: 6px;">$${Math.round(r.principal).toLocaleString()}</td>
        <td style="padding: 6px;">$${Math.round(r.end).toLocaleString()}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Proforma Inmobiliaria - ${clientName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; }
            .brand { font-size: 20px; font-weight: bold; color: #0f172a; }
            .summary-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .summary-table td, .summary-table th { padding: 8px; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
            .total-row { font-size: 16px; font-weight: bold; color: #0f172a; }
            .sched { width: 100%; border-collapse: collapse; margin-top: 30px; }
            .sched th { background-color: #f1f5f9; color: #0f172a; padding: 6px; font-size: 11px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">CORPORACIÓN ZAVALA</div>
              <div style="font-size: 11px; color: #64748b;">CRM Corporación Zavala · Santo Domingo</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 14px; font-weight: bold; color: #334155;">PROFORMA DE TERRENO</div>
              <div style="font-size: 12px; color: #0f172a; font-weight: bold;">CÓDIGO: TEMPORAL</div>
            </div>
          </div>
          
          <table class="summary-table">
            <tr><td><strong>Cliente:</strong> ${clientName}</td><td><strong>Proyecto:</strong> ${project}</td></tr>
            <tr><td><strong>Celular:</strong> ${phone}</td><td><strong>Categoría:</strong> ${category}</td></tr>
            <tr><td><strong>Manzana / Lote:</strong> Mz. ${manzana} / Lote ${lote}</td><td><strong>Área:</strong> ${area} m²</td></tr>
            <tr><td><strong>Costo m²:</strong> $${costoM2}</td><td><strong>Valor sin descuento:</strong> $${precioTotal.toLocaleString()}</td></tr>
            <tr><td><strong>Descuento:</strong> ${descuentoPct}% ($${descuentoMonto.toLocaleString()})</td><td><strong>Precio Final:</strong> $${precioDescuento.toLocaleString()}</td></tr>
            <tr><td><strong>Entrada:</strong> $${entrada.toLocaleString()}</td><td><strong>Financiado:</strong> $${financiado.toLocaleString()}</td></tr>
            <tr><td><strong>Tasa Interés:</strong> ${isContado ? '0%' : '8.00% anual (Fija)'}</td><td><strong>Plazo:</strong> ${plazoMeses} meses</td></tr>
            ${!isContado ? `<tr><td><strong>Sistema Amortización:</strong> Tabla Francesa (Cuota Fija)</td><td><strong>Cuota Mensual:</strong> $${Math.ceil(cuotaMensual).toLocaleString()}</td></tr>
            <tr><td><strong>Interés total:</strong> $${Math.round(totalInteres).toLocaleString()}</td><td><strong>Total Cuotas:</strong> $${Math.round(cuotaMensual * plazoMeses).toLocaleString()}</td></tr>` : ''}
            <tr class="total-row"><td>TOTAL A PAGAR:</td><td>$${Math.round(totalPagar).toLocaleString()}</td></tr>
          </table>

          ${!isContado ? `
            <h4 style="margin-top: 40px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Cronograma Francés de Cuotas Estimadas (8.00% Anual)</h4>
            <table class="sched">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Saldo Inicial</th>
                  <th>Cuota Fija</th>
                  <th>Interés (8%)</th>
                  <th>Capital</th>
                  <th>Saldo Final</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          ` : ''}

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            };
          </script>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
    } else {
      alert('La ventana emergente fue bloqueada por el navegador. Permite las ventanas emergentes para imprimir.');
    }
  };

  const handleClear = () => {
    setClientName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCedula('');
    if (selectedPlan) {
      const cMinArea = Number(selectedPlan.area_minima ?? selectedPlan.area) || 200;
      const cMinEntrada = Number(selectedPlan.entrada_minima ?? selectedPlan.down) || 0;
      setArea(cMinArea);
      setCostoM2(Number(selectedPlan.costo_m2 ?? selectedPlan.cost) || 140);
      setEntrada(cMinEntrada);
      setPlazoMeses(selectedPlan.es_contado ? 0 : Math.max(minPlazo, Math.min(maxPlazo, Number(selectedPlan.meses_plazo ?? selectedPlan.term) || minPlazo)));
      setTasaAnual(selectedPlan.es_contado ? 0 : 8);
    } else {
      setArea(200);
      setCostoM2(140);
      setEntrada(5000);
      setPlazoMeses(minPlazo || 36);
      setTasaAnual(8);
    }
    setDescuentoPct(0);
    setCalculated(true);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900 font-display">Cotizador Financiero Pro</h2>
          <p className="text-xs text-slate-400">Genera proformas personalizadas con tablas de amortización en tiempo real</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleClear}
            className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw size={13} />
            <span>Limpiar</span>
          </button>
          <button 
            onClick={handlePrintPdf}
            className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Printer size={13} />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Input Cards Container */}
        <div className="xl:col-span-2 space-y-6">
          {/* Client Details */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={13} className="text-slate-400" />
                1. Identificación del Cliente (Solo Lectura)
              </h3>
              <span className="text-[10px] text-slate-500 font-medium bg-slate-100 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                <Lock size={10} /> Datos cargados desde CRM
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Nombre del Prospecto</label>
                <input 
                  type="text"
                  placeholder="Se asigna desde el módulo de Leads"
                  value={clientName || ''}
                  readOnly
                  className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium outline-none cursor-not-allowed select-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Celular WhatsApp</label>
                <input 
                  type="text"
                  placeholder="Se asigna desde el módulo de Leads"
                  value={phone || ''}
                  readOnly
                  className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium outline-none cursor-not-allowed select-none font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Cédula / RUC</label>
                <input 
                  type="text"
                  placeholder="Se asigna desde el módulo de Leads"
                  value={cedula || ''}
                  readOnly
                  className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium outline-none cursor-not-allowed select-none font-mono"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Dirección Domiciliaria</label>
                <input 
                  type="text"
                  placeholder="Registrada en el expediente del cliente"
                  value={address || ''}
                  readOnly
                  className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-medium outline-none cursor-not-allowed select-none"
                />
              </div>
            </div>
          </div>

          {/* Lot & Land Details */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building size={14} className="text-rose-600" />
                2. Datos del Inmueble y Proyecto
              </h3>
              {selectedUrb && (
                <span className="text-[10px] text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <MapPin size={10} className="text-rose-600" />
                  {selectedUrb.city || 'Santo Domingo'} · {selectedUrb.code || 'PRJ'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Proyecto Inmobiliario */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Proyecto Inmobiliario / Urbanización <span className="text-rose-500">*</span></span>
                  {urbanizacionesList.length > 0 && (
                    <span className="text-[10px] text-emerald-600 font-bold">● Base de Datos ({urbanizacionesList.length})</span>
                  )}
                </label>
                <div className="relative">
                  <select 
                    value={project || ''}
                    onChange={(e) => handleProjectSelect(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition cursor-pointer appearance-none pr-8"
                  >
                    {urbanizacionesList.length > 0 ? (
                      urbanizacionesList.map((u: any) => (
                        <option key={u.id} value={u.name}>
                          {u.name} — {u.city} {u.code ? `(${u.code})` : ''}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="DIVINA MISERICORDIA I">DIVINA MISERICORDIA I — Santo Domingo</option>
                        <option value="DIVINA MISERICORDIA 2">DIVINA MISERICORDIA 2 — Santo Domingo</option>
                        <option value="LA DOLOROSA">LA DOLOROSA — Santo Domingo</option>
                      </>
                    )}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Tipología / Categoría */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Tipología / Categoría Lote <span className="text-rose-500">*</span></span>
                  {selectedPlan && (
                    <span className={`text-[10px] font-bold ${selectedPlan.es_contado ? 'text-amber-700' : 'text-blue-700'}`}>
                      {selectedPlan.es_contado ? '💵 Contado' : `💳 Crédito ${selectedPlan.meses_plazo || selectedPlan.term || 36}m`}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <select 
                    value={category || ''}
                    onChange={(e) => handleCategorySelect(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition cursor-pointer appearance-none pr-8 uppercase"
                  >
                    {selectedUrb && selectedUrb.categories && selectedUrb.categories.length > 0 ? (
                      selectedUrb.categories.map((c: any, idx: number) => (
                        <option key={idx} value={c.name}>
                          {c.name} — ${c.costo_m2 || c.cost} USD/m² • Mín. {c.area_minima || c.area}m² • {c.es_contado ? 'Contado' : `${c.meses_plazo || c.term || 36}m`}
                        </option>
                      ))
                    ) : (
                      <option value="COMERCIAL">COMERCIAL — $140 USD/m²</option>
                    )}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Plan Info Banner cargado del proyecto */}
            {selectedPlan && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-2.5 text-slate-600">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    selectedPlan.es_contado 
                      ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {selectedPlan.es_contado ? '💵 Venta al Contado' : `💳 Crédito Directo ${selectedPlan.meses_plazo || selectedPlan.term || 36} Meses (${selectedPlan.anios_plazo || Math.round((selectedPlan.meses_plazo || 36)/12)} años)`}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700">
                    Plazo Entrada: <strong className="text-slate-900">{selectedPlan.plazo_entrada || (selectedPlan.es_contado ? 'CONTADO' : '2 MESES')}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] flex-wrap">
                  <span>Área Mín. Catálogo: <strong>{selectedPlan.area_minima || selectedPlan.area || 200} m²</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Precio Catálogo: <strong className="text-rose-700 font-bold">${selectedPlan.costo_m2 || selectedPlan.cost}/m²</strong></span>
                  <span className="text-slate-300">•</span>
                  <span>Entrada Mín: <strong>{formatCurrency(selectedPlan.entrada_minima || selectedPlan.down || 0)}</strong></span>
                </div>
              </div>
            )}

            {/* Grid for Manzana, Lote, Área (Editable), and Precio m² (Estático / Inmodificable) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Manzana</label>
                <input 
                  type="text"
                  placeholder="Ej: 3"
                  value={manzana || ''}
                  onChange={(e) => setManzana(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Lote N°</label>
                <input 
                  type="text"
                  placeholder="Ej: 8"
                  value={lote || ''}
                  onChange={(e) => setLote(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-slate-900 transition"
                />
              </div>

              {/* Área mínima como EDITABLE con control estricto */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>Área Lote (m²)</span>
                    <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">Editable</span>
                  </label>
                  {minArea > 0 && area !== minArea && (
                    <button
                      type="button"
                      onClick={() => setArea(minArea)}
                      className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                      title="Restablecer al área mínima requerida"
                    >
                      Mín: {minArea} m²
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input 
                    type="number"
                    min={minArea > 0 ? minArea : 1}
                    step="0.01"
                    value={area ?? 0}
                    onChange={(e) => setArea(Number(e.target.value) || 0)}
                    onBlur={() => {
                      if (minArea > 0 && area < minArea) {
                        setArea(minArea);
                      }
                    }}
                    className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-xs text-slate-800 font-bold outline-none focus:bg-white focus:ring-2 transition ${
                      minArea > 0 && area < minArea 
                        ? 'border-rose-400 focus:ring-rose-500/20 text-rose-700' 
                        : 'border-slate-200 focus:ring-rose-500/20 focus:border-rose-600'
                    }`}
                    placeholder={`Mín. ${minArea || 200} m²`}
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                    m²
                  </span>
                </div>
                {minArea > 0 && area < minArea ? (
                  <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                    <AlertTriangle size={11} /> No puede ser menor a {minArea} m²
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    Mínimo requerido: {minArea || 200} m²
                  </span>
                )}
              </div>

              {/* Precio m² ESTÁTICO (NO MODIFICABLE) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Lock size={11} className="text-amber-600" />
                    <span>Precio m² ($ USD)</span>
                  </label>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded">
                    Estático
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">$</span>
                  <input 
                    type="number"
                    value={costoM2 ?? 0}
                    readOnly
                    tabIndex={-1}
                    className="w-full pl-6 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-not-allowed select-none outline-none"
                    title="El precio por m² es estático y se define automáticamente por la tipología seleccionada"
                  />
                  <Lock size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  🔒 Fijo según Tipología
                </span>
              </div>
            </div>
          </div>

          {/* Financing parameters */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Financiamiento y Condiciones de Pago
              </h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" />
                Tabla Francesa · Tasa 8% Fija
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Entrada Inicial Mínima (Control que no disminuya de la mínima) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Entrada Inicial ($ USD)</label>
                  {minEntrada > 0 && entrada > minEntrada && (
                    <button
                      type="button"
                      onClick={() => setEntrada(minEntrada)}
                      className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                      title="Restablecer a la entrada mínima"
                    >
                      Mín: ${minEntrada.toLocaleString()}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">$</span>
                  <input 
                    type="number"
                    min={minEntrada > 0 ? minEntrada : 0}
                    value={entrada ?? 0}
                    onChange={(e) => setEntrada(Number(e.target.value) || 0)}
                    onBlur={() => {
                      if (minEntrada > 0 && entrada < minEntrada) {
                        setEntrada(minEntrada);
                      }
                    }}
                    className={`w-full pl-6 pr-3 py-2 bg-slate-50 border rounded-lg text-xs font-bold text-slate-800 outline-none focus:bg-white focus:ring-2 transition ${
                      minEntrada > 0 && entrada < minEntrada
                        ? 'border-rose-400 text-rose-700 focus:ring-rose-500/20'
                        : 'border-slate-200 focus:ring-rose-500/20 focus:border-rose-600'
                    }`}
                    placeholder={`Mín. $${minEntrada.toLocaleString()}`}
                  />
                </div>
                {minEntrada > 0 && entrada < minEntrada ? (
                  <span className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                    <AlertTriangle size={11} /> No puede ser menor a ${minEntrada.toLocaleString()}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    Mínima requerida: ${minEntrada.toLocaleString()} USD
                  </span>
                )}
              </div>

              {/* Descuento Comercial */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Descuento Comercial (%)</label>
                <div className="relative">
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={descuentoPct ?? 0}
                    onChange={(e) => setDescuentoPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-semibold outline-none focus:bg-white focus:ring-1 focus:ring-slate-900"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {descuentoPct > 0 ? `Ahorro: $${descuentoMonto.toLocaleString()}` : 'Sin descuento'}
                </span>
              </div>

              {/* Plazo: Cargado por meses / años hasta el máximo de financiamiento */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>Plazo financiado</span>
                  </label>
                </div>

                <div className="relative">
                  {selectedPlan?.es_contado ? (
                    <select
                      value={0}
                      disabled
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 font-bold outline-none cursor-not-allowed appearance-none pr-8"
                    >
                      <option value={0}>0 meses (Pago al Contado)</option>
                    </select>
                  ) : (
                    <select
                      value={plazoMeses ?? availablePlazos[0]?.meses ?? 36}
                      onChange={(e) => setPlazoMeses(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-bold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition cursor-pointer appearance-none pr-8"
                    >
                      {availablePlazos.map((item) => (
                        <option key={item.meses} value={item.meses}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    {selectedPlan?.es_contado 
                      ? 'Venta al Contado' 
                      : `Plazo activo: ${plazoMeses} meses (${Math.round((plazoMeses || 12) / 12)} Años)`}
                  </span>
                  {!selectedPlan?.es_contado && (
                    <span className="text-slate-500 font-medium">
                      Máx permitido: {maxPlazo}m
                    </span>
                  )}
                </div>
              </div>

              {/* Tasa Interés Anual: Siempre 8% */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <Lock size={11} className="text-emerald-700" />
                    <span>Tasa Interés Anual</span>
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                    8% Fija
                  </span>
                </div>
                <div className="relative">
                  <input 
                    type="text"
                    value={isContado ? '0.00% (Contado)' : '8.00%'}
                    readOnly
                    tabIndex={-1}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-emerald-800 cursor-not-allowed select-none outline-none"
                    title="La tasa de interés anual corporativa es fija al 8% en sistema francés"
                  />
                  <Lock size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <span className="text-[10px] text-emerald-700 font-medium">
                  {isContado ? 'Sin interés (Contado)' : 'Tasa fija 8% anual garantizada'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 flex-wrap">
              <button
                type="button"
                onClick={runCalculations}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2.5 border border-slate-200 rounded-lg flex items-center gap-1.5 shadow-xs transition duration-150 cursor-pointer"
              >
                <Calculator size={14} className="text-rose-600" />
                <span>Calcular (Tabla Francesa)</span>
              </button>

              {!isContado && schedule.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsFullTableModalOpen(true)}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-xs transition duration-150 cursor-pointer"
                >
                  <TableProperties size={14} />
                  <span>Ver Tabla de Amortización</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  runCalculations();
                  setIsPreviewModalOpen(true);
                }}
                className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-xs transition duration-150 cursor-pointer"
              >
                <Eye size={14} />
                <span>Ver Proforma</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 cursor-pointer"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                <span>Guardar Proforma</span>
              </button>
            </div>
          </div>
        </div>

        {/* Calculation Result Panel */}
        <div className="space-y-6">
          {/* Summary Box */}
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xs space-y-4 border border-slate-950">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm tracking-tight">Métricas Financieras</h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  {isContado ? 'Venta al Contado' : 'Tabla Francesa (Cuota Nivelada Fija)'}
                </p>
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                isContado ? 'bg-amber-600 text-white' : 'bg-[#E11D48] text-white'
              }`}>
                {isContado ? 'Contado' : '8% Fijo'}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Valor Terreno:</span>
                <span className="font-semibold text-white">{formatCurrency(precioTotal, true)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Descuento aplicado:</span>
                <span className="font-semibold text-white">-{formatCurrency(descuentoMonto, true)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Valor Final Neto:</span>
                <span className="font-bold text-white text-sm">{formatCurrency(precioDescuento, true)}</span>
              </div>
              <div className="h-px bg-slate-800 my-2" />
              <div className="flex justify-between text-slate-300">
                <span>Entrada inicial:</span>
                <span className="font-semibold text-white">{formatCurrency(entrada, true)}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Monto Financiado:</span>
                <span className="font-semibold text-white">{formatCurrency(financiado, true)}</span>
              </div>
              {!isContado && (
                <>
                  <div className="flex justify-between text-slate-300">
                    <span>Tasa Anual Aplicada:</span>
                    <span className="font-semibold text-emerald-400">8.00% Anual Fija</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Interés Directo total:</span>
                    <span className="font-semibold text-white">{formatCurrency(Math.round(totalInteres), true)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 border-t border-slate-800 pt-2">
                    <div>
                      <span className="font-bold block">Cuota Mensual Fija:</span>
                      <span className="text-[10px] text-slate-400 font-normal">Sistema Francés</span>
                    </div>
                    <span className="font-bold text-slate-100 text-lg">{formatCurrency(Math.ceil(cuotaMensual), true)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between border-t border-slate-800 pt-2.5 text-sm font-bold text-slate-300">
                <span>Total a pagar:</span>
                <span className="text-white text-base font-extrabold">{formatCurrency(Math.round(totalPagar), true)}</span>
              </div>
            </div>

            {!isContado && schedule.length > 0 && (
              <button
                type="button"
                onClick={() => setIsFullTableModalOpen(true)}
                className="w-full mt-2 py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <TableProperties size={15} />
                <span>Ver Tabla de Amortización ({schedule.length} cuotas)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <ProformaModal
        proforma={currentProformaObject}
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
      />

      {/* MODAL DE TABLA COMPLETA DE AMORTIZACIÓN */}
      {isFullTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
            {/* Header del Modal */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                  <TableProperties size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold tracking-tight text-white font-display">
                      Tabla Completa de Amortización Francesa
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Tasa 8.00% Anual Fija
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {schedule.length} Cuotas Niveladas
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {project} ({category}) · Capital Financiado: ${financiado.toLocaleString()} USD · Cuota Mensual Fija: ${Math.ceil(cuotaMensual).toLocaleString()} USD
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {/* Buscador de cuota en el modal */}
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar cuota #..."
                    value={searchCuota}
                    onChange={(e) => setSearchCuota(e.target.value)}
                    className="pl-7 pr-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-400 outline-none focus:ring-1 focus:ring-rose-500 w-32 sm:w-36"
                  />
                  {searchCuota && (
                    <button
                      type="button"
                      onClick={() => setSearchCuota('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      title="Limpiar búsqueda"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                >
                  <Printer size={13} />
                  <span className="hidden sm:inline">Imprimir / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsFullTableModalOpen(false)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer border border-slate-700"
                  title="Cerrar modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Sub-header con KPIs rápidos */}
            <div className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Financiado</span>
                <strong className="text-slate-800 font-mono">${financiado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-rose-500 block">Cuota Mensual</span>
                <strong className="text-rose-600 font-mono text-sm">${Math.ceil(cuotaMensual).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600 block">Total Intereses (8%)</span>
                <strong className="text-amber-700 font-mono">${totalInteres.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total a Pagar</span>
                <strong className="text-slate-900 font-mono">${Math.round(totalPagar).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
              </div>
            </div>

            {/* Contenedor Scrollable de la tabla completa */}
            <div className="flex-1 overflow-y-auto max-h-[60vh] p-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-bold text-[11px] uppercase tracking-wider shadow-2xs border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 text-center w-16 bg-slate-100"># Cuota</th>
                    <th className="py-2.5 px-4 bg-slate-100">Saldo Inicial</th>
                    <th className="py-2.5 px-4 bg-rose-100 text-rose-900">Cuota Fija (Francés)</th>
                    <th className="py-2.5 px-4 bg-slate-100 text-amber-800">Interés (8% Anual)</th>
                    <th className="py-2.5 px-4 bg-slate-100 text-emerald-800">Abono Capital</th>
                    <th className="py-2.5 px-4 bg-slate-100">Saldo Final</th>
                    <th className="py-2.5 px-4 bg-slate-100 text-center">Progreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {modalSchedule.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        No se encontró ninguna cuota que coincida con #{searchCuota}.
                      </td>
                    </tr>
                  ) : (
                    modalSchedule.map((row) => {
                      const amortizadoAcumulado = financiado - row.end;
                      const pctAmortizado = financiado > 0 ? Math.min(100, Math.max(0, (amortizadoAcumulado / financiado) * 100)) : 0;

                      return (
                        <tr 
                          key={row.n} 
                          className="hover:bg-slate-50 transition duration-75 text-slate-700 font-medium"
                        >
                          <td className="py-2 px-4 text-center font-bold text-slate-800">
                            <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[11px] font-mono">
                              {row.n}
                            </span>
                          </td>
                          <td className="py-2 px-4 font-mono text-slate-600">
                            ${row.start.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-4 font-bold font-mono text-slate-900 bg-rose-50/50">
                            ${row.installment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-4 font-semibold font-mono text-amber-700">
                            ${row.interest.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-4 font-semibold font-mono text-emerald-700">
                            ${row.principal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-4 font-bold font-mono text-slate-800">
                            ${row.end.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: `${pctAmortizado}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono font-bold text-slate-400 w-9 text-right">
                                {pctAmortizado.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot className="sticky bottom-0 z-10 bg-slate-900 text-white font-bold text-xs shadow-md border-t-2 border-slate-800">
                  <tr>
                    <td className="py-2.5 px-4 text-center uppercase tracking-wider text-[11px] text-slate-300">
                      TOTALES
                    </td>
                    <td className="py-2.5 px-4 text-slate-300 text-[11px]">
                      Inicial: ${financiado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-white text-sm">
                      ${(schedule.reduce((acc, r) => acc + r.installment, 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-amber-400 text-sm">
                      ${totalInteres.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-emerald-400 text-sm">
                      ${financiado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-white text-sm">
                      $0.00
                    </td>
                    <td className="py-2.5 px-4 text-center text-emerald-400 text-[11px]">
                      100% Amortizado
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer del Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {searchCuota ? (
                  <>Mostrando cuota filtrada de un total de <strong>{schedule.length} meses</strong></>
                ) : (
                  <>Total de cuotas en el cronograma: <strong>{schedule.length} meses</strong> · Tasa corporativa 8% fija anual</>
                )}
              </span>
              <button
                type="button"
                onClick={() => setIsFullTableModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition cursor-pointer shadow-xs"
              >
                Cerrar Tabla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
