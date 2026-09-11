import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { Compartment, type Extension } from '@codemirror/state'
import { EditorView, keymap, placeholder as placeholderExtension } from '@codemirror/view'
import { memo, useEffect, useRef } from 'react'
import './CodeEditor.css'

/**
 * A plain-text editor that only renders the lines you can see.
 *
 * This exists for one measured reason. A `<textarea>` lays out its entire
 * value on every keystroke, and that cost belongs to the browser, not to
 * React: with a 500 KB document loaded, a bare textarea outside React took
 * 57 ms per inserted character with nothing else on the page. No amount of
 * deferring derived work reaches it — the floor is the textarea itself.
 *
 * CodeMirror renders only the viewport, so the cost stops scaling with
 * document size. It is not a syntax-highlighting editor here and deliberately
 * loads no language modes: the tools around it want a fast, plain text box,
 * and every mode is bundle weight for something none of them display.
 */

export interface CodeEditorProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  spellCheck?: boolean
  /** Accessible name. Falls back to the placeholder, which disappears on typing. */
  ariaLabel?: string
  className?: string
  /**
   * The native paste event, with the native contract: call `preventDefault()`
   * to replace the insertion rather than adding to it.
   */
  onPaste?: (event: ClipboardEvent) => void
  onFocusChange?: (focused: boolean) => void
}

export const CodeEditor = memo(
  ({
    value,
    onValueChange,
    placeholder,
    spellCheck = false,
    ariaLabel,
    className,
    onPaste,
    onFocusChange,
  }: CodeEditorProps) => {
    const hostRef = useRef<HTMLDivElement>(null)
    const viewRef = useRef<EditorView | null>(null)

    /**
     * Callbacks and the initial document live in refs so that a new inline
     * arrow function on the parent's next render does not tear down and
     * rebuild the editor — which would lose the caret, the selection and the
     * undo history on every keystroke.
     */
    const handlers = useRef({ onValueChange, onPaste, onFocusChange, value })
    useEffect(() => {
      handlers.current = { onValueChange, onPaste, onFocusChange, value }
    })

    // One compartment per reconfigurable extension, created per mount because
    // a compartment belongs to the state it was configured into.
    const compartments = useRef({
      placeholder: new Compartment(),
      attributes: new Compartment(),
    })

    useEffect(() => {
      const host = hostRef.current
      if (!host) return

      const { placeholder: placeholderSlot, attributes: attributesSlot } = compartments.current

      const extensions: Extension[] = [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        // Tab is intentionally left unbound: it moves focus, as it does in the
        // textarea this replaces, so the editor never becomes a keyboard trap.
        EditorView.lineWrapping,
        placeholderSlot.of([]),
        attributesSlot.of([]),
        EditorView.domEventHandlers({
          paste: (event) => {
            handlers.current.onPaste?.(event)
            // CodeMirror skips its own insertion once the event is defaulted
            // away, so a handler that calls preventDefault fully replaces it.
            return false
          },
          // The wrapper's dropzone owns file drops. Claiming the event here
          // stops CodeMirror inserting the dragged text; it still bubbles.
          drop: () => true,
        }),
        EditorView.updateListener.of((update) => {
          if (update.focusChanged) handlers.current.onFocusChange?.(update.view.hasFocus)
          if (update.docChanged) handlers.current.onValueChange(update.state.doc.toString())
        }),
      ]

      const view = new EditorView({ doc: handlers.current.value, extensions, parent: host })
      viewRef.current = view

      return () => {
        view.destroy()
        viewRef.current = null
      }
    }, [])

    // An external change — Format, an uploaded file, Clear, a handoff from the
    // paste bar. Typing arrives here too, having already round-tripped through
    // the parent's state, and is filtered out by the equality check.
    useEffect(() => {
      const view = viewRef.current
      if (!view || view.state.doc.toString() === value) return
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
    }, [value])

    useEffect(() => {
      viewRef.current?.dispatch({
        effects: compartments.current.placeholder.reconfigure(
          placeholder ? placeholderExtension(placeholder) : []
        ),
      })
    }, [placeholder])

    useEffect(() => {
      viewRef.current?.dispatch({
        effects: compartments.current.attributes.reconfigure(
          EditorView.contentAttributes.of({
            'aria-label': ariaLabel ?? placeholder ?? 'Editor',
            spellcheck: String(spellCheck),
            autocorrect: spellCheck ? 'on' : 'off',
            autocapitalize: 'off',
          })
        ),
      })
    }, [ariaLabel, placeholder, spellCheck])

    return <div ref={hostRef} className={`code-editor ${className || ''}`} />
  }
)

CodeEditor.displayName = 'CodeEditor'
