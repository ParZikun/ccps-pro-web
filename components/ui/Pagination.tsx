'use client'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages = []
    const showMax = 5
    
    let start = Math.max(1, currentPage - 2)
    let end = Math.min(totalPages, start + showMax - 1)
    
    if (end === totalPages) {
      start = Math.max(1, end - showMax + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-all"
      >
        <ChevronsLeft className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-all"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      
      <div className="flex items-center gap-1 mx-2">
        {getPageNumbers().map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-w-[28px] h-7 text-[10px] font-black rounded-lg border transition-all ${
              currentPage === page 
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
                : 'bg-white/[0.02] border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10'
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-all"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-all"
      >
        <ChevronsRight className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
