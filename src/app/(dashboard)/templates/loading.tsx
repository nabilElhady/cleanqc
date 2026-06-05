import * as React from 'react'

export default function TemplatesLoading() {
  return (
    <div className="space-y-8 relative animate-pulse">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E4E4E7]">
        <div>
          <div className="h-3 w-20 bg-[#E4E4E7] mb-3" />
          <div className="h-9 w-40 bg-[#E4E4E7] mb-2" />
          <div className="h-4 w-[28rem] bg-[#E4E4E7]" />
        </div>
        <div className="h-10 w-40 bg-[#E4E4E7]" />
      </div>

      <div className="space-y-6">
        <div className="h-10 w-full lg:max-w-md bg-[#E4E4E7]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white border border-[#E4E4E7] p-6 h-[180px] flex flex-col justify-between">
              <div>
                <div className="h-6 w-3/4 bg-[#E4E4E7] mb-4" />
                <div className="h-4 w-full bg-[#E4E4E7] mb-2" />
                <div className="h-4 w-5/6 bg-[#E4E4E7]" />
              </div>
              <div className="flex justify-between items-center border-t border-[#E4E4E7] pt-4 mt-6">
                <div className="h-4 w-20 bg-[#E4E4E7]" />
                <div className="h-6 w-24 bg-[#E4E4E7]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
