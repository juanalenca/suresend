import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Removi o import { Button } pois não é mais necessário

export function Unsubscribe() {
    const { token } = useParams<{ token: string }>();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            return;
        }

        fetch(`http://localhost:3000/unsubscribe/${token}`)
            .then(async (res) => {
                if (res.ok) {
                    setStatus('success');
                } else {
                    setStatus('error');
                }
            })
            .catch(() => setStatus('error'));
    }, [token]);

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-slate-900 border-slate-800 text-center">
                <CardHeader>
                    <div className="mx-auto w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-2xl">
                        {status === 'success' ? '👋' : (status === 'error' ? '⚠️' : '⏳')}
                    </div>
                    <CardTitle className="text-white">
                        {status === 'loading' && 'Processando...'}
                        {status === 'success' && 'Descadastro Confirmado'}
                        {status === 'error' && 'Link Inválido'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-slate-400">
                    {status === 'loading' && (
                        <p>Por favor, aguarde um momento enquanto removemos seu e-mail.</p>
                    )}
                    
                    {status === 'success' && (
                        <div>
                            <p className="mb-4">
                                Que pena ver você partir. Você foi removido da nossa lista com sucesso e não receberá mais e-mails.
                            </p>
                            <p className="text-sm text-slate-600 mt-6">
                                Você pode fechar esta página com segurança.
                            </p>
                        </div>
                    )}

                    {status === 'error' && (
                        <p>Não encontramos este cadastro. É possível que você já tenha saído da lista anteriormente.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}