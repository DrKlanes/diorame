/**
 * Triggers a browser download of a Blob via a hidden anchor.
 *
 * Mirrors the .dior save pattern verified on iPad (useSaveLoad.ts): iPadOS
 * WebKit silently drops clicks on anchors not attached to the document, and
 * the native share sheet opens async — revoking the object URL synchronously
 * after click() kills the download before WebKit reads it. Anchor removal and
 * URL revocation are therefore deferred (200ms, same as the .dior flow).
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.style.display = 'none';
	document.body.appendChild(link);
	link.click();
	setTimeout(() => {
		try { if (link.parentNode) document.body.removeChild(link); } catch (_) { /* */ }
		URL.revokeObjectURL(url);
	}, 200);
}
