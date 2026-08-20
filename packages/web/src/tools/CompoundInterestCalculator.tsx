import { memo, useMemo, useState, useCallback } from 'react'
import { TrendingUp } from 'lucide-react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBar } from '../components/ui/ErrorBar'
import { calculateCompoundInterest, formatCurrency, formatPercentage } from '../utils/finance'
import { downloadTextFile } from '../utils/file'
import './CompoundInterestCalculator.css'

/**
 * Compounding frequencies. Module scope, not component scope: the list is a
 * constant, but declared inside the component it was a new array every render
 * and it sat in a useCallback dependency array — so the callback it was meant
 * to memoise was rebuilt on every keystroke. A constant that never changes
 * should not be able to invalidate anything.
 */
const FREQUENCY_OPTIONS = [
  { value: '1', label: 'Annually' },
  { value: '2', label: 'Semi-Annually' },
  { value: '4', label: 'Quarterly' },
  { value: '12', label: 'Monthly' },
  { value: '365', label: 'Daily' },
] as const

const CompoundInterestCalculator = memo(() => {
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [time, setTime] = useState('')
  const [compoundingFrequency, setCompoundingFrequency] = useState('12')

  /**
   * Validation errors are derived from the inputs and never stored — writing
   * state during render forces an extra render pass and leaves the message
   * one render behind the value that caused it. There are no user *action*
   * errors in this tool, so no error state is held at all.
   */
  const calculation = useMemo(() => {
    if (!principal || !rate || !time) {
      return { results: null, error: '' }
    }

    const principalNum = parseFloat(principal)
    const rateNum = parseFloat(rate)
    const timeNum = parseFloat(time)
    const frequencyNum = parseFloat(compoundingFrequency)

    if (principalNum <= 0 || rateNum < 0 || timeNum <= 0 || frequencyNum <= 0) {
      return { results: null, error: 'Please enter valid positive values' }
    }

    if (principalNum > 1000000000 || rateNum > 100 || timeNum > 100) {
      return { results: null, error: 'Values are too large. Please enter reasonable amounts.' }
    }

    const result = calculateCompoundInterest(principalNum, rateNum, timeNum, frequencyNum)

    return { results: result, error: '' }
  }, [principal, rate, time, compoundingFrequency])

  const results = calculation.results
  const error = calculation.error

  const handleDownload = useCallback(() => {
    if (!results) return

    const frequencyLabel = FREQUENCY_OPTIONS.find(opt => opt.value === compoundingFrequency)?.label || 'Monthly'

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

    downloadTextFile(report, 'compound-interest-report.txt')
  }, [results, principal, rate, time, compoundingFrequency])

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
              {FREQUENCY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <ErrorBar message={error} />}

        {!results && !error && (
          <EmptyState
            icon={<TrendingUp size={32} strokeWidth={1.5} aria-hidden="true" />}
            title="Your compounded balance will appear here"
            hint="Enter a principal, an interest rate, and a duration."
          />
        )}

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
              Download report
            </button>
          </div>
        )}
      </div>
    </ToolContainer>
  )
})

CompoundInterestCalculator.displayName = 'CompoundInterestCalculator'

export default CompoundInterestCalculator

