import { describe, it, expect } from 'vitest'
import {
  calculateEMI,
  calculateTotalInterest,
  calculateSIP,
  calculateSIPInvestment,
  calculateCompoundInterest,
  calculateLoanRepaymentSchedule,
  calculateInvestmentReturn,
  formatCurrency,
  formatPercentage,
} from './finance'

/**
 * Independent, full-precision reference implementations.
 *
 * These are deliberately written from the textbook formulas rather than
 * reusing anything from finance.ts, so they can catch precision drift in
 * the real implementation (notably: rounding an interest rate before
 * compounding it, which used to skew a 20-year EMI by ~₹15,000).
 */
const refEMI = (p: number, annualRatePct: number, months: number) => {
  const r = annualRatePct / 12 / 100
  if (r === 0) return p / months
  const pow = Math.pow(1 + r, months)
  return (p * r * pow) / (pow - 1)
}

const refSIP = (monthly: number, annualRatePct: number, months: number) => {
  const r = annualRatePct / 12 / 100
  if (r === 0) return monthly * months
  const pow = Math.pow(1 + r, months)
  return monthly * ((pow - 1) / r) * (1 + r)
}

describe('calculateEMI', () => {
  // Rates chosen so that rate/12/100 does NOT land on a clean 4-decimal
  // value — these are the cases an intermediate round() corrupts.
  it.each([
    { principal: 5_000_000, rate: 8.5, months: 240 },
    { principal: 2_500_000, rate: 9.35, months: 180 },
    { principal: 500_000, rate: 11.75, months: 36 },
    { principal: 1_000_000, rate: 7.2, months: 60 },
    { principal: 3_750_000, rate: 6.65, months: 300 },
    { principal: 100_000, rate: 18.99, months: 12 },
  ])(
    'matches a full-precision reference for ₹$principal at $rate% over $months months',
    ({ principal, rate, months }) => {
      expect(calculateEMI(principal, rate, months)).toBeCloseTo(
        refEMI(principal, rate, months),
        2
      )
    }
  )

  it('does not round the monthly rate before compounding (regression)', () => {
    // 8.5%/12 = 0.00708333…; rounding to 4dp (0.0071) inflates the EMI by
    // ~₹63/month. Guard the exact known-good value.
    expect(calculateEMI(5_000_000, 8.5, 240)).toBeCloseTo(43_391.16, 2)
  })

  it('treats a 0% loan as straight-line repayment', () => {
    expect(calculateEMI(120_000, 0, 12)).toBe(10_000)
  })

  it('returns 0 for invalid input', () => {
    expect(calculateEMI(0, 8.5, 240)).toBe(0)
    expect(calculateEMI(-1, 8.5, 240)).toBe(0)
    expect(calculateEMI(100_000, -1, 240)).toBe(0)
    expect(calculateEMI(100_000, 8.5, 0)).toBe(0)
  })
})

describe('calculateTotalInterest', () => {
  it('is EMI × tenure minus principal', () => {
    const emi = calculateEMI(1_000_000, 7.2, 60)
    expect(calculateTotalInterest(1_000_000, emi, 60)).toBeCloseTo(emi * 60 - 1_000_000, 2)
  })

  it('never reports negative interest', () => {
    expect(calculateTotalInterest(1_000_000, 100, 12)).toBe(0)
  })
})

describe('calculateSIP', () => {
  it.each([
    { monthly: 10_000, rate: 12, months: 120 },
    { monthly: 5_000, rate: 8.5, months: 240 },
    { monthly: 25_000, rate: 11.35, months: 60 },
  ])(
    'matches a full-precision reference for ₹$monthly/mo at $rate% over $months months',
    ({ monthly, rate, months }) => {
      expect(calculateSIP(monthly, rate, months)).toBeCloseTo(refSIP(monthly, rate, months), 2)
    }
  )

  it('equals total contributions at 0% return', () => {
    expect(calculateSIP(5_000, 0, 24)).toBe(120_000)
  })

  it('always returns at least the invested amount for a positive return', () => {
    const invested = calculateSIPInvestment(10_000, 120)
    expect(calculateSIP(10_000, 12, 120)).toBeGreaterThan(invested)
  })

  it('returns 0 for invalid input', () => {
    expect(calculateSIP(0, 12, 120)).toBe(0)
    expect(calculateSIP(10_000, 12, 0)).toBe(0)
  })
})

