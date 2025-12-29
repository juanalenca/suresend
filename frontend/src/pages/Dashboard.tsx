import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  Users,
  Send,
  MailOpen,
  TrendingUp,
  Plus,
  Megaphone,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

// Types for activity data from API (structured for i18n)
interface ActivityItem {
  id: string
  type: 'contact_added' | 'campaign'
  iconType: 'user_plus' | 'send' | 'check_circle' | 'alert_circle' | 'clock'
  // Structured data for translation
  name: string
  email?: string
  status?: string
  sentCount?: number
  link: string
  timeAgoKey: string
  timeAgoCount: number
}

// Types for chart data from API
interface ChartDataPoint {
  month: string
  contacts: number
  emails: number
}

interface DashboardSummary {
  totalContacts: number
  activeCampaigns: number
  emailsSent: number
  openRate: number
  serverStatus: string
  recentActivity: ActivityItem[]
  contactStats: ChartDataPoint[]
}

// Generate last 6 months for chart padding
const getLast6Months = (): ChartDataPoint[] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const result: ChartDataPoint[] = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      month: months[d.getMonth()] as string,
      contacts: 0,
      emails: 0
    })
  }
  return result
}

// Merge API data with padded months
const mergeChartData = (apiData: ChartDataPoint[]): ChartDataPoint[] => {
  const padded = getLast6Months()

  // If no API data, return padded zeros
  if (!apiData || apiData.length === 0) {
    return padded
  }

  // Merge API data into padded months
  apiData.forEach(item => {
    const idx = padded.findIndex(p => p.month === item.month)
    if (idx !== -1 && padded[idx]) {
      padded[idx]!.contacts = item.contacts
      padded[idx]!.emails = item.emails
    }
  })

  return padded
}

