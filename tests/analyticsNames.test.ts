// Nombres de evento que llegan a GoatCounter (v3.26.108): analytics/eventNames.ts.
import { describe, it, expect } from 'vitest';
import { goatEventName, errorType } from '../src/analytics/eventNames';

const exception = (description: string, fatal = false) => ({
	description, fatal, app_version: '0', mode: 'draw', tool: 'brush', device_class: 'desktop' as const, standalone: 'no' as const,
});

describe('goatEventName', () => {
	it('antepone app_ y añade el parámetro clave', () => {
		expect(goatEventName('canvas_ready', {})).toBe('app_canvas_ready');
		expect(goatEventName('mobile_blocked', { viewport_width: 390 })).toBe('app_mobile_blocked');
		expect(goatEventName('first_stroke', { tool: 'brush', seconds_to_first_stroke: 3 })).toBe('app_first_stroke/brush');
		expect(goatEventName('layer_added', { layer_count: 4 })).toBe('app_layer_added');
		expect(goatEventName('artwork_exported', { format: 'png', strokes: 1, layers: 1, mode: 'drawing' })).toBe('app_artwork_exported/png');
		expect(goatEventName('project_saved', {})).toBe('app_project_saved');
	});

	it('no envía el evento duplicado', () => {
		expect(goatEventName('mobile_gate_shown', { lang: 'es' })).toBeNull();
	});

	it('exception: solo gravedad y clase de error, nunca el mensaje', () => {
		expect(goatEventName('exception', exception('Uncaught TypeError: secreto.dior is undefined @ a.js:1')))
			.toBe('app_exception/error/TypeError');
		expect(goatEventName('exception', exception('no se pudo abrir Mi dibujo privado', true)))
			.toBe('app_exception/fatal/other');
		expect(errorType('MiNombre: algo')).toBe('other');
	});
});
