export default function App() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-secondary">
      <div className="rounded-xl bg-card p-8 shadow-card">
        <h1 className="text-2xl font-bold text-poxpur-navy">
          Pox<span className="text-poxpur-green">x</span>pur Sales Hub
        </h1>
        <p className="text-muted-foreground mt-2">
          Identidade visual carregada com sucesso.
        </p>
        <button className="mt-4 rounded-xl bg-poxpur-navy hover:bg-poxpur-navy-dark text-white px-4 py-2 transition-colors">
          Botão primário
        </button>
        <button className="mt-4 ml-2 rounded-xl bg-poxpur-green hover:bg-poxpur-green-dark text-white px-4 py-2 transition-colors">
          CTA verde
        </button>
      </div>
    </div>
  );
}
