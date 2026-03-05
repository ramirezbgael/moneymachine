import React from 'react'

interface VoiceToggleProps {
  enabled: boolean
  available: boolean
  onToggle: (value: boolean) => void
}

export function VoiceToggle({ enabled, available, onToggle }: VoiceToggleProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => available && onToggle(!enabled)}
        className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs font-medium transition-all ${
          enabled
            ? 'border-[rgba(0,255,136,0.6)] bg-[rgba(0,255,136,0.15)] text-[#00ff88] shadow-[0_0_14px_rgba(0,255,136,0.35)]'
            : 'border-white/15 bg-white/5 text-white/70 hover:border-[rgba(0,255,136,0.45)] hover:text-[#00ff88]'
        } ${!available ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/60 border border-white/15">
          <span className={`h-2 w-1 rounded-full ${enabled ? 'bg-[#00ff88]' : 'bg-white/40'}`} />
        </span>
        <span>Modo voz (experimental)</span>
      </button>
      {!available && (
        <span className="text-[11px] text-white/40">
          Voz no disponible en este sistema
        </span>
      )}
    </div>
  )
}

