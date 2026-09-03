export function FilterLabel({ children }: { children: React.ReactNode }) {
  return <span className="ui-field__label mb-1 block">{children}</span>
}

export function FilterInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="ui-input text-sm w-full" />
}

export function FilterSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="ui-input text-sm w-full" />
}
