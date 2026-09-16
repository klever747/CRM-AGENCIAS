import React from 'react';
import { X, Printer, MessageSquare, FileText, CheckCircle2, Building2, User, Phone, Calendar, CreditCard, ShieldCheck } from 'lucide-react';
import { Proforma } from '../types';
import { formatCurrency, formatPhoneToEcuador } from '../lib/utils';

interface ProformaModalProps {
  proforma: Proforma | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProformaModal({ proforma, isOpen, onClose }: ProformaModalProps) {
  if (!isOpen || !proforma) return null;

  const details = proforma.details || {
    area: 200,
    costoM2: 300,
    discount: 0,
    down: Math.round(proforma.value * 0.2),
    rate: 8,
    term: 12
  };

  const area = details.area || 200;
  const costoM2 = details.costoM2 || 300;
  const precioLista = area * costoM2;
  const descuentoPct = details.discount || 0;
  const descuentoMonto = precioLista * (descuentoPct / 100);
  const precioDescuento = precioLista - descuentoMonto;
  const entrada = details.down || 0;
  const financiado = Math.max(0, precioDescuento - entrada);
  const plazoMeses = details.term || 12;
  const tasaAnual = details.rate || 8;
  const isContado = plazoMeses === 0;

  // Monthly installment estimation
  let cuotaMensual = 0;
  if (!isContado && financiado > 0 && plazoMeses > 0) {
    const r = (tasaAnual / 12) / 100;
    if (r > 0) {
      cuotaMensual = financiado * (r / (1 - Math.pow(1 + r, -plazoMeses)));
    } else {
      cuotaMensual = financiado / plazoMeses;
    }
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor autorice la apertura de ventanas emergentes para imprimir.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Proforma Inmobiliaria - ${proforma.number} - ${proforma.client_name}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e11d48; padding-bottom: 20px; margin-bottom: 25px; }
            .company { font-size: 22px; font-weight: 800; color: #e11d48; letter-spacing: -0.5px; }
            .subtitle { font-size: 11px; color: #64748b; margin-top: 4px; text-transform: uppercase; font-weight: 600; }
            .doc-title { font-size: 16px; font-weight: 800; color: #0f172a; text-align: right; }
            .doc-num { font-size: 14px; font-weight: 700; color: #e11d48; text-align: right; margin-top: 4px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
            .card-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            .field-row { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 0; border-bottom: 1px dashed #f1f5f9; }
            .field-label { color: #64748b; font-weight: 500; }
            .field-value { font-weight: 700; color: #0f172a; }
            .highlight-box { background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 16px; margin-top: 20px; text-align: center; }
            .highlight-title { font-size: 11px; font-weight: 700; color: #be123c; text-transform: uppercase; }
            .highlight-value { font-size: 24px; font-weight: 800; color: #e11d48; margin-top: 4px; }
            .footer { margin-top: 40px; pt: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">INMOBILIARIA ZAVALA</div>
              <div class="subtitle">Desarrollos Urbanísticos & Proyectos Inmobiliarios</div>
            </div>
            <div>
              <div class="doc-title">COTIZACIÓN DE TERRENO</div>
              <div class="doc-num">PROFORMA Nº ${proforma.number}</div>
              <div style="font-size: 11px; color: #64748b; text-align: right; margin-top: 4px;">Fecha: ${proforma.date}</div>
            </div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Datos del Cliente</div>
              <div class="field-row"><span class="field-label">Cliente:</span><span class="field-value">${proforma.client_name}</span></div>
              <div class="field-row"><span class="field-label">Cédula:</span><span class="field-value">${details.cedula || 'N/A'}</span></div>
              <div class="field-row"><span class="field-label">Teléfono:</span><span class="field-value">${details.celular || 'N/A'}</span></div>
              <div class="field-row"><span class="field-label">Asesor Comercial:</span><span class="field-value">${proforma.advisor}</span></div>
            </div>

            <div class="card">
              <div class="card-title">Detalle del Terreno</div>
              <div class="field-row"><span class="field-label">Proyecto:</span><span class="field-value">${proforma.project}</span></div>
              <div class="field-row"><span class="field-label">Categoría:</span><span class="field-value">${proforma.category}</span></div>
              <div class="field-row"><span class="field-label">Área Total:</span><span class="field-value">${area} m²</span></div>
              <div class="field-row"><span class="field-label">Precio por m²:</span><span class="field-value">$${costoM2} USD</span></div>
            </div>
          </div>

          <div class="card" style="margin-bottom: 20px;">
            <div class="card-title">Estructura Financiera</div>
            <div class="field-row"><span class="field-label">Precio de Lista:</span><span class="field-value">$${precioLista.toLocaleString()} USD</span></div>
            ${descuentoPct > 0 ? `<div class="field-row"><span class="field-label">Descuento Comercial (${descuentoPct}%):</span><span class="field-value">-$${descuentoMonto.toLocaleString()} USD</span></div>` : ''}
            <div class="field-row"><span class="field-label">Precio Neto con Descuento:</span><span class="field-value">$${precioDescuento.toLocaleString()} USD</span></div>
            <div class="field-row"><span class="field-label">Entrada / Cuota Inicial:</span><span class="field-value">$${entrada.toLocaleString()} USD</span></div>
            <div class="field-row"><span class="field-label">Monto Financiado:</span><span class="field-value">$${financiado.toLocaleString()} USD</span></div>
            <div class="field-row"><span class="field-label">Plazo de Financiamiento:</span><span class="field-value">${isContado ? 'Pago de Contado' : `${plazoMeses} meses`}</span></div>
            ${!isContado ? `
              <div class="field-row"><span class="field-label">Tasa de Interés Anual:</span><span class="field-value">8.00% Fija Anual</span></div>
              <div class="field-row"><span class="field-label">Sistema de Amortización:</span><span class="field-value">Francés (Cuota Fija)</span></div>
              <div class="field-row"><span class="field-label">Cuota Mensual Estimada:</span><span class="field-value">$${Math.round(cuotaMensual).toLocaleString()} USD / mes</span></div>
            ` : ''}
          </div>

          <div class="highlight-box">
            <div class="highlight-title">VALOR TOTAL DE LA PROPIEDAD</div>
            <div class="highlight-value">$${proforma.value.toLocaleString()} USD</div>
            <div style="font-size: 11px; color: #881337; margin-top: 4px; font-weight: 600;">Validez del documento: 15 días calendario</div>
          </div>

          <div class="footer">
            <p>Este documento es una estimación comercial generada por el sistema CRM Zavala. No constituye una reserva definitiva del inmueble hasta el pago de la cuota inicial correspondiente.</p>
            <p>Oficina Central: Santo Domingo de los Tsáchilas, Ecuador &bull; Teléfono: +593 99 123 4567</p>
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleShareWhatsApp = () => {
    const rawPhone = details.celular || '';
    const formattedPhone = formatPhoneToEcuador(rawPhone).replace(/\D/g, '');
    const cleanPhone = formattedPhone ? `593${formattedPhone.slice(1)}` : '';

    const text = `Hola ${proforma.client_name}, adjunto el resumen de tu Proforma ${proforma.number} para el proyecto *${proforma.project}*:

📐 *Área:* ${area} m²
💰 *Precio Neto:* ${formatCurrency(precioDescuento, true)}
💵 *Entrada Mínima:* ${formatCurrency(entrada, true)}
📅 *Plazo:* ${isContado ? 'Pago de Contado' : `${plazoMeses} meses`}
${!isContado ? `💳 *Cuota Mensual Est.:* ${formatCurrency(Math.round(cuotaMensual), true)} / mes\n` : ''}
*Monto Total:* ${formatCurrency(proforma.value, true)}

Inmobiliaria Zavala - Santo Domingo
¿Deseas agendar una visita a la urbanización?`;

    const url = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 my-8 animate-in zoom-in-95 duration-200">
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-[#E11D48] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight font-display">
                  Proforma {proforma.number}
                </h3>
                <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                  {proforma.status}
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium mt-0.5">
                Inmobiliaria Zavala &bull; Emisión: {proforma.date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-rose-100 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Proforma Document Body */}
        <div className="p-6 space-y-6 text-xs text-slate-700">
          {/* Client & Advisor Overview Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Información del Cliente</span>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <User size={15} className="text-[#E11D48]" />
                <span>{proforma.client_name}</span>
              </div>
              {details.cedula && (
                <div className="text-slate-500 font-medium">Cédula/RUC: <strong className="text-slate-700">{details.cedula}</strong></div>
              )}
              {details.celular && (
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Phone size={12} className="text-slate-400" />
                  <span>{details.celular}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5 sm:text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asesor Comercial Asignado</span>
              <div className="font-bold text-slate-800 text-sm">{proforma.advisor}</div>
              <div className="text-slate-500 font-medium">Proyecto: <strong className="text-[#E11D48] font-bold">{proforma.project}</strong></div>
              <div className="text-slate-500 font-medium">Categoría: <strong className="text-slate-700">{proforma.category}</strong></div>
            </div>
          </div>

          {/* Technical Property Breakdown */}
          <div>
            <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Building2 size={14} className="text-[#E11D48]" />
              <span>Especificaciones del Lote & Valor de Lista</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Área de Lote</span>
                <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{area} m²</span>
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Precio por m²</span>
                <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">${costoM2} USD</span>
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Precio Lista</span>
                <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{formatCurrency(precioLista, true)}</span>
              </div>
              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-2xs">
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Descuento</span>
                <span className="text-sm font-extrabold text-rose-700 mt-0.5 block">
                  {descuentoPct > 0 ? `${descuentoPct}% (-${formatCurrency(descuentoMonto, true)})` : 'Sin Descuento'}
                </span>
              </div>
            </div>
          </div>

          {/* Financial Plan Breakdown Table */}
          <div>
            <h4 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <CreditCard size={14} className="text-[#E11D48]" />
              <span>Plan Financiero & Amortización Directa</span>
            </h4>
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
              <div className="p-3 flex justify-between items-center">
                <span className="font-medium text-slate-600">Precio Neto del Terreno:</span>
                <span className="font-bold text-slate-900 text-sm">{formatCurrency(precioDescuento, true)}</span>
              </div>
              <div className="p-3 flex justify-between items-center bg-rose-50/50">
                <span className="font-bold text-rose-900">Entrada Mínima (Cuota Inicial):</span>
                <span className="font-extrabold text-[#E11D48] text-sm">{formatCurrency(entrada, true)}</span>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span className="font-medium text-slate-600">Saldo a Financiar Directo:</span>
                <span className="font-bold text-slate-900 text-sm">{formatCurrency(financiado, true)}</span>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span className="font-medium text-slate-600">Plazo de Financiamiento:</span>
                <span className="font-bold text-slate-900">{isContado ? 'Pago de Contado' : `${plazoMeses} Meses`}</span>
              </div>
              {!isContado && (
                <>
                  <div className="p-3 flex justify-between items-center">
                    <span className="font-medium text-slate-600">Tasa de Interés Anual:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-xs">8.00% Fija Anual</span>
                  </div>
                  <div className="p-3 flex justify-between items-center">
                    <span className="font-medium text-slate-600">Sistema de Amortización:</span>
                    <span className="font-semibold text-slate-800 text-xs">Tabla Francesa (Cuota Fija)</span>
                  </div>
                  <div className="p-3 flex justify-between items-center bg-amber-50/60">
                    <span className="font-bold text-amber-900">Cuota Mensual Estimada:</span>
                    <span className="font-extrabold text-amber-800 text-sm">{formatCurrency(Math.round(cuotaMensual), true)} / mes</span>
                  </div>
                </>
              )}
              <div className="p-4 flex justify-between items-center bg-slate-900 text-white">
                <div>
                  <span className="font-extrabold uppercase tracking-wider block text-[10px] text-slate-300">Monto Total de la Cotización</span>
                  <span className="text-xs text-rose-300 font-semibold">Incluye financiamiento directo</span>
                </div>
                <span className="font-black text-xl text-emerald-400">{formatCurrency(proforma.value, true)}</span>
              </div>
            </div>
          </div>

          {/* Guarantees Note */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center gap-2 text-[10px] text-slate-500">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Documento respaldado por Corporación Inmobiliaria Zavala. Validez comercial de la cotización: 15 días calendario a partir de su emisión.</span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimir / PDF</span>
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
            >
              <MessageSquare size={14} />
              <span>Enviar por WhatsApp</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
