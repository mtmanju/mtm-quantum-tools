/**
 * Financial calculation utilities
 */

/**
 * Calculate EMI (Equated Monthly Installment)
 * @param principal - Loan amount
 * @param rate - Annual interest rate (as percentage)
 * @param tenure - Loan tenure in months
 * @returns Monthly EMI amount
 */
export const calculateEMI = (principal: number, rate: number, tenure: number): number => {
  if (principal <= 0 || rate < 0 || tenure <= 0) return 0
  
  const monthlyRate = rate / 12 / 100
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / 
              (Math.pow(1 + monthlyRate, tenure) - 1)
  
  return isNaN(emi) || !isFinite(emi) ? 0 : emi
}

/**
 * Calculate total interest paid over loan tenure
 * @param principal - Loan amount
 * @param emi - Monthly EMI
 * @param tenure - Loan tenure in months
 * @returns Total interest paid
 */
export const calculateTotalInterest = (principal: number, emi: number, tenure: number): number => {
  return Math.max(0, (emi * tenure) - principal)
}

/**
 * Calculate SIP (Systematic Investment Plan) future value
 * @param monthlyAmount - Monthly SIP amount
 * @param rate - Annual expected return (as percentage)
 * @param tenure - Investment period in months
 * @returns Future value of SIP
 */
export const calculateSIP = (monthlyAmount: number, rate: number, tenure: number): number => {
  if (monthlyAmount <= 0 || rate < 0 || tenure <= 0) return 0
  
  const monthlyRate = rate / 12 / 100
  const futureValue = monthlyAmount * 
    ((Math.pow(1 + monthlyRate, tenure) - 1) / monthlyRate) * 
    (1 + monthlyRate)
  
  return isNaN(futureValue) || !isFinite(futureValue) ? 0 : futureValue
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
 * @param principal - Initial investment
 * @param rate - Annual interest rate (as percentage)
 * @param time - Time period in years
 * @param compoundingFrequency - Number of times interest is compounded per year (default: 12 for monthly)
 * @returns Object with final amount, interest earned, and breakdown
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
  
  const rateDecimal = rate / 100
  const finalAmount = principal * Math.pow(1 + rateDecimal / compoundingFrequency, compoundingFrequency * time)
  const interestEarned = finalAmount - principal
  
  return {
    finalAmount: isNaN(finalAmount) || !isFinite(finalAmount) ? 0 : finalAmount,
    interestEarned: isNaN(interestEarned) || !isFinite(interestEarned) ? 0 : interestEarned,
    totalInvestment: principal
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
  
  let balance = principal
  const maxMonths = Math.min(tenure * 2, 1200) // Safety limit: max 2x tenure or 100 years
  
  for (let month = 1; month <= maxMonths && balance > 0.01; month++) {
    const interestPayment = balance * monthlyRate
    const principalPayment = Math.min(emi - interestPayment, balance)
    const effectivePrincipalPayment = Math.min(principalPayment + extraPayment, balance)
    const closingBalance = balance - effectivePrincipalPayment
    
    schedule.push({
      month,
      openingBalance: balance,
      emi,
      principalPayment,
      interestPayment,
      extraPayment,
      closingBalance: Math.max(0, closingBalance)
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
    absoluteReturn: isNaN(absoluteReturn) || !isFinite(absoluteReturn) ? 0 : absoluteReturn,
    absoluteReturnPercent: isNaN(absoluteReturnPercent) || !isFinite(absoluteReturnPercent) ? 0 : absoluteReturnPercent,
    cagr: isNaN(cagrPercent) || !isFinite(cagrPercent) ? 0 : cagrPercent,
    totalGain: isNaN(totalGain) || !isFinite(totalGain) ? 0 : totalGain
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

