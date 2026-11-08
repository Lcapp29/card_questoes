import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Trophy, Clock, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserFullProgress } from '../services/progressService';
import questoes from '../data/questoes_prf.json';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalRespondidos: 0,
    pendentes: 0,
    acertoGeral: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      const progress = await getUserFullProgress(user.uid);
      const progressArray = Object.values(progress);
      
      const respondidos = progressArray.length;
      const hoje = new Date();
      const pendentes = progressArray.filter(p => new Date(p.nextReview) <= hoje).length;
      
      // Cálculo simples de acerto baseado na facilidade/repetições (simplificado para o dashboard)
      const bons = progressArray.filter(p => p.easiness > 2.0).length;
      const acertoGeral = respondidos > 0 ? Math.round((bons / respondidos) * 100) : 0;

      setStats({
        totalRespondidos: respondidos,
        pendentes,
        acertoGeral
      });
    };

    loadStats();
  }, [user.uid]);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Olá, {user.displayName?.split(' ')[0]}</h1>
          <p className="text-gray-600 dark:text-gray-400">Pronto para a rodada de hoje?</p>
        </div>
        <button 
          onClick={logout}
          className="text-sm text-red-500 font-medium hover:underline"
        >
          Sair
        </button>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          icon={<BookOpen className="text-blue-500" />} 
          label="Cards Estudados" 
          value={stats.totalRespondidos} 
        />
        <StatCard 
          icon={<Clock className="text-orange-500" />} 
          label="Para Revisar" 
          value={stats.pendentes} 
        />
        <StatCard 
          icon={<Trophy className="text-green-500" />} 
          label="Taxa de Acerto" 
          value={`${stats.acertoGeral}%`} 
        />
      </div>

      {/* Modos de Estudo */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Modos de Estudo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StudyModeCard 
            title="Inéditas" 
            description="Questões exclusivas criadas por especialistas"
            color="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
            to="/study?mode=ineditas"
          />
          <StudyModeCard 
            title="Provas Antigas" 
            description="Questões oficiais de concursos anteriores"
            color="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            to="/study?mode=provas"
          />
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center space-x-4">
    <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-xl font-bold dark:text-white">{value}</p>
    </div>
  </div>
);

const StudyModeCard = ({ title, description, color, to }) => (
  <Link to={to} className={`p-6 rounded-2xl ${color} transition-transform hover:scale-[1.02] active:scale-95 flex flex-col justify-between h-40`}>
    <div>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="text-sm opacity-80">{description}</p>
    </div>
    <div className="flex justify-end">
      <div className="bg-white/20 p-2 rounded-full">
        <Play fill="currentColor" size={20} />
      </div>
    </div>
  </Link>
);

export default Dashboard;
