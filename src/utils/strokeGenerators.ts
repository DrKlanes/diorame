import { BrushMode } from '../types/strataTypes';

export const generateTaperedStroke = (points: {x:number, y:number}[], maxThickness: number = 20) => {
    if (points.length < 2) return points;

    const leftSide: {x:number, y:number}[] = [];
    const rightSide: {x:number, y:number}[] = [];
    const totalLength = points.length;

    for (let i = 0; i < totalLength; i++) {
        const curr = points[i];
        // Determine direction
        let dirX = 0, dirY = 0;
        if (i === 0) {
            const next = points[i + 1];
            dirX = next.x - curr.x;
            dirY = next.y - curr.y;
        } else if (i === totalLength - 1) {
            const prev = points[i - 1];
            dirX = curr.x - prev.x;
            dirY = curr.y - prev.y;
        } else {
            const prev = points[i - 1];
            const next = points[i + 1];
            dirX = next.x - prev.x;
            dirY = next.y - prev.y;
        }

        const len = Math.hypot(dirX, dirY);
        if (len === 0) continue;
        const normX = -dirY / len;
        const normY = dirX / len;

        // Tapering logic
        // 0 -> 1 -> 0 based on progress
        const t = i / (totalLength - 1);
        const thicknessFactor = Math.sin(t * Math.PI); // Simple sine arch
        const halfWidth = (maxThickness / 2) * thicknessFactor;

        leftSide.push({
            x: curr.x + normX * halfWidth,
            y: curr.y + normY * halfWidth
        });
        rightSide.push({
            x: curr.x - normX * halfWidth,
            y: curr.y - normY * halfWidth
        });
    }

    // Combine: Left side forward, Right side reversed
    return [...leftSide, ...rightSide.reverse()];
};

export const generateUniformStroke = (points: {x:number, y:number}[], thickness: number = 20) => {
    if (points.length < 2) return points;

    // Step 1: Densify the input points to ensure consistent width
    // This is crucial for fast strokes with few sample points
    const densifiedPoints: {x:number, y:number}[] = [];
    const targetSegmentLength = Math.max(thickness / 4, 2); // Adaptive based on thickness

    for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);

        densifiedPoints.push(p1);

        // Insert intermediate points if segment is too long
        if (dist > targetSegmentLength) {
            const numSegments = Math.ceil(dist / targetSegmentLength);
            for (let j = 1; j < numSegments; j++) {
                const t = j / numSegments;
                densifiedPoints.push({
                    x: p1.x + dx * t,
                    y: p1.y + dy * t
                });
            }
        }
    }
    densifiedPoints.push(points[points.length - 1]);

    // Step 2: Apply aggressive smoothing using weighted averaging (multiple passes)
    // This creates smooth curves while maintaining point density for uniform width
    let smoothedSpine = [...densifiedPoints];
    const smoothingPasses = 3; // Multiple passes for smoother curves
    const smoothingWeight = 0.3; // How much to blend with neighbors

    for (let pass = 0; pass < smoothingPasses; pass++) {
        const tempSpine: {x:number, y:number}[] = [];

        for (let i = 0; i < smoothedSpine.length; i++) {
            if (i === 0 || i === smoothedSpine.length - 1) {
                // Keep endpoints as-is
                tempSpine.push(smoothedSpine[i]);
            } else {
                // Weighted average with neighbors
                const prev = smoothedSpine[i - 1];
                const curr = smoothedSpine[i];
                const next = smoothedSpine[i + 1];

                tempSpine.push({
                    x: curr.x * (1 - smoothingWeight) + (prev.x + next.x) * smoothingWeight * 0.5,
                    y: curr.y * (1 - smoothingWeight) + (prev.y + next.y) * smoothingWeight * 0.5
                });
            }
        }
        smoothedSpine = tempSpine;
    }

    // Step 3: Generate stroke outline with consistent perpendiculars
    const leftSide: {x:number, y:number}[] = [];
    const rightSide: {x:number, y:number}[] = [];
    const totalLength = smoothedSpine.length;
    const halfWidth = thickness / 2;

    for (let i = 0; i < totalLength; i++) {
        const curr = smoothedSpine[i];
        let dirX = 0, dirY = 0;

        if (i === 0 && totalLength > 1) {
            const next = smoothedSpine[i + 1];
            dirX = next.x - curr.x;
            dirY = next.y - curr.y;
        } else if (i > 0) {
            const prev = smoothedSpine[i - 1];
            dirX = curr.x - prev.x;
            dirY = curr.y - prev.y;
        }

        const len = Math.hypot(dirX, dirY);
        if (len === 0) continue;

        const normX = -dirY / len;
        const normY = dirX / len;

        leftSide.push({
            x: curr.x + normX * halfWidth,
            y: curr.y + normY * halfWidth
        });
        rightSide.push({
            x: curr.x - normX * halfWidth,
            y: curr.y - normY * halfWidth
        });
    }

    return [...leftSide, ...rightSide.reverse()];
};

