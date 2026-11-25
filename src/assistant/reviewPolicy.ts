import type { WorkspaceEdit } from './workspaceEdit';

export type ReviewSelection = Record<number, string[] | boolean>;
export const isDestructiveEdit = (edit: WorkspaceEdit) => Boolean(edit.destructive || edit.action.startsWith('delete_'));
const isAddition = (edit: WorkspaceEdit) => /^(create_|add_|import_|schedule_)/.test(edit.action);

/** Always retain existing gates and gate all additions when two or more items are proposed. */
export function normalizeReviewEdits(edits: WorkspaceEdit[]): WorkspaceEdit[] {
  const additions = edits.filter(isAddition).reduce((n, edit) => n + (edit.reviewItems?.length || 1), 0);
  return edits.map(edit => {
    if (isDestructiveEdit(edit)) return { ...edit, confirmation: true, reviewKind: 'destructive' };
    if (isAddition(edit) && (additions >= 2 || edit.reviewItems?.length)) {
      return { ...edit, confirmation: true, reviewKind: 'approval' };
    }
    return edit;
  });
}

/** Select-all is deliberately limited to non-destructive actions. */
export function reviewSelection(edits: WorkspaceEdit[], selected = true): ReviewSelection {
  return Object.fromEntries(edits.map((edit, i) => {
    const checked = selected && !isDestructiveEdit(edit);
    return [i, edit.reviewItems?.length ? (checked ? edit.reviewItems.map(item => item.id) : []) : checked];
  }));
}

/** Never turn missing, invalid or partial selections into an unconditional action. */
export function selectedReviewAction(edit: WorkspaceEdit, choice: string[] | boolean | undefined): string[] | true | false {
  if (choice === false) return false;
  if (Array.isArray(choice)) {
    if (!edit.applySelected || !edit.reviewItems?.length || isDestructiveEdit(edit)) return false;
    const allowed = new Set(edit.reviewItems.map(item => item.id));
    const ids = [...new Set(choice)].filter(id => allowed.has(id));
    return ids.length ? ids : false;
  }
  if (choice !== true || edit.reviewItems?.length) return false;
  return true;
}
