import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Shield, 
  Sparkles, 
  FileText, 
  Layers, 
  Play, 
  Filter, 
  BookOpen, 
  AlertCircle, 
  Shuffle, 
  CheckCircle,
  HelpCircle,
  BarChart3,
  Target,
  User,
  LogOut,
  LogIn
} from 'lucide-react';
import questionsData from '../data/questoes_prf.json';
import { formatTopicName } from '../components/Flashcard.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // Lista base de todas as questões
  const allQuestions = useMemo(() => {
    return questionsData?.questoes || [];
  }, []);

  // 1. Estados dos Filtros
  const [selectedDisciplina, setSelectedDisciplina] = useState('ALL');
  const [selectedTopico, setSelectedTopico] = useState('ALL');
  const [studyMode, setStudyMode] = useState('MISTAS'); // 'INEDITAS' | 'ANTIGAS' | 'MISTAS'
  const [shuffleQuestions, setShuffleQuestions] = useState(true);

  // 2. Meta da Sessão (Padrão: 30 questões, conforme especificação)
  const [sessionGoal, setSessionGoal] = useState(30);

  // 3. Extração dinâmica e ordenada de todas as disciplinas disponíveis
  const disciplinas = useMemo(() => {
    const set = new Set();
    allQuestions.forEach((q) => {
      if (q.disciplina) set.add(q.disciplina.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [allQuestions]);

  // 4. Extração dinâmica dos tópicos filtrados pela disciplina selecionada
  const topicosDisponiveis = useMemo(() => {
    const topicosMap = new Map();

    allQuestions.forEach((q) => {
      if (selectedDisciplina === 'ALL' || q.disciplina === selectedDisciplina) {
        if (q.topico_edital) {
          const clean = formatTopicName(q.topico_edital, q.disciplina);
          if (!topicosMap.has(q.topico_edital)) {
            topicosMap.set(q.topico_edital, clean);
          }
        }
      }
    });

    return Array.from(topicosMap.entries())
      .map(([original, clean]) => ({ original, clean }))
      .sort((a, b) => a.clean.localeCompare(b.clean, 'pt-BR'));
  }, [allQuestions, selectedDisciplina]);

  // Handler para troca de disciplina: RESETA o tópico selecionado
  const handleDisciplinaChange = (e) => {
    const novaDisciplina = e.target.value;
    setSelectedDisciplina(novaDisciplina);
    setSelectedTopico('ALL');
  };

  // 5. Filtragem dinâmica das questões
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      if (selectedDisciplina !== 'ALL' && q.disciplina !== selectedDisciplina) {
        return false;
      }

      if (selectedTopico !== 'ALL' && q.topico_edital !== selectedTopico) {
        return false;
      }

      const isInedita = (q.prova || '').toLowerCase().includes('inédita');
      if (studyMode === 'INEDITAS' && !isInedita) {
        return false;
      }
      if (studyMode === 'ANTIGAS' && isInedita) {
        return false;
      }

      return true;
    });
  }, [allQuestions, selectedDisciplina, selectedTopico, studyMode]);

  // Contadores analíticos
  const countIneditas = useMemo(() => {
    return filteredQuestions.filter(q => (q.prova || '').toLowerCase().includes('inédita')).length;
  }, [filteredQuestions]);

  const countAntigas = useMemo(() => {
    return filteredQuestions.filter(q => !(q.prova || '').toLowerCase().includes('inédita')).length;
  }, [filteredQuestions]);

  // Iniciar sessão de estudos
  const handleStartStudy = () => {
    if (filteredQuestions.length === 0) return;

    let queue = [...filteredQuestions];
    if (shuffleQuestions) {
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
    }

    const numericGoal = Math.max(1, parseInt(sessionGoal, 10) || 30);

    navigate('/estudo', {
      state: {
        questions: queue,
        sessionGoal: numericGoal,
        filters: {
          disciplina: selectedDisciplina,
          topico: selectedTopico,
          mode: studyMode,
          total: queue.length
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-7">
        
        {/* Barra Superior de Usuário e Atalho para Progresso */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-base tracking-tight flex items-center gap-1.5">
              <Shield className="w-5 h-5 text-yellow-400" />
              PRF Flashcards
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão de Atalho "Meu Progresso" */}
            <Link
              to="/progresso"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:text-yellow-300 font-semibold rounded-xl text-xs transition-all shadow-sm active:scale-98"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Meu Progresso</span>
            </Link>

            {/* Status de Autenticação */}
            {user ? (
              <div className="flex items-center gap-2 bg-gray-800/80 border border-gray-700/60 rounded-xl px-3 py-1.5 text-xs text-gray-300">
                <User className="w-3.5 h-3.5 text-yellow-400" />
                <span className="max-w-[120px] truncate" title={user.displayName || user.email || 'Usuário'}>
                  {user.displayName || user.email || (user.isAnonymous ? 'Visitante' : 'Conectado')}
                </span>
                <button
                  type="button"
                  onClick={() => logout()}
                  title="Sair da conta"
                  className="text-gray-500 hover:text-red-400 transition-colors ml-1 p-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 rounded-xl text-xs font-medium transition-all"
              >
                <LogIn className="w-3.5 h-3.5 text-yellow-400" />
                <span>Entrar</span>
              </Link>
            )}
          </div>
        </div>

        {/* Hero */}
        <header className="text-center space-y-2 pt-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold tracking-wide uppercase">
            <Shield className="w-4 h-4 text-yellow-400" />
            <span>Concurso PRF · Repetição Espaçada SM-2</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Flashcards <span className="text-yellow-400">Polícia Rodoviária Federal</span>
          </h1>
          
          <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
            Treine com itens de Certo e Errado no padrão CEBRASPE. Filtre por disciplina, tópicos do edital e defina sua meta diária de estudos.
          </p>
        </header>

        {/* Bloco 1: Seleção do Modo de Estudo (3 Cards Grandes) */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-300">
            <Layers className="w-4 h-4 text-yellow-500" />
            <span>1. Modo de Estudo</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Modo: Inéditas */}
            <button
              type="button"
              onClick={() => setStudyMode('INEDITAS')}
              className={`p-6 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                studyMode === 'INEDITAS'
                  ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/30 shadow-xl shadow-amber-950/50'
                  : 'bg-gray-800/80 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${studyMode === 'INEDITAS' ? 'bg-amber-500 text-gray-950' : 'bg-gray-700/60 text-gray-300'}`}>
                  <Sparkles className="w-6 h-6" />
                </div>
                {studyMode === 'INEDITAS' && (
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-amber-500 text-gray-950">
                    Ativo
                  </span>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                  Inéditas
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Questões autorais elaboradas no padrão rigoroso do CEBRASPE, focadas em jurisprudência recente e pegadinhas.
                </p>
              </div>
            </button>

            {/* Modo: Provas Antigas */}
            <button
              type="button"
              onClick={() => setStudyMode('ANTIGAS')}
              className={`p-6 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                studyMode === 'ANTIGAS'
                  ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/30 shadow-xl shadow-blue-950/50'
                  : 'bg-gray-800/80 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${studyMode === 'ANTIGAS' ? 'bg-blue-500 text-white' : 'bg-gray-700/60 text-gray-300'}`}>
                  <FileText className="w-6 h-6" />
                </div>
                {studyMode === 'ANTIGAS' && (
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-blue-500 text-white">
                    Ativo
                  </span>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                  Provas Antigas
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Questões reais aplicadas pela banca CEBRASPE em concursos anteriores da PRF para calibrar seu nível real.
                </p>
              </div>
            </button>

            {/* Modo: Mistas */}
            <button
              type="button"
              onClick={() => setStudyMode('MISTAS')}
              className={`p-6 rounded-2xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden group ${
                studyMode === 'MISTAS'
                  ? 'bg-yellow-950/40 border-yellow-500 ring-2 ring-yellow-500/30 shadow-xl shadow-yellow-950/50'
                  : 'bg-gray-800/80 border-gray-700 hover:border-gray-600 hover:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${studyMode === 'MISTAS' ? 'bg-yellow-500 text-gray-950' : 'bg-gray-700/60 text-gray-300'}`}>
                  <Layers className="w-6 h-6" />
                </div>
                {studyMode === 'MISTAS' && (
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-yellow-500 text-gray-950">
                    Ativo
                  </span>
                )}
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-bold text-white group-hover:text-yellow-400 transition-colors">
                  Mistas (Ambas)
                </h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Experiência completa combinando questões inéditas e provas passadas em um único fluxo de revisão Anki.
                </p>
              </div>
            </button>
          </div>
        </section>

        {/* Bloco 2: Filtros de Disciplina, Tópicos e Meta da Sessão */}
        <section className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-gray-700/60">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-300">
              <Filter className="w-4 h-4 text-yellow-500" />
              <span>2. Filtragem do Edital & Meta</span>
            </div>
            
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="rounded border-gray-600 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-gray-800 bg-gray-900 w-4 h-4 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                <Shuffle className="w-3.5 h-3.5 text-gray-400" />
                Embaralhar ordem das questões
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Select Disciplina */}
            <div className="space-y-2">
              <label htmlFor="select-disciplina" className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                Disciplina
              </label>
              <div className="relative">
                <select
                  id="select-disciplina"
                  value={selectedDisciplina}
                  onChange={handleDisciplinaChange}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors cursor-pointer"
                >
                  <option value="ALL">Todas as Disciplinas ({allQuestions.length} questões)</option>
                  {disciplinas.map((disc) => {
                    const count = allQuestions.filter(q => q.disciplina === disc).length;
                    return (
                      <option key={disc} value={disc}>
                        {disc} ({count})
                      </option>
                    );
                  })}
                </select>
              </div>
              <p className="text-[11px] text-gray-500">
                Ao trocar a disciplina, os tópicos abaixo serão automaticamente resetados.
              </p>
            </div>

            {/* Select Tópico do Edital (Limpo) */}
            <div className="space-y-2">
              <label htmlFor="select-topico" className="block text-xs font-semibold uppercase tracking-wider text-gray-300">
                Tópico do Edital (Nome Limpo)
              </label>
              <div className="relative">
                <select
                  id="select-topico"
                  value={selectedTopico}
                  onChange={(e) => setSelectedTopico(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors cursor-pointer"
                >
                  <option value="ALL">
                    Todos os Tópicos {selectedDisciplina !== 'ALL' ? `de ${selectedDisciplina}` : ''} ({topicosDisponiveis.length} tópicos)
                  </option>
                  {topicosDisponiveis.map((item) => {
                    return (
                      <option key={item.original} value={item.original}>
                        {item.clean}
                      </option>
                    );
                  })}
                </select>
              </div>
              <p className="text-[11px] text-gray-500">
                Prefixos da disciplina foram limpos da lista.
              </p>
            </div>
          </div>

          {/* Seção da Meta da Sessão (Requisito 2) */}
          <div className="pt-2 border-t border-gray-700/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-900/60 p-4 rounded-xl border border-gray-700/60">
              <div className="space-y-1">
                <label htmlFor="session-goal-input" className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-yellow-400" />
                  <span>Meta de Estudos da Sessão (Cards)</span>
                </label>
                <p className="text-[11px] text-gray-400 max-w-md">
                  Define o alerta de conclusão de meta. O restante dos cards da fila continuará disponível caso deseje prosseguir.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="session-goal-input"
                  type="number"
                  min="1"
                  max="500"
                  value={sessionGoal}
                  onChange={(e) => setSessionGoal(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 bg-gray-800 border border-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 rounded-xl px-3 py-2 text-center text-white font-bold text-sm"
                />
                <span className="text-xs text-gray-400 font-medium">questões</span>
              </div>
            </div>
          </div>

          {/* Painel de Estatísticas do Filtro Atual */}
          <div className="bg-gray-900/80 rounded-xl p-4 border border-gray-700/60 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold text-lg">
                {filteredQuestions.length}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {filteredQuestions.length === 1 ? '1 questão selecionada' : `${filteredQuestions.length} questões selecionadas no filtro`}
                </p>
                <p className="text-xs text-gray-400">
                  {countIneditas} inéditas · {countAntigas} provas passadas · Meta configurada: {sessionGoal}
                </p>
              </div>
            </div>

            {/* Indicador de Status */}
            <div className="flex items-center gap-2 text-xs">
              {filteredQuestions.length > 0 ? (
                <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <CheckCircle className="w-4 h-4" />
                  Pronto para iniciar
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                  <AlertCircle className="w-4 h-4" />
                  Nenhuma questão encontrada com estes filtros
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Bloco 3: Botão de Iniciar Sessão de Estudo */}
        <div className="pt-1">
          <button
            type="button"
            disabled={filteredQuestions.length === 0}
            onClick={handleStartStudy}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-200 shadow-xl cursor-pointer ${
              filteredQuestions.length > 0
                ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-950 shadow-yellow-500/15 hover:shadow-yellow-500/25 active:scale-99'
                : 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed'
            }`}
          >
            <Play className="w-6 h-6 fill-current" />
            <span>Iniciar Sessão de Estudo</span>
            {filteredQuestions.length > 0 && (
              <span className="text-xs bg-gray-950 text-yellow-400 px-2.5 py-1 rounded-md font-mono">
                {filteredQuestions.length} cards disponíveis
              </span>
            )}
          </button>
        </div>

        {/* Rodapé Informativo */}
        <footer className="text-center text-xs text-gray-500 pt-4 border-t border-gray-800/80">
          <p>
            Plataforma para o concurso da Polícia Rodoviária Federal (PRF) com sincronização em nuvem via Firebase.
          </p>
        </footer>

      </div>
    </div>
  );
}
