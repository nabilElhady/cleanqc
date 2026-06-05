import * as React from 'react'

export default function DashboardLoading() {
  return (
    <div className="space-y-8 relative animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-[#E4E4E7]">
        <div>
          <div className="h-3 w-16 bg-[#E4E4E7] mb-3" />
          <div className="h-8 w-32 bg-[#E4E4E7] mb-2" />
          <div className="h-4 w-64 bg-[#E4E4E7]" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-32 bg-[#E4E4E7]" />
        </div>
      </div>

      {/* Quick Actions Skeleton */}
      <div>
        <div className="h-3 w-24 bg-[#E4E4E7] mb-4" />
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-32 bg-[#E4E4E7]" />
          <div className="h-10 w-36 bg-[#E4E4E7]" />
          <div className="h-10 w-40 bg-[#E4E4E7]" />
        </div>
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative overflow-hidden bg-white border border-[#E4E4E7] p-6 h-[115px] flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="space-y-3">
                <div className="h-3 w-20 bg-[#E4E4E7]" />
                <div className="h-8 w-12 bg-[#E4E4E7]" />
                <div className="h-2 w-24 bg-[#E4E4E7]" />
              </div>
              <div className="h-11 w-11 bg-[#E4E4E7]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
