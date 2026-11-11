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
  LogIn,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { fetchUserProgress } from '../services/progressService.js';
import { formatTopicName } from '../components/Flashcard.jsx';

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

  // Estado das disciplinas expandidas para visualizar os tópicos
  const [expandedDisciplinas, setExpandedDisciplinas] = useState(new Set());

  // Alterna a exibição dos tópicos de uma disciplina
  const toggleExpand = (disc) => {
    setExpandedDisciplinas((prev) => {
      const next = new Set(prev);
      if (next.has(disc)) {
        next.delete(disc);
      } else {
        next.add(disc);
      }
      return next;
    });
  };

  // Expandir ou recolher todos os tópicos de uma vez
  const expandAll = () => {
    setExpandedDisciplinas(new Set(disciplinaStats.map(d => d.disciplina)));
  };

  const collapseAll = () => {
    setExpandedDisciplinas(new Set());
  };

  // Detalhamento agrupado por Disciplina e por Tópico
  const disciplinaStats = useMemo(() => {
    const map = new Map();

    filteredItems.forEach((item) => {
      const disc = item.disciplina || 'Outros';
      if (!map.has(disc)) {
        map.set(disc, { total: 0, acertos: 0, erros: 0, topicsMap: new Map() });
      }
      const entry = map.get(disc);
      entry.total++;
      const isAcerto = item.resultado === 'acerto' || (item.rating && item.rating !== 'Errei');
      if (isAcerto) {
        entry.acertos++;
      } else {
        entry.erros++;
      }

      // Normaliza o nome do tópico para exibição limpa
      const rawTopic = item.topico || item.topico_edital || 'Tópico Geral';
      const cleanTopic = formatTopicName(rawTopic, disc) || rawTopic;

      if (!entry.topicsMap.has(cleanTopic)) {
        entry.topicsMap.set(cleanTopic, {
          nome: cleanTopic,
          total: 0,
          acertos: 0,
          erros: 0
        });
      }

      const topicEntry = entry.topicsMap.get(cleanTopic);
      topicEntry.total++;
      if (isAcerto) {
        topicEntry.acertos++;
      } else {
        topicEntry.erros++;
      }
    });

    const list = Array.from(map.entries()).map(([disciplina, data]) => {
      const percent = data.total > 0 ? Math.round((data.acertos / data.total) * 100) : 0;
      
      const topicosList = Array.from(data.topicsMap.values())
        .map(t => ({
          ...t,
          percent: t.total > 0 ? Math.round((t.acertos / t.total) * 100) : 0
        }))
        .sort((a, b) => b.total - a.total);

      return {
        disciplina,
        total: data.total,
        acertos: data.acertos,
        erros: data.erros,
        percent,
        topicos: topicosList
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

            {/* 2. Detalhamento de Acertos e Erros por Disciplina e por Tópico */}
            <div className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-gray-700/60">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-300">
                  <Shield className="w-4 h-4 text-yellow-500" />
                  <span>Rendimento por Disciplina ({disciplinaStats.length} disciplinas estudadas)</span>
                </div>

                {disciplinaStats.length > 0 && (
                  <button
                    type="button"
                    onClick={expandedDisciplinas.size === disciplinaStats.length ? collapseAll : expandAll}
                    className="inline-flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 font-semibold px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-700 hover:border-yellow-500/50 transition-all cursor-pointer shadow-sm"
                  >
                    {expandedDisciplinas.size === disciplinaStats.length ? (
                      <>
                        <ChevronUp className="w-3.5 h-3.5" />
                        <span>Recolher Todos os Tópicos</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3.5 h-3.5" />
                        <span>Expandir Todos os Tópicos</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {disciplinaStats.map((item) => {
                  const isExpanded = expandedDisciplinas.has(item.disciplina);
                  const hasTopics = item.topicos && item.topicos.length > 0;

                  return (
                    <div 
                      key={item.disciplina} 
                      className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                        isExpanded 
                          ? 'bg-gray-900/80 border-gray-600/80 shadow-md' 
                          : 'bg-gray-900/40 hover:bg-gray-900/70 border-gray-700/60'
                      }`}
                    >
                      {/* Cabeçalho Clicável da Disciplina */}
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.disciplina)}
                        className="w-full text-left p-4 cursor-pointer focus:outline-none focus:ring-1 focus:ring-yellow-500/50 space-y-3"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1 rounded-md bg-gray-800 text-gray-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180 text-yellow-400' : ''
                            }`}>
                              <ChevronDown className="w-4 h-4" />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-white text-sm sm:text-base">
                                {item.disciplina}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[11px] font-semibold">
                                {item.topicos.length} {item.topicos.length === 1 ? 'tópico' : 'tópicos'}
                              </span>
                              <span className="text-[11px] text-gray-500 font-normal hidden sm:inline">
                                (clique para {isExpanded ? 'ocultar' : 'ver'} tópicos)
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-gray-400 ml-auto">
                            <span className="text-emerald-400 font-semibold">{item.acertos} acertos</span>
                            <span>·</span>
                            <span className="text-red-400 font-semibold">{item.erros} erros</span>
                            <span>·</span>
                            <span className="text-yellow-400 font-bold tabular-nums text-sm">
                              {item.percent}% de acerto
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progresso Visual Bicolor da Disciplina */}
                        <div className="w-full h-3 bg-gray-950 rounded-full overflow-hidden flex border border-gray-800">
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
                      </button>

                      {/* Tópicos Expandidos desta Disciplina */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-gray-800/80 bg-gray-950/40">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 pt-2">
                            <span className="flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-yellow-400" />
                              <span>Tópicos Estudados</span>
                            </span>
                            <span>Desempenho</span>
                          </div>

                          {!hasTopics ? (
                            <div className="text-xs text-gray-500 italic p-3 text-center">
                              Nenhum tópico detalhado disponível para esta disciplina.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {item.topicos.map((topico) => (
                                <div
                                  key={topico.nome}
                                  className="bg-gray-800/70 border border-gray-700/50 hover:border-gray-600/70 rounded-xl p-3 space-y-2 transition-colors"
                                >
                                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                                    <div className="flex items-center gap-2 max-w-[70%]">
                                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
                                      <span className="font-medium text-gray-200 text-xs sm:text-sm truncate" title={topico.nome}>
                                        {topico.nome}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-gray-400 ml-auto">
                                      <span className="text-emerald-400 font-medium">{topico.acertos} acertos</span>
                                      <span>·</span>
                                      <span className="text-red-400 font-medium">{topico.erros} erros</span>
                                      <span>·</span>
                                      <span className="text-yellow-400 font-bold tabular-nums">
                                        {topico.percent}%
                                      </span>
                                    </div>
                                  </div>

                                  {/* Barra de Progresso Visual Bicolor do Tópico */}
                                  <div className="w-full h-2 bg-gray-950 rounded-full overflow-hidden flex border border-gray-800/80">
                                    <div
                                      style={{ width: `${topico.percent}%` }}
                                      className="bg-emerald-500 h-full transition-all duration-300"
                                      title={`${topico.acertos} acertos (${topico.percent}%)`}
                                    />
                                    <div
                                      style={{ width: `${100 - topico.percent}%` }}
                                      className="bg-red-500/80 h-full transition-all duration-300"
                                      title={`${topico.erros} erros (${100 - topico.percent}%)`}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

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