describe('calculateCompoundInterest', () => {
  it('matches A = P(1 + r/n)^(nt) at full precision', () => {
    const p = 100_000
    const rate = 7.35
    const years = 10
    const n = 12
    const expected = p * Math.pow(1 + rate / 100 / n, n * years)
    const result = calculateCompoundInterest(p, rate, years, n)
    expect(result.finalAmount).toBeCloseTo(expected, 2)
    expect(result.interestEarned).toBeCloseTo(expected - p, 2)
    expect(result.totalInvestment).toBe(p)
  })

  it('grows with compounding frequency', () => {
    const annual = calculateCompoundInterest(100_000, 10, 10, 1).finalAmount
    const monthly = calculateCompoundInterest(100_000, 10, 10, 12).finalAmount
    const daily = calculateCompoundInterest(100_000, 10, 10, 365).finalAmount
    expect(monthly).toBeGreaterThan(annual)
    expect(daily).toBeGreaterThan(monthly)
  })

  it('earns nothing at 0%', () => {
    const r = calculateCompoundInterest(50_000, 0, 5)
    expect(r.finalAmount).toBe(50_000)
    expect(r.interestEarned).toBe(0)
  })

  it('returns zeroes for invalid input', () => {
    expect(calculateCompoundInterest(0, 10, 5)).toEqual({
      finalAmount: 0,
      interestEarned: 0,
      totalInvestment: 0,
    })
  })
})

describe('calculateLoanRepaymentSchedule', () => {
  const principal = 1_000_000
  const rate = 9
  const months = 120

  it('runs for exactly the tenure when there is no extra payment', () => {
    expect(calculateLoanRepaymentSchedule(principal, rate, months)).toHaveLength(months)
  })

  it('pays the balance down to zero', () => {
    const schedule = calculateLoanRepaymentSchedule(principal, rate, months)
    expect(schedule[schedule.length - 1].closingBalance).toBe(0)
  })

  it('reconciles: principal payments sum to the loan amount', () => {
    const schedule = calculateLoanRepaymentSchedule(principal, rate, months)
    const paid = schedule.reduce((sum, row) => sum + row.principalPayment + row.extraPayment, 0)
    expect(paid).toBeCloseTo(principal, 0)
  })

  it('has a continuous ledger — each opening balance is the prior closing balance', () => {
    const schedule = calculateLoanRepaymentSchedule(principal, rate, months)
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].openingBalance).toBeCloseTo(schedule[i - 1].closingBalance, 2)
    }
  })

  it('uses the same EMI the calculator displays', () => {
    const schedule = calculateLoanRepaymentSchedule(principal, rate, months)
    expect(schedule[0].emi).toBeCloseTo(calculateEMI(principal, rate, months), 2)
  })

  it('shortens the term when extra payments are made', () => {
    const base = calculateLoanRepaymentSchedule(principal, rate, months)
    const accelerated = calculateLoanRepaymentSchedule(principal, rate, months, 5_000)
    expect(accelerated.length).toBeLessThan(base.length)
    expect(accelerated[accelerated.length - 1].closingBalance).toBe(0)
  })

  it('emits nothing when the payment cannot cover the interest', () => {
    // 100% APR on ₹10,00,000 accrues ~₹83,333/mo; a 1200-month term makes the
    // EMI far too small to ever amortise.
    expect(calculateLoanRepaymentSchedule(1_000_000, 100, 1200)).toEqual([])
  })

  it('returns [] for invalid input', () => {
    expect(calculateLoanRepaymentSchedule(0, 9, 120)).toEqual([])
    expect(calculateLoanRepaymentSchedule(100_000, 9, 0)).toEqual([])
  })
})

