import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"
import { Sparkles, Zap, Shield, TrendingUp } from "lucide-react"

function App() {
  const navigate = useNavigate()

  const features = [
    {
      icon: Zap,
      title: "Envios Rápidos",
      description: "Dispare milhares de emails em minutos"
    },
    {
      icon: Shield,
      title: "100% Seguro",
      description: "Seus dados protegidos com criptografia"
    },
    {
      icon: TrendingUp,
      title: "Analytics",
      description: "Acompanhe métricas em tempo real"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative max-w-4xl w-full">
        {/* Main card */}
        <div className="glass rounded-3xl p-12 text-center space-y-8 border border-slate-800/50 shadow-2xl">
          {/* Logo with glow */}
          <div className="flex justify-center mb-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 animate-pulse" />
              <div className="relative w-24 h-24 bg-gradient-to-br from-violet-600 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500">
                <span className="text-5xl">🚀</span>
                <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-white animate-pulse" />
              </div>
            </div>
          </div>
          
          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold">
              <span className="text-white">Bem-vindo ao </span>
              <span className="gradient-text">SureSend</span>
            </h1>
            
            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Sua plataforma de e-mail marketing self-hosted está pronta para transformar sua comunicação.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="glass rounded-2xl p-6 border border-slate-800/50 hover:border-violet-500/50 transition-all duration-500 hover:-translate-y-2 group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500 shadow-lg">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button 
              size="lg" 
              className="text-lg px-8 h-14 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/50"
              onClick={() => navigate('/dashboard')}
            >
              <Sparkles className="w-5 h-5" />
              Acessar Dashboard
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 h-14 border-2 border-slate-700 hover:border-violet-500 text-slate-300 hover:text-white"
            >
              Ver Documentação
            </Button>
          </div>

          {/* Footer text */}
          <p className="text-slate-600 text-sm pt-4">
            🔒 100% Open Source • Self-Hosted • Privacy First
          </p>
        </div>

        {/* Floating elements */}
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-violet-600/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-purple-600/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </div>
  )
}

export default App