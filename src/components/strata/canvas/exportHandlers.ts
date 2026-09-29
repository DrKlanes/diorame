import { toast } from 'sonner@2.0.3';
import { playSound } from '../../../utils/soundManager';
import { downloadBlob } from '../../../utils/downloadBlob';
import { analytics } from '../../../analytics/analytics';
import { getFilenameBase, UNTITLED_PROJECT_SENTINEL } from '../../../constants/project';
import type { TranslationParams } from '../../../i18n';
import { renderFrame, type RenderContext } from './renderPipeline';
import type { AnimationExportRenderOptions } from './animationExportRender';
import type { GizmoHandles } from './drawGizmo';

// Max physical dimension for any exported PNG (prevents monster canvases).
const MAX_DIMENSION = 8192;

// ─── PNG Export quality singleton ────────────────────────────────────────────────────────
// Set from UI before triggering REQUEST_EXPORT. Reset to 'device' after each export.
let _nextPNGQuality: 'device' | 'hq' = 'device';

export function setNextPNGQuality(quality: 'device' | 'hq'): void {
	_nextPNGQuality = quality;
}

/**
 * t function signature. Passed from the caller (a React component that has
 * access to useTranslation) so toast messages translate with the current UI language.
 * Why: exportHandlers are pure functions outside React's component tree.
 */
type TFunction = (key: string, params?: TranslationParams) => string;

/**
 * Renders the current scene ONCE into a dedicated canvas at `scale`× resolution
 * using the full render pipeline (a true re-render — NOT a bitmap upscale).
 *
 * Critically, every canvas here is created fresh for the export. It NEVER touches
 * the live RAF's offscreen refs, so sizing them to S× cannot disturb the live
 * render. This mirrors animationExportRender.ts's dedicated-canvas pattern.
 *
 * The export canvas is intentionally left at its default size so renderFrame's
 * resize branch fires and re-inits the noise canvas at PHYSICAL size (otherwise
 * grain would sample the logical-size snapshot). renderScale=S makes the pipeline
 * dimension the raster to S·w × S·h while keeping the framing identical.
 */
const renderSnapshotAtScale = (
	options: AnimationExportRenderOptions,
	scale: number,
): HTMLCanvasElement => {
	const exportCanvas = document.createElement('canvas');
	const exportCtx = exportCanvas.getContext('2d', { alpha: false })!;

	// Dedicated working canvases — renderFrame's ensureCanvas sizes them to physical.
	const offscreen = document.createElement('canvas');
	const helper = document.createElement('canvas');
	const composition = document.createElement('canvas');
	const pixel = document.createElement('canvas');
	pixel.width = 1; pixel.height = 1;

	const transformHandlesRef: { current: GizmoHandles | null } = { current: null };

	const rc: RenderContext = {
		state: options.state,
		isDrawing: false,
		currentPoints: [],
		shapesByZ: options.shapesByZ,
		waypoints: [],
		sortedZs: options.sortedZs,
		transformState: {
			isActive: false,
			mode: 'none',
			startP: { x: 0, y: 0 },
			startTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
			centerX: 0,
			centerY: 0,
			layerBB: null,
			currentTransform: { x: 0, y: 0, scale: 1, rotation: 0 },
			engaged: false,
		},

		// Read-write refs (fake — mutations stay local to this single render)
		cameraRef: { current: { ...options.camera } },
		storyFocusRef: { current: null },
		lastShakeRef: { current: { x: 0, y: 0, z: 0 } },
		transformHandlesRef,
		// Overlays are skipped in exports, so the marker never draws. 0 = never set.
		poiMarkerSetAtRef: { current: 0 },
		// Escrito por renderFrame; en export no lo lee nadie.
		drawnFrameRef: { current: null },
		lastRenderTimeRef: { current: 0 },
		orbitRef: { current: { azimuth: 0, elevation: 0.2, targetAzimuth: 0, targetElevation: 0.2, panOffsetX: 0, panOffsetY: 0 } },

		accumulatedTimeRef: { current: 0 },
		accumulatedHandheldTimeRef: { current: 0 },
		lastTimeRef: { current: Date.now() },
		wiggleFrameRef: { current: 0 },
		shapePatternRef: { current: options.shapePattern },

		// Dedicated canvas refs (never touch the live RAF)
		offscreenCanvasRef: { current: offscreen },
		helperCanvasRef: { current: helper },
		compositionCanvasRef: { current: composition },
		pixelCanvasRef: { current: pixel },
		tempCanvasRef: { current: null },
		noiseCanvasRef: { current: options.noiseCanvas },

		paperImg: options.paperImg,
		risoGrain: options.risoGrain,
		grungeImg: options.grungeImg,
		particles: options.particles,

		flipButtonsEl: null,
		w: options.w,
		h: options.h,
		getActiveZ: options.getActiveZ,

		skipLiveStroke: true,
		skipCinematicOverlays: true,
		renderScale: scale,
	};

	renderFrame(exportCtx, rc);
	return exportCanvas;
};

/**
 * Exports the current canvas frame as a PNG file.
 *
 * device: upscales the live canvas to device pixels (legacy behavior, unchanged).
 * hq:     re-renders the whole scene at 2× through the pipeline (true detail).
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
	try {
		let src: HTMLCanvasElement;
		if (quality === 'hq') {
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
			analytics.exported(quality === 'hq' ? 'png_hq' : 'png');
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
			analytics.exported(animation ? 'mp4_animation' : 'mp4');
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
