export interface Agencia {
  id: number;
  name: string;
  city: string;
  supervisor: string;
  manager?: string;
  advisors: number;
  advisors_count?: number;
  status: string;
  projects: string[];
  created_at?: string;
}

export interface Usuario {
  id: number;
  name: string;
  email: string;
  phone?: string;
  cedula?: string;
  bio?: string;
  role: string;
  agency_id: number | null;
  agency_name?: string;
  agency_city?: string;
  supervisor: string;
  status: string;
  last_access: string;
  created_at?: string;
}

export interface AdvisorWorkload {
  id: number;
  name: string;
  email: string;
  role: string;
  agency_id: number | null;
  agency: string;
  city: string;
  status: string;
  totalLeads: number;
  activeLeads: number;
  newLeads: number;
}

export interface Lead {
  id: number;
  first?: string | null;
  last?: string | null;
  name: string;
  phone: string;
  email?: string | null;
  source: string;
  project?: string | null;
  agency?: string | null;
  advisor?: string | null;
  status: string;
  temp: string;
  next_follow?: string | null;
  stage: string;
  deal_value: number;
  cedula?: string | null;
  country?: string | null;
  city?: string | null;
  civil_status?: string | null;
  occupation?: string | null;
  income_range?: string | null;
  consent_accepted?: number;
  consent_date?: string;
  consent_data?: string;
}

/**
 * Helper to format phone for display with clean country code separation (e.g. +593 959 412 316)
 */
