export default function App() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-secondary">
      <div className="rounded-xl bg-card p-8 shadow-card">
        <h1 className="text-2xl font-bold text-poxpur-navy">
          Pox<span className="text-poxpur-green">x</span>pur Sales Hub
        </h1>
        <p className="mt-2 text-muted-foreground">Identidade visual carregada com sucesso.</p>
        <button className="mt-4 rounded-xl bg-poxpur-navy px-4 py-2 text-white transition-colors hover:bg-poxpur-navy-dark">
          Botão primário
        </button>
        <button className="ml-2 mt-4 rounded-xl bg-poxpur-green px-4 py-2 text-white transition-colors hover:bg-poxpur-green-dark">
          CTA verde
        </button>
      </div>
    </div>
  );
}
