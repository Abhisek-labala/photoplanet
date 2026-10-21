import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';

export interface DataTablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemName?: string;
  className?: string;
}

export const DataTablePagination: React.FC<DataTablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [5, 10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  itemName = 'entries',
  className
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(validCurrentPage * pageSize, totalItems);

  // Generate page numbers to show (e.g. 1 ... 4, 5, 6 ... 10)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (validCurrentPage > 3) pages.push('...');

      const start = Math.max(2, validCurrentPage - 1);
      const end = Math.min(totalPages - 1, validCurrentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (validCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-3xl p-3.5 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg text-xs mt-4 ${className || ''}`}>
      {/* Left side: Entries per page & Range info */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-slate-400 w-full md:w-auto justify-between md:justify-start">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            style={{ colorScheme: 'dark' }}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-sky-500 cursor-pointer [&>option]:bg-slate-900 [&>option]:text-slate-100"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-slate-900 text-slate-100">
                {opt}
              </option>
            ))}
          </select>
          <span>entries</span>
        </div>

        <span className="text-slate-600 hidden sm:inline">|</span>

        <div className="text-slate-400">
          Showing <span className="font-bold text-white">{startItem}</span> to{' '}
          <span className="font-bold text-white">{endItem}</span> of{' '}
          <span className="font-bold text-white">{totalItems}</span> {itemName}
        </div>
      </div>

      {/* Right side: Page navigation */}
      <div className="flex items-center gap-1.5">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={validCurrentPage === 1}
          className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(validCurrentPage - 1)}
          disabled={validCurrentPage === 1}
          className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 text-slate-600 font-mono select-none">
                  ...
                </span>
              );
            }
            const isCurrent = p === validCurrentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => onPageChange(Number(p))}
                className={`min-w-[36px] h-9 px-2.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${isCurrent
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-400/40'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800/80'
                  }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(validCurrentPage + 1)}
          disabled={validCurrentPage === totalPages}
          className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={validCurrentPage === totalPages}
          className="p-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
