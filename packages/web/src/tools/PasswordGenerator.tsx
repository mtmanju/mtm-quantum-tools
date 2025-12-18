import { Check, Copy, X, RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { useCopy } from '../hooks/useCopy'
import { generatePassword, calculatePasswordStrength, type PasswordOptions } from '../utils/password'
import './PasswordGenerator.css'

const PasswordGenerator = () => {
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: false,
    excludeAmbiguous: false
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const copyHook = useCopy()

  const strength = useMemo(() => {
    if (!password) return null
    return calculatePasswordStrength(password)
  }, [password])

  const handleGenerate = useCallback(() => {
    setError('')
    try {
      const generated = generatePassword(options)
      setPassword(generated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password generation failed')
    }
  }, [options])

  const handleClear = useCallback(() => {
    setPassword('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <RefreshCw size={16} />,
      label: 'Generate',
      onClick: handleGenerate,
      title: 'Generate password'
    },
    {
      icon: copyHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyHook.copied ? 'Copied!' : 'Copy',
      onClick: () => copyHook.copy(password, (err) => setError(err)),
      disabled: !password.trim(),
      title: 'Copy password',
      showDividerBefore: true
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !password.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <div className="password-generator">
        <div className="password-display-section">
          <div className="password-display">
            <code className="password-value">{password || 'Click "Generate" to create a password'}</code>
          </div>
          {strength && (
            <div className={`password-strength password-strength-${strength.strength}`}>
              <div className="password-strength-bar">
                <div
                  className="password-strength-fill"
                  style={{ width: `${(strength.score / 6) * 100}%` }}
                />
              </div>
              <div className="password-strength-label">
                <span>Strength: {strength.strength.replace('-', ' ')}</span>
                {strength.feedback.length > 0 && (
                  <span className="password-strength-feedback">
                    {strength.feedback[0]}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="password-options">
          <div className="password-option-group">
            <label className="password-option-label">
              <span>Length: {options.length}</span>
              <input
                type="range"
                min="8"
                max="128"
                value={options.length}
                onChange={(e) => setOptions({ ...options, length: parseInt(e.target.value) })}
                className="password-length-slider"
              />
            </label>
          </div>

          <div className="password-option-group">
            <label className="password-option-checkbox">
              <input
                type="checkbox"
                checked={options.includeUppercase}
                onChange={(e) => setOptions({ ...options, includeUppercase: e.target.checked })}
              />
              <span>Include Uppercase (A-Z)</span>
            </label>
            <label className="password-option-checkbox">
              <input
                type="checkbox"
                checked={options.includeLowercase}
                onChange={(e) => setOptions({ ...options, includeLowercase: e.target.checked })}
              />
              <span>Include Lowercase (a-z)</span>
            </label>
            <label className="password-option-checkbox">
              <input
                type="checkbox"
                checked={options.includeNumbers}
                onChange={(e) => setOptions({ ...options, includeNumbers: e.target.checked })}
              />
              <span>Include Numbers (0-9)</span>
            </label>
            <label className="password-option-checkbox">
              <input
                type="checkbox"
                checked={options.includeSymbols}
                onChange={(e) => setOptions({ ...options, includeSymbols: e.target.checked })}
              />
              <span>Include Symbols (!@#$%...)</span>
            </label>
          </div>

          <div className="password-option-group">
            <label className="password-option-checkbox">
              <input
                type="checkbox"
                checked={options.excludeSimilar}
                onChange={(e) => setOptions({ ...options, excludeSimilar: e.target.checked })}
              />
              <span>Exclude Similar (i, l, 1, L, o, 0, O)</span>
            </label>
            <label className="password-option-checkbox">
              <input
                type="checkbox"
                checked={options.excludeAmbiguous}
                onChange={(e) => setOptions({ ...options, excludeAmbiguous: e.target.checked })}
              />
              <span>Exclude Ambiguous (&#123; &#125; [ ] ( ) / \ ' " ` ~ , ; : . &lt; &gt;)</span>
            </label>
          </div>
        </div>
      </div>
    </ToolContainer>
  )
}

export default PasswordGenerator

