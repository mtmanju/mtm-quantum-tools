import { Check, Copy, X, History } from 'lucide-react'
import { useCallback, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { ErrorBar } from '../components/ui/ErrorBar'
import { useCopy } from '../hooks/useCopy'
import './Calculator.css'

const Calculator = () => {
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [error, setError] = useState('')

  const copyHook = useCopy()

  const handleNumber = useCallback((num: string) => {
    setError('')
    if (display === '0' || display === 'Error') {
      setDisplay(num)
    } else {
      setDisplay(display + num)
    }
  }, [display])

  const handleOperation = useCallback((op: string) => {
    setError('')
    if (previousValue === null) {
      setPreviousValue(parseFloat(display))
      setOperation(op)
      setDisplay('0')
    } else {
      const result = calculate(previousValue, parseFloat(display), operation!)
      if (result !== null) {
        setPreviousValue(result)
        setOperation(op)
        setDisplay('0')
      }
    }
  }, [display, previousValue, operation])

  const calculate = useCallback((a: number, b: number, op: string | null): number | null => {
    if (op === null) return b
    
    try {
      switch (op) {
        case '+':
          return a + b
        case '-':
          return a - b
        case '*':
          return a * b
        case '/':
          if (b === 0) {
            setError('Division by zero')
            return null
          }
          return a / b
        case '%':
          return a % b
        case '^':
          return Math.pow(a, b)
        default:
          return b
      }
    } catch {
      setError('Calculation error')
      return null
    }
  }, [])

  const handleEquals = useCallback(() => {
    setError('')
    if (previousValue !== null && operation) {
      const result = calculate(previousValue, parseFloat(display), operation)
      if (result !== null) {
        const expression = `${previousValue} ${operation} ${display} = ${result}`
        setHistory(prev => [expression, ...prev].slice(0, 10))
        setDisplay(result.toString())
        setPreviousValue(null)
        setOperation(null)
      }
    }
  }, [display, previousValue, operation, calculate])

  const handleClear = useCallback(() => {
    setDisplay('0')
    setPreviousValue(null)
    setOperation(null)
    setError('')
  }, [])

  const handleClearEntry = useCallback(() => {
    setDisplay('0')
    setError('')
  }, [])

  const handleDecimal = useCallback(() => {
    setError('')
    if (!display.includes('.')) {
      setDisplay(display + '.')
    }
  }, [display])

  const handleBackspace = useCallback(() => {
    setError('')
    if (display.length > 1) {
      setDisplay(display.slice(0, -1))
    } else {
      setDisplay('0')
    }
  }, [display])

  const handleFunction = useCallback((func: string) => {
    setError('')
    try {
      const value = parseFloat(display)
      let result: number

      switch (func) {
        case 'sqrt':
          if (value < 0) {
            setError('Cannot calculate square root of negative number')
            return
          }
          result = Math.sqrt(value)
          break
        case 'square':
          result = value * value
          break
        case '1/x':
          if (value === 0) {
            setError('Cannot divide by zero')
            return
          }
          result = 1 / value
          break
        case 'ln':
          if (value <= 0) {
            setError('Cannot calculate logarithm of non-positive number')
            return
          }
          result = Math.log(value)
          break
        case 'log':
          if (value <= 0) {
            setError('Cannot calculate logarithm of non-positive number')
            return
          }
          result = Math.log10(value)
          break
        case 'sin':
          result = Math.sin(value * Math.PI / 180)
          break
        case 'cos':
          result = Math.cos(value * Math.PI / 180)
          break
        case 'tan':
          result = Math.tan(value * Math.PI / 180)
          break
        default:
          return
      }

      setDisplay(result.toString())
      setHistory(prev => [`${func}(${value}) = ${result}`, ...prev].slice(0, 10))
    } catch {
      setError('Calculation error')
    }
  }, [display])

  const toolbarButtons = [
    {
      icon: <History size={16} />,
      label: showHistory ? 'Hide History' : 'Show History',
      onClick: () => setShowHistory(!showHistory),
      title: 'Toggle history',
      showDividerBefore: true
    },
    {
      icon: copyHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyHook.copied ? 'Copied!' : 'Copy',
      onClick: () => copyHook.copy(display, (err) => setError(err)),
      disabled: display === '0',
      title: 'Copy result',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      title: 'Clear all',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      {showHistory && history.length > 0 && (
        <div className="calculator-history-panel">
          <div className="calculator-history-header">
            <h3>History</h3>
            <button
              type="button"
              className="calculator-history-clear"
              onClick={() => setHistory([])}
              title="Clear history"
            >
              <X size={16} />
            </button>
          </div>
          <div className="calculator-history-list">
            {history.map((item, index) => (
              <div
                key={index}
                className="calculator-history-item"
                onClick={() => {
                  const result = item.split(' = ')[1]
                  if (result) {
                    setDisplay(result)
                    setError('')
                  }
                }}
              >
                <code>{item}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="calculator-container">
        <div className="calculator-display">
          <div className="calculator-history-preview">
            {previousValue !== null && operation && (
              <span>{previousValue} {operation}</span>
            )}
          </div>
          <div className="calculator-display-value">{display}</div>
        </div>

        <div className="calculator-grid">
          {/* Function buttons */}
          <button className="calculator-btn calculator-btn-function" onClick={() => handleFunction('sqrt')}>√</button>
          <button className="calculator-btn calculator-btn-function" onClick={() => handleFunction('square')}>x²</button>
          <button className="calculator-btn calculator-btn-function" onClick={() => handleFunction('1/x')}>1/x</button>
          <button className="calculator-btn calculator-btn-function" onClick={() => handleFunction('ln')}>ln</button>
          <button className="calculator-btn calculator-btn-function" onClick={() => handleFunction('log')}>log</button>
          <button className="calculator-btn calculator-btn-function" onClick={() => handleFunction('sin')}>sin</button>
          <button className="calculator-btn calculator-btn-function" onClick={() => handleFunction('cos')}>cos</button>
          <button className="calculator-btn calculator-btn-function" onClick={() => handleFunction('tan')}>tan</button>

          {/* Clear buttons */}
          <button className="calculator-btn calculator-btn-clear" onClick={handleClearEntry}>CE</button>
          <button className="calculator-btn calculator-btn-clear" onClick={handleClear}>C</button>
          <button className="calculator-btn calculator-btn-operation" onClick={handleBackspace}>⌫</button>
          <button className="calculator-btn calculator-btn-operation" onClick={() => handleOperation('/')}>/</button>

          {/* Numbers and operations */}
          <button className="calculator-btn calculator-btn-number" onClick={() => handleNumber('7')}>7</button>
          <button className="calculator-btn calculator-btn-number" onClick={() => handleNumber('8')}>8</button>
          <button className="calculator-btn calculator-btn-number" onClick={() => handleNumber('9')}>9</button>
          <button className="calculator-btn calculator-btn-operation" onClick={() => handleOperation('*')}>×</button>

          <button className="calculator-btn calculator-btn-number" onClick={() => handleNumber('4')}>4</button>
          <button className="calculator-btn calculator-btn-number" onClick={() => handleNumber('5')}>5</button>
          <button className="calculator-btn calculator-btn-number" onClick={() => handleNumber('6')}>6</button>
          <button className="calculator-btn calculator-btn-operation" onClick={() => handleOperation('-')}>-</button>

          <button className="calculator-btn calculator-btn-number" onClick={() => handleNumber('1')}>1</button>
          <button className="calculator-btn calculator-btn-number" onClick={() => handleNumber('2')}>2</button>
          <button className="calculator-btn calculator-btn-number" onClick={() => handleNumber('3')}>3</button>
          <button className="calculator-btn calculator-btn-operation" onClick={() => handleOperation('+')}>+</button>

          <button className="calculator-btn calculator-btn-number calculator-btn-zero" onClick={() => handleNumber('0')}>0</button>
          <button className="calculator-btn calculator-btn-number" onClick={handleDecimal}>.</button>
          <button className="calculator-btn calculator-btn-operation" onClick={() => handleOperation('%')}>%</button>
          <button className="calculator-btn calculator-btn-equals" onClick={handleEquals}>=</button>
        </div>

        {showHistory && history.length > 0 && (
          <div className="calculator-history">
            <div className="calculator-history-header">
              <History size={16} />
              <span>History</span>
              <button
                type="button"
                className="calculator-history-clear"
                onClick={() => setHistory([])}
                title="Clear history"
              >
                <X size={16} />
              </button>
            </div>
            <div className="calculator-history-list">
              {history.map((item, index) => (
                <div
                  key={index}
                  className="calculator-history-item"
                  onClick={() => {
                    const result = item.split(' = ')[1]
                    if (result) {
                      setDisplay(result)
                      setError('')
                    }
                  }}
                >
                  <code>{item}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default Calculator

