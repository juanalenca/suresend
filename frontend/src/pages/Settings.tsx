import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";

export function Settings() {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [timeFormat, setTimeFormat] = useState<string | null>(() => localStorage.getItem('timeFormat'));
    const [formData, setFormData] = useState({
        host: '',
        port: '',
        user: '',
        pass: '',
        fromEmail: '',
        emailDelay: '1000'
    });

    // Warmup state
    const [warmup, setWarmup] = useState({
        enabled: false,
        startDate: null as string | null,
        timezone: 'America/Sao_Paulo',
        currentPhase: 1,
        dailyLimit: 50 as number | null,
        sentToday: 0,
        autoResume: false,
        daysSinceStart: 0
    });

    useEffect(() => {
        // Fetch current settings
        fetch('http://localhost:3000/settings')
            .then(res => res.json())
            .then(data => {
                setFormData({
                    host: data.host,
                    port: data.port,
                    user: data.user,
                    pass: '', // Don't show password
                    fromEmail: data.fromEmail,
                    emailDelay: data.emailDelay || '1000'
                });
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                toast({
                    title: t('settings.error_title'),
                    description: t('settings.error_desc'),
                    variant: "destructive"
                });
                setLoading(false);
            });

        // Fetch warmup config
        fetch('http://localhost:3000/warmup')
            .then(res => res.json())
            .then(data => {
                setWarmup({
                    enabled: data.enabled,
                    startDate: data.startDate,
                    timezone: data.timezone || 'America/Sao_Paulo',
                    currentPhase: data.currentPhase,
                    dailyLimit: data.dailyLimit,
                    sentToday: data.sentToday,
                    autoResume: data.autoResume,
                    daysSinceStart: data.daysSinceStart || 0
                });
            })
            .catch(err => console.error('Error fetching warmup:', err));
    }, [t]);

    // Ref for warmup card
    const warmupCardRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

    // Auto-scroll to warmup section if hash is present
    useEffect(() => {
        if (location.hash === '#warmup' && warmupCardRef.current) {
            setTimeout(() => {
                warmupCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }, [location.hash, loading]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch('http://localhost:3000/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Failed to save');

            toast({
                title: t('settings.success_title'),
                description: t('settings.success_desc'),
                variant: "default"
            });
        } catch (error) {
            toast({
                title: t('settings.error_title'),
                description: t('settings.error_desc'),
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    // Warmup handlers
    const handleWarmupStart = async () => {
        try {
            const res = await fetch('http://localhost:3000/warmup/start', { method: 'POST' });
            const data = await res.json();
            setWarmup(prev => ({ ...prev, ...data, daysSinceStart: 0 }));
            toast({ title: '🔥 Warmup iniciado!', description: 'Seu domínio começou a aquecer.' });
        } catch (err) {
            toast({ title: 'Erro', description: 'Não foi possível iniciar o warmup.', variant: 'destructive' });
        }
    };

    const handleWarmupStop = async () => {
        try {
            const res = await fetch('http://localhost:3000/warmup/stop', { method: 'POST' });
            const data = await res.json();
            setWarmup(prev => ({ ...prev, ...data }));
            toast({ title: '⏸️ Warmup pausado', description: 'O warmup foi pausado.' });
        } catch (err) {
            toast({ title: 'Erro', description: 'Não foi possível pausar o warmup.', variant: 'destructive' });
        }
    };

    const handleWarmupReset = async () => {
        try {
            const res = await fetch('http://localhost:3000/warmup/reset', { method: 'POST' });
            const data = await res.json();
            setWarmup(prev => ({ ...prev, ...data, daysSinceStart: 0 }));
            toast({ title: '🔄 Warmup resetado', description: 'O warmup foi reiniciado do zero.' });
        } catch (err) {
            toast({ title: 'Erro', description: 'Não foi possível resetar o warmup.', variant: 'destructive' });
        }
    };

    const handleWarmupUpdate = async (field: string, value: string | boolean) => {
        try {
            const res = await fetch('http://localhost:3000/warmup', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: value })
            });
            const data = await res.json();
            setWarmup(prev => ({ ...prev, ...data }));
        } catch (err) {
            console.error('Error updating warmup:', err);
        }
    };

    // Format reset time respecting user preference
    const formatResetTime = () => {
        const format = localStorage.getItem('timeFormat');
        const is12Hour = format ? format === '12h' : i18n.language === 'en';
        return is12Hour ? '12:00 AM' : '00:00';
    };

    if (loading) return <div className="p-8 text-white">{t('settings.loading')}</div>;

    return (
        <div>
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-white">{t('settings.title')}</h1>

                {/* Preferences Card */}
                <Card className="bg-slate-900/50 border-slate-800 text-slate-200">
                    <CardHeader>
                        <CardTitle>{t('settings.preferences')}</CardTitle>
                        <CardDescription>{t('settings.preferences_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Language Selector */}
                        <div className="space-y-2">
                            <Label>{t('settings.language')}</Label>
                            <Select
                                value={i18n.language?.split('-')[0] || 'pt'}
                                onValueChange={(val) => i18n.changeLanguage(val)}
                            >
                                <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-slate-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                    <SelectItem value="pt">🇧🇷 Português (Brasil)</SelectItem>
                                    <SelectItem value="en">🇺🇸 English</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Time Format Selector */}
                        <div className="space-y-2">
                            <Label>{t('settings.time_format')}</Label>
                            <p className="text-xs text-slate-500 mb-2">{t('settings.time_format_hint')}</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTimeFormat('24h');
                                        localStorage.setItem('timeFormat', '24h');
                                        window.dispatchEvent(new Event('timeFormatChanged'));
                                        toast({
                                            title: t('settings.success_title'),
                                            description: t('settings.time_format_updated'),
                                        });
                                    }}
                                    className={`
                                        flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200
                                        flex flex-col items-center gap-1
                                        ${timeFormat === '24h' || (!timeFormat && i18n.language === 'pt')
                                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                                            : 'border-slate-700 bg-slate-950/50 text-slate-400 hover:border-slate-600'
                                        }
                                    `}
                                >
                                    <span className="text-2xl font-mono font-bold">14:30</span>
                                    <span className="text-xs">{t('settings.format_24h')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTimeFormat('12h');
                                        localStorage.setItem('timeFormat', '12h');
                                        window.dispatchEvent(new Event('timeFormatChanged'));
                                        toast({
                                            title: t('settings.success_title'),
                                            description: t('settings.time_format_updated'),
                                        });
                                    }}
                                    className={`
                                        flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200
                                        flex flex-col items-center gap-1
                                        ${timeFormat === '12h' || (!timeFormat && i18n.language === 'en')
                                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                                            : 'border-slate-700 bg-slate-950/50 text-slate-400 hover:border-slate-600'
                                        }
                                    `}
                                >
                                    <span className="text-2xl font-mono font-bold">2:30 PM</span>
                                    <span className="text-xs">{t('settings.format_12h')}</span>
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* SMTP Settings Card */}
                <Card className="bg-slate-900/50 border-slate-800 text-slate-200">
                    <CardHeader>
                        <CardTitle>{t('settings.smtp_title')}</CardTitle>
                        <CardDescription>{t('settings.smtp_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="host">{t('settings.host')}</Label>
                                <Input
                                    id="host"
                                    name="host"
                                    placeholder="smtp.example.com"
                                    value={formData.host}
                                    onChange={handleChange}
                                    className="bg-slate-950 border-slate-800 text-slate-200"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="port">{t('settings.port')}</Label>
                                    <Input
                                        id="port"
                                        name="port"
                                        placeholder="587"
                                        value={formData.port}
                                        onChange={handleChange}
                                        className="bg-slate-950 border-slate-800 text-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="user">{t('settings.user')}</Label>
                                    <Input
                                        id="user"
                                        name="user"
                                        placeholder="user@example.com"
                                        value={formData.user}
                                        onChange={handleChange}
                                        className="bg-slate-950 border-slate-800 text-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="pass">{t('settings.pass')}</Label>
                                <Input
                                    id="pass"
                                    name="pass"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.pass}
                                    onChange={handleChange}
                                    className="bg-slate-950 border-slate-800 text-slate-200"
                                />
                                <p className="text-xs text-slate-500">{t('settings.pass_hint')}</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fromEmail">{t('settings.from_email')}</Label>
                                <Input
                                    id="fromEmail"
                                    name="fromEmail"
                                    placeholder="Company <sender@example.com>"
                                    value={formData.fromEmail}
                                    onChange={handleChange}
                                    className="bg-slate-950 border-slate-800 text-slate-200"
                                />
                                <p className="text-xs text-slate-500">{t('settings.from_email_hint')}</p>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-slate-800">
                                <Label htmlFor="emailDelay">Delay entre envios (ms)</Label>
                                {(() => {
                                    const delay = parseInt(formData.emailDelay) || 0;
                                    const isTooLow = delay < 100;
                                    const isTooHigh = delay > 60000;
                                    const isInvalid = isTooLow || isTooHigh;

                                    return (
                                        <>
                                            <Input
                                                id="emailDelay"
                                                name="emailDelay"
                                                type="number"
                                                min={100}
                                                max={60000}
                                                placeholder="1000"
                                                value={formData.emailDelay}
                                                onChange={(e) => {
                                                    // Prevent negative numbers via code as requested
                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                    setFormData(prev => ({ ...prev, emailDelay: String(val) }));
                                                }}
                                                className={`bg-slate-950 border-slate-800 text-slate-200 ${isInvalid ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                            />
                                            {isInvalid ? (
                                                <p className="text-xs text-red-500 mt-1">
                                                    {isTooLow ? "Valor muito baixo. Mínimo recomendado: 100ms." : "Valor muito alto. Máximo permitido: 60000ms (1 minuto)."}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-500">Tempo de espera entre cada e-mail (em milissegundos).</p>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>


                            <Button type="submit" disabled={saving || parseInt(formData.emailDelay) < 100 || parseInt(formData.emailDelay) > 60000} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-4">
                                {saving ? t('buttons.saving') : t('buttons.save_settings')}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Warmup Card */}
                <Card ref={warmupCardRef} id="warmup" className="bg-slate-900/50 border-slate-800 text-slate-200 scroll-mt-4">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Flame className="w-6 h-6 text-orange-500" />
                            <div>
                                <CardTitle>{t('warmup.title')}</CardTitle>
                                <CardDescription>{t('warmup.description')}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Warning Alert */}
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                            <div className="flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-amber-200">
                                    <strong>{t('warmup.warning_title')}</strong>
                                    <p className="mt-1 text-amber-200/80">{t('warmup.warning_desc')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Toggle + Status */}
                        <div className="flex items-center justify-between">
                            <Label>{t('warmup.enabled')}</Label>
                            <Switch
                                checked={warmup.enabled}
                                onCheckedChange={(checked: boolean) => {
                                    if (checked) {
                                        handleWarmupStart();
                                    } else {
                                        handleWarmupStop();
                                    }
                                }}
                            />
                        </div>

                        {warmup.enabled && (
                            <>
                                {/* Progress: Fase X de 5 */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>{t('warmup.phase', { current: warmup.currentPhase })}</span>
                                        {warmup.dailyLimit === null ? (
                                            <span className="text-emerald-400 font-semibold">
                                                {t('warmup.unlimited')} 🔥
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">
                                                {warmup.sentToday} / {warmup.dailyLimit}
                                            </span>
                                        )}
                                    </div>
                                    {warmup.dailyLimit !== null && (() => {
                                        const percentage = Math.min((warmup.sentToday / warmup.dailyLimit) * 100, 100);
                                        const isLimitReached = warmup.sentToday >= warmup.dailyLimit;

                                        // Dynamic colors by phase
                                        const phaseColors: Record<number, { gradient: string; shadow: string; glow: string }> = {
                                            1: {
                                                gradient: 'linear-gradient(90deg, #f97316 0%, #fb923c 50%, #fdba74 100%)',
                                                shadow: '0 0 20px rgba(249, 115, 22, 0.5)',
                                                glow: 'from-orange-600/20 via-orange-500/10 to-amber-500/20'
                                            },
                                            2: {
                                                gradient: 'linear-gradient(90deg, #eab308 0%, #facc15 50%, #fde047 100%)',
                                                shadow: '0 0 20px rgba(234, 179, 8, 0.5)',
                                                glow: 'from-yellow-600/20 via-yellow-500/10 to-amber-400/20'
                                            },
                                            3: {
                                                gradient: 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #6ee7b7 100%)',
                                                shadow: '0 0 20px rgba(16, 185, 129, 0.5)',
                                                glow: 'from-emerald-600/20 via-emerald-500/10 to-teal-500/20'
                                            },
                                            4: {
                                                gradient: 'linear-gradient(90deg, #6366f1 0%, #818cf8 50%, #a5b4fc 100%)',
                                                shadow: '0 0 20px rgba(99, 102, 241, 0.5)',
                                                glow: 'from-indigo-600/20 via-indigo-500/10 to-purple-500/20'
                                            }
                                        };

                                        const limitReachedColors = {
                                            gradient: 'linear-gradient(90deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
                                            shadow: '0 0 25px rgba(220, 38, 38, 0.6)',
                                            glow: 'from-red-600/30 via-red-500/20 to-orange-500/20'
                                        };

                                        const defaultColors = {
                                            gradient: 'linear-gradient(90deg, #f97316 0%, #fb923c 50%, #fdba74 100%)',
                                            shadow: '0 0 20px rgba(249, 115, 22, 0.5)',
                                            glow: 'from-orange-600/20 via-orange-500/10 to-amber-500/20'
                                        };

                                        const colors = isLimitReached
                                            ? limitReachedColors
                                            : (phaseColors[warmup.currentPhase] || defaultColors);

                                        return (
                                            <div
                                                className="relative h-4 w-full overflow-hidden rounded-full bg-slate-800/40 border border-slate-700/50 shadow-inner"
                                                role="progressbar"
                                                aria-valuenow={warmup.sentToday}
                                                aria-valuemin={0}
                                                aria-valuemax={warmup.dailyLimit}
                                                aria-label={t('warmup.progress_label', { sent: warmup.sentToday, limit: warmup.dailyLimit, phase: warmup.currentPhase })}
                                            >
                                                {/* Background glow effect */}
                                                <div className={`absolute inset-0 bg-gradient-to-r ${colors.glow} blur-sm`} />

                                                {/* Progress indicator */}
                                                <div
                                                    className={`h-full relative transition-all duration-700 ease-out rounded-full ${isLimitReached ? 'animate-pulse' : ''}`}
                                                    style={{
                                                        width: `${percentage}%`,
                                                        background: colors.gradient,
                                                        boxShadow: `${colors.shadow}, inset 0 1px 0 rgba(255, 255, 255, 0.25)`
                                                    }}
                                                >
                                                    {/* Shimmer effect */}
                                                    <div
                                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent rounded-full"
                                                        style={{
                                                            backgroundSize: '200% 100%',
                                                            animation: 'shimmer 2.5s infinite linear'
                                                        }}
                                                    />

                                                    {/* Edge highlight */}
                                                    {percentage > 5 && (
                                                        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-white/40 rounded-r-full" />
                                                    )}
                                                </div>

                                                {/* Texture overlay */}
                                                <div
                                                    className="absolute inset-0 pointer-events-none opacity-10 rounded-full"
                                                    style={{
                                                        backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.1) 8px, rgba(255,255,255,0.1) 16px)'
                                                    }}
                                                />
                                            </div>
                                        );
                                    })()}

                                    {/* Banner: Limite Atingido (Vermelho) */}
                                    {warmup.dailyLimit !== null && warmup.sentToday >= warmup.dailyLimit && (
                                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-3">
                                            <div className="flex gap-2 items-center text-red-400 text-sm">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span className="font-semibold">{t('warmup.limit_reached_title')}</span>
                                            </div>
                                            <p className="text-red-400/80 text-xs mt-1">
                                                {warmup.autoResume ? t('warmup.limit_reached_desc_auto') : t('warmup.limit_reached_desc_manual')}
                                            </p>
                                        </div>
                                    )}

                                    {/* Banner: Fase Ilimitada (Verde) */}
                                    {warmup.dailyLimit === null && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mt-3">
                                            <div className="flex gap-2 items-center text-emerald-400 text-sm">
                                                <span>🔥</span>
                                                <span className="font-semibold">{t('warmup.unlimited_banner_title')}</span>
                                            </div>
                                            <p className="text-emerald-400/80 text-xs mt-1">{t('warmup.unlimited_banner_desc')}</p>
                                        </div>
                                    )}

                                    {/* Indicador de Progressão */}
                                    {warmup.dailyLimit !== null && (
                                        <p className="text-xs text-slate-500 mt-2">
                                            📍 {(() => {
                                                const phase = warmup.currentPhase;
                                                const days = warmup.daysSinceStart;
                                                const phaseThresholds = [0, 4, 8, 15, 22];
                                                const nextPhase = phase + 1;
                                                const daysToNext = (phaseThresholds[phase] ?? 4) - days;
                                                return daysToNext > 0
                                                    ? t('warmup.next_phase', { next: nextPhase, days: daysToNext })
                                                    : t('warmup.next_phase', { next: nextPhase, days: 1 });
                                            })()}
                                            {' • '}
                                            <span className="font-mono">50 → 200 → 500 → 1500 → ∞</span>
                                        </p>
                                    )}

                                    {warmup.dailyLimit !== null && warmup.sentToday < warmup.dailyLimit && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            {t('warmup.resets_at', { time: formatResetTime() })}
                                        </p>
                                    )}
                                </div>

                                {/* Auto Resume Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label>{t('warmup.auto_resume')}</Label>
                                        <p className="text-xs text-slate-500">{t('warmup.auto_resume_hint')}</p>
                                    </div>
                                    <Switch
                                        checked={warmup.autoResume}
                                        onCheckedChange={(checked: boolean) => handleWarmupUpdate('autoResume', checked)}
                                    />
                                </div>

                                {/* Timezone Select */}
                                <div className="space-y-2">
                                    <Label>{t('warmup.timezone')}</Label>
                                    <Select
                                        value={warmup.timezone}
                                        onValueChange={(val) => handleWarmupUpdate('timezone', val)}
                                    >
                                        <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                                            <SelectItem value="America/Sao_Paulo">🇧🇷 Brasil (GMT-3)</SelectItem>
                                            <SelectItem value="UTC">🌍 UTC</SelectItem>
                                            <SelectItem value="America/New_York">🇺🇸 New York (EST)</SelectItem>
                                            <SelectItem value="Europe/London">🇬🇧 London (GMT)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        {/* Reset Button */}
                        <Button
                            variant="outline"
                            onClick={handleWarmupReset}
                            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                            {t('warmup.reset_button')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}
