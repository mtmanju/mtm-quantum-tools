import { Check, Copy, Upload, X, Code, Info } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { testRegex, highlightMatches, type RegexFlags } from '../utils/regex'
import './RegexTester.css'

const RegexTester = () => {
  const [pattern, setPattern] = useState('')
  const [testString, setTestString] = useState('')
  const [flags, setFlags] = useState<RegexFlags>({
    global: true,
    caseInsensitive: false,
    multiline: false,
    dotAll: false,
    unicode: false,
    sticky: false
  })
  const [error, setError] = useState('')

  const copyPatternHook = useCopy()
  const copyTestStringHook = useCopy()
  const copyResultHook = useCopy()

  const testResult = useMemo(() => {
    if (!pattern.trim() || !testString.trim()) {
      return null
    }
    const result = testRegex(pattern, testString, flags)
    if (!result.isValid) {
      setError(result.error || 'Invalid regex pattern')
    } else {
      setError('')
    }
    return result
  }, [pattern, testString, flags])

  const highlightedParts = useMemo(() => {
    if (!testResult || !testResult.isValid || testResult.matches.length === 0) {
      return null
    }
    return highlightMatches(testString, testResult.matches)
  }, [testResult, testString])

  const resultText = useMemo(() => {
    if (!testResult || !testResult.isValid) return ''
    
    if (testResult.matches.length === 0) {
      return 'No matches found'
    }

    let output = `Found ${testResult.matches.length} match${testResult.matches.length !== 1 ? 'es' : ''}:\n\n`
    
    testResult.matches.forEach((match, index) => {
      output += `Match ${index + 1}:\n`
      output += `  Text: "${match.match}"\n`
      output += `  Position: ${match.index}-${match.index + match.match.length}\n`
      
      if (match.groups.length > 0) {
        output += `  Groups:\n`
        match.groups.forEach((group, i) => {
          output += `    Group ${i + 1}: ${group ? `"${group}"` : '(empty)'}\n`
        })
      }
      
      if (match.namedGroups) {
        output += `  Named Groups:\n`
        Object.entries(match.namedGroups).forEach(([name, value]) => {
          output += `    ${name}: ${value ? `"${value}"` : '(empty)'}\n`
        })
      }
      
      output += '\n'
    })
    
    return output
  }, [testResult])

  const patternFileUpload = useFileUpload({
    onFileRead: (text) => {
      setPattern(text.trim())
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt', '.regex']
    }
  })

  const testStringFileUpload = useFileUpload({
    onFileRead: (text) => {
      setTestString(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.txt']
    }
  })

  const handleClear = useCallback(() => {
    setPattern('')
    setTestString('')
    setError('')
    setFlags({
      global: true,
      caseInsensitive: false,
      multiline: false,
      dotAll: false,
      unicode: false,
      sticky: false
    })
  }, [])

  const toggleFlag = useCallback((flagName: keyof RegexFlags) => {
    setFlags(prev => ({
      ...prev,
      [flagName]: !prev[flagName]
    }))
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: patternFileUpload.handleUploadClick,
      title: 'Upload regex pattern file'
    },
    {
      icon: copyPatternHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyPatternHook.copied ? 'Copied!' : 'Copy Pattern',
      onClick: () => copyPatternHook.copy(pattern, (err) => setError(err)),
      disabled: !pattern.trim(),
      title: 'Copy pattern',
      showDividerBefore: true
    },
    {
      icon: copyTestStringHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyTestStringHook.copied ? 'Copied!' : 'Copy Test',
      onClick: () => copyTestStringHook.copy(testString, (err) => setError(err)),
      disabled: !testString.trim(),
      title: 'Copy test string',
    },
    {
      icon: copyResultHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyResultHook.copied ? 'Copied!' : 'Copy Result',
      onClick: () => copyResultHook.copy(resultText, (err) => setError(err)),
      disabled: !resultText.trim(),
      title: 'Copy results',
      showDividerBefore: true
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !pattern.trim() && !testString.trim(),
      title: 'Clear all',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <div className="regex-flags-bar">
        <div className="regex-flags-label">
          <Info size={14} />
          <span>Flags:</span>
        </div>
        <div className="regex-flags-group">
          <button
            type="button"
            className={`regex-flag-btn ${flags.global ? 'active' : ''}`}
            onClick={() => toggleFlag('global')}
            title="Global - Find all matches"
          >
            g
          </button>
          <button
            type="button"
            className={`regex-flag-btn ${flags.caseInsensitive ? 'active' : ''}`}
            onClick={() => toggleFlag('caseInsensitive')}
            title="Case insensitive"
          >
            i
          </button>
          <button
            type="button"
            className={`regex-flag-btn ${flags.multiline ? 'active' : ''}`}
            onClick={() => toggleFlag('multiline')}
            title="Multiline"
          >
            m
          </button>
          <button
            type="button"
            className={`regex-flag-btn ${flags.dotAll ? 'active' : ''}`}
            onClick={() => toggleFlag('dotAll')}
            title="Dot all"
          >
            s
          </button>
          <button
            type="button"
            className={`regex-flag-btn ${flags.unicode ? 'active' : ''}`}
            onClick={() => toggleFlag('unicode')}
            title="Unicode"
          >
            u
          </button>
          <button
            type="button"
            className={`regex-flag-btn ${flags.sticky ? 'active' : ''}`}
            onClick={() => toggleFlag('sticky')}
            title="Sticky"
          >
            y
          </button>
        </div>
      </div>

      <EditorLayout
        left={
          <div className="regex-input-panel">
            <EditorPanel
              title="Regex Pattern"
              onCopy={() => copyPatternHook.copy(pattern, (err) => setError(err))}
              copied={copyPatternHook.copied}
            >
              <DropzoneTextarea
                {...patternFileUpload}
                value={pattern}
                onChange={(e) => {
                  setPattern(e.target.value)
                  setError('')
                }}
                placeholder="Enter regex pattern (e.g., /hello/g)"
                spellCheck={false}
                dropzoneText="Drag & drop regex pattern file or paste"
                dropzoneHint="Supports .txt or .regex files"
                dropzoneActiveText="Drop file here"
              />
            </EditorPanel>
            <EditorPanel
              title="Test String"
              onCopy={() => copyTestStringHook.copy(testString, (err) => setError(err))}
              copied={copyTestStringHook.copied}
            >
              <DropzoneTextarea
                {...testStringFileUpload}
                value={testString}
                onChange={(e) => {
                  setTestString(e.target.value)
                  setError('')
                }}
                placeholder="Enter text to test against the regex pattern"
                spellCheck={false}
                dropzoneText="Drag & drop test file or paste text"
                dropzoneHint="Supports .txt files"
                dropzoneActiveText="Drop file here"
              />
            </EditorPanel>
          </div>
        }
        right={
          <EditorPanel
            title="Match Results"
            onCopy={() => copyResultHook.copy(resultText, (err) => setError(err))}
            copied={copyResultHook.copied}
          >
            <div className="regex-results">
              {!pattern.trim() || !testString.trim() ? (
                <div className="regex-empty-state">
                  <Code size={48} />
                  <p>Enter a regex pattern and test string to see matches</p>
                </div>
              ) : !testResult || !testResult.isValid ? (
                <div className="regex-error-state">
                  <p>{testResult?.error || 'Invalid regex pattern'}</p>
                </div>
              ) : testResult.matches.length === 0 ? (
                <div className="regex-no-matches">
                  <p>No matches found</p>
                </div>
              ) : (
                <>
                  <div className="regex-highlighted-text">
                    {highlightedParts?.map((part, index) => (
                      <span
                        key={index}
                        className={part.isMatch ? 'regex-match' : ''}
                      >
                        {part.text}
                      </span>
                    ))}
                  </div>
                  <div className="regex-match-details">
                    <pre>{resultText}</pre>
                  </div>
                </>
              )}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default RegexTester

