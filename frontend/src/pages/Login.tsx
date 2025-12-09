import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/components/ui/use-toast"
import { Rocket } from "lucide-react"
import { useTranslation } from "react-i18next"

export function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao entrar')
      }

      login(data.token)
      toast({
        title: t('login.title'),
        description: t('login.subtitle'),
      })
      navigate('/dashboard')
    } catch (error: any) {
      const errorMessage = error.message || ''
      let translatedError = t('errors.generic')

      if (
        errorMessage.includes('Invalid credentials') ||
        errorMessage.includes('User not found') ||
        errorMessage.includes('Credenciais inválidas')
      ) {
        translatedError = t('errors.invalid_auth')
      }

      toast({
        variant: "destructive",
        title: t('login.title'), // Or a specific error title if added
        description: translatedError,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="max-w-md w-full p-8 bg-slate-900 rounded-lg border border-slate-800 shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-violet-500/10 rounded-full flex items-center justify-center mb-4">
            <Rocket className="w-6 h-6 text-violet-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">{t('login.title')}</h1>
          <p className="text-slate-400 text-sm mt-1">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('login.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@suresend.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-slate-950 border-slate-800 focus:ring-violet-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('login.password')}</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-slate-950 border-slate-800 focus:ring-violet-500"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium transition-all"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                <span>{t('login.loading')}</span>
              </div>
            ) : (
              t('login.submit')
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}