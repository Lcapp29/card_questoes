import React, { useState } from 'react';
import { CheckCircle, XCircle, ChevronRight, RotateCcw } from 'lucide-react';
import { formatTopic } from '../utils/ankiLogic';

const Flashcard = ({ card, onRate }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleRate = (quality) => {
    setIsFlipped(false);
    onRate(card.id, quality);
  };

  return (
    <div className="w-full max-w-xl mx-auto perspective-1000">
      <div 
        className={`relative w-full min-h-[400px] transition-all duration-500 preserve-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        {/* Front Side */}
        <div className="absolute inset-0 backface-hidden bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border-2 border-gray-100 dark:border-gray-700 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-6">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                {card.disciplina}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {card.prova}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              {formatTopic(card.topico_edital, card.disciplina)}
            </h3>
            <p className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-white leading-relaxed">
              {card.pergunta}
            </p>
          </div>
          
          <div className="text-center text-gray-400 text-sm animate-bounce">
            Clique para ver a resposta
          </div>
        </div>

        {/* Back Side */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border-2 border-blue-500 flex flex-col justify-between">
          <div>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full uppercase mb-6 inline-block">
              Resposta
            </span>
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-200 leading-relaxed">
              {card.resposta}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-8">
            <RateButton 
              label="Errei" 
              color="bg-red-500" 
              onClick={() => handleRate(0)} 
            />
            <RateButton 
              label="Difícil" 
              color="bg-orange-500" 
              onClick={() => handleRate(3)} 
            />
            <RateButton 
              label="Bom" 
              color="bg-blue-500" 
              onClick={() => handleRate(4)} 
            />
            <RateButton 
              label="Fácil" 
              color="bg-green-500" 
              onClick={() => handleRate(5)} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const RateButton = ({ label, color, onClick }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`${color} text-white py-3 px-1 rounded-xl text-xs font-bold hover:opacity-90 active:scale-95 transition-all`}
  >
    {label}
  </button>
);

export default Flashcard;
