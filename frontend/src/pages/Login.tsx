import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/context/AuthContext"
import { apiUrl } from "@/lib/api"
import { useNavigate } from "react-router-dom"
import { useToast } from "@/components/ui/use-toast"
import { Rocket, Mail, Lock, Sparkles } from "lucide-react"
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
      const response = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao entrar')
      }

      login(data.token, data.user)
      toast({
        title: "✨ Bem-vindo de volta!",
        description: "Login realizado com sucesso.",
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
        title: `❌ ${t('login.error_title')}`,
        description: translatedError,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative max-w-md w-full">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl blur-xl opacity-30 animate-pulse" />

        {/* Main card */}
        <div className="relative glass rounded-3xl p-8 shadow-2xl border border-slate-800/50">
          {/* Logo section */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
              <div className="relative w-16 h-16 bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform duration-500">
                <Rocket className="w-8 h-8 text-white" />
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-white animate-pulse" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-100 mb-1">
              <span className="gradient-text">Sure</span>
              <span className="text-white">Send</span>
            </h1>
            <p className="text-slate-400 text-sm">{t('login.subtitle')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t('login.email')}
              </Label>
              <div className="relative group">
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@suresend.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-slate-950/50 border-slate-700 focus:border-violet-500 focus:ring-violet-500/20 text-white placeholder:text-slate-600 h-12 rounded-xl transition-all duration-300"
                  required
                />
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/0 via-violet-600/10 to-violet-600/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                {t('login.password')}
              </Label>
              <div className="relative group">
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-slate-950/50 border-slate-700 focus:border-violet-500 focus:ring-violet-500/20 text-white placeholder:text-slate-600 h-12 rounded-xl transition-all duration-300"
                  required
                />
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/0 via-violet-600/10 to-violet-600/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 transition-all duration-300 hover:shadow-violet-500/40 hover:scale-[1.02] relative overflow-hidden group"
              disabled={loading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              {loading ? (
                <div className="flex items-center gap-2 relative z-10">
                  <div className="h-5 w-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  <span>{t('login.loading')}</span>
                </div>
              ) : (
                <span className="relative z-10">{t('login.submit')}</span>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm text-slate-500">
            <p>🔒 Seus dados estão protegidos</p>
          </div>
        </div>
      </div>
    </div>
  )
}