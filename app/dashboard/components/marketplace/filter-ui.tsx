export function FilterLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-white/50 text-xs mb-1 block">{children}</span>
}

export function FilterInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm w-full outline-none focus-accent transition placeholder-white/30"
    />
  )
}

export function FilterSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white text-sm w-full outline-none focus-accent transition"
    />
  )
}
