import { useState, useLayoutEffect, useCallback, RefObject } from 'react';

export type PopoverPlacement = 'top' | 'bottom' | 'auto';
export type PopoverAlign = 'start' | 'center' | 'end';

export type PopoverPosition = {
	top: number;
	left: number;
	resolvedPlacement: 'top' | 'bottom';
};

const ESTIMATED_HEIGHT = 150;
const VIEWPORT_MARGIN  = 16;
const DEFAULT_OFFSET   = 8;

export function usePopoverPosition(
	anchorRef:  RefObject<HTMLElement | null>,
	popoverRef: RefObject<HTMLElement | null>,
	placement:  PopoverPlacement,
	align:      PopoverAlign,
	offset:     number = DEFAULT_OFFSET,
	open:       boolean,
): PopoverPosition {
	const [position, setPosition] = useState<PopoverPosition>({
		top: 0, left: 0, resolvedPlacement: 'bottom',
	});

	const calculate = useCallback(() => {
		const anchor = anchorRef.current;
		if (!anchor) return;

		const anchorRect    = anchor.getBoundingClientRect();
		const popoverHeight = popoverRef.current?.offsetHeight ?? ESTIMATED_HEIGHT;
		const popoverWidth  = popoverRef.current?.offsetWidth  ?? 240;

		// Resolve placement
		let resolvedPlacement: 'top' | 'bottom';
		if (placement === 'auto') {
			const spaceBelow = window.innerHeight - anchorRect.bottom;
			const needsBelow = popoverHeight + offset + VIEWPORT_MARGIN;
			resolvedPlacement = (spaceBelow < needsBelow && anchorRect.top > spaceBelow)
				? 'top'
				: 'bottom';
		} else {
			resolvedPlacement = placement;
		}

		// Calculate top
		const top = resolvedPlacement === 'bottom'
			? anchorRect.bottom + offset
			: anchorRect.top - offset - popoverHeight;

		// Calculate left based on align
		let left: number;
		if (align === 'center') {
			left = anchorRect.left + anchorRect.width / 2 - popoverWidth / 2;
		} else if (align === 'end') {
			left = anchorRect.right - popoverWidth;
		} else {
			left = anchorRect.left;
		}

		// Clamp to viewport
		left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - popoverWidth - VIEWPORT_MARGIN));

		setPosition({ top, left, resolvedPlacement });
	}, [anchorRef, popoverRef, placement, align, offset]);

	useLayoutEffect(() => {
		if (!open) return;
		calculate();
		const raf = requestAnimationFrame(calculate); // second pass once DOM is measured
		window.addEventListener('resize', calculate);
		window.addEventListener('scroll', calculate, true);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', calculate);
			window.removeEventListener('scroll', calculate, true);
		};
	}, [open, calculate]);

	return position;
}
