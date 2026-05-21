import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { mockRecentOrders, statusLabels } from '@/lib/mocks';
import { cn } from '@/lib/utils';

export function RecentOrdersMock() {
  return (
    <Card className="flex h-full flex-col p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-poxpur-navy">Pedidos recentes</h2>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          mock — Onda 2
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {mockRecentOrders.map((order) => {
          const status = statusLabels[order.status];
          const initials = order.seller
            .split(' ')
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase() ?? '')
            .join('');
          return (
            <div
              key={order.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-secondary"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-poxpur-navy text-xs font-medium text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium text-poxpur-navy">{order.id}</span>
                  <span className="truncate text-foreground">{order.customer}</span>
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {order.seller} · {order.timeAgo}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-poxpur-navy">{order.amount}</div>
                <Badge variant="secondary" className={cn('mt-0.5 text-[10px]', status.color)}>
                  {status.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
