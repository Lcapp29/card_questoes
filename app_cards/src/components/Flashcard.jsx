import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  BookOpen, 
  Shield, 
  Tag,
  HelpCircle,
  Sparkles,
  Award,
  ArrowRight
} from 'lucide-react';

/**
 * Utilitário para limpar o tópico do edital removendo o prefixo da disciplina
 * Ex: "DIREITO PENAL - Princípios e Aplicação..." -> "Princípios e Aplicação..."
 */
export function formatTopicName(topico, disciplina) {
  if (!topico) return '';
  if (disciplina && topico.toUpperCase().startsWith(disciplina.toUpperCase() + ' - ')) {
    return topico.substring(disciplina.length + 3).trim();
  }
  const parts = topico.split(' - ');
  if (parts.length > 1) {
    return parts.slice(1).join(' - ').trim();
  }
  return topico.trim();
}

/**
 * Componente Flashcard:
 * - Frente: Exibe a pergunta e 2 botões de julgamento: "Errado" e "Certo"
 * - Ao responder, revela o verso com o gabarito oficial e comentário
 * - Se acertar: 3 botões de avaliação Anki: "Difícil", "Ok" e "Fácil"
 * - Se errar: mantém a lógica do erro com botão "Próximo Card" (registra como Errei)
 */
