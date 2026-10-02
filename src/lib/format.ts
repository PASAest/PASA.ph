import type { Profile } from './types';

export const peso = (n: number) => `₱${n.toLocaleString('en-PH')}`;

export const fullName = (p?: Pick<Profile, 'first_name' | 'last_name'> | null) =>
  p ? `${p.first_name} ${p.last_name}`.trim() : '';

export const yearLabel = (y: number) => `${y}${['st', 'nd', 'rd'][y - 1] ?? 'th'} Year`;

export { isPlus } from './settings';

export function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

/** New membership end date: `days` after the later of now and the current end date. */
export const extendFrom = (currentEnd: string | null, days: number) =>
  new Date(Math.max(Date.now(), currentEnd ? new Date(currentEnd).getTime() : 0) + days * 86400000).toISOString();

/** ISO timestamp `days` from now. */
export const daysFromNow = (days: number) => new Date(Date.now() + days * 86400000).toISOString();

export const referenceNo = () => `PASA-${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
