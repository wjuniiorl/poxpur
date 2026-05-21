import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PoxpurLogo } from '@/components/common/PoxpurLogo';

export default function NotFound() {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="max-w-md space-y-4 rounded-xl bg-card p-8 text-center shadow-card">
        <PoxpurLogo variant="mark" size="xl" className="mx-auto" />
        <h1 className="text-3xl font-bold text-poxpur-navy">404</h1>
        <p className="text-muted-foreground">Página não encontrada.</p>
        <Button asChild className="bg-poxpur-navy hover:bg-poxpur-navy-dark">
          <Link to="/dashboard">Voltar ao Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
