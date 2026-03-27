import React, { useCallback, useEffect, useState } from 'react'
import {
  FaArrowRight,
  FaBars,
  FaCashRegister,
  FaCircleCheck,
  FaMagnifyingGlass,
  FaXmark
} from 'react-icons/fa6'

const STEPS = [
  {
    title: 'Bienvenido',
    body: 'Tu punto de venta está listo. Desde aquí registrarás ventas, cobros y el día a día del negocio.',
    icon: FaCashRegister
  },
  {
    title: 'Busca y agrega',
    body: 'En Venta actual usa el buscador: nombre o código de barras. Toca un producto o agrégalo al carrito.',
    icon: FaMagnifyingGlass
  },
  {
    title: 'Cobrar',
    body: 'Cuando termines, pulsa F2 o el botón verde Cobrar en el carrito para ir al checkout y registrar el pago.',
    icon: FaCashRegister
  },
  {
    title: 'Menú y más',
    body: 'Inventario, clientes, finanzas y caja están en el menú lateral en escritorio, o en la barra inferior en el móvil.',
    icon: FaBars
  },
  {
    title: '¡Listo!',
    body: 'Ya puedes empezar a vender. Siempre puedes volver a Configuración para ajustar tema, impresora y más.',
    icon: FaCircleCheck
  }
]

/**
 * Mini tutorial modal — estética alineada al POS (fondo #0a0a0a, acento #52c48a).
 */
export function PosOnboardingTutorial({ open, onDismiss }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (open) setStep(0)
  }, [open])

  const goNext = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1)
    } else {
      onDismiss()
    }
  }, [step, onDismiss])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onDismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onDismiss])

  if (!open) return null

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[rgb(82_196_138/0.18)] bg-[#0f1715] shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-inset ring-[rgb(82_196_138/0.08)]">
        <span className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-[#6ee7a8] to-[#52c48a]" aria-hidden />

        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-lg p-2 text-[#7d948a] transition hover:bg-[rgb(82_196_138/0.1)] hover:text-[#e8ede9]"
          aria-label="Cerrar"
        >
          <FaXmark className="text-lg" />
        </button>

        <div className="px-6 pb-6 pt-8 pl-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(82_196_138/0.12)] text-[#6ee7a8] ring-1 ring-[rgb(82_196_138/0.2)]">
            <Icon className="text-2xl" aria-hidden />
          </div>

          <h2 id="onboarding-title" className="text-xl font-semibold tracking-tight text-[#e8ede9]">
            {current.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#7d948a]">{current.body}</p>

          <div className="mt-6 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-[#52c48a]' : 'w-1.5 bg-[rgb(82_196_138/0.25)]'
                }`}
              />
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={onDismiss}
              className="text-sm font-medium text-[#7d948a] transition hover:text-[#c4d4cc]"
            >
              Omitir
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#5fd4a0] to-[#52c48a] px-5 py-2.5 text-sm font-bold text-[#0a1f16] shadow-[0_0_24px_rgba(82,196,138,0.35)] transition hover:brightness-105"
            >
              {isLast ? 'Empezar' : 'Siguiente'}
              {!isLast && <FaArrowRight className="text-xs opacity-90" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
