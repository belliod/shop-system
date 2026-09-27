import React from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  gradient,
}) => {
  return (
    <div
      data-ai-section-type="card-stat"
      className={cn(
        'relative overflow-hidden rounded-xl p-6 text-white shadow-sm',
        gradient,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-white/80">{title}</span>
          <span className="text-3xl font-bold tracking-tight">{value}</span>
          {description ? (
            <span className="text-xs text-white/70">{description}</span>
          ) : null}
        </div>
        <div className="flex size-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
          <Icon className="size-6 text-white" />
        </div>
      </div>
      <div className="absolute -right-6 -bottom-6 size-24 rounded-full bg-white/10 blur-xl" />
    </div>
  );
};

export default StatsCard;
