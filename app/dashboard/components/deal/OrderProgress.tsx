'use client'

import { getOrderProgressSteps, isCancelledOrderView, type OrderFlowDeal } from '@/lib/order-flow'

export default function OrderProgress({ deal }: { deal: OrderFlowDeal }) {
  if (isCancelledOrderView(deal.status)) {
    const cancelled = deal.status === 'rejected' ? 'Отклонён' : 'Отменён'
    return (
      <div className="ui-surface ui-surface--pad-sm mb-4">
        <p className="text-red-400 font-semibold m-0">{cancelled}</p>
        <p className="text-white/50 text-sm mt-1 mb-0">Этот заказ закрыт и больше не выполняется.</p>
      </div>
    )
  }

  const { steps } = getOrderProgressSteps(deal)

  return (
    <div className="flex items-start w-full my-4 overflow-x-auto">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center flex-1 min-w-[4.5rem]">
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step.done ? 'progress-step-done' : 'bg-white/10 text-white/30'
              }`}
            >
              {step.done ? '✓' : i + 1}
            </div>
            <span
              className={`text-[10px] sm:text-xs mt-1 text-center leading-tight ${
                step.current ? 'text-white' : step.done ? 'progress-step-label-done' : 'text-white/30'
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 flex-1 mx-1 mt-3 ${step.done ? 'progress-line-done' : 'bg-white/10'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
