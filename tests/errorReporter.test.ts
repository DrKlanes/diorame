import { describe, it, expect } from 'vitest';
import {
	createErrorReporter, buildDescription, cleanText, firstStackFrame, classifyDevice,
	rawFromRejection, MAX_DESCRIPTION, MAX_ERRORS_PER_SESSION,
	type ExceptionParams, type ErrorContext,
} from '../src/analytics/errors';

const ORIGIN = 'https://diorame.dumaker.com';
const CTX: ErrorContext = { app_version: '9.9.9', mode: 'draw', tool: 'ink', device_class: 'desktop', standalone: 'no' };

function make(over: Partial<{ send: (p: ExceptionParams) => void; context: () => ErrorContext }> = {}) {
	const sent: ExceptionParams[] = [];
	const reporter = createErrorReporter({
		send: over.send ?? (p => { sent.push(p); }),
		context: over.context ?? (() => CTX),
		origin: () => ORIGIN,
	});
	return { ...reporter, sent };
}

const own = (line: number) => ({ message: 'boom', filename: `${ORIGIN}/assets/index-abc.js?v=1#x`, lineno: line });

describe('descripción', () => {
	it('recorta a 100 caracteres', () => {
		const d = buildDescription('x'.repeat(500), 'index-abc.js:10');
		expect(d.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
		expect(d.endsWith('@ index-abc.js:10')).toBe(true);
		expect(buildDescription('y'.repeat(500), '').length).toBe(MAX_DESCRIPTION);
	});
	it('limpia rutas absolutas, URLs y query strings', () => {
		const t = cleanText('fail at C:\\Users\\Moises\\proj\\a.ts and /home/u/proj/b.ts and https://x.com/a/c.js?token=SECRET#h');
		expect(t).not.toMatch(/Users|home|token|SECRET|https/);
		expect(t).toContain('a.ts');
		expect(t).toContain('c.js');
	});
	it('no deja pasar cadenas largas entre comillas (posible texto del usuario)', () => {
		expect(cleanText('Unexpected token "mi proyecto secreto de la abuela Paca" in JSON')).not.toContain('abuela');
	});
	it('primer frame útil de stacks V8 y WebKit', () => {
		expect(firstStackFrame('Error: boom\n    at f (https://d.com/assets/index-a.js?x=1:12:34)')).toBe('index-a.js:12');
		expect(firstStackFrame('f@https://d.com/assets/index-a.js:7:9\ng@x')).toBe('index-a.js:7');
		expect(firstStackFrame('')).toBe('');
	});
});

describe('firma, deduplicación y tope', () => {
	it('misma firma (mensaje + archivo + línea) se envía una vez', () => {
		const r = make();
		expect(r.report(own(5))).toBe(true);
		expect(r.report(own(5))).toBe(false);
		expect(r.report(own(6))).toBe(true);
		expect(r.sent).toHaveLength(2);
	});
	it('la query del archivo no cambia la firma', () => {
		const r = make();
		r.report({ message: 'boom', filename: `${ORIGIN}/a.js?v=1`, lineno: 1 });
		expect(r.report({ message: 'boom', filename: `${ORIGIN}/a.js?v=2`, lineno: 1 })).toBe(false);
	});
	it('tope de 10 por sesión', () => {
		const r = make();
		for (let i = 0; i < 25; i++) r.report(own(i + 1));
		expect(r.sent).toHaveLength(MAX_ERRORS_PER_SESSION);
	});
	it('los duplicados no gastan el tope', () => {
		const r = make();
		for (let i = 0; i < 50; i++) r.report(own(1));
		r.report(own(2));
		expect(r.sent).toHaveLength(2);
	});
	it('lleva contexto y fatal=false por defecto; fatal solo si se pide', () => {
		const r = make();
		r.report(own(1));
		r.report({ ...own(2), fatal: true });
		expect(r.sent[0]).toMatchObject({ ...CTX, fatal: false });
		expect(r.sent[1].fatal).toBe(true);
	});
});

describe('filtros de ruido', () => {
	const cases: [string, Parameters<ReturnType<typeof make>['report']>[0]][] = [
		['chrome-extension', { message: 'x', stack: 'Error: x\n at f (chrome-extension://abc/c.js:1:1)' }],
		['moz-extension', { message: 'x', filename: 'moz-extension://abc/c.js', lineno: 3 }],
		['safari-extension', { message: 'x', stack: 'f@safari-extension://abc/c.js:1:1' }],
		['safari-web-extension', { message: 'x', stack: 'f@safari-web-extension://abc/c.js:1:1' }],
		['ResizeObserver', { message: 'ResizeObserver loop completed with undelivered notifications.', filename: `${ORIGIN}/a.js`, lineno: 1 }],
		['ResizeObserver (limit)', { message: 'ResizeObserver loop limit exceeded', filename: `${ORIGIN}/a.js`, lineno: 1 }],
		['Script error. opaco', { message: 'Script error.', filename: '', lineno: 0 }],
		['tercero (otro origen)', { message: 'x', filename: 'https://cdn.otro.com/lib.js', lineno: 4 }],
		['gtag', { message: 'x', stack: 'f@https://www.googletagmanager.com/gtag/js:1:1' }],
	];
	it.each(cases)('descarta %s', (_n, raw) => {
		const r = make();
		expect(r.report(raw)).toBe(false);
		expect(r.sent).toHaveLength(0);
	});
	it('un descarte no gasta el tope ni la firma', () => {
		const r = make();
		r.report({ message: 'x', stack: 'at chrome-extension://a/b.js:1:1' });
		expect(r.report({ message: 'x', filename: `${ORIGIN}/a.js`, lineno: 1 })).toBe(true);
	});
	it('"Script error." CON detalle no se descarta', () => {
		expect(make().report({ message: 'Script error.', filename: `${ORIGIN}/a.js`, lineno: 3 })).toBe(true);
	});
});

describe('robustez', () => {
	it('un fallo de send no se propaga', () => {
		const r = make({ send: () => { throw new Error('gtag roto'); } });
		expect(() => r.report(own(1))).not.toThrow();
		expect(r.report(own(2))).toBe(false);
	});
	it('un fallo del contexto no se propaga', () => {
		const r = make({ context: () => { throw new Error('ctx'); } });
		expect(() => r.report(own(1))).not.toThrow();
	});
	it('entradas basura no lanzan', () => {
		const r = make();
		for (const junk of [{}, { message: 42, stack: {}, filename: null, lineno: 'x' }, { message: undefined }]) {
			expect(() => r.report(junk as never)).not.toThrow();
		}
	});
	it('rawFromRejection no serializa objetos arbitrarios', () => {
		expect(rawFromRejection({ secreto: 'dibujo de Paca' }).message).toBe('Unhandled rejection (non-error)');
		expect(rawFromRejection(new Error('e')).message).toBe('e');
		expect(rawFromRejection('s').message).toBe('s');
		expect(rawFromRejection(null).message).toBe('Unhandled rejection (non-error)');
	});
});

describe('clase de dispositivo', () => {
	it('clasifica', () => {
		expect(classifyDevice('Mozilla/5.0 (iPad; CPU OS 17)', 5)).toBe('ipad');
		expect(classifyDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5)).toBe('ipad');
		expect(classifyDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 0)).toBe('desktop');
		expect(classifyDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17)', 5)).toBe('mobile');
		expect(classifyDevice('Mozilla/5.0 (Linux; Android 14; SM-X) Chrome', 5)).toBe('tablet');
		expect(classifyDevice('Mozilla/5.0 (Linux; Android 14; Pixel) Mobile', 5)).toBe('mobile');
		expect(classifyDevice('Mozilla/5.0 (Windows NT 10.0)', 0)).toBe('desktop');
	});
});
