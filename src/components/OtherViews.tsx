import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, ShieldAlert, CalendarDays, History, 
  Settings, Check, X, ShieldCheck, Flame, ToggleLeft, 
  ToggleRight, Info, Plus, ChevronLeft, ChevronRight, MapPin, 
  BarChart, AlertOctagon, HelpCircle, Database, Download, FileText, Eye, Search
} from 'lucide-react';
import { Agencia, Usuario, AuditLog, Reserva, Venta, Proforma } from '../types';
import { formatCurrency } from '../lib/utils';
import AgenciasView from './AgenciasView';
import UsuariosView from './UsuariosView';
import AuditoriaView from './AuditoriaView';
import ProformasHistorialView from './ProformasHistorialView';
import VentasView from './VentasView';
import ReportesGerencialesView from './ReportesGerencialesView';
import RolesPermisosView from './RolesPermisosView';
import { subscribeToDbSync } from '../lib/databaseSync';

interface OtherViewsProps {
  screen: string;
  onEditAgencia?: (ag: Agencia) => void;
  onEditUsuario?: (u: Usuario) => void;
  onAddUsuario?: () => void;
  onAddAgencia?: () => void;
  userRole?: string;
  currentUser?: Usuario | null;
  onRefreshLeads?: () => void;
}

export default function OtherViews({ 
  screen, 
  onEditAgencia, 
  onEditUsuario, 
  onAddUsuario, 
  onAddAgencia,
  userRole = 'gerencial',
  currentUser,
  onRefreshLeads
}: OtherViewsProps) {
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [roleTab, setRoleTab] = useState('Asesor');
  const [loading, setLoading] = useState(true);

  const loadScreenData = () => {
    const endpoints: Record<string, string> = {
      agencias: '/api/agencias',
      usuarios: '/api/usuarios',
      auditoria: '/api/audit',
      reservas: '/api/reservas',
      ventas: '/api/ventas',
      proformas: '/api/proformas',
      configuracion: '/api/settings',
      reportes: '/api/dashboard/stats?role=general'
    };

    const targetUrl = endpoints[screen];
    if (!targetUrl) {
      setLoading(false);
      return;
    }

    fetch(targetUrl)
      .then(res => res.json())
      .then(data => {
        if (screen === 'agencias') {
          setAgencias(Array.isArray(data) ? data : []);
          fetchUsuarios();
        }
        else if (screen === 'usuarios') {
          setUsuarios(Array.isArray(data) ? data : []);
          fetchAgencias();
        }
        else if (screen === 'auditoria') setAuditLogs(Array.isArray(data) ? data : []);
        else if (screen === 'reservas') setReservas(Array.isArray(data) ? data : []);
        else if (screen === 'ventas') setVentas(Array.isArray(data) ? data : []);
        else if (screen === 'proformas') setProformas(Array.isArray(data) ? data : []);
        else if (screen === 'configuracion') setSettings(data || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  // Fetch appropriate lists depending on the screen
  useEffect(() => {
    setLoading(true);
    loadScreenData();

    const unsubscribe = subscribeToDbSync([
      'agencias', 'usuarios', 'proformas', 'reservas', 'ventas', 'audit', 'settings', 'roles-permisos', 'all'
    ], () => {
      loadScreenData();
    });

    return () => {
      unsubscribe();
    };
  }, [screen]);

  // Fetch agencias list
  const fetchAgencias = () => {
    fetch('/api/agencias')
      .then(res => res.json())
      .then(data => {
        setAgencias(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error(err));
  };

  // Fetch usuarios list
  const fetchUsuarios = () => {
    fetch('/api/usuarios')
      .then(res => res.json())
      .then(data => {
        setUsuarios(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error(err));
  };

  // Fetch audit logs list
  const fetchAuditLogs = () => {
    return fetch('/api/audit')
      .then(res => res.json())
      .then(data => {
        setAuditLogs(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error(err));
  };

  // Fetch proformas list
  const fetchProformas = () => {
    return fetch('/api/proformas')
      .then(res => res.json())
      .then(data => {
        setProformas(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error(err));
  };

  // Toggle agency status
  const handleToggleAgency = (id: number) => {
    fetch(`/api/agencias/${id}/toggle`, { method: 'PATCH' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAgencias(prev => prev.map(a => a.id === id ? { ...a, status: data.status } : a));
        }
      });
  };

  // Toggle user status
  const handleToggleUser = (id: number) => {
    fetch(`/api/usuarios/${id}/toggle`, { method: 'PATCH' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsuarios(prev => prev.map(u => u.id === id ? { ...u, status: data.status } : u));
        }
      });
  };

  // Save Settings logic
  const handleSaveSettings = (key: string, value: string) => {
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSettings((prev: any) => ({ ...prev, [key]: value }));
          alert('Configuración guardada correctamente.');
        }
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600" />
      </div>
    );
  }

  // -----------------------------------------------------
  // VIEW: AGENCIAS LIST
  // -----------------------------------------------------
  if (screen === 'agencias') {
    return (
      <AgenciasView
        agencias={agencias}
        usuarios={usuarios}
        onRefresh={fetchAgencias}
        onToggleStatus={handleToggleAgency}
      />
    );
  }

  // -----------------------------------------------------
  // VIEW: USUARIOS LIST
  // -----------------------------------------------------
  if (screen === 'usuarios') {
    return (
      <UsuariosView
        usuarios={usuarios}
        agencias={agencias}
        onRefresh={fetchUsuarios}
        onToggleStatus={handleToggleUser}
      />
    );
  }

  // -----------------------------------------------------
  // VIEW: ROLES MATRIX & PERMISSIONS MANAGEMENT (NEW & COMPREHENSIVE)
  // -----------------------------------------------------
  if (screen === 'roles') {
    return (
      <RolesPermisosView
        currentUser={currentUser}
        userRole={userRole}
      />
    );
  }

  // -----------------------------------------------------
  // VIEW: AUDITORÍA (MANDATORY IN DESIGN)
  // -----------------------------------------------------
  if (screen === 'auditoria') {
    return (
      <AuditoriaView
        logs={auditLogs}
        onRefresh={fetchAuditLogs}
      />
    );
  }

  // -----------------------------------------------------
  // VIEW: CONFIGURACIÓN SYSTEM GENERAL
  // -----------------------------------------------------
  if (screen === 'configuracion') {
    const webhookUrl = settings.whatsapp_webhook_url || '';

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display">Ajustes Generales del Sistema</h2>
          <p className="text-xs text-slate-400">Configuración de integraciones de automatización n8n, mensajería WhatsApp y parámetros financieros</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Outbound n8n Webhook Settings */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>1. Salida de Mensajes WhatsApp hacia n8n (POST)</span>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-100">
                Webhook Activo
              </span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              URL del webhook de n8n para enviar mensajes directos de WhatsApp a los clientes desde el chat del lead.
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">URL del Webhook de n8n (Enviar Mensaje)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="https://n8n-zkcp.srv1879156.hstgr.cloud/webhook/enviar-mensaje"
                  defaultValue={settings.whatsapp_webhook_url || 'https://n8n-zkcp.srv1879156.hstgr.cloud/webhook/enviar-mensaje'}
                  id="webhook_input"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 w-full outline-none focus:ring-1 focus:ring-[#E11D48]"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('webhook_input') as HTMLInputElement;
                    handleSaveSettings('whatsapp_webhook_url', input?.value || '');
                  }}
                  className="bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-2xs cursor-pointer shrink-0"
                >
                  Guardar
                </button>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[10px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Estructura enviada en POST a n8n (JSON):</span>
                <code className="font-mono text-rose-600 block bg-white p-1.5 rounded border border-slate-200">
                  {`{\n  "phone": "593959412316",\n  "message": "Mensaje de prueba con ID",\n  "lead_id": 57\n}`}
                </code>
              </div>
            </div>
          </div>

          {/* Inbound n8n Webhook Endpoint Documentation */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>2. Entrada de Leads desde n8n (Inbound)</span>
              <span className="bg-sky-50 text-sky-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-sky-100">
                API Disponible
              </span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Crea automáticamente prospectos en CRM Zavala cuando ingresen solicitudes desde Facebook Ads, WhatsApp Bot, Google Forms o landing pages a través de un nodo <strong>HTTP Request</strong> en n8n.
            </p>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Endpoint POST:</span>
                <code className="font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded block mt-0.5 text-[11px] font-bold">
                  {window.location.origin}/api/webhooks/n8n/lead
                </code>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[10px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Payload esperado por el CRM (JSON):</span>
                <code className="font-mono text-slate-700 block bg-white p-2 rounded border border-slate-200 text-[10px] overflow-x-auto whitespace-pre">
{`{
  "name": "Juan Pérez",
  "phone": "0987654321",
  "email": "juan@gmail.com",
  "source": "Meta Ads / n8n",
  "project": "Vista del Valle",
  "deal_value": 35000
}`}
                </code>
              </div>
            </div>
          </div>

          {/* WhatsApp Messages Fetch Webhook (API n8n) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>3. Consulta de Mensajes WhatsApp (API n8n)</span>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-100">
                Webhook Activo
              </span>
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Consulta en tiempo real el historial de chats de WhatsApp de los leads seleccionados a través del webhook de n8n pasando el parámetro <code className="text-slate-800 font-bold bg-slate-100 px-1 rounded">?phone=[numero de telefono]</code>.
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-700">URL del Webhook de Mensajes (n8n)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="https://n8n-zkcp.srv1879156.hstgr.cloud/webhook/mensajesLeds"
                  defaultValue={settings.whatsapp_messages_webhook_url || 'https://n8n-zkcp.srv1879156.hstgr.cloud/webhook/mensajesLeds'}
                  id="webhook_messages_input"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 w-full outline-none focus:ring-1 focus:ring-[#E11D48]"
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('webhook_messages_input') as HTMLInputElement;
                    handleSaveSettings('whatsapp_messages_webhook_url', input?.value || '');
                  }}
                  className="bg-[#E11D48] hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-2xs cursor-pointer shrink-0"
                >
                  Guardar
                </button>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-[10px] text-slate-600 space-y-1">
                <span className="font-bold text-slate-800 block">Formato invocado:</span>
                <code className="font-mono text-emerald-700 block bg-white p-1.5 rounded border border-slate-200">
                  {`GET https://n8n-zkcp.srv1879156.hstgr.cloud/webhook/mensajesLeds?phone=[teléfono]`}
                </code>
              </div>
            </div>
          </div>

          {/* Financial Parameters settings */}
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-50 pb-2">
              Parámetros Financieros Globales
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Tasa de interés de financiamiento anual por defecto</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    defaultValue={settings.default_interest_rate || '8%'}
                    id="interest_input"
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 w-full outline-none"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('interest_input') as HTMLInputElement;
                      handleSaveSettings('default_interest_rate', input?.value || '8%');
                    }}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Guardar
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600">Entrada mínima sugerida por LOPD</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    defaultValue={settings.minimum_down_payment || '15%'}
                    id="down_input"
                    className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 w-full outline-none"
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('down_input') as HTMLInputElement;
                      handleSaveSettings('minimum_down_payment', input?.value || '15%');
                    }}
                    className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Export Database Contacts Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 md:col-span-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
              <Database size={16} className="text-[#E11D48]" /> Extraer y Exportar Contactos de la Base de Datos (crmzavala)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Descarga la lista completa de contactos, leads y prospectos registrados en el sistema en formato CSV para respaldos o integración con herramientas externas.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 bg-slate-50 p-3.5 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Formato:</span> CSV / Excel (UTF-8 con BOM) &bull; <span className="font-semibold text-slate-800">Incluye:</span> Nombre, Cédula, Teléfono, Email, Proyecto, Asesor, Agencia, Estado y Consentimiento WhatsApp.
              </div>
              <a
                href="/api/leads/export"
                download="contactos_crmzavala.csv"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-xs transition"
              >
                <Download size={15} />
                <span>Descargar Contactos (CSV)</span>
              </a>
            </div>
          </div>

          {/* Reset Database Section */}
          <div className="bg-white border border-red-100 rounded-xl p-5 shadow-sm space-y-4 md:col-span-2">
            <h3 className="text-xs font-bold text-red-700 uppercase tracking-wider border-b border-red-50 pb-2 flex items-center gap-2">
              <ShieldAlert size={16} /> Restablecer Base de Datos (Mantenimiento)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Esta acción eliminará de forma irreversible todos los registros de agencias, usuarios, leads, citas, proformas, reservas, ventas, objeciones e historial de auditoría, restableciendo el sistema a los datos de prueba predeterminados de fábrica.
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  if (confirm('¿Estás seguro de que deseas restablecer todos los datos del sistema? Esta acción es irreversible y eliminará todos los cambios realizados.')) {
                    setLoading(true);
                    fetch('/api/settings/reset', { method: 'POST' })
                      .then(res => res.json())
                      .then(data => {
                        setLoading(false);
                        if (data.success) {
                          alert('La base de datos se ha restablecido correctamente.');
                          window.location.reload();
                        } else {
                          alert('Error al restablecer la base de datos: ' + data.message);
                        }
                      })
                      .catch(err => {
                        setLoading(false);
                        alert('Error al restablecer la base de datos.');
                      });
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow transition"
              >
                <ShieldAlert size={15} />
                <span>Restablecer Todos los Datos</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------
  // VIEW: HISTORIAL GENERAL DE PROFORMAS
  // -----------------------------------------------------
  if (screen === 'proformas') {
    return (
      <ProformasHistorialView 
        proformas={proformas} 
        onRefresh={fetchProformas} 
        userRole={userRole}
        currentUser={currentUser}
      />
    );
  }

  // -----------------------------------------------------
  // VIEW: VENTAS CERRADAS
  // -----------------------------------------------------
  if (screen === 'ventas') {
    return (
      <VentasView 
        userRole={userRole} 
        currentUser={currentUser}
        onRefreshLeads={onRefreshLeads}
      />
    );
  }

  // -----------------------------------------------------
  // VIEW: REPORTES GERENCIALES
  // -----------------------------------------------------
  if (screen === 'reportes') {
    return <ReportesGerencialesView />;
  }

  return (
    <div className="text-center py-12">
      <h3 className="text-sm font-bold text-slate-700">Módulo en Desarrollo</h3>
      <p className="text-xs text-slate-400">Esta pantalla ({screen}) se encuentra actualmente bajo maquetación.</p>
    </div>
  );
}
