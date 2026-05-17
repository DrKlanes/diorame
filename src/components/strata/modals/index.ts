// DiModal — compound component modal system
// Usage: <DiModal open={...} onClose={...} dark={dark}>
//   <DiModal.Header title="..." />
//   <DiModal.Body>...</DiModal.Body>
//   <DiModal.Footer>
//     <DiModal.SecondaryAction onClick={onClose}>Cancel</DiModal.SecondaryAction>
//     <DiModal.PrimaryAction onClick={onConfirm}>Confirm</DiModal.PrimaryAction>
//   </DiModal.Footer>
// </DiModal>

export type { DiModalVariant } from './DiModalContext';
export { useModalBehavior } from './useModalBehavior';
export { WelcomeModalV2 } from './WelcomeModalV2';
export { getWelcomeIllustration } from './welcomeIllustrations';
export { ClearCanvasAlertV2 } from './ClearCanvasAlertV2';
export { ComplexSceneModalV2 } from './ComplexSceneModalV2';
export { ExportProgressV2 } from './ExportProgressV2';
export type { ExportType } from './ExportProgressV2';
export { OnboardingOverlayV2 } from './OnboardingOverlayV2';

import { DiModalRoot } from './DiModal';
import { DiModalHeader } from './DiModalHeader';
import { DiModalBody } from './DiModalBody';
import { DiModalFooter } from './DiModalFooter';
import { DiModalCloseButton } from './DiModalCloseButton';
import {
	PrimaryAction,
	PrimaryActionLg,
	SecondaryAction,
	DestructiveAction,
	TertiaryAction,
} from './DiModalActions';

export const DiModal = Object.assign(DiModalRoot, {
	Header:            DiModalHeader,
	Body:              DiModalBody,
	Footer:            DiModalFooter,
	CloseButton:       DiModalCloseButton,
	PrimaryAction,
	PrimaryActionLg,
	SecondaryAction,
	DestructiveAction,
	TertiaryAction,
});
