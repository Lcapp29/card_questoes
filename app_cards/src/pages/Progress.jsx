import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Layers, 
  RotateCcw, 
  Shield, 
  Clock, 
  Sparkles,
  BookOpen,
  User,
  LogIn
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { fetchUserProgress } from '../services/progressService.js';

export default function Progress() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [progressItems, setProgressItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('ALL'); // 'ALL' | '7DAYS'

  // Carrega os dados da coleção user_progress
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!user) {
        setProgressItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await fetchUserProgress(user.uid);
        if (isMounted) {
          setProgressItems(data);
        }
      } catch (err) {
        console.error('Erro ao carregar estatísticas:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [user]);

  // Filtro de tempo: Histórico Geral vs Recente (Últimos 7 dias)
  const filteredItems = useMemo(() => {
    if (timeFilter === 'ALL') {
      return progressItems;
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return progressItems.filter((item) => {
      const itemDate = item.date || new Date(item.timestamp);
      return itemDate >= sevenDaysAgo;
    });
  }, [progressItems, timeFilter]);

  // Cálculos gerais para o filtro atual
  const stats = useMemo(() => {
    const total = filteredItems.length;
    let acertos = 0;
    let erros = 0;
    const ratingBreakdown = { Errei: 0, Difícil: 0, Ok: 0, Fácil: 0 };

    filteredItems.forEach((item) => {
      // Difícil, Ok e Fácil são ACERTOS. Apenas 'Errei' ou resultado === 'erro' é erro.
      const isErro = item.resultado === 'erro' || item.rating === 'Errei';
      if (isErro) {
        erros++;
      } else {
        acertos++;
      }

      const r = item.rating === 'Bom' ? 'Ok' : item.rating;
      if (ratingBreakdown[r] !== undefined) {
        ratingBreakdown[r]++;
      }
    });

    const percentAcerto = total > 0 ? Math.round((acertos / total) * 100) : 0;

    return {
      total,
      acertos,
      erros,
      percentAcerto,
      ratingBreakdown
    };
  }, [filteredItems]);

  // Estatísticas comparativas (Geral vs 7 dias)
  const comparisonStats = useMemo(() => {
    const isItemAcerto = (i) => i.resultado === 'acerto' || (i.rating && i.rating !== 'Errei');

    const totalAll = progressItems.length;
    const acertosAll = progressItems.filter(isItemAcerto).length;
    const percentAll = totalAll > 0 ? Math.round((acertosAll / totalAll) * 100) : 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentItems = progressItems.filter(i => (i.date || new Date(i.timestamp)) >= sevenDaysAgo);
    const totalRecent = recentItems.length;
    const acertosRecent = recentItems.filter(isItemAcerto).length;
    const percentRecent = totalRecent > 0 ? Math.round((acertosRecent / totalRecent) * 100) : 0;

    return {
      totalAll,
      percentAll,
      totalRecent,
      percentRecent,
      diff: percentRecent - percentAll
    };
  }, [progressItems]);

  // Detalhamento agrupado por Disciplina
  const disciplinaStats = useMemo(() => {
    const map = new Map();

    filteredItems.forEach((item) => {
      const disc = item.disciplina || 'Outros';
      if (!map.has(disc)) {
        map.set(disc, { total: 0, acertos: 0, erros: 0 });
      }
      const entry = map.get(disc);
      entry.total++;
      const isAcerto = item.resultado === 'acerto' || (item.rating && item.rating !== 'Errei');
      if (isAcerto) {
        entry.acertos++;
      } else {
        entry.erros++;
      }
    });

    const list = Array.from(map.entries()).map(([disciplina, data]) => {
      const percent = data.total > 0 ? Math.round((data.acertos / data.total) * 100) : 0;
      return {
        disciplina,
        total: data.total,
        acertos: data.acertos,
        erros: data.erros,
        percent
      };
    });

    // Ordena pelo maior volume de questões respondidas
    return list.sort((a, b) => b.total - a.total);
  }, [filteredItems]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Topo / Navegação */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Página Inicial</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <User className="w-4 h-4 text-yellow-400" />
            <span>{user?.displayName || user?.email || (user?.isAnonymous ? 'Visitante' : 'Não autenticado')}</span>
          </div>
        </div>

        {/* Header da Página */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold tracking-wide uppercase">
            <BarChart3 className="w-4 h-4 text-yellow-400" />
            <span>Evolução & Análise de Desempenho</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Meu <span className="text-yellow-400">Progresso na PRF</span>
          </h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            Acompanhe o volume de questões respondidas, a taxa de acertos e o rendimento por disciplina sincronizados no Firebase Firestore.
          </p>
        </div>

        {/* Se o usuário não estiver logado */}
        {!user && (
          <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center mx-auto">
              <LogIn className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Identifique-se para ver seu histórico</h2>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Faça login ou crie sua conta para registrar e visualizar seu progresso de estudo em qualquer computador ou celular.
            </p>
            <div>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-sm transition-all"
              >
                <span>Acessar / Cadastrar</span>
              </Link>
            </div>
          </div>
        )}

        {/* Filtro de Tempo (Geral vs Recente 7 Dias) */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-gray-800/80 p-3 rounded-2xl border border-gray-700/60">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-300 px-2">
            <Calendar className="w-4 h-4 text-yellow-400" />
            <span>Período de Análise</span>
          </div>

          <div className="flex rounded-xl bg-gray-900 p-1 border border-gray-700/60">
            <button
              type="button"
              onClick={() => setTimeFilter('ALL')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                timeFilter === 'ALL'
                  ? 'bg-yellow-500 text-gray-950 shadow-sm font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Histórico Geral (Todo o Tempo)
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('7DAYS')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                timeFilter === '7DAYS'
                  ? 'bg-yellow-500 text-gray-950 shadow-sm font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Recente (Últimos 7 dias)
            </button>
          </div>
        </div>

        {/* Estado de Carregamento */}
        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="inline-block w-8 h-8 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm">Carregando métricas do Firestore...</p>
          </div>
        ) : stats.total === 0 ? (
          /* Estado Vazio */
          <div className="bg-gray-800/80 border border-gray-700/80 rounded-2xl p-10 text-center space-y-4">
            <BookOpen className="w-12 h-12 text-gray-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">Nenhum registro encontrado</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              {timeFilter === '7DAYS'
                ? 'Você não respondeu cards nos últimos 7 dias. Alterne para o histórico geral ou inicie uma nova sessão.'
                : 'Você ainda não possui flashcards respondidos no sistema. Inicie sua primeira sessão de estudos!'}
            </p>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-sm"
              >
                <span>Iniciar Estudo Agora</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Conteúdo com Métricas */
          <div className="space-y-8">
            
            {/* 1. Cards das Métricas Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Total Respondidas */}
              <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 space-y-2 shadow-lg">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Total Respondidas
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
                    {stats.total}
                  </span>
                  <span className="text-xs text-gray-400">questões</span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {timeFilter === 'ALL' ? 'Acumulado geral' : 'Nos últimos 7 dias'}
                </p>
              </div>

              {/* % de Acerto */}
              <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 space-y-2 shadow-lg">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Taxa de Acerto
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-yellow-400 tabular-nums">
                    {stats.percentAcerto}%
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">
                    {stats.acertos} certas
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">
                  {stats.erros} erradas computadas
                </p>
              </div>

              {/* Comparativo de Evolução */}
              <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 space-y-2 shadow-lg">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Evolução Recente (7d)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-3xl sm:text-4xl font-extrabold tabular-nums ${
                    comparisonStats.diff >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {comparisonStats.diff >= 0 ? `+${comparisonStats.diff}%` : `${comparisonStats.diff}%`}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  7 dias: <span className="text-white font-semibold">{comparisonStats.percentRecent}%</span> vs Geral: <span className="text-white font-semibold">{comparisonStats.percentAll}%</span>
                </p>
              </div>

              {/* Classificação Anki */}
              <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 space-y-2 shadow-lg">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Distribuição Anki
                </span>
                <div className="grid grid-cols-2 gap-1 text-xs pt-1">
                  <span className="text-red-400">Erros: {stats.ratingBreakdown.Errei}</span>
                  <span className="text-amber-400">Difícil: {stats.ratingBreakdown.Difícil}</span>
                  <span className="text-blue-400">Ok: {stats.ratingBreakdown.Ok}</span>
                  <span className="text-emerald-400">Fácil: {stats.ratingBreakdown.Fácil}</span>
                </div>
                <p className="text-[11px] text-gray-500 pt-1">
                  Baseado nas autoavaliações
                </p>
              </div>

            </div>

            {/* 2. Detalhamento de Acertos e Erros por Disciplina */}
            <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-gray-700/60">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-300">
                  <Shield className="w-4 h-4 text-yellow-500" />
                  <span>Rendimento por Disciplina ({disciplinaStats.length} disciplinas estudadas)</span>
                </div>
              </div>

              <div className="space-y-5">
                {disciplinaStats.map((item) => {
                  return (
                    <div key={item.disciplina} className="space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <span className="font-bold text-white text-sm">
                          {item.disciplina}
                        </span>
                        <div className="flex items-center gap-3 text-gray-400">
                          <span className="text-emerald-400 font-semibold">{item.acertos} acertos</span>
                          <span>·</span>
                          <span className="text-red-400 font-semibold">{item.erros} erros</span>
                          <span>·</span>
                          <span className="text-yellow-400 font-bold tabular-nums text-sm">
                            {item.percent}% de acerto
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso Visual Bicolor */}
                      <div className="w-full h-3 bg-gray-900 rounded-full overflow-hidden flex border border-gray-700/60">
                        {/* Segmento de Acertos */}
                        <div
                          style={{ width: `${item.percent}%` }}
                          className="bg-emerald-500 h-full transition-all duration-300"
                          title={`${item.acertos} acertos (${item.percent}%)`}
                        />
                        {/* Segmento de Erros */}
                        <div
                          style={{ width: `${100 - item.percent}%` }}
                          className="bg-red-500/80 h-full transition-all duration-300"
                          title={`${item.erros} erros (${100 - item.percent}%)`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
