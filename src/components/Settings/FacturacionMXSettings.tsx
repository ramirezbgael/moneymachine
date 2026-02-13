import React, { useState } from 'react'
import { LiquidButton } from '../Inventory/LiquidButton'

export function FacturacionMXSettings() {
  const [regimen, setRegimen] = useState('')
  const [rfc, setRfc] = useState('')
  const [razon, setRazon] = useState('')
  const [cp, setCp] = useState('')
  const [serie, setSerie] = useState('')
  const [folio, setFolio] = useState('')
  const [metodo, setMetodo] = useState<'PUE' | 'PPD'>('PUE')
  const [uso, setUso] = useState('')
  const [activar, setActivar] = useState(false)
  const [preguntarCliente, setPreguntarCliente] = useState(true)

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // Mock save
    setSaved(true)
    setTimeout(() => setSaved(false), 900)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Régimen fiscal</label>
          <select
            value={regimen}
            onChange={(e) => setRegimen(e.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="">Selecciona…</option>
            <option value="601">601 - General de Ley Personas Morales</option>
            <option value="605">605 - Sueldos y Salarios</option>
            <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">RFC emisor</label>
          <input
            type="text"
            value={rfc}
            onChange={(e) => setRfc(e.target.value.toUpperCase())}
            placeholder="XAXX010101000"
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Nombre / Razón social</label>
          <input
            type="text"
            value={razon}
            onChange={(e) => setRazon(e.target.value)}
            placeholder="Tu empresa S.A. de C.V."
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Código postal</label>
          <input
            type="text"
            value={cp}
            onChange={(e) => setCp(e.target.value)}
            placeholder="00000"
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Serie de factura</label>
          <input
            type="text"
            value={serie}
            onChange={(e) => setSerie(e.target.value.toUpperCase())}
            placeholder="A, B, POS…"
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Folio inicial</label>
          <input
            type="number"
            min={1}
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            placeholder="1"
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Método de pago default</label>
          <select
            value={metodo}
            onChange={(e) => setMetodo(e.target.value as 'PUE' | 'PPD')}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="PUE">PUE - Pago en una sola exhibición</option>
            <option value="PPD">PPD - Pago en parcialidades o diferido</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[var(--muted)] mb-1">Uso CFDI default</label>
          <input
            type="text"
            value={uso}
            onChange={(e) => setUso(e.target.value.toUpperCase())}
            placeholder="G03, P01…"
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] placeholder-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <label className="flex items-center justify-between cursor-pointer rounded-2xl px-3 py-2 bg-[var(--panel-2)] border border-[var(--border)]">
          <div>
            <div className="text-sm text-[var(--text)]">Activar facturación</div>
            <div className="text-[11px] text-[var(--muted)]">
              Habilita la emisión de CFDI directamente desde el POS.
            </div>
          </div>
          <input
            type="checkbox"
            checked={activar}
            onChange={(e) => setActivar(e.target.checked)}
            className="h-4 w-8 rounded-full border-[var(--border)] bg-[var(--panel-2)] text-[var(--accent)] focus:ring-[var(--accent)]/40"
          />
        </label>
        <label className="flex items-center justify-between cursor-pointer rounded-2xl px-3 py-2 bg-[var(--panel-2)] border border-[var(--border)]">
          <div>
            <div className="text-sm text-[var(--text)]">Preguntar datos del cliente al cobrar</div>
            <div className="text-[11px] text-[var(--muted)]">
              Si está activo, el sistema pedirá RFC/uso CFDI al momento del cobro.
            </div>
          </div>
          <input
            type="checkbox"
            checked={preguntarCliente}
            onChange={(e) => setPreguntarCliente(e.target.checked)}
            className="h-4 w-8 rounded-full border-[var(--border)] bg-[var(--panel-2)] text-[var(--accent)] focus:ring-[var(--accent)]/40"
          />
        </label>
      </div>

      <div className="pt-3 flex justify-end">
        <LiquidButton size="sm" onClick={handleSave}>
          {saved ? 'Guardado' : 'Guardar configuración'}
        </LiquidButton>
      </div>
    </div>
  )
}

