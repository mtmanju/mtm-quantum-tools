/**
 * Opening the palette from a click, without threading a setter through every
 * component between the header and <CommandPalette>.
 *
 * The palette was reachable by ⌘K alone. A shortcut nobody is told about is a
 * feature only its author uses, and on a tool page it was the *only* way to
 * reach another tool — so the trigger needs to be visible, and the thing that
 * shows it (the header) is nowhere near the thing that owns the state.
 */

const OPEN_EVENT = 'qt:command-palette:open'

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT))
}

export function onOpenCommandPalette(handler: () => void) {
  window.addEventListener(OPEN_EVENT, handler)
  return () => window.removeEventListener(OPEN_EVENT, handler)
}

/** ⌘ on Apple platforms, Ctrl everywhere else — used in every shortcut hint. */
export const MOD_KEY =
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
    ? '⌘'
    : 'Ctrl'
