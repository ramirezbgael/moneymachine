import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useFinanceCustomersStore } from '../../store/financeCustomersStore'
import { useReportsStore } from '../../store/reportsStore'

const today = () => new Date().toISOString().slice(0, 10)
const NEW_CLIENT_VALUE = '__new_client__'

const NewReceivablePage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { customers, fetchCustomers, addCustomer } = useFinanceCustomersStore()
  const { createReceivable } = useReportsStore()
  const preselectedClientId = location.state?.preselectedClientId || ''

  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    client_id: preselectedClientId,
    concept: '',
    amount: '',
    issue_date: today(),
    due_date: today(),
    notes: ''
  })
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  })

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  useEffect(() => {
    if (preselectedClientId) {
      setForm((prev) => ({ ...prev, client_id: preselectedClientId }))
    }
  }, [preselectedClientId])

  const selectedClient = useMemo(() => {
    return customers.find((c) => String(c.id) === String(form.client_id)) || null
  }, [customers, form.client_id])

  const isCreatingNewClient = form.client_id === NEW_CLIENT_VALUE

  const handleSubmit = async (event) => {
    event.preventDefault()

    setSaving(true)
    try {
      let client = selectedClient

      if (isCreatingNewClient) {
        if (!newClientForm.name.trim()) {
          window.alert('El nombre del cliente es obligatorio.')
          return
        }

        client = await addCustomer({
          name: newClientForm.name,
          phone: newClientForm.phone,
          email: newClientForm.email,
          notes: newClientForm.notes
        })
      }

      if (!client) {
        window.alert('Selecciona o crea un cliente válido.')
        return
      }

      await createReceivable({
        client_id: client.id,
        client_name: client.name,
        concept: form.concept,
        amount: Number(form.amount),
        issue_date: form.issue_date,
        due_date: form.due_date,
        notes: form.notes
      })
      navigate('/finance/receivables')
    } catch (error) {
      window.alert(error?.message || 'No se pudo guardar la deuda')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-full bg-zinc-950 p-4 text-zinc-100 md:p-7">
      <button type="button" className="mb-4 text-sm text-emerald-400" onClick={() => navigate('/finance/receivables')}>
        ← Volver a cuentas por cobrar
      </button>

      <section className="mx-auto max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-900/90 p-5 md:p-7">
        <h1 className="text-2xl font-semibold text-white">Nueva deuda</h1>
        <p className="mt-1 text-sm text-zinc-400">Registra una cuenta por cobrar vinculada a un cliente existente.</p>

        <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Cliente</span>
            <select
              required
              value={form.client_id}
              onChange={(e) => setForm((prev) => ({ ...prev, client_id: e.target.value }))}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            >
              <option value="">Selecciona un cliente</option>
              <option value={NEW_CLIENT_VALUE}>+ Crear cliente nuevo</option>
              {customers.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>{cliente.name}</option>
              ))}
            </select>
          </label>

          {isCreatingNewClient && (
            <>
              <div className="md:col-span-2 rounded-2xl border border-emerald-700/40 bg-emerald-950/10 p-3">
                <p className="text-xs text-emerald-300">Se creará un cliente nuevo y se vinculará automáticamente a esta deuda.</p>
              </div>

              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Nombre del cliente</span>
                <input
                  required
                  type="text"
                  value={newClientForm.name}
                  onChange={(e) => setNewClientForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="Ej. Juan Pérez"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Teléfono</span>
                <input
                  type="text"
                  value={newClientForm.phone}
                  onChange={(e) => setNewClientForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="7221234567"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Email</span>
                <input
                  type="email"
                  value={newClientForm.email}
                  onChange={(e) => setNewClientForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="cliente@correo.com"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Notas cliente</span>
                <input
                  type="text"
                  value={newClientForm.notes}
                  onChange={(e) => setNewClientForm((prev) => ({ ...prev, notes: e.target.value }))}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
                  placeholder="Notas opcionales"
                />
              </label>
            </>
          )}

          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Concepto</span>
            <input
              required
              type="text"
              value={form.concept}
              onChange={(e) => setForm((prev) => ({ ...prev, concept: e.target.value }))}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Ej. Pedido mayoreo facturado"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Monto</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Fecha</span>
            <input
              type="date"
              value={form.issue_date}
              onChange={(e) => setForm((prev) => ({ ...prev, issue_date: e.target.value }))}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Fecha de vencimiento</span>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            />
          </label>

          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Notas</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Notas opcionales"
            />
          </label>

          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Guardar deuda'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/finance/receivables')}
              className="rounded-xl border border-zinc-700 px-5 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default NewReceivablePage
