export const ROOT: string;
export const REL: string;
export function cutHandlers(source: string): { maxPan: string; getActiveZ: string; setIsDrawing: string; region: string };
export function runHandlers(source: string): Promise<Record<string, unknown>>;
