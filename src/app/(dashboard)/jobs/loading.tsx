import * as React from 'react'

export default function JobsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 pb-6 border-b border-[#E4E4E7]">
        <div>
          <div className="h-3 w-20 bg-[#E4E4E7] mb-3" />
          <div className="h-9 w-48 bg-[#E4E4E7] mb-3" />
          <div className="h-4 w-[28rem] bg-[#E4E4E7]" />
        </div>
        <div className="h-10 w-32 bg-[#E4E4E7]" />
      </div>

      <div className="space-y-6">
        {/* Search & Tabs Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="h-10 w-full lg:max-w-md bg-[#E4E4E7]" />
          <div className="flex items-center gap-1 bg-[#FAFAFA] p-1 border border-[#E4E4E7] w-fit">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-24 bg-[#E4E4E7]" />
            ))}
          </div>
        </div>

        {/* Grid List Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="relative overflow-hidden bg-[#FFFFFF] border border-[#E4E4E7] p-6 flex flex-col justify-between h-[230px]">
              {/* Header: Title & Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="h-6 w-3/4 bg-[#E4E4E7]" />
                <div className="h-5 w-20 bg-[#E4E4E7]" />
              </div>

              {/* Details Block */}
              <div className="space-y-4 mt-6">
                <div className="h-4 w-5/6 bg-[#E4E4E7]" />
                <div className="h-4 w-2/3 bg-[#E4E4E7]" />
                <div className="h-4 w-3/4 bg-[#E4E4E7]" />
              </div>

              {/* Footer: Date & View Button */}
              <div className="flex items-center justify-between gap-3 border-t border-[#E4E4E7] pt-4 mt-6">
                <div className="h-4 w-24 bg-[#E4E4E7]" />
                <div className="h-6 w-20 bg-[#E4E4E7]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
