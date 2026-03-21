'use client';

import React from 'react';

type BrandLogoProps = {
  compact?: boolean;
};

export default function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <>
      <div className={`brand-mark ${compact ? 'compact' : ''}`} aria-hidden="true">
        <span className="brand-mark-glyph">V</span>
      </div>
      <div className={`brand-wordmark ${compact ? 'compact' : ''}`}>VedaAI</div>
    </>
  );
}
