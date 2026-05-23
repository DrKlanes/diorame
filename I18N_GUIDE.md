# Diorame i18n Guide

> Sistema i18n custom de Diorame. Inglés + Español. Solución ligera (~120 líneas de core, cero dependencias externas).

---

## Cómo añadir un nuevo string

1. **Añade la key a ambos diccionarios**:
   - `src/i18n/dictionaries/en.ts`
   - `src/i18n/dictionaries/es.ts`

   Usa dot notation con namespace lógico. Ejemplo: `'fx.texture.newEffect.label'`.

   **IMPORTANTE**: la paridad de claves entre `en.ts` y `es.ts` es invariante de sistema. Si añades una clave en uno, debe estar en el otro. Si una clave queda sin traducir en ES temporalmente, ponla con el valor en EN como placeholder, no la omitas.

2. **Úsalo en el componente** con el hook `useTranslation`:

```tsx
import { useTranslation } from '../../../i18n';   // ajusta ruta relativa

function MyComponent() {
	const { t } = useTranslation();
	return <button>{t('mi.nueva.clave')}</button>;
}
```

---

## Convenciones de keys

- **Dot notation**: `area.elemento.variante`. Máximo 3 niveles cuando aporta semántica.
- **camelCase** en cada segmento: `depthOfField`, no `depth-of-field` ni `depth_of_field`.
- **Sufijos consistentes**:
  - `.label` — texto visible permanente (botón, header, sub-control)
  - `.tooltip` — texto solo visible en hover
  - `.title` — atributo `title=` de elementos HTML
  - `.desc` — descripción larga (cards onboarding, body de modales)
  - `.placeholder` — placeholder de input/textarea
  - `.aria` — texto solo para lectores de pantalla

---

## Namespaces

| Namespace | Contenido |
|---|---|
| `topbar.*` | File, Mode, Theme, Snapshot/Record, Info |
| `bottombar.draw.*` | Drawing tools + modifiers + line mode |
| `bottombar.view.*` | Camera presets + speed + handheld |
| `fx.texture.*` / `fx.lens.*` / `fx.atmosphere.*` | FX por grupo |
| `fx.panel.*` / `fx.group.*` / `fx.subcontrol.*` | UI del panel de FX |
| `fx.dof.*` / `fx.depth.*` / `fx.intensity.*` / `fx.particles.*` / `fx.dither.*` | Opciones específicas de FX |
| `layers.*` | Panel + row + dots + badges |
| `palette.*` | Segmentos, nombres de color (primary + alt) |
| `text.*` | TextSessionPanel — fonts, align, actions |
| `viewport.*` | ResetView, GridToggle, hidden UI |
| `modal.welcome.*` | Welcome modal (Diorame splash) |
| `modal.clearCanvas.*` / `modal.complexScene.*` / `modal.export.*` / `modal.mobile.*` / `modal.onboarding.*` | Otros modales |
| `toast.export.*` / `toast.save.*` / `toast.load.*` / `toast.example.*` | Notificaciones toast |
| `shortcuts.category.*` / `shortcuts.label.*` | Sección de atajos de teclado en WelcomeModal |
| `common.*` | Strings reutilizables (cancel, done, off, loading, pleaseRetry) |

---

## Interpolación

Usa `{key}` simple:

```tsx
t('layers.row.name', { n: 3 })  // → "Layer 3" / "Capa 3"
```

El placeholder se sustituye por el valor pasado. Si no se pasa, queda literal `{n}` (útil para detectar bugs).

Interpolación anidada (un t() dentro de otro t()):

```tsx
t('bottombar.view.handheld.dynamic', {
	intensity: t(`bottombar.view.handheld.intensity.${intensity}`)
})
// → "Handheld · low" / "Cámara en mano · bajo"
```

---

## Plurales

EN y ES tienen 2 formas iguales (singular / plural). Patrón con ternario inline:

```tsx
const desc = n === 1
	? t('toast.load.successDescOne', { n })
	: t('toast.load.successDesc', { n });
```

Convención: la clave singular lleva sufijo `One`, la plural va sin sufijo (por ser el caso más común).

---

## Strings no traducibles que pasan por t()

Algunos strings pasan por `t()` con valor idéntico en ambos idiomas, **por consistencia del sistema** (cuesta cero, pero garantiza que cualquier consumer pueda usar `t()` sin pensar):

- Términos técnicos sin traducción universal: `1-bit`, `CGA`, `8-Color`, `Hi-Color`, `Pocket`, `Riso`, `Stop Motion`, `Wiggle`, `Pixel Art`, `Blob`, `DoF`, `Grunge`
- Nombres propios: `Diorame`, `@dumaker`, `Ko-fi`, `Graintouch`
- Nombres de fuentes: `Noir`, `Mansion`, `Pharma`, `Comic`, `Dungeon`
- Símbolos como `REC` (badge de grabación)

