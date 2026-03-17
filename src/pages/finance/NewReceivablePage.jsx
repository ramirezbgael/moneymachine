import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useTenantStore } from "../../store/tenantStore";

export default function NewReceivablePage() {
    const navigate = useNavigate();
    const tenantId = useTenantStore((s) => s.currentTenantId);
    const [customers, setCustomers] = useState([]);
    const [form, setForm] = useState({
      client_id: "",
      concept: "",
      amount: "",
      issue_date: new Date().toISOString().slice(0, 10),
      due_days: 30,
      due_date: "",
      newClient: {
        name: "",
        phone: "",
        email: "",
      },
    });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
      if (!tenantId) return;
      supabase
        .from("customers")
        .select("id, name, phone, email")
        .eq("tenant_id", tenantId)
        .then(({ data }) => setCustomers(data || []));
    }, [tenantId]);

    useEffect(() => {
      if (form.due_days !== "custom") {
        const d = new Date(form.issue_date);
        d.setDate(d.getDate() + Number(form.due_days));
        setForm((f) => ({ ...f, due_date: d.toISOString().slice(0, 10) }));
      }
    }, [form.issue_date, form.due_days]);

    const handleChange = (field, value) =>
      setForm((f) => ({ ...f, [field]: value }));

    const handleNewClientChange = (field, value) =>
      setForm((f) => ({
        ...f,
        newClient: { ...f.newClient, [field]: value },
      }));

    const handleSubmit = async (e) => {
      e.preventDefault();
      setCreating(true);
      setError("");
      let clientId = form.client_id;
      let clientName = "";

      try {
        if (clientId === "__new__") {
          const { data, error: err } = await supabase
            .from("customers")
            .insert([
              {
                name: form.newClient.name,
                phone: form.newClient.phone,
                email: form.newClient.email,
                tenant_id: tenantId,
              },
            ])
            .select("id")
            .single();
          if (err) throw err;
          clientId = data.id;
          clientName = form.newClient.name;
        }

        if (clientId && !clientName) {
          const existing = customers.find((c) => String(c.id) === String(clientId));
          clientName = existing?.name || "";
        }

        const { error: err2 } = await supabase.from("accounts_receivable").insert([
          {
            // client_id se omite por ahora porque la tabla customers.id es bigint y accounts_receivable.client_id es uuid
            client_name: clientName || null,
            concept: form.concept,
            amount: Number(form.amount),
            due_date: form.due_date,
            tenant_id: tenantId,
          },
        ]);
        if (err2) throw err2;

        setForm((f) => ({
          ...f,
          client_id: "",
          concept: "",
          amount: "",
          newClient: { name: "", phone: "", email: "" },
        }));
        alert("Deuda registrada correctamente");
      } catch (err) {
        setError(err.message || "Error al guardar");
      } finally {
        setCreating(false);
      }
    };

    return (
      <div className="min-h-full bg-[#050816] px-4 py-6 pb-24 text-zinc-100 sm:px-6 lg:px-8 overflow-x-hidden">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between rounded-[28px] border border-zinc-800 bg-zinc-950/85 px-4 py-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
            <button
              type="button"
              onClick={() => navigate("/finance/receivables")}
              className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
            >
              <span className="text-lg">←</span>
              <span>Volver a CxC</span>
            </button>
            <h1 className="text-lg font-semibold text-emerald-400">Nueva cuenta por cobrar</h1>
            <span className="text-xs text-zinc-500">Registrar deuda</span>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Formulario principal */}
            <form
              onSubmit={handleSubmit}
              className="w-full rounded-[28px] border border-zinc-800 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_45%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] p-5 md:p-6 flex flex-col gap-4 md:gap-4"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Cliente y deuda</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Registrar deuda</h2>
              </div>

              {/* Cliente + nuevo cliente (en desktop en dos columnas) */}
              <div className="grid grid-cols-1 md:grid-cols-2 md:gap-3 items-start min-w-0">
                <div className="min-w-0">
                  <label className="block text-xs text-zinc-400 mb-1 font-medium">
                    Cliente
                  </label>
                  <select
                    className="w-full bg-[#111827] border border-[#1f2937] rounded-xl px-3 py-2 text-zinc-100"
                    value={form.client_id}
                    onChange={(e) => handleChange("client_id", e.target.value)}
                    required
                  >
                    <option value="">Selecciona cliente</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value="__new__">+ Crear cliente nuevo</option>
                  </select>
                </div>

                {form.client_id === "__new__" && (
                  <div className="bg-[#101623] rounded-xl p-3 md:p-3 flex flex-col gap-2 border border-emerald-900/30 min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 md:gap-2">
                      <div className="min-w-0 md:col-span-2">
                        <input
                          className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3 py-1.5 text-zinc-100"
                          placeholder="Nombre"
                          value={form.newClient.name}
                          onChange={(e) => handleNewClientChange("name", e.target.value)}
                          required
                        />
                      </div>
                      <div className="min-w-0">
                        <input
                          className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3 py-1.5 text-zinc-100"
                          placeholder="Teléfono"
                          value={form.newClient.phone}
                          onChange={(e) => handleNewClientChange("phone", e.target.value)}
                        />
                      </div>
                      <div className="min-w-0">
                        <input
                          className="w-full bg-[#111827] border border-[#1f2937] rounded-lg px-3 py-1.5 text-zinc-100"
                          placeholder="Email"
                          value={form.newClient.email}
                          onChange={(e) => handleNewClientChange("email", e.target.value)}
                          type="email"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Concepto + Monto: en desktop en una fila */}
              <div className="grid grid-cols-1 md:grid-cols-2 md:gap-3">
                <div className="min-w-0">
                  <label className="block text-xs text-zinc-400 mb-1 font-medium">
                    Concepto
                  </label>
                  <input
                    className="w-full bg-[#111827] border border-[#1f2937] rounded-xl px-3 py-2 text-zinc-100"
                    placeholder="Ej. Suscripción mensual"
                    value={form.concept}
                    onChange={(e) => handleChange("concept", e.target.value)}
                    required
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs text-zinc-400 mb-1 font-medium">
                    Monto
                  </label>
                  <div className="flex items-center">
                    <span className="text-xl md:text-2xl text-emerald-400 font-bold mr-2">$</span>
                    <input
                      className="w-full bg-[#111827] border border-[#1f2937] rounded-xl px-3 py-2 text-zinc-100 text-xl md:text-2xl font-semibold"
                      placeholder="0.00"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => handleChange("amount", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Fecha y vencimiento */}
              <div className="flex gap-3 min-w-0">
                <div className="flex-1 min-w-0">
                  <label className="block text-xs text-zinc-400 mb-1 font-medium">
                    Fecha
                  </label>
                  <input
                    className="w-full bg-[#111827] border border-[#1f2937] rounded-xl px-3 py-2 text-zinc-100"
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => handleChange("issue_date", e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-zinc-400 mb-1 font-medium">
                    Vencimiento
                  </label>
                  <div className="flex gap-1">
                    {[30, 60, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`flex-1 rounded-lg px-2 py-1 text-xs border ${
                          form.due_days === d
                            ? "bg-emerald-500 text-black border-emerald-600"
                            : "border-[#1f2937] text-zinc-300"
                        }`}
                        onClick={() => handleChange("due_days", d)}
                      >
                        {d} días
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`flex-1 rounded-lg px-2 py-1 text-xs border ${
                        form.due_days === "custom"
                          ? "bg-emerald-500 text-black border-emerald-600"
                          : "border-[#1f2937] text-zinc-300"
                      }`}
                      onClick={() => handleChange("due_days", "custom")}
                    >
                      Pers.
                    </button>
                  </div>
                  {form.due_days === "custom" && (
                    <input
                      className="w-full mt-2 bg-[#111827] border border-[#1f2937] rounded-xl px-3 py-2 text-zinc-100"
                      type="date"
                      value={form.due_date}
                      onChange={(e) => handleChange("due_date", e.target.value)}
                      required
                    />
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="text-red-400 text-sm text-center">{error}</div>
              )}
              {/* Botón */}
              <button
                type="submit"
                disabled={creating}
                className="w-full mt-2 py-3 rounded-xl bg-emerald-500 text-black font-bold text-lg shadow-lg transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {creating ? "Guardando..." : "Registrar deuda"}
              </button>
            </form>

            {/* Lateral derecho: contexto */}
            <aside className="space-y-4">
              <article className="rounded-[28px] border border-zinc-800 bg-zinc-950/90 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Resumen rápido</p>
                <div className="mt-3 space-y-2 text-sm text-zinc-300">
                  <p>
                    Registra una nueva cuenta por cobrar ligada a un cliente. Después podrás ver el
                    detalle y registrar pagos desde el módulo de CxC.
                  </p>
                  <p className="text-xs text-zinc-500">
                    El monto, la fecha y el vencimiento se usarán para calcular el saldo pendiente y el
                    estatus de la deuda.
                  </p>
                </div>
              </article>
            </aside>
          </div>
        </div>
      </div>
    );
}
