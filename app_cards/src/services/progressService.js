import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase.js';

const COLLECTION_NAME = 'user_progress';

/**
 * Salva o resultado de um flashcard no Firestore ou localmente:
 * - userId: ID do usuário (Firebase uid ou guest local)
 * - questionId: ID da questão
 * - disciplina: Disciplina da questão
 * - topico: Tópico limpo do edital
 * - resultado: 'acerto' | 'erro'
 * - rating: 'Errei' | 'Difícil' | 'Ok' | 'Fácil'
 * - timestamp: ISO string e serverTimestamp
 */
export async function recordCardProgress({
  userId,
  questionId,
  disciplina,
  topico,
  resultado,
  rating
}) {
  if (!userId) {
    console.warn('[ProgressService] Progresso não registrado: usuário indefinido.');
    return null;
  }

  const docData = {
    userId,
    questionId: questionId || '',
    disciplina: disciplina || 'Geral',
    topico: topico || 'Geral',
    resultado: resultado || (rating === 'Errei' ? 'erro' : 'acerto'),
    rating: rating || (resultado === 'erro' ? 'Errei' : 'Ok'),
    timestamp: new Date().toISOString()
  };

  // Se o usuário for um visitante local, salva diretamente no localStorage
  if (userId.startsWith('guest_') || userId.startsWith('local_')) {
    try {
      const localKey = `prf_progress_${userId}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      const newEntry = { ...docData, id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` };
      existing.push(newEntry);
      localStorage.setItem(localKey, JSON.stringify(existing));
      return newEntry.id;
    } catch (e) {
      console.warn('Erro ao salvar no localStorage:', e);
      return null;
    }
  }

  // Para usuários autenticados no Firebase, tenta salvar na nuvem com fallback local
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...docData,
      createdAt: serverTimestamp()
    });
    console.log('[ProgressService] Progresso sincronizado no Firestore:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.warn('[ProgressService] Firestore indisponível. Salvando cópia de contingência local:', error);
    try {
      const localKey = `prf_progress_${userId}`;
      const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
      const fallbackEntry = { ...docData, id: `local_${Date.now()}` };
      existing.push(fallbackEntry);
      localStorage.setItem(localKey, JSON.stringify(existing));
      return fallbackEntry.id;
    } catch (e) {
      console.warn('Erro ao salvar contingência local:', e);
      return null;
    }
  }
}

/**
 * Busca todo o histórico de progresso de um usuário (Firestore e/ou LocalStorage)
 */
export async function fetchUserProgress(userId) {
  if (!userId) return [];

  const items = [];
  const localKey = `prf_progress_${userId}`;

  // Se for visitante local, recupera diretamente do localStorage
  if (userId.startsWith('guest_') || userId.startsWith('local_')) {
    try {
      const localItems = JSON.parse(localStorage.getItem(localKey) || '[]');
      return localItems
        .map(it => ({
          ...it,
          date: new Date(it.timestamp || Date.now())
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (e) {
      console.warn('Erro ao ler progresso local do visitante:', e);
      return [];
    }
  }

  // Tenta buscar da coleção user_progress no Firestore
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        ...data,
        date: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.timestamp || Date.now())
      });
    });
  } catch (error) {
    console.warn('[ProgressService] Firestore não acessível. Consultando histórico local:', error);
  }

  // Mescla registros locais que porventura foram salvos offline
  try {
    const localItems = JSON.parse(localStorage.getItem(localKey) || '[]');
    const existingIds = new Set(items.map(i => i.id || (i.questionId + i.timestamp)));
    localItems.forEach((it) => {
      const uniqueKey = it.id || (it.questionId + it.timestamp);
      if (!existingIds.has(uniqueKey)) {
        items.push({
          ...it,
          date: new Date(it.timestamp || Date.now())
        });
      }
    });
  } catch (e) {
    console.warn('Erro ao mesclar histórico local:', e);
  }

  return items.sort((a, b) => b.date.getTime() - a.date.getTime());
}
