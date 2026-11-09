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
  Shuffle, 
  CheckCircle,
  BarChart3,
  Target,
  User,
  LogOut,
  LogIn,
  CheckSquare,
  Square,
  Search,
  Tag
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

  // Extração dinâmica de todas as disciplinas ordenadas
  const disciplinas = useMemo(() => {
    const set = new Set();
    allQuestions.forEach((q) => {
      if (q.disciplina) set.add(q.disciplina.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [allQuestions]);

  // 1. Configurações da Sessão: Tipos de Questão (ambas marcadas por padrão)
  const [includeIneditas, setIncludeIneditas] = useState(true);
  const [includeAntigas, setIncludeAntigas] = useState(true);

  // Meta de estudos e embaralhamento
  const [sessionGoal, setSessionGoal] = useState(30);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);

  // Seleção múltipla de Disciplinas (todas marcadas por padrão)
  const [selectedDisciplinas, setSelectedDisciplinas] = useState(() => disciplinas);

  // Busca textual para filtrar tópicos
  const [topicSearchTerm, setTopicSearchTerm] = useState('');

  // Não permite desmarcar ambos os tipos ao mesmo tempo
  const handleToggleIneditas = () => {
    if (includeIneditas && !includeAntigas) return;
    setIncludeIneditas(!includeIneditas);
  };

  const handleToggleAntigas = () => {
    if (includeAntigas && !includeIneditas) return;
    setIncludeAntigas(!includeAntigas);
  };

  // Helper para verificar se a questão atende aos tipos selecionados
  const matchesSelectedTypes = (q) => {
    const isInedita = (q.prova || '').toLowerCase().includes('inédita');
    if (includeIneditas && includeAntigas) return true;
    if (includeIneditas) return isInedita;
    if (includeAntigas) return !isInedita;
    return false;
  };

  // Rótulo descritivo do modo ativo
  const studyModeLabel = useMemo(() => {
    if (includeIneditas && includeAntigas) return 'Mistas';
    if (includeIneditas) return 'Inéditas';
    return 'Provas Antigas';
  }, [includeIneditas, includeAntigas]);

  // Contagem de questões por disciplina considerando o tipo de questão ativo
  const disciplineStats = useMemo(() => {
    const map = new Map();
    disciplinas.forEach((disc) => {
      const totalDisc = allQuestions.filter(q => q.disciplina === disc);
      const activeCount = totalDisc.filter(q => matchesSelectedTypes(q)).length;
      map.set(disc, { total: totalDisc.length, activeCount });
    });
    return map;
  }, [allQuestions, disciplinas, includeIneditas, includeAntigas]);

  // Mapeamento dinâmico de todos os tópicos estritamente vinculados a cada disciplina
  const topicsByDiscipline = useMemo(() => {
    const grouped = new Map();

    disciplinas.forEach((disc) => {
      const topicMap = new Map();
      const discQuestions = allQuestions.filter(q => q.disciplina === disc);

      discQuestions.forEach((q) => {
        if (q.topico_edital) {
          const rawTopic = q.topico_edital.trim();
          if (!topicMap.has(rawTopic)) {
            const clean = formatTopicName(rawTopic, disc);
            topicMap.set(rawTopic, {
              original: rawTopic,
              clean,
              disciplina: disc,
              total: 0,
              activeCount: 0
            });
          }
          const item = topicMap.get(rawTopic);
          item.total++;
          if (matchesSelectedTypes(q)) {
            item.activeCount++;
          }
        }
      });

      const topicList = Array.from(topicMap.values()).sort((a, b) => 
        a.clean.localeCompare(b.clean, 'pt-BR')
      );
      grouped.set(disc, topicList);
    });

    return grouped;
  }, [allQuestions, disciplinas, includeIneditas, includeAntigas]);

  // Tópicos disponíveis com base estritamente nas disciplinas que estão selecionadas
  const availableTopics = useMemo(() => {
    const list = [];
    selectedDisciplinas.forEach((disc) => {
      const discTopics = topicsByDiscipline.get(disc) || [];
      discTopics.forEach(t => list.push(t));
    });
    return list;
  }, [selectedDisciplinas, topicsByDiscipline]);

  // Tópicos selecionados pelo usuário (Array de strings com o `original` de cada tópico)
  const [selectedTopicos, setSelectedTopicos] = useState(() => {
    const initial = [];
    disciplinas.forEach((disc) => {
      const list = topicsByDiscipline.get(disc) || [];
      list.forEach(t => initial.push(t.original));
    });
    return initial;
  });

  // Handler para alternar uma disciplina individual
  const toggleDisciplina = (disc) => {
    const isCurrentlySelected = selectedDisciplinas.includes(disc);
    const discTopics = (topicsByDiscipline.get(disc) || []).map(t => t.original);

    if (isCurrentlySelected) {
      const updatedDisciplinas = selectedDisciplinas.filter(d => d !== disc);
      setSelectedDisciplinas(updatedDisciplinas);
      setSelectedTopicos(prev => prev.filter(t => !discTopics.includes(t)));
    } else {
      setSelectedDisciplinas(prev => [...prev, disc]);
      setSelectedTopicos(prev => {
        const next = new Set(prev);
        discTopics.forEach(t => next.add(t));
        return Array.from(next);
      });
    }
  };

  const selectAllDisciplinas = () => {
    setSelectedDisciplinas([...disciplinas]);
    const allT = [];
    disciplinas.forEach(d => {
      (topicsByDiscipline.get(d) || []).forEach(t => allT.push(t.original));
    });
    setSelectedTopicos(allT);
  };

  const clearAllDisciplinas = () => {
    setSelectedDisciplinas([]);
    setSelectedTopicos([]);
  };

  const toggleTopico = (originalTopic) => {
    setSelectedTopicos(prev => {
      if (prev.includes(originalTopic)) {
        return prev.filter(t => t !== originalTopic);
      } else {
        return [...prev, originalTopic];
      }
    });
  };

  const selectAllAvailableTopics = () => {
    const all = availableTopics.map(t => t.original);
    setSelectedTopicos(all);
  };

  const clearAllTopics = () => {
    setSelectedTopicos([]);
  };

  const toggleAllTopicsOfDiscipline = (disc) => {
    const discTopicKeys = (topicsByDiscipline.get(disc) || []).map(t => t.original);
    const allSelected = discTopicKeys.every(k => selectedTopicos.includes(k));

    if (allSelected) {
      setSelectedTopicos(prev => prev.filter(t => !discTopicKeys.includes(t)));
    } else {
      setSelectedTopicos(prev => {
        const next = new Set(prev);
        discTopicKeys.forEach(k => next.add(k));
        return Array.from(next);
      });
    }
  };

  // Filtragem dinâmica final das questões
  const filteredQuestions = useMemo(() => {
    if (selectedDisciplinas.length === 0 || selectedTopicos.length === 0) {
      return [];
    }

    const selectedDisciplinasSet = new Set(selectedDisciplinas);
    const selectedTopicosSet = new Set(selectedTopicos);

    return allQuestions.filter((q) => {
      if (!selectedDisciplinasSet.has(q.disciplina)) return false;
      if (!selectedTopicosSet.has(q.topico_edital)) return false;
      return matchesSelectedTypes(q);
    });
  }, [allQuestions, selectedDisciplinas, selectedTopicos, includeIneditas, includeAntigas]);

  const countIneditas = useMemo(() => {
    return filteredQuestions.filter(q => (q.prova || '').toLowerCase().includes('inédita')).length;
  }, [filteredQuestions]);

  const countAntigas = useMemo(() => {
    return filteredQuestions.filter(q => !(q.prova || '').toLowerCase().includes('inédita')).length;
  }, [filteredQuestions]);

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

    const cleanTopicsSelected = availableTopics
      .filter(t => selectedTopicos.includes(t.original))
      .map(t => t.clean);

    navigate('/estudo', {
      state: {
        questions: queue,
        sessionGoal: numericGoal,
        filterSummary: {
          disciplinas: selectedDisciplinas,
          topicos: cleanTopicsSelected,
          topicosCount: cleanTopicsSelected.length,
          mode: studyModeLabel,
          total: queue.length
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Barra Superior */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-base tracking-tight flex items-center gap-1.5">
              <Shield className="w-5 h-5 text-yellow-400" />
              PRF Flashcards
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/progresso"
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:text-yellow-300 font-semibold rounded-xl text-xs transition-all shadow-sm active:scale-98"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Meu Progresso</span>
            </Link>

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
                  className="text-gray-500 hover:text-red-400 transition-colors ml-1 p-0.5 cursor-pointer"
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
        <header className="text-center space-y-1.5 pt-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold tracking-wide uppercase">
            <Shield className="w-3.5 h-3.5 text-yellow-400" />
            <span>Concurso PRF · Repetição Espaçada SM-2</span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            Flashcards <span className="text-yellow-400">Polícia Rodoviária Federal</span>
          </h1>
          
          <p className="text-gray-400 max-w-xl mx-auto text-xs sm:text-sm">
            Configure sua sessão de estudo por tipo de questão, meta diária e tópicos do edital.
          </p>
        </header>

        {/* BLOCO 1: MODO DE ESTUDO & META DA SESSÃO (COMPACTO E RESPONSIVO) */}
        <section className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-700/60">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300">
              <Layers className="w-4 h-4 text-yellow-400" />
              <span>1. Configurações da Sessão</span>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="rounded border-gray-600 text-yellow-500 focus:ring-yellow-500 focus:ring-offset-gray-800 bg-gray-900 w-4 h-4 cursor-pointer"
              />
              <span className="flex items-center gap-1 text-[11px] text-gray-300">
                <Shuffle className="w-3.5 h-3.5 text-gray-400" />
                Embaralhar cards
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            
            {/* Tipo de Questão: 2 Caixas de Seleção Compactas */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                Tipo de Questão (Modo de Estudo)
              </span>
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Checkbox Inéditas */}
                <button
                  type="button"
                  onClick={handleToggleIneditas}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
                    includeIneditas
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm'
                      : 'bg-gray-900/60 border-gray-700 text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {includeIneditas ? (
                    <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-500 shrink-0" />
                  )}
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inéditas</span>
                </button>

                {/* Checkbox Provas Antigas */}
                <button
                  type="button"
                  onClick={handleToggleAntigas}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
                    includeAntigas
                      ? 'bg-blue-500/15 border-blue-500/50 text-blue-300 shadow-sm'
                      : 'bg-gray-900/60 border-gray-700 text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {includeAntigas ? (
                    <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-500 shrink-0" />
                  )}
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Provas Antigas</span>
                </button>
              </div>
            </div>

            {/* Meta de Estudos da Sessão (Cards) */}
            <div className="space-y-1.5 md:border-l md:border-gray-700/60 md:pl-5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-yellow-400" />
                <span>Meta da Sessão (Cards)</span>
              </span>
              
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-700 rounded-xl px-2.5 py-1">
                  <input
                    id="session-goal-input"
                    type="number"
                    min="1"
                    max="500"
                    value={sessionGoal}
                    onChange={(e) => setSessionGoal(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 bg-transparent text-center text-white font-bold text-sm focus:outline-none"
                  />
                  <span className="text-xs text-gray-400 font-medium">cards</span>
                </div>

                {/* Atalhos Rápidos de Meta */}
                <div className="flex items-center gap-1">
                  {[10, 20, 30, 50].map((goalOption) => (
                    <button
                      key={goalOption}
                      type="button"
                      onClick={() => setSessionGoal(goalOption)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer ${
                        sessionGoal === goalOption
                          ? 'bg-yellow-500 text-gray-950 font-bold'
                          : 'bg-gray-900/80 text-gray-400 hover:text-white border border-gray-700'
                      }`}
                    >
                      {goalOption}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* BLOCO 2: SELEÇÃO DE DISCIPLINAS & TÓPICOS DO EDITAL */}
        <section className="bg-gray-800/90 border border-gray-700/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-gray-700/60">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300">
              <Filter className="w-4 h-4 text-yellow-500" />
              <span>2. Seleção de Disciplinas & Tópicos</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Coluna 1: Disciplinas */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Disciplinas</span>
                  <span className="text-[11px] font-mono text-gray-400">
                    ({selectedDisciplinas.length}/{disciplinas.length})
                  </span>
                </label>
                
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAllDisciplinas}
                    className="text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer text-[11px]"
                  >
                    Marcar Todas
                  </button>
                  <span className="text-gray-600">·</span>
                  <button
                    type="button"
                    onClick={clearAllDisciplinas}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer text-[11px]"
                  >
                    Limpar
                  </button>
                </div>
              </div>

              <div className="bg-gray-900/90 border border-gray-700/80 rounded-xl p-2.5 max-h-[380px] overflow-y-auto space-y-1.5 custom-scrollbar">
                {disciplinas.map((disc) => {
                  const isChecked = selectedDisciplinas.includes(disc);
                  const stats = disciplineStats.get(disc);
                  const count = stats?.activeCount ?? 0;

                  return (
                    <div
                      key={disc}
                      onClick={() => toggleDisciplina(disc)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none text-xs ${
                        isChecked
                          ? 'bg-yellow-500/10 border-yellow-500/40 text-white font-medium'
                          : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-yellow-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-500 shrink-0" />
                        )}
                        <span className="truncate">{disc}</span>
                      </div>
                      
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] shrink-0 ${
                        isChecked 
                          ? 'bg-yellow-500/20 text-yellow-300 font-bold' 
                          : 'bg-gray-800 text-gray-500'
                      }`}>
                        ({count})
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-gray-500 leading-relaxed">
                Marque uma ou mais disciplinas para liberar a seleção dos respectivos tópicos do edital.
              </p>
            </div>

            {/* Coluna 2: Tópicos Atualizados */}
            <div className="lg:col-span-7 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-yellow-400" />
                  <span>TÓPICO DO EDITAL (ATUALIZADO)</span>
                  {selectedDisciplinas.length > 0 && (
                    <span className="text-[11px] font-mono text-gray-400">
                      ({selectedTopicos.filter(t => availableTopics.some(at => at.original === t)).length}/{availableTopics.length})
                    </span>
                  )}
                </label>

                {selectedDisciplinas.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={selectAllAvailableTopics}
                      className="text-yellow-400 hover:text-yellow-300 transition-colors cursor-pointer text-[11px]"
                    >
                      Marcar Todos
                    </button>
                    <span className="text-gray-600">·</span>
                    <button
                      type="button"
                      onClick={clearAllTopics}
                      className="text-gray-400 hover:text-white transition-colors cursor-pointer text-[11px]"
                    >
                      Limpar
                    </button>
                  </div>
                )}
              </div>

              {selectedDisciplinas.length === 0 ? (
                <div className="bg-gray-900/60 border border-dashed border-gray-700 rounded-xl p-8 text-center space-y-2 min-h-[380px] flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-500">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-300">Nenhuma disciplina selecionada</h4>
                  <p className="text-xs text-gray-500 max-w-sm">
                    Selecione ao menos uma disciplina à esquerda para exibir e marcar os tópicos do edital vinculados a ela.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={topicSearchTerm}
                      onChange={(e) => setTopicSearchTerm(e.target.value)}
                      placeholder="Pesquisar tópico do edital..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                    />
                  </div>

                  <div className="bg-gray-900/90 border border-gray-700/80 rounded-xl p-3 max-h-[330px] overflow-y-auto space-y-3.5 custom-scrollbar">
                    {selectedDisciplinas.map((disc) => {
                      const discTopics = topicsByDiscipline.get(disc) || [];
                      const matchingTopics = discTopics.filter(t => 
                        !topicSearchTerm.trim() || 
                        t.clean.toLowerCase().includes(topicSearchTerm.toLowerCase())
                      );

                      if (matchingTopics.length === 0) return null;

                      const allDiscTopicsKeys = discTopics.map(t => t.original);
                      const isAllDiscSelected = allDiscTopicsKeys.every(k => selectedTopicos.includes(k));

                      return (
                        <div key={disc} className="space-y-1.5 pb-2 border-b border-gray-800/80 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between py-1 px-1.5 bg-gray-800/50 rounded-lg">
                            <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wide truncate max-w-[240px] sm:max-w-xs">
                              {disc}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleAllTopicsOfDiscipline(disc)}
                              className="text-[10px] text-gray-400 hover:text-white transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-gray-700/60"
                            >
                              {isAllDiscSelected ? 'Desmarcar todos' : 'Marcar todos'}
                            </button>
                          </div>

                          <div className="space-y-1 pl-1">
                            {matchingTopics.map((topicItem) => {
                              const isChecked = selectedTopicos.includes(topicItem.original);
                              const count = topicItem.activeCount;

                              return (
                                <div
                                  key={topicItem.original}
                                  onClick={() => toggleTopico(topicItem.original)}
                                  className={`flex items-start justify-between p-2 rounded-lg border transition-all cursor-pointer select-none text-xs ${
                                    isChecked
                                      ? 'bg-yellow-500/10 border-yellow-500/30 text-white'
                                      : 'bg-gray-800/30 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-300'
                                  }`}
                                >
                                  <div className="flex items-start gap-2.5 min-w-0 pr-2">
                                    <div className="mt-0.5">
                                      {isChecked ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                                      ) : (
                                        <Square className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                                      )}
                                    </div>
                                    <span className="leading-snug text-[12px]">{topicItem.clean}</span>
                                  </div>

                                  <span className={`px-2 py-0.5 rounded font-mono text-[11px] shrink-0 ml-2 ${
                                    isChecked 
                                      ? 'bg-yellow-500/20 text-yellow-300 font-bold' 
                                      : 'bg-gray-800 text-gray-500'
                                  }`}>
                                    ({count})
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PAINEL DE RESUMO DA SELEÇÃO */}
          <div className="bg-gray-900/90 rounded-xl p-4 sm:p-5 border border-yellow-500/30 space-y-3.5 shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-yellow-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Resumo da Seleção de Estudos
                </h3>
              </div>
              <span className="text-xs font-mono text-gray-400">
                Tipo: <strong className="text-yellow-400 uppercase">{studyModeLabel}</strong>
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                Disciplinas ({selectedDisciplinas.length}):
              </span>
              {selectedDisciplinas.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedDisciplinas.map(disc => (
                    <span 
                      key={disc}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-700 text-yellow-300 text-xs font-medium"
                    >
                      <span>{disc}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-amber-400 italic">Nenhuma disciplina marcada</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-gray-800/70 p-3 rounded-lg border border-gray-700/60">
                <span className="text-[11px] text-gray-400 block font-medium">Tópicos Ativos</span>
                <span className="text-lg font-bold text-white">
                  {selectedTopicos.filter(t => availableTopics.some(at => at.original === t)).length} selecionados
                </span>
              </div>

              <div className="bg-gray-800/70 p-3 rounded-lg border border-gray-700/60">
                <span className="text-[11px] text-gray-400 block font-medium">Questões na Fila</span>
                <span className="text-lg font-bold text-yellow-400">
                  {filteredQuestions.length} questões
                </span>
                <span className="text-[10px] text-gray-400 block">
                  ({countIneditas} inéditas · {countAntigas} antigas)
                </span>
              </div>

              <div className="bg-gray-800/70 p-3 rounded-lg border border-gray-700/60">
                <span className="text-[11px] text-gray-400 block font-medium">Meta da Sessão</span>
                <span className="text-lg font-bold text-emerald-400">
                  {sessionGoal} cards
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Botão de Iniciar */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleStartStudy}
            disabled={filteredQuestions.length === 0}
            className={`w-full py-4 px-6 rounded-2xl font-extrabold text-base transition-all duration-200 flex items-center justify-center gap-3 shadow-xl ${
              filteredQuestions.length > 0
                ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-950 shadow-yellow-500/20 active:scale-98 cursor-pointer'
                : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Play className={`w-5 h-5 ${filteredQuestions.length > 0 ? 'fill-current' : ''}`} />
            <span>
              {filteredQuestions.length > 0
                ? `Iniciar Sessão de Estudo (${filteredQuestions.length} questões)`
                : 'Selecione Disciplina e Tópico para Iniciar'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
}
