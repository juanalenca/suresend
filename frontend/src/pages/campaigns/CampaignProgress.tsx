import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, CheckCircle, XCircle, Terminal } from 'lucide-react';

interface Log {
    email: string;
    status: string;
    time: string;
}

interface Stats {
    status: string;
    total: number;
    sent: number;
    failed: number;
    recentLogs: Log[];
}

export default function CampaignProgress() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [stats, setStats] = useState<Stats | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // Polling Logic
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const fetchStats = async () => {
            try {
                const res = await fetch(`http://localhost:3001/campaigns/${id}/stats`);
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

        // Initial fetch
        fetchStats();

        // Interval
        intervalId = setInterval(fetchStats, 2000);

        return () => clearInterval(intervalId);
    }, [id]);

    // Auto-scroll logs
    useEffect(() => {
        if (bottomRef.current) {
            bottomRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [stats?.recentLogs]);

    if (!stats) return <div className="flex h-screen items-center justify-center bg-slate-950 text-white"><Loader2 className="animate-spin" /></div>;

    const progress = stats.total > 0 ? (stats.sent / stats.total) * 100 : 0;

    return (
        <div className="min-h-screen bg-slate-950 p-8 text-slate-100">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Disparando Campanha</h1>
                        <p className="text-slate-400 mt-1">Acompanhe o envio em tempo real.</p>
                    </div>
                    {stats.status === 'COMPLETED' && (
                        <Button onClick={() => navigate('/campaigns')} className="bg-emerald-600 hover:bg-emerald-700">
                            Voltar para Campanhas
                        </Button>
                    )}
                </div>

                {/* Main Progress Card */}
                <Card className="bg-slate-900 border-slate-800">
                    <CardContent className="pt-6">
                        <div className="flex justify-between mb-2 text-sm">
                            <span className="text-slate-400">Progresso</span>
                            <span className="text-white font-mono">{stats.sent} / {stats.total}</span>
                        </div>
                        <Progress value={progress} className="h-4 bg-slate-800" />

                        <div className="mt-4 flex items-center justify-center gap-2">
                            {stats.status === 'PROCESSING' && <span className="text-violet-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</span>}
                            {stats.status === 'COMPLETED' && <span className="text-emerald-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Envio Concluído!</span>}
                            {stats.status === 'FAILED' && <span className="text-red-400 flex items-center gap-2"><XCircle className="w-4 h-4" /> Falha no Envio</span>}
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-400">Total de Contatos</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-white">{stats.total}</div></CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-emerald-400">Enviados com Sucesso</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-white">{stats.sent}</div></CardContent>
                    </Card>
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-400">Falhas</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold text-white">{stats.failed}</div></CardContent>
                    </Card>
                </div>

                {/* Console Logs */}
                <Card className="bg-black border-slate-800 font-mono text-sm shadow-inner shadow-slate-900/50">
                    <CardHeader className="border-b border-slate-800 py-3">
                        <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
                            <Terminal className="w-4 h-4" /> Live Logs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[300px] w-full p-4">
                            <div className="space-y-1">
                                {stats.recentLogs.length === 0 && <span className="text-slate-600 italic">Processo iniciado... aguardando logs.</span>}
                                {stats.recentLogs.map((log, i) => (
                                    <div key={i} className="flex gap-3">
                                        <span className="text-slate-600 shrink-0">[{new Date(log.time).toLocaleTimeString()}]</span>
                                        <span className={log.status === 'SENT' ? 'text-emerald-500' : 'text-red-500'}>
                                            {log.status === 'SENT' ? '✓ SENT' : '⨯ FAIL'}
                                        </span>
                                        <span className="text-slate-300 truncate">{log.email}</span>
                                    </div>
                                ))}
                                {/* Dummy element to scroll to */}
                                <div ref={bottomRef} />
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
