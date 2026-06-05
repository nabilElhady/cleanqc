import * as React from 'react'

export default function TeamLoading() {
  return (
    <div className="space-y-8 relative animate-pulse">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E4E4E7]">
        <div>
          <div className="h-3 w-20 bg-[#E4E4E7] mb-3" />
          <div className="h-9 w-56 bg-[#E4E4E7] mb-2" />
          <div className="h-4 w-[28rem] bg-[#E4E4E7]" />
        </div>
        <div className="h-10 w-40 bg-[#E4E4E7]" />
      </div>

      <div className="space-y-6">
        {/* Search */}
        <div className="h-10 w-full lg:max-w-md bg-[#E4E4E7]" />

        {/* Table Skeleton */}
        <div className="bg-white border border-[#E4E4E7] overflow-hidden">
          {/* Table Header */}
          <div className="bg-[#F4F4F5] border-b border-[#E4E4E7] px-6 py-4 flex gap-4">
            <div className="h-4 w-1/4 bg-[#E4E4E7]" />
            <div className="h-4 w-1/4 bg-[#E4E4E7]" />
            <div className="h-4 w-1/4 bg-[#E4E4E7]" />
            <div className="h-4 w-1/4 bg-[#E4E4E7]" />
          </div>
          {/* Table Rows */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-6 py-4 flex gap-4 border-b border-[#E4E4E7] last:border-0 items-center">
              <div className="w-1/4 flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[#E4E4E7]" />
                <div className="h-4 w-24 bg-[#E4E4E7]" />
              </div>
              <div className="w-1/4">
                <div className="h-4 w-32 bg-[#E4E4E7]" />
              </div>
              <div className="w-1/4">
                <div className="h-5 w-16 bg-[#E4E4E7]" />
              </div>
              <div className="w-1/4">
                <div className="h-4 w-20 bg-[#E4E4E7]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
