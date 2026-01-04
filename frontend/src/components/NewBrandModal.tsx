import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Building2, Globe, Mail, Lock, Server, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useBrand, getApiHeaders } from '@/context/BrandContext';
import { apiUrl } from '@/lib/api';

interface NewBrandModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NewBrandModal({ isOpen, onClose }: NewBrandModalProps) {
    const { t } = useTranslation();
    const { refreshBrands, setCurrentBrand } = useBrand();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        domain: '',
        smtpHost: '',
        smtpPort: '587',
        smtpUser: '',
        smtpPass: '',
        fromEmail: '',
        emailDelay: '1000'
    });

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast({
                title: t('brands.error'),
                description: t('brands.name_required'),
                variant: 'destructive'
            });
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(apiUrl('/brands'), {
                method: 'POST',
                headers: getApiHeaders(),
                body: JSON.stringify({
                    name: formData.name.trim(),
                    domain: formData.domain.trim() || null,
                    smtpHost: formData.smtpHost || null,
                    smtpPort: formData.smtpPort || null,
                    smtpUser: formData.smtpUser || null,
                    smtpPass: formData.smtpPass || null,
                    fromEmail: formData.fromEmail || null,
                    emailDelay: parseInt(formData.emailDelay || '1000', 10)
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create brand');
            }

            const newBrand = await response.json();

            toast({
                title: t('brands.created_title'),
                description: t('brands.created_desc', { name: newBrand.name })
            });

            await refreshBrands();
            setCurrentBrand(newBrand);

            // Reset form and close
            setFormData({
                name: '',
                domain: '',
                smtpHost: '',
                smtpPort: '587',
                smtpUser: '',
                smtpPass: '',
                fromEmail: '',
                emailDelay: '1000'
            });
            onClose();
            // No page reload needed - setCurrentBrand triggers brandVersion update

        } catch (error: any) {
            toast({
                title: t('brands.error'),
                description: error.message,
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">{t('brands.new_brand_title')}</h2>
                            <p className="text-sm text-slate-400">{t('brands.new_brand_desc')}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-slate-200 flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                {t('brands.name_label')} *
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder={t('brands.name_placeholder')}
                                value={formData.name}
                                onChange={handleChange}
                                className="bg-slate-950 border-slate-700 text-white"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="domain" className="text-slate-200 flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                {t('brands.domain_label')}
                            </Label>
                            <Input
                                id="domain"
                                name="domain"
                                placeholder={t('brands.domain_placeholder')}
                                value={formData.domain}
                                onChange={handleChange}
                                className="bg-slate-950 border-slate-700 text-white"
                            />
                            <p className="text-xs text-slate-500">{t('brands.domain_hint')}</p>
                        </div>
                    </div>

                    {/* SMTP Settings */}
                    <div className="pt-4 border-t border-slate-800">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {t('brands.smtp_settings')}
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="smtpHost" className="text-slate-300 flex items-center gap-2">
                                        <Server className="w-3 h-3" />
                                        {t('brands.smtp_host')}
                                    </Label>
                                    <Input
                                        id="smtpHost"
                                        name="smtpHost"
                                        placeholder={t('brands.smtp_host_placeholder')}
                                        value={formData.smtpHost}
                                        onChange={handleChange}
                                        className="bg-slate-950 border-slate-700 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="smtpPort" className="text-slate-300">
                                        {t('brands.smtp_port')}
                                    </Label>
                                    <Input
                                        id="smtpPort"
                                        name="smtpPort"
                                        placeholder={t('brands.smtp_port_placeholder')}
                                        value={formData.smtpPort}
                                        onChange={handleChange}
                                        className="bg-slate-950 border-slate-700 text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="smtpUser" className="text-slate-300 flex items-center gap-2">
                                        <User className="w-3 h-3" />
                                        {t('brands.smtp_user')}
                                    </Label>
                                    <Input
                                        id="smtpUser"
                                        name="smtpUser"
                                        placeholder={t('brands.smtp_user_placeholder')}
                                        value={formData.smtpUser}
                                        onChange={handleChange}
                                        className="bg-slate-950 border-slate-700 text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="smtpPass" className="text-slate-300 flex items-center gap-2">
                                        <Lock className="w-3 h-3" />
                                        {t('brands.smtp_pass')}
                                    </Label>
                                    <Input
                                        id="smtpPass"
                                        name="smtpPass"
                                        type="password"
                                        placeholder={t('brands.smtp_pass_placeholder')}
                                        value={formData.smtpPass}
                                        onChange={handleChange}
                                        className="bg-slate-950 border-slate-700 text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="fromEmail" className="text-slate-300">
                                    {t('brands.from_email')}
                                </Label>
                                <Input
                                    id="fromEmail"
                                    name="fromEmail"
                                    placeholder={t('brands.from_email_placeholder')}
                                    value={formData.fromEmail}
                                    onChange={handleChange}
                                    className="bg-slate-950 border-slate-700 text-white"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="emailDelay" className="text-slate-300 flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    {t('brands.delay_label')}
                                </Label>
                                <Input
                                    id="emailDelay"
                                    name="emailDelay"
                                    type="number"
                                    min={100}
                                    max={60000}
                                    placeholder={t('brands.delay_placeholder')}
                                    value={formData.emailDelay}
                                    onChange={handleChange}
                                    className="bg-slate-950 border-slate-700 text-white"
                                />
                                <p className="text-xs text-slate-500">{t('brands.delay_hint')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
                        >
                            {t('buttons.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                        >
                            {loading ? t('buttons.saving') : t('brands.create_button')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
