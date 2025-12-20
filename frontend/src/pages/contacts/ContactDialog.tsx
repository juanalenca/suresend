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
import { UserPlus } from "lucide-react"

interface ContactDialogProps {
    onSuccess: () => void
}

export function ContactDialog({ onSuccess }: ContactDialogProps) {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        tags: "",
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch('http://localhost:3000/contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
                }),
            })

            if (!response.ok) {
                const error = await response.json()
                alert(error.message || 'Erro ao criar contato')
                return
            }

            setOpen(false)
            setFormData({ name: "", email: "", tags: "" })
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
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-12 px-6 gap-2 shadow-lg shadow-blue-500/25"
                >
                    <UserPlus className="w-5 h-5" />
                    {t('buttons.new_contact')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] glass border-slate-800/50 text-slate-200">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                        <UserPlus className="w-6 h-6 text-blue-400" />
                        Adicionar Contato
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Adicione um novo contato manualmente à sua lista.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-5 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-300 font-semibold">
                                {t('contacts.columns.name')}
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="bg-slate-950/50 border-slate-700 text-slate-200 h-12 rounded-xl focus:border-blue-500 focus:ring-blue-500/20"
                                placeholder="Ex: João Silva"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300 font-semibold">
                                {t('contacts.columns.email')} <span className="text-red-400">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="bg-slate-950/50 border-slate-700 text-slate-200 h-12 rounded-xl focus:border-blue-500 focus:ring-blue-500/20"
                                placeholder="email@exemplo.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tags" className="text-slate-300 font-semibold">
                                {t('contacts.columns.tags')}
                            </Label>
                            <Input
                                id="tags"
                                placeholder="Ex: newsletter, vip, cliente"
                                value={formData.tags}
                                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                className="bg-slate-950/50 border-slate-700 text-slate-200 h-12 rounded-xl focus:border-blue-500 focus:ring-blue-500/20"
                            />
                            <p className="text-xs text-slate-500">Separe as tags por vírgula</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            type="submit" 
                            disabled={loading} 
                            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 h-12"
                        >
                            {loading ? t('buttons.saving') : t('buttons.save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}