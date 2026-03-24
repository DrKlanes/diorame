import React from 'react';
import { RippleButton } from '../components/ui/ripple-button';
import { cn } from '../components/ui/utils';

type ShadcnVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';

interface DiButtonProps extends React.ComponentPropsWithoutRef<typeof RippleButton> {
	variant?: ShadcnVariant | 'brand';
}

// Clase brand como literal — Tailwind la detecta en el escaneo estático
const BRAND_ACTIVE = "bg-[#9a0ff9] text-white hover:bg-[#8a0fe0] scale-105 shadow-sm";

export const DiButton = React.forwardRef<HTMLButtonElement, DiButtonProps>(
	({ variant, className, ...props }, ref) => {
		if (variant === 'brand') {
			return (
				<RippleButton
					ref={ref}
					variant="secondary"
					className={cn(BRAND_ACTIVE, className)}
					{...props}
				/>
			);
		}
		return (
			<RippleButton
				ref={ref}
				variant={variant as ShadcnVariant}
				className={className}
				{...props}
			/>
		);
	}
);
DiButton.displayName = 'DiButton';
