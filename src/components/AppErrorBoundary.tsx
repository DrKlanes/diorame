import React from 'react';
import { analytics } from '../analytics/analytics';
import { useTranslation } from '../i18n';
import { DiButton } from '../design-system/DiButton';
import { T, TYPE } from '../design-system/tokens';

// Error boundary raíz (v3.26.68). Ante un error de render: `exception` con fatal: true y una pantalla
// mínima. NO toca el autoguardado (vive en IndexedDB y este componente no lo lee ni lo escribe): tras
// recargar, el modal de bienvenida ofrece «Continuar trabajo anterior». El tema sale de
// prefers-color-scheme (el estado del tema vive en el reducer, que es justo lo que pudo romperse).

function ErrorFallback() {
	const { t } = useTranslation();
	const dark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
	return (
		<div
			role="alert"
			style={{
				position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
				alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center',
				background: dark ? T.dark : T.light, color: dark ? T.textDark : T.dark, fontFamily: TYPE.manrope,
			}}
		>
			<h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{t('error.boundary.title')}</h1>
			<p style={{ fontSize: 14, margin: 0, maxWidth: 360, color: dark ? T.textDarkMuted : T.muted }}>
				{t('error.boundary.body')}
			</p>
			<DiButton variant="brand" onClick={() => window.location.reload()} className="mt-2 px-6">
				{t('error.boundary.reload')}
			</DiButton>
		</div>
	);
}

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	componentDidCatch(error: unknown) {
		analytics.reportBoundaryError(error);
	}

	render() {
		return this.state.failed ? <ErrorFallback /> : this.props.children;
	}
}
