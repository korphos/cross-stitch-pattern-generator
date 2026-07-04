/** Guards an action that would discard unsaved manual color edits (recolors, merges, added/deleted colors). */
export function confirmDestructiveEdit(unsavedEditCount: number): boolean {
  if (unsavedEditCount === 0) return true
  const noun = unsavedEditCount === 1 ? 'edit' : 'edits'
  return window.confirm(
    `You have ${unsavedEditCount} unsaved manual color ${noun} that will be discarded if you continue. Continue?`,
  )
}
