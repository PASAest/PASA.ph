import { CATEGORIES } from '@/config';
import { FilterDropdown } from './FilterDropdown';
import type { IconName } from './ui';

type Props = {
  value: string | null;
  onChange: (key: string | null) => void;
  /** Items per category for the current search/type filters, shown next to each option. */
  counts?: Record<string, number>;
};

/** Category picker for Assets: one compact button that opens a sheet of categories with icons and counts. */
export function CategoryDropdown({ value, onChange, counts }: Props) {
  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;
  return (
    <FilterDropdown<string | null>
      title="Category"
      value={value}
      allValue={null}
      onChange={onChange}
      options={[
        { value: null, label: 'All categories', icon: 'apps-outline', count: total },
        ...CATEGORIES.map((c) => ({ value: c.key as string | null, label: c.label, icon: `${c.icon}-outline` as IconName, count: counts?.[c.key] ?? 0 })),
      ]}
    />
  );
}
