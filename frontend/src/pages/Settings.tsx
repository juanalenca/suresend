import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertTriangle, Flame, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBrand, getApiHeaders } from "@/context/BrandContext";
import { apiUrl } from "@/lib/api";

export function Settings() {
    const { t, i18n } = useTranslation();
    const { currentBrand, refreshBrands } = useBrand();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [timeFormat, setTimeFormat] = useState<string | null>(() => localStorage.getItem('timeFormat'));

    // Brand SMTP form data
    const [formData, setFormData] = useState({
        smtpHost: '',
        smtpPort: '',
        smtpUser: '',
        smtpPass: '',
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

    // Load brand settings when brand changes
    useEffect(() => {
        if (!currentBrand) {
            setLoading(false);
            return;
        }

        // Fetch brand details for SMTP config
        fetch(apiUrl(`/brands/${currentBrand.id}`), {
            headers: getApiHeaders()
        })
            .then(res => res.json())
            .then(data => {
                setFormData({
                    smtpHost: data.smtpHost || '',
                    smtpPort: data.smtpPort || '',
                    smtpUser: data.smtpUser || '',
                    smtpPass: '', // Don't show password
                    fromEmail: data.fromEmail || '',
                    emailDelay: String(data.emailDelay || 1000)
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
        fetch(apiUrl('/warmup'), {
            headers: getApiHeaders()
        })
            .then(res => res.json())
            .then(data => {
                setWarmup({
                    enabled: data.enabled || false,
                    startDate: data.startDate,
                    timezone: data.timezone || 'America/Sao_Paulo',
                    currentPhase: data.currentPhase || 1,
                    dailyLimit: data.dailyLimit,
                    sentToday: data.sentToday || 0,
                    autoResume: data.autoResume || false,
                    daysSinceStart: data.daysSinceStart || 0
                });
            })
            .catch(err => console.error('Error fetching warmup:', err));
    }, [currentBrand, t]);

    // Auto-refresh warmup counter every 10 seconds when enabled
    useEffect(() => {
        if (!warmup.enabled) return;

        const interval = setInterval(() => {
            fetch(apiUrl('/warmup'), {
                headers: getApiHeaders()
            })
                .then(res => res.json())
                .then(data => {
                    setWarmup(prev => ({
                        ...prev,
                        sentToday: data.sentToday,
                        currentPhase: data.currentPhase,
                        dailyLimit: data.dailyLimit,
                        daysSinceStart: data.daysSinceStart || 0
                    }));
                })
                .catch(err => console.error('Error polling warmup:', err));
        }, 10000);

        return () => clearInterval(interval);
    }, [warmup.enabled]);

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

        if (!currentBrand) {
            toast({
                title: t('brands.error'),
                description: t('brands.no_brand_selected'),
                variant: "destructive"
            });
            return;
        }

        setSaving(true);

        try {
            const res = await fetch(apiUrl(`/brands/${currentBrand.id}`), {
                method: 'PUT',
                headers: getApiHeaders(),
                body: JSON.stringify({
                    smtpHost: formData.smtpHost || null,
                    smtpPort: formData.smtpPort || null,
                    smtpUser: formData.smtpUser || null,
                    smtpPass: formData.smtpPass || null,
                    fromEmail: formData.fromEmail || null,
                    emailDelay: parseInt(formData.emailDelay || '1000', 10)
                })
            });

            if (!res.ok) throw new Error('Failed to save');

            await refreshBrands();

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
            const res = await fetch(apiUrl('/warmup/start'), {
                method: 'POST',
                headers: getApiHeaders()
            });
            const data = await res.json();
            setWarmup(prev => ({ ...prev, ...data, daysSinceStart: 0 }));
            toast({ title: '🔥 Warmup iniciado!', description: 'Seu domínio começou a aquecer.' });
        } catch (err) {
            toast({ title: 'Erro', description: 'Não foi possível iniciar o warmup.', variant: 'destructive' });
        }
    };

    const handleWarmupStop = async () => {
        try {
            const res = await fetch(apiUrl('/warmup/stop'), {
                method: 'POST',
                headers: getApiHeaders()
            });
            const data = await res.json();
            setWarmup(prev => ({ ...prev, ...data }));
            toast({ title: '⏸️ Warmup pausado', description: 'O warmup foi pausado.' });
        } catch (err) {
            toast({ title: 'Erro', description: 'Não foi possível pausar o warmup.', variant: 'destructive' });
        }
    };

    const handleWarmupReset = async () => {
        try {
            const res = await fetch(apiUrl('/warmup/reset'), {
                method: 'POST',
                headers: getApiHeaders()
            });
            const data = await res.json();
            setWarmup(prev => ({ ...prev, ...data, daysSinceStart: 0 }));
            toast({ title: '🔄 Warmup resetado', description: 'O warmup foi reiniciado do zero.' });
        } catch (err) {
            toast({ title: 'Erro', description: 'Não foi possível resetar o warmup.', variant: 'destructive' });
        }
    };

    const handleWarmupUpdate = async (field: string, value: string | boolean) => {
        try {
            const res = await fetch(apiUrl('/warmup'), {
                method: 'PUT',
                headers: getApiHeaders(),
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

                {/* Current Brand Indicator */}
                {currentBrand && (
                    <Card className="bg-violet-500/10 border-violet-500/30 text-slate-200">
                        <CardContent className="py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                    {(() => {
                                        // Get translated name for default brand
                                        const displayName = currentBrand.isDefault && (
                                            currentBrand.name === 'Default Brand' ||
                                            currentBrand.name === 'Marca Padrão' ||
                                            currentBrand.name === 'Minha Marca'
                                        ) ? t('brands.default_brand_name') : currentBrand.name;
                                        return displayName.charAt(0).toUpperCase();
                                    })()}
                                </div>
                                <div>
                                    <p className="text-sm text-violet-300">{t('brands.editing_brand')}</p>
                                    <p className="font-semibold text-white">
                                        {currentBrand.isDefault && (
                                            currentBrand.name === 'Default Brand' ||
                                            currentBrand.name === 'Marca Padrão' ||
                                            currentBrand.name === 'Minha Marca'
                                        ) ? t('brands.default_brand_name') : currentBrand.name}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

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

                {/* SMTP Settings Card - Now per Brand */}
                <Card className="bg-slate-900/50 border-slate-800 text-slate-200">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Building2 className="w-5 h-5 text-violet-400" />
                            <div>
                                <CardTitle>{t('settings.smtp_title')}</CardTitle>
                                <CardDescription>{t('brands.smtp_per_brand_desc')}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="smtpHost">{t('settings.host')}</Label>
                                <Input
                                    id="smtpHost"
                                    name="smtpHost"
                                    placeholder={t('brands.smtp_host_placeholder')}
                                    value={formData.smtpHost}
                                    onChange={handleChange}
                                    className="bg-slate-950 border-slate-800 text-slate-200"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="smtpPort">{t('settings.port')}</Label>
                                    <Input
                                        id="smtpPort"
                                        name="smtpPort"
                                        placeholder={t('brands.smtp_port_placeholder')}
                                        value={formData.smtpPort}
                                        onChange={handleChange}
                                        className="bg-slate-950 border-slate-800 text-slate-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="smtpUser">{t('settings.user')}</Label>
                                    <Input
                                        id="smtpUser"
                                        name="smtpUser"
                                        placeholder={t('brands.smtp_user_placeholder')}
                                        value={formData.smtpUser}
                                        onChange={handleChange}
                                        className="bg-slate-950 border-slate-800 text-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="smtpPass">{t('settings.pass')}</Label>
                                <Input
                                    id="smtpPass"
                                    name="smtpPass"
                                    type="password"
                                    placeholder={t('brands.smtp_pass_placeholder')}
                                    value={formData.smtpPass}
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
                                    placeholder={t('brands.from_email_placeholder')}
                                    value={formData.fromEmail}
                                    onChange={handleChange}
                                    className="bg-slate-950 border-slate-800 text-slate-200"
                                />
                                <p className="text-xs text-slate-500">{t('settings.from_email_hint')}</p>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-slate-800">
                                <Label htmlFor="emailDelay">{t('brands.delay_label')}</Label>
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
                                    {warmup.dailyLimit !== null && (
                                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                                                style={{ width: `${Math.min((warmup.sentToday / warmup.dailyLimit) * 100, 100)}%` }}
                                            />
                                        </div>
                                    )}

                                    {/* Limit reached warning */}
                                    {warmup.dailyLimit !== null && warmup.sentToday >= warmup.dailyLimit && (
                                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-3">
                                            <div className="flex gap-2 items-center text-red-400 text-sm">
                                                <AlertTriangle className="w-4 h-4" />
                                                <span className="font-semibold">{t('warmup.limit_reached_title')}</span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Unlimited banner */}
                                    {warmup.dailyLimit === null && (
                                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 mt-3">
                                            <div className="flex gap-2 items-center text-emerald-400 text-sm">
                                                <span>🔥</span>
                                                <span className="font-semibold">{t('warmup.unlimited_banner_title')}</span>
                                            </div>
                                        </div>
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
