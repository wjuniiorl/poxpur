import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export type StatCardData = {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
};

type StatsCardProps = {
  stat: StatCardData;
  isLoading?: boolean;
};

export function StatsCard({ stat, isLoading }: StatsCardProps) {
  const hasDelta = stat.delta !== undefined && stat.delta !== null;
  const positive = hasDelta ? (stat.delta ?? 0) >= 0 : true;

  if (isLoading) {
    return (
      <Card className="p-5 shadow-soft">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-20 animate-pulse rounded bg-muted" />
      </Card>
    );
  }

  return (
    <Card className="p-5 shadow-soft transition-shadow hover:shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {stat.label}
      </div>
      <div className="mt-2 text-2xl font-bold text-poxpur-navy">{stat.value}</div>
      {hasDelta ? (
        <div
          className={cn(
            'mt-2 flex items-center gap-1 text-xs',
            positive ? 'text-poxpur-green-dark' : 'text-poxpur-red',
          )}
        >
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span className="font-medium">
            {positive ? '+' : ''}
            {stat.delta}%
          </span>
          {stat.deltaLabel && (
            <span className="text-muted-foreground">{stat.deltaLabel}</span>
          )}
        </div>
      ) : (
        <div className="mt-2 h-4" />
      )}
    </Card>
  );
}
