import { toast } from 'sonner@2.0.3';
import { playSound } from '../../../utils/soundManager';
import { downloadBlob } from '../../../utils/downloadBlob';
import { analytics } from '../../../analytics/analytics';
import { getFilenameBase, UNTITLED_PROJECT_SENTINEL } from '../../../constants/project';
import type { TranslationParams } from '../../../i18n';
import { renderSnapshot, renderDrawSnapshot } from './drawSnapshot';
import type { AnimationExportRenderOptions } from './animationExportRender';
import type { AppMode, ExportBackground } from '../../../types/strataTypes';

// Max physical dimension for any exported PNG (prevents monster canvases).
const MAX_DIMENSION = 8192;

// ─── PNG Export quality singleton ────────────────────────────────────────────────────────
// Set from UI before triggering REQUEST_EXPORT. Reset to 'device' after each export.
let _nextPNGQuality: 'device' | 'hq' = 'device';

export function setNextPNGQuality(quality: 'device' | 'hq'): void {
	_nextPNGQuality = quality;
}

// DRAW only (CINEMA ignores it). Set from the UI before REQUEST_EXPORT, like the quality;
// reset to 'paper' after each export.
let _nextPNGBackground: ExportBackground = 'paper';

export function setNextPNGBackground(background: ExportBackground): void {
	_nextPNGBackground = background;
}

/**
 * t function signature. Passed from the caller (a React component that has
 * access to useTranslation) so toast messages translate with the current UI language.
 * Why: exportHandlers are pure functions outside React's component tree.
 */
type TFunction = (key: string, params?: TranslationParams) => string;

// renderSnapshot — extracted to drawSnapshot.ts

const renderSnapshotAtScale = (
	options: AnimationExportRenderOptions,
	scale: number,
): HTMLCanvasElement => renderSnapshot(options, scale).canvas;

// 2× clamped so the physical size never exceeds MAX_DIMENSION.
const hqScale = (options: AnimationExportRenderOptions): number => {
	const maxByDim = Math.min(
		MAX_DIMENSION / Math.max(1, options.w),
		MAX_DIMENSION / Math.max(1, options.h),
	);
	return Math.min(2, maxByDim);
};

// renderDrawSnapshot — extracted to drawSnapshot.ts

/**
 * Exports the current canvas frame as a PNG file.
 *
 * CINEMA —
 * device: upscales the live canvas to device pixels (legacy behavior, unchanged).
 * hq:     re-renders the whole scene at 2× through the pipeline (true detail).
 * DRAW —  always a re-render (see renderDrawSnapshot): device = ×1, hq = ×2, same framing,
 *         with the background chosen via setNextPNGBackground.
 */
export const exportAsPNG = (
	canvas: HTMLCanvasElement,
	options: AnimationExportRenderOptions,
	projectName: string,
	onFinish: () => void,
	t: TFunction,
): void => {
	const quality = _nextPNGQuality;
	_nextPNGQuality = 'device';
	const background = _nextPNGBackground;
	_nextPNGBackground = 'paper';
	const isDraw = options.state.mode === 'drawing';
	try {
		let src: HTMLCanvasElement;
		if (isDraw) {
			src = renderDrawSnapshot(options, quality === 'hq' ? hqScale(options) : 1, background);
		} else if (quality === 'hq') {
			// True 2× re-render. Clamp so the physical size never exceeds MAX_DIMENSION.
			let scale = 2;
			const maxByDim = Math.min(
				MAX_DIMENSION / Math.max(1, options.w),
				MAX_DIMENSION / Math.max(1, options.h),
			);
			if (scale > maxByDim) scale = maxByDim;
			src = renderSnapshotAtScale(options, scale);
		} else {
			// device: upscale the live bitmap to device pixels (unchanged behavior).
			const dpr = window.devicePixelRatio || 1;
			const targetW = Math.min(Math.round(canvas.width * dpr), MAX_DIMENSION);
			const targetH = Math.min(Math.round(canvas.height * dpr), MAX_DIMENSION);
			if (targetW !== canvas.width || targetH !== canvas.height) {
				const off = document.createElement('canvas');
				off.width = targetW;
				off.height = targetH;
				off.getContext('2d')!.drawImage(canvas, 0, 0, targetW, targetH);
				src = off;
			} else {
				src = canvas;
			}
		}
		const displayName = projectName === UNTITLED_PROJECT_SENTINEL
			? t('topbar.file.untitledProject')
			: projectName;
		const sanitizedName = getFilenameBase(displayName);
		// toBlob (async) instead of toDataURL: iPadOS WebKit silently drops
		// downloads of large data: URLs. Toasts and onFinish resolve in the callback.
		src.toBlob((blob) => {
			if (!blob) {
				console.error("Export PNG failed: toBlob returned null");
				toast.error(t('toast.export.snapshot.errorTitle'), {
					description: t('common.pleaseRetry'),
					duration: 3000,
				});
				onFinish();
				return;
			}
			downloadBlob(blob, `${sanitizedName}-${Date.now()}.png`);
			toast.success(t('toast.export.snapshot.successTitle'), {
				description: t('toast.export.snapshot.successDesc'),
				duration: 2000,
			});
			playSound('success');
			analytics.exported(quality === 'hq' ? 'png_hq' : 'png', options.state.mode, isDraw ? background : undefined);
			onFinish();
		}, 'image/png');
	} catch (e) {
		console.error("Export PNG failed", e);
		toast.error(t('toast.export.snapshot.errorTitle'), {
			description: t('common.pleaseRetry'),
			duration: 3000,
		});
		onFinish();
	}
};

