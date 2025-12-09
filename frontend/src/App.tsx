import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

function App() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl text-center max-w-md w-full">
        <div className="mb-6 flex justify-center">
          <span className="text-6xl bg-slate-800 p-4 rounded-full">🚀</span>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">
          Bem-vindo ao SureSend
        </h1>
        
        <p className="text-slate-400 mb-8">
          Sua plataforma de e-mail marketing self-hosted está pronta.
        </p>

        <div className="flex flex-col gap-3">
          {/* Botão Principal - Agora leva para o Dashboard */}
          <Button 
            size="lg" 
            className="w-full font-bold text-md"
            onClick={() => navigate('/dashboard')}
          >
            Acessar Dashboard
          </Button>
          
          {/* Botão Secundário - Corrigido para ficar bonito no escuro */}
          <Button 
            variant="ghost" 
            size="lg" 
            className="w-full text-slate-400 hover:text-white hover:bg-slate-800"
          >
            Ver Documentação
          </Button>
        </div>
      </div>
    </div>
  )
}

export default App