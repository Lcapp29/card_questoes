import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  RotateCcw, 
  Trophy, 
  AlertTriangle,
  Home,
  Target,
  Sparkles,
  Play,
  CheckCircle2,
  BookOpen,
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Flashcard, { formatTopicName } from '../components/Flashcard.jsx';
import questionsData from '../data/questoes_prf.json';
import { useAuth } from '../contexts/AuthContext.jsx';
import { recordCardProgress } from '../services/progressService.js';

export default function StudySession() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. Recebe as questões filtradas e a meta da sessão passadas pelo Dashboard via router state
  const initialQuestions = useMemo(() => {
    if (location.state?.questions && Array.isArray(location.state.questions) && location.state.questions.length > 0) {
      return location.state.questions;
    }
    return questionsData?.questoes || [];
  }, [location.state]);

  // Meta da sessão (Padrão: 30 questões, configurável pelo usuário no Dashboard)
  const sessionGoal = useMemo(() => {
    return Number(location.state?.sessionGoal) || 30;
  }, [location.state]);

  const [questions, setQuestions] = useState(initialQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Registro histórico das avaliações feitas nesta sessão
  const [sessionRatings, setSessionRatings] = useState([]);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Controle do Alerta/Modal de Meta Atingida (Requisito 2)
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [goalModalDismissed, setGoalModalDismissed] = useState(false);

  // Resumo das disciplinas e tópicos selecionados para esta sessão
  const filterSummary = useMemo(() => {
    return location.state?.filterSummary || null;
  }, [location.state]);
  const [showTopicsList, setShowTopicsList] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  
  // Progresso relativo à Meta definida pelo usuário
  const currentCardNumber = currentIndex + 1;
  const goalPercent = Math.min(100, Math.round((currentCardNumber / sessionGoal) * 100));

  // Handler disparado ao finalizar o julgamento de um card
  const handleAnkiRate = async ({ questionId, rating, userChoice, isCorrect, question }) => {
    const cleanTopic = question?.topico_edital 
      ? formatTopicName(question.topico_edital, question.disciplina)
      : '';

    const newRatingItem = {
      questionId,
      rating, // 'Errei' | 'Difícil' | 'Ok' | 'Fácil'
      userChoice,
      isCorrect,
      question,
      timestamp: new Date().toISOString()
    };
    
    // Atualiza estado local da sessão
    setSessionRatings((prev) => [...prev, newRatingItem]);

    // Injeção no Firestore: Salva na coleção user_progress (Requisito 1)
    if (user?.uid) {
      recordCardProgress({
        userId: user.uid,
        questionId: questionId || question?.id,
        disciplina: question?.disciplina || 'PRF',
        topico: cleanTopic,
        resultado: isCorrect ? 'acerto' : 'erro',
        rating
      }).catch((err) => console.error('Falha assíncrona ao registrar progresso:', err));
    }

    const nextIndex = currentIndex + 1;
    const cardsCompletedCount = sessionRatings.length + 1;

    // Checagem da Meta de Estudos: Se acabou de atingir a meta e ainda não dispensou o modal
    if (cardsCompletedCount === sessionGoal && !goalModalDismissed && nextIndex < totalQuestions) {
      setShowGoalModal(true);
      return;
    }

    // Avança automaticamente para a próxima questão
    if (nextIndex < totalQuestions) {
      setCurrentIndex(nextIndex);
    } else {
      // Chegou ao fim da fila total de questões
      setSessionCompleted(true);
    }
  };

  // Continua estudando após atingir a meta
  const handleContinueStudying = () => {
    setShowGoalModal(false);
    setGoalModalDismissed(true);
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  // Encerra a sessão imediatamente e vai para o resumo
  const handleEndSessionEarly = () => {
    setShowGoalModal(false);
    setSessionCompleted(true);
  };

  // Reiniciar a sessão com as mesmas questões
  const handleRestart = () => {
    setCurrentIndex(0);
    setSessionRatings([]);
    setSessionCompleted(false);
    setShowGoalModal(false);
    setGoalModalDismissed(false);
  };

  // Revisar apenas as questões marcadas como "Errei"
  const handleReviewErrors = () => {
    const errorQuestions = sessionRatings
      .filter((item) => item.rating === 'Errei')
      .map((item) => item.question);

    if (errorQuestions.length > 0) {
      setQuestions(errorQuestions);
      setCurrentIndex(0);
      setSessionRatings([]);
      setSessionCompleted(false);
      setShowGoalModal(false);
      setGoalModalDismissed(false);
    }
  };

  // Revisar apenas as questões marcadas como "Difícil"
  const handleReviewDifficult = () => {
    const difficultQuestions = sessionRatings
      .filter((item) => item.rating === 'Difícil')
      .map((item) => item.question);

    if (difficultQuestions.length > 0) {
      setQuestions(difficultQuestions);
      setCurrentIndex(0);
      setSessionRatings([]);
      setSessionCompleted(false);
      setShowGoalModal(false);
      setGoalModalDismissed(false);
    }
  };

  // Estatísticas da Sessão
  const ratingCounts = useMemo(() => {
    const counts = { Errei: 0, Difícil: 0, Ok: 0, Fácil: 0 };
    sessionRatings.forEach((item) => {
      const r = item.rating === 'Bom' ? 'Ok' : item.rating;
      if (counts[r] !== undefined) {
        counts[r]++;
      }
    });
    return counts;
  }, [sessionRatings]);

  // Se não houver questões
  if (totalQuestions === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Nenhuma questão na fila de estudo</h2>
          <p className="text-sm text-gray-400">
            Você não selecionou nenhuma questão ou a lista de filtros ficou vazia.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar para a Página Inicial</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // TELA DE CONCLUSÃO DA SESSÃO
  if (sessionCompleted) {
    const answeredCount = sessionRatings.length;
    // Difícil, Ok e Fácil são ACERTOS. Apenas 'Errei' é erro.
    const totalAcertos = ratingCounts.Difícil + ratingCounts.Ok + ratingCounts.Fácil;
    const totalErros = ratingCounts.Errei;
    const retentionRate = answeredCount > 0 ? Math.round((totalAcertos / answeredCount) * 100) : 0;
    const goalReached = answeredCount >= sessionGoal;

    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Card de Conclusão */}
          <div className="bg-gray-800/90 border border-gray-700/80 rounded-3xl p-8 text-center space-y-5 shadow-2xl backdrop-blur-sm">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center mx-auto border border-yellow-500/30">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h1 className="text-3xl font-extrabold text-white">
                Sessão de Estudos Concluída!
              </h1>
              {goalReached && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Meta da Sessão Atingida ({sessionGoal} cards)
                </span>
              )}
            </div>
            
            <p className="text-gray-300 text-sm max-w-md mx-auto">
              Você respondeu <span className="text-yellow-400 font-bold">{answeredCount} questões</span> nesta sessão. Seu progresso foi salvo na nuvem.
            </p>

            {/* Taxa de Acerto e Retenção */}
            <div className="pt-2 pb-2">
              <div className="inline-block p-4 rounded-2xl bg-gray-900/80 border border-gray-700/60">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Taxa de Retenção (Acertos)
                </span>
                <span className="text-4xl font-extrabold text-yellow-400 tabular-nums">
                  {retentionRate}%
                </span>
                <span className="text-xs text-gray-400 block mt-1">
                  ({totalAcertos} acertadas de {answeredCount} respondidas)
                </span>
              </div>
            </div>

            {/* Detalhamento por Classificação Anki */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3 text-center">
                <span className="text-xs text-red-300 font-semibold block">Erros</span>
                <span className="text-2xl font-bold text-red-400 tabular-nums">{totalErros}</span>
              </div>
              <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3 text-center">
                <span className="text-xs text-amber-300 font-semibold block">Difícil (Acerto)</span>
                <span className="text-2xl font-bold text-amber-400 tabular-nums">{ratingCounts.Difícil}</span>
              </div>
              <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-3 text-center">
                <span className="text-xs text-blue-300 font-semibold block">Ok</span>
                <span className="text-2xl font-bold text-blue-400 tabular-nums">{ratingCounts.Ok}</span>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 text-center">
                <span className="text-xs text-emerald-300 font-semibold block">Fácil</span>
                <span className="text-2xl font-bold text-emerald-400 tabular-nums">{ratingCounts.Fácil}</span>
              </div>
            </div>

            {/* Botões de Ação Final */}
            <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
              {totalErros > 0 && (
                <button
                  type="button"
                  onClick={handleReviewErrors}
                  className="w-full sm:w-auto px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-98 cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Revisar Apenas Erros ({totalErros})</span>
                </button>
              )}

              {ratingCounts.Difícil > 0 && (
                <button
                  type="button"
                  onClick={handleReviewDifficult}
                  className="w-full sm:w-auto px-5 py-3 bg-amber-600 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-98 cursor-pointer text-sm flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Revisar Difíceis ({ratingCounts.Difícil})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRestart}
                className="w-full sm:w-auto px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all shadow-md active:scale-98 cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reiniciar Fila</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="w-full sm:w-auto px-5 py-3 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl transition-all shadow-md active:scale-98 cursor-pointer text-sm flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Voltar para a Página Inicial</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // TELA DE ESTUDO ATIVO (SESSÃO)
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 relative">
      
      {/* MODAL DE META ATINGIDA (Requisito 2) */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-yellow-500/50 rounded-3xl p-7 sm:p-8 max-w-lg w-full text-center space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center mx-auto border border-yellow-500/40">
              <Target className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Meta Atingida! 🎉
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed">
                Parabéns! Você alcançou a meta estipulada de <span className="text-yellow-400 font-bold">{sessionGoal} questões</span> nesta sessão.
              </p>
              <p className="text-xs text-gray-400">
                Ainda restam {totalQuestions - sessionGoal} cards no filtro atual caso deseje continuar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              <button
                type="button"
                onClick={handleEndSessionEarly}
                className="py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all text-sm cursor-pointer"
              >
                Encerrar Sessão
              </button>
              <button
                type="button"
                onClick={handleContinueStudying}
                className="py-3 px-4 bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold rounded-xl shadow-lg shadow-yellow-500/20 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continuar Estudando</span>
                <Play className="w-4 h-4 fill-current" />
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-xs text-gray-400 hover:text-white transition-colors underline cursor-pointer"
              >
                Voltar para a Página Inicial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barra Superior / Indicador de Progresso com Meta da Sessão (Requisito 2) */}
      <div className="w-full max-w-4xl mx-auto space-y-3 mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Voltar para Página Inicial */}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Página Inicial</span>
          </button>

          {/* Indicador de Progresso Relativo à Meta */}
          <div className="flex items-center gap-3 text-right">
            <div className="flex items-center gap-2 bg-gray-800/80 px-3 py-1.5 rounded-xl border border-gray-700/60 text-xs">
              <Target className="w-4 h-4 text-yellow-400" />
              <span className="font-bold text-white tabular-nums">
                Questão {currentCardNumber} / Meta: {sessionGoal}
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-400 font-mono">
                {totalQuestions} na fila
              </span>
            </div>
          </div>
        </div>

        {/* Barra Visual de Progresso em Relação à Meta */}
        <div className="space-y-1">
          <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700/60 relative">
            <div
              className={`h-full transition-all duration-300 ease-out ${
                currentCardNumber >= sessionGoal 
                  ? 'bg-gradient-to-r from-emerald-500 to-green-400' 
                  : 'bg-gradient-to-r from-yellow-500 to-amber-400'
              }`}
              style={{ width: `${Math.min(100, (currentCardNumber / sessionGoal) * 100)}%` }}
            />
          </div>
          
          <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
            <span>Início</span>
            <span className={currentCardNumber >= sessionGoal ? 'text-emerald-400 font-bold' : ''}>
              Meta: {sessionGoal} cards {currentCardNumber >= sessionGoal ? '(Atingida!)' : ''}
            </span>
            <span>Total da Fila: {totalQuestions}</span>
          </div>
        </div>

        {/* Informações de Disciplinas e Tópicos Ativos na Sessão */}
        {filterSummary && (
          <div className="bg-gray-800/80 border border-gray-700/60 rounded-xl px-3.5 py-2 text-xs space-y-1.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <BookOpen className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span className="font-bold text-gray-300 text-[11px] uppercase tracking-wide shrink-0">
                  Disciplinas:
                </span>
                <span className="text-yellow-400 font-medium truncate max-w-xs sm:max-w-md">
                  {filterSummary.disciplinas?.length > 0 
                    ? filterSummary.disciplinas.join(', ')
                    : 'Todas as Disciplinas'}
                </span>
              </div>

              {filterSummary.topicos?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTopicsList(!showTopicsList)}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer ml-auto"
                >
                  <Tag className="w-3 h-3 text-yellow-400" />
                  <span>{filterSummary.topicos.length} tópicos</span>
                  {showTopicsList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Lista expansível de tópicos selecionados */}
            {showTopicsList && filterSummary.topicos?.length > 0 && (
              <div className="pt-2 mt-1.5 border-t border-gray-700/60 flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                {filterSummary.topicos.map((topicoName, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-0.5 rounded bg-gray-900 border border-gray-700/80 text-[11px] text-gray-300"
                  >
                    {topicoName}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Resumo rápido de acertos da sessão atual */}
        {sessionRatings.length > 0 && (
          <div className="flex items-center justify-end gap-3 text-xs text-gray-400 pt-1">
            <span className="text-red-400">Errei: {ratingCounts.Errei}</span>
            <span>·</span>
            <span className="text-amber-400">Difícil: {ratingCounts.Difícil}</span>
            <span>·</span>
            <span className="text-blue-400">Ok: {ratingCounts.Ok}</span>
            <span>·</span>
            <span className="text-emerald-400">Fácil: {ratingCounts.Fácil}</span>
          </div>
        )}
      </div>

      {/* Centro: Componente Flashcard */}
      <main className="flex-1 flex items-center justify-center my-auto py-2">
        <Flashcard
          question={currentQuestion}
          onAnkiRate={handleAnkiRate}
          currentIndex={currentIndex}
          totalQuestions={totalQuestions}
        />
      </main>

      {/* Rodapé da Sessão */}
      <div className="w-full max-w-4xl mx-auto text-center pt-4 text-xs text-gray-600">
        <span>Sessão de Flashcards PRF · Sincronização em nuvem ativa</span>
      </div>
    </div>
  );
}
