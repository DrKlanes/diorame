let _canvasFilterSupported: boolean | null = null;

export function supportsCanvasFilter(): boolean {
	if (_canvasFilterSupported !== null) return _canvasFilterSupported;
	try {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) { _canvasFilterSupported = false; return false; }
		ctx.filter = 'blur(1px)';
		_canvasFilterSupported = ctx.filter !== 'none';
	} catch {
		_canvasFilterSupported = false;
	}
	return _canvasFilterSupported;
}
