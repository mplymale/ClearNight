export type VerdictKey = 'excellent' | 'good' | 'fair' | 'poor';

export interface Verdict {
  label: string;
  word: string;
  accent: string;
  accentSoft: string;
  stars: number;
  sky: [string, string, string];
  glow: string;
  chip: string;
}

export const VERDICTS: Record<VerdictKey, Verdict> = {
  excellent: {
    label: 'Excellent',
    word: 'Pristine',
    accent: '#8fd0ff',
    accentSoft: 'rgba(143,208,255,0.16)',
    stars: 1.0,
    sky: ['#05060f', '#0a1226', '#122039'],
    glow: 'rgba(90,150,240,0.28)',
    chip: '#8fd0ff',
  },
  good: {
    label: 'Good',
    word: 'Great',
    accent: '#7ef0d2',
    accentSoft: 'rgba(126,240,210,0.16)',
    stars: 0.85,
    sky: ['#04060e', '#06121f', '#0a2230'],
    glow: 'rgba(60,200,180,0.30)',
    chip: '#7ef0d2',
  },
  fair: {
    label: 'Fair',
    word: 'Workable',
    accent: '#ffce8f',
    accentSoft: 'rgba(255,206,143,0.15)',
    stars: 0.45,
    sky: ['#140f1f', '#2a1d33', '#412a37'],
    glow: 'rgba(230,150,90,0.26)',
    chip: '#ffc27a',
  },
  poor: {
    label: 'Poor',
    word: 'Washed out',
    accent: '#c4ccd6',
    accentSoft: 'rgba(196,204,214,0.14)',
    stars: 0.12,
    sky: ['#283039', '#39434f', '#4d5864'],
    glow: 'rgba(190,205,220,0.30)',
    chip: '#aab4c0',
  },
};

export function verdictFromScore(s: number): VerdictKey {
  if (s >= 78) return 'excellent';
  if (s >= 62) return 'good';
  if (s >= 42) return 'fair';
  return 'poor';
}
