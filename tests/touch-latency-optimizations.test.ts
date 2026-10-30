import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { viewport } from '../app/layout';

describe('Mobile Touch Latency & Interaction Optimizations', () => {
  it('exports mobile-optimized viewport metadata to prevent 300ms double-tap delay', () => {
    expect(viewport.width).toBe('device-width');
    expect(viewport.initialScale).toBe(1);
    expect(viewport.maximumScale).toBe(5);
    expect(viewport.userScalable).toBe(true);
  });

  it('declares touch-action: manipulation in globals.css for instant mobile taps', () => {
    const cssPath = path.resolve(__dirname, '../app/globals.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    expect(css).toContain('touch-action: manipulation');
    expect(css).toContain('-webkit-tap-highlight-color: transparent');
    expect(css).toContain('.touch-press');
  });

  it('provides loading.tsx instant route transitions across primary researcher user flows', () => {
    const routesWithSkeletons = [
      'app/drugs/[slug]/loading.tsx',
      'app/library/loading.tsx',
      'app/compare/loading.tsx',
    ];

    for (const relPath of routesWithSkeletons) {
      const fullPath = path.resolve(__dirname, '..', relPath);
      expect(fs.existsSync(fullPath), `Missing ${relPath}`).toBe(true);
    }
  });

  it('includes active press feedback and touch-manipulation in critical interactive components', () => {
    const filesToCheck = [
      'components/library/DrugList.tsx',
      'components/library/SelectionBar.tsx',
      'components/pdf/PdfViewer.tsx',
      'components/comparison/ComparisonView.tsx',
      'components/auth/ResearchSignInForm.tsx',
    ];

    for (const relPath of filesToCheck) {
      const fullPath = path.resolve(__dirname, '..', relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content).toContain('touch-manipulation');
      expect(content).toMatch(/active:/);
    }
  });
});
