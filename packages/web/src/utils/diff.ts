/**
 * Text diff utilities
 */

export interface DiffLine {
  type: 'equal' | 'insert' | 'delete'
  content: string
  lineNumber?: number
  oldLineNumber?: number
  newLineNumber?: number
}

export interface DiffResult {
  lines: DiffLine[]
  insertions: number
  deletions: number
  changes: number
}

/**
 * Simple line-based diff algorithm
 */
export const computeDiff = (oldText: string, newText: string): DiffResult => {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const diffLines: DiffLine[] = []
  
  let oldIndex = 0
  let newIndex = 0
  let insertions = 0
  let deletions = 0

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex >= oldLines.length) {
      // Only new lines remain
      diffLines.push({
        type: 'insert',
        content: newLines[newIndex],
        newLineNumber: newIndex + 1
      })
      insertions++
      newIndex++
    } else if (newIndex >= newLines.length) {
      // Only old lines remain
      diffLines.push({
        type: 'delete',
        content: oldLines[oldIndex],
        oldLineNumber: oldIndex + 1
      })
      deletions++
      oldIndex++
    } else if (oldLines[oldIndex] === newLines[newIndex]) {
      // Lines are equal
      diffLines.push({
        type: 'equal',
        content: oldLines[oldIndex],
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1
      })
      oldIndex++
      newIndex++
    } else {
      // Lines differ - check if we can find a match ahead
      let foundMatch = false
      const maxLookahead = Math.min(10, Math.max(oldLines.length - oldIndex, newLines.length - newIndex))
      
      // Look ahead in new text
      for (let i = 1; i <= maxLookahead && newIndex + i < newLines.length; i++) {
        if (oldLines[oldIndex] === newLines[newIndex + i]) {
          // Found match - add all new lines as insertions
          for (let j = 0; j < i; j++) {
            diffLines.push({
              type: 'insert',
              content: newLines[newIndex + j],
              newLineNumber: newIndex + j + 1
            })
            insertions++
          }
          newIndex += i
          foundMatch = true
          break
        }
      }
      
      if (!foundMatch) {
        // Look ahead in old text
        for (let i = 1; i <= maxLookahead && oldIndex + i < oldLines.length; i++) {
          if (oldLines[oldIndex + i] === newLines[newIndex]) {
            // Found match - add all old lines as deletions
            for (let j = 0; j < i; j++) {
              diffLines.push({
                type: 'delete',
                content: oldLines[oldIndex + j],
                oldLineNumber: oldIndex + j + 1
              })
              deletions++
            }
            oldIndex += i
            foundMatch = true
            break
          }
        }
      }
      
      if (!foundMatch) {
        // No match found - treat as change (delete old, insert new)
        diffLines.push({
          type: 'delete',
          content: oldLines[oldIndex],
          oldLineNumber: oldIndex + 1
        })
        deletions++
        oldIndex++
        
        diffLines.push({
          type: 'insert',
          content: newLines[newIndex],
          newLineNumber: newIndex + 1
        })
        insertions++
        newIndex++
      }
    }
  }

  return {
    lines: diffLines,
    insertions,
    deletions,
    changes: insertions + deletions
  }
}

/**
 * Character-level diff for inline highlighting
 */
export const computeCharDiff = (oldText: string, newText: string): Array<{ type: 'equal' | 'insert' | 'delete', text: string }> => {
  const parts: Array<{ type: 'equal' | 'insert' | 'delete', text: string }> = []
  
  // Simple character-by-character comparison
  let oldIndex = 0
  let newIndex = 0
  
  while (oldIndex < oldText.length || newIndex < newText.length) {
    if (oldIndex >= oldText.length) {
      // Only new text remains
      parts.push({ type: 'insert', text: newText.substring(newIndex) })
      break
    } else if (newIndex >= newText.length) {
      // Only old text remains
      parts.push({ type: 'delete', text: oldText.substring(oldIndex) })
      break
    } else if (oldText[oldIndex] === newText[newIndex]) {
      // Characters match - find longest common substring
      let commonLength = 1
      while (
        oldIndex + commonLength < oldText.length &&
        newIndex + commonLength < newText.length &&
        oldText[oldIndex + commonLength] === newText[newIndex + commonLength]
      ) {
        commonLength++
      }
      parts.push({ type: 'equal', text: oldText.substring(oldIndex, oldIndex + commonLength) })
      oldIndex += commonLength
      newIndex += commonLength
    } else {
      // Characters differ
      // Try to find next match in new text
      let foundMatch = false
      for (let i = newIndex + 1; i < newText.length && i < newIndex + 50; i++) {
        if (oldText[oldIndex] === newText[i]) {
          parts.push({ type: 'insert', text: newText.substring(newIndex, i) })
          newIndex = i
          foundMatch = true
          break
        }
      }
      
      if (!foundMatch) {
        // Try to find next match in old text
        foundMatch = false
        for (let i = oldIndex + 1; i < oldText.length && i < oldIndex + 50; i++) {
          if (oldText[i] === newText[newIndex]) {
            parts.push({ type: 'delete', text: oldText.substring(oldIndex, i) })
            oldIndex = i
            foundMatch = true
            break
          }
        }
      }
      
      if (!foundMatch) {
        // No match found - treat as change
        parts.push({ type: 'delete', text: oldText[oldIndex] })
        oldIndex++
        parts.push({ type: 'insert', text: newText[newIndex] })
        newIndex++
      }
    }
  }
  
  return parts
}

