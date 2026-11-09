import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  signInAnonymously,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase.js';

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  loginAnonymous: async () => {},
  loginLocalGuest: () => {},
  logout: async () => {}
});

const LOCAL_USER_STORAGE_KEY = 'prf_local_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Inicializa o estado de autenticação verificando Firebase ou sessão local de visitante
  useEffect(() => {
    // 1. Tenta recuperar usuário local armazenado
    let savedLocalUser = null;
    try {
      const raw = localStorage.getItem(LOCAL_USER_STORAGE_KEY);
      if (raw) {
        savedLocalUser = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Erro ao carregar usuário local:', e);
    }

    // 2. Observa mudanças no Firebase Auth
    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          try {
            localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
          } catch (e) {}
        } else if (savedLocalUser) {
          setUser(savedLocalUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }, (error) => {
        console.warn('Erro no observador de autenticação do Firebase:', error);
        if (savedLocalUser) {
          setUser(savedLocalUser);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Falha ao inicializar onAuthStateChanged:', e);
      if (savedLocalUser) {
        setUser(savedLocalUser);
      }
      setLoading(false);
    }
  }, []);

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }
    return cred;
  };

  // Cria ou ativa uma sessão de visitante local (sem depender de chave de API externa)
  const loginLocalGuest = (customName = 'Visitante (Estudo Rápido)') => {
    const guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
    const localGuest = {
      uid: guestId,
      displayName: customName,
      email: null,
      isAnonymous: true,
      isLocal: true,
      createdAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(LOCAL_USER_STORAGE_KEY, JSON.stringify(localGuest));
    } catch (e) {
      console.warn('Erro ao salvar visitante local no localStorage:', e);
    }
    setUser(localGuest);
    return localGuest;
  };

  // Tenta logar via Firebase Anonymous; se falhar (por chave inválida ou offline), faz fallback transparente para Visitante Local
  const loginAnonymous = async () => {
    try {
      const cred = await signInAnonymously(auth);
      try {
        localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
      } catch (e) {}
      return cred;
    } catch (error) {
      console.warn('Firebase signInAnonymously falhou. Ativando sessão local de visitante:', error);
      // Fallback seguro que garante que o usuário consiga estudar normalmente
      const localUser = loginLocalGuest();
      return { user: localUser, isFallback: true };
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem(LOCAL_USER_STORAGE_KEY);
    } catch (e) {}
    setUser(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Erro ao deslogar do Firebase:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginAnonymous, loginLocalGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
