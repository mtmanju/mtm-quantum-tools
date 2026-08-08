import { Upload } from 'lucide-react'
import { memo, type RefObject, type TextareaHTMLAttributes } from 'react'
import { type DropzoneInputProps, type DropzoneRootProps } from 'react-dropzone'
import './DropzoneTextarea.css'

interface DropzoneTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  getRootProps: <T extends DropzoneRootProps>(props?: T) => T
  getInputProps: <T extends DropzoneInputProps>(props?: T) => T
  isDragActive: boolean
  /**
   * Absorb react-dropzone and useFileUpload state so it doesn't land on the
   * <textarea>.
   *
   * This list is not decoration — anything react-dropzone returns that is not
   * named here gets spread onto a real DOM node, and React then warns for
   * every unknown camelCase prop. react-dropzone 20 added isDragUnknown,
   * isDragGlobal and isProcessing, which is exactly how that regressed: three
   * new booleans started reaching the textarea as attributes. If a future
   * upgrade adds more state, they belong here too.
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isDragAccept: _da, isDragReject: _dr, isFocused: _if, isFileDialogActive: _fd,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isDragUnknown: _du, isDragGlobal: _dg, isProcessing: _ip,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  acceptedFiles: _af, fileRejections: _fr, rootRef: _rr, inputRef: _ir,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  open: _o, handleUploadClick: _hu,
  // Absorbed so it never reaches the <textarea>; the overlay uses
  // dropzoneActiveText instead.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dropzoneText: _dt,
  dropzoneHint = 'Supports file upload or paste directly',
  dropzoneActiveText = 'Drop file here',
  value,
  ...textareaProps
}: DropzoneTextareaProps) => {
  /**
   * A placeholder is not a label.
   *
   * These textareas are the primary input of about twenty tools, and none of
   * them passed an aria-label — so the only accessible name each one had was
   * its `placeholder`. That is the one attribute guaranteed to disappear the
   * moment the field is non-empty: tab away and back after pasting, and the
   * field announces as an unnamed edit box. It is also only ever a *fallback*
   * name, which not every assistive technology uses.
   *
   * Falling back to the placeholder gives every one of them a name that
   * survives typing, in one place rather than twenty. A caller that wants a
   * better name can still pass `aria-label`: the spread comes after this, so
   * it wins.
   */
  const placeholderLabel =
    typeof textareaProps.placeholder === 'string' ? textareaProps.placeholder : undefined

  return (
    <div className="dropzone-textarea-wrapper" {...getRootProps()}>
      {/* react-dropzone renders this at 1×1 with tabIndex -1, so it is out of
          the tab order — but it is still `visibility: visible`, so it stays in
          the accessibility tree and announces as an unlabelled file control to
          anyone reading the page rather than tabbing through it. */}
      <input aria-label="Upload a file" {...getInputProps()} />
      <textarea
        aria-label={placeholderLabel}
        {...textareaProps}
        value={value}
        className={`dropzone-textarea ${textareaProps.className || ''}`}
      />
      {isDragActive && (
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

