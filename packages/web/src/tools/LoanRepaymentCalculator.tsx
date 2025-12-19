import { memo, useMemo, useState, useEffect } from 'react'
import { ToolContainer } from '../components/ui/ToolContainer'
import { ErrorBar } from '../components/ui/ErrorBar'
import { calculateLoanRepaymentSchedule, calculateEMI, formatCurrency, formatPercentage } from '../utils/finance'
import { usePagination } from '../hooks/usePagination'
import './LoanRepaymentCalculator.css'

const LoanRepaymentCalculator = memo(() => {
  const [principal, setPrincipal] = useState('')
  const [rate, setRate] = useState('')
  const [tenure, setTenure] = useState('')
  const [tenureUnit, setTenureUnit] = useState<'years' | 'months'>('years')
  const [extraPayment, setExtraPayment] = useState('')
  const [error, setError] = useState('')
  const [showSchedule, setShowSchedule] = useState(false)

  const results = useMemo(() => {
    setError('')
    
    if (!principal || !rate || !tenure) {
      return null
    }

    const principalNum = parseFloat(principal)
    const rateNum = parseFloat(rate)
    const tenureNum = parseFloat(tenure)
    const tenureMonths = tenureUnit === 'years' ? tenureNum * 12 : tenureNum
    const extraPaymentNum = parseFloat(extraPayment) || 0

    if (principalNum <= 0 || rateNum < 0 || tenureNum <= 0 || extraPaymentNum < 0) {
      setError('Please enter valid positive values')
      return null
    }

    if (principalNum > 1000000000 || rateNum > 100 || tenureMonths > 600) {
      setError('Values are too large. Please enter reasonable amounts.')
      return null
    }

    const emi = calculateEMI(principalNum, rateNum, tenureMonths)
    const schedule = calculateLoanRepaymentSchedule(principalNum, rateNum, tenureMonths, extraPaymentNum)
    
    const totalInterest = schedule.reduce((sum, month) => sum + month.interestPayment, 0)
    const totalPrincipalPaid = schedule.reduce((sum, month) => sum + (month.principalPayment + month.extraPayment), 0)
    const totalExtraPayment = schedule.reduce((sum, month) => sum + month.extraPayment, 0)
    const actualTenure = schedule.length

    return {
      emi,
      schedule,
      totalInterest,
      totalPrincipal: principalNum, // Original principal amount
      totalPrincipalPaid, // Total principal actually paid (from EMI + extra)
      totalExtraPayment,
      actualTenure,
      originalTenure: tenureMonths
    }
  }, [principal, rate, tenure, tenureUnit, extraPayment])

  const schedulePagination = usePagination(
    results?.schedule || [],
    { initialPageSize: 12 }
  )

  // Reset pagination when results change
  useEffect(() => {
    schedulePagination.reset()
  }, [principal, rate, tenure, tenureUnit, extraPayment, schedulePagination.reset])

  const handleDownload = () => {
    if (!results) return

    let report = `Loan Repayment Calculator Report
====================================

Loan Details:
- Principal Amount: ${formatCurrency(parseFloat(principal))}
- Interest Rate: ${formatPercentage(parseFloat(rate))} per annum
- Original Tenure: ${tenure} ${tenureUnit} (${results.originalTenure} months)
- Extra Payment per Month: ${formatCurrency(parseFloat(extraPayment) || 0)}

Results:
- Monthly EMI: ${formatCurrency(results.emi)}
- Total Interest: ${formatCurrency(results.totalInterest)}
- Total Principal Paid: ${formatCurrency(results.totalPrincipal)}
- Total Extra Payment: ${formatCurrency(results.totalExtraPayment)}
- Actual Tenure: ${results.actualTenure} months
- Time Saved: ${results.originalTenure - results.actualTenure} months

`

    if (showSchedule && results.schedule.length > 0) {
      report += `\nRepayment Schedule:\n`
      report += `Month | Opening Balance | EMI | Principal | Interest | Extra | Closing Balance\n`
      report += `-`.repeat(80) + `\n`
      
      results.schedule.forEach(month => {
        report += `${month.month.toString().padStart(5)} | ${formatCurrency(month.openingBalance).padStart(15)} | ${formatCurrency(month.emi).padStart(10)} | ${formatCurrency(month.principalPayment).padStart(10)} | ${formatCurrency(month.interestPayment).padStart(10)} | ${formatCurrency(month.extraPayment).padStart(8)} | ${formatCurrency(month.closingBalance).padStart(15)}\n`
      })
    }

    report += `\nGenerated on: ${new Date().toLocaleString()}\n`

    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'loan-repayment-report.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ToolContainer>
      <div className="loan-repayment-calculator">
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

          <div className="input-group">
            <label htmlFor="extra-payment">Extra Payment per Month (₹) - Optional</label>
            <input
              id="extra-payment"
              type="number"
              value={extraPayment}
              onChange={(e) => setExtraPayment(e.target.value)}
              placeholder="e.g., 5000"
              min="0"
              step="100"
            />
          </div>
        </div>

        {error && <ErrorBar message={error} />}

        {results && (
          <>
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
                <div className="result-label">Actual Tenure</div>
                <div className="result-value">{results.actualTenure} months</div>
              </div>

              <div className="result-card">
                <div className="result-label">Time Saved</div>
                <div className="result-value savings">
                  {results.originalTenure - results.actualTenure} months
                </div>
              </div>

              <div className="result-card">
                <div className="result-label">Total Extra Payment</div>
                <div className="result-value">{formatCurrency(results.totalExtraPayment)}</div>
              </div>

              <div className="result-card">
                <div className="result-label">Total Amount Paid</div>
                <div className="result-value">
                  {formatCurrency(results.totalPrincipal + results.totalInterest + results.totalExtraPayment)}
                </div>
              </div>
            </div>

            <div className="schedule-controls">
              <button
                className="toggle-schedule-btn"
                onClick={() => setShowSchedule(!showSchedule)}
              >
                {showSchedule ? 'Hide' : 'Show'} Repayment Schedule
              </button>
            </div>

            {showSchedule && results.schedule.length > 0 && (
              <div className="repayment-schedule">
                <h3>
                  Repayment Schedule
                  {!schedulePagination.showAll && ` (${schedulePagination.pageSize} of ${schedulePagination.totalItems} months)`}
                  {schedulePagination.showAll && ` (All ${schedulePagination.totalItems} months)`}
                </h3>
                <div className="schedule-table">
                  <div className="schedule-header">
                    <div>Month</div>
                    <div>Opening</div>
                    <div>EMI</div>
                    <div>Principal</div>
                    <div>Interest</div>
                    <div>Extra</div>
                    <div>Closing</div>
                  </div>
                  {schedulePagination.currentItems.map(month => (
                    <div key={month.month} className="schedule-row">
                      <div>{month.month}</div>
                      <div>{formatCurrency(month.openingBalance)}</div>
                      <div>{formatCurrency(month.emi)}</div>
                      <div>{formatCurrency(month.principalPayment)}</div>
                      <div>{formatCurrency(month.interestPayment)}</div>
                      <div>{formatCurrency(month.extraPayment)}</div>
                      <div>{formatCurrency(month.closingBalance)}</div>
                    </div>
                  ))}
                </div>
                {schedulePagination.hasMore && (
                  <div className="schedule-pagination">
                    <button
                      className="load-more-btn"
                      onClick={schedulePagination.loadMore}
                    >
                      Load More (Show {Math.min(schedulePagination.pageSize + 12, schedulePagination.totalItems)} of {schedulePagination.totalItems})
                    </button>
                    <button
                      className="load-all-btn"
                      onClick={schedulePagination.loadAll}
                    >
                      Show All {schedulePagination.totalItems} Months
                    </button>
                  </div>
                )}
              </div>
            )}

            <button className="download-btn" onClick={handleDownload}>
              Download Report
            </button>
          </>
        )}
      </div>
    </ToolContainer>
  )
})

LoanRepaymentCalculator.displayName = 'LoanRepaymentCalculator'

export default LoanRepaymentCalculator

