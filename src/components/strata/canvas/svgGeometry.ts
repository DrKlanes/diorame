// Real-geometry SVG layers: erasers and drawInside are resolved with boolean ops (paper.js)
// instead of masks, so Illustrator's Outline view and Pathfinder see exactly what Canvas draws.
// paper.js is loaded lazily — only an SVG export pays for it.
import type paper from 'paper/dist/paper-core';
import type { Point, Shape } from '../../../types/strataTypes';
import { textOutline, textAsRuns, runBounds, type TextEngine, type TextRun } from './svgText';

type Paper = typeof paper;

// Eraser crumbs: islands/pinholes below this area (world units²) are dropped from pieces an
// eraser or a drawInside clip CUT. Invisible on screen, but each would become a stray fragment
// under Illustrator's Divide. Never from untouched pieces: a 1-unit tap (BRUSH_THICKNESS_MIN)
// or the dot of a small 'i' is legitimate content below this area (v3.17.51).
const MIN_CRUMB_AREA = 4;
// Path data at 2 decimals: sub-pixel is plenty and keeps files small.
const pathD = (item: paper.PathItem) => item.pathData.replace(/(\.\d\d)\d+/g, '$1');

export type GeometryPiece = {
	color: string;
	d?: string;             // resolved outline
	runs?: TextRun[];       // text words that could not become outlines: emitted as live <text>
	maskErasers: string[];  // fallback: erasers that could not be subtracted (always for live text)
	clipD?: string;         // fallback: drawInside whose intersection failed
};

let scope: Paper | null = null;
export const loadPaper = async (): Promise<Paper> => {
	if (!scope) {
		scope = (await import('paper/dist/paper-core')).default;
		scope.setup(new scope.Size(1, 1));
	}
	return scope;
};

// Same curve drawSmoothLine draws: quadratics through the midpoints, closing straight.
export const smoothPathData = (pts: Point[], closed: boolean): string => {
	if (pts.length < 2) return '';
	let d = `M${pts[0].x},${pts[0].y}`;
	for (let i = 1; i < pts.length - 1; i++) {
		d += ` Q${pts[i].x},${pts[i].y} ${(pts[i].x + pts[i + 1].x) / 2},${(pts[i].y + pts[i + 1].y) / 2}`;
	}
	d += ` L${pts[pts.length - 1].x},${pts[pts.length - 1].y}`;
	return closed ? d + ' Z' : d;
};

// The drawSmoothLine curve sampled every ~3 units (for the uniform brush outline).
const sampleSpine = (pts: Point[]): Point[] => {
	const samples = [pts[0]];
	if (pts.length >= 3) {
		let start = pts[0];
		for (let i = 1; i < pts.length - 1; i++) {
			const c = pts[i];
			const end = { x: (c.x + pts[i + 1].x) / 2, y: (c.y + pts[i + 1].y) / 2 };
			const len = Math.hypot(c.x - start.x, c.y - start.y) + Math.hypot(end.x - c.x, end.y - c.y);
			const n = Math.max(1, Math.ceil(len / 3));
			for (let k = 1; k <= n; k++) {
				const t = k / n, u = 1 - t;
				samples.push({ x: u * u * start.x + 2 * u * t * c.x + t * t * end.x, y: u * u * start.y + 2 * u * t * c.y + t * t * end.y });
			}
			start = end;
		}
	}
	if (pts.length >= 2) samples.push(pts[pts.length - 1]);
	return samples;
};

// Balanced pairwise union: each boolean op stays small.
const uniteAll = (parts: paper.PathItem[]): paper.PathItem => {
	let items = parts;
	while (items.length > 1) {
		const next: paper.PathItem[] = [];
		for (let i = 0; i < items.length; i += 2) {
			next.push(i + 1 < items.length ? items[i].unite(items[i + 1], { insert: false }) as paper.PathItem : items[i]);
		}
		items = next;
	}
	return items[0];
};