---

## Strings que NO pasan por t()

Estas excepciones están documentadas en el inventario inicial:

| Excepción | Razón |
|---|---|
| `'Aa'` en TextSessionPanel | Convención tipográfica universal (sample de fuente). Decisión A9. |
| `'·'` (middle dot) | Separador visual estético en JSX. Decisión A5. |
| `'?'` fallback en DEPTH_LABEL_MAP | Defensivo técnico — solo aparece si el state está corrupto fuera de rango válido. |
| `'0 px'`, `'+250 px'`, etc. en formatZPlane | Unidad técnica `px` no traducible. |
| `'0.00'`, `'+0.50'`, `'-0.25'` en formatBipolar | Formato numérico no traducible. |
| `'™'` dentro de `<Wordmark />` | Símbolo de marca registrada, mismo en todos los idiomas. |
| `'—'` em-dash dentro de valores del glosario | El separador es parte del string traducido, no hardcoded. |
| Identificadores técnicos: `'primary'`, `'flat'`, `'circle'`, etc. | Son values internos del state, NO display strings. |

---

## Detección de idioma

Implementada en `src/i18n/detectLanguage.ts`. Prioridad en primer arranque:

1. **`localStorage.getItem('diorame-language')`** — si hay preferencia guardada (`'en'` o `'es'`), se usa
2. **`navigator.language`** — si empieza por `'es'` (case-insensitive), se usa ES
3. **Fallback**: EN

El usuario cambia idioma manualmente con el toggle `EN | ES` en la esquina inferior izquierda del WelcomeModal. El cambio persiste en localStorage automáticamente vía `LanguageProvider.setLanguage`.

---

## Fallback

Si una key no existe en el diccionario activo, `t()` devuelve la propia key como string:

```tsx
t('fx.nonexistent.key')  // → 'fx.nonexistent.key' (literal)
```

Útil para debugging: si ves una key literal en la UI (e.g. `fx.foo.bar`), falta esa traducción.

---

## Architecture notes

### Por qué solución custom y no librería

- **Cero dependencias** externas (no `i18next`, no `react-intl`)
- **~120 líneas de core** total — más simple que cualquier librería
- **Bundle impact**: ~25 kB adicionales (diccionarios EN+ES). Una librería como `i18next` añadiría 30 kB **+** los diccionarios
- **Sin features que no usamos**: namespaces dinámicos, lazy loading, formatters complejos. No los necesitamos.
- **Type-safe**: el sistema usa types simples (`Language`, `TranslationParams`, `Dictionary`)

### Estructura del módulo `src/i18n/`

| Archivo | Responsabilidad |
|---|---|
| `index.ts` | API pública: exporta `LanguageProvider`, `useLanguage`, `useTranslation`, tipos |
| `types.ts` | `Language`, `TranslationParams`, `Dictionary`, `LanguageContextValue` |
| `interpolate.ts` | Función pura: reemplaza `{key}` con valores |
| `detectLanguage.ts` | `getInitialLanguage()` + `persistLanguage()` (localStorage) |
| `LanguageContext.tsx` | Provider + `useLanguage()` hook (throws si fuera de provider) |
| `useTranslation.ts` | Hook principal — retorna `{ t, language }` |
| `dictionaries/en.ts` | Diccionario inglés (~290 keys) |
| `dictionaries/es.ts` | Diccionario español (~290 keys, paridad exacta con EN) |

El `LanguageProvider` está montado en `src/main.tsx` como **provider más externo**, envolviendo a `<App />`. Esto garantiza que **todos los paths de la app** (preview, mobile, tablet/desktop) tengan acceso a `t()`, incluyendo componentes que se renderizan fuera del `StrataProvider` (como `MobileBlockScreenV2`).

### Patrón i18n-safe del DiSegmentControl

El primitive `DiSegmentControl` (`src/design-system/DiSegmentControl.tsx`) acepta dos formatos de opciones:

```typescript
type SegmentOption<T extends string | number = string> = T | { value: T; label: string };
```

**Formato decoupled** (recomendado para i18n):

```tsx
<DiSegmentControl<'primary' | 'alternative'>
	options={[
		{ value: 'primary',     label: t('palette.segment.primary') },
		{ value: 'alternative', label: t('palette.segment.alt') },
	]}
	value={state.activePaletteId}
	onChange={(v) => dispatch({ type: 'SET_ACTIVE_PALETTE', payload: v })}
	dark={dark}
/>
```

**Por qué este patrón**:
- El `value` interno (`'primary'`) NO cambia con el idioma → React keys estables → sin unmount/remount al cambiar idioma
- El `label` es traducible → se recomputa en cada render con `t()` actual
- El callback `onChange` recibe el identifier interno, no el label → dispatch directo al state

