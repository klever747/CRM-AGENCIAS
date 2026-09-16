export const COUNTRY_CODES = [
  { code: '+593', name: 'Ecuador (+593)', flag: '🇪🇨' },
  { code: '+1', name: 'EE.UU. / Canadá (+1)', flag: '🇺🇸' },
  { code: '+52', name: 'México (+52)', flag: '🇲🇽' },
  { code: '+57', name: 'Colombia (+57)', flag: '🇨🇴' },
  { code: '+51', name: 'Perú (+51)', flag: '🇵🇪' },
  { code: '+54', name: 'Argentina (+54)', flag: '🇦🇷' },
  { code: '+56', name: 'Chile (+56)', flag: '🇨🇱' },
  { code: '+34', name: 'España (+34)', flag: '🇪🇸' },
  { code: '+58', name: 'Venezuela (+58)', flag: '🇻🇪' },
  { code: '+595', name: 'Paraguay (+595)', flag: '🇵🇾' },
  { code: '+598', name: 'Uruguay (+598)', flag: '🇺🇾' },
  { code: '+591', name: 'Bolivia (+591)', flag: '🇧🇴' },
  { code: '+506', name: 'Costa Rica (+506)', flag: '🇨🇷' },
  { code: '+503', name: 'El Salvador (+503)', flag: '🇸🇻' },
  { code: '+502', name: 'Guatemala (+502)', flag: '🇬🇹' },
  { code: '+504', name: 'Honduras (+504)', flag: '🇭🇳' },
  { code: '+505', name: 'Nicaragua (+505)', flag: '🇳🇮' },
  { code: '+507', name: 'Panamá (+507)', flag: '🇵🇦' },
  { code: '+1787', name: 'Puerto Rico (+1787)', flag: '🇵🇷' },
  { code: '+1809', name: 'Rep. Dominicana (+1809)', flag: '🇩🇴' },
  { code: '+39', name: 'Italia (+39)', flag: '🇮🇹' },
  { code: '+33', name: 'Francia (+33)', flag: '🇫🇷' },
  { code: '+49', name: 'Alemania (+49)', flag: '🇩🇪' },
  { code: '+44', name: 'Reino Unido (+44)', flag: '🇬🇧' },
];

export function formatCurrency(value: number, includeCode: boolean = false): string {
  if (isNaN(value) || value === null || value === undefined) return '$0 USD';
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return includeCode ? `${formatted} USD` : formatted;
}

export function formatPhoneToEcuador(raw: string): string {
  if (!raw || !raw.trim()) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return trimmed;
  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  if (digits.startsWith('593')) {
    return `+${digits}`;
  }
  return `+593 ${digits}`;
}

export function validateLeadData(first: string, last: string, cedula: string, phoneDigits: string) {
  const errors: { [key: string]: string } = {};

  if (!first.trim()) {
    errors.first = 'El nombre es obligatorio.';
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(first.trim())) {
    errors.first = 'El nombre debe contener solo letras.';
  }

  if (!last.trim()) {
    errors.last = 'El apellido es obligatorio.';
  } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(last.trim())) {
    errors.last = 'El apellido debe contener solo letras.';
  }

  const cleanCedula = cedula.trim();
  if (!cleanCedula) {
    errors.cedula = 'La Cédula/RUC es obligatoria.';
  } else if (!/^\d+$/.test(cleanCedula)) {
    errors.cedula = 'La Cédula/RUC solo debe contener números.';
  } else if (cleanCedula.length !== 10 && cleanCedula.length !== 13) {
    errors.cedula = `Debe tener exactamente 10 dígitos (Cédula) o 13 dígitos (RUC). Actual: ${cleanCedula.length} dígitos.`;
  }

  if (!phoneDigits) {
    errors.phone = 'El número celular es obligatorio.';
  } else if (phoneDigits.length !== 9) {
    errors.phone = `El celular debe tener exactamente 9 dígitos (sin el 0 inicial). Actual: ${phoneDigits.length} dígitos.`;
  }

  return errors;
}
