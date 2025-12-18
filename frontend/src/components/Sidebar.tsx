import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Send, Users, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

export function Sidebar() {
    const { t } = useTranslation();
    const { logout, user } = useAuth();
    const location = useLocation();

    const menuItems = [
        { icon: LayoutDashboard, label: t('menu.dashboard'), path: '/dashboard' },
        { icon: Send, label: t('menu.campaigns'), path: '/campaigns' },
        { icon: Users, label: t('menu.contacts'), path: '/contacts' },
        { icon: Settings, label: t('menu.settings'), path: '/settings' },
    ];

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 min-h-screen flex flex-col">
            <div className="p-6 border-b border-slate-800">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <span className="text-2xl">🚀</span> SureSend
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800 space-y-4">
                <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-white">{user?.name || t('sidebar.user_name')}</p>
                        <p className="text-xs text-slate-400">{user?.email || 'user@example.com'}</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => logout()}
                    className="flex items-center gap-3 px-4 py-2 w-full text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">{t('menu.logout')}</span>
                </button>

            </div>
        </div>
    );
}
