import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import type { MockStat } from '@/lib/mocks';

type StatsCardProps = {
  stat: MockStat;
};

export function StatsCard({ stat }: StatsCardProps) {
  const positive = stat.delta >= 0;

  return (
    <Card className="p-5 shadow-soft transition-shadow hover:shadow-card">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {stat.label}
      </div>
      <div className="mt-2 text-2xl font-bold text-poxpur-navy">{stat.value}</div>
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
        <span className="text-muted-foreground">{stat.deltaLabel}</span>
      </div>
    </Card>
  );
}
