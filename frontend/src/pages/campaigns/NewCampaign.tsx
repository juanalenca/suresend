import { useState } from "react"
import { useNavigate } from "react-router-dom"
// import ReactQuill from 'react-quill' <--- Comentado para não quebrar
// import 'react-quill/dist/quill.snow.css' <--- Comentado
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea" // <--- Usando componente nativo
import { useToast } from "@/components/ui/use-toast"
import { useTranslation } from "react-i18next"

export default function NewCampaign() { // Mudei para default para facilitar import
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        subject: "",
        body: ""
    })

    const handleSave = async (sendNow = false) => {
        if (!formData.subject) {
            toast({
                variant: "destructive",
                title: t('campaigns.new.validation_subject_title'),
                description: t('campaigns.new.validation_subject')
            })
            return
        }

        setLoading(true)
        try {
            // 1. Create Draft (Real API)
            const res = await fetch('http://localhost:3000/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (!res.ok) throw new Error('Failed to create campaign')

            const campaign = await res.json()

            // 2. Send if requested (Real API)
            if (sendNow) {
                const sendRes = await fetch(`http://localhost:3000/campaigns/${campaign.id}/send`, {
                    method: 'POST'
                })
                if (!sendRes.ok) throw new Error('Failed to send campaign')

                toast({
                    title: t('campaigns.new.success_send_title'),
                    description: t('campaigns.new.success_send_desc')
                })
                navigate(`/campaigns/${campaign.id}/progress`)
                return
            } else {
                toast({
                    title: t('campaigns.new.success_draft_title'),
                    description: t('campaigns.new.success_draft')
                })
            }

            navigate('/campaigns')
        } catch (error) {
            console.error(error)
            toast({
                variant: "destructive",
                title: t('campaigns.new.error_save_title'),
                description: t('campaigns.new.error_save')
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-white">{t('campaigns.new.title')}</h1>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/campaigns')} className="border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-white">
                            {t('buttons.cancel')}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => handleSave(false)}
                            disabled={loading}
                            className="bg-slate-800 text-white hover:bg-slate-700"
                        >
                            {t('buttons.save_draft')}
                        </Button>
                        <Button
                            onClick={() => handleSave(true)}
                            disabled={loading}
                            className="bg-violet-600 hover:bg-violet-700 text-white"
                        >
                            {t('buttons.send_now')}
                        </Button>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-slate-300">{t('campaigns.new.name_label')}</Label>
                        <Input
                            id="name"
                            placeholder={t('campaigns.new.name_placeholder')}
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="bg-slate-950 border-slate-800 text-slate-200"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="subject" className="text-slate-300">{t('campaigns.new.subject_label')}</Label>
                        <Input
                            id="subject"
                            placeholder={t('campaigns.new.subject_placeholder')}
                            value={formData.subject}
                            onChange={e => setFormData({ ...formData, subject: e.target.value })}
                            className="bg-slate-950 border-slate-800 text-slate-200"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-slate-300">{t('campaigns.new.content_label')}</Label>
                        <div className="rounded-md text-slate-900">
                            {/* Substituído Quill por Textarea */}
                            <Textarea
                                value={formData.body}
                                onChange={e => setFormData({ ...formData, body: e.target.value })}
                                className="min-h-[300px] bg-white text-slate-900 font-mono"
                                placeholder={t('campaigns.new.content_placeholder')}
                            />
                        </div>
                        <p className="text-xs text-slate-500">{t('campaigns.new.visual_editor_note')}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}