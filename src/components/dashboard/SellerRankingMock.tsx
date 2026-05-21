import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy } from 'lucide-react';
import { mockRanking } from '@/lib/mocks';

const medals = ['🥇', '🥈', '🥉'];

export function SellerRankingMock() {
  return (
    <Card className="h-full p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-poxpur-navy">
          <Trophy className="h-4 w-4 text-poxpur-green" />
          Ranking de vendedores
        </h2>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          mock — Onda 2
        </span>
      </div>
      <div className="space-y-3">
        {mockRanking.map((r) => {
          const initials = r.seller
            .split(' ')
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase() ?? '')
            .join('');
          return (
            <div key={r.seller} className="space-y-1.5">
              <div className="flex items-center gap-3">
                <span className="text-base">{medals[r.rank - 1] ?? `#${r.rank}`}</span>
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-poxpur-navy text-xs text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-poxpur-navy">{r.seller}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.orders} pedidos · {r.revenue}
                  </div>
                </div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-poxpur-green transition-all"
                  style={{ width: `${r.progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
