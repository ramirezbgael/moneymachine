import React from 'react'
import { useAuthStore } from '../../store/authStore'
import { useSettingsStore } from '../../store/settingsStore'
import { LiquidButton } from '../Inventory/LiquidButton'

export function AccountSettings() {
  const { user, signOut } = useAuthStore()
  const t = useSettingsStore((s) => s.t)

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide mb-1">
          {t('settings.email')}
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--panel-2)] px-4 py-3 text-sm text-[var(--text)]">
          {user?.email || 'Not logged in'}
        </div>
      </div>
      <LiquidButton variant="danger" onClick={handleSignOut}>
        {t('settings.signOut')}
      </LiquidButton>
    </div>
  )
}

