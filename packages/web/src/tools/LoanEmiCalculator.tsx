import { memo, useMemo, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { ErrorBar } from '../components/ui/ErrorBar'
import { calculateEMI, calculateTotalInterest, formatCurrency, formatPercentage } from '../utils/finance'
import './LoanEmiCalculator.css'

const LoanEmiCalculator = memo(() => {
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [tenure, setTenure] = useState('')
  const [tenureUnit, setTenureUnit] = useState<'years' | 'months'>('years')
  const [error, setError] = useState('')

  const results = useMemo(() => {
    setError('')
    
    if (!principal || !rate || !tenure) {
      return null
    }

    const principalNum = parseFloat(principal)
    const rateNum = parseFloat(rate)
    const tenureNum = parseFloat(tenure)
    const tenureMonths = tenureUnit === 'years' ? tenureNum * 12 : tenureNum

    if (principalNum <= 0 || rateNum < 0 || tenureNum <= 0) {
      setError('Please enter valid positive values')
      return null
    }

    if (principalNum > 1000000000 || rateNum > 100 || tenureMonths > 600) {
      setError('Values are too large. Please enter reasonable amounts.')
      return null
    }

    const emi = calculateEMI(principalNum, rateNum, tenureMonths)
    const totalInterest = calculateTotalInterest(principalNum, emi, tenureMonths)
    const totalAmount = principalNum + totalInterest

    return {
      emi,
      totalInterest,
      totalAmount,
      principal: principalNum
    }
  }, [principal, rate, tenure, tenureUnit])

  const handleDownload = () => {
    if (!results) return

    const report = `Loan EMI Calculator Report
================================

Loan Details:
- Principal Amount: ${formatCurrency(parseFloat(principal))}
- Interest Rate: ${formatPercentage(parseFloat(rate))} per annum
- Tenure: ${tenure} ${tenureUnit} (${tenureUnit === 'years' ? parseFloat(tenure) * 12 : tenure} months)

Results:
- Monthly EMI: ${formatCurrency(results.emi)}
- Total Interest: ${formatCurrency(results.totalInterest)}
- Total Amount: ${formatCurrency(results.totalAmount)}
- Principal Amount: ${formatCurrency(results.principal)}

Generated on: ${new Date().toLocaleString()}
`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'loan-emi-report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ToolContainer>
      <div className="loan-emi-calculator">
        <div className="calculator-inputs">
          <div className="input-group">
            <label htmlFor="principal">Loan Amount (₹)</label>
            <input
              id="principal"
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              placeholder="e.g., 5000000"
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
            <label htmlFor="tenure">Loan Tenure</label>
            <div className="tenure-input">
              <input
                id="tenure"
                type="number"
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                placeholder="e.g., 20"
                min="0"
                step="1"
              />
              <select
                value={tenureUnit}
                onChange={(e) => setTenureUnit(e.target.value as 'years' | 'months')}
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
              <div className="result-label">Monthly EMI</div>
              <div className="result-value">{formatCurrency(results.emi)}</div>
            </div>

            <div className="result-card">
              <div className="result-label">Total Interest</div>
              <div className="result-value">{formatCurrency(results.totalInterest)}</div>
            </div>

            <div className="result-card">
              <div className="result-label">Total Amount</div>
              <div className="result-value">{formatCurrency(results.totalAmount)}</div>
            </div>

            <div className="result-card">
              <div className="result-label">Principal Amount</div>
              <div className="result-value">{formatCurrency(results.principal)}</div>
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

LoanEmiCalculator.displayName = 'LoanEmiCalculator'

export default LoanEmiCalculator

