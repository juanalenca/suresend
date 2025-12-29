import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Send, Users, Settings, LogOut, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { BrandSelector } from './BrandSelector';
import { NewBrandModal } from './NewBrandModal';

export function Sidebar() {
    const { t } = useTranslation();
    const { logout, user } = useAuth();
    const location = useLocation();
    const [isNewBrandModalOpen, setIsNewBrandModalOpen] = useState(false);

    const menuItems = [
        { icon: LayoutDashboard, label: t('menu.dashboard'), path: '/dashboard' },
        { icon: Send, label: t('menu.campaigns'), path: '/campaigns' },
        { icon: Users, label: t('menu.contacts'), path: '/contacts' },
        { icon: Settings, label: t('menu.settings'), path: '/settings' },
    ];

    return (
        <>
            <div className="w-64 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-r border-slate-800/50 min-h-screen flex flex-col">
                {/* Logo Section */}
                <div className="p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                            <Rocket className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                SureSend
                            </h1>
                            <p className="text-[10px] text-slate-500 font-medium tracking-wider uppercase">
                                Email Marketing
                            </p>
                        </div>
                    </div>
                </div>

                {/* Brand Selector */}
                <BrandSelector onNewBrandClick={() => setIsNewBrandModalOpen(true)} />

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4">
                    <p className="px-4 mb-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        Menu
                    </p>
                    <div className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path ||
                                (item.path === '/campaigns' && location.pathname.startsWith('/campaigns'));
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={cn(
                                        "group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 relative",
                                        isActive
                                            ? "bg-gradient-to-r from-violet-500/20 to-purple-500/10 text-white"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                    )}
                                >
                                    {/* Active indicator */}
                                    {isActive && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-violet-400 to-purple-500 rounded-r-full" />
                                    )}

                                    <div className={cn(
                                        "p-1.5 rounded-lg transition-all duration-200",
                                        isActive
                                            ? "bg-violet-500/20 text-violet-400"
                                            : "text-slate-400 group-hover:text-violet-400 group-hover:bg-violet-500/10"
                                    )}>
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <span className="font-medium text-sm">{item.label}</span>

                                    {/* Hover glow effect */}
                                    {isActive && (
                                        <div className="absolute inset-0 rounded-xl bg-violet-500/5 blur-sm" />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                {/* User Section */}
                <div className="p-3 mt-auto">
                    <div className="p-3 rounded-2xl bg-slate-800/30 border border-slate-700/50 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/20">
                                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                {/* Online indicator */}
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">
                                    {user?.name || t('sidebar.user_name')}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                    {user?.email || 'user@example.com'}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => logout()}
                            className="mt-3 flex items-center justify-center gap-2 w-full px-4 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200 border border-transparent hover:border-red-500/20"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="font-medium">{t('menu.logout')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* New Brand Modal */}
            <NewBrandModal
                isOpen={isNewBrandModalOpen}
                onClose={() => setIsNewBrandModalOpen(false)}
            />
        </>
    );
}
