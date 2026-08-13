// Blur fallback for browsers where ctx.filter is non-functional (WebKit/iPadOS).
// Approximates a Gaussian blur with a mip chain: halve the source down to a
// small level, then rebuild it by doubling. Pure drawImage — GPU-accelerated,
// no getImageData, works everywhere.
//
// The blur amount a mip chain produces is quantized to powers of two, which
// would make the FX sliders jump between plateaus. To get a continuous
// response, two adjacent levels are mixed by the fractional part of the level.

// Measured against native ctx.filter on a step edge (2nd moment of the edge
// derivative): effective sigma ≈ 0.68 · totalDownscale. Inverting it makes
// `radius` mean the same thing on both paths, so a scene looks the same on
// desktop and iPad. Re-measure before changing the resampling structure.
const BLUR_COMPAT_K = 0.68;

// Mips below this get too coarse to reconstruct cleanly.
const MIN_MIP = 2;

// Transparent margin cleared around each intermediate so edge bilinear taps
// never pick up stale pixels from a previous, larger frame.
const GUTTER = 2;

const FORCE_FLAG_KEY = 'diorame-force-blur-compat';
let _forceCompat: boolean | null = null;

// Dev flag: force the compat path on browsers with a working ctx.filter so the
// two routes can be compared side by side. Read once per session.
export function isBlurCompatForced(): boolean {
	if (_forceCompat === null) {
		try { _forceCompat = localStorage.getItem(FORCE_FLAG_KEY) === 'true'; }
		catch { _forceCompat = false; }
	}
	return _forceCompat;
}

// Two ping-pong scratch canvases, lazy module singletons with grow-only sizing
// (resizing a canvas clears it; never shrinking avoids thrash when live 1x and
// HQ-export 2x frames interleave).
const _scratch: (HTMLCanvasElement | null)[] = [null, null];

function getScratch(i: number, minW: number, minH: number): CanvasRenderingContext2D | null {
	let c = _scratch[i];
	if (!c) {
		c = document.createElement('canvas');
		_scratch[i] = c;
	}
	if (c.width < minW) c.width = minW;
	if (c.height < minH) c.height = minH;
	return c.getContext('2d');
}

export const applyBlurCompat = (
	dstCtx: CanvasRenderingContext2D,
	src: HTMLCanvasElement,
	radius: number,
	w: number,
	h: number
): void => {
	if (radius < 0.5 || w < 4 || h < 4) {
		dstCtx.drawImage(src, 0, 0);
		return;
	}

	const ctxA = getScratch(0, w + GUTTER, h + GUTTER);
	const ctxB = getScratch(1, w + GUTTER, h + GUTTER);
	if (!ctxA || !ctxB) {
		dstCtx.drawImage(src, 0, 0);
		return;
	}
	const pong = [ctxA, ctxB];

	// Level = log2 of the total downscale; mix levels `lo` and `lo + 1`.
	const maxLevel = Math.max(0, Math.floor(Math.log2(Math.min(w, h) / MIN_MIP)) - 1);
	const level = Math.log2(Math.max(1, radius / BLUR_COMPAT_K));
	// maxLevel keeps `lo + 1` a usable mip, so the mix stays available at the
	// top of the range — HQ export doubles every radius and lands there.
	const lo = Math.min(maxLevel, Math.floor(level));
	const mix = Math.min(1, Math.max(0, level - lo));

	const sizeAt = (l: number): [number, number] => [
		Math.max(MIN_MIP, Math.round(w / Math.pow(2, l))),
		Math.max(MIN_MIP, Math.round(h / Math.pow(2, l))),
	];

	let source: HTMLCanvasElement = src;
	let cw = w;
	let ch = h;
	let flip = 0;

	const step = (nw: number, nh: number) => {
		const ctx = pong[flip];
		ctx.clearRect(0, 0, nw + GUTTER, nh + GUTTER);
		ctx.drawImage(source, 0, 0, cw, ch, 0, 0, nw, nh);
		source = ctx.canvas;
		cw = nw;
		ch = nh;
		flip = 1 - flip;
	};

	for (let l = 1; l <= lo; l++) step(...sizeAt(l));
	if (lo === 0) step(w, h);   // level 0 still needs to live in a scratch

	const loIdx = 1 - flip;
	const loW = cw;
	const loH = ch;
	step(...sizeAt(lo + 1));

	// Linear mix of the two levels, done at the coarser resolution so it costs
	// almost nothing. source-over with globalAlpha is NOT a linear mix — it
	// attenuates the destination by (1 - mix·srcAlpha), which lets the sharper
	// level survive in the tails and collapses the effective radius. Scaling
	// the destination down first and adding on top is the honest lerp.
	const loCtx = pong[loIdx];
	loCtx.save();
	loCtx.globalCompositeOperation = 'destination-out';
	loCtx.fillStyle = `rgba(0,0,0,${mix})`;
	loCtx.fillRect(0, 0, loW, loH);
	loCtx.globalCompositeOperation = 'lighter';
	loCtx.globalAlpha = mix;
	loCtx.drawImage(source, 0, 0, cw, ch, 0, 0, loW, loH);
	loCtx.restore();

	source = loCtx.canvas;
	cw = loW;
	ch = loH;
	flip = 1 - loIdx;

	// Rebuild by doubling, stopping one level short: the final draw covers the
	// last 2x, so the full-size pass happens once instead of twice.
	while (cw * 4 <= w && ch * 4 <= h) step(cw * 2, ch * 2);

	// Final draw goes through the caller's composite mode and alpha, exactly
	// like the plain drawImage it stands in for.
	dstCtx.drawImage(source, 0, 0, cw, ch, 0, 0, w, h);
};
