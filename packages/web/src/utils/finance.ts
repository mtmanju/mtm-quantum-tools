/**
 * Financial calculation utilities
 * All calculations use high precision and proper rounding
 */

/**
 * Round to 2 decimal places (for currency)
 */
const roundCurrency = (value: number): number => {
  return Math.round(value * 100) / 100
}

/**
 * Round to 4 decimal places.
 *
 * IMPORTANT: only ever apply this to a FINAL displayed percentage.
 * Never round an interest rate before compounding it — a 4-decimal rate
 * carries up to 5e-5 of error, which `Math.pow(1 + r, n)` amplifies over
 * hundreds of periods (e.g. 8.5% p.a. over 240 months skews the EMI by
 * ~₹63/month = ~₹15,000 across the loan).
 */
const roundPrecise = (value: number): number => {
  return Math.round(value * 10000) / 10000
}

/**
 * Calculate EMI (Equated Monthly Installment)
 * Uses standard EMI formula with high precision
 * @param principal - Loan amount
 * @param rate - Annual interest rate (as percentage)
 * @param tenure - Loan tenure in months
 * @returns Monthly EMI amount (rounded to 2 decimals)
 */
export const calculateEMI = (principal: number, rate: number, tenure: number): number => {
  if (principal <= 0 || rate < 0 || tenure <= 0) return 0

  // Full precision — see roundPrecise() note.
  const monthlyRate = rate / 12 / 100

  // Handle edge case: zero interest rate
  if (rate === 0) {
    return roundCurrency(principal / tenure)
  }

  const powerTerm = Math.pow(1 + monthlyRate, tenure)
  const emi = (principal * monthlyRate * powerTerm) / (powerTerm - 1)
  
  if (isNaN(emi) || !isFinite(emi)) return 0
  
  return roundCurrency(emi)
}

/**
 * Calculate total interest paid over loan tenure
 * @param principal - Loan amount
 * @param emi - Monthly EMI
 * @param tenure - Loan tenure in months
 * @returns Total interest paid (rounded to 2 decimals)
 */
export const calculateTotalInterest = (principal: number, emi: number, tenure: number): number => {
  const total = (emi * tenure) - principal
  return roundCurrency(Math.max(0, total))
}

/**
 * Calculate SIP (Systematic Investment Plan) future value
 * Uses FV formula: FV = P * [((1+r)^n - 1) / r] * (1+r)
 * @param monthlyAmount - Monthly SIP amount
 * @param rate - Annual expected return (as percentage)
 * @param tenure - Investment period in months
 * @returns Future value of SIP (rounded to 2 decimals)
 */
export const calculateSIP = (monthlyAmount: number, rate: number, tenure: number): number => {
  if (monthlyAmount <= 0 || rate < 0 || tenure <= 0) return 0

  // Full precision — see roundPrecise() note.
  const monthlyRate = rate / 12 / 100

  // Handle edge case: zero return rate
  if (rate === 0) {
    return roundCurrency(monthlyAmount * tenure)
  }

  const powerTerm = Math.pow(1 + monthlyRate, tenure)
  const futureValue = monthlyAmount * ((powerTerm - 1) / monthlyRate) * (1 + monthlyRate)
  
  if (isNaN(futureValue) || !isFinite(futureValue)) return 0
  
  return roundCurrency(futureValue)
}

/**
 * Calculate total investment in SIP
 * @param monthlyAmount - Monthly SIP amount
 * @param tenure - Investment period in months
 * @returns Total amount invested
 */
export const calculateSIPInvestment = (monthlyAmount: number, tenure: number): number => {
  return monthlyAmount * tenure
}

/**
 * Calculate compound interest
 * Formula: A = P * (1 + r/n)^(n*t)
 * @param principal - Initial investment
 * @param rate - Annual interest rate (as percentage)
 * @param time - Time period in years
 * @param compoundingFrequency - Number of times interest is compounded per year (default: 12 for monthly)
 * @returns Object with final amount, interest earned, and breakdown (all rounded to 2 decimals)
 */
