import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle, XCircle, Terminal, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Log {
    email: string;
    status: string;
    time: string;
    error?: string;
}

interface Stats {
    status: string;
    total: number;
    sent: number;
    failed: number;
    recentLogs: Log[];
}

export default function CampaignProgress() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [stats, setStats] = useState<Stats | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Polling Logic
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const fetchStats = async () => {
            try {
                const res = await fetch(`http://localhost:3000/campaigns/${id}/stats`);
                if (!res.ok) return;
                const data = await res.json();
                setStats(data);

                // Stop polling if completed
                if (data.status === 'COMPLETED' || data.status === 'FAILED') {
                    clearInterval(intervalId);
                }
            } catch (error) {
                console.error("Error polling stats:", error);
            }
        };

        // Trigger campaign send if passed via navigation state
        const triggerSend = async () => {
            if (location.state?.autoStart) {
                try {
                    await fetch(`http://localhost:3000/campaigns/${id}/send`, { method: 'POST' });
                    // Clear state to avoid re-triggering on refresh
                    navigate(location.pathname, { replace: true, state: {} });
                } catch (error) {
                    console.error("Error triggering campaign send:", error);
                }
            }
        };

        triggerSend();
        fetchStats();

        // Interval
        intervalId = setInterval(fetchStats, 2000);

        return () => clearInterval(intervalId);
    }, [id, location.state, location.pathname, navigate]);

    // Auto-scroll logs
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [stats?.recentLogs]);

    if (!stats) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
                    <p className="text-slate-400">{t('campaigns.loading')}</p>
                </div>
            </div>
        );
    }

    const progress = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0;

    return (
        <div className="space-y-8">
            {/* Header melhorado */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-purple-600/10 blur-3xl" />
                <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-8 h-8 text-violet-400" />
                        <div>
                            <h1 className="text-4xl font-bold text-white">{t('campaigns.progress.title')}</h1>
                            <p className="text-slate-400 mt-1">{t('campaigns.progress.subtitle')}</p>
                        </div>
                    </div>
                    {stats.status === 'COMPLETED' && (
                        <Button
                            onClick={() => navigate('/campaigns')}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                        >
                            {t('buttons.back_to_campaigns')}
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Progress Card */}
            <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-xl">
                <CardContent className="pt-6">
                    <div className="flex justify-between mb-3 text-sm">
                        <span className="text-slate-400 font-medium">{t('campaigns.progress.progress_label')}</span>
                        <span className="text-white font-mono font-bold">{stats.sent} / {stats.total}</span>
                    </div>
                    <Progress value={progress} className="h-4 bg-slate-800" />

                    <div className="mt-6 flex items-center justify-center gap-2">
                        {(stats.status === 'PROCESSING' || stats.status === 'RUNNING') && (
                            <span className="text-violet-400 flex items-center gap-2 text-lg font-semibold">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {t('campaigns.progress.sending')}
                            </span>
                        )}
                        {stats.status === 'COMPLETED' && (
                            <span className="text-emerald-400 flex items-center gap-2 text-lg font-semibold">
                                <CheckCircle className="w-5 h-5" />
                                {t('campaigns.progress.completed')}
                            </span>
                        )}
                        {stats.status === 'FAILED' && (
                            <span className="text-red-400 flex items-center gap-2 text-lg font-semibold">
                                <XCircle className="w-5 h-5" />
                                {t('campaigns.progress.failed')}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-xl hover:-translate-y-1 transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">
                            {t('campaigns.progress.total_contacts')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{stats.total}</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-xl hover:-translate-y-1 transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-400">
                            {t('campaigns.progress.sent_success')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{stats.sent}</div>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900/50 border-slate-800/50 backdrop-blur-xl hover:-translate-y-1 transition-all duration-300">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-400">
                            {t('campaigns.progress.failures')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-white">{stats.failed}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Console Logs */}
            <Card className="bg-black border-slate-800/50 font-mono text-sm shadow-2xl">
                <CardHeader className="border-b border-slate-800 py-3">
                    <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                        <Terminal className="w-4 h-4" /> {t('campaigns.progress.live_logs')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[300px] w-full p-4">
                        <div className="space-y-1">
                            {stats.recentLogs.length === 0 && (
                                <span className="text-slate-600 italic">
                                    {t('campaigns.progress.waiting_logs')}
                                </span>
                            )}
                            {stats.recentLogs.map((log, i) => (
                                <div key={i} className="flex gap-3 text-xs">
                                    <span className="text-slate-600 shrink-0">
                                        [{new Date(log.time).toLocaleTimeString()}]
                                    </span>
                                    <span className={log.status === 'SENT' ? 'text-emerald-500' : 'text-red-500'}>
                                        {log.status === 'SENT' ? '✓ SENT' : `⨯ FAIL ${log.error ? `- ${log.error}` : ''}`}
                                    </span>
                                    <span className="text-slate-300 truncate">{log.email}</span>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}