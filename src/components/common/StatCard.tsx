import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  badgeText?: string;
  badgeType?: 'positive' | 'negative' | 'neutral';
}

export const StatCard = React.memo(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-[#E11D48]',
  badgeText,
  badgeType = 'positive'
}: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs transition hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-lg bg-slate-50 ${iconColor}`}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <div className="text-xl font-bold text-slate-900 font-display">{value}</div>
        {badgeText && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            badgeType === 'positive' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            badgeType === 'negative' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
            'bg-slate-100 text-slate-600 border border-slate-200'
          }`}>
            {badgeText}
          </span>
        )}
      </div>
      {subtitle && <p className="text-[11px] text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
});
