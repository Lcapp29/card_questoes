import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  ArrowLeft, 
  Users, 
  BarChart3, 
  AlertTriangle, 
  Award, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Lock,
  BookOpen,
  Sparkles,
  TrendingDown,
  UserCheck
} from 'lucide-react';
import { useAuth, isAdminUser } from '../contexts/AuthContext.jsx';
import { fetchAllUsersProgress } from '../services/progressService.js';
import questionsData from '../data/questoes_prf.json';
import { formatTopicName } from '../components/Flashcard.jsx';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [globalProgress, setGlobalProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mapeamento de questões do JSON para busca rápida
  const questionsMap = useMemo(() => {
    const list = Array.isArray(questionsData) ? questionsData : (questionsData?.questoes || []);
    const map = new Map();
    list.forEach(q => {
      if (q.id) {
        map.set(q.id, q);
      }
    });
    return map;
  }, []);

  const loadAdminData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await fetchAllUsersProgress();
      setGlobalProgress(data);
    } catch (err) {
      console.error('Erro ao carregar dados administrativos:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && isAdminUser(user)) {
      loadAdminData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  // Se não for admin ou não estiver logado
  if (!authLoading && (!user || !isAdminUser(user))) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-900 border border-red-500/30 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto border border-red-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Acesso Restrito</h1>
            <p className="text-xs text-gray-400">
              Esta área é restrita e exclusiva para o administrador do sistema (Cappola).
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl text-sm transition-all shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para a Página Inicial</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Cálculos de Usuários e Ranking
  const usersRanking = useMemo(() => {
    const userMap = new Map();

    globalProgress.forEach((item) => {
      const uid = item.userId || 'Anônimo';
      if (!userMap.has(uid)) {
        userMap.set(uid, {
          userId: uid,
          name: uid.startsWith('guest_') ? 'Visitante Local' : (uid.length > 20 ? `Usuário (${uid.substring(0, 6)}...)` : uid),
          total: 0,
          acertos: 0,
          erros: 0,
          lastActive: item.date || new Date()
        });
      }

      const u = userMap.get(uid);
      u.total++;
      const isErro = item.resultado === 'erro' || item.rating === 'Errei';
      if (isErro) u.erros++;
      else u.acertos++;

      const itemDate = item.date || new Date(item.timestamp);
      if (itemDate > u.lastActive) {
        u.lastActive = itemDate;
      }
    });

    return Array.from(userMap.values())
      .map(u => ({
        ...u,
        percent: u.total > 0 ? Math.round((u.acertos / u.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  }, [globalProgress]);

  // Ranking de Questões Mais Erradas
  const questionsMistakesRanking = useMemo(() => {
    const mistakeMap = new Map();

    globalProgress.forEach((item) => {
      const isErro = item.resultado === 'erro' || item.rating === 'Errei';
      if (!isErro) return;

      const qId = item.questionId || 'desconhecido';
      if (!mistakeMap.has(qId)) {
        const qDetails = questionsMap.get(qId) || {};
        mistakeMap.set(qId, {
          questionId: qId,
          errosCount: 0,
          pergunta: qDetails.pergunta || 'Enunciado não encontrado no JSON',
          disciplina: qDetails.disciplina || item.disciplina || 'Geral',
          topico: formatTopicName(qDetails.topico_edital || item.topico, qDetails.disciplina || item.disciplina) || 'Tópico Geral'
        });
      }
      mistakeMap.get(qId).errosCount++;
    });

    return Array.from(mistakeMap.values())
      .sort((a, b) => b.errosCount - a.errosCount)
      .slice(0, 10); // Top 10 mais erradas
  }, [globalProgress, questionsMap]);

  // Ranking de Tópicos Mais Errados
  const topicsMistakesRanking = useMemo(() => {
    const topicMap = new Map();

    globalProgress.forEach((item) => {
      const isErro = item.resultado === 'erro' || item.rating === 'Errei';
      const disc = item.disciplina || 'Geral';
      const rawTopic = item.topico || item.topico_edital || 'Tópico Geral';
      const cleanTopic = formatTopicName(rawTopic, disc) || rawTopic;
      const key = `${disc}___${cleanTopic}`;

      if (!topicMap.has(key)) {
        topicMap.set(key, {
          disciplina: disc,
          topico: cleanTopic,
          erros: 0,
          total: 0
        });
      }

      const t = topicMap.get(key);
      t.total++;
      if (isErro) t.erros++;
    });

    return Array.from(topicMap.values())
      .map(t => ({
        ...t,
        errorRate: t.total > 0 ? Math.round((t.erros / t.total) * 100) : 0
      }))
      .sort((a, b) => b.erros - a.erros)
      .slice(0, 10); // Top 10 tópicos com mais erros
  }, [globalProgress]);

  // Métricas Globais Resumidas
  const globalStats = useMemo(() => {
    const totalAnswers = globalProgress.length;
    let acertos = 0;
    let erros = 0;

    globalProgress.forEach(i => {
      if (i.resultado === 'erro' || i.rating === 'Errei') erros++;
      else acertos++;
    });

    const percent = totalAnswers > 0 ? Math.round((acertos / totalAnswers) * 100) : 0;
    const activeUsers = usersRanking.length;

    return {
      totalAnswers,
      acertos,
      erros,
      percent,
      activeUsers
    };
  }, [globalProgress, usersRanking]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Barra Superior */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-900 border border-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao App</span>
            </Link>

            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-xl text-yellow-400 text-xs font-bold">
              <Shield className="w-4 h-4" />
              <span>Painel do Administrador (Cappola)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadAdminData(true)}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-yellow-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Atualizar Dados</span>
            </button>
          </div>
        </div>

        {/* Cabeçalho */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Painel de <span className="text-yellow-400">Administração & BI</span></span>
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl">
            Monitoramento em tempo real do uso da plataforma, engajamento dos alunos e análise das questões e tópicos que geram mais dificuldades.
          </p>
        </div>

        {/* Estado de Carregamento */}
        {loading ? (
          <div className="py-24 text-center text-gray-400 space-y-3">
            <div className="inline-block w-10 h-10 border-3 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Sincronizando dados globais do Firestore...</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* 1. Cards de Resumo Geral */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 space-y-2 shadow-lg">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-yellow-400" />
                  <span>Usuários Ativos</span>
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
                    {globalStats.activeUsers}
                  </span>
                  <span className="text-xs text-gray-400">contas</span>
                </div>
                <p className="text-[11px] text-gray-500">Com histórico registrado</p>
              </div>

              <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 space-y-2 shadow-lg">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-yellow-400" />
                  <span>Total de Questões Respondidas</span>
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
                    {globalStats.totalAnswers}
                  </span>
                  <span className="text-xs text-gray-400">respostas</span>
                </div>
                <p className="text-[11px] text-gray-500">Volume global na plataforma</p>
              </div>

              <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 space-y-2 shadow-lg">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Taxa de Acerto Média</span>
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-yellow-400 tabular-nums">
                    {globalStats.percent}%
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">
                    {globalStats.acertos} certas
                  </span>
                </div>
                <p className="text-[11px] text-gray-500">{globalStats.erros} erros gerais</p>
              </div>

              <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 space-y-2 shadow-lg">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>Banco de Questões</span>
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white tabular-nums">
                    {questionsMap.size}
                  </span>
                  <span className="text-xs text-gray-400">cards ativos</span>
                </div>
                <p className="text-[11px] text-gray-500">Disponíveis no JSON</p>
              </div>

            </div>

            {/* 2. Ranking de Usuários */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-200">
                  <Award className="w-5 h-5 text-yellow-400" />
                  <span>Ranking de Usuários ({usersRanking.length})</span>
                </div>
              </div>

              {usersRanking.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-xs italic">
                  Nenhum usuário respondeu questões até o momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="text-gray-400 uppercase tracking-wider bg-gray-950/60 border-b border-gray-800">
                      <tr>
                        <th className="py-3 px-4 rounded-l-xl">Posição</th>
                        <th className="py-3 px-4">Usuário</th>
                        <th className="py-3 px-4 text-center">Questões Respondidas</th>
                        <th className="py-3 px-4 text-center">Acertos</th>
                        <th className="py-3 px-4 text-center">Erros</th>
                        <th className="py-3 px-4 text-right rounded-r-xl">Taxa de Acerto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {usersRanking.map((u, index) => (
                        <tr key={u.userId} className="hover:bg-gray-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-yellow-400">
                            {index === 0 ? '🥇 1º' : index === 1 ? '🥈 2º' : index === 2 ? '🥉 3º' : `${index + 1}º`}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-white">
                            {u.name}
                            {u.userId === user?.uid && (
                              <span className="ml-2 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-md text-[10px]">
                                Você (Admin)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-white tabular-nums">
                            {u.total}
                          </td>
                          <td className="py-3.5 px-4 text-center text-emerald-400 font-medium tabular-nums">
                            {u.acertos}
                          </td>
                          <td className="py-3.5 px-4 text-center text-red-400 font-medium tabular-nums">
                            {u.erros}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-yellow-400 tabular-nums">
                            {u.percent}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Grid 2 colunas: Questões mais erradas & Tópicos mais errados */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Questões Mais Erradas */}
              <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-200">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Questões Mais Erradas (Top 10)</span>
                  </div>
                </div>

                {questionsMistakesRanking.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs italic">
                    Nenhum erro registrado ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {questionsMistakesRanking.map((q, idx) => (
                      <div key={q.questionId} className="bg-gray-950/60 border border-gray-800 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-yellow-400">#{idx + 1} · {q.disciplina}</span>
                          <span className="px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 font-bold">
                            {q.errosCount} {q.errosCount === 1 ? 'erro' : 'erros'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 line-clamp-2">
                          {q.pergunta}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          <span className="text-gray-400 font-medium">Tópico:</span> {q.topico}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tópicos Mais Errados */}
              <div className="bg-gray-900/90 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-gray-200">
                    <TrendingDown className="w-4 h-4 text-amber-400" />
                    <span>Tópicos Mais Difíceis / Errados (Top 10)</span>
                  </div>
                </div>

                {topicsMistakesRanking.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-xs italic">
                    Nenhum dado de tópico registrado ainda.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topicsMistakesRanking.map((t, idx) => (
                      <div key={idx} className="bg-gray-950/60 border border-gray-800 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-yellow-400">{t.disciplina}</span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                            {t.erros} erros de {t.total} ({t.errorRate}% de erro)
                          </span>
                        </div>
                        <p className="text-xs font-medium text-white truncate">
                          {t.topico}
                        </p>
                        <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden flex">
                          <div
                            style={{ width: `${t.errorRate}%` }}
                            className="bg-red-500 h-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
