import { useWindowDimensions } from 'react-native';

/**
 * Responsive sizes shared by every screen, so the app fits phones, tablets and laptops alike.
 * Bars span the screen; content sits in a centered column sized for what it shows.
 */
export const WIDTH = {
  /** Item grids (Assets) and the rows of the top and bottom bars. */
  page: 1200,
  /** Feeds and lists: Home posts, Messages, chat, profiles. */
  feed: 760,
  /** Forms, settings and detail pages. */
  form: 680,
};

/** Style for a centered column up to `max` wide. */
export const centered = (max: number) => ({ width: '100%' as const, maxWidth: max, alignSelf: 'center' as const });

/** Item cards per row: 2 on phones, then 3, 4 and 5 as the screen widens. */
export function useGridColumns() {
  const w = Math.min(useWindowDimensions().width, WIDTH.page);
  return w >= 1100 ? 5 : w >= 860 ? 4 : w >= 600 ? 3 : 2;
}
