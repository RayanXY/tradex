interface ConfirmDialogProps {
  open: boolean,
  title: string,
  description?: string,
  confirmLabel?: string,
  onConfirm: () => void,
  onCancel: () => void
}

const ConfirmDialog = ({ open, title, description, confirmLabel = 'Confirmar', onConfirm, onCancel }: ConfirmDialogProps) => {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
      onClick={onCancel}
    >
      <div
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <p className="text-[#f0f0f0] font-semibold text-base">{title}</p>
          {description && (
            <p className="text-sm text-[#888]">{description}</p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-[#888] hover:text-[#f0f0f0] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#e3350d] hover:bg-[#c42d0b] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