// A round-capped, round-joined stroke as a few pieces: polygon ribbons along the sampled curve,
// split wherever the inner side would fold (tight turn), plus discs at both ends and at each
// split. A smooth stroke is 3 pieces. (Uniting hundreds of overlapping discs made paper.js lose
// cap area, and pairwise-uniting them took seconds per stroke.)
const roundStrokeItem = (P: Paper, spine: Point[], r: number): paper.PathItem => {
	const S = sampleSpine(spine).filter((p, i, a) => i === 0 || Math.hypot(p.x - a[i - 1].x, p.y - a[i - 1].y) > 1e-6);
	// +0.01: a ribbon edge exactly tangent to its disc made paper.js drop the whole end cap.
	const disc = (p: Point) => new P.Path.Circle({ center: [p.x, p.y], radius: r + 0.01, insert: false });
	if (S.length < 2) return disc(S[0]);
	const dirs = S.slice(1).map((q, i) => {
		const len = Math.hypot(q.x - S[i].x, q.y - S[i].y);
		return { x: (q.x - S[i].x) / len, y: (q.y - S[i].y) / len, len };
	});
	const parts: paper.PathItem[] = [disc(S[0]), disc(S[S.length - 1])];
	let runStart = 0;
	// Ribbon over chords runStart..end-1: offsets along the joint bisector, miter-scaled so the
	// width stays r (at the gentle joints allowed here, miter ≈ round within ~0.05 units).
	const ribbon = (end: number) => {
		const left: number[][] = [], right: number[][] = [];
		for (let v = runStart; v <= end; v++) {
			const a = dirs[Math.max(runStart, v - 1)], b = dirs[Math.min(end - 1, v)];
			const bx = -(a.y + b.y), by = a.x + b.x;
			const bl = Math.hypot(bx, by) || 1;
			const k = r / Math.max(0.5, (bx * -a.y + by * a.x) / bl);
			left.push([S[v].x + bx / bl * k, S[v].y + by / bl * k]);
			right.push([S[v].x - bx / bl * k, S[v].y - by / bl * k]);
		}
		parts.push(new P.Path({ segments: [...left, ...right.reverse()], closed: true, insert: false }));
	};
	for (let i = 1; i < dirs.length; i++) {
		const a = dirs[i - 1], b = dirs[i];
		const turn = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y)));
		if (2 * r * Math.tan(turn / 2) > 0.9 * Math.min(a.len, b.len)) {
			ribbon(i);
			parts.push(disc(S[i]));
			runStart = i;
		}
	}
	ribbon(dirs.length);
	return uniteAll(parts);
};

// SVG path data → paper item with self-intersections resolved under nonzero, like Canvas fill().
const resolved = (P: Paper, d: string): paper.PathItem => {
	const item = P.PathItem.create(d);
	item.remove();
	item.fillRule = 'nonzero';
	// A simple outline needs no resolving. paper.js mis-resolves curves that cross themselves many
	// times (a scrubbed eraser lost 41% of its area); flattened to a polygon it is exact. Only
	// self-crossing shapes lose their curves.
	if (item.getCrossings(item).length === 0) return item;
	item.flatten(0.25);
	return item.unite(new P.Path({ insert: false }), { insert: false }) as paper.PathItem;
};

// What Canvas actually paints for a shape, in SVG coordinates (world + offset).
const shapeItem = (P: Paper, s: Shape, ox: number, oy: number): paper.PathItem | null => {
	const shift = (p: Point) => ({ x: p.x + ox, y: p.y + oy });
	const o = s.originalPoints;
	const r = (s.brushThickness || 20) / 2;
	// Tapered tap: zero-area polygon, painted as a full-thickness dot (isTaperedDot, renderLayerBody.ts)
	if (!s.isEraser && s.brushMode === 'tapered' && o != null && o.length >= 2
		&& Math.hypot(o[0].x - o[o.length - 1].x, o[0].y - o[o.length - 1].y) < 0.15) {
		return new P.Path.Circle({ center: [o[0].x + ox, o[0].y + oy], radius: r, insert: false });
	}
	// Uniform brush: round-capped stroke of the ORIGINAL spine (renderUniformLineShape)
	if (!s.isEraser && s.brushMode === 'uniform' && o != null && o.length > 0) {
		return roundStrokeItem(P, o.map(shift), r);
	}
	const d = smoothPathData(s.points.map(shift), true);
	return d ? resolved(P, d) : null;
};

// paper.js can return an EMPTY subtract without throwing: a glyph solid minus an eraser that only
// crosses it lost the whole letter, uncounted (svg-diff T23; 2 in ~490 random glyph subtracts, 0 in
// ~8 200 stroke ones — but the cause is paper.js, so every piece is checked). Empty is legitimate
// only when the eraser covers the piece: a vertex outside it means ink is left. Then one retry with
// both rotated a hair (a translation does not help: the failure follows the geometry, not the
// position; rotated, T23 comes back matching the raster). Still empty → null, and the caller masks
// the piece and counts it: a letter may fall back, never vanish silently.
const ERASE_RETRY_DEG = 0.05;
const isEmptyItem = (it: paper.PathItem) => it.isEmpty() || Math.abs((it as paper.Path).area) < 1e-9;
const leavesInk = (P: Paper, piece: paper.PathItem, eraser: paper.PathItem): boolean =>
	(piece instanceof P.CompoundPath ? piece.children as paper.Path[] : [piece as paper.Path]).some(c =>
		c.segments.some(sg => !eraser.contains(sg.point) && eraser.getNearestPoint(sg.point).getDistance(sg.point) > 1e-6));
