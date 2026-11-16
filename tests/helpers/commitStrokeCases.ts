// Cases of the «pointer samples → shape» characterization (refactor phase 6, v3.26.47).
// Each case is the slice of AppState that handlePointerUp reads to build the shape(s), plus the
// pointer samples as currentPointsRef holds them ({ x, y, pressure: 0.5 }, world coordinates).
// Self-contained on purpose: tools/commit-stroke-golden bundles it with esbuild to run the code
// of StrataCanvas.tsx from BEFORE the cut, and must not drag React in through other helpers.
import type { BrushMode, Point, ToolType } from '../../src/types/strataTypes';

export interface StrokeCaseState {
	tool: ToolType;
	brushMode: BrushMode;
	currentBrushThickness: number;
	blobSmoothing: boolean;
	drawingZoom: number;
	currentLayerIndex: number;
	palette: string[];
	currentColorIndex: number;
	isDrawInside: boolean;
	isDrawBehind: boolean;
	isSymmetryEnabled: boolean;
}

export interface StrokeCase { name: string; state: StrokeCaseState; points: Point[] }

const PALETTE = ['#111111', '#e4572e', '#29335c', '#f3a712'];
const BASE: StrokeCaseState = {
	tool: 'brush', brushMode: 'tapered', currentBrushThickness: 20, blobSmoothing: false, drawingZoom: 1,
	currentLayerIndex: 0, palette: PALETTE, currentColorIndex: 1,
	isDrawInside: false, isDrawBehind: false, isSymmetryEnabled: false,
};

const s = (pts: { x: number; y: number }[]): Point[] => pts.map(p => ({ x: p.x, y: p.y, pressure: 0.5 }));
const ONE = (): Point[] => s([{ x: 12.5, y: -7.25 }]);
const TWO = (): Point[] => s([{ x: 10, y: 10 }, { x: 34.5, y: 18.25 }]);
/** A normal hand stroke: 40 samples on a wave, off the origin, non-integer. */
const NORMAL = (): Point[] => s(Array.from({ length: 40 }, (_, i) => ({ x: 30.3 + i * 4.1, y: -12.7 + 25 * Math.sin(i / 6) })));
/** A closed-ish loop, the typical blob / eraser gesture. */
const LOOP = (): Point[] => s(Array.from({ length: 30 }, (_, i) => ({ x: 60 + 45 * Math.cos(i / 4.5), y: 40 + 30 * Math.sin(i / 4.5) })));

const SPINES: Record<string, () => Point[]> = { one: ONE, two: TWO, normal: NORMAL };
const MODES: BrushMode[] = ['tapered', 'uniform', 'ink'];

const c = (name: string, over: Partial<StrokeCaseState>, points: Point[]): StrokeCase => ({ name, state: { ...BASE, ...over }, points });

export const STROKE_CASES: StrokeCase[] = [
	// Brush: every mode × one / two / normal samples, plain and mirrored.
	...MODES.flatMap(mode => Object.entries(SPINES).flatMap(([spine, pts]) => [
		c(`brush/${mode}/${spine}`, { brushMode: mode }, pts()),
		c(`brush/${mode}/${spine}/symmetry`, { brushMode: mode, isSymmetryEnabled: true }, pts()),
	])),
	c('brush/ink/normal/thickness-70/layer-3', { brushMode: 'ink', currentBrushThickness: 70, currentLayerIndex: 3 }, NORMAL()),
	c('brush/uniform/normal/thickness-1', { brushMode: 'uniform', currentBrushThickness: 1 }, NORMAL()),
	c('brush/tapered/normal/draw-inside', { isDrawInside: true }, NORMAL()),
	c('brush/tapered/normal/draw-behind', { isDrawBehind: true, currentColorIndex: 3 }, NORMAL()),
	c('brush/ink/normal/draw-inside/symmetry', { brushMode: 'ink', isDrawInside: true, isSymmetryEnabled: true }, NORMAL()),
	// Blob: the small-shape padding depends on drawingZoom; smoothing only from 4 samples.
	...Object.entries(SPINES).flatMap(([spine, pts]) => [
		c(`blob/${spine}`, { tool: 'blob' }, pts()),
		c(`blob/${spine}/zoom-2.5`, { tool: 'blob', drawingZoom: 2.5 }, pts()),
		c(`blob/${spine}/symmetry`, { tool: 'blob', isSymmetryEnabled: true }, pts()),
	]),
	c('blob/loop', { tool: 'blob' }, LOOP()),
	c('blob/loop/smoothing', { tool: 'blob', blobSmoothing: true }, LOOP()),
	c('blob/loop/smoothing/symmetry', { tool: 'blob', blobSmoothing: true, isSymmetryEnabled: true }, LOOP()),
	c('blob/loop/draw-inside', { tool: 'blob', isDrawInside: true, currentLayerIndex: 2 }, LOOP()),
	c('blob/loop/draw-behind', { tool: 'blob', isDrawBehind: true }, LOOP()),
	// Eraser: outline as a blob, plus the tapered eraserPolygon at the brush thickness.
	...Object.entries(SPINES).flatMap(([spine, pts]) => [
		c(`eraser/${spine}`, { tool: 'eraser' }, pts()),
		c(`eraser/${spine}/symmetry`, { tool: 'eraser', isSymmetryEnabled: true }, pts()),
	]),
	c('eraser/loop', { tool: 'eraser', currentBrushThickness: 45 }, LOOP()),
	c('eraser/loop/smoothing', { tool: 'eraser', blobSmoothing: true }, LOOP()),
	c('eraser/loop/smoothing/symmetry/layer-1', { tool: 'eraser', blobSmoothing: true, isSymmetryEnabled: true, currentLayerIndex: 1 }, LOOP()),
];
