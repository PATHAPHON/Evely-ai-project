'use client';

import { useStrings } from '@/app/_lib/strings';
import type { FilterValue } from '../../_lib/topik/types';

interface CategoryFilterProps {
  activeFilter: FilterValue;
  onFilterChange: (filter: FilterValue) => void;
}

/**
 * Renders a row of filter chips ("All", "TOPIK I", "TOPIK II") above the question bank grid.
 * Active chip is highlighted with accent-pink-bg styling.
 * All labels are localized via useStrings().
 */
export default function CategoryFilter({
  activeFilter,
  onFilterChange,
}: CategoryFilterProps) {
  const strings = useStrings();

  const filters: { value: FilterValue; label: string }[] = [
    { value: 'all', label: strings.topik.filterAll },
    { value: 'topik1', label: strings.topik.filterTopik1 },
    { value: 'topik2', label: strings.topik.filterTopik2 },
  ];

  return (
    <div className="flex gap-2">
      {filters.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onFilterChange(filter.value)}
          className={`rounded-xl border-3 px-4 py-1.5 text-sm font-semibold transition-colors ${
            activeFilter === filter.value
              ? 'bg-accent-pink-bg border-border-color text-black dark:text-white'
              : 'border-border-color bg-white dark:bg-[#2d2d44] text-gray-500 dark:text-white/60'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
