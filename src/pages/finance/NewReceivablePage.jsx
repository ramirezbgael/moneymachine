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
        .eq("business_id", tenantId)
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
                business_id: tenantId,
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
            business_id: tenantId,
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

    const fieldClass =
      "w-full rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] px-3 py-2 text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/25";

    return (
      <div className="mm-page mm-page--flush overflow-x-hidden">
        <div className="mm-shell mm-shell--md mm-stack">
          <div className="mm-topbar">
            <button type="button" onClick={() => navigate("/finance/receivables")} className="mm-back">
              <span className="text-lg" aria-hidden>←</span>
              Volver a CxC
            </button>
            <h1 className="mm-topbar-title">Nueva cuenta por cobrar</h1>
            <span className="text-xs text-[var(--muted)]">Registrar deuda</span>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <form
              onSubmit={handleSubmit}
              className="mm-card mm-card--pad-lg w-full flex flex-col gap-4 md:gap-4"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Cliente y deuda</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">Registrar deuda</h2>
              </div>

              {/* Cliente + nuevo cliente (en desktop en dos columnas) */}
              <div className="grid grid-cols-1 md:grid-cols-2 md:gap-3 items-start min-w-0">
                <div className="min-w-0">
                  <label className="block text-xs text-[var(--muted)] mb-1 font-medium">
                    Cliente
                  </label>
                  <select
                    className={fieldClass}
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
                  <div className="bg-[var(--panel-2)] rounded-xl p-3 md:p-3 flex flex-col gap-2 border border-[color-mix(in_srgb,var(--accent)_35%,var(--border))] min-w-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 md:gap-2">
                      <div className="min-w-0 md:col-span-2">
                        <input
                          className={`${fieldClass} rounded-lg py-1.5`}
                          placeholder="Nombre"
                          value={form.newClient.name}
                          onChange={(e) => handleNewClientChange("name", e.target.value)}
                          required
                        />
                      </div>
                      <div className="min-w-0">
                        <input
                          className={`${fieldClass} rounded-lg py-1.5`}
                          placeholder="Teléfono"
                          value={form.newClient.phone}
                          onChange={(e) => handleNewClientChange("phone", e.target.value)}
                        />
                      </div>
                      <div className="min-w-0">
                        <input
                          className={`${fieldClass} rounded-lg py-1.5`}
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
                  <label className="block text-xs text-[var(--muted)] mb-1 font-medium">
                    Concepto
                  </label>
                  <input
                    className={fieldClass}
                    placeholder="Ej. Suscripción mensual"
                    value={form.concept}
                    onChange={(e) => handleChange("concept", e.target.value)}
                    required
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-xs text-[var(--muted)] mb-1 font-medium">
                    Monto
                  </label>
                  <div className="flex items-center">
                    <span className="text-xl md:text-2xl text-[var(--accent)] font-bold mr-2">$</span>
                    <input
                      className={`${fieldClass} text-xl md:text-2xl font-semibold`}
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
                  <label className="block text-xs text-[var(--muted)] mb-1 font-medium">
                    Fecha
                  </label>
                  <input
                    className={fieldClass}
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => handleChange("issue_date", e.target.value)}
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[var(--muted)] mb-1 font-medium">
                    Vencimiento
                  </label>
                  <div className="flex gap-1">
                    {[30, 60, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`flex-1 rounded-lg px-2 py-1 text-xs border transition-colors ${
                          form.due_days === d
                            ? "bg-[var(--accent)] text-[#02110a] border-[var(--accent)] font-semibold"
                            : "border-[var(--border)] text-[var(--text)] bg-[var(--panel-2)] hover:border-[var(--accent)]/40"
                        }`}
                        onClick={() => handleChange("due_days", d)}
                      >
                        {d} días
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`flex-1 rounded-lg px-2 py-1 text-xs border transition-colors ${
                        form.due_days === "custom"
                          ? "bg-[var(--accent)] text-[#02110a] border-[var(--accent)] font-semibold"
                          : "border-[var(--border)] text-[var(--text)] bg-[var(--panel-2)] hover:border-[var(--accent)]/40"
                      }`}
                      onClick={() => handleChange("due_days", "custom")}
                    >
                      Pers.
                    </button>
                  </div>
                  {form.due_days === "custom" && (
                    <input
                      className={`${fieldClass} mt-2`}
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
                <div className="text-[var(--danger)] text-sm text-center">{error}</div>
              )}
              <button
                type="submit"
                disabled={creating}
                className="w-full mt-2 py-3 rounded-xl bg-[var(--accent)] text-[#02110a] font-bold text-lg shadow-lg transition hover:opacity-90 disabled:opacity-60"
              >
                {creating ? "Guardando..." : "Registrar deuda"}
              </button>
            </form>

            <aside className="space-y-4">
              <article className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[var(--shadow-sm)]">
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--muted)]">Resumen rápido</p>
                <div className="mt-3 space-y-2 text-sm text-[var(--text)]">
                  <p className="text-[var(--muted)]">
                    Registra una nueva cuenta por cobrar ligada a un cliente. Después podrás ver el
                    detalle y registrar pagos desde el módulo de CxC.
                  </p>
                  <p className="text-xs text-[var(--muted)] opacity-90">
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
