import React, { useEffect, useMemo, useState } from 'react'
import { useSettingsStore } from '../../store/settingsStore'
import { SettingsMenu, SettingsMenuItem } from './SettingsMenu'
import { SettingsSection } from './SettingsSection'
import { AccountSettings } from '../../components/Settings/AccountSettings'
import { AppearanceSettings } from '../../components/Settings/AppearanceSettings'
import { LanguageSettings } from '../../components/Settings/LanguageSettings'
import { CurrencySettings } from '../../components/Settings/CurrencySettings'
import { TaxSettings } from '../../components/Settings/TaxSettings'
import { PrinterSettings } from '../../components/Settings/PrinterSettings'
import { FacturacionMXSettings } from '../../components/Settings/FacturacionMXSettings'
import { SystemInfoSettings } from '../../components/Settings/SystemInfoSettings'
import { FiUser, FiMonitor, FiGlobe, FiDollarSign, FiPercent, FiPrinter, FiFileText, FiCpu } from 'react-icons/fi'

const STORAGE_KEY = 'moneymachine-settings-section'

type SectionId =
  | 'account'
  | 'appearance'
  | 'language'
  | 'currency'
  | 'taxes'
  | 'printer'
  | 'facturacion'
  | 'system'

export function ConfiguracionPage() {
  const t = useSettingsStore((s) => s.t)
  const [active, setActive] = useState<SectionId>('account')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SectionId | null
      if (saved) setActive(saved)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, active)
    } catch {
      // ignore
    }
  }, [active])

  const items: SettingsMenuItem[] = useMemo(
    () => [
      {
        id: 'account',
        title: 'Cuenta',
        description: 'Sesión y datos del usuario',
        icon: <FiUser />,
      },
      {
        id: 'appearance',
        title: 'Apariencia',
        description: 'Tema oscuro / claro',
        icon: <FiMonitor />,
      },
      {
        id: 'language',
        title: 'Idioma',
        description: 'Lenguaje de la interfaz',
        icon: <FiGlobe />,
      },
      {
        id: 'currency',
        title: 'Moneda',
        description: 'Moneda principal del negocio',
        icon: <FiDollarSign />,
      },
      {
        id: 'taxes',
        title: 'Impuestos',
        description: 'IVA / porcentaje de impuestos',
        icon: <FiPercent />,
      },
      {
        id: 'printer',
        title: 'Impresora',
        description: 'Ticket y auto-impresión',
        icon: <FiPrinter />,
      },
      {
        id: 'facturacion',
        title: 'Facturación MX',
        description: 'Datos fiscales para CFDI',
        icon: <FiFileText />,
      },
      {
        id: 'system',
        title: 'Sistema',
        description: 'Información del sistema',
        icon: <FiCpu />,
      },
    ],
    []
  )

  const currentItem = items.find((i) => i.id === active) ?? items[0]

  return (
    <div className="min-h-full bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">{t('settings.title')}</h1>
            <p className="text-sm text-[var(--muted)]">{t('settings.subtitle')}</p>
          </div>
          <div className="md:hidden">
            <label className="block text-xs text-[var(--muted)] mb-1">Sección</label>
            <select
              value={active}
              onChange={(e) => setActive(e.target.value as SectionId)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.title}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-[260px,minmax(0,1fr)] gap-5 items-start">
          <aside>
            <SettingsMenu items={items} activeId={active} onSelect={(id) => setActive(id as SectionId)} />
          </aside>
          <section className="transition-all duration-200">
            {active === 'account' && (
              <SettingsSection title="Cuenta" description="Gestión de tu sesión y datos básicos.">
                <AccountSettings />
              </SettingsSection>
            )}
            {active === 'appearance' && (
              <SettingsSection title="Apariencia" description="Tema visual de la aplicación.">
                <AppearanceSettings />
              </SettingsSection>
            )}
            {active === 'language' && (
              <SettingsSection title="Idioma" description="Idioma de la interfaz de Moneymachine POS.">
                <LanguageSettings />
              </SettingsSection>
            )}
            {active === 'currency' && (
              <SettingsSection title="Moneda" description="Selecciona la moneda principal de tu negocio.">
                <CurrencySettings />
              </SettingsSection>
            )}
            {active === 'taxes' && (
              <SettingsSection title="Impuestos" description="Configura el porcentaje de impuestos que se aplicará por defecto.">
                <TaxSettings />
              </SettingsSection>
            )}
            {active === 'printer' && (
              <SettingsSection title="Impresora" description="Configura la impresora de tickets y el tamaño del papel.">
                <PrinterSettings />
              </SettingsSection>
            )}
            {active === 'facturacion' && (
              <SettingsSection title="Facturación MX" description="Datos fiscales para emitir CFDI en México.">
                <FacturacionMXSettings />
              </SettingsSection>
            )}
            {active === 'system' && (
              <SettingsSection title="Sistema" description="Información general de la aplicación y entorno.">
                <SystemInfoSettings />
              </SettingsSection>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

