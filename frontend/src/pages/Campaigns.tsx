import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useTranslation } from "react-i18next"
import { Send, Eye, Calendar, Sparkles, Plus, Play, Trash2, AlertTriangle, XCircle, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface Campaign {
    id: string
    subject: string
    status: string
    sentCount: number
    openCount: number
    createdAt: string
    scheduledAt?: string | null
}

export function Campaigns() {
    const { t, i18n } = useTranslation()
    const [data, setData] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()
    const { toast } = useToast()
    const [timeFormat, setTimeFormat] = useState<string | null>(() => localStorage.getItem('timeFormat'));

    // Pagination state
    const [pageIndex, setPageIndex] = useState(0)
    const [pageCount, setPageCount] = useState(0)
    const pageSize = 10

    // Listen for time format preference changes
    useEffect(() => {
        const handleTimeFormatChange = () => {
            setTimeFormat(localStorage.getItem('timeFormat'));
        };
        window.addEventListener('timeFormatChanged', handleTimeFormatChange);
        return () => window.removeEventListener('timeFormatChanged', handleTimeFormatChange);
    }, []);

    // Format date/time respecting user preferences
    const formatScheduledDateTime = (dateString: string) => {
        const date = new Date(dateString);
        const locale = i18n.language === 'pt' ? 'pt-BR' : 'en-US';
        const is12Hour = timeFormat ? timeFormat === '12h' : i18n.language === 'en';

        return date.toLocaleString(locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: is12Hour
        });
    };

    // Confirmation states
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isCancelScheduleOpen, setIsCancelScheduleOpen] = useState(false);
    const [campaignToSend, setCampaignToSend] = useState<Campaign | null>(null);
    const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

    const loadCampaigns = useCallback((page: number, silent = false) => {
        if (!silent) setLoading(true)
        fetch(`http://localhost:3000/campaigns?page=${page + 1}&limit=${pageSize}`)
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch')
                return res.json()
            })
            .then(result => {
                setData(result.data)
                setPageCount(result.meta.totalPages)
            })
            .catch(err => {
                console.error('Error loading campaigns:', err)
                setData([])
            })
            .finally(() => setLoading(false))
    }, [pageSize]);

    useEffect(() => {
        loadCampaigns(pageIndex);
    }, [pageIndex, loadCampaigns]);

    // Auto-refresh when there are active campaigns (SCHEDULED, RUNNING, PROCESSING)
    useEffect(() => {
        const hasActiveCampaigns = data.some(c =>
            ['SCHEDULED', 'RUNNING', 'PROCESSING', 'PENDING'].includes(c.status)
        );

        if (!hasActiveCampaigns) return;

        const interval = setInterval(() => {
            loadCampaigns(pageIndex, true); // Silent refresh (no loading spinner)
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [data, loadCampaigns, pageIndex]);

    const handleConfirmSend = () => {
        console.log("🖱️ Tentando enviar...", campaignToSend); // DEBUG

        if (!campaignToSend) {
            console.error("❌ ERRO: campaignToSend está nulo!");
            return;
        }

        const targetId = campaignToSend.id;
        console.log("✅ ID Capturado:", targetId);

        // 1. NAVEGAÇÃO FORCE-PUSH (PRIORIDADE MÁXIMA)
        // Passamos 'autoStart: true' para que a tela de destino saiba que deve chamar a API.
        navigate(`/campaigns/${targetId}/live`, { state: { autoStart: true } });

        // 2. Limpeza e fechamento
        setIsConfirmOpen(false);
        setCampaignToSend(null);
    };

    const handleConfirmDelete = async () => {
        if (!selectedCampaignId) return;
        const id = selectedCampaignId;
        setIsDeleteConfirmOpen(false);
        setSelectedCampaignId(null);

        // --- Optimistic UI Update ---
        setData(prev => prev.filter(c => c.id !== id));

        try {
            const res = await fetch(`http://localhost:3000/campaigns/${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Failed to delete');

            toast({
                title: t('campaigns.success_delete_title'),
                description: t('campaigns.success_delete_desc'),
            });

            loadCampaigns(pageIndex);
        } catch (error) {
            toast({
                variant: "destructive",
                title: t('campaigns.error_delete_title', { defaultValue: "Erro ao excluir" }),
                description: t('campaigns.error_delete_desc', { defaultValue: "Não foi possível excluir a campanha." }),
            });
            loadCampaigns(pageIndex); // Revert state on error
        }
    };

    const getStatusStyles = (status: string) => {
        const styles = {
            COMPLETED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            RUNNING: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            SENDING: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            PROCESSING: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            SCHEDULED: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse',
            DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
            FAILED: 'bg-red-500/10 text-red-500 border-red-500/20'
        };
        return styles[status as keyof typeof styles] || styles.DRAFT;
    };

    // Cancel scheduled campaign
    const handleCancelSchedule = async () => {
        if (!selectedCampaignId) return;
        const id = selectedCampaignId;
        setIsCancelScheduleOpen(false);
        setSelectedCampaignId(null);

        try {
            const res = await fetch(`http://localhost:3000/campaigns/${id}/schedule`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Failed to cancel schedule');

            toast({
                title: t('campaigns.success_cancel_schedule_title', { defaultValue: 'Agendamento cancelado' }),
                description: t('campaigns.success_cancel_schedule_desc', { defaultValue: 'A campanha voltou para rascunho.' }),
            });

            loadCampaigns(pageIndex);
        } catch (error) {
            toast({
                variant: "destructive",
                title: t('campaigns.error_cancel_schedule_title', { defaultValue: 'Erro ao cancelar' }),
                description: t('campaigns.error_cancel_schedule_desc', { defaultValue: 'Não foi possível cancelar o agendamento.' }),
            });
        }
    };

    return (
        <div className="space-y-8">
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-purple-600/10 blur-3xl" />
                <div className="relative flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-violet-400" />
                        <div>
                            <h1 className="text-4xl font-bold text-white">{t('campaigns.title')}</h1>
                            <p className="text-slate-400 mt-1">{t('campaigns.subtitle')}</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => navigate('/campaigns/new')}
                        className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 h-12 px-6 shadow-lg shadow-violet-500/25"
                    >
                        <Plus className="w-5 h-5" />
                        {t('buttons.new_campaign')}
                    </Button>
                </div>
            </div>

            <div className="glass rounded-2xl overflow-hidden border border-slate-800/50">
                <Table>
                    <TableHeader>
                        <TableRow className="border-slate-800/50 hover:bg-slate-800/30">
                            <TableHead className="text-slate-400 font-semibold">{t('campaigns.columns.subject')}</TableHead>
                            <TableHead className="text-slate-400 font-semibold">{t('campaigns.columns.status')}</TableHead>
                            <TableHead className="text-slate-400 font-semibold text-center">{t('campaigns.columns.sent')}</TableHead>
                            <TableHead className="text-slate-400 font-semibold text-center">{t('campaigns.columns.opens')}</TableHead>
                            <TableHead className="text-slate-400 font-semibold">{t('campaigns.columns.created_at')}</TableHead>
                            <TableHead className="text-slate-400 font-semibold text-right">{t('campaigns.columns.actions', { defaultValue: "Ações" })}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="h-8 w-8 border-2 border-violet-500/50 border-t-violet-500 rounded-full animate-spin" />
                                        <span className="text-slate-400">{t('campaigns.loading')}</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Send className="w-12 h-12 text-slate-600" />
                                        <div>
                                            <p className="text-slate-400 text-lg font-medium">{t('campaigns.empty')}</p>
                                            <p className="text-slate-600 text-sm mt-1">{t('campaigns.empty_subtitle')}</p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((campaign) => (
                                <TableRow
                                    key={campaign.id}
                                    className="border-slate-800/50 hover:bg-slate-800/30 transition-colors duration-300 group"
                                >
                                    <TableCell className="text-slate-200 font-medium">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-violet-500 group-hover:scale-150 transition-transform duration-300" />
                                            {campaign.subject}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyles(campaign.status)}`}>
                                                {t(`campaigns.status.${campaign.status}`) || campaign.status}
                                            </div>
                                            {campaign.status === 'SCHEDULED' && campaign.scheduledAt && (
                                                <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatScheduledDateTime(campaign.scheduledAt)}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Send className="w-4 h-4 text-slate-500" />
                                            <span className="text-slate-200 font-semibold">{campaign.sentCount}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Eye className="w-4 h-4 text-emerald-500" />
                                            <span className="text-emerald-400 font-semibold">{campaign.openCount}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-400">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar className="w-4 h-4 text-slate-600" />
                                            {new Date(campaign.createdAt).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {campaign.status === 'DRAFT' && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                                    onClick={() => {
                                                        setCampaignToSend(campaign);
                                                        setIsConfirmOpen(true);
                                                    }}
                                                    title={t('buttons.send', { defaultValue: "Enviar" })}
                                                >
                                                    <Play className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {campaign.status === 'SCHEDULED' && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                                                    onClick={() => {
                                                        setSelectedCampaignId(campaign.id);
                                                        setIsCancelScheduleOpen(true);
                                                    }}
                                                    title={t('campaigns.cancel_schedule', { defaultValue: "Cancelar Agendamento" })}
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                                onClick={() => {
                                                    setSelectedCampaignId(campaign.id);
                                                    setIsDeleteConfirmOpen(true);
                                                }}
                                                title={t('buttons.delete', { defaultValue: "Excluir" })}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {!loading && data.length > 0 && (
                <div className="flex items-center justify-end space-x-2 mt-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPageIndex(prev => prev - 1)}
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
                        onClick={() => setPageIndex(prev => prev + 1)}
                        disabled={pageIndex >= pageCount - 1}
                        className="bg-slate-800 text-white border border-slate-700 hover:bg-slate-700 hover:text-white"
                    >
                        {t('pagination.next')}
                    </Button>
                </div>
            )}

            {/* SEND CONFIRMATION MODAL */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                            <Play className="w-6 h-6 text-emerald-500" />
                        </div>
                        <DialogTitle className="text-center text-xl font-bold">
                            {t('campaigns.confirm_send_title', { defaultValue: "Confirmar Envio" })}
                        </DialogTitle>
                        <DialogDescription className="text-center text-slate-400 py-2">
                            {t('campaigns.confirm_send_desc', { defaultValue: "Deseja realmente iniciar o envio desta campanha?" })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-3 sm:justify-center mt-4">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsConfirmOpen(false)}
                            className="flex-1 hover:bg-slate-800 text-slate-400"
                        >
                            {t('buttons.cancel')}
                        </Button>
                        <Button
                            type="button"
                            onClick={handleConfirmSend}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                            {t('buttons.send', { defaultValue: "Disparar 🚀" })}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMATION MODAL */}
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                        </div>
                        <DialogTitle className="text-center text-xl font-bold">
                            {t('campaigns.confirm_delete_title', { defaultValue: "Confirmar Exclusão" })}
                        </DialogTitle>
                        <DialogDescription className="text-center text-slate-400 py-2">
                            {t('campaigns.confirm_delete_desc', { defaultValue: "Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita." })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-center mt-4">
                        <Button
                            variant="ghost"
                            onClick={() => setIsDeleteConfirmOpen(false)}
                            className="flex-1 hover:bg-slate-800 text-slate-400"
                        >
                            {t('buttons.cancel')}
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

            {/* CANCEL SCHEDULE CONFIRMATION MODAL */}
            <Dialog open={isCancelScheduleOpen} onOpenChange={setIsCancelScheduleOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white">
                    <DialogHeader>
                        <div className="mx-auto w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                            <Clock className="w-6 h-6 text-amber-500" />
                        </div>
                        <DialogTitle className="text-center text-xl font-bold">
                            {t('campaigns.confirm_cancel_schedule_title', { defaultValue: "Cancelar Agendamento" })}
                        </DialogTitle>
                        <DialogDescription className="text-center text-slate-400 py-2">
                            {t('campaigns.confirm_cancel_schedule_desc', { defaultValue: "Deseja cancelar o agendamento? A campanha voltará ao status de rascunho." })}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-center mt-4">
                        <Button
                            variant="ghost"
                            onClick={() => setIsCancelScheduleOpen(false)}
                            className="flex-1 hover:bg-slate-800 text-slate-400"
                        >
                            {t('buttons.cancel')}
                        </Button>
                        <Button
                            onClick={handleCancelSchedule}
                            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                        >
                            {t('campaigns.cancel_schedule', { defaultValue: "Cancelar Agendamento" })}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}