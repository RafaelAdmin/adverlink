import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
  fullWidth?: boolean
}

const variantClass: Record<ButtonVariant, string> = {
  primary: 'ui-btn ui-btn--primary',
  secondary: 'ui-btn ui-btn--secondary',
  ghost: 'ui-btn ui-btn--ghost',
  danger: 'ui-btn ui-btn--danger',
  success: 'ui-btn ui-btn--success',
}

const sizeClass = {
  sm: 'ui-btn--sm',
  md: 'ui-btn--md',
  lg: 'ui-btn--lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  fullWidth,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${variantClass[variant]} ${sizeClass[size]} ${fullWidth ? 'ui-btn--full' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
