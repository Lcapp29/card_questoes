import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, getDocs, where } from 'firebase/firestore';
import { INITIAL_SM2_STATE } from '../utils/ankiLogic';

/**
 * Busca o progresso de um card específico para um usuário
 */
export const getCardProgress = async (userId, cardId) => {
  const docRef = doc(db, 'users', userId, 'progress', cardId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    return { ...INITIAL_SM2_STATE, cardId };
  }
};

/**
 * Salva ou atualiza o progresso de um card
 */
export const updateCardProgress = async (userId, cardId, progressData) => {
  const docRef = doc(db, 'users', userId, 'progress', cardId);
  await setDoc(docRef, progressData, { merge: true });
};

/**
 * Busca todo o progresso do usuário para calcular métricas
 */
export const getUserFullProgress = async (userId) => {
  const progressRef = collection(db, 'users', userId, 'progress');
  const querySnapshot = await getDocs(progressRef);
  const progress = {};
  querySnapshot.forEach((doc) => {
    progress[doc.id] = doc.data();
  });
  return progress;
};
