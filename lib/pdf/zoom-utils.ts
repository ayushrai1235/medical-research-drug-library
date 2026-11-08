export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';

/**
 * Determine device category based on viewport width
 */
export function getDeviceCategory(width: number): DeviceCategory {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Calculate the default zoom scale according to project specifications:
 * - Mobile: 60% (0.60)
 * - Desktop/Laptop: 80% (0.80)
 * - Tablet: Fit to Width (calculated based on container or standard width)
 */
export function calculateDefaultZoom(
  category: DeviceCategory,
  containerWidth?: number,
  pageUnscaledWidth = 595.28
): number {
  if (category === 'mobile') return 0.6;
  if (category === 'desktop') return 0.8;

  // Tablet: Fit to width
  const available = Math.max((containerWidth || 768) - 40, 200);
  const fit = available / pageUnscaledWidth;
  return Math.round(Math.min(Math.max(fit, 0.4), 2.5) * 100) / 100;
}

/**
 * Compute high-DPI canvas backing resolution separated from CSS display dimensions
 */
export function computeBackingResolution(
  logicalWidth: number,
  logicalHeight: number,
  dpr: number
) {
  // Clamp DPR between 1.0 and 3.0 for safe memory bounds on high-DPI mobile devices
  const safeDpr = Math.min(Math.max(dpr, 1), 3);
  return {
    canvasWidth: Math.floor(logicalWidth * safeDpr),
    canvasHeight: Math.floor(logicalHeight * safeDpr),
    cssWidth: `${Math.floor(logicalWidth)}px`,
    cssHeight: `${Math.floor(logicalHeight)}px`,
    transform: safeDpr !== 1 ? [safeDpr, 0, 0, safeDpr, 0, 0] : null,
  };
}

/**
 * Clamp scale between safe minimum (40%) and maximum (300%) bounds
 */
export function clampZoom(scale: number, min = 0.4, max = 3.0): number {
  return Math.round(Math.min(Math.max(scale, min), max) * 100) / 100;
}