describe('calculateInvestmentReturn', () => {
  it('computes CAGR from the standard formula', () => {
    const r = calculateInvestmentReturn(100_000, 200_000, 5)
    // 2^(1/5) - 1 = 14.8698…%
    expect(r.cagr).toBeCloseTo(14.8698, 3)
    expect(r.absoluteReturnPercent).toBeCloseTo(100, 4)
    expect(r.totalGain).toBe(100_000)
  })

  it('reports a loss as a negative return', () => {
    const r = calculateInvestmentReturn(100_000, 60_000, 3)
    expect(r.totalGain).toBe(-40_000)
    expect(r.absoluteReturnPercent).toBeCloseTo(-40, 4)
    expect(r.cagr).toBeLessThan(0)
  })

  it('returns zeroes for invalid input', () => {
    expect(calculateInvestmentReturn(0, 100, 5).cagr).toBe(0)
    expect(calculateInvestmentReturn(100, 200, 0).cagr).toBe(0)
  })
})

describe('formatting', () => {
  it('uses the Indian grouping system', () => {
    expect(formatCurrency(5_000_000)).toBe('₹ 50,00,000.00')
    expect(formatCurrency(1_234.5)).toBe('₹ 1,234.50')
  })

  /**
   * The precision used to follow the value, so a row of result tiles could
   * show 2, 1 and 0 decimal places side by side — and both the on-screen
   * tabular-nums alignment and the padStart-aligned schedule columns depend
   * on it not doing that.
   */
  it('pads every amount to two decimal places', () => {
    expect(formatCurrency(50)).toBe('₹ 50.00')
    expect(formatCurrency(5_413_878.4)).toBe('₹ 54,13,878.40')
    expect(formatCurrency(43_391.156)).toBe('₹ 43,391.16')
  })

  it('keeps the sign outside the symbol', () => {
    expect(formatCurrency(-2_500)).toBe('-₹ 2,500.00')
  })

  it('degrades safely on non-finite input', () => {
    expect(formatCurrency(NaN)).toBe('₹ 0.00')
    expect(formatCurrency(Infinity)).toBe('₹ 0.00')
    expect(formatPercentage(NaN)).toBe('0%')
  })

  it('formats percentages to the requested precision', () => {
    expect(formatPercentage(8.5)).toBe('8.50%')
    expect(formatPercentage(8.5, 0)).toBe('9%')
  })
})

describe('repayment schedule length', () => {
  /**
   * The EMI is rounded to the smallest currency unit, so N instalments of it
   * cannot exactly clear the principal. The residue used to survive the
   * payoff threshold and spawn a whole extra month — a 20-year loan reported
   * "241 months" and "-1 months saved" with no extra payment made.
   */
  it('amortises in exactly the contractual number of months', () => {
    expect(calculateLoanRepaymentSchedule(5_000_000, 8.5, 240, 0)).toHaveLength(240)
    expect(calculateLoanRepaymentSchedule(1_000_000, 10, 120, 0)).toHaveLength(120)
    expect(calculateLoanRepaymentSchedule(2_500_000, 7.25, 180, 0)).toHaveLength(180)
    expect(calculateLoanRepaymentSchedule(800_000, 12, 60, 0)).toHaveLength(60)
  })

  it('clears the balance to exactly zero on the final instalment', () => {
    const s = calculateLoanRepaymentSchedule(5_000_000, 8.5, 240, 0)
    expect(s[s.length - 1].closingBalance).toBe(0)
  })

  it('reports what the final instalment actually collected', () => {
    // The settled instalment is larger than the nominal EMI by the residue,
    // so the row must still reconcile against its own columns.
    const s = calculateLoanRepaymentSchedule(5_000_000, 8.5, 240, 0)
    const last = s[s.length - 1]
    expect(last.emi).toBeCloseTo(last.principalPayment + last.interestPayment, 2)
    expect(last.emi).toBeGreaterThanOrEqual(calculateEMI(5_000_000, 8.5, 240))
  })

  it('still finishes early when extra payments are made', () => {
    const withExtra = calculateLoanRepaymentSchedule(5_000_000, 8.5, 240, 10_000)
    expect(withExtra.length).toBeLessThan(240)
    expect(withExtra[withExtra.length - 1].closingBalance).toBe(0)
  })
})
