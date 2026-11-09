import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  Mail, 
  Lock, 
  User, 
  LogIn, 
  UserPlus, 
  ArrowLeft, 
  AlertCircle, 
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, signup, loginAnonymous, loginLocalGuest, user } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Se já estiver logado, redireciona para a Página Inicial
  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!displayName.trim()) {
          throw new Error('Informe seu nome ou apelido de estudos.');
        }
        await signup(email, password, displayName);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      console.error('Erro de autenticação:', err);
      let message = 'Ocorreu um erro ao processar. Tente novamente.';
      
      const errCode = err?.code || '';
      const errMsg = err?.message || '';

      if (errCode === 'auth/invalid-credential' || errCode === 'auth/wrong-password' || errCode === 'auth/user-not-found') {
        message = 'E-mail ou senha incorretos.';
      } else if (errCode === 'auth/email-already-in-use') {
        message = 'Este e-mail já está cadastrado. Tente entrar com sua senha.';
      } else if (errCode === 'auth/weak-password') {
        message = 'A senha deve ter pelo menos 6 caracteres.';
      } else if (errCode === 'auth/invalid-email') {
        message = 'Por favor, informe um endereço de e-mail válido.';
      } else if (errCode === 'auth/too-many-requests') {
        message = 'Muitas tentativas consecutivas. Aguarde alguns instantes antes de tentar novamente.';
      } else if (errCode === 'auth/network-request-failed') {
        message = 'Falha de conexão com a internet. Tente novamente em instantes.';
      } else if (errCode === 'auth/api-key-not-valid' || errMsg.includes('api-key-not-valid')) {
        message = 'Serviço de autenticação temporariamente indisponível. Você pode estudar agora como Visitante.';
      } else if (err?.message === 'Informe seu nome ou apelido de estudos.') {
        message = err.message;
      } else {
        message = 'Não foi possível processar sua solicitação no momento. Tente novamente.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginAnonymous();
      navigate('/');
    } catch (err) {
      console.warn('Fallback ativado ao entrar como visitante:', err);
      loginLocalGuest('Visitante');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        
        {/* Link Voltar */}
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Página Inicial</span>
          </Link>
        </div>

        {/* Card do Formulário */}
        <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-7 shadow-2xl backdrop-blur-sm space-y-6">
          
          {/* Cabeçalho */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isRegister ? 'Criar Conta de Estudos' : 'Acessar Flashcards PRF'}
            </h1>
            <p className="text-xs text-gray-400">
              {isRegister
                ? 'Cadastre-se para sincronizar seu progresso e histórico em qualquer dispositivo.'
                : 'Entre com sua conta para salvar suas estatísticas e evolução.'}
            </p>
          </div>

          {/* Abas Entrar / Cadastrar */}
          <div className="flex rounded-xl bg-gray-900 p-1 border border-gray-700/60">
            <button
              type="button"
              onClick={() => { setIsRegister(false); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                !isRegister ? 'bg-yellow-500 text-gray-950 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setIsRegister(true); setError(''); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                isRegister ? 'bg-yellow-500 text-gray-950 shadow-sm' : 'text-gray-400 hover:text-white'
              }`}
            >
              Cadastrar
            </button>
          </div>

          {/* Alerta de Erro */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl space-y-2 text-xs text-red-300">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-300">Nome / Apelido</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Ex: Futuro Policial"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300">E-mail</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-gray-300">Senha</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl shadow-lg shadow-yellow-500/15 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Criar Minha Conta</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-gray-700 w-full" />
            <span className="bg-gray-800 px-2 text-[11px] text-gray-500 uppercase tracking-wider relative">
              ou
            </span>
          </div>

          {/* Entrar como Visitante Anônimo */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGuestLogin}
            className="w-full py-2.5 bg-gray-700/60 hover:bg-gray-700 border border-gray-600/60 text-gray-200 font-semibold rounded-xl transition-all text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
            <span>Entrar como Visitante (Estudo Rápido)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
