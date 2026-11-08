import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Trophy, Clock, Play, Filter, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getUserFullProgress, getCardProgress, updateCardProgress } from '../services/progressService';
import { calculateNextReview, formatTopic } from '../utils/ankiLogic';
import questoes from '../data/questoes_prf.json';
import Flashcard from '../components/Flashcard';

const StudySession = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'ineditas';
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filteredCards, setFilteredCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDisciplina, setSelectedDisciplina] = useState('all');
  const [selectedTopico, setSelectedTopico] = useState('all');
  const [sessionFinished, setSessionFinished] = useState(false);

  // Disciplinas e tópicos disponíveis
  const disciplinas = [...new Set(questoes.map(q => q.disciplina))];
  const topicos = [...new Set(questoes
    .filter(q => selectedDisciplina === 'all' || q.disciplina === selectedDisciplina)
    .map(q => q.topico_edital)
  )];

  useEffect(() => {
    // Filtrar cards com base no modo (inéditas ou provas)
    let cards = questoes.filter(q => {
      if (mode === 'ineditas') return q.prova === 'inédita';
      if (mode === 'provas') return q.prova !== 'inédita';
      return true;
    });

    if (selectedDisciplina !== 'all') {
      cards = cards.filter(q => q.disciplina === selectedDisciplina);
    }

    if (selectedTopico !== 'all') {
      cards = cards.filter(q => q.topico_edital === selectedTopico);
    }

    setFilteredCards(cards);
    setCurrentIndex(0);
    setSessionFinished(false);
    setLoading(false);
  }, [mode, selectedDisciplina, selectedTopico]);

  const handleRateCard = async (cardId, quality) => {
    // Buscar progresso atual do card no Firestore
    const currentProgress = await getCardProgress(user.uid, cardId);
    
    // Calcular próxima revisão com SM-2
    const nextState = calculateNextReview(
      quality,
      currentProgress.repetitions,
      currentProgress.easiness,
      currentProgress.interval
    );

    // Salvar no Firestore
    await updateCardProgress(user.uid, cardId, nextState);

    // Avançar para o próximo card
    if (currentIndex + 1 < filteredCards.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSessionFinished(true);
    }
  };

  if (loading) {
    return <div className="text-center py-20 dark:text-white">Carregando sessão...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex justify-between items-center">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:underline"
        >
          <ArrowLeft size={18} className="mr-1" /> Voltar ao Dashboard
        </button>
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
          Modo: {mode}
        </span>
      </header>

      {/* Filtros */}
      {!sessionFinished && filteredCards.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-3">
          <div className="flex items-center space-x-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
            <Filter size={16} /> <span>Filtros da Sessão</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select 
              value={selectedDisciplina} 
              onChange={(e) => { setSelectedDisciplina(e.target.value); setSelectedTopico('all'); }}
              className="p-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600"
            >
              <option value="all">Todas as Disciplinas</option>
              {disciplinas.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select 
              value={selectedTopico} 
              onChange={(e) => setSelectedTopico(e.target.value)}
              className="p-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600"
            >
              <option value="all">Todos os Tópicos</option>
              {topicos.map(t => (
                <option key={t} value={t}>
                  {formatTopic(t, selectedDisciplina === 'all' ? t.split(' - ')[0] : selectedDisciplina)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Área do Card ou Fim da Sessão */}
      {sessionFinished ? (
        <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-green-100 text-green-600 rounded-full">
              <CheckCircle2 size={48} />
            </div>
          </div>
          <h2 className="text-2xl font-bold dark:text-white">Sessão Concluída!</h2>
          <p className="text-gray-600 dark:text-gray-400">Você revisou todos os cards disponíveis para estes filtros.</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-10 rounded-3xl shadow-xl text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400">Nenhum card encontrado com os filtros selecionados.</p>
          <button 
            onClick={() => { setSelectedDisciplina('all'); setSelectedTopico('all'); }}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-sm font-bold rounded-lg dark:text-white"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between text-xs font-semibold text-gray-400 px-2">
            <span>Card {currentIndex + 1} de {filteredCards.length}</span>
            <span>Progresso SM-2 Ativo</span>
          </div>
          <Flashcard 
            card={filteredCards[currentIndex]} 
            onRate={handleRateCard} 
          />
        </div>
      )}
    </div>
  );
};

export default StudySession;
