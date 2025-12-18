import { Check, Copy, Upload, X, Workflow, CheckCircle } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import './WorkflowValidator.css'

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  info: string[]
}

const WorkflowValidator = () => {
  const [workflowContent, setWorkflowContent] = useState('')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [error, setError] = useState('')

  const copyWorkflowHook = useCopy()
  const copyResultHook = useCopy()

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setWorkflowContent(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'application/xml': ['.bpmn', '.xml'],
      'text/xml': ['.bpmn', '.xml'],
      'text/plain': ['.txt'],
      'application/json': ['.json']
    }
  })

  const validateWorkflow = useCallback(() => {
    setError('')
    setValidationResult(null)

    if (!workflowContent.trim()) {
      setError('Please enter workflow content')
      return
    }

    const errors: string[] = []
    const warnings: string[] = []
    const info: string[] = []

    try {
      // Basic XML/JSON validation
      if (workflowContent.trim().startsWith('{')) {
        // JSON format
        try {
          JSON.parse(workflowContent)
          info.push('Valid JSON format detected')
        } catch {
          errors.push('Invalid JSON format')
        }
      } else if (workflowContent.trim().startsWith('<')) {
        // XML format
        info.push('XML format detected')
        
        // Basic XML structure checks
        if (!workflowContent.includes('<?xml') && !workflowContent.includes('<bpmn')) {
          warnings.push('Missing XML declaration or BPMN root element')
        }

        // Check for balanced tags
        const openTags = (workflowContent.match(/<[^/!?][^>]*>/g) || []).length
        const closeTags = (workflowContent.match(/<\/[^>]+>/g) || []).length
        if (openTags !== closeTags) {
          errors.push(`Unbalanced XML tags: ${openTags} open, ${closeTags} close`)
        }

        // Check for common BPMN elements
        if (workflowContent.includes('<bpmn:process') || workflowContent.includes('<process')) {
          info.push('BPMN process element found')
        } else {
          warnings.push('No BPMN process element found')
        }

        if (workflowContent.includes('<bpmn:startEvent') || workflowContent.includes('<startEvent')) {
          info.push('Start event found')
        } else {
          warnings.push('No start event found')
        }

        if (workflowContent.includes('<bpmn:endEvent') || workflowContent.includes('<endEvent')) {
          info.push('End event found')
        } else {
          warnings.push('No end event found')
        }
      } else {
        errors.push('Unsupported format. Expected XML or JSON')
      }

      // Check for common issues
      if (workflowContent.length < 100) {
        warnings.push('Workflow content seems too short')
      }

      setValidationResult({
        isValid: errors.length === 0,
        errors,
        warnings,
        info
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed')
    }
  }, [workflowContent])

  const handleClear = useCallback(() => {
    setWorkflowContent('')
    setValidationResult(null)
    setError('')
  }, [])

  const resultText = useMemo(() => {
    if (!validationResult) return ''
    
    let output = `Validation Result: ${validationResult.isValid ? 'VALID' : 'INVALID'}\n\n`
    
    if (validationResult.errors.length > 0) {
      output += `Errors (${validationResult.errors.length}):\n`
      validationResult.errors.forEach((err, i) => {
        output += `  ${i + 1}. ${err}\n`
      })
      output += '\n'
    }
    
    if (validationResult.warnings.length > 0) {
      output += `Warnings (${validationResult.warnings.length}):\n`
      validationResult.warnings.forEach((warn, i) => {
        output += `  ${i + 1}. ${warn}\n`
      })
      output += '\n'
    }
    
    if (validationResult.info.length > 0) {
      output += `Info (${validationResult.info.length}):\n`
      validationResult.info.forEach((inf, i) => {
        output += `  ${i + 1}. ${inf}\n`
      })
    }
    
    return output
  }, [validationResult])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: fileUpload.handleUploadClick,
      title: 'Upload workflow file'
    },
    {
      icon: <CheckCircle size={16} />,
      label: 'Validate',
      onClick: validateWorkflow,
      disabled: !workflowContent.trim(),
      title: 'Validate workflow',
      showDividerBefore: true
    },
    {
      icon: copyWorkflowHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyWorkflowHook.copied ? 'Copied!' : 'Copy',
      onClick: () => copyWorkflowHook.copy(workflowContent, (err) => setError(err)),
      disabled: !workflowContent.trim(),
      title: 'Copy workflow',
      showDividerBefore: true
    },
    {
      icon: copyResultHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyResultHook.copied ? 'Copied!' : 'Copy Result',
      onClick: () => copyResultHook.copy(resultText, (err) => setError(err)),
      disabled: !resultText.trim(),
      title: 'Copy result',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !workflowContent.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      {error && <ErrorBar message={error} />}

      {validationResult && (
        <div className={`workflow-validation-bar ${validationResult.isValid ? 'valid' : 'invalid'}`}>
          <div className="workflow-validation-status">
            <CheckCircle size={16} />
            <span>Validation: {validationResult.isValid ? 'VALID' : 'INVALID'}</span>
            <span className="workflow-validation-counts">
              {validationResult.errors.length > 0 && (
                <span className="workflow-error-count">{validationResult.errors.length} errors</span>
              )}
              {validationResult.warnings.length > 0 && (
                <span className="workflow-warning-count">{validationResult.warnings.length} warnings</span>
              )}
            </span>
          </div>
        </div>
      )}

      <EditorLayout
        left={
          <EditorPanel
            title="Workflow Definition"
            onCopy={() => copyWorkflowHook.copy(workflowContent, (err) => setError(err))}
            copied={copyWorkflowHook.copied}
          >
            <DropzoneTextarea
              {...fileUpload}
              value={workflowContent}
              onChange={(e) => {
                setWorkflowContent(e.target.value)
                setError('')
                setValidationResult(null)
              }}
              placeholder="Enter BPMN workflow XML or JSON definition..."
              spellCheck={false}
              dropzoneText="Drag & drop workflow file or paste"
              dropzoneHint="Supports .bpmn, .xml, or JSON format"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Validation Results"
            onCopy={() => copyResultHook.copy(resultText, (err) => setError(err))}
            copied={copyResultHook.copied}
          >
            <div className="workflow-results">
              {!validationResult ? (
                <div className="workflow-empty-state">
                  <Workflow size={48} />
                  <p>Enter workflow definition and click Validate</p>
                </div>
              ) : (
                <div className="workflow-validation-details">
                  {validationResult.errors.length > 0 && (
                    <div className="workflow-errors">
                      <h4>Errors:</h4>
                      <ul>
                        {validationResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.warnings.length > 0 && (
                    <div className="workflow-warnings">
                      <h4>Warnings:</h4>
                      <ul>
                        {validationResult.warnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.info.length > 0 && (
                    <div className="workflow-info">
                      <h4>Info:</h4>
                      <ul>
                        {validationResult.info.map((inf, i) => (
                          <li key={i}>{inf}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {validationResult.errors.length === 0 && validationResult.warnings.length === 0 && (
                    <div className="workflow-success">
                      <CheckCircle size={48} />
                      <p>Workflow is valid!</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default WorkflowValidator

