'use client'

export type AddChannelFlowStep = 1 | 2 | 3 | 4

const STEPS: { id: AddChannelFlowStep; label: string; shortLabel: string }[] = [
  { id: 1, label: 'Выберите социальную сеть', shortLabel: 'Соцсеть' },
  { id: 2, label: 'Добавьте канал', shortLabel: 'Канал' },
  { id: 3, label: 'Верификация канала', shortLabel: 'Верификация' },
  { id: 4, label: 'Канал добавлен', shortLabel: 'Готово' },
]

type AddChannelProgressStepperProps = {
  currentStep: AddChannelFlowStep
  className?: string
}

export default function AddChannelProgressStepper({
  currentStep,
  className = '',
}: AddChannelProgressStepperProps) {
  return (
    <nav
      className={`add-channel-stepper ${className}`.trim()}
      aria-label="Прогресс добавления канала"
    >
      <ol className="add-channel-stepper__list">
        {STEPS.map((step, index) => {
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
              {index < STEPS.length - 1 && (
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
