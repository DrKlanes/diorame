import { useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { useStrata } from '../components/strata/StrataContext';
import { useTranslation } from '../i18n';
import { canMergeDown, mergeChangesGradient } from '../utils/mergeLayers';

/** The panel button and the Shift+M shortcut: same guards, same toast. */
export function useMergeLayerDown(): { canMerge: boolean; mergeDown: () => void } {
	const { state, dispatch } = useStrata();
	const { t } = useTranslation();

	const mergeDown = useCallback(() => {
		if (!canMergeDown(state)) return;
		if (mergeChangesGradient(state)) toast(t('toast.layers.mergeGradient'), { duration: 3000 });
		dispatch({ type: 'MERGE_LAYER_DOWN' });
	}, [state, dispatch, t]);

	return { canMerge: canMergeDown(state), mergeDown };
}
