import { useState, useCallback } from 'react';
import { useStrata } from '../components/strata/StrataContext';

const COMPLEXITY_THRESHOLD = 800;

export function useExportFlow() {
	const { state, dispatch } = useStrata();
	const [pendingExportFormat, setPendingExportFormat] = useState<'svg' | 'svgz' | null>(null);
	const [showComplexityWarning, setShowComplexityWarning] = useState(false);

	const handleExportRequest = useCallback((format: 'svg' | 'svgz') => {
		const totalShapes = state.shapes
			? state.shapes.filter(s => !state.hiddenLayers.includes(s.zIndex)).length
			: 0;
		if (totalShapes > COMPLEXITY_THRESHOLD) {
			setPendingExportFormat(format);
			setShowComplexityWarning(true);
		} else {
			dispatch({ type: 'REQUEST_EXPORT', payload: format });
		}
	}, [state.shapes, state.hiddenLayers, dispatch]);

	const handleProceedWithExport = useCallback(() => {
		if (pendingExportFormat) {
			dispatch({ type: 'REQUEST_EXPORT', payload: pendingExportFormat });
		}
		setShowComplexityWarning(false);
		setPendingExportFormat(null);
	}, [pendingExportFormat, dispatch]);

	const handleCancelExport = useCallback(() => {
		setShowComplexityWarning(false);
		setPendingExportFormat(null);
	}, []);

	const handleUseCompressedExport = useCallback(() => {
		dispatch({ type: 'REQUEST_EXPORT', payload: 'svgz' });
		setShowComplexityWarning(false);
		setPendingExportFormat(null);
	}, [dispatch]);

	const shapeCount = state.shapes
		? state.shapes.filter(s => !state.hiddenLayers.includes(s.zIndex)).length
		: 0;

	return {
		handleExportRequest,
		handleProceedWithExport,
		handleCancelExport,
		handleUseCompressedExport,
		showComplexityWarning,
		shapeCount,
	};
}
