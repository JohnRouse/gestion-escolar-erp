export default function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl md:text-3xl font-bold text-text mb-8">
      {children}
    </h2>
  );
}