// ---- Deterministic noise helpers for INK stroke ----
const _hashU32 = (n: number): number => {
    n = (n + 0x9e3779b9) | 0;
    n = Math.imul(n ^ (n >>> 16), 0x85ebca6b);
    n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35);
    return (n ^ (n >>> 16)) >>> 0;
};
const _noise2 = (seed: number, i: number): number => {
	return (_hashU32(seed ^ (i * 2654435761)) / 0xffffffff) * 2 - 1;
};
const _smoothNoise = (seed: number, x: number): number => {
	const ix = Math.floor(x);
	const fx = x - ix;
	const a = _noise2(seed, ix);
	const b = _noise2(seed, ix + 1);
	const t = fx * fx * (3 - 2 * fx); // smoothstep
	return a + (b - a) * t;
};
const _spineSeed = (pts: {x:number,y:number}[]): number => {
    if (pts.length === 0) return 0;
    const a = pts[0], b = pts[Math.min(1, pts.length - 1)], c = pts[pts.length - 1];
    return _hashU32(Math.round(a.x*100) ^ Math.round(a.y*73) ^ Math.round(b.x*51) ^ Math.round(c.y*37) ^ (pts.length*7919));
};
const _inkDensify = (pts: {x:number,y:number}[], segLen: number) => {
    const out: {x:number,y:number}[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i], p2 = pts[i+1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y, d = Math.hypot(dx, dy);
        out.push(p1);
        if (d > segLen) { const n = Math.ceil(d / segLen); for (let j = 1; j < n; j++) { const t = j / n; out.push({x: p1.x+dx*t, y: p1.y+dy*t}); } }
    }
    out.push(pts[pts.length - 1]);
    return out;
};
const _inkSmoothPass = (pts: {x:number,y:number}[], w: number) => {
    const out: {x:number,y:number}[] = new Array(pts.length);
    out[0] = pts[0]; out[pts.length - 1] = pts[pts.length - 1];
    for (let i = 1; i < pts.length - 1; i++) {
        const prev = pts[i-1], curr = pts[i], next = pts[i+1];
        out[i] = { x: curr.x*(1-w) + (prev.x+next.x)*w*0.5, y: curr.y*(1-w) + (prev.y+next.y)*w*0.5 };
    }
    return out;
};