El primitive también acepta `string[]` plano (backward compat para PreviewPage y casos no-i18n).

### Sentinel pattern para `projectName`

El nombre por defecto del proyecto se almacena como **sentinel** (`'__UNTITLED__'`), no como string traducido. Definido en `src/constants/project.ts`:

```typescript
export const UNTITLED_PROJECT_SENTINEL = '__UNTITLED__';

export function getFilenameBase(name: string): string {
	if (name === UNTITLED_PROJECT_SENTINEL) return 'untitled';
	return name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
}
```

**Por qué**:
- El state NUNCA contiene strings traducidos → portabilidad inter-idioma
- Los `.dior` files persisten el sentinel literal → un archivo guardado en ES se abre correctamente en EN (y viceversa)
- Backward compat: si un `.dior` antiguo (pre-v2.1.0) tiene el literal `'Untitled Project'`, el reducer LOAD_PROJECT lo normaliza a sentinel al cargar
- Filenames language-agnostic: `getFilenameBase()` mapea sentinel a literal `'untitled'` para exports (PNG/SVG/MP4/.dior)

En el render, el sentinel se resuelve a `t('topbar.file.untitledProject')` para display.

### Pasar `t` a funciones puras (no-componente)

Los `exportHandlers.ts` son funciones puras fuera del árbol React. Para que sus toasts traduzcan, reciben `t` como parámetro de la firma:

```typescript
export const exportAsPNG = (
	canvas: HTMLCanvasElement,
	projectName: string,
	onFinish: () => void,
	t: TFunction,  // ← inyectado por el caller
): void => { /* ... */ };
```

El caller (`StrataCanvas.tsx`) usa `useTranslation()` y pasa el `t` al invocar.

Los hooks (`useSaveLoad`, `useLoadExampleScene`) **sí pueden** usar `useTranslation()` directamente porque son hooks de React.

### Refactors estructurales aplicados durante la migración

Documentados aquí para referencia futura:

1. **`palette.ts`**: `name: string` → `nameKey: string` + nuevo export `COLOR_NAME_KEYS: Map<hex, nameKey>` para lookup en `SwatchGrid`
2. **`keyboardShortcuts.ts`**: `category: string` → `categoryKey`, `label: string` → `labelKey`. Resuelve con `t()` en `WelcomeModalV2`
3. **FX configs** (`FXPanel.tsx`): `label: string` → `labelKey`, `discreteOptions: [{label,value}]` → `[{value:number, labelKey:string}]`, `compositeOptions: string[]` → `[{value, labelKey}]`
4. **OnboardingOverlayV2 `CardData`**: `title/description` → `titleKey/descKey`
5. **ExportProgressV2 `EXPORT_CONFIG`**: `label: string` → `labelKey: string`
6. **CameraPresetsZone `PRESETS`** + **DrawingToolbar `MODIFIERS_BY_TOOL`**: `tooltip: string` → `tooltipKey: string`

Patrón común: cuando un config array está en module-scope (fuera del componente React), no puede llamar `t()`. Solución: el array guarda la KEY, el componente que lo consume hace `t(item.tooltipKey)` en el render.

---

## Añadir un tercer idioma

Pasos:

1. Añadir `'pt' | 'fr' | …` al tipo `Language` en `src/i18n/types.ts`
2. Crear `src/i18n/dictionaries/{lang}.ts` con paridad completa de keys
3. Importar y registrar en `src/i18n/useTranslation.ts`:
   ```ts
   const dictionaries: Record<Language, Dictionary> = { en, es, pt };
   ```
4. Ajustar `detectLanguage.ts` para reconocer el nuevo prefix (`browser.startsWith('pt')`)
5. Añadir un chip más al `LanguageToggle` (cambia de 2 botones a 3+)

No requiere cambios en consumer code — solo el módulo i18n + el toggle UI.

---

## Verificación de paridad de claves (CI)

Para asegurar paridad entre diccionarios, se puede correr en CI:

```bash
npx tsx -e "
import { en } from './src/i18n/dictionaries/en';
import { es } from './src/i18n/dictionaries/es';
const enKeys = Object.keys(en);
const esKeys = Object.keys(es);
const enNotEs = enKeys.filter(k => !(k in es));
const esNotEn = esKeys.filter(k => !(k in en));
if (enKeys.length !== esKeys.length || enNotEs.length || esNotEn.length) {
	console.error('Parity check FAIL', { enNotEs, esNotEn });
	process.exit(1);
}
console.log('Parity OK:', enKeys.length, 'keys');
"
```

Este check se ejecutó manualmente en Checkpoint B y D (288 keys en ambos diccionarios, paridad exacta).
