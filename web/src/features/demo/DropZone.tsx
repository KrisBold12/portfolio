import { useId, useState } from 'react'
import styles from './DropZone.module.css'

type DropZoneProps = {
  onFile: (file: File) => void
  disabled?: boolean
  /**
   * Once a photo has been tried, the zone recedes to a modest control
   * rather than staying the largest object on screen — it does not
   * disappear, since a visitor will want a second try.
   */
  compact?: boolean
}

/**
 * The whole zone is one real `<label>` wrapping a real
 * `<input type="file" accept="image/*">`: clicking anywhere in the box
 * opens the file picker via native label-to-control behaviour, and the
 * input stays in the tab order (visually hidden with a clip, not
 * `display: none`), so keyboard users can Tab to it and press Space to
 * open the same dialog — no custom keydown handling needed. Drag-over
 * state changes the border colour only.
 */
function DropZone({ onFile, disabled = false, compact = false }: DropZoneProps) {
  const [dragging, setDragging] = useState(false)
  const inputId = useId()

  function pick(files: FileList | null) {
    const file = files?.[0]
    if (file) onFile(file)
  }

  return (
    <label
      htmlFor={inputId}
      className={styles.zone}
      data-dragging={dragging ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      data-compact={compact ? '' : undefined}
      onDragOver={(event) => {
        if (disabled) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (disabled) return
        pick(event.dataTransfer.files)
      }}
    >
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className={styles.input}
        disabled={disabled}
        onChange={(event) => {
          pick(event.target.files)
          // Reset so choosing the same file again still fires onChange —
          // needed to retry after an error without picking a different file.
          event.target.value = ''
        }}
      />
      <span className={styles.prompt}>
        {compact ? (
          <span className={styles.promptCompact}>Try another photo</span>
        ) : (
          <>
            <strong className={styles.promptMain}>Drop a photo here</strong>
            <span className={styles.promptSub}>or choose a file. JPEG or PNG, any size.</span>
          </>
        )}
      </span>
    </label>
  )
}

export default DropZone