export const calculateCompoundInterest = (
  principal: number,
  rate: number,
  time: number,
  compoundingFrequency: number = 12
): {
  finalAmount: number
  interestEarned: number
  totalInvestment: number
} => {
  if (principal <= 0 || rate < 0 || time <= 0 || compoundingFrequency <= 0) {
    return { finalAmount: 0, interestEarned: 0, totalInvestment: 0 }
  }
  
  // Full precision — see roundPrecise() note.
  const rateDecimal = rate / 100
  const n = compoundingFrequency
  const t = time

  // Handle edge case: zero interest rate
  if (rate === 0) {
    return {
      finalAmount: roundCurrency(principal),
      interestEarned: 0,
      totalInvestment: roundCurrency(principal)
    }
  }
  
  const powerTerm = Math.pow(1 + rateDecimal / n, n * t)
  const finalAmount = principal * powerTerm
  const interestEarned = finalAmount - principal
  
  return {
    finalAmount: isNaN(finalAmount) || !isFinite(finalAmount) ? 0 : roundCurrency(finalAmount),
    interestEarned: isNaN(interestEarned) || !isFinite(interestEarned) ? 0 : roundCurrency(interestEarned),
    totalInvestment: roundCurrency(principal)
  }
}

/**
 * Calculate loan repayment schedule
 * @param principal - Loan amount
 * @param rate - Annual interest rate (as percentage)
 * @param tenure - Loan tenure in months
 * @param extraPayment - Optional extra payment per month
 * @returns Array of monthly payment details
 */
export const calculateLoanRepaymentSchedule = (
  principal: number,
  rate: number,
  tenure: number,
  extraPayment: number = 0
): Array<{
  month: number
  openingBalance: number
  emi: number
  principalPayment: number
  interestPayment: number
  extraPayment: number
  closingBalance: number
}> => {
  if (principal <= 0 || rate < 0 || tenure <= 0) return []

  // Same derivation as calculateEMI, so the schedule reconciles with the
  // EMI shown to the user.
  const monthlyRate = rate / 12 / 100
  const emi = calculateEMI(principal, rate, tenure)

  // A payment that never covers the accruing interest can never amortise the
  // loan — emit nothing rather than a schedule with a growing balance.
  if (emi + extraPayment <= principal * monthlyRate) return []
  const schedule: Array<{
    month: number
    openingBalance: number
    emi: number
    principalPayment: number
    interestPayment: number
    extraPayment: number
    closingBalance: number
  }> = []
  
  let balance = roundCurrency(principal)
  const maxMonths = Math.min(tenure * 2, 1200) // Safety limit: max 2x tenure or 100 years
  const precisionThreshold = 0.01 // Minimum balance to consider paid off
  
  for (let month = 1; month <= maxMonths && balance > precisionThreshold; month++) {
    const openingBalance = roundCurrency(balance)
    const interestPayment = roundCurrency(balance * monthlyRate)
    let principalFromEMI = roundCurrency(Math.min(emi - interestPayment, balance))
    let effectivePrincipalPayment = roundCurrency(Math.min(principalFromEMI + extraPayment, balance))
    let closingBalance = roundCurrency(Math.max(0, balance - effectivePrincipalPayment))

    /**
     * The final contractual instalment settles the rounding residue.
     *
     * The EMI is rounded to the currency's smallest unit, so N payments of it
     * cannot exactly clear the principal — on a 240-month loan of 50,00,000 at
     * 8.5% the drift leaves ₹1.04 outstanding after the last payment. That is
     * over the payoff threshold, so the loop ran one more time and produced a
     * 241st month collecting ₹1.04: the UI reported a 20-year loan as "241
     * months" and, with no extra payment made, "-1 months saved". Three of
     * four representative tenures were over by exactly one month.
     *
     * Lenders resolve this the same way — the last instalment is adjusted to
     * whatever clears the account. Bounded by one instalment so it only ever
     * absorbs rounding drift: a balance larger than that means the loan
     * genuinely has not amortised, and those months are real.
     */
    if (month === tenure && closingBalance > 0 && closingBalance < emi) {
      principalFromEMI = roundCurrency(principalFromEMI + closingBalance)
      effectivePrincipalPayment = roundCurrency(effectivePrincipalPayment + closingBalance)
      closingBalance = 0
    }

    schedule.push({
      month,
      // The settled final instalment is larger than the nominal EMI by the
      // residue, so the row has to report what was actually paid or it will
      // not reconcile against its own principal + interest columns.
      emi: roundCurrency(interestPayment + effectivePrincipalPayment),
      openingBalance,
      principalPayment: principalFromEMI,
      interestPayment,
      extraPayment: roundCurrency(extraPayment),
      closingBalance
    })
    
    balance = closingBalance
    
    // Safety check: if balance isn't decreasing, break to prevent infinite loop
    if (month > 1 && balance >= schedule[schedule.length - 2].openingBalance) {
      break
    }
  }
  
  return schedule
}

