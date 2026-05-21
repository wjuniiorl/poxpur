import { env } from './lib/env';

export default function App() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-secondary">
      <div className="rounded-xl bg-card p-8 shadow-card">
        <h1 className="text-2xl font-bold text-poxpur-navy">
          Pox<span className="text-poxpur-green">x</span>pur Sales Hub
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          ENV OK:{' '}
          <code className="bg-secondary px-1">{env.VITE_SUPABASE_URL.slice(0, 30)}...</code>
        </p>
      </div>
    </div>
  );
}
