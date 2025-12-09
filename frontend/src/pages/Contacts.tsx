import { useEffect, useState, useMemo } from "react"
import { Contact, getColumns } from "./contacts/columns"
import { DataTable } from "./contacts/data-table"
import { ContactDialog } from "./contacts/ContactDialog"
import { ImportDialog } from "./contacts/ImportDialog"
import { useTranslation } from "react-i18next"

export function Contacts() {
    const { t } = useTranslation()
    const [data, setData] = useState<Contact[]>([])
    const [loading, setLoading] = useState(true)
    const [pageIndex, setPageIndex] = useState(0)
    const [pageCount, setPageCount] = useState(0)
    const pageSize = 10

    const columns = useMemo(() => getColumns(t), [t])

    const fetchContacts = async (page: number) => {
        setLoading(true)
        try {
            const response = await fetch(`http://localhost:3000/contacts?page=${page + 1}&limit=${pageSize}`)
            const result = await response.json()
            setData(result.data)
            setPageCount(result.meta.totalPages)
        } catch (error) {
            console.error("Failed to fetch contacts", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchContacts(pageIndex)
    }, [pageIndex])

    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{t('contacts.title')}</h1>
                        <p className="text-slate-400">{t('contacts.subtitle')}</p>
                    </div>
                    <div className="flex gap-2">
                        <ImportDialog onSuccess={() => fetchContacts(pageIndex)} />
                        <ContactDialog onSuccess={() => fetchContacts(pageIndex)} />
                    </div>
                </div>

                {loading && data.length === 0 ? (
                    <div className="text-slate-400">{t('contacts.loading')}</div>
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
            </div>
        </div>
    )
}
