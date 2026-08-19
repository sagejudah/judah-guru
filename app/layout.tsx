import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'judah.guru',
  description: 'judah.guru — still under construction.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <svg className="grain" aria-hidden="true">
          <filter id="noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={0.85}
              numOctaves={2}
              stitchTiles="stitch"
              result="n"
            >
              <animate
                attributeName="seed"
                values="1;3;5;7;2;8;4;1"
                dur="1.2s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feColorMatrix
              in="n"
              type="matrix"
              values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.045 0"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#noise)" />
        </svg>

        {children}
      </body>
    </html>
  );
}