export function formatDisplayPhone(phone?: string | null): string {
  if (!phone) return '—';
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return String(phone);

  // Ecuador (+593)
  if (digits.startsWith('593')) {
    const numPart = digits.slice(3);
    if (numPart.length === 9) {
      return `+593 ${numPart.slice(0, 3)} ${numPart.slice(3, 6)} ${numPart.slice(6)}`;
    } else if (numPart.length === 8) {
      return `+593 ${numPart.slice(0, 2)} ${numPart.slice(2, 5)} ${numPart.slice(5)}`;
    }
    return `+593 ${numPart}`;
  }
  // Panama (+507)
  if (digits.startsWith('507')) {
    const numPart = digits.slice(3);
    if (numPart.length === 8) {
      return `+507 ${numPart.slice(0, 4)} ${numPart.slice(4)}`;
    }
    return `+507 ${numPart}`;
  }
  // Costa Rica (+506)
  if (digits.startsWith('506')) {
    const numPart = digits.slice(3);
    if (numPart.length === 8) {
      return `+506 ${numPart.slice(0, 4)} ${numPart.slice(4)}`;
    }
    return `+506 ${numPart}`;
  }
  // Bolivia (+591)
  if (digits.startsWith('591')) {
    const numPart = digits.slice(3);
    if (numPart.length === 8) {
      return `+591 ${numPart.slice(0, 4)} ${numPart.slice(4)}`;
    }
    return `+591 ${numPart}`;
  }
  // USA / Canada (+1)
  if (digits.startsWith('1') && digits.length === 11) {
    const numPart = digits.slice(1);
    return `+1 ${numPart.slice(0, 3)} ${numPart.slice(3, 6)} ${numPart.slice(6)}`;
  }
  // Colombia (+57)
  if (digits.startsWith('57')) {
    const numPart = digits.slice(2);
    if (numPart.length === 10) {
      return `+57 ${numPart.slice(0, 3)} ${numPart.slice(3, 6)} ${numPart.slice(6)}`;
    }
    return `+57 ${numPart}`;
  }
  // Peru (+51)
  if (digits.startsWith('51')) {
    const numPart = digits.slice(2);
    if (numPart.length === 9) {
      return `+51 ${numPart.slice(0, 3)} ${numPart.slice(3, 6)} ${numPart.slice(6)}`;
    }
    return `+51 ${numPart}`;
  }
  // Spain (+34)
  if (digits.startsWith('34')) {
    const numPart = digits.slice(2);
    if (numPart.length === 9) {
      return `+34 ${numPart.slice(0, 3)} ${numPart.slice(3, 6)} ${numPart.slice(6)}`;
    }
    return `+34 ${numPart}`;
  }
  // Chile (+56)
  if (digits.startsWith('56')) {
    const numPart = digits.slice(2);
    if (numPart.length === 9) {
      return `+56 ${numPart.slice(0, 1)} ${numPart.slice(1, 5)} ${numPart.slice(5)}`;
    }
    return `+56 ${numPart}`;
  }
  // Mexico (+52)
  if (digits.startsWith('52')) {
    const numPart = digits.slice(2);
    if (numPart.length === 10) {
      return `+52 ${numPart.slice(0, 2)} ${numPart.slice(2, 6)} ${numPart.slice(6)}`;
    }
    return `+52 ${numPart}`;
  }
  // Venezuela (+58)
  if (digits.startsWith('58')) {
    const numPart = digits.slice(2);
    if (numPart.length === 10) {
      return `+58 ${numPart.slice(0, 3)} ${numPart.slice(3, 6)} ${numPart.slice(6)}`;
    }
    return `+58 ${numPart}`;
  }
  // Argentina (+54)
  if (digits.startsWith('54')) {
    const numPart = digits.slice(2);
    return `+54 ${numPart}`;
  }
  // Italy (+39)
  if (digits.startsWith('39')) {
    const numPart = digits.slice(2);
    if (numPart.length === 10) {
      return `+39 ${numPart.slice(0, 3)} ${numPart.slice(3, 6)} ${numPart.slice(6)}`;
    }
    return `+39 ${numPart}`;
  }

  // Fallback if Ecuadorian 10 digits starting with 0 (e.g. 0959412316)
  if (digits.length === 10 && digits.startsWith('0')) {
    const numPart = digits.slice(1);
    return `+593 ${numPart.slice(0, 3)} ${numPart.slice(3, 6)} ${numPart.slice(6)}`;
  }
  // Fallback if local 9 digits without country code
  if (digits.length === 9) {
    return `+593 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }

  return `+${digits}`;
}

/**
 * Helper to ensure clean numeric format without signs or symbols (e.g. "593959412316")
 */
export function cleanDigitsPhone(countryCode: string, numberDigits: string): string {
  const cleanCode = String(countryCode || '593').replace(/\D/g, '');
  let cleanNum = String(numberDigits || '').replace(/\D/g, '');
  if (cleanNum.startsWith(cleanCode)) {
    cleanNum = cleanNum.slice(cleanCode.length);
  }
  if (cleanNum.startsWith('0')) {
    cleanNum = cleanNum.substring(1);
  }
  return `${cleanCode}${cleanNum}`;
}

export interface Cita {
  id: number;
  lead_id: number | null;
  date: string;
  type: string;
  location: string;
  status: string;
}

export interface Proforma {
  id: number;
  number: string;
  client_name: string;
  project: string;
  category: string;
  value: number;
  status: string;
  date: string;
  advisor: string;
  details?: {
    area: number;
    costoM2: number;
    discount: number;
    down: number;
    rate: number;
    term: number;
    celular?: string;
    cedula?: string;
    correo?: string;
    direccion?: string;
  };
}

export interface Reserva {
  id: number;
  client: string;
  project: string;
  block: string;
  lot: string;
  value: number;
  date: string;
  status: string;
  advisor: string;
}

export interface Venta {
  id: number;
  client: string;
  project: string;
  lot: string;
  value: number;
  down: number;
  financing: number;
  close_date: string;
  advisor: string;
  agency: string;
  status: string;
}

export interface AuditLog {
  id: number;
  user: string;
  action: string;
  module: string;
  record: string;
  date: string;
  ip: string;
}

export interface Objection {
  id: number;
  lead_id: number;
  text: string;
  date: string;
}

export interface SettingsMap {
  whatsapp_webhook_url?: string;
  whatsapp_messages_webhook_url?: string;
  default_interest_rate?: string;
  minimum_down_payment?: string;
  maximum_term_years?: string;
  consent_text?: string;
}

export interface LotCategory {
  id?: number;
  id_categoria?: number;
  name: string;
  cost: number;
  costo_m2?: number;
  area: number;
  area_minima?: number;
  term: number;
  meses_plazo?: number;
  anios_plazo?: number;
  down: number;
  entrada_minima?: number;
  es_contado?: boolean;
  plazo_entrada?: string;
  valor_contado?: number;
  saldo?: number;
  tasa_financiamiento?: number;
  cuota?: number;
  valor_final?: number;
}

export interface Urbanizacion {
  id: number;
  id_proyecto?: number;
  name: string;
  nombre?: string;
  code: string;
  city: string;
  status: string;
  available: number;
  refPrice: number;
  ref_price?: number;
  description?: string;
  categories: LotCategory[];
  created_at?: string;
}

export interface Proyecto {
  id_proyecto: number;
  nombre: string;
  code?: string;
  city?: string;
  status?: string;
  available?: number;
  ref_price?: number;
  description?: string;
  created_at?: string;
}

export interface Categoria {
  id_categoria: number;
  nombre: string;
}

export interface PlanFinanciamiento {
  id: number;
  id_proyecto: number;
  id_categoria: number;
  costo_m2: number;
  anios_plazo: number;
  meses_plazo: number;
  entrada_minima: number;
  es_contado: boolean;
  plazo_entrada: string;
  area_minima: number;
  valor_contado: number;
  saldo: number;
  tasa_financiamiento: number;
  cuota: number;
  valor_final: number;
  created_at?: string;
  categoria_nombre?: string;
  proyecto_nombre?: string;
}

export interface PermissionDefinition {
  id: string;
  name: string;
  description: string;
  category: 'comercial' | 'operaciones' | 'ventas' | 'finanzas' | 'administracion';
  isNew?: boolean;
}

export interface RoleDefinition {
  id: string;
  name: string;
  label: string;
  description: string;
  badgeColor: string;
  isSystem?: boolean;
  permissions: string[];
  userCount?: number;
}

export interface UserGroupDefinition {
  id: string;
  name: string;
  description: string;
  badgeColor: string;
  isSystem?: boolean;
  userIds: number[];
  permissions: string[];
  createdAt?: string;
}

export interface UserPermissionOverride {
  userId: number;
  customPermissions: string[];
  deniedPermissions: string[];
  notes?: string;
}

export interface MetaComercial {
  id?: number;
  tipo: 'usuario' | 'agencia' | 'rol'; // Target of the variable goal
  target_id: string; // e.g. 'user_12' or 'agency_1' or 'role_asesor_comercial'
  target_name: string; // e.g. 'Andrea Cedeño', 'Agencia Quito Norte', 'Asesor Comercial'
  role?: string; // Specific user role e.g. 'Asesor Comercial', 'Supervisor Comercial', 'Asesora de Cobranzas', etc.
  agency_id?: number | null;
  agency_name?: string;
  periodo: string; // e.g. '2026-07' or '2026-09' (YYYY-MM)
  periodo_tipo: 'mensual' | 'trimestral' | 'anual';
  meta_monto: number; // Target sales or revenue volume in USD
  meta_unidades: number; // Target number of closed deals / lots sold
  meta_proformas?: number; // Target number of proformas / quotes
  meta_citas?: number; // Target number of appointments / field visits
  meta_recaudacion?: number; // Target collection in USD
  notas?: string;
  updated_at?: string;
}

export interface MetaProgress {
  meta: MetaComercial;
  actual_monto: number;
  actual_unidades: number;
  actual_proformas: number;
  actual_citas: number;
  actual_recaudacion: number;
  pct_monto: number;
  pct_unidades: number;
  pct_proformas: number;
  pct_citas: number;
  status: 'en_camino' | 'cumplida' | 'en_riesgo';
}

