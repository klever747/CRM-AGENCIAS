import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  User, CheckSquare, MessageSquare, Calendar, 
  FileText, Bookmark, CreditCard, History, Settings, 
  Send, Loader2, Info, Trash2, ShieldCheck, Download, Edit,
  Copy, ExternalLink, Share2, Check, Plus, X, MapPin, Clock, Eye,
  RefreshCw, Phone, Volume2, VolumeX, Bell, BellOff, Sparkles, AlertCircle,
  Save, Database, CheckCircle2, UserCheck, AlertTriangle, RotateCcw,
  Filter, UserX, QrCode
} from 'lucide-react';
import QRCode from 'qrcode';
import { Lead, Cita, SettingsMap, Proforma, formatDisplayPhone } from '../types';
import { formatCurrency, COUNTRY_CODES } from '../lib/utils';
import { ProformaModal } from './ProformaModal';
import { LeadModal } from './Modals';
import { subscribeToDbSync, notifyDbChange } from '../lib/databaseSync';

interface Cliente360ViewProps {
  leadId: number;
  onBack: () => void;
  onGoCotizador: (name: string, phone: string, cedula?: string) => void;
  initialTab?: string;
  onEditLead?: (lead: Lead) => void;
  leads?: Lead[];
  onRefreshLeads?: () => void;
}