export function Dashboard() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Helper function to get translated text for activity
  const getActivityText = (activity: ActivityItem): { text: string; subtext: string } => {
    if (activity.type === 'contact_added') {
      return {
        text: t('dashboard.activity.contact_added', { name: activity.name }),
        subtext: activity.email || ''
      };
    }

    // Campaign activities
    const name = activity.name;
    const count = activity.sentCount || 0;
    const status = activity.status || '';

    switch (status) {
      case 'COMPLETED':
        return {
          text: t('dashboard.activity.campaign_completed', { name }),
          subtext: t('dashboard.activity.sent_to', { count })
        };
      case 'RUNNING':
      case 'PROCESSING':
        return {
          text: t('dashboard.activity.campaign_sending', { name }),
          subtext: t('dashboard.activity.sent_so_far', { count })
        };
      case 'FAILED':
        return {
          text: t('dashboard.activity.campaign_failed', { name }),
          subtext: t('dashboard.activity.check_smtp')
        };
      case 'PENDING':
        return {
          text: t('dashboard.activity.campaign_queued', { name }),
          subtext: t('dashboard.activity.waiting_to_start')
        };
      case 'SCHEDULED':
        return {
          text: t('dashboard.activity.campaign_scheduled', { name }),
          subtext: status
        };
      default:
        return {
          text: t('dashboard.activity.campaign_default', { name }),
          subtext: status
        };
    }
  };

  // Helper function to get translated time ago
  const getTimeAgo = (activity: ActivityItem): string => {
    const key = activity.timeAgoKey;
    const count = activity.timeAgoCount;

    switch (key) {
      case 'just_now':
        return t('dashboard.time.just_now');
      case 'min_ago':
        return t('dashboard.time.min_ago', { count });
      case 'hour_ago':
        return t('dashboard.time.hour_ago', { count });
      case 'hours_ago':
        return t('dashboard.time.hours_ago', { count });
      case 'yesterday':
        return t('dashboard.time.yesterday');
      case 'days_ago':
        return t('dashboard.time.days_ago', { count });
      default:
        return key;
    }
  };

  // Dashboard data from API
  const [summary, setSummary] = useState<DashboardSummary>({
    totalContacts: 0,
    activeCampaigns: 0,
    emailsSent: 0,
    openRate: 0,
    serverStatus: 'Checking...',
    recentActivity: [],
    contactStats: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch comprehensive dashboard summary
    fetch('http://localhost:3000/dashboard/summary')
      .then(res => res.json())
      .then(data => {
        setSummary({
          totalContacts: data.totalContacts || 0,
          activeCampaigns: data.activeCampaigns || 0,
          emailsSent: data.emailsSent || 0,
          openRate: data.openRate || 0,
          serverStatus: data.serverStatus || 'Online',
          recentActivity: data.recentActivity || [],
          contactStats: mergeChartData(data.contactStats || [])
        })
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch dashboard summary:', err)
        setLoading(false)
        setSummary(prev => ({
          ...prev,
          serverStatus: 'Offline',
          contactStats: getLast6Months()
        }))
      })
  }, [])

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl p-3">
          <p className="text-sm font-semibold text-white">{label}</p>
          <p className="text-sm text-violet-400">
            {t('dashboard.contacts')}: <span className="font-medium text-white">{payload[0]?.value}</span>
          </p>
        </div>
      )
    }
    return null
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">{t('dashboard.loading')}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (summary.totalContacts === 0 && summary.emailsSent === 0) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-purple-600/10 blur-3xl" />
          <div className="relative">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {t('dashboard.title')}
            </h1>
            <p className="text-slate-400 mt-1">{t('dashboard.subtitle')}</p>
          </div>
        </div>

        {/* Empty State Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-purple-600/5" />
          <div className="relative">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/25">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              {t('dashboard.welcome_title')}
            </h2>
            <p className="text-slate-400 max-w-md mx-auto mb-8">
              {t('dashboard.welcome_desc')}
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => navigate('/contacts')}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white h-12 px-8 shadow-lg shadow-violet-500/25"
              >
                <Plus className="w-5 h-5 mr-2" />
                {t('dashboard.add_contact')}
              </Button>
              <Button
                onClick={() => navigate('/campaigns/new')}
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white h-12 px-8"
              >
                <Megaphone className="w-5 h-5 mr-2" />
                {t('dashboard.create_campaign')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 to-purple-600/10 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {t('dashboard.title')}
            </h1>
            <p className="text-slate-400 mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50">
            <div className={`w-2 h-2 rounded-full ${summary.serverStatus === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm text-slate-300">
              {summary.serverStatus === 'Online'
                ? t('dashboard.all_systems_operational')
                : t('dashboard.server_offline')}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contacts */}
        <div className="group relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6 hover:border-indigo-500/30 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-lg">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+{summary.totalContacts > 0 ? Math.min(summary.totalContacts, 100) : 0}%</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-400">{t('dashboard.total_contacts')}</p>
              <p className="text-3xl font-bold text-white mt-1">{summary.totalContacts.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Emails Sent */}
        <div className="group relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6 hover:border-violet-500/30 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-lg">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+{summary.emailsSent > 0 ? Math.min(Math.round(summary.emailsSent / 10), 50) : 0}%</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-400">{t('dashboard.emails_sent')}</p>
              <p className="text-3xl font-bold text-white mt-1">{summary.emailsSent.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Open Rate */}
        <div className="group relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6 hover:border-emerald-500/30 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <MailOpen className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg ${summary.openRate >= 20 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                {summary.openRate >= 20 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{summary.openRate >= 20 ? '+' : ''}{summary.openRate > 0 ? Math.round(summary.openRate / 5) : 0}%</span>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-400">{t('dashboard.open_rate')}</p>
              <p className="text-3xl font-bold text-white mt-1">{summary.openRate}%</p>
            </div>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="group relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6 hover:border-amber-500/30 transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              {summary.activeCampaigns > 0 ? (
                <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium bg-emerald-500/10 px-2 py-1 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Sending</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-slate-500 text-sm font-medium bg-slate-800 px-2 py-1 rounded-lg">
                  <span>Idle</span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-400">{t('dashboard.active_campaigns')}</p>
              <p className="text-3xl font-bold text-white mt-1">{summary.activeCampaigns}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">{t('dashboard.contacts_growth')}</h3>
            <p className="text-sm text-slate-400 mt-1">{t('dashboard.contacts_growth_desc')}</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-500" />
            <span className="text-sm text-slate-300">{t('dashboard.contacts')}</span>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.contactStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorContacts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="contacts"
                stroke="#8b5cf6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorContacts)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">{t('dashboard.quick_actions')}</h3>
          </div>
          <div className="space-y-3">
            {/* Add Contact Action */}
            <div
              onClick={() => navigate('/contacts')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-700/50 bg-slate-800/30 cursor-pointer transition-all duration-200 hover:bg-indigo-500/10 hover:border-indigo-500/30 group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{t('dashboard.add_new_contact')}</p>
                <p className="text-sm text-slate-400">{t('dashboard.grow_audience')}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
            </div>

            {/* Create Campaign Action */}
            <div
              onClick={() => navigate('/campaigns/new')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-700/50 bg-slate-800/30 cursor-pointer transition-all duration-200 hover:bg-violet-500/10 hover:border-violet-500/30 group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
                <Megaphone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{t('dashboard.create_campaign')}</p>
                <p className="text-sm text-slate-400">{t('dashboard.start_email_blast')}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
            </div>

            {/* Configure SMTP Action */}
            <div
              onClick={() => navigate('/settings')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-700/50 bg-slate-800/30 cursor-pointer transition-all duration-200 hover:bg-slate-700/50 hover:border-slate-600/50 group"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center flex-shrink-0">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{t('dashboard.configure_smtp')}</p>
                <p className="text-sm text-slate-400">{t('dashboard.setup_email_server')}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-1 transition-all" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-5 h-5 text-violet-400" />
            <h3 className="text-lg font-semibold text-white">{t('dashboard.recent_activity')}</h3>
          </div>
          <div className="space-y-1">
            {summary.recentActivity.length > 0 ? (
              summary.recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  onClick={() => navigate(activity.link)}
                  className={`flex items-center gap-4 py-3 cursor-pointer hover:bg-slate-800/50 rounded-xl px-3 -mx-3 transition-colors ${index !== summary.recentActivity.length - 1 ? 'border-b border-slate-700/30' : ''
                    }`}
                >
                  {/* Smart Icon based on iconType */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${activity.iconType === 'user_plus' ? 'bg-blue-500/20' :
                    activity.iconType === 'check_circle' ? 'bg-emerald-500/20' :
                      activity.iconType === 'alert_circle' ? 'bg-red-500/20' :
                        activity.iconType === 'clock' ? 'bg-amber-500/20' :
                          'bg-violet-500/20'
                    }`}>
                    {activity.iconType === 'user_plus' && <Users className="w-5 h-5 text-blue-400" />}
                    {activity.iconType === 'check_circle' && <Send className="w-5 h-5 text-emerald-400" />}
                    {activity.iconType === 'alert_circle' && <Activity className="w-5 h-5 text-red-400" />}
                    {activity.iconType === 'clock' && <Activity className="w-5 h-5 text-amber-400" />}
                    {activity.iconType === 'send' && <Megaphone className="w-5 h-5 text-violet-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {getActivityText(activity).text}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {getActivityText(activity).subtext}
                    </p>
                  </div>
                  <div className="text-xs text-slate-500 flex-shrink-0 bg-slate-800/50 px-2 py-1 rounded-md">
                    {getTimeAgo(activity)}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-slate-800/50 rounded-2xl flex items-center justify-center">
                  <Activity className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-400">{t('dashboard.no_activity')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}