export const generateInkStroke = (points: {x:number,y:number}[], thickness: number = 20): {x:number,y:number}[] => {
	if (points.length < 2) return points;
	const seed = _spineSeed(points);
	const segLen = Math.max(thickness / 5, 1.5);
	let spine = _inkDensify(points, segLen);
	for (let p = 0; p < 3; p++) spine = _inkSmoothPass(spine, 0.3);
	// Path wobble — organic sway
	const wobbleAmp = thickness * 0.10;
	const wobbleFreq = 0.05;
	for (let i = 1; i < spine.length - 1; i++) {
		const prev = spine[i-1], next = spine[Math.min(i+1, spine.length-1)];
		const ddx = next.x - prev.x, ddy = next.y - prev.y;
		const len = Math.hypot(ddx, ddy);
		if (len === 0) continue;
		const nx = -ddy/len, ny = ddx/len;
		const n = _noise2(seed, Math.round(i*wobbleFreq*1000)) + 0.5*_noise2(seed+9991, Math.round(i*wobbleFreq*2000));
		spine[i] = { x: spine[i].x + nx*n*wobbleAmp, y: spine[i].y + ny*n*wobbleAmp };
	}
	// Cumulative arc-length
	const arcLen: number[] = new Array(spine.length);
	arcLen[0] = 0;
	for (let i = 1; i < spine.length; i++) { const adx = spine[i].x-spine[i-1].x, ady = spine[i].y-spine[i-1].y; arcLen[i] = arcLen[i-1]+Math.hypot(adx,ady); }
	const totalArc = arcLen[spine.length-1] || 1;
	// Build outline
	const halfBase = thickness / 2;
	const leftSide: {x:number,y:number}[] = [];
	const rightSide: {x:number,y:number}[] = [];
	for (let i = 0; i < spine.length; i++) {
		const curr = spine[i];
		let odx = 0, ody = 0;
		if (i === 0) { odx = spine[1].x-curr.x; ody = spine[1].y-curr.y; }
		else if (i === spine.length-1) { odx = curr.x-spine[i-1].x; ody = curr.y-spine[i-1].y; }
		else { odx = spine[i+1].x-spine[i-1].x; ody = spine[i+1].y-spine[i-1].y; }
		const len = Math.hypot(odx, ody);
		if (len === 0) continue;
		const nx = -ody/len, ny = odx/len;
		// Width variation — organic thick/thin, smooth along arc
		const wPos = arcLen[i] / (thickness * 4);
		const widthNoise = 1 + 0.22*_smoothNoise(seed+4441, wPos) + 0.10*_smoothNoise(seed+5557, wPos*2.2);
		const halfW = halfBase * widthNoise;
		// Rough edge bumps — ink bleed feel, arc-length spaced
		const bumpWaveLen = Math.max(thickness * 5.0, 35);
		const bumpPos = arcLen[i] / bumpWaveLen;
		const bumpL = 1 + 0.15*_smoothNoise(seed+7727, bumpPos) + 0.08*_smoothNoise(seed+1123, bumpPos*2.5);
		const bumpR = 1 + 0.15*_smoothNoise(seed+8839, bumpPos+0.5) + 0.08*_smoothNoise(seed+2237, bumpPos*2.5+0.5);
		leftSide.push({ x: curr.x + nx*halfW*bumpL, y: curr.y + ny*halfW*bumpL });
		rightSide.push({ x: curr.x - nx*halfW*bumpR, y: curr.y - ny*halfW*bumpR });
	}
	// Round end caps — semi-ellipse seamlessly connecting left and right sides
	const capSteps = 8;
	const startCap: {x:number,y:number}[] = [];
	const endCap: {x:number,y:number}[] = [];
	if (leftSide.length > 0 && rightSide.length > 0) {
		const P_R = rightSide[0], P_L = leftSide[0], s0 = spine[0];
		const sDir = { x: spine[1].x - s0.x, y: spine[1].y - s0.y };
		const sLen = Math.hypot(sDir.x, sDir.y) || 1;
		const sTx = sDir.x / sLen, sTy = sDir.y / sLen;
		const cx1 = (P_L.x + P_R.x) / 2, cy1 = (P_L.y + P_R.y) / 2;
		const rTan1 = Math.hypot(P_L.x - P_R.x, P_L.y - P_R.y) / 2;
		const ax1 = P_L.x - cx1, ay1 = P_L.y - cy1;
		const bx1 = -sTx * rTan1, by1 = -sTy * rTan1;
		for (let j = 1; j < capSteps; j++) {
			const theta = Math.PI * (1 - j / capSteps); // Sweeps from P_R (PI) to P_L (0)
			startCap.push({
				x: cx1 + ax1 * Math.cos(theta) + bx1 * Math.sin(theta),
				y: cy1 + ay1 * Math.cos(theta) + by1 * Math.sin(theta)
			});
		}

		const P_L2 = leftSide[leftSide.length - 1], P_R2 = rightSide[rightSide.length - 1];
		const sE = spine[spine.length - 1], eIdx = Math.max(0, spine.length - 2);
		const eDir = { x: sE.x - spine[eIdx].x, y: sE.y - spine[eIdx].y };
		const eLen = Math.hypot(eDir.x, eDir.y) || 1;
		const eTx = eDir.x / eLen, eTy = eDir.y / eLen;
		const cx2 = (P_L2.x + P_R2.x) / 2, cy2 = (P_L2.y + P_R2.y) / 2;
		const rTan2 = Math.hypot(P_L2.x - P_R2.x, P_L2.y - P_R2.y) / 2;
		const ax2 = P_L2.x - cx2, ay2 = P_L2.y - cy2;
		const bx2 = eTx * rTan2, by2 = eTy * rTan2;
		for (let j = 1; j < capSteps; j++) {
			const theta = Math.PI * (j / capSteps); // Sweeps from P_L2 (0) to P_R2 (PI)
			endCap.push({
				x: cx2 + ax2 * Math.cos(theta) + bx2 * Math.sin(theta),
				y: cy2 + ay2 * Math.cos(theta) + by2 * Math.sin(theta)
			});
		}
	}
	return [...startCap, ...leftSide, ...endCap, ...rightSide.reverse()];
};

/** Route to the correct stroke generator based on BrushMode. */
export const generateStrokeForMode = (
    mode: BrushMode,
    points: {x:number, y:number}[],
    thickness: number,
): {x:number, y:number}[] => {
    if (mode === 'tapered') return generateTaperedStroke(points, thickness);
    if (mode === 'ink') return generateInkStroke(points, thickness);
    return generateUniformStroke(points, thickness);
};
