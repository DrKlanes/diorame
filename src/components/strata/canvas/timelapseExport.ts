import { toast } from 'sonner@2.0.3';
import { playSound } from '../../../utils/soundManager';
import { downloadBlob } from '../../../utils/downloadBlob';
import { analytics } from '../../../analytics/analytics';
import { UNTITLED_PROJECT_SENTINEL } from '../../../constants/project';
import { projectFileStem } from '../../../utils/projectMeta';
import { renderTimelapse, timelapseRect, timelapseSize, type TimelapseBackground, type TimelapseFraming } from './timelapse';
import { timelapseProgress } from './timelapseProgress';
import type { AnimationExportRenderOptions } from './animationExportRender';
import type { TranslationParams } from '../../../i18n';

type TFunction = (key: string, params?: TranslationParams) => string;

/** What the menu chose (TimelapseSection): set before REQUEST_EXPORT 'timelapse', consumed by the export. */
export type TimelapseRequest = { framing: TimelapseFraming; duration: number; long: number; background: TimelapseBackground };

let _next: TimelapseRequest | null = null;

export function setNextTimelapse(request: TimelapseRequest): void {
	_next = request;
}

type WakeLockLike = { release: () => Promise<void> };

// The screen must not sleep while encoding (a locked iPad suspends the page). Not available or refused → go on without.
async function keepScreenAwake(): Promise<WakeLockLike | null> {
	try {
		const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: 'screen') => Promise<WakeLockLike> } }).wakeLock;
		return wakeLock ? await wakeLock.request('screen') : null;
	} catch {
		return null;
	}
}

/**
 * «Timelapse (vídeo)» (v3.25.19): the DRAW drawing rebuilt stroke by stroke into an MP4 (timelapse.ts), with the
 * framing, size and background chosen in the menu. Real progress and cancel through timelapseProgress (the modal);
 * screen wake lock while it runs. Whatever happens — done, canceled, failed — the lock is released, the progress
 * closes and onFinish runs; renderTimelapse itself cancels the encoder and frees its canvases.
 */
export async function exportAsTimelapse(
	options: AnimationExportRenderOptions,
	projectName: string,
	onFinish: () => void,
	t: TFunction,
): Promise<void> {
	const request = _next;
	_next = null;
	const controller = new AbortController();
	let lock: WakeLockLike | null = null;
	try {
		if (!request) throw new Error('timelapse: no request');
		// The live container size: the same world rectangle «Vista» shows.
		const rect = timelapseRect(options.state, request.framing, { w: options.w, h: options.h });
		if (!rect) throw new Error('timelapse: nothing to frame');
		const size = timelapseSize(rect, request.long);
		timelapseProgress.start(controller);
		lock = await keepScreenAwake();
		const result = await renderTimelapse(options, {
			rect,
			...size,
			background: request.background,
			duration: request.duration,
			signal: controller.signal,
			onProgress: (done, total) => timelapseProgress.update(done, total),
		});
		const displayName = projectName === UNTITLED_PROJECT_SENTINEL ? t('topbar.file.untitledProject') : projectName;
		downloadBlob(result.blob, `${projectFileStem(displayName)} timelapse.mp4`);
		toast.success(t('toast.export.timelapse.successTitle'), { description: t('toast.export.timelapse.successDesc'), duration: 2500 });
		playSound('success');
		analytics.exported('timelapse', options.state.mode, request.background);
	} catch (e) {
		if (e instanceof DOMException && e.name === 'AbortError') {
			toast(t('toast.export.timelapse.canceled'), { duration: 2000 });
		} else {
			console.error('Export timelapse failed', e);
			toast.error(t('toast.export.timelapse.errorTitle'), { description: t('common.pleaseRetry'), duration: 3000 });
		}
	} finally {
		if (lock) await lock.release().catch(() => {});
		timelapseProgress.end();
		onFinish();
	}
}
