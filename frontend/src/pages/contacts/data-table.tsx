import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
} from "@tanstack/react-table"
import { useTranslation } from "react-i18next"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    pageCount: number
    pageIndex: number
    pageSize: number
    onPageChange: (page: number) => void
}

export function DataTable<TData, TValue>({
    columns,
    data,
    pageCount,
    pageIndex,
    pageSize,
    onPageChange,
}: DataTableProps<TData, TValue>) {
    const { t } = useTranslation()
    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        pageCount: pageCount,
        state: {
            pagination: {
                pageIndex,
                pageSize,
            },
        },
    })

    return (
        <div>
            <div className="rounded-md border border-slate-800">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-slate-800 hover:bg-slate-900/50">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id} className="text-slate-400">
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="border-slate-800 hover:bg-slate-900/50"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="text-slate-200">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center text-slate-400">
                                    {t('campaigns.empty')}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pageIndex - 1)}
                    disabled={pageIndex === 0}
                    className="bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 hover:text-white"
                >
                    {t('pagination.previous')}
                </Button>
                <div className="text-sm text-slate-400">
                    {t('pagination.page_of', { current: pageIndex + 1, total: pageCount || 1 })}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(pageIndex + 1)}
                    disabled={pageIndex >= pageCount - 1}
                    className="bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 hover:text-white"
                >
                    {t('pagination.next')}
                </Button>
            </div>
        </div>
    )
}
