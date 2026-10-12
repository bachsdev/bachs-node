import { staticFile } from 'remotion';

// Bachs brand (landing + dashboard) and the SnapKit demo storefront palette.
export const bachs = {
  indigo: '#5266eb',
  indigoSoft: '#6366f1',
  ink: '#111111',
  muted: '#62647b',
  paper: '#fbfcfd',
  panel: '#f4f5f9',
  line: 'rgba(17,17,17,0.08)',
};

export const snap = {
  paper: '#f2f1ec',
  ink: '#141412',
  muted: '#55544f',
  card: '#ffffff',
  line: 'rgba(20,20,18,0.10)',
  accent: '#d24d38',
  codeBg: '#141412',
  codeGreen: '#8fd19e',
};

export const fonts = {
  sans: "'Geist', 'Inter', system-ui, sans-serif",
  mono: "'Geist Mono', ui-monospace, monospace",
  pixel: "'Geist Pixel', 'Geist Mono', monospace",
};

export const fontFaceCss = `
@font-face { font-family: 'Geist'; src: url('${staticFile('fonts/Geist-Variable.woff2')}') format('woff2'); font-weight: 100 900; }
@font-face { font-family: 'Geist Mono'; src: url('${staticFile('fonts/GeistMono-Variable.woff2')}') format('woff2'); font-weight: 100 900; }
@font-face { font-family: 'Geist Pixel'; src: url('${staticFile('fonts/GeistPixel-Square.woff2')}') format('woff2'); }
`;