/**
 * Static-scene recording duration when not exporting an animation.
 */
const STATIC_RECORD_MS = 6000;

/**
 * Pre-roll before recorder.start in animation mode. Lets React commit the
 * reset-to-first-frame dispatch and the RAF repaint frame[0] before capture
 * begins. This time is HARMLESS to per-frame timing because playback only
 * starts AFTER recorder.start() — frame[0] is simply held static until then.
 */
const ANIMATION_SETTLE_MS = 80;

/**
 * Animation recording context. When provided, exportAsMP4 records the live
 * flipbook for `loops` complete cycles instead of a fixed-length static clip.
 * dispatch is kept loosely typed so this pure module stays decoupled from the
 * reducer's Action union.
 */
export type AnimationRecordOptions = {
	dispatch: (action: { type: string; payload?: unknown }) => void;
	framerate: number;       // fps preset (4 | 6 | 8)
	frameCount: number;      // number of real animation frames in the sequence
	firstFrameIndex: number; // layer index of the first frame (for a clean loop start)
	loops: number;           // complete loops to record (1 | 2 | 3)
};

/**
 * Records the canvas and downloads it as WebM or MP4.
 *
 * Without `animation`: records a fixed STATIC_RECORD_MS clip of the live canvas
 * (legacy behavior — cinematic scene, no flipbook).
 *
 * With `animation`: records exactly `loops` complete cycles of the flipbook.
 * Timing sequence (see ANIMATION_SETTLE_MS for the pre-roll rationale):
 *   1. Stop any current playback + jump to frame[0] (stable, clean loop start).
 *   2. Wait ANIMATION_SETTLE_MS so frame[0] is committed + painted.
 *   3. recorder.start() captures frame[0]; THEN start playback so frame[0]
 *      gets its full period before the first ADVANCE.
 *   4. Stop after durationMs = period × frameCount × loops — exactly when the
 *      next wrap to frame[0] would occur, so loops are clean and we never
 *      capture an extra frame.
 *   5. recorder.onstop stops playback and downloads the blob.
 *
 * onFinish is called inside recorder.onstop (async) and on error.
 */
export const exportAsMP4 = (
	canvas: HTMLCanvasElement,
	projectName: string,
	recordedChunksRef: { current: Blob[] },
	onFinish: () => void,
	t: TFunction,
	mode: AppMode,
	animation?: AnimationRecordOptions,
): void => {
	try {
		const stream = canvas.captureStream(60);
		let mimeType = 'video/webm;codecs=vp9';
		let ext = 'webm';
		if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
			mimeType = 'video/mp4;codecs=h264'; ext = 'mp4';
		} else if (MediaRecorder.isTypeSupported('video/mp4')) {
			mimeType = 'video/mp4'; ext = 'mp4';
		}

		const recorder = new MediaRecorder(stream, { mimeType });
		recordedChunksRef.current = [];
		recorder.ondataavailable = (e) => {
			if (e.data.size > 0) recordedChunksRef.current.push(e.data);
		};
		recorder.onstop = () => {
			// Stop the playback we started for the recording (animation mode only).
			if (animation) {
				animation.dispatch({ type: 'SET_ANIMATION_PLAYING', payload: false });
			}
			const blob = new Blob(recordedChunksRef.current, { type: mimeType });
			const displayName = projectName === UNTITLED_PROJECT_SENTINEL
				? t('topbar.file.untitledProject')
				: projectName;
			const sanitizedName = getFilenameBase(displayName);
			downloadBlob(blob, `${sanitizedName}-${Date.now()}.${ext}`);
			toast.success(t('toast.export.animation.successTitle'), {
				description: t('toast.export.animation.successDesc'),
				duration: 2000,
			});
			playSound('success');
			analytics.exported(animation ? 'mp4_animation' : 'mp4', mode);
			onFinish();
		};

		if (animation) {
			const period = 1000 / animation.framerate;
			const durationMs = period * animation.frameCount * animation.loops;
			// 1. Stable start: stop any current playback, jump to frame[0].
			animation.dispatch({ type: 'SET_ANIMATION_PLAYING', payload: false });
			animation.dispatch({ type: 'SET_CURRENT_LAYER', payload: animation.firstFrameIndex });
			// 2-4. Pre-roll, then record + start playback, then stop after `loops` cycles.
			setTimeout(() => {
				recorder.start();
				// Start playback AFTER capture begins: the first ADVANCE fires one
				// period later, so frame[0] is captured for its full period.
				animation.dispatch({ type: 'SET_ANIMATION_PLAYING', payload: true });
				setTimeout(() => { recorder.stop(); }, durationMs);
			}, ANIMATION_SETTLE_MS);
		} else {
			recorder.start();
			setTimeout(() => { recorder.stop(); }, STATIC_RECORD_MS);
		}
	} catch (e) {
		console.error("Export MP4 failed", e);
		// On error, ensure playback doesn't keep running.
		if (animation) {
			animation.dispatch({ type: 'SET_ANIMATION_PLAYING', payload: false });
		}
		toast.error(t('toast.export.animation.errorTitle'), {
			description: t('common.pleaseRetry'),
			duration: 3000,
		});
		onFinish();
	}
};
