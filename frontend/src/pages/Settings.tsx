import { useEffect, useState } from "react";
import { toast } from '@/components/ui/use-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";

export function Settings() {
    const { t, i18n } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        host: '',
        port: '',
        user: '',
        pass: '',
        fromEmail: '',
        emailDelay: '1000'
    });

    useEffect(() => {
        // Fetch current settings
        fetch('http://localhost:3001/settings')
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
    }, [t]);

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
            const res = await fetch('http://localhost:3001/settings', {
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
                    <CardContent>
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
            </div>
        </div >
    );
}
