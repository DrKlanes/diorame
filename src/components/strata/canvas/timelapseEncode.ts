// Timelapse video encoding (v3.25.17): WebCodecs H.264 through Mediabunny's MP4 muxer. Mediabunny is imported on
// demand (its own chunk), never at app start. No H.264 encoder → no timelapse (no VP9/WebM fallback in v1).

// Default rate (v3.25.20): 15 fps, Diorame's stepped look; 30 is the other choice (TIMELAPSE_RATES).
export const TIMELAPSE_FPS = 15;

// H.264 levels ≥ 4.0 (byte of the codec string, max macroblocks per frame, max macroblocks per second).
const LEVELS: readonly [string, number, number][] = [
	['28', 8192, 245760],   // 4.0 — 1920 × 1080 at 30 fps
	['2a', 8704, 522240],   // 4.2
	['32', 22080, 589824],  // 5.0 — 1920 × 1920 at 30 fps
	['33', 36864, 983040],  // 5.1
];

/** Codec strings to try, High then Main profile, at the lowest level (≥ 4.0) that holds this size and rate. */
export function avcCandidates(width: number, height: number, fps: number): string[] {
	const mbs = Math.ceil(width / 16) * Math.ceil(height / 16);
	const level = LEVELS.find(([, frame, rate]) => mbs <= frame && mbs * fps <= rate);
	if (!level) return [];
	return [`avc1.6400${level[0]}`, `avc1.4d00${level[0]}`];
}

/** The first H.264 codec string this browser encodes at this size, or null (no WebCodecs, no H.264, too big). */
export async function timelapseCodec(width: number, height: number, fps = TIMELAPSE_FPS): Promise<string | null> {
	if (typeof VideoEncoder === 'undefined' || width % 2 || height % 2) return null;
	for (const codec of avcCandidates(width, height, fps)) {
		try {
			const { supported } = await VideoEncoder.isConfigSupported({ codec, width, height, framerate: fps, bitrate: 8_000_000 });
			if (supported) return codec;
		} catch (_) { /* malformed for this browser: try the next */ }
	}
	return null;
}

export type Mp4Writer = {
	/** Encodes the canvas as it is now as frame `index`; resolves when the encoder accepts more (backpressure). */
	add: (index: number) => Promise<void>;
	finish: () => Promise<Blob>;
	cancel: () => Promise<void>;
};

/** An MP4 (H.264, fast start) fed from `canvas`, one constant-rate frame per `add`. */
export async function createMp4Writer(canvas: HTMLCanvasElement, codec: string, fps = TIMELAPSE_FPS): Promise<Mp4Writer> {
	// Destructured right on the import(): that is what lets Rollup tree-shake the dynamic chunk to the MP4 muxer.
	const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, QUALITY_HIGH } = await import('mediabunny');
	const target = new BufferTarget();
	const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target });
	const source = new CanvasSource(canvas, {
		codec: 'avc',
		fullCodecString: codec,
		quality: QUALITY_HIGH,
		latencyMode: 'quality',
	});
	output.addVideoTrack(source, { frameRate: fps });
	await output.start();
	return {
		add: index => source.add(index / fps, 1 / fps),
		finish: async () => {
			source.close();
			await output.finalize();
			return new Blob([target.buffer!], { type: 'video/mp4' });
		},
		cancel: async () => {
			if (output.state !== 'finalized' && output.state !== 'canceled') await output.cancel();
		},
	};
}
