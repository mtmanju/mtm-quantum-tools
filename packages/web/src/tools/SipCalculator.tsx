import { memo, useMemo, useState } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { ErrorBar } from '../components/ui/ErrorBar'
import { calculateSIP, calculateSIPInvestment, formatCurrency, formatPercentage } from '../utils/finance'
import './SipCalculator.css'

const SipCalculator = memo(() => {
  const [monthlyAmount, setMonthlyAmount] = useState('')
  const [rate, setRate] = useState('')
  const [tenure, setTenure] = useState('')
  const [tenureUnit, setTenureUnit] = useState<'years' | 'months'>('years')
  const [error, setError] = useState('')

  const results = useMemo(() => {
    setError('')
    
    if (!monthlyAmount || !rate || !tenure) {
      return null
    }

    const monthlyAmountNum = parseFloat(monthlyAmount)
    const rateNum = parseFloat(rate)
    const tenureNum = parseFloat(tenure)
    const tenureMonths = tenureUnit === 'years' ? tenureNum * 12 : tenureNum

    if (monthlyAmountNum <= 0 || rateNum < 0 || tenureNum <= 0) {
      setError('Please enter valid positive values')
      return null
    }

    if (monthlyAmountNum > 1000000 || rateNum > 100 || tenureMonths > 600) {
      setError('Values are too large. Please enter reasonable amounts.')
      return null
    }

    const futureValue = calculateSIP(monthlyAmountNum, rateNum, tenureMonths)
    const totalInvestment = calculateSIPInvestment(monthlyAmountNum, tenureMonths)
    const returns = futureValue - totalInvestment

    return {
      futureValue,
      totalInvestment,
      returns,
      monthlyAmount: monthlyAmountNum
    }
  }, [monthlyAmount, rate, tenure, tenureUnit])

  const handleDownload = () => {
    if (!results) return

    const report = `SIP Calculator Report
====================

Investment Details:
- Monthly SIP Amount: ${formatCurrency(parseFloat(monthlyAmount))}
- Expected Return: ${formatPercentage(parseFloat(rate))} per annum
- Investment Period: ${tenure} ${tenureUnit} (${tenureUnit === 'years' ? parseFloat(tenure) * 12 : tenure} months)

Results:
- Future Value: ${formatCurrency(results.futureValue)}
- Total Investment: ${formatCurrency(results.totalInvestment)}
- Estimated Returns: ${formatCurrency(results.returns)}
- Return Percentage: ${formatPercentage((results.returns / results.totalInvestment) * 100)}

Generated on: ${new Date().toLocaleString()}
`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sip-calculator-report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ToolContainer>
      <div className="sip-calculator">
        <div className="calculator-inputs">
          <div className="input-group">
            <label htmlFor="monthly-amount">Monthly SIP Amount (₹)</label>
            <input
              id="monthly-amount"
              type="number"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              placeholder="e.g., 5000"
              min="0"
              step="100"
            />
          </div>

          <div className="input-group">
            <label htmlFor="rate">Expected Return (% per annum)</label>
            <input
              id="rate"
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g., 12"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          <div className="input-group">
            <label htmlFor="tenure">Investment Period</label>
            <div className="tenure-input">
              <input
                id="tenure"
                type="number"
                value={tenure}
                onChange={(e) => setTenure(e.target.value)}
                placeholder="e.g., 10"
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
              <div className="result-label">Future Value</div>
              <div className="result-value">{formatCurrency(results.futureValue)}</div>
            </div>

            <div className="result-card">
              <div className="result-label">Total Investment</div>
              <div className="result-value">{formatCurrency(results.totalInvestment)}</div>
            </div>

            <div className="result-card">
              <div className="result-label">Estimated Returns</div>
              <div className="result-value returns">{formatCurrency(results.returns)}</div>
            </div>

            <div className="result-card">
              <div className="result-label">Return Percentage</div>
              <div className="result-value">
                {formatPercentage((results.returns / results.totalInvestment) * 100)}
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

SipCalculator.displayName = 'SipCalculator'

export default SipCalculator

