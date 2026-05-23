import React, { useEffect, useRef } from 'react';
import { useStrata } from '../StrataContext';

/**
 * CompositionGuideOverlay — DRAW-only world-space dot grid.
 *
 * Architecture:
 * - Separate <canvas> element layered above StrataCanvas's main canvas.
 * - Lives as sibling in App.tsx (NOT inside StrataCanvas) → zero changes to the
 *   frozen render loop, and naturally export-safe: canvas.toDataURL() / MediaRecorder
 *   in exportHandlers act on the main canvas ref only; this overlay is a separate
 *   DOM node whose pixels never leak into PNG/MP4 exports.
 * - Filters: drawing mode + UI visible + gridEnabled. Returns null otherwise so
 *   no canvas element is even mounted when off.
 *
 * Dimensions: matches StrataCanvas via `position:absolute inset-0` of the same
 * App.tsx parent container (`relative w-full h-[100dvh]`). Both canvases derive
 * their pixel size from container.clientWidth/Height — same source of truth.
 *
 * World→screen formula (mirrors StrataCanvas:2104-2105):
 *   screen.x = w/2 + worldX * drawingZoom + drawingPan.x
 *   screen.y = h/2 + worldY * drawingZoom + drawingPan.y
 */
export function CompositionGuideOverlay() {
	const { state } = useStrata();
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const active = state.mode === 'drawing' && !state.isUIHidden && state.gridEnabled;

	useEffect(() => {
		if (!active) return;
		const canvas = canvasRef.current;
		const container = containerRef.current;
		if (!canvas || !container) return;

		const GRID_SPACING_WORLD = 50;
		const DOT_RADIUS_BASE = 1;
		const DOT_RADIUS_MAX = 2.5;
		// White with reduced alpha + mix-blend-mode: exclusion on canvas →
		// replicates Photoshop "Exclusion + ~20% fill" recipe: soft gray over light
		// paper, gray-white over dark canvas, visible on any backdrop without glare.
		const dotColor = 'rgba(255, 255, 255, 0.4)';
		const centerColor = 'rgba(255, 255, 255, 0.6)';

		const draw = () => {
			const w = container.clientWidth;
			const h = container.clientHeight;
			if (w === 0 || h === 0) return;
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
			}
			const ctx = canvas.getContext('2d');
			if (!ctx) return;
			ctx.clearRect(0, 0, w, h);

			const zoom = state.drawingZoom || 1;
			const dotRadius = Math.min(DOT_RADIUS_BASE + Math.max(0, zoom - 1) * 0.5, DOT_RADIUS_MAX);
			const panX = state.drawingPan?.x || 0;
			const panY = state.drawingPan?.y || 0;

			// Visible world range derived from screen viewport
			const worldLeft = (0 - w / 2 - panX) / zoom;
			const worldRight = (w - w / 2 - panX) / zoom;
			const worldTop = (0 - h / 2 - panY) / zoom;
			const worldBottom = (h - h / 2 - panY) / zoom;

			const startX = Math.floor(worldLeft / GRID_SPACING_WORLD) * GRID_SPACING_WORLD;
			const endX = Math.ceil(worldRight / GRID_SPACING_WORLD) * GRID_SPACING_WORLD;
			const startY = Math.floor(worldTop / GRID_SPACING_WORLD) * GRID_SPACING_WORLD;
			const endY = Math.ceil(worldBottom / GRID_SPACING_WORLD) * GRID_SPACING_WORLD;

			ctx.fillStyle = dotColor;
			for (let wx = startX; wx <= endX; wx += GRID_SPACING_WORLD) {
				for (let wy = startY; wy <= endY; wy += GRID_SPACING_WORLD) {
					if (wx === 0 && wy === 0) continue; // skip center, drawn separately
					const sx = w / 2 + wx * zoom + panX;
					const sy = h / 2 + wy * zoom + panY;
					ctx.beginPath();
					ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2);
					ctx.fill();
				}
			}

			// Center marker — slightly larger dot at world (0, 0)
			const cx = w / 2 + panX;
			const cy = h / 2 + panY;
			if (cx >= -4 && cx <= w + 4 && cy >= -4 && cy <= h + 4) {
				ctx.fillStyle = centerColor;
				ctx.beginPath();
				ctx.arc(cx, cy, 2, 0, Math.PI * 2);
				ctx.fill();
			}
		};

		draw();
		const ro = new ResizeObserver(() => draw());
		ro.observe(container);
		return () => ro.disconnect();
	}, [active, state.drawingZoom, state.drawingPan]);

	if (!active) return null;

	return (
		<div
			ref={containerRef}
			style={{
				position: 'absolute',
				inset: 0,
				// NO zIndex here: a positioned element with z-index creates a new stacking
				// context, which would isolate the canvas's mix-blend-mode from StrataCanvas
				// (its sibling backdrop). Without zIndex, the wrapper stays in the parent's
				// stacking context, so the blend mode can see StrataCanvas's painted pixels.
				// Layer order is preserved by DOM order: this overlay is rendered after
				// StrataCanvas (z-0) in App.tsx, so it paints on top naturally.
				pointerEvents: 'none',
			}}
		>
			<canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', mixBlendMode: 'exclusion' }} />
		</div>
	);
}
