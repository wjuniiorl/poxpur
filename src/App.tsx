import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function App() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .then(({ count, error }) => {
        if (error) setError(error.message);
        else setCount(count);
      });
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-secondary">
      <div className="rounded-xl bg-card p-8 shadow-card">
        <h1 className="text-2xl font-bold text-poxpur-navy">
          Pox<span className="text-poxpur-green">x</span>pur Sales Hub
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error ? (
            <span className="text-poxpur-red">Erro: {error}</span>
          ) : count === null ? (
            'Conectando ao Supabase...'
          ) : (
            <>Conectado — {count} perfis no schema poxpur</>
          )}
        </p>
      </div>
    </div>
  );
}
