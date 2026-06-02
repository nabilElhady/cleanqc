import * as React from 'react'

export function Table({ className = '', ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={`w-full caption-bottom text-sm ${className}`} {...props} />
    </div>
  )
}

export function TableHeader({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`border-b border-[#E4E4E7] bg-[#FAFAFA] ${className}`} {...props} />
}

export function TableBody({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={`divide-y divide-[#E4E4E7] ${className}`} {...props} />
}

export function TableRow({ className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={`border-b border-[#E4E4E7] transition-colors hover:bg-[#FAFAFA] ${className}`}
      {...props}
    />
  )
}

export function TableHead({
  className = '',
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`h-10 px-4 text-left align-middle font-semibold text-[#71717A] uppercase tracking-wider text-[10px] [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  )
}

export function TableCell({
  className = '',
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`p-4 align-middle text-[#09090B] text-xs [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  )
}
