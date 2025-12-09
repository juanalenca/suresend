import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"

export type Contact = {
    id: string
    email: string
    name: string | null
    status: string
    tags: string[]
    createdAt: string
}

import { TFunction } from "i18next";

export const getColumns = (t: TFunction): ColumnDef<Contact>[] => [
    {
        accessorKey: "name",
        header: t('contacts.columns.name'),
        cell: ({ row }) => row.getValue("name") || "-",
    },
    {
        accessorKey: "email",
        header: t('contacts.columns.email'),
    },
    {
        accessorKey: "tags",
        header: t('contacts.columns.tags'),
        cell: ({ row }) => {
            const tags = row.getValue("tags") as string[]
            return (
                <div className="flex gap-1 flex-wrap">
                    {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                        </Badge>
                    ))}
                </div>
            )
        },
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
            const status = row.getValue("status") as string
            return (
                <Badge variant={status === 'SUBSCRIBED' ? 'default' : 'destructive'}>
                    {status}
                </Badge>
            )
        },
    },
]
