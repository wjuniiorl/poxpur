import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PoxpurSpinner } from '@/components/common/PoxpurSpinner';
import type { UserRole } from '@/types/database';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

type ProtectedRouteProps = {
  children: ReactNode;
  requireRole?: UserRole;
};

export function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { status, profile } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <PoxpurSpinner fullscreen label="Carregando..." />;
  }

  if (status === 'unauthenticated' || status === 'no_profile') {
    return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />;
  }

  // status === 'authenticated' here — profile is guaranteed
  if (requireRole && profile?.role !== requireRole && profile?.role !== 'admin') {
    return (
      <div className="grid h-full w-full place-items-center">
        <div className="max-w-md space-y-4 rounded-xl bg-card p-8 text-center shadow-card">
          <ShieldAlert className="mx-auto h-12 w-12 text-poxpur-red" />
          <h2 className="text-xl font-bold text-poxpur-navy">Sem permissão</h2>
          <p className="text-muted-foreground">
            Esta área é restrita a{' '}
            {requireRole === 'admin' ? 'administradores' : 'vendedores'}. Se você acredita que
            isso é um engano, fale com seu gerente.
          </p>
          <Button asChild className="bg-poxpur-navy hover:bg-poxpur-navy-dark">
            <Link to="/dashboard">Voltar ao Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
