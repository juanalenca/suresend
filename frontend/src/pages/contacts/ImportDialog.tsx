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
import { Upload, FileSpreadsheet } from "lucide-react"
import { apiUrl } from "@/lib/api"

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
            const response = await fetch(apiUrl('/contacts/import'), {
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
                <Button
                    variant="outline"
                    className="h-12 px-6 gap-2 border-2 border-slate-700 hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400"
                >
                    <Upload className="w-5 h-5" />
                    {t('buttons.import')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass border-slate-800/50 text-slate-200">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                        Importar Contatos
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Selecione um arquivo CSV com as colunas: <span className="text-emerald-400 font-mono">email, name, tags</span>
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-5 py-4">
                        <div className="space-y-3">
                            <Label htmlFor="csv" className="text-slate-300 font-semibold">
                                Arquivo CSV <span className="text-red-400">*</span>
                            </Label>
                            <div className="relative">
                                <Input
                                    id="csv"
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="bg-slate-950/50 border-slate-700 text-slate-200 h-14 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                                />
                            </div>
                            {file && (
                                <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-lg">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span>{file.name}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={loading || !file}
                            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 h-12"
                        >
                            {loading ? 'Importando...' : t('buttons.import')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}