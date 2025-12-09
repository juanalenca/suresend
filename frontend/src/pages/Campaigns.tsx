import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useTranslation } from "react-i18next"

interface Campaign {
    id: string
    subject: string
    status: string
    sentCount: number
    openCount: number
    createdAt: string
}

export function Campaigns() {
    const { t } = useTranslation()
    const [data, setData] = useState<Campaign[]>([])
    const [loading, setLoading] = useState(true)
    const navigate = useNavigate()

    useEffect(() => {
        // Fetch real data from Backend
        fetch('http://localhost:3000/campaigns')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch')
                return res.json()
            })
            .then(data => {
                console.log('Campaigns loaded:', data)
                setData(data)
            })
            .catch(err => {
                console.error('Error loading campaigns:', err)
                // Optional: set empty data on error
                setData([])
            })
            .finally(() => setLoading(false))
    }, [])

    return (
        <div className="min-h-screen bg-slate-950 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{t('campaigns.title')}</h1>
                        <p className="text-slate-400">{t('campaigns.subtitle')}</p>
                    </div>
                    <Button
                        onClick={() => navigate('/campaigns/new')}
                        className="bg-violet-600 hover:bg-violet-700 text-white"
                    >
                        {t('buttons.new_campaign')}
                    </Button>
                </div>

                <div className="rounded-md border border-slate-800">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-slate-900/50">
                                <TableHead className="text-slate-400">{t('campaigns.columns.subject')}</TableHead>
                                <TableHead className="text-slate-400">{t('campaigns.columns.status')}</TableHead>
                                <TableHead className="text-slate-400">{t('campaigns.columns.sent')}</TableHead>
                                <TableHead className="text-slate-400">{t('campaigns.columns.opens')}</TableHead>
                                <TableHead className="text-slate-400">{t('campaigns.columns.created_at')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-slate-400">{t('campaigns.loading')}</TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-slate-400">{t('campaigns.empty')}</TableCell>
                                </TableRow>
                            ) : (
                                data.map((campaign) => (
                                    <TableRow key={campaign.id} className="border-slate-800 hover:bg-slate-900/50">
                                        <TableCell className="text-slate-200 font-medium">{campaign.subject}</TableCell>
                                        <TableCell>
                                            <Badge variant={campaign.status === 'COMPLETED' ? 'default' : 'secondary'}>
                                                {t(`campaigns.status.${campaign.status}`) || campaign.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-slate-200">{campaign.sentCount}</TableCell>
                                        <TableCell className="text-slate-200">{campaign.openCount}</TableCell>
                                        <TableCell className="text-slate-400">
                                            {new Date(campaign.createdAt).toLocaleDateString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    )
}
