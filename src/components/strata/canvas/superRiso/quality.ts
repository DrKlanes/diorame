// Super Riso — automatic quality levels (L1, decision 5 of the plan).
//
//   full     the lab's engine + lossless variants. Desktop, and every export always.
//   preview  live only, on devices measured as slow («modo ligero», v3.20.14): in motion res .5 +
//            preview and light shaders, pipelined (pipe1), printed at 12 fps at most and only when
//            something changed (held in between). With the image still ~300 ms, one frame is refined
//            at full level and res 1 and held until something moves (applySuperRiso).
// The level is MEASURED, never guessed from the device type: the first ~30 live frames at a
// canvas size run at full level and the median cost decides (GPU timer where there is one, else
// the wait from upload to a 1×1 readback: see applySuperRiso.runSync). Re-measured only when the
// canvas size changes.

import { cfg, DEBUG } from './runtimeConfig';
import { setSuperRisoPreviewDevice } from './deviceLevel';

export type Level = 'detect' | 'full' | 'preview';

const WARMUP_FRAMES = 5;      // shader variants and the LUT compile on the first renders
const MEASURE_FRAMES = 30;
const THRESHOLD_MS = 12;
export const STILL_MS = 300;
/** Camera still and something animated: a new refine at most every ANIM_MS (8 per second). */
export const ANIM_MS = 125;

const levels = new Map<string, Exclude<Level, 'detect'>>();
let detecting: { size: string; seen: number; samples: number[] } | null = null;
let lastReport = '';

const sizeKey = (w: number, h: number) => `${w}×${h}`;

/** Level for this canvas size ('detect' while it is being measured). */
export function levelFor(w: number, h: number): Level {
	if (cfg.forceLevel) { setSuperRisoPreviewDevice(cfg.forceLevel === 'preview'); return cfg.forceLevel; }
	const lv = levels.get(sizeKey(w, h));
	if (lv) { setSuperRisoPreviewDevice(lv === 'preview'); return lv; }
	return 'detect';
}

/** One detection sample at full level (null: no GPU timer result yet, the frame only counts as warm-up). */
export function detectSample(w: number, h: number, ms: number | null, how: string): void {
	const size = sizeKey(w, h);
	if (!detecting || detecting.size !== size) detecting = { size, seen: 0, samples: [] };
	if (++detecting.seen > WARMUP_FRAMES + 3 * MEASURE_FRAMES && !detecting.samples.length) {
		// A GPU timer that never answers (disjoint): stay at the full level rather than measure forever.
		levels.set(size, 'full'); detecting = null; lastReport = `${size}: sin medida (${how}) → full`;
		return;
	}
	if (detecting.seen <= WARMUP_FRAMES || ms === null) return;
	detecting.samples.push(ms);
	if (detecting.samples.length < MEASURE_FRAMES) return;
	const s = [...detecting.samples].sort((a, b) => a - b);
	const median = s[s.length >> 1];
	const lv = median > THRESHOLD_MS ? 'preview' : 'full';
	levels.set(size, lv);
	detecting = null;
	lastReport = `${size}: coste p50 ${median.toFixed(1)} ms (${how}) → ${lv}`;
	setSuperRisoPreviewDevice(lv === 'preview');
	if (DEBUG) console.info(`[SuperRiso] quality level ${lastReport}`);
}

export const qualityReport = (): string => lastReport;

// ── Stillness ─────────────────────────────────────────────────────────────────────────────────
let lastMotion: readonly number[] | null = null;
let lastScene: unknown = null;
let stillSince = 0;
/** srdebug: what broke the stillness last (motion indices or 'scene'). */
export let lastChange = '';

/** ms the image has been still: same motion numbers and same scene (state object) as before. */
export function stillFor(motion: readonly number[] | undefined, scene: unknown, now: number): number {
	const same = !!motion && !!lastMotion && scene === lastScene
		&& motion.length === lastMotion.length && motion.every((v, i) => v === lastMotion![i]);
	if (!same) {
		stillSince = now;
		lastChange = scene !== lastScene ? 'scene' : (motion ?? []).map((v, i) => v === lastMotion?.[i] ? '' : i).filter(x => x !== '').join(',');
	}
	lastMotion = motion ?? null;
	lastScene = scene;
	return now - stillSince;
}

let animScene: unknown = null, animGen = 0;
/** What animates on its own as a key: anim numbers + (stop motion playing) a generation bumped per scene change. */
export function animKey(anim: readonly number[] | undefined, scene: unknown, playing: boolean): string {
	if (playing && scene !== animScene) { animScene = scene; animGen++; }
	return `${(anim ?? []).join(',')}|${playing ? animGen : 0}`;
}