export default function Flashcard({ 
  question, 
  onAnkiRate, 
  currentIndex = 0, 
  totalQuestions = 1 
}) {
  const [userChoice, setUserChoice] = useState(null); // 'CERTO' | 'ERRADO' | null

  // Reseta a escolha do usuário e a visualização sempre que a questão mudar
  useEffect(() => {
    setUserChoice(null);
  }, [question?.id, currentIndex]);

  if (!question) {
    return (
      <div className="bg-gray-800/80 border border-gray-700 rounded-2xl p-8 text-center text-gray-400 max-w-2xl mx-auto shadow-xl">
        <HelpCircle className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <p className="text-lg font-medium text-gray-300">Nenhuma questão carregada no momento.</p>
      </div>
    );
  }

  const {
    id,
    disciplina,
    topico_edital,
    pergunta,
    gabarito,
    comentario,
    resposta,
    prova
  } = question;

  const cleanTopic = formatTopicName(topico_edital, disciplina);
  const isInedita = (prova || '').toLowerCase().includes('inédita');

  // Normalização precisa do gabarito oficial (CERTO ou ERRADO)
  const isGabaritoCerto = 
    (gabarito && gabarito.toUpperCase().includes('CERTO')) ||
    (resposta && (resposta.toUpperCase().startsWith('CERTO') || resposta.toUpperCase().startsWith('[CERTO]') || resposta.toUpperCase().includes('GABARITO: CERTO')));

  const isGabaritoErrado = 
    (gabarito && gabarito.toUpperCase().includes('ERRADO')) ||
    (resposta && (resposta.toUpperCase().startsWith('ERRADO') || resposta.toUpperCase().startsWith('[ERRADO]') || resposta.toUpperCase().includes('GABARITO: ERRADO')));

  const displayGabarito = isGabaritoCerto ? 'CERTO' : (isGabaritoErrado ? 'ERRADO' : 'CERTO');
  const displayComment = comentario || (resposta ? resposta.replace(/^(CERTO|ERRADO|\[CERTO\]|\[ERRADO\])\.?\s*(-|Justificativa:|\n)?\s*/i, '').trim() : '');

  const isAnswered = userChoice !== null;
  const isCorrect = isAnswered && userChoice === displayGabarito;

  // Registrar resposta da questão e avançar
  const handleRate = (rating) => {
    console.log('[Anki SM-2 Rating]', {
      timestamp: new Date().toISOString(),
      questionId: id,
      disciplina,
      topico: cleanTopic,
      prova,
      userChoice,
      gabaritoOficial: displayGabarito,
      acertou: isCorrect,
      rating // 'Errei' | 'Difícil' | 'Ok' | 'Fácil'
    });

    if (onAnkiRate) {
      onAnkiRate({
        questionId: id,
        rating,
        userChoice,
        isCorrect,
        question
      });
    }
  };

  // Responde a questão escolhendo CERTO ou ERRADO
  const handleSelectAnswer = (choice) => {
    setUserChoice(choice);
  };

  // Suporte a atalhos do teclado:
  // - Antes de responder: 'E' / '1' para Errado, 'C' / '2' para Certo
  // - Após responder e acertou: '1' Difícil, '2' Ok, '3' Fácil
  // - Após responder e errou: Espaço / Enter / '1' Próximo Card
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['input', 'textarea', 'select'].includes(e.target.tagName.toLowerCase())) {
        return;
      }

      if (!isAnswered) {
        if (e.key === 'e' || e.key === 'E' || e.key === '1' || e.key === 'ArrowLeft') {
          e.preventDefault();
          handleSelectAnswer('ERRADO');
        } else if (e.key === 'c' || e.key === 'C' || e.key === '2' || e.key === 'ArrowRight') {
          e.preventDefault();
          handleSelectAnswer('CERTO');
        }
      } else {
        if (isCorrect) {
          if (e.key === '1') {
            e.preventDefault();
            handleRate('Difícil');
          } else if (e.key === '2') {
            e.preventDefault();
            handleRate('Ok');
          } else if (e.key === '3') {
            e.preventDefault();
            handleRate('Fácil');
          }
        } else {
          if (e.code === 'Space' || e.code === 'Enter' || e.key === '1') {
            e.preventDefault();
            handleRate('Errei');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, isCorrect, userChoice, displayGabarito, question]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Container Principal do Card */}
      <div className="bg-gray-800/95 border border-gray-700/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 backdrop-blur-sm">
        
        {/* Cabeçalho do Card: Metadados da Questão */}
        <div className="px-6 py-4 bg-gray-850/80 border-b border-gray-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Disciplina */}
            <span className="font-semibold text-yellow-400 bg-yellow-500/10 px-2.5 py-1 rounded-md border border-yellow-500/20 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-yellow-400" />
              {disciplina || 'PRF'}
            </span>

            {/* Tópico do Edital (Limpo) */}
            {cleanTopic && (
              <span className="text-gray-300 bg-gray-700/50 px-2.5 py-1 rounded-md border border-gray-600/40 max-w-xs md:max-w-md truncate" title={topico_edital}>
                {cleanTopic}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Tag da Prova */}
            <span className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 border ${
              isInedita 
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' 
                : 'bg-blue-500/10 text-blue-300 border-blue-500/20'
            }`}>
              <Tag className="w-3 h-3" />
              {prova || (isInedita ? 'Inédita' : 'Prova Anterior')}
            </span>
          </div>
        </div>

        {/* Corpo do Card: Pergunta (Frente) */}
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            <BookOpen className="w-4 h-4 text-yellow-500" />
            <span>Julgue o item a seguir (Estilo CEBRASPE / PRF)</span>
          </div>

          <p className="text-gray-100 text-lg md:text-xl leading-relaxed font-normal whitespace-pre-line select-text">
            {pergunta}
          </p>
        </div>

        {/* Área de Ação: Se não respondeu ainda, exibe os 2 botões "Errado" e "Certo" */}
        {!isAnswered ? (
          <div className="px-6 py-7 bg-gray-850/80 border-t border-gray-700/50">
            <p className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider mb-4">
              Escolha sua resposta:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto">
              {/* Botão ERRADO */}
              <button
                type="button"
                onClick={() => handleSelectAnswer('ERRADO')}
                className="flex items-center justify-center gap-3 py-4 px-6 bg-red-950/40 hover:bg-red-600 border border-red-500/40 hover:border-red-500 text-red-200 hover:text-white font-bold text-lg rounded-xl shadow-lg transition-all duration-150 active:scale-98 cursor-pointer group"
              >
                <XCircle className="w-6 h-6 text-red-400 group-hover:text-white transition-colors" />
                <span>ERRADO</span>
                <kbd className="text-[11px] bg-red-900/60 group-hover:bg-red-700 text-red-200 group-hover:text-white px-2 py-0.5 rounded font-mono border border-red-700/40 ml-1">
                  E
                </kbd>
              </button>

              {/* Botão CERTO */}
              <button
                type="button"
                onClick={() => handleSelectAnswer('CERTO')}
                className="flex items-center justify-center gap-3 py-4 px-6 bg-emerald-950/40 hover:bg-emerald-600 border border-emerald-500/40 hover:border-emerald-500 text-emerald-200 hover:text-white font-bold text-lg rounded-xl shadow-lg transition-all duration-150 active:scale-98 cursor-pointer group"
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-400 group-hover:text-white transition-colors" />
                <span>CERTO</span>
                <kbd className="text-[11px] bg-emerald-900/60 group-hover:bg-emerald-700 text-emerald-200 group-hover:text-white px-2 py-0.5 rounded font-mono border border-emerald-700/40 ml-1">
                  C
                </kbd>
              </button>
            </div>
          </div>
        ) : (
          /* Verso Revelado com Gabarito e Comentário */
          <div className="border-t border-gray-700/80 bg-gray-850/90 transition-all duration-300">
            
            {/* Faixa de Feedback do Usuário: Acertou ou Errou */}
            <div className={`px-6 py-3.5 border-b flex items-center justify-between flex-wrap gap-2 ${
              isCorrect 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/40 border-red-500/30 text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className="font-bold text-sm">
                  {isCorrect ? 'Parabéns, você acertou!' : 'Você errou esta questão.'}
                </span>
              </div>

              <div className="text-xs">
                <span className="text-gray-400">Sua resposta: </span>
                <span className="font-bold text-white uppercase">{userChoice}</span>
                <span className="text-gray-400"> · Gabarito: </span>
                <span className="font-bold text-white uppercase">{displayGabarito}</span>
              </div>
            </div>

            {/* Bloco do Gabarito Oficial e Comentário */}
            <div className="p-6 md:p-8 space-y-4">
              {/* Gabarito */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Gabarito Oficial:
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-extrabold tracking-wide border shadow-sm ${
                  displayGabarito === 'CERTO'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                    : 'bg-red-500/20 text-red-300 border-red-500/40'
                }`}>
                  {displayGabarito === 'CERTO' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  {displayGabarito}
                </span>
              </div>

              {/* Comentário & Fundamentação Jurídica/Técnica */}
              <div className="bg-gray-900/70 border border-gray-700/60 rounded-xl p-5 text-gray-300 leading-relaxed text-sm md:text-base">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase text-yellow-400/90 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Comentário & Fundamentação</span>
                </div>
                <div className="text-gray-200 whitespace-pre-line">
                  {displayComment || resposta}
                </div>
              </div>
            </div>

            {/* Ações pós-reposta: Se acertou -> 3 botões (Difícil, Ok, Fácil); Se errou -> Botão Próximo Card */}
            <div className="p-5 md:p-6 bg-gray-900/90 border-t border-gray-700/80">
              {isCorrect ? (
                /* Cenário de ACERTO: 3 Botões de Avaliação ("Difícil", "Ok", "Fácil") */
                <div className="space-y-3">
                  <div className="text-center">
                    <span className="text-xs font-medium text-gray-400 flex items-center justify-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      Como você avalia o nível desta questão para a repetição espaçada?
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
                    {/* 1. DIFÍCIL */}
                    <button
                      type="button"
                      onClick={() => handleRate('Difícil')}
                      className="flex flex-col items-center justify-center py-3 px-4 bg-amber-600 hover:bg-orange-600 text-white font-semibold rounded-xl shadow-md shadow-amber-900/30 hover:shadow-orange-800/40 transition-all duration-150 active:scale-98 cursor-pointer group"
                    >
                      <span className="text-base font-bold flex items-center gap-1">
                        Difícil
                      </span>
                      <span className="text-xs text-amber-200 font-normal mt-0.5 opacity-90 group-hover:opacity-100 flex items-center gap-1">
                        <span className="text-[10px] bg-amber-700/80 px-1.5 py-0.2 rounded font-mono">1</span>
                        <span>&lt; 1 dia</span>
                      </span>
                    </button>

                    {/* 2. OK (antigo Bom) */}
                    <button
                      type="button"
                      onClick={() => handleRate('Ok')}
                      className="flex flex-col items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-900/30 hover:shadow-blue-800/40 transition-all duration-150 active:scale-98 cursor-pointer group"
                    >
                      <span className="text-base font-bold flex items-center gap-1">
                        Ok
                      </span>
                      <span className="text-xs text-blue-200 font-normal mt-0.5 opacity-90 group-hover:opacity-100 flex items-center gap-1">
                        <span className="text-[10px] bg-blue-700/80 px-1.5 py-0.2 rounded font-mono">2</span>
                        <span>3 dias</span>
                      </span>
                    </button>

                    {/* 3. FÁCIL */}
                    <button
                      type="button"
                      onClick={() => handleRate('Fácil')}
                      className="flex flex-col items-center justify-center py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md shadow-emerald-900/30 hover:shadow-emerald-800/40 transition-all duration-150 active:scale-98 cursor-pointer group"
                    >
                      <span className="text-base font-bold flex items-center gap-1">
                        Fácil
                      </span>
                      <span className="text-xs text-emerald-200 font-normal mt-0.5 opacity-90 group-hover:opacity-100 flex items-center gap-1">
                        <span className="text-[10px] bg-emerald-700/80 px-1.5 py-0.2 rounded font-mono">3</span>
                        <span>7 dias</span>
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Cenário de ERRO: Botão para ir para o próximo card (registra como Errei) */
                <div className="space-y-3 max-w-md mx-auto text-center">
                  <p className="text-xs text-red-300/90">
                    O erro foi registrado para reaparecer no ciclo mais curto de repetição (&lt; 1 min).
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => handleRate('Errei')}
                    className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-base rounded-xl shadow-lg shadow-red-900/40 transition-all duration-150 active:scale-98 cursor-pointer flex items-center justify-center gap-2.5 group"
                  >
                    <span>Próximo Card</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                    <kbd className="text-xs bg-red-800/80 text-white px-2 py-0.5 rounded border border-red-700 ml-2">
                      Espaço
                    </kbd>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dica de atalhos do teclado na parte inferior */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        {!isAnswered ? (
          <>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700 text-[11px]">E</kbd>
              <span>Responder Errado</span>
            </span>
            <span className="text-gray-600">·</span>
            <span className="flex items-center gap-1.5">
              <kbd className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700 text-[11px]">C</kbd>
              <span>Responder Certo</span>
            </span>
          </>
        ) : isCorrect ? (
          <span className="flex items-center gap-1.5">
            <kbd className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700 text-[11px]">1 - 3</kbd>
            <span>Avaliar: Difícil (1), Ok (2), Fácil (3)</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5">
            <kbd className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700 text-[11px]">Espaço</kbd>
            <span>Avançar para o próximo card</span>
          </span>
        )}
      </div>
    </div>
  );
}
