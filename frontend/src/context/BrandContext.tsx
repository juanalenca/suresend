import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface Brand {
    id: string;
    name: string;
    domain: string | null;
    isDefault: boolean;
    smtpHost: string | null;
    smtpPort: string | null;
    smtpUser: string | null;
    smtpPass: string | null;
    fromEmail: string | null;
    emailDelay: number;
    createdAt: string;
    _count?: {
        campaigns: number;
        contacts: number;
    };
}

interface BrandContextType {
    brands: Brand[];
    currentBrand: Brand | null;
    setCurrentBrand: (brand: Brand) => void;
    refreshBrands: () => Promise<void>;
    loading: boolean;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

// Storage key for persisting selected brand
const BRAND_STORAGE_KEY = 'suresend_current_brand_id';

export function BrandProvider({ children }: { children: ReactNode }) {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [currentBrand, setCurrentBrandState] = useState<Brand | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchBrands = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/brands', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch brands');
            }

            const data = await response.json();
            const brandList = data.data || [];
            setBrands(brandList);

            // If we have brands but no current brand selected, select one
            if (brandList.length > 0 && !currentBrand) {
                const savedBrandId = localStorage.getItem(BRAND_STORAGE_KEY);

                // Try to find saved brand
                if (savedBrandId) {
                    const savedBrand = brandList.find((b: Brand) => b.id === savedBrandId);
                    if (savedBrand) {
                        setCurrentBrandState(savedBrand);
                        return;
                    }
                }

                // Fall back to default brand
                const defaultBrand = brandList.find((b: Brand) => b.isDefault);
                if (defaultBrand) {
                    setCurrentBrandState(defaultBrand);
                    localStorage.setItem(BRAND_STORAGE_KEY, defaultBrand.id);
                } else {
                    // Just use first brand if no default
                    setCurrentBrandState(brandList[0]);
                    localStorage.setItem(BRAND_STORAGE_KEY, brandList[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching brands:', error);
        } finally {
            setLoading(false);
        }
    }, [currentBrand]);

    // Fetch brands on mount
    useEffect(() => {
        fetchBrands();
    }, []);

    const setCurrentBrand = useCallback((brand: Brand) => {
        setCurrentBrandState(brand);
        localStorage.setItem(BRAND_STORAGE_KEY, brand.id);
    }, []);

    const refreshBrands = useCallback(async () => {
        setLoading(true);
        await fetchBrands();
    }, [fetchBrands]);

    return (
        <BrandContext.Provider value={{
            brands,
            currentBrand,
            setCurrentBrand,
            refreshBrands,
            loading
        }}>
            {children}
        </BrandContext.Provider>
    );
}

export function useBrand() {
    const context = useContext(BrandContext);
    if (context === undefined) {
        throw new Error('useBrand must be used within a BrandProvider');
    }
    return context;
}

/**
 * Helper function to get the X-Brand-Id header for API requests.
 * Use this in fetch calls to ensure brand context is passed.
 */
export function getBrandHeader(): Record<string, string> {
    const brandId = localStorage.getItem(BRAND_STORAGE_KEY);
    return brandId ? { 'X-Brand-Id': brandId } : {};
}

/**
 * Helper function to create headers for API requests with brand context.
 */
export function getApiHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...getBrandHeader()
    };
}
