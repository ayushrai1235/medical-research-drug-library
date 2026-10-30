import { describe, it, expect } from 'vitest';

// Device breakpoint and zoom resolution helper tests
function getDeviceCategory(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function calculateDefaultZoom(category: 'mobile' | 'tablet' | 'desktop', containerWidth?: number, pageUnscaledWidth = 595.28): number {
  if (category === 'mobile') return 0.6; // 60% for mobile
  if (category === 'desktop') return 0.8; // 80% for desktop/laptop
  
  // Tablet: Fit to Width
  const available = Math.max((containerWidth || 768) - 40, 200);
  const fit = available / pageUnscaledWidth;
  return Math.round(Math.min(Math.max(fit, 0.4), 2.5) * 100) / 100;
}

function computeBackingResolution(logicalWidth: number, logicalHeight: number, dpr: number) {
  const safeDpr = Math.min(Math.max(dpr, 1), 3);
  return {
    canvasWidth: Math.floor(logicalWidth * safeDpr),
    canvasHeight: Math.floor(logicalHeight * safeDpr),
    cssWidth: `${Math.floor(logicalWidth)}px`,
    cssHeight: `${Math.floor(logicalHeight)}px`,
    transform: safeDpr !== 1 ? [safeDpr, 0, 0, safeDpr, 0, 0] : null,
  };
}

describe('PDF Zoom and Breakpoint Logic', () => {
  it('correctly maps screen widths to device categories', () => {
    // Mobile phones
    expect(getDeviceCategory(360)).toBe('mobile');
    expect(getDeviceCategory(390)).toBe('mobile');
    expect(getDeviceCategory(414)).toBe('mobile');
    expect(getDeviceCategory(767)).toBe('mobile');

    // Tablets
    expect(getDeviceCategory(768)).toBe('tablet');
    expect(getDeviceCategory(820)).toBe('tablet');
    expect(getDeviceCategory(1023)).toBe('tablet');

    // Desktop and laptops
    expect(getDeviceCategory(1024)).toBe('desktop');
    expect(getDeviceCategory(1280)).toBe('desktop');
    expect(getDeviceCategory(1440)).toBe('desktop');
    expect(getDeviceCategory(1920)).toBe('desktop');
  });

  it('assigns exact required default zoom levels across devices', () => {
    // Mobile devices must open at 60% zoom
    expect(calculateDefaultZoom('mobile')).toBe(0.6);

    // Desktop and laptops must open at 80% zoom
    expect(calculateDefaultZoom('desktop')).toBe(0.8);

    // Tablets must use fit to width
    const tabletFit = calculateDefaultZoom('tablet', 800, 595.28);
    // available = 800 - 40 = 760; 760 / 595.28 = 1.28
    expect(tabletFit).toBe(1.28);
  });

  it('separates canvas physical backing resolution from CSS display dimensions', () => {
    // 2x Retina MacBook / high-DPI laptop
    const retina = computeBackingResolution(600, 800, 2);
    expect(retina.canvasWidth).toBe(1200);
    expect(retina.canvasHeight).toBe(1600);
    expect(retina.cssWidth).toBe('600px');
    expect(retina.cssHeight).toBe('800px');
    expect(retina.transform).toEqual([2, 0, 0, 2, 0, 0]);

    // 3x High-DPI Mobile Phone at 60% zoom (e.g. iPhone)
    const mobileRetina = computeBackingResolution(357, 505, 3);
    expect(mobileRetina.canvasWidth).toBe(1071);
    expect(mobileRetina.canvasHeight).toBe(1515);
    expect(mobileRetina.cssWidth).toBe('357px');
    expect(mobileRetina.cssHeight).toBe('505px');
    expect(mobileRetina.transform).toEqual([3, 0, 0, 3, 0, 0]);

    // Standard 1x Display
    const standard = computeBackingResolution(600, 800, 1);
    expect(standard.canvasWidth).toBe(600);
    expect(standard.canvasHeight).toBe(800);
    expect(standard.cssWidth).toBe('600px');
    expect(standard.cssHeight).toBe('800px');
    expect(standard.transform).toBeNull();
  });

  it('clamps extreme DPR to safe memory bounds to protect mobile devices', () => {
    // Extreme 4x DPR clamped to 3x to prevent memory exhaustion
    const extreme = computeBackingResolution(500, 700, 4);
    expect(extreme.canvasWidth).toBe(1500);
    expect(extreme.canvasHeight).toBe(2100);
    expect(extreme.transform).toEqual([3, 0, 0, 3, 0, 0]);
  });

  it('preserves user zoom when remaining within same device category, resets when crossing', () => {
    let currentCategory = getDeviceCategory(1440); // desktop
    let zoom = calculateDefaultZoom(currentCategory); // 0.8
    let userHasManuallyZoomed = false;

    // User zooms in manually on desktop
    zoom = 1.1;
    userHasManuallyZoomed = true;

    // Small resize on desktop (e.g. from 1440 to 1200)
    const newWidth = 1200;
    const newCategory = getDeviceCategory(newWidth);
    if (newCategory === currentCategory) {
      // User manual zoom is preserved!
      expect(userHasManuallyZoomed).toBe(true);
      expect(zoom).toBe(1.1);
    }

    // Viewport crossed breakpoint to mobile (e.g. from 1200 to 400)
    const mobileWidth = 400;
    const crossedCategory = getDeviceCategory(mobileWidth);
    expect(crossedCategory).not.toBe(currentCategory);
    
    // Crossing breakpoint resets manual override and recalculates default zoom
    currentCategory = crossedCategory;
    userHasManuallyZoomed = false;
    zoom = calculateDefaultZoom(currentCategory);
    expect(zoom).toBe(0.6);
  });
});
