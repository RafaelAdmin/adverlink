'use client'

export type AddChannelFlowStep = 1 | 2 | 3 | 4 | 5

const DEFAULT_STEPS: { id: AddChannelFlowStep; label: string; shortLabel: string }[] = [
  { id: 1, label: 'Выберите социальную сеть', shortLabel: 'Соцсеть' },
  { id: 2, label: 'Добавьте канал', shortLabel: 'Канал' },
  { id: 3, label: 'Верификация канала', shortLabel: 'Верификация' },
  { id: 4, label: 'Канал добавлен', shortLabel: 'Готово' },
]

const TELEGRAM_STEPS: { id: AddChannelFlowStep; label: string; shortLabel: string }[] = [
  { id: 1, label: 'Выберите социальную сеть', shortLabel: 'Соцсеть' },
  { id: 2, label: 'Добавьте канал', shortLabel: 'Канал' },
  { id: 3, label: 'Прайс-лист', shortLabel: 'Прайс' },
  { id: 4, label: 'Верификация канала', shortLabel: 'Верификация' },
]

type AddChannelProgressStepperProps = {
  currentStep: AddChannelFlowStep
  className?: string
  variant?: 'default' | 'telegram' | 'youtube'
}

export default function AddChannelProgressStepper({
  currentStep,
  className = '',
  variant = 'default',
}: AddChannelProgressStepperProps) {
  const steps = variant === 'telegram' || variant === 'youtube' ? TELEGRAM_STEPS : DEFAULT_STEPS

  return (
    <nav
      className={`add-channel-stepper ${className}`.trim()}
      aria-label="Прогресс добавления канала"
    >
      <ol className="add-channel-stepper__list">
        {steps.map((step, index) => {
          const completed = currentStep > step.id
          const current = currentStep === step.id

          return (
            <li
              key={step.id}
              className={`add-channel-stepper__item ${
                completed
                  ? 'add-channel-stepper__item--completed'
                  : current
                    ? 'add-channel-stepper__item--current'
                    : 'add-channel-stepper__item--upcoming'
              }`.trim()}
              aria-current={current ? 'step' : undefined}
            >
              <div className="add-channel-stepper__marker" aria-hidden>
                {completed ? '✓' : step.id}
              </div>
              <span className="add-channel-stepper__label add-channel-stepper__label--full">
                {step.label}
              </span>
              <span className="add-channel-stepper__label add-channel-stepper__label--short">
                {step.shortLabel}
              </span>
              {index < steps.length - 1 && (
                <span
                  className={`add-channel-stepper__connector ${
                    completed ? 'add-channel-stepper__connector--completed' : ''
                  }`.trim()}
                  aria-hidden
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
