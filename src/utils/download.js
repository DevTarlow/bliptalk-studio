/** Browser file-download helpers. Kept tiny and side-effect free. */

/**
 * Trigger a download for a Blob via a temporary object URL.
 * Works inside an itch.io iframe as long as the iframe allows downloads.
 *
 * @param {Blob} blob
 * @param {string} filename
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke late: some browsers need the URL alive until the download starts.
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Promise-based delay, used to stagger multiple downloads. */
export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
