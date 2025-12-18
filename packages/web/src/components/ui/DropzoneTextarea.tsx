import { Upload } from 'lucide-react'
import { memo, type TextareaHTMLAttributes } from 'react'
import { type DropzoneInputProps, type DropzoneRootProps } from 'react-dropzone'
import './DropzoneTextarea.css'

interface DropzoneTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  getRootProps: <T extends DropzoneRootProps>(props?: T) => T
  getInputProps: <T extends DropzoneInputProps>(props?: T) => T
  isDragActive: boolean
  dropzoneText?: string
  dropzoneHint?: string
  dropzoneActiveText?: string
}

export const DropzoneTextarea = memo(({
  getRootProps,
  getInputProps,
  isDragActive,
  dropzoneText = 'Drag & drop file or paste content',
  dropzoneHint = 'Supports file upload or paste directly',
  dropzoneActiveText = 'Drop file here',
  value,
  ...textareaProps
}: DropzoneTextareaProps) => {
  return (
    <div className="dropzone-textarea-wrapper" {...getRootProps()}>
      <input {...getInputProps()} />
      <textarea
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

