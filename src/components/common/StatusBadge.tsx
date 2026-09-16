import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge = React.memo(function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const getStatusBadgeClass = (statusStr: string) => {
    switch (statusStr) {
      case 'Nuevo': return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
      case 'Contactado': return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Cita agendada': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Proforma': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Reservado': return 'bg-[#E11D48] text-white border-transparent';
      case 'Vendido': return 'bg-black text-white border-transparent';
      case 'Reintentar': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`font-semibold rounded-md border inline-flex items-center gap-1 ${sizeClasses} ${getStatusBadgeClass(status)}`}>
      {status}
    </span>
  );
});

interface TempBadgeProps {
  temp: string;
}

export const TempBadge = React.memo(function TempBadge({ temp }: TempBadgeProps) {
  const getTempColor = (tempStr: string) => {
    switch (tempStr) {
      case 'Caliente': return 'bg-[#E11D48] text-white';
      case 'Tibio': return 'bg-amber-500 text-white';
      default: return 'bg-slate-300 text-slate-700';
    }
  };

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getTempColor(temp)}`}>
      {temp === 'Caliente' ? '🔥' : temp === 'Tibio' ? '⚡' : '❄️'} {temp}
    </span>
  );
});