const eraseFrom = (P: Paper, piece: paper.PathItem, eraser: paper.PathItem): paper.PathItem | null => {
	const direct = piece.subtract(eraser, { insert: false }) as paper.PathItem;
	if (!isEmptyItem(direct) || !leavesInk(P, piece, eraser)) return direct;
	const c = piece.bounds.center;
	const a = piece.clone({ insert: false }) as paper.PathItem, b = eraser.clone({ insert: false }) as paper.PathItem;
	a.rotate(ERASE_RETRY_DEG, c);
	b.rotate(ERASE_RETRY_DEG, c);
	const retry = a.subtract(b, { insert: false }) as paper.PathItem;
	if (isEmptyItem(retry)) return null;
	retry.rotate(-ERASE_RETRY_DEG, c);
	return retry;
};

const dropCrumbs = (P: Paper, item: paper.PathItem): paper.PathItem | null => {
	if (item instanceof P.CompoundPath) {
		(item.children.slice() as paper.Path[]).forEach(c => { if (Math.abs(c.area) < MIN_CRUMB_AREA) c.remove(); });
		return item.children.length > 0 ? item : null;
	}
	return Math.abs((item as paper.Path).area) < MIN_CRUMB_AREA ? null : item;
};

// For outlines whose boundaries do not cross, how the two regions nest — decided with one point
// per contour (every contour, so holes count). null = they cross or the case is mixed: boolean op.
const nesting = (P: Paper, a: paper.PathItem, b: paper.PathItem): 'disjoint' | 'aInB' | 'bInA' | null => {
	if (a.intersects(b)) return null;
	const points = (it: paper.PathItem) => (it instanceof P.CompoundPath ? it.children as paper.Path[] : [it as paper.Path])
		.filter(c => c.segments.length > 0).map(c => c.firstSegment.point);
	const aInB = points(a).map(pt => b.contains(pt));
	const bInA = points(b).map(pt => a.contains(pt));
	const none = (v: boolean[]) => v.every(x => !x);
	if (none(aInB) && none(bInA)) return 'disjoint';
	if (aInB.every(Boolean) && none(bInA)) return 'aInB';
	if (bInA.every(Boolean) && none(aInB)) return 'bInA';
	return null;
};

type Work = { item?: paper.PathItem; runs?: TextRun[]; runBox?: paper.Rectangle; color: string; maskErasers: string[]; clipD?: string; inside?: boolean; cut?: boolean; glyphs?: string[] };

// Glyphs are often drawn with OVERLAPPING contours (Inter's and Cinzel's B and D): fine to fill
// as-is, but paper.js mis-resolves those curve crossings in a boolean op (counters filled, stems
// dropped — T14), and a boolean op against a whole text block misplaces far-away counters (a
// drawInside circle picked up the D of DENTRO — T15). So text keeps its curves until an eraser or
// a drawInside reaches it; then it is split into one solid (flattened, resolved) piece per glyph
// and every op works glyph by glyph.
const solidGlyph = (P: Paper, d: string): paper.PathItem => {
	const g = P.PathItem.create(d);
	g.remove();
	g.fillRule = 'nonzero';
	g.flatten(0.1);
	return g.unite(new P.Path({ insert: false }), { insert: false }) as paper.PathItem;
};

const splitText = (P: Paper, pieces: Work[], area: paper.Rectangle): Work[] => pieces.flatMap(p =>
	p.glyphs && p.item && p.item.bounds.intersects(area)
		? p.glyphs.map(d => ({ item: solidGlyph(P, d), color: p.color, maskErasers: [...p.maskErasers] }))
		: [p]);

/**
 * Resolves one layer in draw order, reproducing Canvas compositing as geometry:
 *   normal     → new piece on top
 *   drawBehind → new piece at the bottom (destination-over)
 *   eraser     → subtracted from every piece drawn before it (destination-out)
 *   drawInside → intersected with the layer's ink so far (source-atop)
 * Only pieces whose outlines actually cross the new shape get a boolean op; nested or disjoint
 * ones are settled with a point test (a running union of the layer's ink cost 100 s on the
 * onboarding scene). Boolean failures degrade to the old mask/clip for that piece and are counted.
 * Text becomes outlines (svgText.ts) and then follows the same rules as any shape; words that
 * cannot (glyph missing or not matching Canvas) stay live text. `text` null = engine unavailable.
 */
