'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Download,
  Calendar,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Clock,
  Layers,
  FileText,
  RefreshCw,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  user_id: string | null;
  display_name_snapshot: string;
  session_id: string | null;
  action: string;
  drug_id: string | null;
  related_drug_ids: string[];
  details: Record<string, any>;
  created_at: string;
  drugs?: {
    id: string;
    name: string;
    slug: string;
    categories?: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

interface ActivityExplorerProps {
  drugsList: Array<{ id: string; name: string; categoryName?: string }>;
}

export function ActivityExplorer({ drugsList }: ActivityExplorerProps) {
  const [events, setEvents] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [action, setAction] = useState<string>('');
  const [drugId, setDrugId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [downloadType, setDownloadType] = useState<string>('');

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', pageSize.toString());

      if (search.trim()) params.set('search', search.trim());
      if (action) params.set('action', action);
      if (drugId) params.set('drugId', drugId);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (downloadType) params.set('downloadType', downloadType);

      const res = await fetch(`/api/admin/activity?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load activity');
      const data = await res.json();

      setEvents(data.events || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, action, drugId, startDate, endDate, downloadType]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Construct Export Excel URL with current filters
  const getExportUrl = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (action) params.set('action', action);
    if (drugId) params.set('drugId', drugId);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (downloadType) params.set('downloadType', downloadType);
    return `/api/admin/export?${params.toString()}`;
  };

  const handleResetFilters = () => {
    setSearch('');
    setAction('');
    setDrugId('');
    setStartDate('');
    setEndDate('');
    setDownloadType('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Filters Bar Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            Filter Activity Records
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition"
            >
              Reset Filters
            </button>

            <a
              href={getExportUrl()}
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md shadow-2xs transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export to Excel
            </a>
          </div>
        </div>

        {/* Filter Input Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* User Search */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Researcher Name</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search researcher..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Action Type</label>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">All Actions</option>
              <option value="session_started">Session Started</option>
              <option value="drug_opened">Drug Opened</option>
              <option value="pdf_viewed">PDF Viewed</option>
              <option value="comparison_opened">Comparison Opened</option>
              <option value="pdf_downloaded">PDF Downloaded</option>
              <option value="zip_downloaded">ZIP Archive Downloaded</option>
              <option value="comparison_pdf_downloaded">Comparison PDF Downloaded</option>
            </select>
          </div>

          {/* Drug Filter */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Related Drug</label>
            <select
              value={drugId}
              onChange={(e) => {
                setDrugId(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
            >
              <option value="">All 19 Drugs</option>
              {drugsList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.categoryName ? `(${d.categoryName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Inputs */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Date Range</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-1/2 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <span className="text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-1/2 px-2 py-1 bg-slate-50 border border-slate-300 rounded text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">
            Total Records: <strong className="text-slate-900">{total}</strong>
          </span>
          <button
            type="button"
            onClick={fetchActivity}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Researcher</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Drug / Publication</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Details / Download Type</th>
                <th className="px-4 py-3">Session / Event ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                    Loading activity records...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No activity logs match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                events.map((ev) => {
                  const drugName = ev.drugs?.name || (ev.details?.drugName) || '—';
                  const categoryName = ev.drugs?.categories?.name || '—';
                  const downloadType = ev.details?.downloadType || '—';

                  // Badge colors for actions
                  const isDownload = ev.action.includes('download');
                  const isView = ev.action.includes('view') || ev.action.includes('opened');

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {new Date(ev.created_at).toLocaleString([], {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>

                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {ev.display_name_snapshot}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isDownload
                              ? 'bg-teal-50 text-teal-800 border border-teal-200'
                              : isView
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {ev.action.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800">
                        {drugName}
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {categoryName}
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {ev.details?.drugNames ? (
                          <span title={ev.details.drugNames.join(', ')}>
                            {ev.details.drugCount} Drugs ZIP ({ev.details.drugNames.slice(0, 2).join(', ')}...)
                          </span>
                        ) : ev.details?.drug1 && ev.details?.drug2 ? (
                          <span>
                            {ev.details.drug1} vs {ev.details.drug2}
                          </span>
                        ) : (
                          <span>{downloadType}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-slate-400 font-mono text-[10px]">
                        <span title={ev.id}>{ev.id.substring(0, 8)}...</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Page <strong className="text-slate-900">{page}</strong> of <strong className="text-slate-900">{totalPages}</strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-medium transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-medium transition"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