/**
 * Calculate investment return (CAGR, absolute return, etc.)
 * @param initialInvestment - Initial investment amount
 * @param finalValue - Final value of investment
 * @param time - Time period in years
 * @returns Object with various return metrics
 */
export const calculateInvestmentReturn = (
  initialInvestment: number,
  finalValue: number,
  time: number
): {
  absoluteReturn: number
  absoluteReturnPercent: number
  cagr: number
  totalGain: number
} => {
  if (initialInvestment <= 0 || time <= 0) {
    return {
      absoluteReturn: 0,
      absoluteReturnPercent: 0,
      cagr: 0,
      totalGain: 0
    }
  }
  
  const totalGain = finalValue - initialInvestment
  const absoluteReturn = totalGain
  const absoluteReturnPercent = (totalGain / initialInvestment) * 100
  
  // CAGR = (Final Value / Initial Value)^(1/Time) - 1
  const cagr = Math.pow(finalValue / initialInvestment, 1 / time) - 1
  const cagrPercent = cagr * 100
  
  return {
    absoluteReturn: isNaN(absoluteReturn) || !isFinite(absoluteReturn) ? 0 : roundCurrency(absoluteReturn),
    absoluteReturnPercent: isNaN(absoluteReturnPercent) || !isFinite(absoluteReturnPercent) ? 0 : roundPrecise(absoluteReturnPercent),
    cagr: isNaN(cagrPercent) || !isFinite(cagrPercent) ? 0 : roundPrecise(cagrPercent),
    totalGain: isNaN(totalGain) || !isFinite(totalGain) ? 0 : roundCurrency(totalGain)
  }
}

/**
 * Format currency with Indian numbering system
 * @param amount - Amount to format
 * @param currency - Currency symbol (default: ₹)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = '₹'): string => {
  if (isNaN(amount) || !isFinite(amount)) return `${currency} 0.00`

  const absAmount = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  /**
   * Always two decimal places.
   *
   * This was `minimumFractionDigits: 0`, so the precision of a figure was
   * decided by whatever its own value happened to round to — and a row of
   * result tiles showed three different ones at once:
   *
   *     ₹ 43,391.16    ₹ 54,13,878.4    ₹ 50,00,000
   *
   * That is wrong in three places rather than one. On screen the result
   * values are styled `font-variant-numeric: tabular-nums`, which exists to
   * line figures up in a column and cannot while the decimal point moves.
   * In the downloadable amortisation schedule the columns are aligned with
   * `padStart`, which has the same problem. And a money figure printed to one
   * decimal place ("₹ 54,13,878.4") reads as a truncation bug regardless of
   * where it appears.
   *
   * Two is the number of decimals the smallest unit of the currency has, so
   * it is the one that is right for all three.
   */
  const formatted = absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

  return `${sign}${currency} ${formatted}`
}

/**
 * Format percentage
 * @param value - Percentage value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  if (isNaN(value) || !isFinite(value)) return '0%'
  return `${value.toFixed(decimals)}%`
}

