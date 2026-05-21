import { Link } from 'react-router-dom';
import { Check, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PoxpurLogo } from './PoxpurLogo';

type ComingSoonPageProps = {
  feature: string;
  onda: number;
  bullets: string[];
};

export function ComingSoonPage({ feature, onda, bullets }: ComingSoonPageProps) {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="w-full max-w-lg space-y-6 rounded-xl bg-card p-8 text-center shadow-card">
        <div className="flex justify-center">
          <div className="relative">
            <PoxpurLogo variant="mark" size="xl" />
            <span className="absolute -right-2 -top-2 rounded-full bg-poxpur-navy px-2 py-0.5 text-xs font-semibold text-white">
              Onda {onda}
            </span>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-poxpur-navy">{feature} — em construção</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta funcionalidade chega na Onda {onda} do roadmap
          </p>
        </div>

        <ul className="mx-auto max-w-md space-y-2 text-left">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-poxpur-green" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <Button asChild variant="outline">
          <Link to="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
