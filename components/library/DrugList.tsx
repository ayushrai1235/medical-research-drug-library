'use client';

import React, { useState, useMemo, useCallback, useTransition, useDeferredValue } from 'react';
import Link from 'next/link';
import {
  Search,
  FileText,
  Download,
  CheckSquare,
  Square,
  CheckCircle,
  AlertCircle,
  Filter,
} from 'lucide-react';
import { SelectionBar } from '@/components/library/SelectionBar';

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  drugs: DrugData[];
}

export interface DrugData {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  pdf_storage_path: string | null;
  pdf_status: string;
  is_active: boolean;
  sort_order: number;
}

interface DrugListProps {
  categories: CategoryData[];
}

// Memoized DrugRow to avoid re-rendering all 19 cards on single-item selection changes
const DrugRow = React.memo(function DrugRow({
  drug,
  categoryName,
  isSelected,
  onToggle,
}: {
  drug: DrugData;
  categoryName: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  const isAvailable = drug.pdf_status === 'uploaded';

  return (
    <div
      className={`px-4 sm:px-5 py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
        isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'
      }`}
    >
      {/* Checkbox and Drug Name */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => onToggle(drug.id)}
          aria-label={`Select ${drug.name}`}
          className="p-1.5 -m-1 text-slate-400 hover:text-blue-600 active:scale-90 transition-transform shrink-0 touch-manipulation cursor-pointer"
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-blue-600" />
          ) : (
            <Square className="w-5 h-5 text-slate-300 hover:text-slate-400" />
          )}
        </button>

        <div className="flex flex-col min-w-0">
          <Link
            href={`/drugs/${drug.slug}`}
            className="text-sm font-semibold text-slate-900 hover:text-blue-700 active:text-blue-900 transition flex items-center gap-2 truncate touch-manipulation"
          >
            {drug.name}
          </Link>
          <span className="text-[11px] text-slate-400 truncate">
            {categoryName} • Deterministic Storage: {drug.pdf_storage_path || 'Pending upload'}
          </span>
        </div>
      </div>

      {/* Status and Action Buttons */}
      <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
            isAvailable
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }`}
        >
          {isAvailable ? (
            <>
              <CheckCircle className="w-3 h-3 text-emerald-600" />
              PDF Available
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-amber-600" />
              Unavailable
            </>
          )}
        </span>

        {/* View Action */}
        <Link
          href={`/drugs/${drug.slug}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 active:scale-[0.97] rounded-lg transition-all duration-75 touch-manipulation shrink-0"
        >
          <FileText className="w-3.5 h-3.5" />
          View PDF
        </Link>

        {/* Direct Download Action */}
        {isAvailable && (
          <a
            href={`/api/download/individual?drugId=${drug.id}`}
            download
            aria-label={`Download ${drug.name} PDF`}
            title={`Download ${drug.name} PDF`}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-90 active:bg-slate-200 rounded-lg transition-transform duration-75 touch-manipulation shrink-0"
          >
            <Download className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
});

export function DrugList({ categories }: DrugListProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDrugIds, setSelectedDrugIds] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  // Defer search filter computation so keystrokes remain instantaneous on mobile CPUs
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Filtered categories and drugs
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        // Category filter
        if (selectedCategory !== 'all' && cat.slug !== selectedCategory) {
          return null;
        }

        // Search query filter (using deferred value)
        const query = deferredSearchQuery.trim().toLowerCase();
        const matchingDrugs = cat.drugs.filter((d) => {
          if (!query) return true;
          return (
            d.name.toLowerCase().includes(query) ||
            cat.name.toLowerCase().includes(query)
          );
        });

        if (matchingDrugs.length === 0) return null;

        return {
          ...cat,
          drugs: matchingDrugs,
        };
      })
      .filter(Boolean) as CategoryData[];
  }, [categories, selectedCategory, deferredSearchQuery]);

  const totalVisibleDrugs = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => acc + cat.drugs.length, 0);
  }, [filteredCategories]);

  // Stable toggle handler for memoized rows
  const toggleSelectDrug = useCallback((id: string) => {
    setSelectedDrugIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleCategoryChange = useCallback((slug: string) => {
    startTransition(() => {
      setSelectedCategory(slug);
    });
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    const visibleIds = filteredCategories.flatMap((c) => c.drugs.map((d) => d.id));
    const allSelected = visibleIds.every((id) => selectedDrugIds.includes(id));
    if (allSelected) {
      setSelectedDrugIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedDrugIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  }, [filteredCategories, selectedDrugIds]);

  return (
    <div className="space-y-6">
      {/* Search and Category Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by drug name or category..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 active:scale-90 text-xs font-semibold p-1 touch-manipulation"
              >
                Clear
              </button>
            )}
          </div>

          {/* Result Count and Bulk Select */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end text-xs text-slate-600">
            <span>
              Showing <strong className="text-slate-900">{totalVisibleDrugs}</strong> of 19 drugs
            </span>
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="text-blue-700 hover:text-blue-800 active:scale-95 font-semibold text-xs transition-transform touch-manipulation"
            >
              Select / Deselect Visible
            </button>
          </div>
        </div>

        {/* Responsive Category Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <span className="text-slate-400 flex items-center gap-1 shrink-0 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            Categories:
          </span>
          <button
            type="button"
            onClick={() => handleCategoryChange('all')}
            className={`px-3 py-1.5 rounded-full font-medium shrink-0 active:scale-95 transition-all duration-75 touch-manipulation ${
              selectedCategory === 'all'
                ? 'bg-blue-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All (7 Categories)
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryChange(cat.slug)}
              className={`px-3 py-1.5 rounded-full font-medium shrink-0 active:scale-95 transition-all duration-75 touch-manipulation ${
                selectedCategory === cat.slug
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name} ({cat.drugs.length})
            </button>
          ))}
        </div>
      </div>

      {/* Categories and Drugs List */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl p-8">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 mb-1">No matching documents found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search query or select &quot;All Categories&quot; to see all 19 approved drug documents.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((cat) => (
            <section key={cat.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              {/* Category Header */}
              <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                    {cat.name}
                  </h3>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                  {cat.drugs.length} {cat.drugs.length === 1 ? 'drug' : 'drugs'}
                </span>
              </div>

              {/* Drug Rows */}
              <div className="divide-y divide-slate-100">
                {cat.drugs.map((drug) => (
                  <DrugRow
                    key={drug.id}
                    drug={drug}
                    categoryName={cat.name}
                    isSelected={selectedDrugIds.includes(drug.id)}
                    onToggle={toggleSelectDrug}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Floating Bottom Selection Toolbar */}
      <SelectionBar
        selectedDrugIds={selectedDrugIds}
        onClearSelection={() => setSelectedDrugIds([])}
      />
    </div>
  );
}
