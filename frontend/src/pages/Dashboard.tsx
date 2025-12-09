import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next";

export function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalContacts: 0,
    sentEmails: 0,
    openRate: 0,
    serverStatus: 'Checking...'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setLoading(false);
        setStats(prev => ({ ...prev, serverStatus: 'Offline ❌' }));
      });
  }, []);

  return (
    <div>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white">{t('dashboard.title')}</h1>
        <p className="text-slate-400 mt-2">{t('dashboard.subtitle')}</p>

        {loading ? (
          <div className="mt-8 text-slate-400">{t('dashboard.loading')}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {/* Card 1 */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-slate-400">{t('dashboard.total_contacts')}</h3>
              <p className="text-3xl font-bold text-white mt-2">{stats.totalContacts}</p>
            </div>

            {/* Card 2 */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-slate-400">{t('dashboard.open_rate')}</h3>
              <p className="text-3xl font-bold text-emerald-400 mt-2">{stats.openRate}%</p>
              <p className="text-xs text-slate-500 mt-1">{t('dashboard.from_sends', { count: stats.sentEmails })}</p>
            </div>

            {/* Card 3 */}
            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800 backdrop-blur-sm">
              <h3 className="text-sm font-medium text-slate-400">{t('dashboard.server_status')}</h3>
              <p className="text-3xl font-bold text-blue-400 mt-2">{stats.serverStatus} {stats.serverStatus === 'Online' ? '⚡' : ''}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}