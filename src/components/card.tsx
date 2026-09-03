export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {title && <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>}
      {children}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-slate-400">{message}</p>;
}
