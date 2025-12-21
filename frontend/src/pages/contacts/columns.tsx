import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

export type Contact = {
    id: string
    email: string
    name: string | null
    status: string
    tags: string[]
    createdAt: string
}

import { TFunction } from "i18next";

export const getColumns = (t: TFunction, onDelete?: (contact: Contact) => void): ColumnDef<Contact>[] => [
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
    {
        id: "actions",
        header: () => <div className="text-right">{t('contacts.columns.actions', { defaultValue: 'Ações' })}</div>,
        cell: ({ row }) => {
            const contact = row.original
            return (
                <div className="flex justify-end">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        onClick={() => onDelete?.(contact)}
                        title={t('buttons.delete', { defaultValue: 'Excluir' })}
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            )
        },
    },
]

