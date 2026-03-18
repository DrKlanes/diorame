// Color utility functions extracted from StrataCanvas.tsx

export const hexToHSL = (hex: string) => {
	let r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	let h = 0, s = 0, l = (max + min) / 2;
	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break; }
		h /= 6;
	}
	return { h: h * 360, s: s * 100, l: l * 100 };
};

export const hslToHex = (h: number, s: number, l: number) => {
	l /= 100; const a = s * Math.min(l, 1 - l) / 100;
	const f = (n: number) => { const k = (n + h / 30) % 12; const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); return Math.round(255 * color).toString(16).padStart(2, '0'); };
	return `#${f(0)}${f(8)}${f(4)}`;
};

export const getVibrantVariant = (hex: string, intensity: number, direction: 'light' | 'dark') => {
	const hsl = hexToHSL(hex);
	const shift = 10 + (intensity * 30);
	if (direction === 'light') { hsl.l = Math.min(92, hsl.l + shift); if (hsl.s > 0) hsl.s = Math.min(100, hsl.s + (intensity * 10)); }
	else { hsl.l = Math.max(20, hsl.l - shift); if (hsl.s > 0) hsl.s = Math.min(100, hsl.s + (intensity * 30)); }
	return hslToHex(hsl.h, hsl.s, hsl.l);
};

export const hexToRgba = (hex: string, alpha: number) => {
	const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
	return `rgba(${r},${g},${b},${alpha})`;
};
