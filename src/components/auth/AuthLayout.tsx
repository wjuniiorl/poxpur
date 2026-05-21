import type { ReactNode } from 'react';
import { PoxpurLogo } from '@/components/common/PoxpurLogo';

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Esquerda — gradiente Poxpur */}
      <div className="hidden flex-col justify-between bg-gradient-to-br from-poxpur-navy via-poxpur-navy-dark to-poxpur-green-dark p-12 lg:flex lg:flex-1">
        <PoxpurLogo size="lg" inverted />
        <div className="text-white">
          <h2 className="mb-3 text-4xl font-bold leading-tight">Sales Hub</h2>
          <p className="max-w-md text-lg text-white/80">
            Gestão completa da sua equipe de vendas Poxpur. Pedidos, atendimento e
            performance em um só lugar.
          </p>
        </div>
        <p className="text-xs text-white/40">© 2026 Poxpur — Todos os direitos reservados</p>
      </div>

      {/* Direita — formulário */}
      <div className="flex flex-1 items-center justify-center bg-secondary p-6 lg:bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <PoxpurLogo size="lg" />
          </div>
          <div className="rounded-xl bg-card p-8 shadow-card">
            <h1 className="mb-1 text-2xl font-bold text-poxpur-navy">{title}</h1>
            {subtitle && <p className="mb-6 text-sm text-muted-foreground">{subtitle}</p>}
            <div className={subtitle ? '' : 'mt-6'}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
