import type { Dictionary } from '../types';

export const es: Dictionary = {
	// ═══════════════════════════════════════════════
	// TOPBAR
	// ═══════════════════════════════════════════════

	'topbar.file.new': 'Nuevo',
	'topbar.file.open': 'Abrir',
	'topbar.file.save': 'Guardar',
	'topbar.file.exportSvg': 'Exportar SVG',
	'topbar.file.undo': 'Deshacer',
	'topbar.file.redo': 'Rehacer',
	'topbar.file.svg': 'SVG',
	'topbar.file.svgCompressed': 'SVG (Comprimido)',
	'topbar.file.untitledProject': 'Proyecto sin título',

	'topbar.mode.draw': 'Dibujar',
	'topbar.mode.drawTooltip': 'Modo dibujo',
	'topbar.mode.view': 'Vista',
	'topbar.mode.viewTooltip': 'Modo vista',
	'topbar.mode.hideUi': 'Ocultar interfaz',

	'topbar.theme.light': 'Modo claro',
	'topbar.theme.dark': 'Modo oscuro',

	'topbar.snapshot.png': 'Captura PNG',
	'topbar.record.start': 'Grabar MP4',
	'topbar.record.stop': 'Detener grabación',
	'topbar.record.badge': 'REC',

	'topbar.info.about': 'Acerca de Diorame',

	// ═══════════════════════════════════════════════
	// BOTTOMBAR — DRAW
	// ═══════════════════════════════════════════════

	'bottombar.draw.tool.blob': 'Blob',
	'bottombar.draw.tool.brush': 'Pincel',
	'bottombar.draw.tool.eraser': 'Borrador',
	'bottombar.draw.tool.text': 'Texto',
	'bottombar.draw.tool.move': 'Mover',

	'bottombar.draw.mod.symmetry': 'Simetría',
	'bottombar.draw.mod.drawInside': 'Pintar dentro',
	'bottombar.draw.mod.drawBehind': 'Pintar detrás',
	'bottombar.draw.mod.organic': 'Orgánico',
	'bottombar.draw.mod.smooth': 'Suavizado',

	'bottombar.draw.lineMode.tapered': 'Fluido',
	'bottombar.draw.lineMode.uniform': 'Uniforme',
	'bottombar.draw.lineMode.ink': 'Tinta',
	'bottombar.draw.lineMode.title': 'Modo de trazo: {label} ({n}/3) — pulsa para cambiar',

	'bottombar.draw.toolOptions.size': 'Tamaño',

	// ═══════════════════════════════════════════════
	// BOTTOMBAR — VIEW
	// ═══════════════════════════════════════════════

	'bottombar.view.preset.forward': 'Adelante',
	'bottombar.view.preset.spiral': 'Espiral',
	'bottombar.view.preset.yoyo': 'Yoyó',
	'bottombar.view.preset.pulse': 'Pulso',
	'bottombar.view.preset.twist': 'Giro',
	'bottombar.view.preset.arc': 'Arco',
	'bottombar.view.preset.crane': 'Grúa',
	'bottombar.view.preset.truck': 'Travelling',
	'bottombar.view.preset.free': 'Libre',
	'bottombar.view.preset.zoom': 'Zoom',

	'bottombar.view.handheld.label': 'Cámara en mano',
	'bottombar.view.handheld.tooltip': 'Cámara en mano',
	'bottombar.view.handheld.dynamic': 'Cámara en mano · {intensity}',
	'bottombar.view.handheld.intensity.low': 'bajo',
	'bottombar.view.handheld.intensity.medium': 'medio',
	'bottombar.view.handheld.intensity.high': 'alto',

	// ═══════════════════════════════════════════════
	// FX — TEXTURE
	// ═══════════════════════════════════════════════

	'fx.texture.grain.label': 'Grano',
	'fx.texture.grain.tooltip': 'Grano',
	'fx.texture.grunge.label': 'Grunge',
	'fx.texture.grunge.tooltip': 'Grunge',
	'fx.texture.riso.label': 'Riso',
	'fx.texture.riso.tooltip': 'Riso',

	// ═══════════════════════════════════════════════
	// FX — LENS
	// ═══════════════════════════════════════════════

	'fx.lens.vignette.label': 'Viñeta',
	'fx.lens.vignette.tooltip': 'Viñeta',
	'fx.lens.chromaticAb.label': 'Aberración Cr.',
	'fx.lens.chromaticAb.tooltip': 'Aberración cromática',
	'fx.lens.distortion.label': 'Distorsión',
	'fx.lens.distortion.tooltip': 'Distorsión',
	'fx.lens.glow.label': 'Resplandor',
	'fx.lens.glow.tooltip': 'Resplandor',
	'fx.lens.dof.label': 'DoF',
	'fx.lens.dof.tooltip': 'Profundidad de campo',

	// ═══════════════════════════════════════════════
	// FX — ATMOSPHERE
	// ═══════════════════════════════════════════════

	'fx.atmosphere.fog.label': 'Niebla',
	'fx.atmosphere.fog.tooltip': 'Niebla',
	'fx.atmosphere.particles.label': 'Partículas',
	'fx.atmosphere.particles.tooltip': 'Partículas',
	'fx.atmosphere.stopMotion.label': 'Stop Motion',
	'fx.atmosphere.stopMotion.tooltip': 'Stop Motion',
	'fx.atmosphere.pixelArt.label': 'Pixel Art',
	'fx.atmosphere.pixelArt.tooltip': 'Pixel Art',

	'fx.atmosphere.wiggle.tooltip': 'Wiggle',

	// ═══════════════════════════════════════════════
	// FX — UI
	// ═══════════════════════════════════════════════

	'fx.panel.header': 'FX',
	'fx.panel.toggleAll': 'Activar/desactivar todos los FX',
	'fx.panel.collapse': 'Contraer',
	'fx.panel.expand': 'Expandir panel de FX',

	'fx.group.texture': 'Textura',
	'fx.group.lens': 'Lente',
	'fx.group.atmosphere': 'Atmósfera',

	'fx.subcontrol.size': 'Tamaño',
	'fx.subcontrol.depth': 'Profundidad',
	'fx.subcontrol.dither': 'Dither',
	'fx.subcontrol.zPlane': 'Plano Z',
	'fx.subcontrol.layer': 'Capa',

	'fx.dof.free': 'Libre',
	'fx.dof.lock': 'Fija',

	'fx.depth.1bit': '1-bit',
	'fx.depth.cga': 'CGA',
	'fx.depth.8color': '8-Color',
	'fx.depth.retro': 'Retro',
	'fx.depth.hiColor': 'Hi-Color',
	'fx.depth.pocket': 'Pocket',
	'fx.depth.stylized': 'Estilizado',
	'fx.depth.original': 'Original',

	'fx.dither.clean': 'Limpio',

	'fx.intensity.subtle': 'Sutil',
	'fx.intensity.medium': 'Medio',
	'fx.intensity.intense': 'Intenso',
	'fx.intensity.light': 'Ligero',
	'fx.intensity.heavy': 'Fuerte',

	'fx.particles.circle': 'Círculo',
	'fx.particles.square': 'Cuadrado',
	'fx.particles.stroke': 'Trazo',

	'fx.dof.layerDynamic': 'Capa {n}',

	// ═══════════════════════════════════════════════
	// LAYERS
	// ═══════════════════════════════════════════════

	'layers.panel.header': 'Capas',
	'layers.panel.expand': 'Expandir panel de capas',
	'layers.panel.collapse': 'Contraer',
	'layers.action.show': 'Mostrar capa',
	'layers.action.hide': 'Ocultar capa',
	'layers.action.duplicate': 'Duplicar capa',
	'layers.action.delete': 'Eliminar capa',
	'layers.action.moveUp': 'Subir capa',
	'layers.action.moveDown': 'Bajar capa',
	'layers.action.add': 'Añadir capa',

	'layers.row.name': 'Capa {n}',
	'layers.row.goTo': 'Ir a capa {n}',

	'layers.badge.empty': 'Vacía',
	'layers.badge.flat': 'Plano',
	'layers.badge.grad': 'Grad',
	'layers.badge.fade': 'Fade',

	// ═══════════════════════════════════════════════
	// PALETTE
	// ═══════════════════════════════════════════════

	'palette.segment.primary': 'Principal',
	'palette.segment.alt': 'Alt',
	'palette.segment.flat': 'Plano',
	'palette.segment.gradient': 'Degradado',
	'palette.segment.fade': 'Fade',

	'palette.color.black': 'Negro',
	'palette.color.charcoal': 'Carbón',
	'palette.color.silver': 'Plata',
	'palette.color.white': 'Blanco',
	'palette.color.forest': 'Bosque',
	'palette.color.pine': 'Pino',
	'palette.color.sage': 'Salvia',
	'palette.color.lime': 'Lima',
	'palette.color.mint': 'Menta',
	'palette.color.navy': 'Marino',
	'palette.color.cobalt': 'Cobalto',
	'palette.color.blue': 'Azul',
	'palette.color.sky': 'Cielo',
	'palette.color.teal': 'Verdeazulado',
	'palette.color.plum': 'Ciruela',
	'palette.color.lavender': 'Lavanda',
	'palette.color.brick': 'Ladrillo',
	'palette.color.red': 'Rojo',
	'palette.color.rose': 'Rosa',
	'palette.color.blush': 'Rubor',
	'palette.color.sand': 'Arena',
	'palette.color.peach': 'Melocotón',
	'palette.color.butter': 'Mantequilla',
	'palette.color.cream': 'Crema',

	'palette.colorAlt.black': 'Negro',
	'palette.colorAlt.darkGrey': 'Gris oscuro',
	'palette.colorAlt.lightGrey': 'Gris claro',
	'palette.colorAlt.offWhite': 'Blanco roto',
	'palette.colorAlt.darkGreen': 'Verde oscuro',
	'palette.colorAlt.green': 'Verde',
	'palette.colorAlt.olive': 'Oliva',
	'palette.colorAlt.lightGreen': 'Verde claro',
	'palette.colorAlt.beige': 'Beige',
	'palette.colorAlt.darkTeal': 'Verdeazulado oscuro',
	'palette.colorAlt.blueGrey': 'Gris azulado',
	'palette.colorAlt.blue': 'Azul',
	'palette.colorAlt.teal': 'Verdeazulado',
	'palette.colorAlt.lightBlue': 'Azul claro',
	'palette.colorAlt.darkPurple': 'Morado oscuro',
	'palette.colorAlt.greyBlue': 'Azul grisáceo',
	'palette.colorAlt.darkMaroon': 'Granate oscuro',
	'palette.colorAlt.rust': 'Óxido',
	'palette.colorAlt.red': 'Rojo',
	'palette.colorAlt.pink': 'Rosa',
	'palette.colorAlt.brown': 'Marrón',
	'palette.colorAlt.orange': 'Naranja',
	'palette.colorAlt.yellowGreen': 'Amarillo verdoso',
	'palette.colorAlt.yellow': 'Amarillo',

	// ═══════════════════════════════════════════════
	// TEXT TOOL
	// ═══════════════════════════════════════════════

	'text.placeholder': 'Escribe aquí…',
	'text.align.left': 'Alinear izquierda',
	'text.align.center': 'Alinear centro',
	'text.align.right': 'Alinear derecha',
	'text.action.cancel': 'Cancelar',
	'text.action.done': 'Listo',

	'text.font.noir': 'Noir',
	'text.font.mansion': 'Mansion',
	'text.font.pharma': 'Pharma',
	'text.font.comic': 'Comic',
	'text.font.dungeon': 'Dungeon',

	// ═══════════════════════════════════════════════
	// VIEWPORT
	// ═══════════════════════════════════════════════

	'viewport.resetView': 'Restablecer vista',
	'viewport.compositionGuide': 'Guía de composición',
	'viewport.showUi': 'Mostrar interfaz',
	'viewport.flipHorizontal': 'Voltear horizontal',
	'viewport.flipVertical': 'Voltear vertical',

	// ═══════════════════════════════════════════════
	// MODALS
	// ═══════════════════════════════════════════════

	'modal.welcome.logoAlt': 'Logo de Diorame',
	'modal.welcome.tagline': 'Dibuja en 2D. Y mira cómo cobra vida en 3D.',
	'modal.welcome.tutorial': 'Ver tutorial',
	'modal.welcome.dumaker': 'por @dumaker',
	'modal.welcome.kofi': 'Apóyame en Ko-fi 🤍',
	'modal.welcome.graintouch': 'Inspirado en Graintouch',
	'modal.welcome.bugReport.link': '¿Encontraste un error? Escríbeme.',
	'modal.welcome.shortcuts': 'Atajos de teclado',
	'modal.welcome.cta.primary': 'Empezar a dibujar',
	'modal.welcome.cta.secondary': 'Cargar escena de ejemplo',
	'modal.welcome.cta.loading': 'Cargando…',
	'modal.welcome.gotIt': 'Entendido',

	'modal.welcome.bugReport.subject': 'Reporte de error en Diorame — v{version}',
	'modal.welcome.bugReport.body': 'Qué esperaba:\n\n\nQué ocurrió:\n\n\nPasos para reproducirlo:\n\n\n---\nNavegador:\nSO:',

	'modal.clearCanvas.title': '¿Borrar lienzo?',
	'modal.clearCanvas.body': 'Esta acción no se puede deshacer.',
	'modal.clearCanvas.confirm': 'Borrar',
	'modal.clearCanvas.cancel': 'Cancelar',

	'modal.complexScene.title': 'Escena compleja detectada',
	'modal.complexScene.body': 'Tu dibujo contiene {shapeCount} formas. El renderizado puede ser lento o fallar.',
	'modal.complexScene.continue': 'Continuar',
	'modal.complexScene.optimize': 'Optimizar',
	'modal.complexScene.cancel': 'Cancelar',

	'modal.export.snapshot': 'Capturando…',
	'modal.export.animation': 'Renderizando animación…',
	'modal.export.vector': 'Exportando vector…',

	'modal.mobile.alt': 'Diorame',
	'modal.mobile.primary': 'Diorame está diseñado para tablet y escritorio.',
	'modal.mobile.secondary': 'Necesitas una pantalla más grande para dibujar, crear capas y ver tus escenas en movimiento.',

	'modal.onboarding.header': 'Bienvenido a Diorame',
	'modal.onboarding.tagline': 'Dibuja en 2D. Y mira cómo cobra vida en 3D.',
	'modal.onboarding.section.draw': 'DIBUJAR',
	'modal.onboarding.section.view': 'VISTA',

	'modal.onboarding.card.blob.title': 'Blob',
	'modal.onboarding.card.blob.desc': 'Formas orgánicas tipo aerosol',
	'modal.onboarding.card.brush.title': 'Pincel',
	'modal.onboarding.card.brush.desc': 'Trazos fluidos y caligráficos',
	'modal.onboarding.card.layers.title': 'Capas',
	'modal.onboarding.card.layers.desc': 'Crea profundidad apilando planos',

	'modal.onboarding.card.motion.title': 'Movimiento',
	'modal.onboarding.card.motion.desc': 'Presets de cámara y movimientos',
	'modal.onboarding.card.effects.title': 'Efectos',
	'modal.onboarding.card.effects.desc': 'Grano, resplandor, niebla y más',
	'modal.onboarding.card.depth.title': 'Profundidad',
	'modal.onboarding.card.depth.desc': 'Espaciado de capas y paralaje',

	'modal.onboarding.cta.example': 'Cargar escena de ejemplo',
	'modal.onboarding.cta.exampleLoading': 'Cargando…',
	'modal.onboarding.cta.start': 'Empezar a dibujar',

	// ═══════════════════════════════════════════════
	// TOASTS
	// ═══════════════════════════════════════════════

	'toast.export.snapshot.successTitle': '¡Captura guardada!',
	'toast.export.snapshot.successDesc': 'Imagen PNG descargada correctamente',
	'toast.export.vector.successTitle': '¡Vector exportado!',
	'toast.export.vector.successDescSvg': 'Archivo SVG descargado correctamente',
	'toast.export.vector.successDescSvgz': 'Archivo SVGZ descargado correctamente',
	'toast.export.animation.successTitle': '¡Animación guardada!',
	'toast.export.animation.successDesc': 'Vídeo descargado correctamente',

	'toast.export.snapshot.errorTitle': 'Error al guardar la captura',
	'toast.export.vector.errorTitle': 'Error al exportar el vector',
	'toast.export.animation.errorTitle': 'Error al guardar la animación',

	'toast.save.successTitle': 'Proyecto guardado',
	'toast.save.successDesc': '{filename}.dior',
	'toast.save.errorTitle': 'Error al guardar',

	'toast.load.successTitle': 'Proyecto cargado',
	'toast.load.successDesc': '{n} formas',
	'toast.load.successDescOne': '{n} forma',
	'toast.load.errorTitle': 'Error al cargar el proyecto',
	'toast.load.errorDescFile': 'Archivo demasiado grande',
	'toast.load.errorDescSize': 'El tamaño máximo es 50 MB',
	'toast.load.errorDescGeneric': 'Comprueba que el archivo es válido',

	'toast.example.errorTitle': 'Error al cargar el ejemplo',
	'toast.example.errorDesc': 'Comprueba tu conexión',

	// ═══════════════════════════════════════════════
	// SHORTCUTS
	// ═══════════════════════════════════════════════

	'shortcuts.category.file': 'Archivo',
	'shortcuts.category.edit': 'Edición',
	'shortcuts.category.view': 'Vista',
	'shortcuts.category.toolsDraw': 'Herramientas (Dibujo)',
	'shortcuts.category.layersDraw': 'Capas (Dibujo)',
	'shortcuts.category.canvasDraw': 'Lienzo (Dibujo)',

	'shortcuts.label.saveProject': 'Guardar proyecto',
	'shortcuts.label.exportSvg': 'Exportar SVG',
	'shortcuts.label.exportSvgz': 'Exportar SVGZ',
	'shortcuts.label.undo': 'Deshacer',
	'shortcuts.label.redo': 'Rehacer',
	'shortcuts.label.darkMode': 'Modo oscuro',
	'shortcuts.label.openShortcuts': 'Abrir atajos',
	'shortcuts.label.blob': 'Blob',
	'shortcuts.label.brush': 'Pincel',
	'shortcuts.label.eraser': 'Borrador',
	'shortcuts.label.text': 'Texto',
	'shortcuts.label.move': 'Mover',
	'shortcuts.label.previousLayer': 'Capa anterior',
	'shortcuts.label.nextLayer': 'Capa siguiente',
	'shortcuts.label.resetView': 'Restablecer vista',

	// ═══════════════════════════════════════════════
	// COMMON
	// ═══════════════════════════════════════════════

	'common.close': 'Cerrar',
	'common.cancel': 'Cancelar',
	'common.done': 'Listo',
	'common.off': 'apagado',
	'common.loading': 'Cargando…',
	'common.pleaseRetry': 'Inténtalo de nuevo',
};
