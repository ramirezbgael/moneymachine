/**
 * PublicCheckPage — public membership card, no auth required.
 * Accessible at /check/:id
 *
 * Reads from Supabase using the anon key.
 * IMPORTANT: the `subscription_customers` RLS policy must allow
 * unauthenticated (anon) SELECT by id. Add this policy if missing:
 *
 *   CREATE POLICY "public_read_by_id" ON subscription_customers
 *   FOR SELECT TO anon
 *   USING (true);
 *
 * Or scope it more tightly:
 *   USING (id = (SELECT id::uuid FROM subscription_customers WHERE id = id LIMIT 1))
 */
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'

const calculateDaysLeft = (endDate) => {
  if (!endDate) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(endDate)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const formatDate = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PublicCheckPage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) { setError('ID inválido.'); setLoading(false); return }

    const fetchCustomer = async () => {
      try {
        if (isSupabaseConfigured() && supabase) {
          const { data, error: dbErr } = await supabase
            .from('subscription_customers')
            .select('id, name, phone, monthly_fee, start_date, end_date, status, notes')
            .eq('id', id)
            .maybeSingle()

          if (dbErr) throw dbErr

          if (!data) {
            setError('Suscriptor no encontrado.')
          } else {
            setCustomer({
              id: data.id,
              name: data.name,
              monthlyFee: Number(data.monthly_fee || 0),
              startDate: data.start_date,
              endDate: data.end_date,
              status: data.status || 'active',
            })
          }
        } else {
          setError('Servicio no disponible en este momento.')
        }
      } catch (err) {
        console.error('PublicCheckPage fetch error:', err)
        setError('No se pudo cargar la información del suscriptor.')
      } finally {
        setLoading(false)
      }
    }

    fetchCustomer()
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center">
        <span className="text-5xl">❌</span>
        <p className="text-lg font-semibold text-white">{error || 'Suscriptor no encontrado.'}</p>
        <p className="text-sm text-zinc-500">Verifica que el código QR sea correcto o contacta al negocio.</p>
      </div>
    )
  }

  const daysLeft = calculateDaysLeft(customer.endDate)
  const isCancelled = customer.status === 'cancelled'
  const isExpired = !isCancelled && daysLeft < 0
  const isDueSoon = !isCancelled && !isExpired && daysLeft <= 7

  const statusColor = isCancelled
    ? 'bg-zinc-800 text-zinc-400'
    : isExpired
    ? 'bg-red-900/60 text-red-300'
    : isDueSoon
    ? 'bg-yellow-900/60 text-yellow-300'
    : 'bg-emerald-900/60 text-emerald-300'

  const statusLabel = isCancelled
    ? 'Cancelado'
    : isExpired
    ? 'Vencida'
    : isDueSoon
    ? `Vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`
    : `Activa · ${daysLeft} día${daysLeft === 1 ? '' : 's'}`

  const statusIcon = isCancelled ? '⊘' : isExpired ? '✕' : '✓'

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 pt-8 pb-14 sm:px-8 sm:pt-12 sm:pb-20">
      <div className="w-full max-w-sm md:max-w-md">
        {/* Card */}
        <div className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-900 shadow-2xl">
          {/* Header strip */}
          <div className={`px-6 py-4 ${isCancelled ? 'bg-zinc-800' : isExpired ? 'bg-red-950' : 'bg-emerald-950'}`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">MoneyMachine</p>
            <p className="mt-0.5 text-xs text-zinc-500">Tarjeta de membresía</p>
          </div>

          {/* Body */}
          <div className="px-6 pb-6 pt-5">
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${statusColor}`}>
              <span>{statusIcon}</span>
              {statusLabel}
            </span>

            {/* Name */}
            <h1 className="mt-4 text-2xl font-bold leading-tight text-white">{customer.name}</h1>

            {/* Details */}
            <dl className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-zinc-500">Cuota mensual</dt>
                <dd className="text-sm font-semibold text-white">
                  ${customer.monthlyFee.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-zinc-500">Inicio</dt>
                <dd className="text-sm text-zinc-300">{formatDate(customer.startDate)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-zinc-500">Vencimiento</dt>
                <dd className={`text-sm font-medium ${isExpired ? 'text-red-400' : isDueSoon ? 'text-yellow-400' : 'text-zinc-300'}`}>
                  {formatDate(customer.endDate)}
                </dd>
              </div>
            </dl>

            {/* Divider */}
            <div className="my-5 border-t border-zinc-800" />

            {/* ID */}
            <p className="break-all text-center font-mono text-[10px] text-zinc-600">{customer.id}</p>

                    {/* QR Code */}
                    <div className="mt-5 flex flex-col items-center gap-3">
                      <div className="rounded-[16px] bg-white p-3 shadow-lg">
                        <QRCodeCanvas
                          value={`${window.location.origin}/check/${customer.id}`}
                          size={180}
                          includeMargin={false}
                          bgColor="#ffffff"
                          fgColor="#000000"
                          level="H"
                        />
                      </div>
                      <p className="text-center text-xs text-zinc-600">Muestra este código en el negocio</p>
                    </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600">
          Escanea el QR para verificar tu suscripción · MoneyMachine POS
        </p>
      </div>
    </div>
  )
}
