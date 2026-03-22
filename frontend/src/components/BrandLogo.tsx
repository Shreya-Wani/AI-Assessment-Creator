'use client';

import React from 'react';
import Image from 'next/image';

type BrandLogoProps = {
  compact?: boolean;
};

export default function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className={`brand-logo ${compact ? 'compact' : ''}`}>
      <span className={`brand-logo-mark ${compact ? 'compact' : ''}`}>
        <Image src="/logo.png" alt="VedaAI logo" className="brand-logo-image" fill sizes="42px" />
      </span>
      <div className={`brand-wordmark ${compact ? 'compact' : ''}`}>
        VedaAI
      </div>
      </div>
  );
}
