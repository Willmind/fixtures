/** Read the title first instead of automatically highlighting an action button. */
export function openDialogAtTitle(dialog: HTMLDialogElement) {
  dialog.showModal();
  dialog.querySelector<HTMLElement>("[data-dialog-title]")?.focus({ preventScroll: true });
}
