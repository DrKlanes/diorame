import React from 'react';
import { cn } from '../components/ui/utils';
import { diTokens } from './tokens';

interface DiSliderProps {
	label: React.ReactNode;
	formattedValue: string;
	value: number;
	min: number;
	max: number;
	step: number;
	disabled?: boolean;
	onChange: (value: number) => void;
	className?: string;
}

export function DiSlider({
	label, formattedValue, value, min, max, step,
	disabled = false, onChange, className,
}: DiSliderProps) {
	return (
		<div className={cn("flex flex-col gap-2", className)}>
			<div className={cn("flex justify-between items-center text-xs font-medium", diTokens.textMuted)}>
				<span className="flex items-center gap-1">{label}</span>
				<span>{formattedValue}</span>
			</div>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				disabled={disabled}
				onChange={(e) => onChange(parseFloat(e.target.value))}
				className={cn(
					"w-full h-1 rounded-lg appearance-none cursor-pointer",
					diTokens.sliderBg, diTokens.sliderAccent,
					disabled && "opacity-50 cursor-not-allowed"
				)}
			/>
		</div>
	);
}
