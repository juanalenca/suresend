import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { SchedulePicker } from "@/components/ui/SchedulePicker"
import { useTranslation } from "react-i18next"
import { Sparkles, Save, Send, Clock } from "lucide-react"

export default function NewCampaign() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        subject: "",
        body: "",
        scheduledAt: null as Date | null
    })

    const handleSave = async (sendNow = false, schedule = false) => {
        if (!formData.subject) {
            toast({
                variant: "destructive",
                title: t('campaigns.new.validation_subject_title'),
                description: t('campaigns.new.validation_subject')
            })
            return
        }

        // Validate scheduling
        if (schedule && !formData.scheduledAt) {
            toast({
                variant: "destructive",
                title: t('campaigns.new.validation_subject_title'),
                description: t('campaigns.schedule.past_error')
            })
            return
        }

        setLoading(true)
        try {
            // Build request body
            const requestBody: Record<string, unknown> = {
                name: formData.name,
                subject: formData.subject,
                body: formData.body,
            }

            // Add scheduledAt if scheduling (convert to ISO UTC string)
            if (schedule && formData.scheduledAt) {
                requestBody.scheduledAt = formData.scheduledAt.toISOString()
            }

            // 1. Create Campaign
            const res = await fetch('http://localhost:3000/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            })

            if (!res.ok) throw new Error('Failed to create campaign')

            const campaign = await res.json()

            // 2. Handle different save modes
            if (sendNow) {
                // Immediate send - redirect to live page
                navigate(`/campaigns/${campaign.id}/live`, { state: { autoStart: true } })
                return
            } else if (schedule) {
                // Scheduled - show success and redirect
                toast({
                    title: t('campaigns.success_schedule_title'),
                    description: t('campaigns.success_schedule_desc')
                })
                navigate('/campaigns')
            } else {
                // Draft
                toast({
                    title: t('campaigns.new.success_draft_title'),
                    description: t('campaigns.new.success_draft')
                })
                navigate('/campaigns')
            }
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
        <div className="space-y-8">
            {/* Header melhorado */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-purple-600/10 blur-3xl" />
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-violet-400" />
                        <h1 className="text-4xl font-bold text-white">{t('campaigns.new.title')}</h1>
                    </div>
                    <div className="flex gap-3 flex-wrap">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/campaigns')}
                            disabled={loading}
                        >
                            {t('buttons.cancel')}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => handleSave(false, false)}
                            disabled={loading}
                            className="gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {t('buttons.save_draft')}
                        </Button>
                        {formData.scheduledAt && (
                            <Button
                                onClick={() => handleSave(false, true)}
                                disabled={loading}
                                className="gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                            >
                                <Clock className="w-4 h-4" />
                                {t('buttons.schedule_send')}
                            </Button>
                        )}
                        {!formData.scheduledAt && (
                            <Button
                                onClick={() => handleSave(true, false)}
                                disabled={loading}
                                className="gap-2"
                            >
                                <Send className="w-4 h-4" />
                                {t('buttons.send_now')}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="glass rounded-2xl p-8 border border-slate-800/50 space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-300 text-sm font-semibold">
                        {t('campaigns.new.name_label')}
                    </Label>
                    <Input
                        id="name"
                        placeholder={t('campaigns.new.name_placeholder')}
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="bg-slate-950/50 border-slate-700 text-slate-200 h-12 rounded-xl focus:border-violet-500 focus:ring-violet-500/20"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="subject" className="text-slate-300 text-sm font-semibold">
                        {t('campaigns.new.subject_label')} <span className="text-red-400">*</span>
                    </Label>
                    <Input
                        id="subject"
                        placeholder={t('campaigns.new.subject_placeholder')}
                        value={formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                        className="bg-slate-950/50 border-slate-700 text-slate-200 h-12 rounded-xl focus:border-violet-500 focus:ring-violet-500/20"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-semibold">
                        {t('campaigns.new.content_label')}
                    </Label>
                    <Textarea
                        value={formData.body}
                        onChange={e => setFormData({ ...formData, body: e.target.value })}
                        className="min-h-[300px] bg-slate-950/50 border-slate-700 text-slate-200 font-mono rounded-xl focus:border-violet-500 focus:ring-violet-500/20"
                        placeholder={t('campaigns.new.content_placeholder')}
                    />
                    <p className="text-xs text-slate-500 italic">{t('campaigns.new.visual_editor_note')}</p>
                </div>
            </div>

            {/* Scheduling Section */}
            <div className="glass rounded-2xl p-6 border border-slate-800/50">
                <SchedulePicker
                    value={formData.scheduledAt}
                    onChange={(date) => setFormData({ ...formData, scheduledAt: date })}
                />
            </div>
        </div>
    )
}