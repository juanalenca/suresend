import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useTranslation } from "react-i18next"

interface ImportDialogProps {
    onSuccess: () => void
}

export function ImportDialog({ onSuccess }: ImportDialogProps) {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [file, setFile] = useState<File | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('http://localhost:3001/contacts/import', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const error = await response.json()
                alert(error.message || 'Erro na importação')
                return
            }

            const result = await response.json()
            alert(`Importação concluída! ${result.count} contatos importados.`)
            setOpen(false)
            setFile(null)
            onSuccess()
        } catch (error) {
            console.error(error)
            alert('Erro ao conectar com o servidor')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="bg-slate-200 text-slate-900 hover:bg-slate-300 font-semibold border border-slate-400">{t('buttons.import')}</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-slate-200">
                <DialogHeader>
                    <DialogTitle>Importar Contatos</DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Selecione um arquivo CSV com as colunas: email, name, tags.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="csv" className="text-slate-300">Arquivo CSV</Label>
                            <Input
                                id="csv"
                                type="file"
                                accept=".csv"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="bg-slate-950 border-slate-800 text-slate-200 file:text-slate-200 file:bg-slate-800"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !file} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {loading ? 'Importando...' : t('buttons.import')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
