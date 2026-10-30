import type { Dictionary } from '../types';

export const en: Dictionary = {
	// ═══════════════════════════════════════════════
	// TOPBAR
	// ═══════════════════════════════════════════════

	// File controls
	'topbar.file.new': 'New',
	'topbar.file.open': 'Open',
	'topbar.file.save': 'Save',
	'topbar.file.saveDownload': 'Save (downloads a copy)',
	'topbar.file.saveMore': 'More save options',
	'topbar.file.saveAs': 'Save as…',
	'topbar.file.saveAsDesc': 'Saves to a new file',
	'topbar.file.duplicate': 'Duplicate as new drawing',
	'topbar.file.duplicateDesc': 'Keep working on a copy; the original stays as it is',
	'topbar.file.exportSvg': 'Export SVG',
	'topbar.file.undo': 'Undo',
	'topbar.file.redo': 'Redo',
	'topbar.file.svg': 'SVG',
	'topbar.file.svgCompressed': 'SVG (Compressed)',
	'topbar.file.untitledProject': 'Untitled Project',

	// Mode switch
	'topbar.mode.draw': 'Draw',
	'topbar.mode.drawTooltip': 'Draw mode',
	'topbar.mode.view': 'Cinema',
	'topbar.mode.viewTooltip': 'Cinema mode',
	'topbar.mode.hideUi': 'Hide UI',

	// Theme toggle
	'topbar.theme.light': 'Light mode',
	'topbar.theme.dark': 'Dark mode',

	// Snapshot/Record
	'topbar.snapshot.png': 'Snapshot PNG',
	'topbar.snapshot.deviceSize': 'Screen resolution',
	'topbar.snapshot.highQuality': 'High quality',
	'topbar.snapshot.background': 'Background',
	'topbar.snapshot.bg.paper': 'Paper',
	'topbar.snapshot.bg.solid': 'Plain',
	'topbar.snapshot.bg.transparent': 'Transparent',
	'topbar.record.start': 'Record MP4',
	'topbar.record.stop': 'Stop recording',
	'topbar.record.badge': 'REC',
	'topbar.record.loops': 'Loops to record',
	'topbar.record.pngSequence': 'Export PNG sequence (ZIP)',
	'topbar.record.gifScale': 'GIF resolution',
	'topbar.record.gif': 'Export animated GIF',
	'topbar.record.video':          'Video',
	'topbar.record.pngSeq':         'PNG seq',
	'topbar.record.videoLoop1Desc': '1 loop',
	'topbar.record.videoLoop2Desc': '3 loops',
	'topbar.record.videoLoop3Desc': '6 loops',
	'topbar.record.gifFullDesc':    'Full size',
	'topbar.record.gifHalfDesc':    'Half size',
	'topbar.record.gifQuarterDesc': 'Quarter size',

	// Export pill (contextual)
	'topbar.export.tooltip':      'Export',
	'topbar.export.capture':      'Snapshot',
	'topbar.export.pngSeq':       'PNG sequence',
	'topbar.export.group.image':  'IMAGE',
	'topbar.export.group.motion': 'MOTION',

	// Info
	'topbar.info.about': 'About Diorame',

	// ═══════════════════════════════════════════════
	// BOTTOMBAR — DRAW
	// ═══════════════════════════════════════════════

	// Drawing tools
	'bottombar.draw.tool.blob': 'Blob',
	'bottombar.draw.tool.brush': 'Brush',
	'bottombar.draw.tool.eraser': 'Eraser',
	'bottombar.draw.tool.text': 'Text',
	'bottombar.draw.tool.move': 'Move',

	// Modifiers
	'bottombar.draw.mod.symmetry': 'Symmetry',
	'bottombar.draw.mod.drawInside': 'Draw Inside',
	'bottombar.draw.mod.drawBehind': 'Draw Behind',
	'bottombar.draw.mod.organic': 'Organic',
	'bottombar.draw.mod.smooth': 'Smooth',

	// Line modes (Brush types)
	'bottombar.draw.lineMode.tapered': 'Tapered',
	'bottombar.draw.lineMode.uniform': 'Uniform',
	'bottombar.draw.lineMode.ink': 'Ink',
	'bottombar.draw.lineMode.title': 'Line mode: {label} ({n}/3) — click to cycle',

	// Tool options
	'bottombar.draw.toolOptions.size': 'Size',

	// Animation player (moved to topbar)
	'bottombar.anim.toggle': 'Animation mode',
	'bottombar.anim.play':   'Play',
	'bottombar.anim.pause':  'Pause',
	'topbar.anim.toggle':        'Animation mode',
	'topbar.anim.play':          'Play',
	'topbar.anim.pause':         'Pause',
	'topbar.anim.frameBack':     'Previous frame',
	'topbar.anim.frameForward':  'Next frame',
	'topbar.anim.playbackLoop':  'Loop',
	'topbar.anim.playbackPingpong': 'Ping-pong',
	'topbar.anim.depthToggle':   'Depth (parallax)',
	'topbar.anim.onionSkin':     'Onion skin',

	// ═══════════════════════════════════════════════
	// BOTTOMBAR — VIEW
	// ═══════════════════════════════════════════════

	// Camera presets
	'bottombar.view.preset.forward': 'Forward',
	'bottombar.view.preset.spiral': 'Spiral',
	'bottombar.view.preset.yoyo': 'Yoyo',
	'bottombar.view.preset.pulse': 'Pulse',
	'bottombar.view.preset.twist': 'Twist',
	'bottombar.view.preset.arc': 'Arc',
	'bottombar.view.preset.crane': 'Crane',
	'bottombar.view.preset.truck': 'Truck',
	'bottombar.view.preset.free': 'Free',
	'bottombar.view.preset.zoom': 'Zoom',
	'bottombar.view.preset.storytelling': 'Storytelling',

	// Camera speed / handheld
	'bottombar.view.handheld.label': 'Handheld',
	'bottombar.view.handheld.tooltip': 'Handheld camera',
	'bottombar.view.handheld.dynamic': 'Handheld · {intensity}',
	'bottombar.view.handheld.intensity.low': 'low',
	'bottombar.view.handheld.intensity.medium': 'medium',
	'bottombar.view.handheld.intensity.high': 'high',

	// ═══════════════════════════════════════════════
	// FX — TEXTURE
	// ═══════════════════════════════════════════════

	'fx.texture.grain.label': 'Grain',
	'fx.texture.grain.tooltip': 'Grain',
	'fx.texture.grunge.label': 'Grunge',
	'fx.texture.grunge.tooltip': 'Grunge',
	'fx.texture.riso.label': 'Riso',
	'fx.texture.riso.tooltip': 'Riso',

	// ═══════════════════════════════════════════════
	// FX — LENS
	// ═══════════════════════════════════════════════

	'fx.lens.vignette.label': 'Vignette',
	'fx.lens.vignette.tooltip': 'Vignette',
	'fx.lens.chromaticAb.label': 'Chromatic Ab.',
	'fx.lens.chromaticAb.tooltip': 'Chromatic Aberration',
	'fx.lens.distortion.label': 'Distortion',
	'fx.lens.distortion.tooltip': 'Distortion',
	'fx.lens.glow.label': 'Glow',
	'fx.lens.glow.tooltip': 'Glow',
	'fx.lens.dof.label': 'DoF',
	'fx.lens.dof.tooltip': 'Depth of Field',

	// ═══════════════════════════════════════════════
	// FX — ATMOSPHERE
	// ═══════════════════════════════════════════════

	'fx.atmosphere.fog.label': 'Fog',
	'fx.atmosphere.fog.tooltip': 'Fog',
	'fx.atmosphere.particles.label': 'Particles',
	'fx.atmosphere.particles.tooltip': 'Particles',
	'fx.atmosphere.stopMotion.label': 'Stop Motion',
	'fx.atmosphere.pixelArt.label': 'Pixel Art',
	'fx.atmosphere.pixelArt.tooltip': 'Pixel Art',

	// Wiggle (mantiene su nombre en EN; lleva tooltip aparte)
	'fx.atmosphere.wiggle.tooltip': 'Wiggle',

	// ═══════════════════════════════════════════════
	// FX — UI (panel, groups, controls)
	// ═══════════════════════════════════════════════

	'fx.panel.header': 'FX',
	'fx.panel.toggleAll': 'Toggle all FX',
	'fx.panel.collapse': 'Collapse',
	'fx.panel.expand': 'Expand FX panel',

	'fx.group.texture': 'Texture',
	'fx.group.lens': 'Lens',
	'fx.group.atmosphere': 'Atmosphere',
	'fx.group.superRiso': 'Super Riso',
	'fx.superRiso.label': 'Super Riso',
	'fx.superRiso.tooltip': 'Super Riso',
	'fx.superRiso.style.clean': 'Clean shop',
	'fx.superRiso.style.zine': 'Zine',
	'fx.superRiso.style.lofi': 'Lo-fi',
	'fx.superRiso.style.cmyk': 'Four-color',
	'fx.superRiso.inks': 'Inks',
	'fx.superRiso.inks.own': 'Drawing',
	'fx.superRiso.inks.own.tooltip': 'Colors of the drawing',
	'fx.superRiso.inks.cmyk': 'CMYK',
	'fx.superRiso.inks.cmyk.tooltip': 'CMYK separation',
	'fx.superRiso.inks.dpal': 'Riso',
	'fx.superRiso.inks.dpal.tooltip': 'Riso ink palette',
	'fx.superRiso.maxInks': 'Number of inks',
	'fx.superRiso.reprint': 'Reprint',
	'fx.superRiso.printSettings': 'Print settings',
	'fx.superRiso.paper': 'Paper',
	'fx.superRiso.paper.white': 'White',
	'fx.superRiso.paper.natural': 'Natural',
	'fx.superRiso.paper.recycled': 'Recycled',
	'fx.superRiso.paper.cream': 'Cream',
	'fx.superRiso.screen': 'Screen',
	'fx.superRiso.screen.grain': 'Grain',
	'fx.superRiso.screen.dots': 'Dots',
	'fx.superRiso.screenSize': 'Screen size',
	'fx.superRiso.imperfection': 'Imperfection',
	'fx.superRiso.resolution': 'Resolution',
	'fx.superRiso.fullQuality': 'Always full quality',
	'fx.superRiso.previewNotice': 'Demanding effect: on this device the live preview in motion runs at reduced resolution. Exports are always full quality.',
	'fx.superRiso.noWebgl2': 'Super Riso needs WebGL2, which this browser or device does not support.',
	// Stencil (v3.20.0)
	'fx.superRiso.stencil.style.banksy': 'Banksy on cardboard',
	'fx.superRiso.stencil.style.canvas': 'Clean canvas',
	'fx.superRiso.stencil.style.wall': 'Portrait on a wall',
	'fx.superRiso.stencil.style.layers': 'Multilayer',
	'fx.superRiso.stencil.style.accent': 'Colour accent',
	'fx.superRiso.stencil.style.color': 'Colour layers',
	'fx.superRiso.stencil.style.street': 'Dirty street',
	'fx.superRiso.stencil.style.bridges': 'Lettering stencil',
	'fx.superRiso.stencil.templates': 'Stencils',
	'fx.superRiso.stencil.mode.tone': 'Tones',
	'fx.superRiso.stencil.mode.color': 'Drawing colours',
	'fx.superRiso.stencil.n': 'Number of layers',
	'fx.superRiso.stencil.nColor': 'Colours (+ black)',
	'fx.superRiso.stencil.one': 'one stencil',
	'fx.superRiso.stencil.many': '{n} stencils',
	'fx.superRiso.stencil.cut': 'Simplify the cut',
	'fx.superRiso.stencil.bridges': 'Bridges',
	'fx.superRiso.stencil.no': 'No',
	'fx.superRiso.stencil.yes': 'Yes',
	'fx.superRiso.stencil.spray': 'Spray',
	'fx.superRiso.stencil.load': 'Paint load',
	'fx.superRiso.stencil.lift': 'Lifted stencil',
	'fx.superRiso.stencil.over': 'Overspray',
	'fx.superRiso.stencil.drips': 'Drips',
	'fx.superRiso.stencil.splat': 'Splatter',
	'fx.superRiso.stencil.colors.spray': 'Spray cans',
	'fx.superRiso.stencil.colors.own': 'From the drawing',
	'fx.superRiso.stencil.layers': '{n} layers',
	'fx.superRiso.stencil.fromDrawing': 'from the drawing',
	'fx.superRiso.stencil.layer.tone': 'Layer {n}',
	'fx.superRiso.stencil.layer.color': 'Colour {n}',
	'fx.superRiso.stencil.layer.black': 'Black',
	'fx.superRiso.stencil.layer.accent': 'Accent',
	'fx.superRiso.stencil.layer.cloud': 'Cloud',
	'fx.superRiso.stencil.accent': 'Colour accent',
	'fx.superRiso.stencil.cloud': 'Background cloud',
	'fx.superRiso.stencil.cloud.none': 'No cloud',
	'fx.superRiso.stencil.cloud.white': 'White',
	'fx.superRiso.stencil.cloud.color': 'Colour',
	'fx.superRiso.stencil.support': 'Surface',
	'fx.superRiso.stencil.support.wall': 'Grey wall',
	'fx.superRiso.stencil.support.wallw': 'White wall',
	'fx.superRiso.stencil.support.dark': 'Dark wall',
	'fx.superRiso.stencil.support.card': 'Cardboard',
	'fx.superRiso.stencil.support.canvas': 'Canvas',
	'fx.superRiso.stencil.support.wood': 'Wood',
	'fx.superRiso.stencil.support.paper': 'Paper',
	'fx.superRiso.stencil.supTex': 'Surface texture',
	'fx.superRiso.stencil.drop': 'Droplet size',
	'fx.superRiso.stencil.spray.black': 'Black',
	'fx.superRiso.stencil.spray.darkGray': 'Dark grey',
	'fx.superRiso.stencil.spray.midGray': 'Mid grey',
	'fx.superRiso.stencil.spray.lightGray': 'Light grey',
	'fx.superRiso.stencil.spray.white': 'White',
	'fx.superRiso.stencil.spray.cream': 'Cream',
	'fx.superRiso.stencil.spray.red': 'Red',
	'fx.superRiso.stencil.spray.burgundy': 'Burgundy',
	'fx.superRiso.stencil.spray.pink': 'Pink',
	'fx.superRiso.stencil.spray.orange': 'Orange',
	'fx.superRiso.stencil.spray.yellow': 'Yellow',
	'fx.superRiso.stencil.spray.lime': 'Lime',
	'fx.superRiso.stencil.spray.green': 'Green',
	'fx.superRiso.stencil.spray.turquoise': 'Turquoise',
	'fx.superRiso.stencil.spray.skyBlue': 'Sky blue',
	'fx.superRiso.stencil.spray.blue': 'Blue',
	'fx.superRiso.stencil.spray.violet': 'Violet',
	'fx.superRiso.stencil.spray.brown': 'Brown',
	// Fotocopia (v3.19.0)
	'fx.superRiso.technique': 'Technique',
	'fx.superRiso.technique.riso': 'Riso',
	'fx.superRiso.technique.xerox': 'Photocopy',
	'fx.superRiso.technique.stencil': 'Stencil',
	'fx.superRiso.xerox.style.flyer': 'Punk flyer',
	'fx.superRiso.xerox.style.zine': 'Marker zine',
	'fx.superRiso.xerox.style.water': 'Watercolour on copy',
	'fx.superRiso.xerox.style.fluor': 'Fluoro paper',
	'fx.superRiso.xerox.style.degen': 'Copy of a copy',
	'fx.superRiso.xerox.style.photo': 'Photo mode',
	'fx.superRiso.xerox.style.munari': 'Munari',
	'fx.superRiso.xerox.style.lid': 'Lid open',
	'fx.superRiso.xerox.copier': 'Copier',
	'fx.superRiso.xerox.mode.line': 'Line',
	'fx.superRiso.xerox.mode.photo': 'Photo',
	'fx.superRiso.xerox.dark': 'Darkness',
	'fx.superRiso.xerox.toner': 'Toner black',
	'fx.superRiso.xerox.gens': 'Generations',
	'fx.superRiso.xerox.dirt': 'Dirt',
	'fx.superRiso.xerox.hand': 'Hand colouring',
	'fx.superRiso.xerox.hand.none': 'No colour',
	'fx.superRiso.xerox.hand.marker': 'Marker',
	'fx.superRiso.xerox.hand.water': 'Watercolour',
	'fx.superRiso.xerox.what': 'What it colours',
	'fx.superRiso.xerox.what.color': 'Colour patches',
	'fx.superRiso.xerox.what.color.tooltip': 'Each colour patch of the drawing is painted in its own colour',
	'fx.superRiso.xerox.what.fill': 'White gaps',
	'fx.superRiso.xerox.what.fill.tooltip': 'Colours the gaps closed by the line, like a person would',
	'fx.superRiso.xerox.fillCover': 'Gaps coloured',
	'fx.superRiso.xerox.reroll': 'Shuffle colours',
	'fx.superRiso.xerox.colors': 'Colours',
	'fx.superRiso.xerox.n': 'Zones coloured',
	'fx.superRiso.xerox.pal.own': 'From the drawing',
	'fx.superRiso.xerox.pal.own.tooltip': 'Each zone keeps its colour from the drawing',
	'fx.superRiso.xerox.pal.marker': 'Markers',
	'fx.superRiso.xerox.pal.water': 'Watercolours',
	'fx.superRiso.xerox.pal.kit.tooltip': 'Each zone takes the closest one, without repeats',
	'fx.superRiso.xerox.nOf': '{n} of {m}',
	'fx.superRiso.xerox.box.marker': 'Markers in the box',
	'fx.superRiso.xerox.box.water': 'Watercolours in the box',
	'fx.superRiso.xerox.addToBox': '+ Add to the box',
	'fx.superRiso.xerox.resetZone': 'Back to the automatic colour',
	'fx.superRiso.xerox.zone': 'Drawing zone',
	'fx.superRiso.xerox.changeZone': 'Change the colour of this zone',
	'fx.superRiso.xerox.noZones': 'This drawing has no colour patches: use "White gaps".',
	'fx.superRiso.xerox.bw': 'black and white',
	'fx.superRiso.xerox.inBox': '{n} in the box',
	'fx.superRiso.xerox.colorsN': '{n} colours',
	'fx.superRiso.xerox.sloppy': 'Sloppiness',
	'fx.superRiso.xerox.ownColor': 'Drawing colour',
	'fx.superRiso.xerox.changeColor': 'Change colour',
	'fx.superRiso.xerox.removeColor': 'Remove colour',
	'fx.superRiso.xerox.paper.copy': 'White copy paper',
	'fx.superRiso.xerox.paper.recycled': 'Recycled',
	'fx.superRiso.xerox.paper.fpink': 'Fluoro pink',
	'fx.superRiso.xerox.paper.fyellow': 'Fluoro yellow',
	'fx.superRiso.xerox.paper.fgreen': 'Fluoro green',
	'fx.superRiso.xerox.paper.forange': 'Fluoro orange',
	'fx.superRiso.xerox.paper.blue': 'Pastel blue',
	'fx.superRiso.xerox.marker.red': 'Red',
	'fx.superRiso.xerox.marker.pink': 'Pink',
	'fx.superRiso.xerox.marker.magenta': 'Magenta',
	'fx.superRiso.xerox.marker.orange': 'Orange',
	'fx.superRiso.xerox.marker.yellow': 'Yellow',
	'fx.superRiso.xerox.marker.lemon': 'Lemon',
	'fx.superRiso.xerox.marker.green': 'Green',
	'fx.superRiso.xerox.marker.lime': 'Lime',
	'fx.superRiso.xerox.marker.turquoise': 'Turquoise',
	'fx.superRiso.xerox.marker.cyan': 'Cyan',
	'fx.superRiso.xerox.marker.blue': 'Blue',
	'fx.superRiso.xerox.marker.violet': 'Violet',
	'fx.superRiso.xerox.marker.brown': 'Brown',
	'fx.superRiso.xerox.marker.skin': 'Peach',
	'fx.superRiso.xerox.marker.warmGray': 'Warm grey',
	'fx.superRiso.xerox.marker.coolGray': 'Cool grey',

	// Sub-controls
	'fx.subcontrol.size': 'Size',
	'fx.subcontrol.depth': 'Depth',
	'fx.subcontrol.dither': 'Dither',
	'fx.subcontrol.zPlane': 'Z-Plane',
	'fx.subcontrol.layer': 'Layer',

	// DoF segment options
	'fx.dof.free': 'Free',
	'fx.dof.lock': 'Lock',

	// Depth map (Pixel Art)
	'fx.depth.1bit': '1-bit',
	'fx.depth.cga': 'CGA',
	'fx.depth.8color': '8-Color',
	'fx.depth.retro': 'Retro',
	'fx.depth.hiColor': 'Hi-Color',
	'fx.depth.pocket': 'Pocket',
	'fx.depth.stylized': 'Stylized',
	'fx.depth.original': 'Original',

	// Dither / Z-Plane special values
	'fx.dither.clean': 'Clean',

	// Intensity scales (compartido Grunge + Wiggle: medium share key)
	'fx.intensity.subtle': 'Subtle',
	'fx.intensity.medium': 'Medium',
	'fx.intensity.intense': 'Intense',
	'fx.intensity.light': 'Light',
	'fx.intensity.heavy': 'Heavy',

	// Particles composite options
	'fx.particles.circle': 'Circle',
	'fx.particles.square': 'Square',
	'fx.particles.stroke': 'Stroke',

	// Dynamic labels
	'fx.dof.layerDynamic': 'Layer {n}',

	// PWA — service worker update / offline
	'pwa.update.message': 'New version available',
	'pwa.update.reload': 'Reload',
	'pwa.offlineReady.message': 'Ready to work offline',

	// ═══════════════════════════════════════════════
	// LAYERS
	// ═══════════════════════════════════════════════

	'layers.panel.header': 'Layers',
	'layers.panel.expand': 'Expand layers panel',
	'layers.panel.collapse': 'Collapse',
	'layers.action.show': 'Show layer',
	'layers.action.hide': 'Hide layer',
	'layers.action.duplicate': 'Duplicate layer',
	'layers.action.delete': 'Delete layer',
	'layers.action.moveUp': 'Move layer up',
	'layers.action.moveDown': 'Move layer down',
	'layers.action.add': 'Add layer',

	// Layer row
	'layers.row.name': 'Layer {n}',
	'layers.row.goTo': 'Go to layer {n}',

	// Color mode badges
	'layers.badge.empty': 'Empty',
	'layers.badge.flat': 'Flat',
	'layers.badge.grad': 'Grad',
	'layers.badge.fade': 'Fade',

	'layers.discoveryTooltip.title': 'Try layers',
	'layers.discoveryTooltip.body': 'Each layer sits at a different point in 3D space. That\'s what turns your drawing into a diorama.',

	// ═══════════════════════════════════════════════
	// PALETTE
	// ═══════════════════════════════════════════════

	'palette.segment.primary': 'Primary',
	'palette.segment.alt': 'Alt',
	'palette.segment.flat': 'Flat',
	'palette.segment.gradient': 'Gradient',
	'palette.segment.fade': 'Fade',
	'palette.applyToAll.label': 'Apply to all',
	'palette.applyToAll.tooltip': 'Apply mode to all layers',

	// Color names (primary palette) — visibles solo en hover
	'palette.color.black': 'Black',
	'palette.color.charcoal': 'Charcoal',
	'palette.color.silver': 'Silver',
	'palette.color.white': 'White',
	'palette.color.forest': 'Forest',
	'palette.color.pine': 'Pine',
	'palette.color.sage': 'Sage',
	'palette.color.lime': 'Lime',
	'palette.color.mint': 'Mint',
	'palette.color.navy': 'Navy',
	'palette.color.cobalt': 'Cobalt',
	'palette.color.blue': 'Blue',
	'palette.color.sky': 'Sky',
	'palette.color.teal': 'Teal',
	'palette.color.plum': 'Plum',
	'palette.color.lavender': 'Lavender',
	'palette.color.brick': 'Brick',
	'palette.color.red': 'Red',
	'palette.color.rose': 'Rose',
	'palette.color.blush': 'Blush',
	'palette.color.sand': 'Sand',
	'palette.color.peach': 'Peach',
	'palette.color.butter': 'Butter',
	'palette.color.cream': 'Cream',

	// Color names (alternative palette)
	'palette.colorAlt.black': 'Black',
	'palette.colorAlt.darkGrey': 'Dark Grey',
	'palette.colorAlt.lightGrey': 'Light Grey',
	'palette.colorAlt.offWhite': 'Off White',
	'palette.colorAlt.darkGreen': 'Dark Green',
	'palette.colorAlt.green': 'Green',
	'palette.colorAlt.olive': 'Olive',
	'palette.colorAlt.lightGreen': 'Light Green',
	'palette.colorAlt.beige': 'Beige',
	'palette.colorAlt.darkTeal': 'Dark Teal',
	'palette.colorAlt.blueGrey': 'Blue Grey',
	'palette.colorAlt.blue': 'Blue',
	'palette.colorAlt.teal': 'Teal',
	'palette.colorAlt.lightBlue': 'Light Blue',
	'palette.colorAlt.darkPurple': 'Dark Purple',
	'palette.colorAlt.greyBlue': 'Grey Blue',
	'palette.colorAlt.darkMaroon': 'Dark Maroon',
	'palette.colorAlt.rust': 'Rust',
	'palette.colorAlt.red': 'Red',
	'palette.colorAlt.pink': 'Pink',
	'palette.colorAlt.brown': 'Brown',
	'palette.colorAlt.orange': 'Orange',
	'palette.colorAlt.yellowGreen': 'Yellow Green',
	'palette.colorAlt.yellow': 'Yellow',

	// ═══════════════════════════════════════════════
	// TEXT TOOL
	// ═══════════════════════════════════════════════

	'text.placeholder': 'Type here…',
	'text.align.left': 'Align left',
	'text.align.center': 'Align center',
	'text.align.right': 'Align right',
	'text.action.cancel': 'Cancel',
	'text.action.done': 'Done',

	// Font names (nombres propios, igual en ES)
	'text.font.noir': 'Noir',
	'text.font.mansion': 'Mansion',
	'text.font.pharma': 'Pharma',
	'text.font.comic': 'Comic',
	'text.font.dungeon': 'Dungeon',

	// ═══════════════════════════════════════════════
	// VIEWPORT
	// ═══════════════════════════════════════════════

	'viewport.resetView': 'Reset view',
	'viewport.compositionGuide': 'Composition guide',
	'viewport.showUi': 'Show UI',
	'viewport.flipHorizontal': 'Flip Horizontal',
	'viewport.flipVertical': 'Flip Vertical',
	'viewport.centerLayer': 'Center layer',
	'viewport.cinema.doubleTapHint': 'Double tap to frame',
	'viewport.cinema.resetPoi': 'Clear framing',
	'viewport.cinema.storytellingHint': 'Storytelling follows its own path',

	// ═══════════════════════════════════════════════
	// MODALS
	// ═══════════════════════════════════════════════

	// Welcome modal
	'modal.welcome.logoAlt': 'Diorame logo',
	'modal.welcome.tagline': 'Draw in 2D. And watch it come alive in 3D.',
	'modal.welcome.tutorial': 'Watch tutorial',
	'modal.welcome.dumaker': 'by @dumaker',
	'modal.welcome.kofi': 'Support on Ko-fi 💜',
	'modal.welcome.graintouch': 'Inspired by Graintouch',
	'modal.welcome.bugReport.link': 'Found a bug? Email me.',
	'modal.welcome.shortcuts': 'Keyboard shortcuts',
	'modal.welcome.cta.primary': 'Start drawing',
	'modal.welcome.cta.secondary': 'Load example scene',
	'modal.welcome.cta.loading': 'Loading…',
	'modal.welcome.cta.restore': 'Continue previous work',
	'modal.welcome.cta.backToDrawing': 'Back to drawing',
	'modal.welcome.cta.loadFile': 'Load file',
	'modal.welcome.sounds.toggle': 'Enable UI sounds',
	'modal.welcome.sounds.credits': 'Sound credits',
	'modal.welcome.sounds.creditPrefix': 'Sounds by',
	'modal.welcome.sounds.creditSuffix': '(Pixabay)',

	// Bug report email (dinámico)
	'modal.welcome.bugReport.subject': 'Diorame bug report — v{version}',
	'modal.welcome.bugReport.body': 'What I expected:\n\n\nWhat happened instead:\n\n\nSteps to reproduce:\n\n\n---\nBrowser:\nOS:',

	// Clear canvas modal
	'modal.clearCanvas.title': 'Clear canvas?',
	'modal.clearCanvas.body': 'This action cannot be undone.',
	'modal.clearCanvas.confirm': 'Clear',
	'modal.clearCanvas.cancel': 'Cancel',
	'modal.saveName.title': 'Drawing name',
	'modal.saveName.body': 'Names the .dior file and its versions.',
	'modal.saveName.placeholder': 'My drawing',
	'modal.saveName.confirm': 'Save',
	'modal.saveName.cancel': 'Cancel',
	'modal.duplicate.title': 'Duplicate as new drawing',
	'modal.duplicate.body': 'The copy is a new drawing, with versions of its own. The original stays as it is.',
	'modal.duplicate.defaultName': '{name} (copy)',
	'modal.duplicate.confirm': 'Duplicate',
	'modal.emptySave.title': 'Save an empty canvas?',
	'modal.emptySave.body': 'Nothing has been drawn yet.',
	'modal.emptySave.confirm': 'Save anyway',
	'modal.emptySave.cancel': 'Cancel',

	// Complex scene modal
	'modal.complexScene.title': 'Complex scene detected',
	'modal.complexScene.body': 'Your drawing contains {shapeCount} shapes. Rendering may be slow or fail.',
	'modal.complexScene.continue': 'Continue',
	'modal.complexScene.optimize': 'Optimize',
	'modal.complexScene.cancel': 'Cancel',

	// Export progress
	'modal.export.snapshot': 'Capturing…',
	'modal.export.animation': 'Rendering animation…',
	'modal.export.vector': 'Exporting vector…',
	'modal.export.pngSequence': 'Rendering frames…',
	'modal.export.gif': 'Encoding GIF…',

	// Mobile block
	'modal.mobile.alt': 'Diorame',
	'modal.mobile.primary': 'Diorame is designed for tablet and desktop.',
	'modal.mobile.secondary': 'You\'ll need a larger screen to draw, layer, and view your scenes in motion.',

	// Onboarding overlay
	'modal.onboarding.header': 'Welcome to Diorame',
	'modal.onboarding.tagline': 'Draw in 2D. And watch it come alive in 3D.',
	'modal.onboarding.section.draw': 'DRAW',
	'modal.onboarding.section.view': 'CINEMA',

	// Onboarding cards — DRAW
	'modal.onboarding.card.blob.title': 'Blob',
	'modal.onboarding.card.blob.desc': 'Spray-like organic shapes',
	'modal.onboarding.card.brush.title': 'Brush',
	'modal.onboarding.card.brush.desc': 'Tapered, calligraphic strokes',
	'modal.onboarding.card.layers.title': 'Layers',
	'modal.onboarding.card.layers.desc': 'Build depth with stacked planes',

	// Onboarding cards — VIEW
	'modal.onboarding.card.motion.title': 'Motion',
	'modal.onboarding.card.motion.desc': 'Camera presets and movements',
	'modal.onboarding.card.effects.title': 'Effects',
	'modal.onboarding.card.effects.desc': 'Grain, glow, fog and more',
	'modal.onboarding.card.depth.title': 'Depth',
	'modal.onboarding.card.depth.desc': 'Layer spacing and parallax',

	// Onboarding cards — ANIMATE
	'modal.onboarding.section.animate': 'Animate',
	'modal.onboarding.card.animation.title': 'Animation',
	'modal.onboarding.card.animation.desc': 'Turn your layers into frames and bring them to life',
	'modal.onboarding.card.animation.badge': 'NEW',

	// Onboarding CTAs
	'modal.onboarding.cta.example': 'Load example scene',
	'modal.onboarding.cta.exampleLoading': 'Loading…',
	'modal.onboarding.cta.start': 'Start drawing',

	// ═══════════════════════════════════════════════
	// TOAST NOTIFICATIONS
	// ═══════════════════════════════════════════════

	// Export — success
	'toast.export.snapshot.successTitle': 'Snapshot saved!',
	'toast.export.snapshot.successDesc': 'PNG image downloaded successfully',
	'toast.export.vector.successTitle': 'Vector exported!',
	'toast.export.vector.successDescSvg': 'SVG file downloaded successfully',
	'toast.export.vector.successDescSvgz': 'SVGZ file downloaded successfully',
	'toast.export.animation.successTitle': 'Animation saved!',
	'toast.export.animation.successDesc': 'Video loop downloaded successfully',
	'toast.export.pngSequence.successTitle': 'Frames exported!',
	'toast.export.pngSequence.successDesc': 'ZIP with PNG frames downloaded',

	// Export — error
	'toast.export.snapshot.errorTitle': 'Failed to save snapshot',
	'toast.export.vector.errorTitle': 'Failed to export vector',
	'toast.export.vector.textFallbackTitle': 'Some text stayed as live text',
	'toast.export.vector.textFallbackDesc': '{count} characters could not be turned into outlines — they only look right where the font is installed.',
	'toast.export.vector.geometryFallbackTitle': 'Part of the drawing did not export as clean geometry',
	'toast.export.vector.geometryFallbackDesc': '{count} pieces carry a mask (Illustrator ignores it in Outline view and Pathfinder) or could not be converted. Check the SVG.',
	'toast.export.animation.errorTitle': 'Failed to save animation',
	'toast.export.pngSequence.errorTitle': 'Failed to export frames',
	'toast.export.gif.successTitle': 'GIF exported!',
	'toast.export.gif.successDesc': 'Animated GIF downloaded',
	'toast.export.gif.errorTitle': 'Failed to export GIF',

	// Save/Load
	'toast.save.successTitle': 'Project saved',
	'toast.save.successDesc': '{filename}',
	'toast.save.errorTitle': 'Failed to save',
	'toast.duplicate.title': 'Copy created',
	'toast.duplicate.desc': 'You are now working on "{name}". Save it to create its file.',

	'toast.load.successTitle': 'Project loaded',
	'toast.load.successDesc': '{n} shapes',
	'toast.load.successDescOne': '{n} shape',
	'toast.load.errorTitle': 'Failed to load project',
	'toast.load.errorDescFile': 'File too large',
	'toast.load.errorDescSize': 'Maximum file size is 50 MB',
	'toast.load.errorDescGeneric': 'Check file validity',

	// Example scene
	'toast.example.errorTitle': 'Failed to load example',
	'toast.example.errorDesc': 'Please check your connection',

	// ═══════════════════════════════════════════════
	// SHORTCUTS (categorías + labels en WelcomeModal)
	// ═══════════════════════════════════════════════

	'shortcuts.category.file': 'File',
	'shortcuts.category.edit': 'Edit',
	'shortcuts.category.view': 'View',
	'shortcuts.category.toolsDraw': 'Tools (Draw)',
	'shortcuts.category.layersDraw': 'Layers (Draw)',
	'shortcuts.category.canvasDraw': 'Canvas (Draw)',

	'shortcuts.label.saveProject': 'Save project',
	'shortcuts.label.exportSvg': 'Export SVG',
	'shortcuts.label.exportSvgz': 'Export SVGZ',
	'shortcuts.label.undo': 'Undo',
	'shortcuts.label.redo': 'Redo',
	'shortcuts.label.darkMode': 'Dark mode',
	'shortcuts.label.openShortcuts': 'Open shortcuts',
	'shortcuts.label.blob': 'Blob',
	'shortcuts.label.brush': 'Brush',
	'shortcuts.label.eraser': 'Eraser',
	'shortcuts.label.text': 'Text',
	'shortcuts.label.move': 'Move',
	'shortcuts.label.previousLayer': 'Previous layer',
	'shortcuts.label.nextLayer': 'Next layer',
	'shortcuts.label.panCanvas': 'Pan canvas',
	'shortcuts.label.centerCanvas': 'Center canvas',
	'shortcuts.qualifier.hold': 'hold',
	'shortcuts.qualifier.tap': 'tap',

	// ═══════════════════════════════════════════════
	// COMMON (strings reutilizables)
	// ═══════════════════════════════════════════════

	'common.close': 'Close',
	'common.off': 'off',
	'common.loading': 'Loading…',
	'common.pleaseRetry': 'Please try again',
};
