import { Check, Copy, X, RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { useCopy } from '../hooks/useCopy'
import { generatePassword, generatePassphrase, calculatePasswordStrength, type PasswordOptions } from '../utils/password'
import './PasswordGenerator.css'

const PasswordGenerator = () => {
  const [mode, setMode] = useState<'password' | 'passphrase'>('password')
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeSimilar: false,
    excludeAmbiguous: false
  })
  const [passphraseWords, setPassphraseWords] = useState(4)
  const [passphraseSeparator, setPassphraseSeparator] = useState('-')
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
      if (mode === 'passphrase') {
        const generated = generatePassphrase(passphraseWords, passphraseSeparator)
        setPassword(generated)
      } else {
        const generated = generatePassword(options)
        setPassword(generated)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    }
  }, [options, mode, passphraseWords, passphraseSeparator])

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

      <div className="password-mode-selector">
        <button
          type="button"
          className={`password-mode-btn ${mode === 'password' ? 'active' : ''}`}
          onClick={() => setMode('password')}
        >
          Password
        </button>
        <button
          type="button"
          className={`password-mode-btn ${mode === 'passphrase' ? 'active' : ''}`}
          onClick={() => setMode('passphrase')}
        >
          Passphrase
        </button>
      </div>

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
                  style={{ width: `${(strength.score / 7) * 100}%` }}
                />
              </div>
              <div className="password-strength-label">
                <span>Strength: {strength.strength.replace('-', ' ')}</span>
                <span className="password-entropy">Entropy: {strength.entropy.toFixed(1)} bits</span>
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
          {mode === 'password' ? (
            <>
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
            </>
          ) : (
            <div className="password-option-group">
              <label className="password-option-label">
                <span>Word Count: {passphraseWords}</span>
                <input
                  type="range"
                  min="3"
                  max="10"
                  value={passphraseWords}
                  onChange={(e) => setPassphraseWords(parseInt(e.target.value))}
                  className="password-length-slider"
                />
              </label>
              <div className="password-option-group">
                <label className="password-option-checkbox">
                  <span>Separator:</span>
                  <select
                    value={passphraseSeparator}
                    onChange={(e) => setPassphraseSeparator(e.target.value)}
                    className="password-separator-select"
                  >
                    <option value="-">- (Hyphen)</option>
                    <option value="_">_ (Underscore)</option>
                    <option value=" "> (Space)</option>
                    <option value=".">.(Dot)</option>
                  </select>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolContainer>
  )
}

export default PasswordGenerator

