import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useBrand, Brand, getApiHeaders } from '@/context/BrandContext';
import { apiUrl } from '@/lib/api';

interface EditBrandModalProps {
    isOpen: boolean;
    onClose: () => void;
    brand: Brand | null;
}

export function EditBrandModal({ isOpen, onClose, brand }: EditBrandModalProps) {
    const { t } = useTranslation();
    const { refreshBrands, setCurrentBrand } = useBrand();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        domain: ''
    });

    // Update form when brand changes
    useEffect(() => {
        if (brand) {
            setFormData({
                name: brand.name || '',
                domain: brand.domain || ''
            });
        }
    }, [brand]);

    if (!isOpen || !brand) return null;

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
            const response = await fetch(apiUrl(`/brands/${brand.id}`), {
                method: 'PUT',
                headers: getApiHeaders(),
                body: JSON.stringify({
                    name: formData.name.trim(),
                    domain: formData.domain.trim() || null
                })
            });

            if (!response.ok) {
                throw new Error('Failed to update brand');
            }

            const updatedBrand = await response.json();

            toast({
                title: t('brands.edit_success_title'),
                description: t('brands.edit_success_desc')
            });

            // Refresh brands list and update current brand
            await refreshBrands();
            setCurrentBrand(updatedBrand);
            onClose();

        } catch (error: any) {
            toast({
                title: t('brands.error'),
                description: error.message || t('brands.edit_error'),
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
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-white">{t('brands.edit_brand')}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Brand Name */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-name" className="text-slate-300">
                            {t('brands.name_label')} <span className="text-red-400">*</span>
                        </Label>
                        <Input
                            id="edit-name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder={t('brands.name_placeholder')}
                            className="bg-slate-950 border-slate-700 text-slate-200 h-12 rounded-xl"
                            autoFocus
                        />
                    </div>

                    {/* Domain */}
                    <div className="space-y-2">
                        <Label htmlFor="edit-domain" className="text-slate-300">
                            {t('brands.domain_label')}
                        </Label>
                        <Input
                            id="edit-domain"
                            value={formData.domain}
                            onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                            placeholder={t('brands.domain_placeholder')}
                            className="bg-slate-950 border-slate-700 text-slate-200 h-12 rounded-xl"
                        />
                        <p className="text-xs text-slate-500">{t('brands.domain_hint')}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-12 border-slate-700"
                            disabled={loading}
                        >
                            {t('buttons.cancel')}
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                            disabled={loading}
                        >
                            {loading ? t('buttons.saving') : t('buttons.save')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
