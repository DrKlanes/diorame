// Ambient types for `gifenc` (v1.0.3), which ships no typings and has no
// @types/gifenc on npm. Without this, noImplicitAny rejects the import in
// canvas/gifHandler.ts (TS7016).
//
// DELIBERATELY PARTIAL. This declares only what gifHandler.ts actually calls,
// with the signatures read off the package's own source (`node_modules/gifenc/src/`),
// not guessed. A blanket `declare module 'gifenc';` would silence the compiler
// while typing every one of these as `any` — the same hole, just quieter.
//
// The trade-off of being partial: reaching for a gifenc feature not listed here
// fails to compile until it is added. That is the intended behaviour — it forces
// the next signature to be read off the source too, rather than assumed.

declare module 'gifenc' {
	/**
	 * An RGB `[r, g, b]` or RGBA `[r, g, b, a]` triplet/quad, 0-255 per channel.
	 * `quantize` pushes one of these per palette entry (pnnquant2.js:283).
	 */
	type GifencPalette = number[][];

	/**
	 * Builds a colour palette from RGBA pixel data.
	 * Throws if `rgba` is not a Uint8Array/Uint8ClampedArray, or on >256 colours.
	 * Source: pnnquant2.js:145 (default export, re-exported by name from index.js).
	 */
	export function quantize(
		rgba: Uint8Array | Uint8ClampedArray,
		maxColors: number,
	): GifencPalette;

	/**
	 * Maps RGBA pixel data onto `palette`, returning one palette index per pixel.
	 * Source: palettize.js:38 — returns `new Uint8Array(length)`.
	 *
	 * The `<ArrayBuffer>` argument is not decoration: since TS 5.7 the typed arrays
	 * are generic over their backing buffer, and the bare `Uint8Array` means
	 * `Uint8Array<ArrayBufferLike>`, which also admits SharedArrayBuffer and is
	 * therefore NOT a valid `BlobPart`. gifenc allocates with `new Uint8Array(n)`,
	 * always a plain ArrayBuffer, so naming it is the accurate description — and it
	 * is what lets `new Blob([gif.bytes()])` compile without a cast.
	 */
	export function applyPalette(
		rgba: Uint8Array | Uint8ClampedArray,
		palette: GifencPalette,
	): Uint8Array<ArrayBuffer>;

	/**
	 * Per-frame options. Only the three gifHandler.ts passes are declared; gifenc
	 * also accepts transparent / transparentIndex / colorDepth / dispose
	 * (index.js:50), left out until something here needs them.
	 */
	type GifencFrameOptions = {
		palette?: GifencPalette;
		/** Milliseconds. gifenc divides by 10 to write centiseconds to the stream. */
		delay?: number;
		/** -1 = play once, 0 = loop forever, >0 = repeat count. */
		repeat?: number;
	};

	type GifencEncoder = {
		writeFrame(
			index: Uint8Array,
			width: number,
			height: number,
			opts?: GifencFrameOptions,
		): void;
		finish(): void;
		/**
		 * The encoded GIF. Source: stream.js:15 — `contents.slice(0, cursor)` over a
		 * `new Uint8Array(capacity)`, so the backing buffer is a plain ArrayBuffer.
		 * See the note on applyPalette for why that is spelled out.
		 */
		bytes(): Uint8Array<ArrayBuffer>;
	};

	/** Source: index.js:15. Called with no arguments in gifHandler.ts. */
	export function GIFEncoder(): GifencEncoder;
}
