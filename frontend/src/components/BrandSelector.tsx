import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Plus, Check, Pencil } from 'lucide-react';
import { useBrand, Brand } from '@/context/BrandContext';
import { cn } from '@/lib/utils';
import { EditBrandModal } from './EditBrandModal';

interface BrandSelectorProps {
    onNewBrandClick: () => void;
}

export function BrandSelector({ onNewBrandClick }: BrandSelectorProps) {
    const { t } = useTranslation();
    const { brands, currentBrand, setCurrentBrand, loading } = useBrand();
    const [isOpen, setIsOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

    const handleBrandSelect = (brand: Brand) => {
        setCurrentBrand(brand);
        setIsOpen(false);
        // No page reload needed - components will react to brandVersion change
    };

    const handleEditBrand = (e: React.MouseEvent, brand: Brand) => {
        e.stopPropagation(); // Prevent selecting the brand
        setIsOpen(false);
        setEditingBrand(brand);
    };

    // Helper function to get translated brand name for default brand
    const getBrandDisplayName = (brand: Brand | null) => {
        if (!brand) return t('brands.select_brand');

        // If it's the default brand with a generic name, show translated version
        if (brand.isDefault && (
            brand.name === 'Default Brand' ||
            brand.name === 'Marca Padrão' ||
            brand.name === 'Minha Marca'
        )) {
            return t('brands.default_brand_name');
        }

        return brand.name;
    };

    if (loading) {
        return (
            <div className="px-3 py-4">
                <div className="h-12 bg-slate-800/50 rounded-xl animate-pulse" />
            </div>
        );
    }

    return (
        <>
            <div className="px-3 py-2 relative">
                {/* Current Brand Button */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                        "bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600/50",
                        isOpen && "bg-slate-800/60 border-violet-500/30"
                    )}
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-violet-500/20">
                        {getBrandDisplayName(currentBrand)?.charAt(0)?.toUpperCase() || 'B'}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                            {getBrandDisplayName(currentBrand)}
                        </p>
                        {currentBrand?.domain && (
                            <p className="text-xs text-slate-400 truncate">
                                {currentBrand.domain}
                            </p>
                        )}
                    </div>
                    <ChevronDown className={cn(
                        "w-4 h-4 text-slate-400 transition-transform duration-200",
                        isOpen && "rotate-180"
                    )} />
                </button>

                {/* Dropdown */}
                {isOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsOpen(false)}
                        />

                        {/* Menu */}
                        <div className="absolute left-3 right-3 top-full mt-2 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-xl shadow-black/50 overflow-hidden">
                            <div className="p-2 max-h-64 overflow-y-auto">
                                {brands.map((brand) => (
                                    <div
                                        key={brand.id}
                                        className={cn(
                                            "flex items-center gap-2 rounded-lg transition-all duration-150",
                                            currentBrand?.id === brand.id
                                                ? "bg-violet-500/20"
                                                : "hover:bg-slate-800"
                                        )}
                                    >
                                        {/* Main brand button */}
                                        <button
                                            type="button"
                                            onClick={() => handleBrandSelect(brand)}
                                            className={cn(
                                                "flex-1 flex items-center gap-3 px-3 py-2.5",
                                                currentBrand?.id === brand.id
                                                    ? "text-white"
                                                    : "text-slate-300 hover:text-white"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold",
                                                currentBrand?.id === brand.id
                                                    ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                                                    : "bg-slate-700 text-slate-300"
                                            )}>
                                                {getBrandDisplayName(brand).charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {getBrandDisplayName(brand)}
                                                </p>
                                                {brand.domain && (
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {brand.domain}
                                                    </p>
                                                )}
                                            </div>
                                            {currentBrand?.id === brand.id && (
                                                <Check className="w-4 h-4 text-violet-400" />
                                            )}
                                            {brand.isDefault && currentBrand?.id !== brand.id && (
                                                <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                                                    {t('brands.default')}
                                                </span>
                                            )}
                                        </button>

                                        {/* Edit button */}
                                        <button
                                            type="button"
                                            onClick={(e) => handleEditBrand(e, brand)}
                                            className="p-2 mr-2 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors"
                                            title={t('brands.edit_brand')}
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* New Brand Button */}
                            <div className="p-2 border-t border-slate-700/50">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        onNewBrandClick();
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-violet-400 hover:bg-violet-500/10 transition-all duration-150"
                                >
                                    <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium">{t('brands.new_brand')}</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Edit Brand Modal */}
            <EditBrandModal
                isOpen={!!editingBrand}
                onClose={() => setEditingBrand(null)}
                brand={editingBrand}
            />
        </>
    );
}

