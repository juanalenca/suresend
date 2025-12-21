import { useEffect, useState, useMemo, useCallback } from "react"
import { Contact, getColumns } from "./contacts/columns"
import { DataTable } from "./contacts/data-table"
import { ContactDialog } from "./contacts/ContactDialog"
import { ImportDialog } from "./contacts/ImportDialog"
import { useTranslation } from "react-i18next"
import { Users, Sparkles, UserPlus, Upload, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

export function Contacts() {
    const { t } = useTranslation()
    const { toast } = useToast()
    const [data, setData] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const [pageIndex, setPageIndex] = useState(0)
    const [pageCount, setPageCount] = useState(0)
    const [totalContacts, setTotalContacts] = useState(0)
    const pageSize = 10

    // Delete confirmation state
    const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

    const fetchContacts = useCallback(async (page: number) => {
        setLoading(true)
        try {
            const response = await fetch(`http://localhost:3000/contacts?page=${page + 1}&limit=${pageSize}`)
            const result = await response.json()
            setData(result.data)
            setPageCount(result.meta.totalPages)
            setTotalContacts(result.meta.total)
        } catch (error) {
            console.error("Failed to fetch contacts", error)
        } finally {
            setLoading(false)
        }
    }, [pageSize])

    useEffect(() => {
        fetchContacts(pageIndex)
    }, [pageIndex, fetchContacts])

    // Handler for opening delete modal
    const handleDeleteClick = (contact: Contact) => {
        setContactToDelete(contact)
        setIsDeleteModalOpen(true)
    }

    // Optimistic delete handler
    const handleConfirmDelete = async () => {
        if (!contactToDelete) return

        const contactId = contactToDelete.id

        // 1. Close modal immediately
        setIsDeleteModalOpen(false)
        setContactToDelete(null)

        // 2. Optimistic UI update - remove from list instantly
        setData(prev => prev.filter(c => c.id !== contactId))
        setTotalContacts(prev => prev - 1)

        // 3. Show success toast
        toast({
            title: t('contacts.success_delete_title'),
            description: t('contacts.success_delete_desc'),
        })

        // 4. Call API in background (Fire & Forget with error handling)
        try {
            const res = await fetch(`http://localhost:3000/contacts/${contactId}`, {
                method: 'DELETE'
            })

            if (!res.ok) throw new Error('Failed to delete')

            // Refresh data to sync with server
            fetchContacts(pageIndex)
        } catch (error) {
            // Rollback: show error toast and reload
            toast({
                variant: "destructive",
                title: t('contacts.error_delete_title'),
                description: t('contacts.error_delete_desc'),
            })
            fetchContacts(pageIndex)
        }
    }

    // Columns with delete handler
    const columns = useMemo(() => getColumns(t, handleDeleteClick), [t])

    return (
        <div className="space-y-8">
            {/* Header melhorado */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 blur-3xl" />
                <div className="relative flex flex-col md:flex-row md:justify-between md:items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-50 animate-pulse" />
                            <div className="relative w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <Users className="w-7 h-7 text-white" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-white flex items-center gap-2">
                                {t('contacts.title')}
                                <Sparkles className="w-6 h-6 text-blue-400" />
                            </h1>
                            <p className="text-slate-400 mt-1">{t('contacts.subtitle')}</p>
                        </div>
                    </div>

                    {/* Action buttons com design melhorado */}
                    <div className="flex gap-3">
                        <ImportDialog onSuccess={() => fetchContacts(pageIndex)} />
                        <ContactDialog onSuccess={() => fetchContacts(pageIndex)} />
                    </div>
                </div>
            </div>

            {/* Stats cards */}
            {!loading && data.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass rounded-2xl p-6 border border-slate-800/50 hover:-translate-y-1 transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">{t('contacts.stats.total')}</p>
                                <p className="text-2xl font-bold text-white">{totalContacts}</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass rounded-2xl p-6 border border-slate-800/50 hover:-translate-y-1 transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                                <UserPlus className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">{t('contacts.stats.on_page')}</p>
                                <p className="text-2xl font-bold text-white">{data.length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass rounded-2xl p-6 border border-slate-800/50 hover:-translate-y-1 transition-all duration-300">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Upload className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">{t('contacts.stats.pages')}</p>
                                <p className="text-2xl font-bold text-white">{pageCount}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            {loading && data.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center border border-slate-800/50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-12 w-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-slate-400 text-lg">{t('contacts.loading')}</p>
                    </div>
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={data}
                    pageCount={pageCount}
                    pageIndex={pageIndex}
                    pageSize={pageSize}
                    onPageChange={setPageIndex}
                />
            )}

            {/* DELETE CONFIRMATION MODAL */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                        <DialogTitle className="text-center text-xl font-bold">
                            {t('contacts.confirm_delete_title')}
                        </DialogTitle>
                        <DialogDescription className="text-center text-slate-400 py-2">
                            {t('contacts.confirm_delete_desc')}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-center mt-4">
                        <Button
                            variant="ghost"
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="flex-1 hover:bg-slate-800 text-slate-400"
                        >
                            {t('buttons.cancel', { defaultValue: 'Cancelar' })}
                        </Button>
                        <Button
                            onClick={handleConfirmDelete}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                        >
                            {t('buttons.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}