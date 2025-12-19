import { Check, Copy, X, Mail, CheckCircle, XCircle } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { EditorPanel } from '../components/ui/EditorPanel'
import { useCopy } from '../hooks/useCopy'
import { validateEmail } from '../utils/email'
import './EmailValidator.css'

const EmailValidator = () => {
  const [email, setEmail] = useState('')
  const [strictMode, setStrictMode] = useState(false)
  const [error, setError] = useState('')

  const copyHook = useCopy()

  const validationResult = useMemo(() => {
    if (!email.trim()) return null
    return validateEmail(email, strictMode)
  }, [email, strictMode])

  const handleClear = useCallback(() => {
    setEmail('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: copyHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyHook.copied ? 'Copied!' : 'Copy',
      onClick: () => copyHook.copy(email, (err) => setError(err)),
      disabled: !email.trim(),
      title: 'Copy email',
      showDividerBefore: true
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !email.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <div className="email-validator-container">
        <div className="email-validator-input-section">
          <div className="email-validator-controls">
            <div className="email-input-wrapper">
              <Mail size={20} className="email-input-icon" />
              <input
                type="text"
                className="email-input"
                placeholder="Enter email address..."
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError('')
                }}
              />
            </div>
            <label className="email-strict-toggle">
              <input
                type="checkbox"
                checked={strictMode}
                onChange={(e) => setStrictMode(e.target.checked)}
              />
              <span>Strict validation</span>
            </label>
          </div>
        </div>

        {email.trim() && validationResult && (
          <EditorPanel title="Validation Result">
            <div className="email-validation-result">
              <div className={`email-validation-status ${validationResult.isValid ? 'valid' : 'invalid'}`}>
                {validationResult.isValid ? (
                  <>
                    <CheckCircle size={24} />
                    <span>Valid Email</span>
                  </>
                ) : (
                  <>
                    <XCircle size={24} />
                    <span>Invalid Email</span>
                  </>
                )}
              </div>

              {validationResult.error && (
                <div className="email-validation-error">
                  <p>{validationResult.error}</p>
                </div>
              )}

              {validationResult.details && (
                <div className="email-validation-details">
                  <div className="email-detail-item">
                    <span className="email-detail-label">Local Part:</span>
                    <span className="email-detail-value">{validationResult.details.localPart || 'N/A'}</span>
                  </div>
                  <div className="email-detail-item">
                    <span className="email-detail-label">Domain:</span>
                    <span className="email-detail-value">{validationResult.details.domain || 'N/A'}</span>
                  </div>
                  <div className="email-detail-item">
                    <span className="email-detail-label">Has @:</span>
                    <span className="email-detail-value">{validationResult.details.hasAt ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="email-detail-item">
                    <span className="email-detail-label">Has Domain:</span>
                    <span className="email-detail-value">{validationResult.details.hasDomain ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="email-detail-item">
                    <span className="email-detail-label">Has TLD:</span>
                    <span className="email-detail-value">{validationResult.details.hasTld ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              )}
            </div>
          </EditorPanel>
        )}
      </div>
    </ToolContainer>
  )
}

export default EmailValidator

