// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { useFileUpload } from './useFileUpload'

// Without this React warns that act() is unsupported and does not flush work
// synchronously — the assertions would then be checking an unsettled tree.
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/**
 * A FileReader whose completion is driven by the test, so two reads can resolve
 * out of request order — the real case being a large file dropped first and a
 * small one dropped immediately after.
 */
class ControllableFileReader {
  static instances: ControllableFileReader[] = []
  onload: ((e: { target: { result: string } }) => void) | null = null
  onerror: (() => void) | null = null
  aborted = false
  private text = ''

  constructor() {
    ControllableFileReader.instances.push(this)
  }

  readAsText(file: File) {
    this.text = (file as unknown as { text: string }).text
  }

  abort() {
    this.aborted = true
  }

  finish() {
    if (this.aborted) return
    this.onload?.({ target: { result: this.text } })
  }

  fail() {
    if (this.aborted) return
    this.onerror?.()
  }

  /**
   * Fire load even though abort() was called.
   *
   * This is not a contrived case: per the File API, abort() on a reader whose
   * readyState is already DONE does nothing, so a read that finished just
   * before it was superseded still delivers its queued load event. Aborting
   * alone therefore cannot fix the race — only the token check can — and a
   * test that lets abort() suppress everything would not prove the guard works.
   */
  deliverLate() {
    this.onload?.({ target: { result: this.text } })
  }
}

const fakeFile = (text: string) => ({ text, name: 'f.txt' }) as unknown as File

let container: HTMLDivElement
let root: Root
/** `onDrop` as react-dropzone would call it, captured from the real hook. */
let drop: (files: File[]) => void

const Harness = ({ onFileRead, onError }: { onFileRead: (t: string) => void; onError?: (e: string) => void }) => {
  const upload = useFileUpload({ onFileRead, onError })
  // Published from an effect, not during render: assigning to an outer
  // variable while rendering is a side effect, and react-hooks/globals is
  // right to reject it even in a test.
  useEffect(() => {
    // getRootProps() surfaces the onDrop react-dropzone was configured with.
    drop = (files: File[]) => {
      const props = upload.getRootProps() as unknown as {
        onDrop?: (e: unknown) => void
      }
      props.onDrop?.({
        preventDefault() {},
        stopPropagation() {},
        persist() {},
        type: 'drop',
        dataTransfer: {
          files,
          items: files.map(f => ({ kind: 'file', getAsFile: () => f })),
          types: ['Files'],
        },
      })
    }
  })
  return null
}

const render = (onFileRead: (t: string) => void, onError?: (e: string) => void) => {
  act(() => {
    root.render(<Harness onFileRead={onFileRead} onError={onError} />)
  })
}

beforeEach(() => {
  ControllableFileReader.instances = []
  vi.stubGlobal('FileReader', ControllableFileReader)
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe('useFileUpload', () => {
  it('delivers the most recently dropped file, not the last read to finish', async () => {
    const seen: string[] = []
    render(t => seen.push(t))

    await act(async () => {
      drop([fakeFile('BIG')])
    })
    await act(async () => {
      drop([fakeFile('small')])
    })

    const [big, small] = ControllableFileReader.instances
    expect(small).toBeDefined()

    // Small resolves first; the large one then delivers its already-queued
    // load event, which abort() cannot suppress. Only the token guard can.
    await act(async () => {
      small.finish()
      big.deliverLate()
    })

    // Previously 'BIG' overwrote 'small' — the editor showed the abandoned file.
    expect(seen).toEqual(['small'])
  })

  it('aborts the superseded read', async () => {
    render(() => {})
    await act(async () => {
      drop([fakeFile('a')])
    })
    await act(async () => {
      drop([fakeFile('b')])
    })
    expect(ControllableFileReader.instances[0].aborted).toBe(true)
  })

  it('ignores an error from a superseded read', async () => {
    const errors: string[] = []
    render(
      () => {},
      e => errors.push(e)
    )
    await act(async () => {
      drop([fakeFile('a')])
    })
    await act(async () => {
      drop([fakeFile('b')])
    })
    await act(async () => {
      ControllableFileReader.instances[0].onerror?.()
    })
    expect(errors).toEqual([])
  })

  it('does not deliver a result after unmount', async () => {
    const seen: string[] = []
    render(t => seen.push(t))
    await act(async () => {
      drop([fakeFile('a')])
    })
    const reader = ControllableFileReader.instances[0]
    act(() => root.unmount())
    await act(async () => {
      reader.deliverLate()
    })
    expect(seen).toEqual([])
    // Re-create so afterEach's unmount is harmless.
    root = createRoot(document.createElement('div'))
  })

  it('still delivers a single uncontested read', async () => {
    const seen: string[] = []
    render(t => seen.push(t))
    await act(async () => {
      drop([fakeFile('only')])
    })
    await act(async () => {
      ControllableFileReader.instances[0].finish()
    })
    expect(seen).toEqual(['only'])
  })
})
