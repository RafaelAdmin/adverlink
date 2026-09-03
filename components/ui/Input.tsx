import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
}

export default function Input({ label, hint, error, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <label className="ui-field" htmlFor={inputId}>
      {label && <span className="ui-field__label">{label}</span>}
      <input id={inputId} className={`ui-input ${className}`.trim()} {...props} />
      {error ? <span className="ui-field__error">{error}</span> : hint ? <span className="ui-field__hint">{hint}</span> : null}
    </label>
  )
}

export function TextArea({
  label,
  hint,
  error,
  className = '',
  id,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <label className="ui-field" htmlFor={inputId}>
      {label && <span className="ui-field__label">{label}</span>}
      <textarea id={inputId} className={`ui-input ui-textarea ${className}`.trim()} {...props} />
      {error ? <span className="ui-field__error">{error}</span> : hint ? <span className="ui-field__hint">{hint}</span> : null}
    </label>
  )
}
