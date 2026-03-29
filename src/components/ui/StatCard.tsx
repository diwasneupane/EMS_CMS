import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    label?: string;
  };
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';
  className?: string;
}

const colorClasses = {
  indigo: {
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
  },
  emerald: {
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
  },
  amber: {
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
  },
  rose: {
    iconBg: 'bg-rose-100',
    iconText: 'text-rose-600',
  },
  blue: {
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
  },
  purple: {
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
  },
};

export function StatCard({ label, value, icon, trend, color = 'indigo', className }: StatCardProps) {
  const colors = colorClasses[color];
  const isPositive = trend && trend.value >= 0;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex items-start gap-4',
        className,
      )}
    >
      <div className={cn('p-3 rounded-xl flex-shrink-0', colors.iconBg)}>
        <span className={cn('w-6 h-6 flex items-center justify-center', colors.iconText)}>
          {icon}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 mt-1 text-xs font-medium',
              isPositive ? 'text-emerald-600' : 'text-red-500',
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            <span>
              {isPositive ? '+' : ''}
              {trend.value}% {trend.label || 'vs last month'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
