import { useEffect, useRef, useState } from 'react';

const isFileDrag = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types ?? []).includes('Files');

// Window-level drop of a file. Only file drags are touched (dnd-kit's internal drags are pointer-based and carry no
// "Files"), and those are always preventDefault-ed so a missed drop can never navigate away from the app.
// `canDrop` is read at drag time (modals open, exporting...); `onFile` gets the first file, validation is the loader's.
export function useFileDrop(onFile: (file: File) => void, canDrop: () => boolean): boolean {
	const [dragging, setDragging] = useState(false);
	const cbRef = useRef({ onFile, canDrop });
	cbRef.current = { onFile, canDrop };

	useEffect(() => {
		let depth = 0;
		const reset = () => { depth = 0; setDragging(false); };

		const onEnter = (e: DragEvent) => {
			if (!isFileDrag(e)) return;
			e.preventDefault();
			depth++;
			if (depth === 1 && cbRef.current.canDrop()) setDragging(true);
		};
		const onOver = (e: DragEvent) => {
			if (!isFileDrag(e)) return;
			e.preventDefault();
			if (e.dataTransfer) e.dataTransfer.dropEffect = cbRef.current.canDrop() ? 'copy' : 'none';
		};
		const onLeave = (e: DragEvent) => {
			if (!isFileDrag(e)) return;
			depth = Math.max(0, depth - 1);
			if (depth === 0) setDragging(false);
		};
		const onDrop = (e: DragEvent) => {
			if (!isFileDrag(e)) return;
			e.preventDefault();
			reset();
			const file = e.dataTransfer?.files?.[0];
			if (file && cbRef.current.canDrop()) cbRef.current.onFile(file);
		};
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') reset(); };

		window.addEventListener('dragenter', onEnter);
		window.addEventListener('dragover', onOver);
		window.addEventListener('dragleave', onLeave);
		window.addEventListener('drop', onDrop);
		window.addEventListener('keydown', onKey);
		window.addEventListener('dragend', reset);
		return () => {
			window.removeEventListener('dragenter', onEnter);
			window.removeEventListener('dragover', onOver);
			window.removeEventListener('dragleave', onLeave);
			window.removeEventListener('drop', onDrop);
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('dragend', reset);
		};
	}, []);

	return dragging;
}