export const buildLayerGeometry = async (
	P: Paper,
	shapes: Shape[],
	ox: number,
	oy: number,
	maybeYield: () => Promise<void>,
	text: TextEngine | null,
): Promise<{ pieces: GeometryPiece[]; failures: number; fallbackChars: number }> => {
	let pieces: Work[] = [];
	let failures = 0;
	let fallbackChars = 0;

	for (const s of shapes) {
		await maybeYield();
		let item: paper.PathItem | null;
		let textGlyphs: string[] | undefined;
		try {
			if (s.type === 'text' && s.text) {
				const t = text ? textOutline(text, s, ox, oy) : textAsRuns(s, ox, oy);
				fallbackChars += t.fallbackChars;
				if (t.runs.length > 0) {
					// Only an eraser that reaches the live words masks them.
					const runBox = t.runs.map(r => {
						const b = runBounds(r);
						return new P.Rectangle(b.x, b.y, b.w, b.h);
					}).reduce((a, b) => a.unite(b));
					pieces.push({ runs: t.runs, runBox, color: s.color, maskErasers: [] });
				}
				// Glyph outlines as they are: resolving them would flatten glyphs that overlap a neighbour.
				item = t.d ? P.PathItem.create(t.d) : null;
				if (item) { item.remove(); item.fillRule = 'nonzero'; }
				textGlyphs = t.glyphs;
			} else {
				item = shapeItem(P, s, ox, oy);
			}
		} catch (e) {
			failures++;
			console.warn('[svg] shape geometry failed', s.id, e);
			continue;
		}
		if (!item || item.isEmpty()) continue;
		const shape = item;

		if (s.isEraser) {
			const eraserD = pathD(shape);
			pieces = splitText(P, pieces, shape.bounds);
			pieces = pieces.filter(p => {
				if (p.runs || !p.item) {
					if (!p.runBox || p.runBox.intersects(shape.bounds)) p.maskErasers.push(eraserD);
					return true;
				}
				if (!p.item.bounds.intersects(shape.bounds)) return true;
				const rel = nesting(P, p.item, shape);
				if (rel === 'disjoint') return true;
				if (rel === 'aInB') return false; // piece entirely erased
				try {
					const erased = eraseFrom(P, p.item, shape);
					if (!erased) {
						failures++;
						console.warn('[svg] eraser subtract came back empty, piece masked', s.id);
						p.maskErasers.push(eraserD);
						return true;
					}
					p.item = erased;
					p.cut = true;
					return !p.item.isEmpty();
				} catch (e) {
					failures++;
					console.warn('[svg] eraser subtract failed', s.id, e);
					p.maskErasers.push(eraserD);
					return true;
				}
			});
		} else if (s.isDrawInside && !s.isDrawBehind) {
			// source-atop: shape ∩ (union of the layer's ink) = union of shape ∩ each ink piece
			pieces = splitText(P, pieces, shape.bounds);
			const parts = textGlyphs ? textGlyphs.map(d => solidGlyph(P, d)) : [shape];
			const ink = pieces.slice();
			for (const part of parts) {
				const hits: paper.PathItem[] = [];
				let whole = false;
				for (const p of ink) {
					if (p.inside || p.runs || !p.item || !p.item.bounds.intersects(part.bounds)) continue;
					const rel = nesting(P, part, p.item);
					if (rel === 'disjoint') continue;
					if (rel === 'aInB') { whole = true; break; }                                  // part lies inside ink
					if (rel === 'bInA') { hits.push(p.item.clone({ insert: false }) as paper.PathItem); continue; } // ink inside part
					try {
						hits.push(part.intersect(p.item, { insert: false }) as paper.PathItem);
					} catch (e) {
						failures++;
						console.warn('[svg] drawInside intersect failed', s.id, e);
						pieces.push({ item: part, color: s.color, maskErasers: [], clipD: pathD(p.item), inside: true });
					}
				}
				const clipped = whole ? part : hits.length > 0 ? uniteAll(hits) : null;
				if (clipped && !clipped.isEmpty()) pieces.push({ item: clipped, color: s.color, maskErasers: [], inside: true, cut: !whole });
			}
		} else {
			const piece: Work = { item: shape, color: s.color, maskErasers: [], glyphs: textGlyphs };
			if (s.isDrawBehind) pieces.unshift(piece);
			else pieces.push(piece);
		}
	}

	const out: GeometryPiece[] = [];
	for (const p of pieces) {
		if (p.runs) {
			out.push({ runs: p.runs, color: p.color, maskErasers: p.maskErasers });
			continue;
		}
		const item = p.cut ? dropCrumbs(P, p.item!) : p.item!;
		if (item) out.push({ d: pathD(item), color: p.color, maskErasers: p.maskErasers, clipD: p.clipD });
	}
	P.project.clear();
	return { pieces: out, failures, fallbackChars };
};
