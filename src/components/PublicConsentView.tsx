import React, { useState, useEffect } from 'react';
import { ShieldCheck, Loader2, CheckCircle, FileText, Check, AlertCircle, Building2, Download } from 'lucide-react';
import { Lead } from '../types';

interface PublicConsentViewProps {
  leadId: number;
  onClose?: () => void;
}

export default function PublicConsentView({ leadId }: PublicConsentViewProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [acceptedDateStr, setAcceptedDateStr] = useState('');

  const handleDownloadPdf = () => {
    if (!lead) return;
    const certNumber = `CZ-LOPDP-${String(lead.id).padStart(5, '0')}-${new Date().getFullYear()}`;
    const currentDate = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor autorice la apertura de ventanas emergentes para generar e imprimir el PDF.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <title>Consentimiento WhatsApp - COFIZA - ${lead.name} - ${certNumber}</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { 
              font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; 
              color: #1e293b; 
              line-height: 1.5; 
              margin: 0; 
              padding: 24px;
              background: #fff;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              border-bottom: 2px solid #e11d48; 
              padding-bottom: 14px; 
              margin-bottom: 18px; 
            }
            .brand-title { 
              font-size: 22px; 
              font-weight: 900; 
              color: #e11d48; 
              letter-spacing: -0.5px; 
              text-transform: uppercase;
            }
            .brand-sub { 
              font-size: 10px; 
              color: #64748b; 
              font-weight: 600; 
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .doc-badge { 
              text-align: right; 
            }
            .doc-tag { 
              display: inline-block;
              background: #ecfdf5; 
              color: #065f46; 
              border: 1px solid #a7f3d0; 
              padding: 4px 10px; 
              border-radius: 9999px; 
              font-size: 10px; 
              font-weight: 700; 
              text-transform: uppercase;
            }
            .doc-num { 
              font-size: 11px; 
              font-weight: 700; 
              color: #0f172a; 
              margin-top: 5px; 
              font-family: monospace;
            }
            .title-section { 
              text-align: center; 
              margin-bottom: 18px; 
            }
            .main-title { 
              font-size: 15px; 
              font-weight: 800; 
              color: #0f172a; 
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .main-subtitle { 
              font-size: 13px; 
              color: #e11d48; 
              font-weight: 800;
              margin-top: 2px; 
            }
            .intro-text {
              font-size: 11px;
              color: #334155;
              line-height: 1.55;
              margin-bottom: 14px;
              text-align: justify;
              background: #f8fafc;
              border-left: 3px solid #e11d48;
              padding: 8px 12px;
              border-radius: 4px;
            }
            .section-block {
              margin-bottom: 12px;
            }
            .section-title {
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
              text-transform: uppercase;
              margin-bottom: 4px;
              border-bottom: 1px solid #f1f5f9;
              padding-bottom: 2px;
            }
            .section-body {
              font-size: 10.5px;
              color: #334155;
              line-height: 1.5;
            }
            .section-body ul {
              margin: 4px 0 4px 16px;
              padding: 0;
            }
            .section-body li {
              margin-bottom: 2px;
            }
            .contact-list {
              margin: 4px 0 0 16px;
              padding: 0;
            }
            .contact-list li {
              margin-bottom: 2px;
            }
            .acceptance-box {
              background: #f0fdf4;
              border: 1px solid #86efac;
              border-radius: 6px;
              padding: 10px 14px;
              margin: 14px 0;
              font-size: 11px;
            }
            .acceptance-check {
              font-weight: 700;
              color: #166534;
              display: flex;
              align-items: flex-start;
              gap: 6px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-top: 8px;
              padding-top: 8px;
              border-top: 1px dashed #bbf7d0;
              font-size: 10.5px;
            }
            .footer { 
              margin-top: 20px; 
              border-top: 1px solid #e2e8f0; 
              padding-top: 8px; 
              font-size: 9px; 
              color: #94a3b8; 
              text-align: center; 
              line-height: 1.4; 
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand-title">COFIZA</div>
              <div class="brand-sub">Atención presencial: Av. Tsáchila y Ruilova, Edificio Cofiza · Santo Domingo, Ecuador</div>
              <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">Correo: protecciondedatos@cofiza.com · Teléfono: +593 98 378 4571</div>
            </div>
            <div class="doc-badge">
              <span class="doc-tag">✓ Consentimiento Otorgado</span>
              <div class="doc-num">${certNumber}</div>
              <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">Emisión: ${currentDate}</div>
            </div>
          </div>

          <div class="title-section">
            <div class="main-title">Consentimiento para Envío de Mensajes vía WhatsApp</div>
            <div class="main-subtitle">COFIZA</div>
          </div>

          <div class="intro-text">
            Agradecemos tu interés en mantenerte conectado con nosotros a través de WhatsApp. Para poder enviarte información relevante, novedades, promociones y otros contenidos de tu interés, necesitamos tu consentimiento explícito para el tratamiento de tus datos personales, específicamente tu número de teléfono.
          </div>

          <div class="section-block">
            <div class="section-title">¿Qué datos personales utilizaremos?</div>
            <div class="section-body">
              Utilizaremos tu número de teléfono celular para enviarte mensajes a través de la aplicación WhatsApp.
            </div>
          </div>

          <div class="section-block">
            <div class="section-title">¿Para qué utilizaremos tus datos?</div>
            <div class="section-body">
              Utilizaremos tu número de teléfono para enviarte:
              <ul>
                <li>Información sobre nuestros proyectos y servicios inmobiliarios.</li>
                <li>Novedades y actualizaciones.</li>
                <li>Promociones, planes de pago y ofertas especiales.</li>
                <li>Respuestas a tus consultas, citas o solicitudes de información.</li>
                <li>Otro contenido relevante sobre el sector que consideremos de tu interés.</li>
              </ul>
            </div>
          </div>

          <div class="section-block">
            <div class="section-title">Tu Consentimiento</div>
            <div class="section-body">
              Al proporcionar tu número de teléfono y aceptar este consentimiento, confirmas que has leído y comprendido esta información y que otorgas tu consentimiento libre, específico, informado e inequívoco para que COFIZA utilice tu número de teléfono para enviarte mensajes a través de WhatsApp con los fines descritos anteriormente.
            </div>
          </div>

          <div class="section-block">
            <div class="section-title">Tus Derechos</div>
            <div class="section-body">
              En cualquier momento, tienes derecho a revocar este consentimiento y solicitar que dejemos de enviarte mensajes a través de WhatsApp. También tienes derecho a acceder, actualizar, eliminar, limitar el tratamiento y oponerte al tratamiento de tus datos personales, así como el derecho a la portabilidad de tus datos, de acuerdo con la Ley Orgánica de Protección de Datos Personales (LOPDP) vigente en Ecuador.<br>
              Para ejercer tus derechos o revocar tu consentimiento, puedes comunicarte con nosotros a través de los siguientes medios:
              <ul class="contact-list">
                <li><strong>Correo electrónico:</strong> protecciondedatos@cofiza.com</li>
                <li><strong>Número de teléfono:</strong> +593 98 378 4571</li>
                <li><strong>Atención presencial:</strong> Av. Tsáchila y Ruilova, Edificio Cofiza</li>
              </ul>
            </div>
          </div>

          <div class="section-block">
            <div class="section-title">Conservación de tus Datos</div>
            <div class="section-body">
              Conservaremos tu número de teléfono mientras mantengas tu consentimiento para recibir mensajes a través de WhatsApp o hasta que sea necesario para cumplir con las finalidades descritas y las obligaciones legales aplicables.
            </div>
          </div>

          <div class="section-block">
            <div class="section-title">Seguridad de tus Datos</div>
            <div class="section-body">
              Hemos implementado medidas de seguridad técnicas y organizativas apropiadas para proteger tus datos personales contra el acceso no autorizado, la alteración, la divulgación o la destrucción.
            </div>
          </div>

          <div class="acceptance-box">
            <div class="acceptance-check">
              <span>☑</span>
              <span>He leído y comprendido la información anterior y otorgo mi consentimiento para recibir mensajes de COFIZA a través de WhatsApp, utilizando mi número de teléfono proporcionado.</span>
            </div>
            <div class="meta-grid">
              <div>
                <strong>Fecha de Aceptación:</strong> ${acceptedDateStr || currentDate}
              </div>
              <div>
                <strong>Número de Teléfono:</strong> ${lead.phone}
              </div>
              <div>
                <strong>Titular:</strong> ${lead.name}
              </div>
              <div>
                <strong>Cédula / Identificación:</strong> ${lead.cedula || 'Registrada en sistema'}
              </div>
            </div>
          </div>

          <div class="footer">
            Documento electrónico de constancia de consentimiento emitido por COFIZA.<br>
            Conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP) de la República del Ecuador.
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  useEffect(() => {
    fetch(`/api/public/leads/${leadId}`)
      .then(res => {
        if (!res.ok) throw new Error('Prospecto no encontrado');
        return res.json();
      })
      .then(data => {
        if (data.success && data.lead) {
          setLead(data.lead);
          if (data.lead.consent_accepted === 1) {
            setSuccess(true);
            setAcceptedDateStr(data.lead.consent_date);
          }
        } else {
          setError('No se pudo cargar la información de este prospecto.');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Enlace inválido o prospecto no registrado en el sistema.');
        setLoading(false);
      });
  }, [leadId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accepted || !lead) return;

    setSaving(true);
    const dateStr = new Date().toLocaleString('es-EC', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });

    const consentData = {
      name: lead.name,
      phone: lead.phone,
      email: lead.email || 'No registrado',
      project: lead.project,
      advisor: lead.advisor,
      agency: lead.agency,
      userAgent: navigator.userAgent,
      accepted_ip: 'Verificado por Navegador',
      legislation: 'Ecuador LOPDP (Ley Orgánica de Protección de Datos Personales)'
    };

    fetch(`/api/public/leads/${leadId}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consent_accepted: 1,
        consent_date: dateStr,
        consent_data: JSON.stringify(consentData)
      })
    })
      .then(res => res.json())
      .then(data => {
        setSaving(false);
        if (data.success) {
          setSuccess(true);
          setAcceptedDateStr(dateStr);
        } else {
          alert('Hubo un error al registrar tu autorización. Por favor intenta de nuevo.');
        }
      })
      .catch(() => {
        setSaving(false);
        alert('Error de conexión. Intenta de nuevo.');
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="animate-spin text-[#E11D48] mx-auto" size={32} />
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Cargando Formulario LOPDP...</p>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md p-6 text-center space-y-4">
          <AlertCircle className="text-amber-500 mx-auto" size={48} />
          <h2 className="text-lg font-bold text-slate-800 font-display">Enlace No Válido</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            El enlace de autorización al que intentas acceder no es válido, ha expirado o el cliente no existe en nuestra base de datos activa.
          </p>
          <div className="pt-2 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase">Corporación Zavala · Departamento Legal</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-rose-900 to-[#E11D48] px-6 py-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#E11D48] font-black text-lg shadow-md">
              CZ
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight font-display uppercase leading-tight">COFIZA</h1>
              <p className="text-[10px] text-rose-100 font-bold tracking-widest uppercase">Santo Domingo, Ecuador</p>
            </div>
          </div>
          <div className="bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-400/20 text-right hidden sm:block">
            <span className="text-[9px] block text-rose-200 font-bold uppercase">Protección de Datos</span>
            <span className="text-[10px] font-semibold">protecciondedatos@cofiza.com</span>
          </div>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-200 text-emerald-600">
              <CheckCircle size={36} className="animate-bounce" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800 font-display">¡Consentimiento Registrado con Éxito!</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Estimado/a <strong className="text-slate-800">{lead.name}</strong>, agradecemos tu interés. Tu consentimiento para el envío de mensajes de <strong className="text-slate-800">COFIZA</strong> vía WhatsApp ha sido registrado conforme a la LOPDP de Ecuador.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-left max-w-md mx-auto space-y-2.5 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400 font-bold">FECHA REGISTRO:</span>
                <span className="font-bold text-slate-700">{acceptedDateStr}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400 font-bold">PROSPECTO / TITULAR:</span>
                <span className="font-bold text-slate-700">{lead.name}</span>
              </div>
              {lead.cedula && (
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-slate-400 font-bold">CÉDULA / RUC:</span>
                  <span className="font-bold text-slate-700">{lead.cedula}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400 font-bold">NÚMERO DE TELÉFONO:</span>
                <span className="font-bold text-slate-700">{lead.phone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-400 font-bold">PROYECTO:</span>
                <span className="font-bold text-slate-700 text-[#E11D48]">{lead.project}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">EMPRESA:</span>
                <span className="font-bold text-slate-700">COFIZA</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={15} />
                <span>Descargar Constancia de Consentimiento (PDF)</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 font-medium">
                Ya puedes cerrar esta ventana. Tu asesor te responderá por WhatsApp a la brevedad posible.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 text-left">
            <div className="space-y-2">
              <span className="text-[#E11D48] font-bold text-[10px] uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck size={14} /> AUTORIZACIÓN EXPRESA LOPDP · COFIZA
              </span>
              <h2 className="text-lg font-bold text-slate-800 leading-tight">
                Consentimiento para Envío de Mensajes vía WhatsApp
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed font-normal">
                Agradecemos tu interés en mantenerte conectado con nosotros a través de WhatsApp. Para poder enviarte información relevante, novedades, promociones y otros contenidos de tu interés, necesitamos tu consentimiento explícito para el tratamiento de tus datos personales, específicamente tu número de teléfono.
              </p>
            </div>

            {/* Client Info Block */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Nombres Completos</span>
                <span className="text-slate-800 font-bold text-sm">{lead.name}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Cédula de Identidad / RUC</span>
                <span className="text-slate-800 font-bold text-sm font-mono">{lead.cedula || 'No registrada'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Número de Teléfono Celular</span>
                <span className="text-slate-800 font-bold text-sm">{lead.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold block text-[10px] uppercase">Proyecto Inmobiliario</span>
                <span className="text-[#E11D48] font-bold">{lead.project}</span>
              </div>
            </div>

            {/* Legal text policy list */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center gap-2">
                <FileText size={14} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Cláusulas del Consentimiento · COFIZA
                </span>
              </div>
              <div className="p-4 bg-slate-50/50 text-[11px] text-slate-600 leading-relaxed max-h-60 overflow-y-auto space-y-3.5">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">¿Qué datos personales utilizaremos?</h4>
                  <p className="mt-0.5">Utilizaremos tu número de teléfono celular para enviarte mensajes a través de la aplicación WhatsApp.</p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-xs">¿Para qué utilizaremos tus datos?</h4>
                  <p className="mt-0.5">Utilizaremos tu número de teléfono para enviarte:</p>
                  <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-700">
                    <li>Información sobre nuestros proyectos y servicios inmobiliarios.</li>
                    <li>Novedades y actualizaciones.</li>
                    <li>Promociones, planes de pago y ofertas especiales.</li>
                    <li>Respuestas a tus consultas, citas o solicitudes de información.</li>
                    <li>Otro contenido relevante sobre el sector que consideremos de tu interés.</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Tu Consentimiento</h4>
                  <p className="mt-0.5">
                    Al proporcionar tu número de teléfono y aceptar este consentimiento, confirmas que has leído y comprendido esta información y que otorgas tu consentimiento libre, específico, informado e inequívoco para que COFIZA utilice tu número de teléfono para enviarte mensajes a través de WhatsApp con los fines descritos anteriormente.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Tus Derechos</h4>
                  <p className="mt-0.5">
                    En cualquier momento, tienes derecho a revocar este consentimiento y solicitar que dejemos de enviarte mensajes a través de WhatsApp. También tienes derecho a acceder, actualizar, eliminar, limitar el tratamiento y oponerte al tratamiento de tus datos personales, así como el derecho a la portabilidad de tus datos, de acuerdo con la Ley Orgánica de Protección de Datos Personales (LOPDP) vigente en Ecuador.
                  </p>
                  <p className="mt-1">
                    Para ejercer tus derechos o revocar tu consentimiento, puedes comunicarte con nosotros a través de los siguientes medios:
                  </p>
                  <ul className="list-disc pl-5 space-y-0.5 mt-1 font-medium text-slate-700">
                    <li><strong>Correo electrónico:</strong> protecciondedatos@cofiza.com</li>
                    <li><strong>Número de teléfono:</strong> +593 98 378 4571</li>
                    <li><strong>Atención presencial:</strong> Av. Tsáchila y Ruilova, Edificio Cofiza</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Conservación de tus Datos</h4>
                  <p className="mt-0.5">
                    Conservaremos tu número de teléfono mientras mantengas tu consentimiento para recibir mensajes a través de WhatsApp o hasta que sea necesario para cumplir con las finalidades descritas y las obligaciones legales aplicables.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Seguridad de tus Datos</h4>
                  <p className="mt-0.5">
                    Hemos implementado medidas de seguridad técnicas y organizativas apropiadas para proteger tus datos personales contra el acceso no autorizado, la alteración, la divulgación o la destrucción.
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive check inputs */}
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-[#E11D48] cursor-pointer bg-white transition duration-150">
                <input 
                  type="checkbox" 
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="rounded border-slate-300 text-[#E11D48] focus:ring-[#E11D48] mt-0.5 h-4 w-4 cursor-pointer"
                />
                <div className="text-xs">
                  <p className="font-bold text-slate-800">Aceptación</p>
                  <p className="text-slate-600 font-medium mt-0.5 leading-relaxed">
                    He leído y comprendido la información anterior y otorgo mi consentimiento para recibir mensajes de COFIZA a través de WhatsApp, utilizando mi número de teléfono proporcionado.
                  </p>
                </div>
              </label>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] text-slate-400 font-medium text-center sm:text-left">
                Al hacer clic, se registrará digitalmente tu dirección de red, firma y fecha.
              </p>
              
              <button
                type="submit"
                disabled={!accepted || saving}
                className={`
                  w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer
                  ${accepted 
                    ? 'bg-[#E11D48] hover:bg-rose-700 text-white' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                `}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Registrando Consentimiento...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Aceptar y Otorgar Consentimiento</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Corporate Badge footer */}
      <div className="mt-8 flex items-center gap-2 text-slate-400 text-xs font-semibold">
        <Building2 size={14} />
        <span>COFIZA · Santo Domingo, Ecuador © {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}
