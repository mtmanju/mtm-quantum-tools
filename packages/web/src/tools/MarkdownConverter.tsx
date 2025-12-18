import { BorderStyle, Document, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from 'docx'
import { saveAs } from 'file-saver'
import { AlertCircle, Check, Copy, Download, Upload, X } from 'lucide-react'
import MarkdownIt from 'markdown-it'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import './MarkdownConverter.css'

// Initialize markdown parser
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
})

// Dynamic import of mermaid
let mermaid: any = null;

const initMermaid = async () => {
  if (!mermaid) {
    const mermaidModule = await import('mermaid');
    mermaid = mermaidModule.default;
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'Arial',
      logLevel: 'error'
    });
  }
  return mermaid;
}

const MarkdownConverter = () => {
  const [markdownContent, setMarkdownContent] = useState('')
  const [fileName, setFileName] = useState('')
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  // Render markdown to HTML and process mermaid blocks
  const htmlPreview = useMemo(() => {
    if (!markdownContent.trim()) return ''
    try {
      // First, render markdown normally - markdown-it will create <pre><code class="language-mermaid">...</code></pre>
      let html = md.render(markdownContent)
      
      // Use DOM parser to reliably extract mermaid code blocks
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const mermaidCodeBlocks = doc.querySelectorAll('pre code.language-mermaid')
      
      if (mermaidCodeBlocks.length > 0) {
        mermaidCodeBlocks.forEach((codeBlock, index) => {
          const code = codeBlock.textContent || ''
          if (!code.trim()) return
          
          // Replace the parent <pre> element with mermaid diagram div
          const preElement = codeBlock.parentElement
          if (preElement) {
            const mermaidDiv = doc.createElement('div')
            mermaidDiv.className = 'mermaid-diagram'
            mermaidDiv.setAttribute('data-mermaid-code', encodeURIComponent(code.trim()))
            mermaidDiv.setAttribute('data-mermaid-index', index.toString())
            preElement.replaceWith(mermaidDiv)
          }
        })
        
        // Get the updated HTML
        html = doc.body.innerHTML
      }
      
      return html
    } catch (err) {
      console.error('Error rendering markdown:', err)
      return '<p>Error rendering markdown</p>'
    }
  }, [markdownContent])

  // Render mermaid diagrams in preview
  useEffect(() => {
    if (!htmlPreview || !previewRef.current) return

    const renderMermaidDiagrams = async () => {
      const mermaidDivs = previewRef.current?.querySelectorAll('.mermaid-diagram')
      if (!mermaidDivs || mermaidDivs.length === 0) return

      const m = await initMermaid()
      
      // Use Promise.all to wait for all diagrams to render
      await Promise.all(
        Array.from(mermaidDivs).map(async (div, index) => {
          const encodedCode = div.getAttribute('data-mermaid-code')
          if (!encodedCode) return
          
          const code = decodeURIComponent(encodedCode)
          if (!code.trim()) return

          try {
            const id = `mermaid-${index}-${Date.now()}`
            const { svg } = await m.render(id, code)
            
            if (div) {
              div.innerHTML = `<div class="mermaid-preview">${svg}</div>`
            }
          } catch (err) {
            console.error('Mermaid render error:', err)
            if (div) {
              div.innerHTML = `<div class="mermaid-error">Error rendering Mermaid diagram: ${err instanceof Error ? err.message : 'Unknown error'}</div>`
            }
          }
        })
      )
    }

    // Use requestAnimationFrame to ensure DOM is updated
    const rafId = requestAnimationFrame(() => {
      setTimeout(() => {
        renderMermaidDiagrams()
      }, 50)
    })

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [htmlPreview])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setFileName(file.name.replace(/\.(md|markdown)$/i, ''))
      setError('')
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        setMarkdownContent(text)
      }
      reader.onerror = () => {
        setError('Failed to read file')
      }
      reader.readAsText(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md', '.markdown']
    },
    multiple: false,
    noClick: true
  })

  const handleUploadClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        setFileName(file.name.replace(/\.(md|markdown)$/i, ''))
        setError('')
        const reader = new FileReader()
        reader.onload = (event) => {
          const text = event.target?.result as string
          setMarkdownContent(text)
        }
        reader.onerror = () => {
          setError('Failed to read file')
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }, [])

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }, [])

  const handleClear = useCallback(() => {
    setMarkdownContent('')
    setFileName('')
    setError('')
    setCopied(false)
  }, [])

  const renderMermaidToImage = async (code: string, index: number): Promise<{ data: Uint8Array, width: number, height: number, base64: string } | null> => {
    try {
      const m = await initMermaid();
      const id = `mermaid-diagram-${index}-${Date.now()}`;

      const { svg } = await m.render(id, code);

      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;

      let width = 800;
      let height = 600;

      const viewBox = svgElement.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(' ');
        width = Math.ceil(parseFloat(parts[2])) || 800;
        height = Math.ceil(parseFloat(parts[3])) || 600;
      }

      const minWidth = 400;
      const minHeight = 300;
      if (width < minWidth || height < minHeight) {
        const scale = Math.max(minWidth / width, minHeight / height, 2.0);
        width = Math.ceil(width * scale);
        height = Math.ceil(height * scale);
      }

      const maxWidth = 1200;
      const maxHeight = 1000;
      if (width > maxWidth || height > maxHeight) {
        const scale = Math.min(maxWidth / width, maxHeight / height);
        width = Math.ceil(width * scale);
        height = Math.ceil(height * scale);
      }

      const svgString = new XMLSerializer().serializeToString(svgElement);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: false,
      });

      if (!ctx) {
        return null;
      }

      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      return new Promise((resolve, reject) => {
        img.onload = () => {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }

            const reader = new FileReader();
            reader.onload = () => {
              const arrayBuffer = reader.result as ArrayBuffer;
              const uint8Array = new Uint8Array(arrayBuffer);
              const base64 = canvas.toDataURL('image/png');
              URL.revokeObjectURL(url);
              resolve({ data: uint8Array, width, height, base64 });
            };
            reader.onerror = () => reject(new Error('Failed to read blob'));
            reader.readAsArrayBuffer(blob);
          }, 'image/png');
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG image'));
        };

        img.src = url;
      });
    } catch (error) {
      console.error('Error rendering mermaid diagram:', error);
      return null;
    }
  };

  const convertToDocx = useCallback(async () => {
    if (!markdownContent.trim()) {
      setError('Please upload or enter markdown content')
      return
    }

    setIsConverting(true)
    setError('')

    try {
      const lines = markdownContent.split('\n')
      const children: (Paragraph | Table)[] = []
      let inCodeBlock = false
      let codeBlockContent: string[] = []
      let inTable = false
      let tableRows: string[][] = []
      let tableHeaders: string[] = []
      let listItems: string[] = []
      let listType: 'ul' | 'ol' | null = null

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const trimmedLine = line.trim()

        if (trimmedLine.startsWith('```')) {
          if (inCodeBlock) {
            const codeText = codeBlockContent.join('\n')
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: codeText,
                    font: 'Courier New',
                    size: 20,
                  }),
                ],
                spacing: { after: 200 },
              })
            )
            codeBlockContent = []
            inCodeBlock = false
          } else {
            inCodeBlock = true
          }
          continue
        }

        if (inCodeBlock) {
          codeBlockContent.push(line)
          continue
        }

        if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
          if (!inTable) {
            inTable = true
            tableRows = []
            const headerRow = trimmedLine.split('|').map(c => c.trim()).filter(c => c && !c.match(/^:?-+:?$/))
            tableHeaders = headerRow
            continue
          } else {
            const cells = trimmedLine.split('|').map(c => c.trim()).filter(c => c)
            if (cells.length > 0) {
              tableRows.push(cells)
            }
            continue
          }
        } else if (inTable) {
          if (tableRows.length > 0) {
            const tableCells = [
              new TableRow({
                children: tableHeaders.map(header =>
                  new TableCell({
                    children: [new Paragraph(header)],
                    width: { size: 100 / tableHeaders.length, type: WidthType.PERCENTAGE },
                  })
                ),
              }),
              ...tableRows.map(row =>
                new TableRow({
                  children: row.map(cell =>
                    new TableCell({
                      children: [new Paragraph(cell)],
                      width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
                    })
                  ),
                })
              ),
            ]

            children.push(
              new Table({
                rows: tableCells,
                width: { size: 100, type: WidthType.PERCENTAGE },
              })
            )
          }
          inTable = false
          tableRows = []
          tableHeaders = []
        }

        if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          if (listType !== 'ul') {
            if (listItems.length > 0 && listType === 'ol') {
              listItems.forEach(item => {
                children.push(
                  new Paragraph({
                    text: item.replace(/^\d+\.\s*/, ''),
                    bullet: { level: 0 },
                  })
                )
              })
            }
            listItems = []
            listType = 'ul'
          }
          listItems.push(trimmedLine)
          continue
        }

        if (/^\d+\.\s/.test(trimmedLine)) {
          if (listType !== 'ol') {
            if (listItems.length > 0 && listType === 'ul') {
              listItems.forEach(item => {
                children.push(
                  new Paragraph({
                    text: item.replace(/^[-*]\s*/, ''),
                    bullet: { level: 0 },
                  })
                )
              })
            }
            listItems = []
            listType = 'ol'
          }
          listItems.push(trimmedLine)
          continue
        }

        if (listItems.length > 0) {
          listItems.forEach(item => {
            const text = item.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '')
            children.push(
              new Paragraph({
                text,
                bullet: { level: 0 },
              })
            )
          })
          listItems = []
          listType = null
        }

        if (trimmedLine.startsWith('# ')) {
          children.push(
            new Paragraph({
              text: trimmedLine.replace(/^#\s+/, ''),
              heading: HeadingLevel.HEADING_1,
            })
          )
        } else if (trimmedLine.startsWith('## ')) {
          children.push(
            new Paragraph({
              text: trimmedLine.replace(/^##\s+/, ''),
              heading: HeadingLevel.HEADING_2,
            })
          )
        } else if (trimmedLine.startsWith('### ')) {
          children.push(
            new Paragraph({
              text: trimmedLine.replace(/^###\s+/, ''),
              heading: HeadingLevel.HEADING_3,
            })
          )
        } else if (trimmedLine.startsWith('#### ')) {
          children.push(
            new Paragraph({
              text: trimmedLine.replace(/^####\s+/, ''),
              heading: HeadingLevel.HEADING_4,
            })
          )
        } else if (trimmedLine.startsWith('---') || trimmedLine.startsWith('***')) {
          children.push(
            new Paragraph({
              text: '',
              border: {
                bottom: {
                  color: '000000',
                  size: 6,
                  style: BorderStyle.SINGLE,
                },
              },
            })
          )
        } else if (trimmedLine.startsWith('> ')) {
          children.push(
            new Paragraph({
              text: trimmedLine.replace(/^>\s+/, ''),
              indent: { left: 400 },
            })
          )
        } else if (trimmedLine) {
          let text = trimmedLine
          const runs: TextRun[] = []

          while (text) {
            if (text.startsWith('**') && text.indexOf('**', 2) !== -1) {
              const end = text.indexOf('**', 2)
              runs.push(new TextRun({ text: text.substring(2, end), bold: true }))
              text = text.substring(end + 2)
            } else if (text.startsWith('*') && text.indexOf('*', 1) !== -1 && !text.startsWith('**')) {
              const end = text.indexOf('*', 1)
              runs.push(new TextRun({ text: text.substring(1, end), italics: true }))
              text = text.substring(end + 1)
            } else if (text.startsWith('`') && text.indexOf('`', 1) !== -1) {
              const end = text.indexOf('`', 1)
              runs.push(new TextRun({ text: text.substring(1, end), font: 'Courier New' }))
              text = text.substring(end + 1)
            } else {
              const nextSpecial = Math.min(
                text.indexOf('**') !== -1 ? text.indexOf('**') : Infinity,
                text.indexOf('*') !== -1 && !text.startsWith('**') ? text.indexOf('*') : Infinity,
                text.indexOf('`') !== -1 ? text.indexOf('`') : Infinity
              )
              if (nextSpecial !== Infinity) {
                runs.push(new TextRun({ text: text.substring(0, nextSpecial) }))
                text = text.substring(nextSpecial)
              } else {
                runs.push(new TextRun({ text }))
                break
              }
            }
          }

          children.push(new Paragraph({ children: runs }))
        } else {
          children.push(new Paragraph(''))
        }
      }

      if (listItems.length > 0) {
        listItems.forEach(item => {
          const text = item.replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '')
          children.push(
            new Paragraph({
              text,
              bullet: { level: 0 },
            })
          )
        })
      }

      const mermaidRegex = /```mermaid\n([\s\S]*?)```/g
      let mermaidMatch
      let mermaidIndex = 0

      while ((mermaidMatch = mermaidRegex.exec(markdownContent)) !== null) {
        const mermaidCode = mermaidMatch[1]
        const imageData = await renderMermaidToImage(mermaidCode, mermaidIndex++)

        if (imageData) {
          const imageParagraph = new Paragraph({
            children: [
              new ImageRun({
                data: imageData.data,
                transformation: {
                  width: imageData.width * 0.75,
                  height: imageData.height * 0.75,
                },
                type: 'png',
              } as any),
            ],
          })

          children.push(imageParagraph)
        }
      }

      const doc = new Document({
        sections: [
          {
            properties: {
              page: {
                size: {
                  orientation: 'portrait',
                  width: 12240,
                  height: 15840,
                },
                margin: {
                  top: 1440,
                  right: 1440,
                  bottom: 1440,
                  left: 1440,
                },
              },
            },
            children,
          },
        ],
      })

      const blob = await Packer.toBlob(doc)
      saveAs(blob, `${fileName || 'document'}.docx`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setIsConverting(false)
    }
  }, [markdownContent, fileName])

  return (
    <div className="converter-container" {...getRootProps()}>
      <input {...getInputProps()} />
      
      <div className="converter-toolbar">
        <div className="converter-toolbar-left">
          <button
            type="button"
            className="converter-toolbar-btn"
            onClick={handleUploadClick}
            title="Upload Markdown file or drag & drop"
          >
            <Upload size={16} />
            <span>Open</span>
          </button>
          <div className="converter-toolbar-divider" />
          <button
            type="button"
            className="converter-toolbar-btn"
            onClick={() => handleCopy(markdownContent)}
            disabled={!markdownContent.trim()}
            title="Copy Markdown"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            type="button"
            className="converter-toolbar-btn"
            onClick={convertToDocx}
            disabled={!markdownContent.trim() || isConverting}
            title="Convert to DOCX"
          >
            <Download size={16} />
            <span>{isConverting ? 'Converting...' : 'Save'}</span>
          </button>
          <div className="converter-toolbar-divider" />
          <button
            type="button"
            className="converter-toolbar-btn"
            onClick={handleClear}
            disabled={!markdownContent.trim()}
            title="Clear"
          >
            <X size={16} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="converter-error-bar">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="converter-editor-layout">
        <div className="converter-panel converter-panel-left">
          <div className="converter-panel-header">
            <span className="converter-panel-title">Markdown</span>
            <button
              type="button"
              className="converter-panel-copy-btn"
              onClick={() => handleCopy(markdownContent)}
              disabled={!markdownContent.trim()}
              title="Copy Markdown"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <div className="converter-dropzone-wrapper">
            {isDragActive && (
              <div {...getRootProps()} className="converter-dropzone active">
                <input {...getInputProps()} />
                <div className="converter-dropzone-icon">
                  <Upload size={32} strokeWidth={2} />
                </div>
                <p className="converter-dropzone-text">Drop Markdown file here</p>
                <p className="converter-dropzone-hint">Supports .md, .markdown files</p>
              </div>
            )}
            <textarea
              className="converter-editor"
              value={markdownContent}
              onChange={(e) => {
                setMarkdownContent(e.target.value)
                setError('')
              }}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData('text')
                if (pastedText && !markdownContent) {
                  setMarkdownContent(pastedText)
                  setError('')
                }
              }}
              placeholder={markdownContent ? '' : 'Paste Markdown content here or drag & drop a file...'}
              spellCheck={false}
            />
          </div>
        </div>

        <div className="converter-panel converter-panel-right">
          <div className="converter-panel-header">
            <span className="converter-panel-title">Preview</span>
            <div className="converter-panel-header-right">
              {markdownContent && (
                <button
                  type="button"
                  className="converter-panel-download-btn"
                  onClick={convertToDocx}
                  disabled={isConverting}
                  title="Download DOCX"
                >
                  <Download size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="converter-preview" ref={previewRef}>
            {htmlPreview ? (
              <div 
                className="converter-preview-content"
                dangerouslySetInnerHTML={{ __html: htmlPreview }}
              />
            ) : (
              <div className="converter-preview-placeholder">
                Rendered preview will appear here...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MarkdownConverter
