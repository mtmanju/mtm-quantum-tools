import { memo, useMemo, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { ErrorBar } from '../components/ui/ErrorBar'
import { calculateCompoundInterest, formatCurrency, formatPercentage } from '../utils/finance'
import './CompoundInterestCalculator.css'

const CompoundInterestCalculator = memo(() => {
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [time, setTime] = useState('')
  const [compoundingFrequency, setCompoundingFrequency] = useState('12')
  const [error, setError] = useState('')

  const results = useMemo(() => {
    setError('')
    
    if (!principal || !rate || !time) {
      return null
    }

    const principalNum = parseFloat(principal)
    const rateNum = parseFloat(rate)
    const timeNum = parseFloat(time)
    const frequencyNum = parseFloat(compoundingFrequency)

    if (principalNum <= 0 || rateNum < 0 || timeNum <= 0 || frequencyNum <= 0) {
      setError('Please enter valid positive values')
      return null
    }

    if (principalNum > 1000000000 || rateNum > 100 || timeNum > 100) {
      setError('Values are too large. Please enter reasonable amounts.')
      return null
    }

    const result = calculateCompoundInterest(principalNum, rateNum, timeNum, frequencyNum)

    return result
  }, [principal, rate, time, compoundingFrequency])

  const frequencyOptions = [
    { value: '1', label: 'Annually' },
    { value: '2', label: 'Semi-Annually' },
    { value: '4', label: 'Quarterly' },
    { value: '12', label: 'Monthly' },
    { value: '365', label: 'Daily' }
  ]

  const handleDownload = () => {
    if (!results) return

    const frequencyLabel = frequencyOptions.find(opt => opt.value === compoundingFrequency)?.label || 'Monthly'

    const report = `Compound Interest Calculator Report
=====================================

Investment Details:
- Principal Amount: ${formatCurrency(parseFloat(principal))}
- Interest Rate: ${formatPercentage(parseFloat(rate))} per annum
- Time Period: ${time} years
- Compounding Frequency: ${frequencyLabel} (${compoundingFrequency} times per year)

Results:
- Final Amount: ${formatCurrency(results.finalAmount)}
- Interest Earned: ${formatCurrency(results.interestEarned)}
- Total Investment: ${formatCurrency(results.totalInvestment)}
- Return Percentage: ${formatPercentage((results.interestEarned / results.totalInvestment) * 100)}

Generated on: ${new Date().toLocaleString()}
`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'compound-interest-report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ToolContainer>
      <div className="compound-interest-calculator">
        <div className="calculator-inputs">
          <div className="input-group">
            <label htmlFor="principal">Principal Amount (₹)</label>
            <input
              id="principal"
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder="e.g., 100000"
              min="0"
              step="1000"
            />
          </div>

          <div className="input-group">
            <label htmlFor="rate">Interest Rate (% per annum)</label>
            <input
              id="rate"
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g., 8.5"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div className="input-group">
            <label htmlFor="time">Time Period (Years)</label>
            <input
              id="time"
              type="number"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="e.g., 10"
              min="0"
              step="0.5"
            />
          </div>

          <div className="input-group">
            <label htmlFor="frequency">Compounding Frequency</label>
            <select
              id="frequency"
              value={compoundingFrequency}
              onChange={(e) => setCompoundingFrequency(e.target.value)}
            >
              {frequencyOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <ErrorBar message={error} />}

        {results && (
          <div className="calculator-results">
            <div className="result-card">
              <div className="result-label">Final Amount</div>
              <div className="result-value">{formatCurrency(results.finalAmount)}</div>
            </div>

            <div className="result-card">
              <div className="result-label">Interest Earned</div>
              <div className="result-value returns">{formatCurrency(results.interestEarned)}</div>
            </div>

            <div className="result-card">
              <div className="result-label">Total Investment</div>
              <div className="result-value">{formatCurrency(results.totalInvestment)}</div>
            </div>

            <div className="result-card">
              <div className="result-label">Return Percentage</div>
              <div className="result-value">
                {formatPercentage((results.interestEarned / results.totalInvestment) * 100)}
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

CompoundInterestCalculator.displayName = 'CompoundInterestCalculator'

export default CompoundInterestCalculator

