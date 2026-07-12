import i18n from 'i18next'

/** Guards an action that would discard unsaved manual color edits (recolors, merges, added/deleted colors). */
export function confirmDestructiveEdit(unsavedEditCount: number): boolean {
  if (unsavedEditCount === 0) return true
  return window.confirm(i18n.t('confirmDestructive.message', { count: unsavedEditCount }))
}
