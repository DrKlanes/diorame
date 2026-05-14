import { createContext, useContext } from 'react';

export type DiModalVariant = 'dialog' | 'alert' | 'banner';

type DiModalContextValue = {
	onClose: () => void;
	dark: boolean;
	variant: DiModalVariant;
};

export const DiModalContext = createContext<DiModalContextValue>({
	onClose: () => {},
	dark: false,
	variant: 'dialog',
});

export function useDiModalContext(): DiModalContextValue {
	return useContext(DiModalContext);
}
