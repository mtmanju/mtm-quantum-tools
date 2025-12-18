import { Check, Copy, Upload, X, Table, Play } from 'lucide-react'
import { useCallback, useState } from 'react'
import type { ChangeEvent } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import './DmnEvaluator.css'

interface DecisionTable {
  inputs: string[]
  outputs: string[]
  rules: Array<{
    conditions: Record<string, string>
    outputs: Record<string, string>
  }>
}

const DmnEvaluator = () => {
  const [dmnContent, setDmnContent] = useState('')
  const [inputValues, setInputValues] = useState('')
  const [result, setResult] = useState<string>('')
  const [error, setError] = useState('')

  const copyDmnHook = useCopy()
  const copyInputHook = useCopy()
  const copyResultHook = useCopy()

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setDmnContent(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'application/xml': ['.dmn', '.xml'],
      'text/xml': ['.dmn', '.xml'],
      'text/plain': ['.txt']
    }
  })

  const parseDmn = useCallback((content: string): DecisionTable | null => {
    try {
      // Simple JSON-based DMN format for now
      // Format: { "inputs": ["input1", "input2"], "outputs": ["output1"], "rules": [...] }
      const parsed = JSON.parse(content)
      
      if (!parsed.inputs || !parsed.outputs || !parsed.rules) {
        throw new Error('Invalid DMN format')
      }

      return {
        inputs: parsed.inputs,
        outputs: parsed.outputs,
        rules: parsed.rules
      }
    } catch {
      // Try to parse as simple text format
      const lines = content.split('\n').filter(l => l.trim())
      if (lines.length < 2) return null

      // Simple format: first line = inputs, second line = outputs, rest = rules
      const inputs = lines[0].split(',').map(i => i.trim())
      const outputs = lines[1].split(',').map(o => o.trim())
      const rules: Array<{ conditions: Record<string, string>, outputs: Record<string, string> }> = []

      for (let i = 2; i < lines.length; i++) {
        const ruleParts = lines[i].split('|').map(p => p.trim())
        if (ruleParts.length >= inputs.length + outputs.length) {
          const conditions: Record<string, string> = {}
          const ruleOutputs: Record<string, string> = {}

          inputs.forEach((input, idx) => {
            conditions[input] = ruleParts[idx] || ''
          })

          outputs.forEach((output, idx) => {
            ruleOutputs[output] = ruleParts[inputs.length + idx] || ''
          })

          rules.push({ conditions, outputs: ruleOutputs })
        }
      }

      return { inputs, outputs, rules }
    }
  }, [])

  const evaluate = useCallback(() => {
    setError('')
    setResult('')

    if (!dmnContent.trim()) {
      setError('Please enter DMN decision table')
      return
    }

    if (!inputValues.trim()) {
      setError('Please enter input values')
      return
    }

    try {
      const decisionTable = parseDmn(dmnContent)
      if (!decisionTable) {
        setError('Invalid DMN format')
        return
      }

      // Parse input values (JSON or key=value format)
      let inputData: Record<string, string>
      try {
        inputData = JSON.parse(inputValues)
      } catch {
        // Try key=value format
        inputData = {}
        inputValues.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=')
          if (key && valueParts.length > 0) {
            inputData[key.trim()] = valueParts.join('=').trim()
          }
        })
      }

      // Evaluate rules
      for (const rule of decisionTable.rules) {
        let matches = true

        for (const [input, condition] of Object.entries(rule.conditions)) {
          const inputValue = inputData[input]
          if (inputValue === undefined) {
            matches = false
            break
          }

          // Simple condition matching
          if (condition !== '-' && condition !== '*' && condition !== inputValue) {
            // Try numeric comparison
            if (condition.startsWith('>=') || condition.startsWith('<=') || condition.startsWith('>') || condition.startsWith('<')) {
              const numValue = parseFloat(inputValue)
              const numCondition = parseFloat(condition.replace(/[><=]/g, ''))
              
              if (isNaN(numValue) || isNaN(numCondition)) {
                matches = false
                break
              }

              if (condition.startsWith('>=') && numValue < numCondition) matches = false
              else if (condition.startsWith('<=') && numValue > numCondition) matches = false
              else if (condition.startsWith('>') && !condition.startsWith('>=') && numValue <= numCondition) matches = false
              else if (condition.startsWith('<') && !condition.startsWith('<=') && numValue >= numCondition) matches = false
            } else {
              matches = false
              break
            }
          }
        }

        if (matches) {
          setResult(JSON.stringify(rule.outputs, null, 2))
          return
        }
      }

      setResult('No matching rule found')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Evaluation failed')
    }
  }, [dmnContent, inputValues, parseDmn])

  const handleClear = useCallback(() => {
    setDmnContent('')
    setInputValues('')
    setResult('')
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: fileUpload.handleUploadClick,
      title: 'Upload DMN file'
    },
    {
      icon: <Play size={16} />,
      label: 'Evaluate',
      onClick: evaluate,
      disabled: !dmnContent.trim() || !inputValues.trim(),
      title: 'Evaluate decision table',
      showDividerBefore: true
    },
    {
      icon: copyResultHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyResultHook.copied ? 'Copied!' : 'Copy Result',
      onClick: () => copyResultHook.copy(result, (err) => setError(err)),
      disabled: !result.trim(),
      title: 'Copy result',
      showDividerBefore: true
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !dmnContent.trim() && !inputValues.trim(),
      title: 'Clear all',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      <EditorLayout
        left={
          <div className="dmn-input-panel">
            <EditorPanel
              title="DMN Decision Table"
              onCopy={() => copyDmnHook.copy(dmnContent, (err) => setError(err))}
              copied={copyDmnHook.copied}
            >
              <DropzoneTextarea
                {...fileUpload}
                value={dmnContent}
                onChange={(e) => {
                  setDmnContent(e.target.value)
                  setError('')
                }}
                placeholder='Enter DMN decision table (JSON or text format)&#10;Example JSON:&#10;{&#10;  "inputs": ["age", "score"],&#10;  "outputs": ["decision"],&#10;  "rules": [&#10;    { "conditions": {"age": ">=18", "score": ">80"}, "outputs": {"decision": "approved"} }&#10;  ]&#10;}'
                spellCheck={false}
                dropzoneText="Drag & drop DMN file or paste"
                dropzoneHint="Supports .dmn, .xml, or JSON format"
                dropzoneActiveText="Drop file here"
              />
            </EditorPanel>
            <EditorPanel
              title="Input Values"
              onCopy={() => copyInputHook.copy(inputValues, (err) => setError(err))}
              copied={copyInputHook.copied}
            >
              <textarea
                className="dropzone-textarea"
                value={inputValues}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                  setInputValues(e.target.value)
                  setError('')
                }}
                placeholder='Enter input values (JSON or key=value format)&#10;Example JSON: {"age": 25, "score": 85}&#10;Or: age=25&#10;score=85'
                spellCheck={false}
              />
            </EditorPanel>
          </div>
        }
        right={
          <EditorPanel
            title="Evaluation Result"
            onCopy={() => copyResultHook.copy(result, (err) => setError(err))}
            copied={copyResultHook.copied}
          >
            <div className="dmn-results">
              {!result ? (
                <div className="dmn-empty-state">
                  <Table size={48} />
                  <p>Enter DMN decision table and input values, then click Evaluate</p>
                </div>
              ) : (
                <pre className="dmn-result-output">{result}</pre>
              )}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default DmnEvaluator

