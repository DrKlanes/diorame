import { useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { useStrata } from '../components/strata/StrataContext';
import { UNTITLED_PROJECT_SENTINEL } from '../constants/project';
import { useTranslation } from '../i18n';
import { buildDiorData } from '../utils/diorPayload';
import { DIOR_FORMAT_VERSION, DIOR_MIME, projectFileStem, type DiorFileMeta } from '../utils/projectMeta';
import { downloadBlob } from '../utils/downloadBlob';
import { closeSuperRisoWindow, launchSuperRiso, visibleDrawView } from '../utils/superRisoBridge';
import { renderProjectThumbnail } from '../components/strata/canvas/projectThumbnail';

// Export › Super Riso ↗ (v3.23.0). The drawing leaves as a .dior built in memory like "Save" builds it (same payload,
// same meta), without writing a file, bumping the version or touching the linked file; with the DRAW view on screen.
export function useSuperRisoExport() {
	const { state } = useStrata();
	const { t } = useTranslation();

	return useCallback(() => {
		const canvas = document.querySelector('[data-drawing-canvas]');
		const box = canvas?.parentElement;
		const w = box?.clientWidth || window.innerWidth;
		const h = box?.clientHeight || window.innerHeight;
		const name = state.projectName === UNTITLED_PROJECT_SENTINEL ? t('topbar.file.untitledProject') : state.projectName;
		const filename = `${projectFileStem(name)}.dior`;
		const emptyToast = () => toast.error(t('toast.superRiso.emptyTitle'), { description: t('toast.superRiso.emptyDesc') });
		if (state.shapes.length === 0) { emptyToast(); return; }

		let empty = false;
		// First thing, still inside the click: popup blockers let a window open only from the gesture itself.
		launchSuperRiso(async () => {
			const fileMeta: DiorFileMeta = {
				formatVersion: DIOR_FORMAT_VERSION, ...state.projectMeta,
				shapeCount: state.shapes.length,
				thumbnail: await renderProjectThumbnail(),
			};
			const blob = new Blob([JSON.stringify(buildDiorData(state, state.projectName, fileMeta))], { type: DIOR_MIME });
			// frameOf's coordinates are those of the file as the Lab reads it: measure the serialized copy, not the live state.
			const { frameOf } = await import('../components/strata/canvas/diorRender');
			try { frameOf(JSON.parse(await blob.text())); } catch (err) { empty = true; throw err; }
			return { blob, name: filename, drawView: visibleDrawView(state, w, h) };
		}).then(({ ok, payload }) => {
			if (ok) { toast.success(t('toast.superRiso.opened'), { duration: 2000 }); return; }
			if (empty) { closeSuperRisoWindow(); emptyToast(); return; }
			toast.error(t('toast.superRiso.failedTitle'), {
				description: t('toast.superRiso.failedDesc'),
				duration: 15000,
				action: {
					label: t('toast.superRiso.download'),
					onClick: () => {
						if (payload) { downloadBlob(payload.blob, filename); return; }
						// Nothing was ready when the window failed: build the file now.
						const meta: DiorFileMeta = { formatVersion: DIOR_FORMAT_VERSION, ...state.projectMeta, shapeCount: state.shapes.length, thumbnail: null };
						downloadBlob(new Blob([JSON.stringify(buildDiorData(state, state.projectName, meta))], { type: DIOR_MIME }), filename);
					},
				},
			});
		});
	}, [state, t]);
}
