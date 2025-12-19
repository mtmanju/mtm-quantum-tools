import { memo, useMemo, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { ErrorBar } from '../components/ui/ErrorBar'
import { calculateInvestmentReturn, formatCurrency, formatPercentage } from '../utils/finance'
import './InvestmentReturnCalculator.css'

const InvestmentReturnCalculator = memo(() => {
  const [initialInvestment, setInitialInvestment] = useState('')
  const [finalValue, setFinalValue] = useState('')
  const [time, setTime] = useState('')
  const [timeUnit, setTimeUnit] = useState<'years' | 'months'>('years')
  const [error, setError] = useState('')

  const results = useMemo(() => {
    setError('')
    
    if (!initialInvestment || !finalValue || !time) {
      return null
    }

    const initialNum = parseFloat(initialInvestment)
    const finalNum = parseFloat(finalValue)
    const timeNum = parseFloat(time)
    const timeYears = timeUnit === 'years' ? timeNum : timeNum / 12

    if (initialNum <= 0 || finalNum < 0 || timeNum <= 0) {
      setError('Please enter valid positive values')
      return null
    }

    if (initialNum > 1000000000 || finalNum > 10000000000 || timeYears > 100) {
      setError('Values are too large. Please enter reasonable amounts.')
      return null
    }

    if (timeYears <= 0) {
      setError('Time period must be at least 1 month')
      return null
    }

    const result = calculateInvestmentReturn(initialNum, finalNum, timeYears)

    return {
      ...result,
      timeYears
    }
  }, [initialInvestment, finalValue, time, timeUnit])

  const handleDownload = () => {
    if (!results) return

    const report = `Investment Return Calculator Report
=====================================

Investment Details:
- Initial Investment: ${formatCurrency(parseFloat(initialInvestment))}
- Final Value: ${formatCurrency(parseFloat(finalValue))}
- Time Period: ${time} ${timeUnit} (${results.timeYears.toFixed(2)} years)

Results:
- Absolute Return: ${formatCurrency(results.absoluteReturn)}
- Absolute Return Percentage: ${formatPercentage(results.absoluteReturnPercent)}
- CAGR (Compound Annual Growth Rate): ${formatPercentage(results.cagr)}
- Total Gain: ${formatCurrency(results.totalGain)}

Generated on: ${new Date().toLocaleString()}
`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'investment-return-report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ToolContainer>
      <div className="investment-return-calculator">
        <div className="calculator-inputs">
          <div className="input-group">
            <label htmlFor="initial">Initial Investment (₹)</label>
            <input
              id="initial"
              type="number"
              value={initialInvestment}
              onChange={(e) => setInitialInvestment(e.target.value)}
              placeholder="e.g., 100000"
              min="0"
              step="1000"
            />
          </div>

          <div className="input-group">
            <label htmlFor="final">Final Value (₹)</label>
            <input
              id="final"
              type="number"
              value={finalValue}
              onChange={(e) => setFinalValue(e.target.value)}
              placeholder="e.g., 200000"
              min="0"
              step="1000"
            />
          </div>

          <div className="input-group">
            <label htmlFor="time">Time Period</label>
            <div className="time-input">
              <input
                id="time"
                type="number"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g., 5"
                min="0"
                step="0.5"
              />
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value as 'years' | 'months')}
              >
                <option value="years">Years</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>
        </div>

        {error && <ErrorBar message={error} />}

        {results && (
          <div className="calculator-results">
            <div className="result-card">
              <div className="result-label">Absolute Return</div>
              <div className="result-value returns">
                {formatCurrency(results.absoluteReturn)}
              </div>
            </div>

            <div className="result-card">
              <div className="result-label">Absolute Return %</div>
              <div className="result-value">
                {formatPercentage(results.absoluteReturnPercent)}
              </div>
            </div>

            <div className="result-card">
              <div className="result-label">CAGR</div>
              <div className="result-value cagr">
                {formatPercentage(results.cagr)}
              </div>
              <div className="result-note">Compound Annual Growth Rate</div>
            </div>

            <div className="result-card">
              <div className="result-label">Total Gain</div>
              <div className="result-value returns">
                {formatCurrency(results.totalGain)}
              </div>
            </div>

            <div className="result-card">
              <div className="result-label">Initial Investment</div>
              <div className="result-value">
                {formatCurrency(parseFloat(initialInvestment))}
              </div>
            </div>

            <div className="result-card">
              <div className="result-label">Final Value</div>
              <div className="result-value">
                {formatCurrency(parseFloat(finalValue))}
              </div>
            </div>

            <button className="download-btn" onClick={handleDownload}>
              Download Report
            </button>
          </div>
        )}
      </div>
    </ToolContainer>
  )
})

InvestmentReturnCalculator.displayName = 'InvestmentReturnCalculator'

export default InvestmentReturnCalculator

