import React from 'react';
import { C, sevColor, sevBg } from '../theme.js';

// ─── tiny icon (inline SVG paths) ─────────────────────────────────────────────
export function Ico({ d, size = 13, col = 'currentColor', style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={col}
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...(style || {}) }}
    >
      <path d={d} />
    </svg>
  );
}

// ─── tag chip ─────────────────────────────────────────────────────────────────
export function Tag({ sev, children, small }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: small ? '0px 5px' : '1px 6px',
        fontSize: small ? 10 : 10.5,
        fontFamily: C.mono,
        fontWeight: 500,
        color: sevColor(sev),
        background: sevBg(sev),
        border: `1px solid ${
          sev === 'high' ? '#4a2020' : sev === 'med' ? '#3d2a10' : '#282828'
        }`,
        borderRadius: 3,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export function SevDot({ sev }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: sevColor(sev),
        flexShrink: 0,
      }}
    />
  );
}
