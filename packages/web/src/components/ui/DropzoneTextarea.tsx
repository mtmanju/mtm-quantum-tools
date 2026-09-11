import { Upload } from 'lucide-react'
import { memo, useCallback, useState, type RefObject } from 'react'
import { type DropzoneInputProps, type DropzoneRootProps } from 'react-dropzone'
import { CodeEditor } from './CodeEditor'
import './DropzoneTextarea.css'

/**
 * The primary input of about twenty tools: a drop target wrapped around an
 * editor.
 *
 * It used to wrap a `<textarea>`, and the name has been kept so the call sites
 * did not all have to change. What it wraps now is {@link CodeEditor}, which
 * renders only the visible lines — see that file for why.
 */
interface DropzoneTextareaProps {
  getRootProps: <T extends DropzoneRootProps>(props?: T) => T
  getInputProps: <T extends DropzoneInputProps>(props?: T) => T
  isDragActive: boolean

  value: string
  /**
   * Shaped like a change event so the twenty-odd `e => setX(e.target.value)`
   * call sites read the same as they always have, but honest about being the
   * only thing this component actually provides — there is no DOM event behind
   * it to preventDefault or to read a `currentTarget` from.
   */
  onChange?: (event: { target: { value: string } }) => void
  /** The real paste event: call `preventDefault()` to replace the insertion. */
  onPaste?: (event: ClipboardEvent) => void
  placeholder?: string
  spellCheck?: boolean
  className?: string
  'aria-label'?: string

  /**
   * Absorb react-dropzone and useFileUpload state so it does not reach the
   * editor. Callers spread the whole hook result in, and these are the keys
   * that come with it.
   */
  isDragAccept?: boolean
  isDragReject?: boolean
  isDragUnknown?: boolean
  isDragGlobal?: boolean
  isProcessing?: boolean
  isFocused?: boolean
  isFileDialogActive?: boolean
  acceptedFiles?: readonly File[]
  fileRejections?: readonly unknown[]
  rootRef?: RefObject<HTMLElement>
  inputRef?: RefObject<HTMLInputElement>
  open?: () => void
  handleUploadClick?: () => void
  dropzoneText?: string
  dropzoneHint?: string
  dropzoneActiveText?: string
}

export const DropzoneTextarea = memo(({
  getRootProps,
  getInputProps,
  isDragActive,
  value,
  onChange,
  onPaste,
  placeholder,
  spellCheck = false,
  className,
  'aria-label': ariaLabel,
  dropzoneHint = 'Supports file upload or paste directly',
  dropzoneActiveText = 'Drop file here',
}: DropzoneTextareaProps) => {
  /**
   * The overlay used to be suppressed by `:has(:focus)` and
   * `:has(:not(:placeholder-shown))`, neither of which an editor made of
   * ordinary elements can answer. Same rule, tracked explicitly.
   */
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const showOverlay = isDragActive && !isEditorFocused && !value

  const handleValueChange = useCallback(
    (next: string) => onChange?.({ target: { value: next } }),
    [onChange]
  )

  return (
    <div className="dropzone-textarea-wrapper" {...getRootProps()}>
      {/* react-dropzone renders this at 1×1 with tabIndex -1, so it is out of
          the tab order — but it is still `visibility: visible`, so it stays in
          the accessibility tree and announces as an unlabelled file control to
          anyone reading the page rather than tabbing through it. */}
      <input aria-label="Upload a file" {...getInputProps()} />
      <CodeEditor
        value={value}
        onValueChange={handleValueChange}
        onPaste={onPaste}
        onFocusChange={setIsEditorFocused}
        placeholder={placeholder}
        spellCheck={spellCheck}
        /**
         * A placeholder is not a label: it is the one attribute guaranteed to
         * disappear the moment the field is non-empty, so a field named only
         * by it announces as an unnamed edit box as soon as you type. Falling
         * back to it still beats nothing, and a caller that passes aria-label
         * wins.
         */
        ariaLabel={ariaLabel ?? placeholder}
        className={className}
      />
      {showOverlay && (
        <div className="dropzone-overlay active">
          <div className="dropzone-icon">
            <Upload size={32} strokeWidth={2} />
          </div>
          <p className="dropzone-text">{dropzoneActiveText}</p>
          <p className="dropzone-hint">{dropzoneHint}</p>
        </div>
      )}
    </div>
  )
})

DropzoneTextarea.displayName = 'DropzoneTextarea'