export default function Cliente360View({ 
  leadId, 
  onBack, 
  onGoCotizador, 
  initialTab = 'datos',
  onEditLead,
  leads = [],
  onRefreshLeads
}: Cliente360ViewProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);

  // Sync activeTab if initialTab changes (e.g., clicking on a global notification)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Sync state if leads prop changes
  useEffect(() => {
    if (leads && leads.length > 0) {
      const found = leads.find(l => l.id === leadId);
      if (found) {
        setLead(found);
      }
    }
  }, [leads, leadId]);

  // Sub-modules state
  const [citas, setCitas] = useState<Cita[]>([]);
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [settings, setSettings] = useState<SettingsMap>({});
  
  // Proforma viewer modal state
  const [selectedProformaForView, setSelectedProformaForView] = useState<Proforma | null>(null);
  const [isProformaModalOpen, setIsProformaModalOpen] = useState(false);

  // WhatsApp chat states
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [autoPollActive, setAutoPollActive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [incomingAlert, setIncomingAlert] = useState<{ sender: string; text: string; time?: string; id: any } | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const knownMessageIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);

  // Consent link copied, edit modal and verification handlers
  const [copied, setCopied] = useState(false);
  const [sendingConsentWhatsApp, setSendingConsentWhatsApp] = useState(false);
  const [pendingConsentAction, setPendingConsentAction] = useState<'whatsapp' | 'copy' | 'client_view' | 'qr' | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [consentAlertNotification, setConsentAlertNotification] = useState<{
    type: 'warning' | 'success' | 'info';
    message: string;
    missingList?: string[];
  } | null>(null);

  // Personal Data Edit state (uses LeadModal from Modals.tsx, exactly like Mis Leads)
  const [isPersonalDataModalOpen, setIsPersonalDataModalOpen] = useState(false);
  const [personalDataSuccessAlert, setPersonalDataSuccessAlert] = useState<string | null>(null);

  const handleSaveLead = async (leadData: any) => {
    if (!lead) return;
    const fullName = `${(leadData.first || '').trim()} ${(leadData.last || '').trim()}`.trim();
    const payload = {
      ...lead,
      ...leadData,
      name: fullName || lead.name
    };

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success || res.ok) {
        const freshLead: Lead = data.lead || payload;
        setLead(freshLead);
        setPersonalDataSuccessAlert('¡Datos del prospecto actualizados en la Base de Datos con éxito!');
        setTimeout(() => setPersonalDataSuccessAlert(null), 5000);
        if (onRefreshLeads) {
          onRefreshLeads();
        }
        setIsPersonalDataModalOpen(false);
        if (pendingConsentAction) {
          setTimeout(() => {
            executeConsentAction(pendingConsentAction, freshLead);
            setPendingConsentAction(null);
          }, 300);
        }
      } else {
        alert('Error al guardar en la base de datos: ' + (data.message || 'Error'));
      }
    } catch (err) {
      console.error('Error saving lead:', err);
      alert('Error de conexión al actualizar el lead.');
    }
  };

  // Helper to verify that First Name, Last Name, Phone, and Cedula are completed
  const checkLeadConsentRequirements = (targetLead: Lead) => {
    const missingList: string[] = [];
    const missing = { first: false, last: false, phone: false, cedula: false };

    const cleanFirst = (targetLead.first || '').trim();
    if (!cleanFirst) {
      missing.first = true;
      missingList.push('Nombres');
    }

    const cleanLast = (targetLead.last || '').trim();
    if (!cleanLast) {
      missing.last = true;
      missingList.push('Apellidos');
    }

    const rawPhone = (targetLead.phone || '').trim();
    const digits = rawPhone.replace(/\D/g, '');
    if (!rawPhone || digits.length < 8) {
      missing.phone = true;
      missingList.push('Número de celular (WhatsApp)');
    }

    const cleanCedula = (targetLead.cedula || '').trim();
    if (!cleanCedula || (cleanCedula.length !== 10 && cleanCedula.length !== 13) || !/^\d+$/.test(cleanCedula)) {
      missing.cedula = true;
      missingList.push('Cédula de Identidad (10 dígitos) o RUC (13 dígitos)');
    }

    return {
      isValid: missingList.length === 0,
      missingList,
      missing
    };
  };

  // Execute consent action once lead data is validated
  const executeConsentAction = (action: 'whatsapp' | 'copy' | 'client_view' | 'qr', targetLead: Lead) => {
    const consentUrl = `${window.location.origin}/?consentId=${targetLead.id}`;
    const clientFirstName = (targetLead.first || '').trim() || (targetLead.name ? targetLead.name.split(' ')[0] : 'Cliente');

    if (action === 'whatsapp') {
      const rawPhone = targetLead.phone || '';
      const cleanDigits = rawPhone.replace(/\D/g, '');
      let formattedPhone = cleanDigits;
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '593' + formattedPhone.substring(1);
      } else if (formattedPhone.length === 9 && formattedPhone.startsWith('9')) {
        formattedPhone = '593' + formattedPhone;
      }

      if (!formattedPhone) {
        setConsentAlertNotification({
          type: 'warning',
          message: 'El cliente no tiene un número de teléfono válido registrado para enviar por WhatsApp.'
        });
        return;
      }

      const whatsappText = `Hola ${clientFirstName}, para mantenerte informado sobre ${targetLead.project || 'nuestros proyectos inmobiliarios'}, promociones, planes de pago y responder a tus consultas por WhatsApp, te solicitamos otorgar tu consentimiento para envío de mensajes de COFIZA en el siguiente enlace:\n${consentUrl}`;

      setSendingConsentWhatsApp(true);

      const nowStr = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) + ' · Hoy';
      const userMsg = { 
        id: Date.now(), 
        from: 'out', 
        sender: 'asesor', 
        text: whatsappText, 
        time: nowStr, 
        rawTime: new Date().toISOString() 
      };
      setChatMessages(prev => [...prev, userMsg]);

      fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: formattedPhone,
          message: whatsappText,
          lead_id: Number(targetLead.id)
        })
      })
        .then(res => res.json())
        .then(data => {
          setSendingConsentWhatsApp(false);
          if (data.success && data.reply) {
            const replyMsg = { 
              id: Date.now() + 1, 
              from: 'in', 
              sender: 'bot',
              text: data.reply, 
              time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) + ' · Hoy',
              rawTime: new Date().toISOString()
            };
            setChatMessages(prev => [...prev, replyMsg]);
          }

          setConsentAlertNotification({
            type: 'success',
            message: '¡Enlace de consentimiento LOPDP enviado con éxito mediante el Chat Interno de WhatsApp!'
          });

          // Navegar automáticamente a la pestaña del chat interno de WhatsApp para ver la conversación
          setActiveTab('whatsapp');

          // Sincronizar tras el envío para capturar el registro del webhook n8n
          setTimeout(() => {
            if (targetLead.phone) {
              loadWhatsAppChat(targetLead.phone, true);
            }
          }, 1500);
        })
        .catch(err => {
          console.error('Error enviando consentimiento por WhatsApp interno:', err);
          setSendingConsentWhatsApp(false);
          setConsentAlertNotification({
            type: 'warning',
            message: 'Error al enviar por el chat interno de WhatsApp. Por favor verifique la conexión con el webhook.'
          });
        });
    } else if (action === 'copy') {
      navigator.clipboard.writeText(consentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setConsentAlertNotification({
        type: 'success',
        message: '¡Enlace de consentimiento copiado al portapapeles con éxito!'
      });
    } else if (action === 'client_view') {
      window.open(consentUrl, '_blank', 'noopener,noreferrer');
    } else if (action === 'qr') {
      setGeneratingQr(true);
      QRCode.toDataURL(consentUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      })
        .then(url => {
          setQrCodeDataUrl(url);
          setShowQrModal(true);
        })
        .catch(err => {
          console.error('Error generando QR:', err);
          setConsentAlertNotification({
            type: 'warning',
            message: 'No se pudo generar el código QR. Inténtalo nuevamente.'
          });
        })
        .finally(() => {
          setGeneratingQr(false);
        });
    }
  };

  // Intercept sending or sharing consent: verify required data first
  const handleInitiateSendConsent = (action: 'whatsapp' | 'copy' | 'client_view' | 'qr') => {
    if (!lead) return;

    const verification = checkLeadConsentRequirements(lead);

    if (!verification.isValid) {
      setConsentAlertNotification({
        type: 'warning',
        message: `Atención: Para generar y enviar la autorización legal de consentimiento LOPDP, es obligatorio completar: ${verification.missingList.join(', ')}.`,
        missingList: verification.missingList
      });

      setPendingConsentAction(action);
      setIsPersonalDataModalOpen(true);
      return;
    }

    // If valid, execute immediately
    executeConsentAction(action, lead);
  };

  // Download generated QR Code as PNG image
  const handleDownloadQrImage = () => {
    if (!qrCodeDataUrl || !lead) return;
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `QR-Consentimiento-${(lead.name || 'cliente').replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download official LOPDP consent certificate in PDF format
  const handleDownloadConsentPdf = (targetLead: Lead) => {
    if (targetLead.consent_accepted !== 1) {
      setConsentAlertNotification({
        type: 'warning',
        message: 'No se puede descargar el PDF oficial porque el cliente aún no ha aceptado el consentimiento digital a través de su enlace.'
      });
      return;
    }

    let auditIp = 'Enlace Web Verificado';
    let auditUserAgent = 'Navegador Web del Cliente';
    try {
      if (targetLead.consent_data) {
        const parsed = JSON.parse(targetLead.consent_data);
        if (parsed.accepted_ip) auditIp = parsed.accepted_ip;
        if (parsed.userAgent) auditUserAgent = parsed.userAgent;
      }
    } catch (e) {}

    const certNumber = `CZ-LOPDP-${String(targetLead.id).padStart(5, '0')}-${new Date().getFullYear()}`;
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
          <title>Consentimiento WhatsApp - COFIZA - ${targetLead.name} - ${certNumber}</title>
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
                <strong>Fecha de Aceptación:</strong> ${targetLead.consent_date || currentDate}
              </div>
              <div>
                <strong>Número de Teléfono:</strong> ${targetLead.phone}
              </div>
              <div>
                <strong>Titular:</strong> ${targetLead.name}
              </div>
              <div>
                <strong>Cédula / Identificación:</strong> ${targetLead.cedula || 'Registrada en sistema'}
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

  // New appointment states
  const [isCitaModalOpen, setIsCitaModalOpen] = useState(false);
  const [isReprogramming, setIsReprogramming] = useState(false);
  const [editingCita, setEditingCita] = useState<Cita | null>(null);
  const [citaType, setCitaType] = useState('Visita de Campo');
  const [citaDate, setCitaDate] = useState('');
  const [citaLocation, setCitaLocation] = useState('');
  const [citaStatus, setCitaStatus] = useState('Programada');
  const [savingCita, setSavingCita] = useState(false);

  // Proyectos list from database
  const [proyectosList, setProyectosList] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/urbanizaciones')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((p: any) => (p.nombre || p.name || '').trim()).filter(Boolean);
          if (names.length > 0) {
            setProyectosList(Array.from(new Set(names)));
          }
        }
      })
      .catch(err => console.error('Error fetching proyectos:', err));
  }, []);

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

  const isCitaPast = (dateStr: string): boolean => {
    if (!dateStr) return false;
    try {
      const now = new Date();
      const direct = new Date(dateStr);
      if (!isNaN(direct.getTime())) {
        return direct.getTime() < now.getTime();
      }
      const isoFormatted = parseCitaDateForInput(dateStr);
      const parsed = new Date(isoFormatted);
      if (!isNaN(parsed.getTime())) {
        return parsed.getTime() < now.getTime();
      }
    } catch (e) {}
    return false;
  };

  const isCitaOverdue = (c: Cita): boolean => {
    return c.status === 'Vencida' || (c.status === 'Programada' && isCitaPast(c.date));
  };

  // State for status filtering of appointments in Cliente360
  const [citaStatusFilter, setCitaStatusFilter] = useState<'todas' | 'pendientes' | 'vencidas' | 'noasistio' | 'reprogramadas' | 'realizadas' | 'canceladas'>('todas');

  const citaStats = useMemo(() => {
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

  const filteredCitas = useMemo(() => {
    return citas.filter(c => {
      const overdue = isCitaOverdue(c);
      const isPending = c.status === 'Programada' && !isCitaPast(c.date);

      if (citaStatusFilter === 'pendientes') return isPending;
      if (citaStatusFilter === 'vencidas') return overdue;
      if (citaStatusFilter === 'noasistio') return c.status === 'No asistió';
      if (citaStatusFilter === 'reprogramadas') return c.status === 'Reprogramada';
      if (citaStatusFilter === 'realizadas') return c.status === 'Realizada';
      if (citaStatusFilter === 'canceladas') return c.status === 'Cancelada';
      return true;
    });
  }, [citas, citaStatusFilter]);

  const handleUpdateCitaStatus = (cita: Cita, newStatus: string) => {
    fetch(`/api/citas/${cita.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cita, status: newStatus })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, status: newStatus } : c));
          notifyDbChange('citas');
          if (onRefreshLeads) onRefreshLeads();
        }
      })
      .catch(console.error);
  };

  const handleOpenCitaModal = (cita?: any, forReprogramming = false) => {
    const defaultProj = (lead?.project || proyectosList[0] || 'Vista del Valle').trim();
    const isValidCita = cita && typeof cita === 'object' && 'id' in cita && typeof (cita as any).preventDefault !== 'function';
    
    setIsReprogramming(forReprogramming);

    if (isValidCita) {
      setEditingCita(cita);
      const validTypes = ['Visita de Campo', 'Reunión en Oficina', 'Videollamada', 'Llamada de Seguimiento'];
      const matched = validTypes.find(t => t.toLowerCase() === String(cita.type || '').trim().toLowerCase());
      setCitaType(matched || 'Visita de Campo');
      setCitaLocation(cita.location || defaultProj);
      setCitaStatus(forReprogramming ? 'Programada' : (cita.status || 'Programada'));
      
      if (forReprogramming) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const offset = tomorrow.getTimezoneOffset() * 60000;
        setCitaDate(new Date(tomorrow.getTime() - offset).toISOString().slice(0, 16));
      } else {
        setCitaDate(parseCitaDateForInput(cita.date));
      }
    } else {
      setEditingCita(null);
      setCitaType('Visita de Campo');
      setCitaLocation(defaultProj);
      setCitaStatus('Programada');
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      setCitaDate(new Date(now.getTime() - offset).toISOString().slice(0, 16));
    }
    setIsCitaModalOpen(true);
  };

  const handleCreateCita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !citaDate || !citaType || !citaLocation) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    setSavingCita(true);

    const dateObj = new Date(citaDate);
    const now = new Date();
    // Allow a 60-second tolerance for time spent filling the form
    if (!isNaN(dateObj.getTime()) && dateObj.getTime() < now.getTime() - 60000) {
      setSavingCita(false);
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

    // If reprogramming, first mark the old cita as 'Reprogramada'
    if (isReprogramming && editingCita && editingCita.id) {
      try {
        await fetch(`/api/citas/${editingCita.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...editingCita,
            status: 'Reprogramada'
          })
        });
      } catch (err) {
        console.error('Error updating old appointment status:', err);
      }
    }

    const isEditing = Boolean(editingCita && editingCita.id && Number(editingCita.id) > 0 && !isReprogramming);
    const url = isEditing ? `/api/citas/${editingCita!.id}` : '/api/citas';
    const method = isEditing ? 'PUT' : 'POST';

    fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_id: lead ? Number(lead.id) : null,
        date: formattedDate,
        type: citaType,
        location: citaLocation,
        status: 'Programada'
      })
    })
      .then(res => res.json())
      .then(data => {
        setSavingCita(false);
        if (data.success) {
          // Refresh appointments list
          fetch('/api/citas')
            .then(res => res.json())
            .then((cList: Cita[]) => {
              setCitas(cList.filter(c => c.lead_id === lead.id));
            });
          
          if (!editingCita || isReprogramming) {
            // Also update the local lead stage since scheduling a cita automatically advances it to 'present' stage
            setLead(prev => prev ? { ...prev, stage: 'present', status: 'Cita agendada' } : null);
          }
          
          notifyDbChange('citas');
          notifyDbChange('leads');
          if (onRefreshLeads) onRefreshLeads();
          
          // Reset and close
          setIsCitaModalOpen(false);
          setIsReprogramming(false);
          setEditingCita(null);
          setCitaType('Visita de Campo');
          setCitaDate('');
          setCitaLocation(lead.project || proyectosList[0] || 'Vista del Valle');
          setCitaStatus('Programada');
        } else {
          alert(editingCita && !isReprogramming ? 'Hubo un error al actualizar la cita.' : 'Hubo un error al agendar la cita.');
        }
      })
      .catch(err => {
        console.error(err);
        setSavingCita(false);
        alert('Error de conexión.');
      });
  };

  const handleDeleteCita = (citaId: number) => {
    if (!citaId || Number(citaId) <= 0) return;
    if (!confirm('¿Está seguro de que desea eliminar esta cita?')) return;
    fetch(`/api/citas/${citaId}`, {
      method: 'DELETE'
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          notifyDbChange('citas');
          setCitas(prev => prev.filter(c => c.id !== citaId));
        } else {
          alert('Error al eliminar la cita.');
        }
      })
      .catch(err => {
        console.error(err);
        alert('Error de conexión.');
      });
  };

  // Fetch client 360 data on mount or leadId change
  const loadCliente360Data = () => {
    // Fetch individual lead
    fetch('/api/leads')
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const found = data.find((l: Lead) => l.id === leadId);
          if (found) {
            setLead(found);
          }
        }
      })
      .catch(err => console.error('Error fetching leads:', err));

    // Fetch matching citations
    fetch('/api/citas')
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCitas(data.filter((c: Cita) => c.lead_id === leadId));
        } else {
          setCitas([]);
        }
      })
      .catch(err => console.error('Error fetching citas:', err));

    // Fetch proformas
    fetch('/api/proformas')
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProformas(data);
        } else {
          setProformas([]);
        }
      })
      .catch(err => console.error('Error fetching proformas:', err));

    // Fetch settings
    fetch('/api/settings')
      .then(res => res.json())
      .then((data: SettingsMap) => {
        setSettings(data || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    loadCliente360Data();

    const unsubscribe = subscribeToDbSync(['leads', 'citas', 'proformas', 'reservas', 'ventas', 'all'], () => {
      loadCliente360Data();
      if (onRefreshLeads) onRefreshLeads();
    });

    return () => {
      unsubscribe();
    };
  }, [leadId]);

  // Auto-refresh consent status in real-time when pending until accepted
  useEffect(() => {
    if (!leadId) return;
    if (lead && lead.consent_accepted === 1) return; // already accepted

    let isMounted = true;
    const controller = new AbortController();

    const checkConsent = async () => {
      try {
        const res = await fetch(`/api/public/leads/${leadId}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data.success && data.lead) {
          if (data.lead.consent_accepted === 1) {
            setLead(prev => prev ? { 
              ...prev, 
              consent_accepted: 1, 
              consent_date: data.lead.consent_date, 
              consent_data: data.lead.consent_data 
            } : data.lead);
            if (onRefreshLeads) onRefreshLeads();
            if (onEditLead) onEditLead(data.lead);
            playWhatsAppNotificationSound();
            setConsentAlertNotification({
              type: 'success',
              message: '¡Excelente! El cliente ha aceptado y firmado el consentimiento LOPDP a través de su enlace. El certificado oficial en PDF ya está disponible para descargar.'
            });
          }
        }
      } catch (err: any) {
        // Silently handle aborts or transient connectivity drops during polling
        if (err?.name !== 'AbortError') {
          // No-op: wait for next polling tick or SSE sync
        }
      }
    };

    const pollInterval = setInterval(checkConsent, 4000);

    return () => {
      isMounted = false;
      controller.abort();
      clearInterval(pollInterval);
    };
  }, [leadId, lead?.consent_accepted, onRefreshLeads, onEditLead]);

  // Synthesize gentle WhatsApp-style melodic notification chime
  const playWhatsAppNotificationSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      // High crisp notification tones
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc1.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      
      osc2.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.1); // C6

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime + 0.1);
      osc1.stop(ctx.currentTime + 0.5);
      osc2.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // Audio may be blocked until user interacts with document
    }
  };

  // Request browser desktop notifications permission
  const requestDesktopNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification('CRM Corporación Zavala', {
          body: 'Notificaciones de WhatsApp activadas con éxito.',
          icon: '/favicon.ico'
        });
      }
    } catch (e) {}
  };

  // Load WhatsApp messages from n8n webhook using selected lead's phone
  const loadWhatsAppChat = async (phoneToQuery: string, isSilent: boolean = false) => {
    if (!phoneToQuery) return;
    if (!isSilent) {
      setLoadingChat(true);
      setChatError(null);
    }
    try {
      const res = await fetch(`/api/whatsapp/messages?phone=${encodeURIComponent(phoneToQuery)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        const mapped = data.messages.map((m: any, idx: number) => {
          const isClient = m.sender === 'cliente' || m.from === 'in';
          let formattedTime = m.time || '';
          if (m.time) {
            try {
              const d = new Date(m.time.replace(' ', 'T'));
              if (!isNaN(d.getTime())) {
                formattedTime = d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) + ' · ' + d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short' });
              }
            } catch (e) {}
          }
          const msgKey = m.id ? String(m.id) : `msg-${idx}-${(m.text || '').substring(0, 15)}`;
          return {
            id: msgKey,
            sender: m.sender || (isClient ? 'cliente' : 'bot'),
            from: isClient ? 'in' : 'out',
            text: m.text || '',
            time: formattedTime,
            rawTime: m.time || ''
          };
        });

        // Sort chronologically (earliest first, latest at bottom)
        mapped.sort((a: any, b: any) => (Number(a.id) || 0) - (Number(b.id) || 0));

        // Check for new incoming messages if not first load
        if (isFirstLoadRef.current) {
          mapped.forEach((m: any) => knownMessageIdsRef.current.add(String(m.id)));
          isFirstLoadRef.current = false;
          setChatMessages(prev => {
            const localOuts = prev.filter((p: any) => p.from === 'out' && !mapped.some((m: any) => m.text === p.text));
            return [...mapped, ...localOuts];
          });
        } else {
          const newMessages = mapped.filter((m: any) => !knownMessageIdsRef.current.has(String(m.id)));
          if (newMessages.length > 0) {
            newMessages.forEach((m: any) => knownMessageIdsRef.current.add(String(m.id)));

            // Identify if any new message is from the client
            const newClientMessage = [...newMessages].reverse().find((m: any) => m.from === 'in' || m.sender === 'cliente');
            if (newClientMessage) {
              playWhatsAppNotificationSound();
              setIncomingAlert({
                sender: lead?.name || 'Cliente',
                text: newClientMessage.text,
                time: newClientMessage.time,
                id: newClientMessage.id
              });

              // Also trigger native desktop notification if user permitted
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(`WhatsApp: ${lead?.name || 'Cliente'}`, {
                    body: newClientMessage.text,
                    icon: '/favicon.ico'
                  });
                } catch (e) {}
              }
            }

            setChatMessages(mapped);
            // Smoothly auto-scroll to latest message
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        }
        setLastSyncTime(new Date());
      } else if (!isSilent) {
        setChatMessages([]);
      }
    } catch (err: any) {
      console.error('Error loading WhatsApp messages from n8n:', err);
      if (!isSilent) {
        setChatError('No se pudieron obtener los mensajes de WhatsApp desde n8n.');
      }
    } finally {
      if (!isSilent) {
        setLoadingChat(false);
      }
    }
  };

  // Load chat messages and start real-time polling when activeTab is whatsapp
  useEffect(() => {
    if (activeTab !== 'whatsapp' || !lead?.phone) return;

    // Mark notifications for this lead as read when user is actively reading their chat
    fetch('/api/whatsapp/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, phone: lead.phone })
    }).catch(() => {});

    // Reset tracking for current lead
    isFirstLoadRef.current = true;
    knownMessageIdsRef.current.clear();
    setIncomingAlert(null);

    // Initial load
    loadWhatsAppChat(lead.phone, false);

    // Auto-polling interval every 3.5 seconds
    const interval = setInterval(() => {
      if (autoPollActive && lead?.phone) {
        loadWhatsAppChat(lead.phone, true);
        // Ensure any new message that arrives while actively in chat is marked as read
        fetch('/api/whatsapp/notifications/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.id, phone: lead.phone })
        }).catch(() => {});
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [activeTab, lead?.id, lead?.phone, autoPollActive]);

  // Auto-scroll chat to latest message on tab switch or first load
  useEffect(() => {
    if (activeTab === 'whatsapp' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages.length, activeTab]);

  if (loading || !lead) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E11D48]" />
      </div>
    );
  }

  // Journey stage markers
  const stages = [
    { key: 'lead', label: 'Contacto Inicial', icon: User },
    { key: 'discover', label: 'Descubrimiento', icon: ShieldCheck },
    { key: 'present', label: 'Cita / Visita', icon: Calendar },
    { key: 'proforma', label: 'Proformado', icon: FileText },
    { key: 'reserve', label: 'Reservación', icon: Bookmark },
    { key: 'close', label: 'Cierre Venta', icon: CreditCard }
  ];
  const currentStageIndex = stages.findIndex(s => s.key === lead.stage);

  // Tabs layout def
  const tabs = [
    { id: 'datos', label: 'Datos Personales', icon: User },
    { id: 'consentimiento', label: 'Consentimiento', icon: ShieldCheck },
    { id: 'whatsapp', label: 'Chat WhatsApp', icon: MessageSquare },
    { id: 'citas', label: 'Citas y Visitas', icon: Calendar },
    { id: 'proformas', label: 'Proformas', icon: FileText }
  ];

  // WhatsApp sending logic
  const handleSendChat = () => {
    if (!chatInput.trim() || sendingChat || !lead) return;
    const txt = chatInput.trim();
    setChatInput('');
    setSendingChat(true);

    const rawPhone = lead.phone || '';
    const cleanDigits = rawPhone.replace(/\D/g, '');
    let formattedPhone = cleanDigits;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '593' + formattedPhone.substring(1);
    } else if (formattedPhone.length === 9 && formattedPhone.startsWith('9')) {
      formattedPhone = '593' + formattedPhone;
    }

    const nowStr = new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) + ' · Hoy';
    const userMsg = { id: Date.now(), from: 'out', sender: 'asesor', text: txt, time: nowStr, rawTime: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMsg]);

    fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: formattedPhone,
        message: txt,
        lead_id: Number(lead.id)
      })
    })
      .then(res => res.json())
      .then(data => {
        setSendingChat(false);
        if (data.success && data.reply) {
          const replyMsg = { 
            id: Date.now() + 1, 
            from: 'in', 
            sender: 'bot',
            text: data.reply, 
            time: new Date().toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) + ' · Hoy',
            rawTime: new Date().toISOString()
          };
          setChatMessages(prev => [...prev, replyMsg]);
        }
        // Resync with n8n webhook after message sent to capture persisted record
        setTimeout(() => {
          if (lead?.phone) {
            loadWhatsAppChat(lead.phone);
          }
        }, 1500);
      })
      .catch(() => {
        setSendingChat(false);
        setChatMessages(prev => [...prev, {
          id: Date.now() + 2,
          from: 'sys',
          sender: 'sys',
          text: 'Error al enviar mensaje. Revisa la conexión con el webhook de n8n.',
          time: ''
        }]);
      });
  };

  return (
    <div className="space-y-6">
      {/* Top action back button and header summary */}
      <div className="flex items-center justify-between gap-4">
        <button 
          onClick={onBack}
          className="text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
        >
          ← Volver a la lista
        </button>

        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-100 text-slate-800">
          Estado: {lead.status}
        </span>
      </div>

      {/* Profile Header Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente Seleccionado</span>
          <h2 className="text-xl font-bold text-slate-900 font-display leading-tight">{lead.name}</h2>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Cédula: {lead.cedula || 'Sin registrar'} | Celular: {formatDisplayPhone(lead.phone)} | Correo: {lead.email || 'No registrado'}</p>
        </div>

        <div className="flex items-center gap-10 text-xs">
          <div className="text-left border-l pl-4 border-slate-200">
            <p className="text-slate-400 font-bold text-[10px] uppercase">Agencia Asignada</p>
            <p className="font-semibold text-slate-700 mt-0.5">{lead.agency}</p>
          </div>
          <div className="text-left border-l pl-4 border-slate-200">
            <p className="text-slate-400 font-bold text-[10px] uppercase">Asesor Autorizado</p>
            <p className="font-bold text-slate-900 mt-0.5">{lead.advisor}</p>
          </div>
        </div>
      </div>

      {/* Customer Journey Stage Track */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Línea de Vida Comercial
        </h4>
        <div className="flex items-center justify-between overflow-x-auto gap-4 py-2">
          {stages.map((stage, idx) => {
            const completed = idx <= currentStageIndex;
            const current = idx === currentStageIndex;
            const Icon = stage.icon;

            return (
              <div key={stage.key} className="flex flex-col items-center flex-1 text-center min-w-[80px]">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center border-2 transition
                  ${completed ? 'bg-[#E11D48] text-white border-[#E11D48]' : 'bg-slate-50 text-slate-400 border-slate-200'}
                  ${current ? 'ring-4 ring-rose-100 font-bold' : ''}
                `}>
                  <Icon size={14} />
                </div>
                <span className={`text-[10px] font-bold mt-2 truncate max-w-[100px] ${completed ? 'text-slate-800' : 'text-slate-400'}`}>
                  {stage.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dynamic Sub-modules Section with Internal Sub-tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Tabs List */}
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs flex flex-col gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-left transition cursor-pointer
                  ${active 
                    ? 'bg-rose-50 text-rose-700 font-bold' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
                `}
              >
                <Icon size={14} className={active ? 'text-rose-600' : 'text-slate-400'} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Tab Body Container */}
        <div className="lg:col-span-3">
          {/* TAB: DATOS PERSONALES */}
          {activeTab === 'datos' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
              {/* SUCCESS ALERT */}
              {personalDataSuccessAlert && (
                <div className="p-4 rounded-xl text-xs bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                    <p className="font-bold">{personalDataSuccessAlert}</p>
                  </div>
                  <button 
                    onClick={() => setPersonalDataSuccessAlert(null)}
                    className="text-emerald-700 hover:text-emerald-900 p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* HEADER */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Datos Personales y Demográficos
                    </h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <Database size={11} /> Sincronizado en BDD
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ficha estática de información personal, perfil demográfico y comercial de {lead.name}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPersonalDataModalOpen(true)}
                    className="bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition duration-150 cursor-pointer"
                  >
                    <Edit size={13} />
                    <span>Editar Datos Personales</span>
                  </button>
                </div>
              </div>

              {/* STATIC VIEW: 1. DATOS PERSONALES Y CONTACTO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <User size={14} className="text-[#E11D48]" />
                  <span>1. Identificación y Contacto</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Primer Nombre</span>
                    <p className="text-slate-800 font-bold text-sm mt-1">{lead.first || lead.name?.split(' ')[0] || '—'}</p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Primer Apellido</span>
                    <p className="text-slate-800 font-bold text-sm mt-1">{lead.last || lead.name?.split(' ').slice(1).join(' ') || '—'}</p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Cédula de Identidad / RUC</span>
                    <p className="text-slate-900 font-mono font-bold text-sm mt-1">
                      {lead.cedula ? lead.cedula : <span className="text-amber-600 font-normal italic">Sin registrar</span>}
                    </p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl sm:col-span-2 lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-400 uppercase text-[10px] block">Teléfono / WhatsApp</span>
                      <span className="text-[10px] bg-slate-200/80 text-slate-600 font-mono px-2 py-0.5 rounded-md">
                        BDD: {lead.phone?.replace(/\D/g, '') || '—'}
                      </span>
                    </div>
                    <p className="text-slate-900 font-mono font-bold text-sm mt-1 flex items-center gap-2">
                      <Phone size={14} className="text-emerald-600" />
                      <span>{formatDisplayPhone(lead.phone)}</span>
                    </p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Correo Electrónico</span>
                    <p className="text-slate-800 font-medium text-sm mt-1 truncate">
                      {lead.email ? lead.email : <span className="text-slate-400 italic">No registrado</span>}
                    </p>
                  </div>
                </div>

                {/* STATIC VIEW: 2. DATOS DEMOGRÁFICOS */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider pt-3 border-t border-slate-100">
                  <MapPin size={14} className="text-blue-600" />
                  <span>2. Perfil Demográfico (Estático)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">País de Residencia</span>
                    <p className="text-slate-800 font-bold text-sm mt-1 flex items-center gap-1.5">
                      <span>{lead.country === 'Estados Unidos' ? '🇺🇸' : lead.country === 'España' ? '🇪🇸' : lead.country === 'Colombia' ? '🇨🇴' : lead.country === 'Perú' ? '🇵🇪' : '🇪🇨'}</span>
                      <span>{lead.country || 'Ecuador'}</span>
                    </p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Ciudad de Residencia</span>
                    <p className="text-slate-800 font-bold text-sm mt-1">{lead.city || 'Quito'}</p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Estado Civil</span>
                    <p className="text-slate-800 font-semibold text-sm mt-1">{lead.civil_status || 'Soltero/a'}</p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Ocupación / Profesión</span>
                    <p className="text-slate-800 font-semibold text-sm mt-1">{lead.occupation || 'Empleado privado'}</p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl sm:col-span-2">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Rango de Ingresos Estimado</span>
                    <p className="text-slate-800 font-bold text-sm mt-1 text-emerald-700">{lead.income_range || '$1,500 - $2,500'}</p>
                  </div>
                </div>

                {/* STATIC VIEW: 3. DATOS COMERCIALES */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider pt-3 border-t border-slate-100">
                  <Bookmark size={14} className="text-amber-600" />
                  <span>3. Asignación Comercial y Pipeline</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Canal de Entrada</span>
                    <p className="text-slate-800 font-semibold text-sm mt-1">{lead.source || 'WhatsApp'}</p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Proyecto de Interés</span>
                    <p className="text-slate-800 font-bold text-sm mt-1 text-rose-600">{lead.project || 'Vista del Valle'}</p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Agencia Asignada</span>
                    <p className="text-slate-800 font-semibold text-sm mt-1">{lead.agency || 'Agencia Quito Norte'}</p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Asesor Comercial</span>
                    <p className="text-slate-900 font-bold text-sm mt-1">{lead.advisor || 'Sin Asignar'}</p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Estado Comercial</span>
                    <p className="text-slate-800 font-semibold text-sm mt-1">
                      <span className="inline-block px-2 py-0.5 rounded bg-slate-200 text-slate-800 text-xs font-bold">
                        {lead.status || 'Nuevo'}
                      </span>
                    </p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Temperatura</span>
                    <p className="text-slate-800 font-semibold text-sm mt-1">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                        lead.temp === 'Muy Caliente' ? 'bg-rose-100 text-rose-800' :
                        lead.temp === 'Cálido' ? 'bg-amber-100 text-amber-800' :
                        lead.temp === 'Tibio' ? 'bg-blue-100 text-blue-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {lead.temp || 'Tibio'}
                      </span>
                    </p>
                  </div>

                  <div className="bg-slate-50/70 border border-slate-100 p-3.5 rounded-xl sm:col-span-2 lg:col-span-3">
                    <span className="font-bold text-slate-400 uppercase text-[10px] block">Valor Proyectado de Negociación</span>
                    <p className="text-slate-900 font-bold text-base mt-1 text-emerald-700">{formatCurrency(lead.deal_value, true)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CONSENTIMIENTO LOPD (MANDATORY IN DESIGN) */}
          {activeTab === 'consentimiento' && (() => {
            const consentUrl = `${window.location.origin}/?consentId=${lead.id}`;
            const isAccepted = lead.consent_accepted === 1;
            const verification = checkLeadConsentRequirements(lead);

            return (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
                {/* NOTIFICATION BANNER */}
                {consentAlertNotification && (
                  <div className={`p-4 rounded-xl text-xs flex items-start justify-between gap-3 border transition-all ${
                    consentAlertNotification.type === 'warning'
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : consentAlertNotification.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className={`shrink-0 mt-0.5 ${
                        consentAlertNotification.type === 'warning' ? 'text-amber-600' : consentAlertNotification.type === 'success' ? 'text-emerald-600' : 'text-blue-600'
                      }`} size={16} />
                      <div>
                        <p className="font-bold">{consentAlertNotification.message}</p>
                        {consentAlertNotification.type === 'success' && consentAlertNotification.message.includes('Chat Interno') && (
                          <button
                            onClick={() => setActiveTab('whatsapp')}
                            className="mt-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare size={13} />
                            <span>Abrir Chat Interno de WhatsApp →</span>
                          </button>
                        )}
                        {consentAlertNotification.missingList && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {consentAlertNotification.missingList.map((f, i) => (
                              <span key={i} className="bg-amber-200/70 text-amber-950 px-2 py-0.5 rounded font-mono font-bold text-[10px]">
                                • {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => setConsentAlertNotification(null)}
                      className="text-slate-400 hover:text-slate-750 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* MISSING FIELDS CALLOUT IF NOT VALID */}
                {!verification.isValid && !isAccepted && !consentAlertNotification && (
                  <div className="p-4 rounded-xl text-xs bg-amber-50/70 border border-amber-200 text-amber-900 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="shrink-0 text-amber-600 mt-0.5" size={16} />
                      <div>
                        <p className="font-bold text-amber-950">Datos obligatorios pendientes para emisión legal LOPDP</p>
                        <p className="text-amber-800 text-[11px] mt-0.5">
                          Para enviar el enlace o proformas, se requiere: <strong>{verification.missingList.join(', ')}</strong>.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsPersonalDataModalOpen(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-xs transition shrink-0 cursor-pointer"
                    >
                      Completar Datos
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Consentimiento para Envío de Mensajes vía WhatsApp · COFIZA
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Autorización explícita para comunicación comercial y de asesoría conforme a la LOPDP de Ecuador</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isAccepted && (
                      <button
                        onClick={() => setIsPersonalDataModalOpen(true)}
                        className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200 transition cursor-pointer"
                      >
                        Editar Datos de Identidad
                      </button>
                    )}
                    <span className={`font-bold text-[10px] px-2.5 py-1 rounded-full uppercase border ${
                      isAccepted 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    }`}>
                      {isAccepted ? '✓ AUTORIZADO LOPDP' : '⚠ PENDIENTE DE FIRMA'}
                    </span>
                  </div>
                </div>

                {/* CONSENT ACTION BUTTONS SECTION (LINK HIDDEN, ONLY ACTION BUTTONS) */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Opciones de Envío y Firma de Consentimiento LOPDP
                    </span>
                    <span className="text-[9px] font-bold bg-[#E11D48] text-white px-2 py-0.5 rounded uppercase">
                      Digital & Presencial
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Envía la solicitud de consentimiento a tu cliente por WhatsApp, copia el enlace al portapapeles o genera un código QR para que el cliente lo escanee directamente con la cámara de su celular.
                  </p>
                  
                  {/* SOLO BOTONES - SIN MOSTRAR EL ENLACE DIRECTO */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      onClick={() => handleInitiateSendConsent('whatsapp')}
                      disabled={sendingConsentWhatsApp}
                      className="bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition shrink-0 cursor-pointer shadow-xs disabled:opacity-60"
                      title="Enviar por Chat Interno de WhatsApp con Verificación"
                    >
                      {sendingConsentWhatsApp ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Enviando...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare size={14} />
                          <span>Enviar por WhatsApp</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleInitiateSendConsent('copy')}
                      className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition shrink-0 cursor-pointer shadow-xs"
                      title="Copiar Enlace con Verificación"
                    >
                      {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      <span>{copied ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
                    </button>

                    <button
                      onClick={() => handleInitiateSendConsent('qr')}
                      disabled={generatingQr}
                      className="bg-rose-50 hover:bg-rose-100 text-[#E11D48] border border-rose-200 text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 transition shrink-0 cursor-pointer shadow-xs disabled:opacity-60"
                      title="Generar Código QR para Escaneo en Celular"
                    >
                      {generatingQr ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Generando QR...</span>
                        </>
                      ) : (
                        <>
                          <QrCode size={14} />
                          <span>Generar Código QR</span>
                        </>
                      )}
                    </button>

                    <button 
                      onClick={() => handleInitiateSendConsent('client_view')}
                      className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-2.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs ml-auto"
                      title="Abrir enlace de verificación en nueva pestaña"
                    >
                      <ExternalLink size={13} />
                      <span>Vista Cliente</span>
                    </button>
                  </div>
                </div>

                {/* CONSENT VERIFICATION STATUS & AUDIT TRAIL */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Estado de Acreditación y Auditoría Digital
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Validación obligatoria vía enlace web
                    </span>
                  </div>

                  {isAccepted ? (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 text-xs space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-emerald-200/70 pb-2">
                        <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                          <ShieldCheck size={16} className="text-emerald-600" /> Registro de Autorización Verificado mediante Enlace
                        </h4>
                        <span className="bg-emerald-200/80 text-emerald-900 font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono">
                          Firma Digital Válida
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 font-medium text-slate-600">
                        <div className="flex justify-between border-b border-dashed border-emerald-200/60 pb-1">
                          <span>Nombres del Titular:</span>
                          <strong className="text-slate-900">{lead.name}</strong>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-emerald-200/60 pb-1">
                          <span>Cédula de Identidad / RUC:</span>
                          <strong className="text-slate-900 font-mono font-bold">{lead.cedula || 'No registrada'}</strong>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-emerald-200/60 pb-1">
                          <span>Teléfono Autorizado:</span>
                          <strong className="text-slate-900">{formatDisplayPhone(lead.phone)}</strong>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-emerald-200/60 pb-1">
                          <span>Fecha y Hora de Autorización:</span>
                          <strong className="text-slate-900">{lead.consent_date || 'N/A'}</strong>
                        </div>
                        <div className="flex justify-between border-b border-dashed border-emerald-200/60 pb-1 col-span-1 sm:col-span-2">
                          <span>Dirección IP / Dispositivo de Registro:</span>
                          <strong className="text-emerald-800 font-mono text-[10px]">
                            {lead.consent_data ? (() => {
                              try {
                                const parsed = JSON.parse(lead.consent_data);
                                return `${parsed.accepted_ip || 'Enlace Público'} • ${parsed.userAgent ? parsed.userAgent.substring(0, 45) + '...' : 'Navegador Web'}`;
                              } catch(e) {
                                return 'Enlace Público Verificado';
                              }
                            })() : 'Enlace Público Verificado'}
                          </strong>
                        </div>
                      </div>

                      <p className="text-[10px] text-emerald-800 bg-emerald-100/60 p-2 rounded-lg leading-relaxed">
                        ✓ El cliente ha revisado y aceptado los términos de tratamiento de datos personales conforme a la Ley Orgánica de Protección de Datos Personales (LOPDP) de la República del Ecuador.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-50/60 border border-amber-200/90 rounded-xl p-4 text-xs space-y-2.5">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="shrink-0 text-amber-600 mt-0.5" size={16} />
                        <div>
                          <p className="font-bold text-amber-950 text-xs">Pendiente de Aceptación Digital del Prospecto</p>
                          <p className="text-amber-800 text-[11px] mt-1 leading-relaxed">
                            Por exigencia legal y normativa de protección de datos (LOPDP), la autorización no puede marcarse de forma manual. El cliente debe verificar sus datos y pulsar «Autorizo Tratamiento de Datos» directamente desde su enlace personalizado.
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 flex flex-wrap gap-2">
                        <button
                          onClick={() => handleInitiateSendConsent('whatsapp')}
                          disabled={sendingConsentWhatsApp}
                          className="bg-[#25D366] hover:bg-[#20ba5a] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs disabled:opacity-60"
                        >
                          {sendingConsentWhatsApp ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Enviando al Chat Interno...</span>
                            </>
                          ) : (
                            <>
                              <MessageSquare size={13} />
                              <span>Enviar Enlace por Chat Interno de WhatsApp</span>
                            </>
                          )}
                        </button>
                        <button 
                          onClick={() => handleInitiateSendConsent('qr')}
                          className="bg-white hover:bg-amber-100/60 border border-amber-300 text-amber-900 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs"
                        >
                          <QrCode size={13} />
                          <span>Generar Código QR</span>
                        </button>
                        <button 
                          onClick={() => handleInitiateSendConsent('client_view')}
                          className="bg-white hover:bg-slate-50 border border-amber-300 text-amber-900 text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow-xs"
                        >
                          <ExternalLink size={13} />
                          <span>Abrir Enlace de Verificación</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <button 
                    onClick={() => lead && handleDownloadConsentPdf(lead)}
                    className={`px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 text-xs transition cursor-pointer shadow-xs ${
                      isAccepted
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-400 border border-slate-200'
                    }`}
                    title={isAccepted ? 'Descargar e imprimir Certificado Oficial LOPD en PDF' : 'El cliente debe autorizar primero mediante el enlace'}
                  >
                    <Download size={14} />
                    <span>{isAccepted ? 'Descargar Constancia PDF (COFIZA)' : 'Descargar PDF (Pendiente de Autorización)'}</span>
                  </button>
                  <button 
                    onClick={() => handleInitiateSendConsent('qr')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 text-xs rounded-lg transition cursor-pointer"
                  >
                    <QrCode size={14} />
                    <span>Código QR</span>
                  </button>
                  <button 
                    onClick={() => handleInitiateSendConsent('client_view')}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1.5 text-xs rounded-lg transition cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    <span>Ver Vista de Cliente</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* TAB: WHATSAPP CHAT WEBHOOK INTEGRATION */}
          {activeTab === 'whatsapp' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Chat WhatsApp — {lead.name}
                      </h3>
                      <button
                        onClick={() => setAutoPollActive(!autoPollActive)}
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 transition cursor-pointer border ${
                          autoPollActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                        title={autoPollActive ? 'Actualización automática en vivo activa (3.5s). Clic para pausar' : 'Pausado. Clic para activar'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${autoPollActive ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
                        <span>{autoPollActive ? 'En vivo (3.5s)' : 'Pausado'}</span>
                      </button>
                      <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-medium px-2 py-0.5 rounded-full">
                        n8n Webhook
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone size={11} className="text-slate-400" />
                        <span>Número: <strong className="text-slate-700">{formatDisplayPhone(lead.phone) || 'Sin número registrado'}</strong></span>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>Historial: <strong className="text-slate-700">{chatMessages.length} mensajes</strong></span>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400">
                        Última sincronización: {lastSyncTime.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Sound Toggle */}
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                      soundEnabled 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                        : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
                    }`}
                    title={soundEnabled ? 'Sonido de notificación activado (Clic para silenciar)' : 'Sonido silenciado (Clic para activar)'}
                  >
                    {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    <span className="text-[11px] hidden sm:inline">{soundEnabled ? 'Sonido ON' : 'Silencio'}</span>
                  </button>

                  {/* Browser Desktop Notifications Request Button */}
                  {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default' && (
                    <button
                      onClick={requestDesktopNotification}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                      title="Activar alertas de escritorio de nuevos mensajes"
                    >
                      <Bell size={13} />
                      <span className="text-[11px]">Notificaciones</span>
                    </button>
                  )}

                  {/* Manual Refresh Button */}
                  <button
                    onClick={() => lead.phone && loadWhatsAppChat(lead.phone, false)}
                    disabled={loadingChat || !lead.phone}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Actualizar mensajes manualmente desde n8n"
                  >
                    <RefreshCw size={13} className={loadingChat ? 'animate-spin' : ''} />
                    <span>{loadingChat ? 'Cargando...' : 'Actualizar'}</span>
                  </button>

                  {lead.phone && (
                    <a
                      href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <ExternalLink size={13} />
                      <span>Abrir WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Live Incoming Alert Banner Notification */}
              {incomingAlert && (
                <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 border border-emerald-500">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="relative flex h-3 w-3 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-tight flex items-center gap-1.5">
                        <span>💬 Nuevo mensaje de WhatsApp de {incomingAlert.sender}</span>
                        {incomingAlert.time && (
                          <span className="text-[10px] text-emerald-200 font-normal">({incomingAlert.time})</span>
                        )}
                      </p>
                      <p className="text-[11px] text-emerald-100 truncate mt-0.5 max-w-xl font-medium">
                        "{incomingAlert.text}"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                        setIncomingAlert(null);
                      }}
                      className="px-2.5 py-1 bg-white text-emerald-800 text-[11px] font-bold rounded-lg hover:bg-emerald-50 transition cursor-pointer shadow-xs"
                    >
                      Ver en Chat
                    </button>
                    <button
                      onClick={() => setIncomingAlert(null)}
                      className="text-white/80 hover:text-white p-1 cursor-pointer transition rounded"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* Chat Error Notice if any */}
              {chatError && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center justify-between">
                  <span>{chatError}</span>
                  <button 
                    onClick={() => lead.phone && loadWhatsAppChat(lead.phone)}
                    className="underline font-bold text-amber-900 cursor-pointer ml-2"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {/* Chat Window */}
              <div className="bg-slate-50/75 border border-slate-200 rounded-xl p-4 h-96 overflow-y-auto flex flex-col gap-3">
                {loadingChat && chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-12">
                    <Loader2 size={24} className="animate-spin text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-600">Consultando mensajes de WhatsApp en n8n...</span>
                    <span className="text-[11px] text-slate-400">Teléfono: {formatDisplayPhone(lead.phone)}</span>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <MessageSquare size={22} />
                    </div>
                    <p className="text-xs font-bold text-slate-700">No hay mensajes registrados para este contacto</p>
                    <p className="text-[11px] max-w-sm text-slate-400">
                      No se encontraron mensajes en el webhook de n8n para el número <strong className="text-slate-600">{formatDisplayPhone(lead.phone)}</strong>. Escribe un mensaje a continuación para iniciar el contacto.
                    </p>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((m) => {
                      const isClient = m.from === 'in';
                      const isSys = m.from === 'sys';
                      if (isSys) {
                        return (
                          <div key={m.id} className="self-center bg-slate-100 text-slate-600 border border-slate-200 text-[11px] px-3 py-1 rounded-full text-center max-w-[85%]">
                            {m.text}
                          </div>
                        );
                      }
                      return (
                        <div 
                          key={m.id}
                          className={`
                            max-w-[78%] rounded-2xl p-3 text-xs leading-relaxed transition shadow-2xs
                            ${isClient 
                              ? 'bg-white text-slate-800 border border-slate-200 self-start rounded-tl-xs' 
                              : 'bg-emerald-700 text-white self-end rounded-tr-xs shadow-sm'}
                          `}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1 border-b pb-1 border-black/5">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isClient ? 'text-blue-600' : 'text-emerald-100'}`}>
                              {isClient ? (lead.name || 'Cliente') : (m.sender === 'bot' ? '🤖 Bot Zavala' : '👤 Asesor Zavala')}
                            </span>
                            {m.time && (
                              <span className={`text-[9px] ${isClient ? 'text-slate-400' : 'text-emerald-200'}`}>
                                {m.time}
                              </span>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap select-text leading-relaxed font-normal">{m.text}</p>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Send Box */}
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder={`Escribe un mensaje para ${lead.name}...`}
                  value={chatInput || ''}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 w-full outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                />
                <button
                  onClick={handleSendChat}
                  disabled={sendingChat || !chatInput.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {sendingChat ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Enviar</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB: CITAS & VISITAS */}
          {activeTab === 'citas' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Citas y Visitas de Campo Agendadas
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-400">
                    ({filteredCitas.length} de {citas.length})
                  </span>
                </div>
                <button
                  onClick={() => handleOpenCitaModal()}
                  className="bg-rose-50 hover:bg-rose-100 text-[#E11D48] text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-rose-200 transition duration-150 cursor-pointer shadow-xs"
                >
                  <Plus size={13} />
                  <span>Agendar Cita</span>
                </button>
              </div>

              {/* Filtro por estado de las citas */}
              {citas.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
                  <div className="flex items-center gap-1 text-slate-400 text-[11px] font-semibold pr-1 shrink-0">
                    <Filter size={12} />
                    <span>Estado:</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCitaStatusFilter('todas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                      citaStatusFilter === 'todas'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>Todas</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      citaStatusFilter === 'todas' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {citaStats.total}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCitaStatusFilter('pendientes')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                      citaStatusFilter === 'pendientes'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'bg-amber-50/60 text-amber-800 border-amber-200 hover:bg-amber-100/70'
                    }`}
                  >
                    <span>Pendientes</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      citaStatusFilter === 'pendientes' ? 'bg-amber-700 text-amber-100' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {citaStats.pendientesCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCitaStatusFilter('vencidas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                      citaStatusFilter === 'vencidas'
                        ? 'bg-[#E11D48] text-white border-[#E11D48] shadow-2xs'
                        : citaStats.vencidasCount > 0
                        ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <AlertTriangle size={11} className={citaStatusFilter === 'vencidas' ? 'text-white' : 'text-rose-600'} />
                    <span>Vencidas</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      citaStatusFilter === 'vencidas' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {citaStats.vencidasCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCitaStatusFilter('noasistio')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                      citaStatusFilter === 'noasistio'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                        : 'bg-orange-50/60 text-orange-800 border-orange-200 hover:bg-orange-100/70'
                    }`}
                  >
                    <span>No Asistió</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      citaStatusFilter === 'noasistio' ? 'bg-orange-600 text-orange-100' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {citaStats.noAsistioCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCitaStatusFilter('reprogramadas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                      citaStatusFilter === 'reprogramadas'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-purple-50/60 text-purple-800 border-purple-200 hover:bg-purple-100/70'
                    }`}
                  >
                    <span>Reprogramadas</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      citaStatusFilter === 'reprogramadas' ? 'bg-purple-700 text-purple-100' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {citaStats.reprogramadasCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCitaStatusFilter('realizadas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                      citaStatusFilter === 'realizadas'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-emerald-50/60 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70'
                    }`}
                  >
                    <span>Realizadas</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      citaStatusFilter === 'realizadas' ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {citaStats.realizadasCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCitaStatusFilter('canceladas')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                      citaStatusFilter === 'canceladas'
                        ? 'bg-slate-600 text-white border-slate-600 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Canceladas</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      citaStatusFilter === 'canceladas' ? 'bg-slate-700 text-slate-200' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {citaStats.canceladasCount}
                    </span>
                  </button>
                </div>
              )}

              {citas.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs space-y-1">
                  <p>No hay citas registradas para este cliente.</p>
                  <p className="text-[10px]">Haz clic en "Agendar Cita" para registrar una nueva cita manual.</p>
                </div>
              ) : filteredCitas.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                  <p>No se encontraron citas con el estado seleccionado ({citaStatusFilter}).</p>
                  <button
                    onClick={() => setCitaStatusFilter('todas')}
                    className="text-[11px] font-bold text-[#E11D48] hover:underline cursor-pointer"
                  >
                    Mostrar todas las citas ({citas.length})
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCitas.map((c) => {
                    const overdue = isCitaOverdue(c);

                    return (
                      <div 
                        key={c.id} 
                        className={`border rounded-xl p-4 flex justify-between items-center flex-wrap gap-4 text-xs font-medium transition ${
                          overdue 
                            ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-200' 
                            : c.status === 'No asistió'
                            ? 'bg-orange-50/50 border-orange-200'
                            : c.status === 'Reprogramada'
                            ? 'bg-purple-50/50 border-purple-200'
                            : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-[220px]">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            overdue 
                              ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                              : 'bg-rose-50 text-[#E11D48] border border-rose-100'
                          }`}>
                            <Calendar size={15} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 text-sm">{c.type}</h4>
                            <div className="flex flex-col gap-0.5 text-slate-500 font-medium">
                              <span className="flex items-center gap-1 text-[11px]">
                                <MapPin size={12} className="text-slate-400" />
                                <span>Ubicación: <strong className="text-slate-600 font-semibold">{c.location}</strong></span>
                              </span>
                              <span className="flex items-center gap-1 text-[11px]">
                                <Clock size={12} className="text-slate-400" />
                                <span>Fecha: <strong className="text-slate-700 font-semibold">{c.date}</strong></span>
                              </span>
                              {overdue && (
                                <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-0.5">
                                  <AlertTriangle size={11} />
                                  <span>Cita Vencida (pasó su hora). Acción requerida.</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center flex-wrap gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold border ${
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

                          {/* Action Buttons */}
                          {(overdue || c.status === 'Programada' || c.status === 'No asistió' || c.status === 'Cancelada') && (
                            <button
                              onClick={() => handleOpenCitaModal(c, true)}
                              className="bg-[#E11D48] hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-md flex items-center gap-1 shadow-2xs transition cursor-pointer"
                              title="Reprogramar para nueva fecha y hora"
                            >
                              <RotateCcw size={11} />
                              <span>Reprogramar</span>
                            </button>
                          )}

                          {overdue && (
                            <>
                              <button
                                onClick={() => handleUpdateCitaStatus(c, 'No asistió')}
                                className="bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold text-[10px] px-2 py-1 rounded-md border border-orange-200 transition cursor-pointer"
                                title="Marcar como No asistió"
                              >
                                <span>No asistió</span>
                              </button>
                              <button
                                onClick={() => handleUpdateCitaStatus(c, 'Cancelada')}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] px-2 py-1 rounded-md border border-slate-200 transition cursor-pointer"
                                title="Marcar como Cancelada"
                              >
                                <span>Cancelada</span>
                              </button>
                            </>
                          )}

                          {!overdue && c.status === 'Programada' && (
                            <button
                              onClick={() => handleUpdateCitaStatus(c, 'Realizada')}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              title="Marcar como Realizada"
                            >
                              <CheckCircle2 size={13} />
                            </button>
                          )}

                          <button 
                            onClick={() => handleOpenCitaModal(c, false)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                            title="Editar Cita"
                          >
                            <Edit size={13} />
                          </button>

                          <button 
                            onClick={() => handleDeleteCita(c.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Eliminar Cita"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB: PROFORMAS GENERATED */}
          {activeTab === 'proformas' && (() => {
            const clientProformas = proformas.filter(
              p => p.client_name.toLowerCase().trim() === lead.name.toLowerCase().trim()
            );
            return (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 flex-wrap gap-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Proformas Generadas a su Nombre
                  </h3>
                  <button
                    onClick={() => onGoCotizador(lead.name, lead.phone, lead.cedula || '')}
                    className="bg-rose-50 hover:bg-rose-100 text-[#E11D48] text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 border border-rose-200 transition duration-150 cursor-pointer shadow-xs"
                  >
                    <Plus size={13} />
                    <span>Crear Proforma</span>
                  </button>
                </div>

                {clientProformas.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs space-y-1">
                    <p>No hay proformas registradas para este cliente.</p>
                    <p className="text-[10px]">Haz clic en "Crear Proforma" para generar un plan de financiamiento personalizado.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientProformas.map((pf) => (
                      <div key={pf.id} className="border border-slate-200 rounded-xl p-4 flex justify-between items-center flex-wrap gap-4 text-xs font-medium bg-slate-50/50 hover:bg-slate-50 transition">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-[#E11D48] shrink-0 mt-0.5">
                            <FileText size={15} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">Proforma {pf.number}</h4>
                            <div className="flex flex-col gap-1 mt-1 text-slate-500 font-medium">
                              <span className="flex items-center gap-1 text-[11px]">
                                <span>Proyecto: <strong className="text-slate-600 font-semibold">{pf.project}</strong></span>
                              </span>
                              {pf.details && pf.details.term && (
                                <span className="flex items-center gap-1 text-[11px]">
                                  <span>Plazo: <strong className="text-slate-600 font-semibold">{pf.details.term} meses</strong></span>
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-[11px]">
                                <span>Fecha: <strong className="text-slate-600 font-semibold">{pf.date}</strong></span>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">{formatCurrency(pf.value, true)}</div>
                            <span className="bg-emerald-50 text-emerald-700 text-[9px] px-2.5 py-0.5 border border-emerald-200 rounded-full uppercase font-bold inline-block mt-1">
                              {pf.status}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedProformaForView(pf);
                              setIsProformaModalOpen(true);
                            }}
                            className="bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition shadow-2xs cursor-pointer shrink-0"
                          >
                            <Eye size={14} />
                            <span>Ver Proforma</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* AGENDAR CITA MODAL */}
      {isCitaModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="h-14 bg-gradient-to-r from-rose-900 to-[#E11D48] px-6 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Calendar size={18} />
                <h3 className="font-bold text-sm tracking-tight font-display">
                  {isReprogramming 
                    ? '🔄 Reprogramar Cita / Visita' 
                    : editingCita 
                    ? 'Editar Cita / Visita' 
                    : 'Agendar Nueva Cita / Visita'}
                </h3>
              </div>
              <button 
                onClick={() => setIsCitaModalOpen(false)} 
                className="p-1 rounded-lg text-rose-100 hover:bg-white/10 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateCita} className="p-6 space-y-4 text-left">
              {isReprogramming && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Modo Reprogramación Activo</strong>
                    Selecciona una nueva fecha y hora futura para crear una nueva cita y marcar la anterior como Reprogramada.
                  </div>
                </div>
              )}

              <div className="text-xs bg-slate-50 border border-slate-150 p-3 rounded-xl leading-relaxed text-slate-500">
                {isReprogramming 
                  ? 'Reprogramando cita para el' 
                  : editingCita 
                  ? 'Editando la información de la cita para el' 
                  : 'Agendando cita para el'} cliente <strong className="text-slate-800">{lead?.name}</strong> de su terreno de interés <strong className="text-[#E11D48]">{lead?.project}</strong>.
              </div>

              {/* Tipo de cita */}
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Tipo de Cita *</label>
                <select
                  value={citaType || 'Visita de Campo'}
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

              {/* Fecha y Hora */}
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Fecha y Hora *</label>
                <input
                  type="datetime-local"
                  value={citaDate || ''}
                  min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  onChange={(e) => setCitaDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-850 outline-none focus:ring-1 focus:ring-[#E11D48]"
                  required
                />
              </div>

              {/* Ubicacion / Proyecto */}
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-600 uppercase text-[10px]">Ubicación / Proyecto *</label>
                <select
                  value={citaLocation || lead?.project || (proyectosList[0] || 'Vista del Valle')}
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
                      <option value={lead?.project || 'Vista del Valle'}>
                        🏡 {lead?.project || 'Vista del Valle'}
                      </option>
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
                  onClick={() => setIsCitaModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-lg transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingCita}
                  className="bg-[#E11D48] hover:bg-rose-700 text-white font-semibold px-4 py-2 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  {savingCita ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>{isReprogramming ? 'Reprogramar Cita' : editingCita ? 'Guardar Cambios' : 'Agendar Cita'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* PROFORMA DETAIL MODAL */}
      <ProformaModal
        proforma={selectedProformaForView}
        isOpen={isProformaModalOpen}
        onClose={() => setIsProformaModalOpen(false)}
      />

      {/* EDIT LEAD MODAL (EXACT SAME AS MIS LEADS) */}
      {lead && (
        <LeadModal
          isOpen={isPersonalDataModalOpen}
          onClose={() => {
            setIsPersonalDataModalOpen(false);
            setPendingConsentAction(null);
          }}
          onSubmit={handleSaveLead}
          editingLead={lead}
        />
      )}

      {/* MODAL QR CODE DE CONSENTIMIENTO LOPDP */}
      {showQrModal && qrCodeDataUrl && lead && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-left">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-[#E11D48] flex items-center justify-center border border-rose-200">
                  <QrCode size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Código QR de Consentimiento</h3>
                  <p className="text-[11px] text-slate-500">Autorización Digital LOPDP · COFIZA</p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-left bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs space-y-1">
              <p className="text-slate-500 text-[11px]">
                Cliente: <strong className="text-slate-900">{lead.name}</strong>
              </p>
              <p className="text-slate-500 text-[11px]">
                Cédula / RUC: <strong className="text-slate-900 font-mono">{lead.cedula || 'No registrada'}</strong>
              </p>
              <p className="text-slate-500 text-[11px]">
                Proyecto: <strong className="text-slate-900">{lead.project || 'General'}</strong>
              </p>
            </div>

            {/* QR Image Container */}
            <div className="flex flex-col items-center justify-center py-1">
              <div className="p-3 bg-white rounded-2xl border-2 border-slate-200/80 shadow-sm inline-block">
                <img 
                  src={qrCodeDataUrl} 
                  alt={`QR Consentimiento ${lead.name}`}
                  className="w-52 h-52 object-contain"
                />
              </div>
              <p className="text-xs text-slate-600 mt-3 leading-relaxed px-2">
                Escanea con la cámara del celular o WhatsApp para revisar y firmar digitalmente la autorización.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={handleDownloadQrImage}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Download size={14} />
                <span>Descargar</span>
              </button>
              <button
                onClick={() => handleInitiateSendConsent('copy')}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
              <button
                onClick={() => setShowQrModal(false)}
                className="py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-2xs"
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
