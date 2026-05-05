export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy">
      <div className="text-center text-white">
        <h1 className="text-4xl font-semibold mb-4">Colegio XYZ</h1>
        <p className="text-lg opacity-75 mb-8">Formando líderes con propósito</p>
        <button className="btn btn-primary" style={{ background: 'white', color: '#1E1B4B' }}>Conócenos</button>
      </div>
    </main>
  );
}