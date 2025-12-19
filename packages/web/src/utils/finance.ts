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
 * Round to 4 decimal places (for rates/percentages)
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
  
  const monthlyRate = roundPrecise(rate / 12 / 100)
  
  // Handle edge case: zero interest rate
  if (monthlyRate === 0) {
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
  
  const monthlyRate = roundPrecise(rate / 12 / 100)
  
  // Handle edge case: zero return rate
  if (monthlyRate === 0) {
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
  
  const rateDecimal = roundPrecise(rate / 100)
  const n = compoundingFrequency
  const t = time
  
  // Handle edge case: zero interest rate
  if (rateDecimal === 0) {
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
  
  const monthlyRate = rate / 12 / 100
  const emi = calculateEMI(principal, rate, tenure)
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
    const principalFromEMI = roundCurrency(Math.min(emi - interestPayment, balance))
    const effectivePrincipalPayment = roundCurrency(Math.min(principalFromEMI + extraPayment, balance))
    const closingBalance = roundCurrency(Math.max(0, balance - effectivePrincipalPayment))
    
    schedule.push({
      month,
      openingBalance,
      emi: roundCurrency(emi),
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
  if (isNaN(amount) || !isFinite(amount)) return `${currency} 0`
  
  const absAmount = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  
  // Indian numbering: 1,00,000 format
  const formatted = absAmount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
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

