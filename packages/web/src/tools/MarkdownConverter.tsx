import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'
import { FileText, Download, Upload, AlertCircle } from 'lucide-react'
import './MarkdownConverter.css'

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

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setFileName(file.name.replace('.md', ''))
      setError('')
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        setMarkdownContent(text)
      }
      reader.readAsText(file)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md', '.markdown']
    },
    multiple: false
  })

  const renderMermaidToImage = async (code: string, index: number): Promise<{ data: Uint8Array, width: number, height: number, base64: string } | null> => {
    try {
      const m = await initMermaid();
      const id = `mermaid-diagram-${index}-${Date.now()}`;

      // Render mermaid to SVG
      const { svg } = await m.render(id, code);

      // Parse SVG to get dimensions
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svg, 'image/svg+xml');
      const svgElement = svgDoc.documentElement;

      // Get dimensions from viewBox or default
      let width = 800;
      let height = 600;

      const viewBox = svgElement.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(' ');
        width = Math.ceil(parseFloat(parts[2])) || 800;
        height = Math.ceil(parseFloat(parts[3])) || 600;
      }

      // Scale UP small diagrams for better quality (2x minimum)
      const minWidth = 400;
      const minHeight = 300;
      if (width < minWidth || height < minHeight) {
        const scale = Math.max(minWidth / width, minHeight / height, 2.0);
        width = Math.ceil(width * scale);
        height = Math.ceil(height * scale);
      }

      // Ensure maximum dimensions (for very large diagrams)
      const maxWidth = 1200;
      const maxHeight = 1000;
      if (width > maxWidth || height > maxHeight) {
        const scale = Math.min(maxWidth / width, maxHeight / height);
        width = Math.ceil(width * scale);
        height = Math.ceil(height * scale);
      }


      // Embed SVG in an HTML img with proper encoding to avoid CORS
      const svgString = new XMLSerializer().serializeToString(svgElement);

      // Create high-quality canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', {
        alpha: false,
        desynchronized: false,
      });

      if (!ctx) {
        console.error('❌ Could not get canvas context');
        return null;
      }

      // Enable high-quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Use data URL instead of blob URL to avoid CORS
      const encodedSvg = encodeURIComponent(svgString)
        .replace(/'/g, '%27')
        .replace(/"/g, '%22');
      const dataUrl = `data:image/svg+xml,${encodedSvg}`;

      return new Promise((resolve) => {
        const img = new Image();

        const timeout = setTimeout(() => {
          resolve(null);
        }, 5000);

        img.onload = () => {
          clearTimeout(timeout);
          try {
            ctx.drawImage(img, 0, 0, width, height);

            // Use canvas.toDataURL as alternative to toBlob
            try {
              const dataUrl = canvas.toDataURL('image/png', 1.0);
              // Convert data URL to Uint8Array
              const base64 = dataUrl.split(',')[1];
              const binaryString = atob(base64);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              // Verify PNG signature (first 8 bytes should be: 137 80 78 71 13 10 26 10)
              const isPNG = bytes.length > 8 &&
                bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;

              if (!isPNG) {
                resolve(null);
                return;
              }

              resolve({ data: bytes, width, height, base64 });
            } catch (dataUrlError) {
              resolve(null);
            }
          } catch (error) {
            clearTimeout(timeout);
            resolve(null);
          }
        };

        img.onerror = () => {
          clearTimeout(timeout);
          resolve(null);
        };

        // Set image source
        img.src = dataUrl;
      });
    } catch (error) {
      return null;
    }
  }

  // Helper function to parse inline markdown (bold, italic, code, links, strikethrough)
  const parseInlineMarkdown = (text: string): TextRun[] => {
    const runs: TextRun[] = []

    // Enhanced regex to capture: **bold**, *italic*, `code`, [link](url), ~~strikethrough~~
    const regex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\(([^)]+)\)|~~[^~]+~~)/g

    let lastIndex = 0
    let match

    while ((match = regex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        runs.push(new TextRun({
          text: text.substring(lastIndex, match.index),
          font: 'Calibri',
          size: 22,
        }))
      }

      const matched = match[0]

      // ***Bold + Italic***
      if (matched.startsWith('***') && matched.endsWith('***')) {
        runs.push(new TextRun({
          text: matched.slice(3, -3),
          bold: true,
          italics: true,
          font: 'Calibri',
          size: 22,
        }))
      }
      // **Bold**
      else if (matched.startsWith('**') && matched.endsWith('**')) {
        runs.push(new TextRun({
          text: matched.slice(2, -2),
          bold: true,
          font: 'Calibri',
          size: 22,
        }))
      }
      // *Italic*
      else if (matched.startsWith('*') && matched.endsWith('*')) {
        runs.push(new TextRun({
          text: matched.slice(1, -1),
          italics: true,
          font: 'Calibri',
          size: 22,
        }))
      }
      // `Code`
      else if (matched.startsWith('`') && matched.endsWith('`')) {
        runs.push(new TextRun({
          text: matched.slice(1, -1),
          font: 'Courier New',
          size: 20,
          color: 'C83200',
          shading: {
            fill: 'F5F5F5',
          },
        }))
      }
      // [Link](url)
      else if (match[2] && match[3]) {
        runs.push(new TextRun({
          text: match[2],
          font: 'Calibri',
          size: 22,
          color: '0563C1',
          underline: {},
        }))
      }
      // ~~Strikethrough~~
      else if (matched.startsWith('~~') && matched.endsWith('~~')) {
        runs.push(new TextRun({
          text: matched.slice(2, -2),
          strike: true,
          font: 'Calibri',
          size: 22,
        }))
      }

      lastIndex = regex.lastIndex
    }

    // Add remaining text
    if (lastIndex < text.length) {
      runs.push(new TextRun({
        text: text.substring(lastIndex),
        font: 'Calibri',
        size: 22,
      }))
    }

    return runs.length > 0 ? runs : [new TextRun({ text, font: 'Calibri', size: 22 })]
  }

  const convertToDocx = async () => {
    if (!markdownContent) return

    setIsConverting(true)
    setError('')

    try {
      const lines = markdownContent.split('\n')

      const children: (Paragraph | Table)[] = []
      let i = 0
      let mermaidIndex = 0
      let inCodeBlock = false
      let codeBlockContent: string[] = []
      let codeBlockLanguage = ''

      while (i < lines.length) {
        const line = lines[i]

        // Handle code blocks (including Mermaid)
        if (line.trim().startsWith('```')) {
          const language = line.trim().substring(3).trim()

          // Start of code block
          if (!inCodeBlock) {
            inCodeBlock = true
            codeBlockLanguage = language
            codeBlockContent = []
            i++
            continue
          }
        }

        // Inside code block - collect lines
        if (inCodeBlock && !line.trim().startsWith('```')) {
          codeBlockContent.push(line)
          i++
          continue
        }

        // End of code block
        if (inCodeBlock && line.trim().startsWith('```')) {
          inCodeBlock = false

          // Handle Mermaid diagrams
          if (codeBlockLanguage === 'mermaid') {
            const mermaidCode = codeBlockContent.join('\n').trim()

            if (mermaidCode) {
              const imageResult = await renderMermaidToImage(mermaidCode, mermaidIndex++);

              if (imageResult && imageResult.data && imageResult.data.length > 0) {
                try {
                  // Calculate display dimensions to fit within page margins
                  // A4: 210mm (8.27") wide, minus 1" margins (0.5" each side) = 7.27" usable
                  // Convert to pixels for docx (96 DPI): 7.27" × 96 = 698px usable width
                  // A4 height: 297mm (11.69"), minus 1" margins = 10.69" = 1026px usable
                  const pageWidth = 680; // Max width to fit in A4 margins (with padding)
                  const pageHeight = 1000; // Max height before page break on A4

                  // Get aspect ratio from actual image
                  const aspectRatio = imageResult.width / imageResult.height;

                  let displayWidth = Math.min(imageResult.width, pageWidth);
                  let displayHeight = Math.round(displayWidth / aspectRatio);

                  // If height exceeds page, scale down based on height
                  if (displayHeight > pageHeight) {
                    displayHeight = pageHeight;
                    displayWidth = Math.round(displayHeight * aspectRatio);
                  }

                  // Create image run using base64 data URL (most compatible with docx library)

                  // @ts-expect-error - docx library accepts Uint8Array despite type definition
                  const imageRun = new ImageRun({
                    data: imageResult.data,
                    transformation: {
                      width: displayWidth,
                      height: displayHeight,
                    },
                  });

                  const imageParagraph = new Paragraph({
                    children: [imageRun],
                    spacing: { before: 120, after: 120 },
                    keepNext: false, // Don't keep with next paragraph
                    keepLines: false, // Allow page breaks within
                  });

                  children.push(imageParagraph);
                } catch (error) {
                  children.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: '📊 [Mermaid Diagram - Failed to insert]',
                          italics: true,
                          color: '666666'
                        })
                      ],
                      spacing: { before: 240, after: 240 },
                    })
                  );
                }
              } else {
                children.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: '📊 [Mermaid Diagram - Render failed]',
                        italics: true,
                        color: '666666'
                      })
                    ],
                    spacing: { before: 240, after: 240 },
                  })
                );
              }
            }
          }
          // Handle regular code blocks
          else {
            if (codeBlockContent.length > 0) {
              // Add each line as a separate paragraph to preserve formatting
              codeBlockContent.forEach((codeLine, idx) => {
                children.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: codeLine || ' ', // Empty lines need at least a space
                        font: 'Courier New',
                        size: 20, // 10pt
                      })
                    ],
                    spacing: {
                      before: idx === 0 ? 120 : 0,
                      after: idx === codeBlockContent.length - 1 ? 120 : 0
                    },
                    shading: {
                      fill: 'F5F5F5',
                    },
                  })
                );
              });
            }
          }

          codeBlockContent = []
          codeBlockLanguage = ''
          i++
          continue
        }

        // Handle Markdown tables
        if (line.includes('|') && line.trim().startsWith('|')) {
          const tableLines = []
          while (i < lines.length && lines[i].includes('|')) {
            // Skip separator lines (|---|, |---, etc.)
            if (!lines[i].match(/^\s*\|[\s\-:]+\|\s*$/)) {
              tableLines.push(lines[i])
            }
            i++
          }

          if (tableLines.length > 0) {
            const rows = tableLines.map(tline =>
              tline.split('|').slice(1, -1).map(cell => cell.trim())
            )

            const tableRows = rows.map((rowData, rowIndex) =>
              new TableRow({
                children: rowData.map(cellText =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: cellText,
                            bold: rowIndex === 0,
                            font: 'Calibri',
                            size: 22, // 11pt
                            color: rowIndex === 0 ? 'FFFFFF' : '000000', // White text for header
                          }),
                        ],
                      }),
                    ],
                    shading: rowIndex === 0 ? { fill: '4472C4' } : undefined, // Blue header
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 6, color: rowIndex === 0 ? '4472C4' : 'D0D0D0' },
                      bottom: { style: BorderStyle.SINGLE, size: 6, color: rowIndex === 0 ? '4472C4' : 'D0D0D0' },
                      left: { style: BorderStyle.SINGLE, size: 6, color: rowIndex === 0 ? '4472C4' : 'D0D0D0' },
                      right: { style: BorderStyle.SINGLE, size: 6, color: rowIndex === 0 ? '4472C4' : 'D0D0D0' },
                    },
                  })
                ),
              })
            )

            children.push(
              new Table({
                rows: tableRows,
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
              })
            )
            children.push(new Paragraph({ text: '', spacing: { after: 120 } }))
            continue
          }
        }

        // Handle Headers
        if (line.startsWith('# ')) {
          children.push(
            new Paragraph({
              text: line.replace(/^#\s+\d+\.\s*/, '').replace('# ', ''),
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 240, after: 120 },
              style: 'Heading1',
            })
          )
        } else if (line.startsWith('## ')) {
          children.push(
            new Paragraph({
              text: line.replace(/^##\s+\d+\.\s*/, '').replace('## ', ''),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 },
              style: 'Heading2',
            })
          )
        } else if (line.startsWith('### ')) {
          children.push(
            new Paragraph({
              text: line.replace(/^###\s+\d+\.\d+\s*/, '').replace('### ', ''),
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 160, after: 80 },
              style: 'Heading3',
            })
          )
        } else if (line.startsWith('#### ')) {
          children.push(
            new Paragraph({
              text: line.replace('#### ', ''),
              heading: HeadingLevel.HEADING_4,
              spacing: { before: 120, after: 60 },
              style: 'Heading4',
            })
          )
        }
        // Handle Bold text
        else if (line.startsWith('**') && line.endsWith('**')) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line.replace(/\*\*/g, ''),
                  bold: true,
                }),
              ],
              spacing: { before: 120, after: 60 },
            })
          )
        }
        // Handle Bullet lists (nested support)
        else if (line.match(/^\s*[-*+]\s+/)) {
          const indent = line.match(/^\s*/)?.[0].length || 0
          const level = Math.floor(indent / 2)
          const text = line.replace(/^\s*[-*+]\s+/, '')
          const runs = parseInlineMarkdown(text)

          children.push(
            new Paragraph({
              children: runs,
              bullet: { level: Math.min(level, 8) }, // Max 9 levels
              spacing: { after: 60 },
            })
          )
        }
        // Handle Blockquotes
        else if (line.startsWith('> ')) {
          const text = line.replace(/^>\s*/, '')
          const runs = parseInlineMarkdown(text)

          children.push(
            new Paragraph({
              children: runs,
              spacing: { after: 120 },
              indent: { left: 720 }, // Indent 0.5 inch
              shading: {
                fill: 'F9F9F9',
              },
              border: {
                left: {
                  color: '4472C4',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 24, // Thick blue left border
                },
              },
            })
          )
        }
        // Handle Horizontal rules
        else if (line.trim() === '---') {
          children.push(
            new Paragraph({
              text: '',
              spacing: { before: 120, after: 120 },
              border: {
                bottom: {
                  color: 'CCCCCC',
                  space: 1,
                  style: BorderStyle.SINGLE,
                  size: 6,
                },
              },
            })
          )
        }
        // Handle regular paragraphs
        else if (line.trim()) {
          const runs = parseInlineMarkdown(line)

          children.push(
            new Paragraph({
              children: runs,
              spacing: {
                after: 120,
                line: 240, // 1.0 line spacing (single)
              },
            })
          )
        }
        // Empty lines
        else {
          children.push(new Paragraph({ text: '' }))
        }

        i++
      }

      // Ensure we have at least one paragraph
      if (children.length === 0) {
        children.push(new Paragraph({ text: 'Empty document' }))
      }

      // Validate children - remove any undefined/null
      const validChildren = children.filter(child => {
        if (child == null) return false;
        return child instanceof Paragraph || child instanceof Table;
      });

      try {
        const doc = new Document({
          creator: 'Quantum Tools by MTM',
          description: 'Converted from Markdown',
          title: fileName || 'Document',
          compatibility: {
            doNotExpandShiftReturn: true,
            doNotUseIndentAsNumberingTabStop: true,
          },
          styles: {
            paragraphStyles: [
              {
                id: 'Normal',
                name: 'Normal',
                run: {
                  font: 'Calibri',
                  size: 22, // 11pt
                  color: '000000',
                },
                paragraph: {
                  spacing: {
                    line: 240, // 1.0 line spacing (single)
                    after: 120,
                  },
                },
              },
              {
                id: 'Heading1',
                name: 'Heading 1',
                basedOn: 'Normal',
                next: 'Normal',
                run: {
                  font: 'Calibri Light',
                  size: 32, // 16pt
                  bold: true,
                  color: '2E74B5',
                },
                paragraph: {
                  spacing: {
                    before: 240,
                    after: 120,
                  },
                },
              },
              {
                id: 'Heading2',
                name: 'Heading 2',
                basedOn: 'Normal',
                next: 'Normal',
                run: {
                  font: 'Calibri Light',
                  size: 28, // 14pt
                  bold: true,
                  color: '2E74B5',
                },
                paragraph: {
                  spacing: {
                    before: 200,
                    after: 100,
                  },
                },
              },
              {
                id: 'Heading3',
                name: 'Heading 3',
                basedOn: 'Normal',
                next: 'Normal',
                run: {
                  font: 'Calibri',
                  size: 26, // 13pt
                  bold: true,
                  color: '1F4D78',
                },
                paragraph: {
                  spacing: {
                    before: 160,
                    after: 80,
                  },
                },
              },
              {
                id: 'Heading4',
                name: 'Heading 4',
                basedOn: 'Normal',
                next: 'Normal',
                run: {
                  font: 'Calibri',
                  size: 24, // 12pt
                  bold: true,
                  color: '000000',
                },
                paragraph: {
                  spacing: {
                    before: 120,
                    after: 60,
                  },
                },
              },
            ],
          },
          sections: [
            {
              properties: {
                page: {
                  size: {
                    width: 11906,  // A4 width: 210mm = 8.27" = 11906 twips
                    height: 16838, // A4 height: 297mm = 11.69" = 16838 twips
                  },
                  margin: {
                    top: 720,     // 0.5 inches (12.7mm)
                    right: 720,   // 0.5 inches (12.7mm)
                    bottom: 720,  // 0.5 inches (12.7mm)
                    left: 720,    // 0.5 inches (12.7mm)
                  },
                },
              },
              children: validChildren,
            },
          ],
        })

        // Use toBlob for browser compatibility
        const blob = await Packer.toBlob(doc);

        const outputFileName = fileName.replace(/\.md$/i, '') + '.docx'
        saveAs(blob, outputFileName)
        setError('')
      } catch (packError) {
        throw packError;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Error converting document: ${errorMessage}. Please check the console for details.`)
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="converter-container">
      {/* Dropzone Area */}
      <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
        <input {...getInputProps()} />
        <div className="dropzone-icon-circle">
          <Upload size={32} strokeWidth={2} />
        </div>
        {isDragActive ? (
          <p className="primary-text">Drop the Markdown file here...</p>
        ) : (
          <div>
            <p className="primary-text">Upload Markdown File</p>
            <p className="secondary-text">Drag & drop or click to select (.md)</p>
          </div>
        )}
      </div>

      {error && (
        <div className="error-box">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {markdownContent && (
        <div className="preview-section">
          <div className="preview-header">
            <h4>Preview & Edit</h4>
            <span className="file-name">{fileName}.md</span>
          </div>
          <textarea
            className="markdown-preview"
            value={markdownContent}
            onChange={(e) => setMarkdownContent(e.target.value)}
            placeholder="Your markdown content..."
            rows={20}
          />
        </div>
      )}

      {markdownContent && (
        <div className="converter-actions">
          <button
            className="convert-button"
            onClick={convertToDocx}
            disabled={isConverting}
          >
            <Download size={20} />
            {isConverting ? 'Converting...' : 'Convert to DOCX'}
          </button>
          <button
            className="clear-button"
            onClick={() => {
              setMarkdownContent('')
              setFileName('')
              setError('')
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Features Grid - Only show when no content is loaded to keep interface clean */}
      {!markdownContent && (
        <div className="converter-features-grid">
          <div className="feature-item">
            <h4><FileText size={20} /> Supported Formatting</h4>
            <ul className="feature-list">
              <li>Headers (H1-H4) with professional styling</li>
              <li>Bold, Italic, Strikethrough text</li>
              <li>Code blocks with syntax highlighting</li>
              <li>Blockquotes and Citations</li>
              <li>Complex Tables with styling</li>
            </ul>
          </div>

          <div className="feature-item">
            <h4><Download size={20} /> Smart Conversion</h4>
            <ul className="feature-list">
              <li>Mermaid Diagrams to High-Res Images</li>
              <li>Optimized layout for A4 printing</li>
              <li>Automatic Table of Contents</li>
              <li>Clean, professional topography</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default MarkdownConverter
