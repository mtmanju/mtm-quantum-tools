import { Binary, Check, Copy, Eye, EyeOff, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import './IpCidrCalculator.css'

interface SubnetResult {
  network: string
  broadcast: string
  firstHost: string
  lastHost: string
  subnetMask: string
  wildcardMask: string
  totalHosts: number
  usableHosts: number
  ipClass: string
  cidr: string
  binaryMask: string
  binaryNetwork: string
  binaryBroadcast: string
  prefix: number
}

function ipToInt(ip: string): number {
  const parts = ip.split('.')
  if (parts.length !== 4) throw new Error('Invalid IP address')
  return parts.reduce((acc, part) => {
    const n = parseInt(part, 10)
    if (isNaN(n) || n < 0 || n > 255) throw new Error('Invalid IP address octet')
    return (acc << 8) | n
  }, 0) >>> 0
}

function intToIp(n: number): string {
  return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.')
}

function calculateSubnet(ip: string, prefix: number): SubnetResult {
  if (prefix < 0 || prefix > 32) throw new Error('CIDR prefix must be between 0 and 32')

  const ipInt = ipToInt(ip)
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const network = (ipInt & mask) >>> 0
  const broadcast = (network | (~mask >>> 0)) >>> 0
  const firstHost = prefix < 31 ? network + 1 : network
  const lastHost = prefix < 31 ? broadcast - 1 : broadcast
  const totalHosts = Math.pow(2, 32 - prefix)
  const usableHosts = prefix < 31 ? totalHosts - 2 : totalHosts
  const wildcard = (~mask) >>> 0

  const firstOctet = (ipInt >>> 24) & 0xff
  const ipClass =
    firstOctet < 128 ? 'A' :
    firstOctet < 192 ? 'B' :
    firstOctet < 224 ? 'C' :
    firstOctet < 240 ? 'D' : 'E'

  const toBinary = (n: number) =>
    n.toString(2).padStart(32, '0').match(/.{8}/g)!.join('.')

  return {
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    firstHost: intToIp(firstHost),
    lastHost: intToIp(lastHost),
    subnetMask: intToIp(mask),
    wildcardMask: intToIp(wildcard),
    totalHosts,
    usableHosts,
    ipClass,
    cidr: `${intToIp(network)}/${prefix}`,
    binaryMask: toBinary(mask),
    binaryNetwork: toBinary(network),
    binaryBroadcast: toBinary(broadcast),
    prefix,
  }
}

const COMMON_PREFIXES = [8, 16, 24, 25, 26, 27, 28, 30, 32]

function formatHosts(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`
  return n.toLocaleString()
}

const IpCidrCalculator = () => {
  const [ipInput, setIpInput] = useState('192.168.1.0')
  const [cidrInput, setCidrInput] = useState('24')
  const [result, setResult] = useState<SubnetResult | null>(null)
  const [error, setError] = useState('')
  const [showBinary, setShowBinary] = useState(false)

  const copyHook = useCopy()

  const calculate = useCallback((ip: string, cidr: string) => {
    setError('')
    const prefix = parseInt(cidr, 10)
    if (!ip.trim() || cidr === '') return
    try {
      const res = calculateSubnet(ip.trim(), prefix)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed')
      setResult(null)
    }
  }, [])

  useEffect(() => {
    calculate(ipInput, cidrInput)
  }, [ipInput, cidrInput, calculate])

  const handleIpChange = useCallback((value: string) => {
    // Support pasting CIDR notation like 192.168.1.0/24
    if (value.includes('/')) {
      const [ip, prefix] = value.split('/')
      setIpInput(ip)
      setCidrInput(prefix ?? cidrInput)
    } else {
      setIpInput(value)
    }
    setError('')
  }, [cidrInput])

  const handleCidrChange = useCallback((value: string) => {
    setCidrInput(value)
    setError('')
  }, [])

  const handleClear = useCallback(() => {
    setIpInput('192.168.1.0')
    setCidrInput('24')
    setError('')
  }, [])

  const buildSummary = useCallback((): string => {
    if (!result) return ''
    return [
      `CIDR:           ${result.cidr}`,
      `Network:        ${result.network}`,
      `Broadcast:      ${result.broadcast}`,
      `Subnet Mask:    ${result.subnetMask}`,
      `Wildcard Mask:  ${result.wildcardMask}`,
      `First Host:     ${result.firstHost}`,
      `Last Host:      ${result.lastHost}`,
      `Total Hosts:    ${result.totalHosts.toLocaleString()}`,
      `Usable Hosts:   ${result.usableHosts.toLocaleString()}`,
      `IP Class:       ${result.ipClass}`,
    ].join('\n')
  }, [result])

  const toolbarButtons = [
    {
      icon: copyHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyHook.copied ? 'Copied!' : 'Copy Summary',
      onClick: () => copyHook.copy(buildSummary(), (err) => setError(err)),
      disabled: !result,
      title: 'Copy subnet summary',
      showDividerBefore: true,
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      title: 'Reset to default',
      showDividerBefore: true,
    },
  ]

  const cards: { label: string; value: string; mono?: boolean }[] = result
    ? [
        { label: 'CIDR Notation', value: result.cidr, mono: true },
        { label: 'Network Address', value: result.network, mono: true },
        { label: 'Broadcast Address', value: result.broadcast, mono: true },
        { label: 'Subnet Mask', value: result.subnetMask, mono: true },
        { label: 'Wildcard Mask', value: result.wildcardMask, mono: true },
        { label: 'First Usable Host', value: result.firstHost, mono: true },
        { label: 'Last Usable Host', value: result.lastHost, mono: true },
        { label: 'Total Hosts', value: formatHosts(result.totalHosts) },
        { label: 'Usable Hosts', value: formatHosts(result.usableHosts) },
      ]
    : []

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <div className="ip-cidr-body">
        {/* Input row */}
        <div className="ip-cidr-input-row">
          <input
            type="text"
            className="ip-input"
            value={ipInput}
            onChange={(e) => handleIpChange(e.target.value)}
            placeholder="e.g. 192.168.1.0 or 10.0.0.0/8"
            spellCheck={false}
            aria-label="IP address"
          />
          <span className="cidr-separator">/</span>
          <input
            type="number"
            className="cidr-input"
            value={cidrInput}
            min={0}
            max={32}
            onChange={(e) => handleCidrChange(e.target.value)}
            placeholder="24"
            aria-label="CIDR prefix"
          />
        </div>

        {/* Common prefix chips */}
        <div className="ip-prefix-chips">
          {COMMON_PREFIXES.map((p) => (
            <button
              key={p}
              type="button"
              className={`ip-prefix-chip ${parseInt(cidrInput, 10) === p ? 'active' : ''}`}
              onClick={() => handleCidrChange(String(p))}
            >
              /{p}
            </button>
          ))}
        </div>

        {/* IP Class badge */}
        {result && (
          <div className="ip-class-row">
            <span className={`ip-class-badge ip-class-${result.ipClass.toLowerCase()}`}>
              Class {result.ipClass}
            </span>
            <button
              type="button"
              className="ip-binary-toggle"
              onClick={() => setShowBinary((s) => !s)}
              title={showBinary ? 'Hide binary' : 'Show binary'}
            >
              {showBinary ? <EyeOff size={14} /> : <Eye size={14} />}
              <Binary size={14} />
              <span>{showBinary ? 'Hide binary' : 'Show binary'}</span>
            </button>
          </div>
        )}

        {/* Results grid */}
        {result && (
          <div className="ip-results-grid">
            {cards.map(({ label, value, mono }) => (
              <div key={label} className="ip-result-card">
                <div className="ip-result-label">{label}</div>
                <div className={`ip-result-value${mono ? ' mono' : ''}`}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Binary section */}
        {result && showBinary && (
          <div className="ip-binary-section">
            <div className="ip-binary-title">Binary Representation</div>
            <div className="ip-binary-table">
              {[
                { label: 'Network', value: result.binaryNetwork },
                { label: 'Subnet Mask', value: result.binaryMask },
                { label: 'Broadcast', value: result.binaryBroadcast },
              ].map(({ label, value }) => (
                <div key={label} className="ip-binary-row">
                  <span className="ip-binary-label">{label}</span>
                  <code className="ip-binary-value">{value}</code>
                </div>
              ))}
            </div>
          </div>
        )}

        {!result && !error && (
          <div className="ip-cidr-placeholder">
            Enter an IP address and CIDR prefix to calculate subnet details.
          </div>
        )}
      </div>
    </ToolContainer>
  )
}

export default IpCidrCalculator
