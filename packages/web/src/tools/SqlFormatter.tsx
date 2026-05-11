import { Check, Copy, Database, FileCode, Upload, X } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { DropzoneTextarea } from '../components/ui/DropzoneTextarea'
import { EditorLayout } from '../components/ui/EditorLayout'
import { EditorPanel } from '../components/ui/EditorPanel'
import { ErrorBar } from '../components/ui/ErrorBar'
import { ToolContainer } from '../components/ui/ToolContainer'
import { Toolbar } from '../components/ui/Toolbar'
import { useCopy } from '../hooks/useCopy'
import { useFileUpload } from '../hooks/useFileUpload'
import { formatSql, minifySql, validateSql } from '../utils/sql'
import { downloadTextFile } from '../utils/file'
import './SqlFormatter.css'

const EXAMPLES = [
  {
    label: 'SELECT with JOIN',
    sql: 'select u.id, u.name, count(o.id) as order_count from users u left join orders o on o.user_id = u.id where u.active = true group by u.id, u.name order by order_count desc limit 10',
  },
  {
    label: 'INSERT',
    sql: "insert into users (name, email, role, created_at) values ('Alice', 'alice@example.com', 'admin', now()), ('Bob', 'bob@example.com', 'user', now())",
  },
  {
    label: 'UPDATE',
    sql: "update orders set status = 'shipped', shipped_at = now() where id in (select order_id from order_items where quantity > 0) and customer_id = 42",
  },
  {
    label: 'CREATE TABLE',
    sql: 'create table products (id serial primary key, name varchar(255) not null, price decimal(10,2) check (price >= 0), category_id int references categories(id) on delete set null, created_at timestamp default now())',
  },
  {
    label: 'CTE',
    sql: 'with recent_orders as (select user_id, count(*) as cnt from orders where created_at > now() - interval \'30 days\' group by user_id) select u.name, coalesce(r.cnt, 0) as recent_count from users u left join recent_orders r on r.user_id = u.id',
  },
]

const SqlFormatter = () => {
  const [sqlContent, setSqlContent] = useState('')
  const [error, setError] = useState('')

  const copyInputHook = useCopy()
  const copyOutputHook = useCopy()

  const validation = useMemo(() => validateSql(sqlContent), [sqlContent])

  const formattedSql = useMemo(() => {
    if (!sqlContent.trim()) return ''
    if (!validation.isValid) return ''
    return formatSql(sqlContent)
  }, [sqlContent, validation.isValid])

  const fileUpload = useFileUpload({
    onFileRead: (text) => {
      setSqlContent(text)
      setError('')
    },
    onError: (err) => setError(err),
    accept: {
      'text/plain': ['.sql', '.txt'],
      'application/sql': ['.sql']
    }
  })

  const handleFormat = useCallback(() => {
    if (!sqlContent.trim()) {
      setError('Please enter SQL query')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid SQL')
      return
    }

    setSqlContent(formattedSql)
    setError('')
  }, [sqlContent, validation, formattedSql])

  const handleMinify = useCallback(() => {
    if (!sqlContent.trim()) {
      setError('Please enter SQL query')
      return
    }

    if (!validation.isValid) {
      setError(validation.error || 'Invalid SQL')
      return
    }

    const minified = minifySql(sqlContent)
    setSqlContent(minified)
    setError('')
  }, [sqlContent, validation])

  const handleDownload = useCallback(() => {
    const content = formattedSql || sqlContent
    if (!content.trim()) return

    downloadTextFile(content, 'formatted.sql', 'text/plain')
  }, [formattedSql, sqlContent])

  const handleClear = useCallback(() => {
    setSqlContent('')
    setError('')
  }, [])

  const handleLoadExample = useCallback((sql: string) => {
    setSqlContent(sql)
    setError('')
  }, [])

  const toolbarButtons = [
    {
      icon: <Upload size={16} />,
      label: 'Open',
      onClick: fileUpload.handleUploadClick,
      title: 'Upload SQL file'
    },
    {
      icon: copyInputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyInputHook.copied ? 'Copied!' : 'Copy Input',
      onClick: () => copyInputHook.copy(sqlContent, (err) => setError(err)),
      disabled: !sqlContent.trim(),
      title: 'Copy input',
      showDividerBefore: true
    },
    {
      icon: copyOutputHook.copied ? <Check size={16} /> : <Copy size={16} />,
      label: copyOutputHook.copied ? 'Copied!' : 'Copy Output',
      onClick: () => copyOutputHook.copy(formattedSql, (err) => setError(err)),
      disabled: !formattedSql.trim(),
      title: 'Copy output',
    },
    {
      icon: <FileCode size={16} />,
      label: 'Download',
      onClick: handleDownload,
      disabled: !sqlContent.trim(),
      title: 'Download SQL file',
    },
    {
      icon: <X size={16} />,
      label: 'Clear',
      onClick: handleClear,
      disabled: !sqlContent.trim(),
      title: 'Clear',
      showDividerBefore: true
    }
  ]

  return (
    <ToolContainer>
      <Toolbar left={toolbarButtons} />

      <div className="sql-examples-bar">
        <span className="sql-examples-label">Try it</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            type="button"
            className="sql-example-chip"
            onClick={() => handleLoadExample(ex.sql)}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {error && <ErrorBar message={error} />}

      {validation.isValid && sqlContent.trim() && (
        <div className="sql-validation-bar">
          <div className="sql-validation-success">
            <Check size={16} />
            <span>SQL syntax is valid</span>
          </div>
        </div>
      )}

      <EditorLayout
        left={
          <EditorPanel
            title="SQL Query"
            onCopy={() => copyInputHook.copy(sqlContent, (err) => setError(err))}
            copied={copyInputHook.copied}
            headerActions={
              <div className="sql-actions">
                <button
                  type="button"
                  className="sql-action-btn"
                  onClick={handleFormat}
                  disabled={!sqlContent.trim() || !validation.isValid}
                  title="Format SQL"
                >
                  Format
                </button>
                <button
                  type="button"
                  className="sql-action-btn"
                  onClick={handleMinify}
                  disabled={!sqlContent.trim() || !validation.isValid}
                  title="Minify SQL"
                >
                  Minify
                </button>
              </div>
            }
          >
            <DropzoneTextarea
              {...fileUpload}
              value={sqlContent}
              onChange={(e) => {
                setSqlContent(e.target.value)
                setError('')
              }}
              placeholder="Enter SQL query or paste from file..."
              spellCheck={false}
              dropzoneText="Drag & drop SQL file or paste query"
              dropzoneHint="Supports .sql files"
              dropzoneActiveText="Drop file here"
            />
          </EditorPanel>
        }
        right={
          <EditorPanel
            title="Formatted SQL"
            onCopy={() => copyOutputHook.copy(formattedSql, (err) => setError(err))}
            copied={copyOutputHook.copied}
          >
            <div className="sql-results">
              {!sqlContent.trim() ? (
                <div className="sql-empty-state">
                  <Database size={48} />
                  <p>Enter SQL query to format</p>
                </div>
              ) : !validation.isValid ? (
                <div className="sql-error-state">
                  <p>{validation.error || 'Invalid SQL syntax'}</p>
                </div>
              ) : (
                <pre className="sql-formatted">{formattedSql || sqlContent}</pre>
              )}
            </div>
          </EditorPanel>
        }
      />
    </ToolContainer>
  )
}

export default SqlFormatter

