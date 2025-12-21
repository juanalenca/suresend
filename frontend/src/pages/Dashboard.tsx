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
  ChevronRight
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

// Types for activity data from API (new human-readable format)
interface ActivityItem {
  id: string
  type: 'contact_added' | 'campaign'
  iconType: 'user_plus' | 'send' | 'check_circle' | 'alert_circle' | 'clock'
  text: string
  subtext: string
  link: string
  timeAgo: string
  status?: string
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
        <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="text-sm text-indigo-600">
            {t('dashboard.contacts')}: <span className="font-medium">{payload[0]?.value}</span>
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
          <div className="h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium">{t('dashboard.loading')}</p>
        </div>
      </div>
    )
  }

  // Empty state
  if (summary.totalContacts === 0 && summary.emailsSent === 0) {
    return (
      <div className="space-y-8">
        {/* Header - Light colors for dark background */}
        <div>
          <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
          <p className="text-slate-400 mt-1">{t('dashboard.subtitle')}</p>
        </div>

        {/* Empty State Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
            <Sparkles className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">
            {t('dashboard.welcome_title')}
          </h2>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            {t('dashboard.welcome_desc')}
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate('/contacts')}
              className="bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('dashboard.add_contact')}
            </Button>
            <Button
              onClick={() => navigate('/campaigns/new')}
              variant="outline"
              className="border-slate-300 text-slate-700 hover:bg-slate-50 h-11 px-6"
            >
              <Megaphone className="w-4 h-4 mr-2" />
              {t('dashboard.create_campaign')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header - Light colors for dark background */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('dashboard.title')}</h1>
          <p className="text-slate-400 mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${summary.serverStatus === 'Online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-slate-300">
            {summary.serverStatus === 'Online'
              ? t('dashboard.all_systems_operational')
              : t('dashboard.server_offline')}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Contacts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" />
              <span>+{summary.totalContacts > 0 ? Math.min(summary.totalContacts, 100) : 0}%</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">{t('dashboard.total_contacts')}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{summary.totalContacts.toLocaleString()}</p>
          </div>
        </div>

        {/* Emails Sent */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center">
              <Send className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
              <ArrowUpRight className="w-4 h-4" />
              <span>+{summary.emailsSent > 0 ? Math.min(Math.round(summary.emailsSent / 10), 50) : 0}%</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">{t('dashboard.emails_sent')}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{summary.emailsSent.toLocaleString()}</p>
          </div>
        </div>

        {/* Open Rate */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <MailOpen className="w-6 h-6 text-emerald-600" />
            </div>
            <div className={`flex items-center gap-1 text-sm font-medium ${summary.openRate >= 20 ? 'text-emerald-600' : 'text-red-500'}`}>
              {summary.openRate >= 20 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{summary.openRate >= 20 ? '+' : ''}{summary.openRate > 0 ? Math.round(summary.openRate / 5) : 0}%</span>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">{t('dashboard.open_rate')}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{summary.openRate}%</p>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
            {summary.activeCampaigns > 0 ? (
              <div className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Sending</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-slate-400 text-sm font-medium">
                <span>—</span>
              </div>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">{t('dashboard.active_campaigns')}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{summary.activeCampaigns}</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.contacts_growth')}</h3>
            <p className="text-sm text-slate-500 mt-1">{t('dashboard.contacts_growth_desc')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-sm text-slate-600">{t('dashboard.contacts')}</span>
            </div>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={summary.contactStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorContacts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="contacts"
                stroke="#6366f1"
                strokeWidth={2}
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('dashboard.quick_actions')}</h3>
          <div className="space-y-3">
            {/* Add Contact Action */}
            <div
              onClick={() => navigate('/contacts')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer transition-all hover:bg-indigo-50 hover:border-indigo-300 group"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Plus className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{t('dashboard.add_new_contact')}</p>
                <p className="text-sm text-slate-500">{t('dashboard.grow_audience')}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </div>

            {/* Create Campaign Action */}
            <div
              onClick={() => navigate('/campaigns/new')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer transition-all hover:bg-violet-50 hover:border-violet-300 group"
            >
              <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Megaphone className="w-6 h-6 text-violet-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{t('dashboard.create_campaign')}</p>
                <p className="text-sm text-slate-500">{t('dashboard.start_email_blast')}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-violet-500 transition-colors" />
            </div>

            {/* Configure SMTP Action */}
            <div
              onClick={() => navigate('/settings')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white cursor-pointer transition-all hover:bg-slate-50 hover:border-slate-300 group"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Activity className="w-6 h-6 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{t('dashboard.configure_smtp')}</p>
                <p className="text-sm text-slate-500">{t('dashboard.setup_email_server')}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('dashboard.recent_activity')}</h3>
          <div className="space-y-1">
            {summary.recentActivity.length > 0 ? (
              summary.recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  onClick={() => navigate(activity.link)}
                  className={`flex items-center gap-4 py-3 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors ${index !== summary.recentActivity.length - 1 ? 'border-b border-slate-100' : ''
                    }`}
                >
                  {/* Smart Icon based on iconType */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${activity.iconType === 'user_plus' ? 'bg-blue-100' :
                    activity.iconType === 'check_circle' ? 'bg-emerald-100' :
                      activity.iconType === 'alert_circle' ? 'bg-red-100' :
                        activity.iconType === 'clock' ? 'bg-amber-100' :
                          'bg-indigo-100'
                    }`}>
                    {activity.iconType === 'user_plus' && <Users className="w-4 h-4 text-blue-600" />}
                    {activity.iconType === 'check_circle' && <Send className="w-4 h-4 text-emerald-600" />}
                    {activity.iconType === 'alert_circle' && <Activity className="w-4 h-4 text-red-600" />}
                    {activity.iconType === 'clock' && <Activity className="w-4 h-4 text-amber-600" />}
                    {activity.iconType === 'send' && <Megaphone className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 font-medium truncate">
                      {activity.text}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {activity.subtext}
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 flex-shrink-0">
                    {activity.timeAgo}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('dashboard.no_activity')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}