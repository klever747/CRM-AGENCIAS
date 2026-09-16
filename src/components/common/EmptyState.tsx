import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState = React.memo(function EmptyState({
  title = 'No hay registros encontrados',
  description = 'No se encontraron elementos que coincidan con la búsqueda o filtro actual.',
  icon: Icon = Inbox,
  actionText,
  onAction
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl my-4">
      <div className="p-3 bg-white rounded-full text-slate-400 shadow-xs border border-slate-100 mb-3">
        <Icon size={24} />
      </div>
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      <p className="text-xs text-slate-500 max-w-sm mt-1">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 bg-[#E11D48] hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition shadow-xs"
        >
          {actionText}
        </button>
      )}
    </div>
  );
});
