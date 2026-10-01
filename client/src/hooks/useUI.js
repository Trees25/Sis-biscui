import { useState, useCallback } from 'react';

export const useUI = () => {
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const savedTab = localStorage.getItem('biscui_tab');
      if (savedTab) return savedTab;
      const saved = localStorage.getItem('biscui_user');
      if (saved) {
        const parsedUser = JSON.parse(saved);
        if (parsedUser?.rol === 'admin') return 'matrix';
        if (parsedUser?.rol === 'heladero' || parsedUser?.rol === 'pastelero') return 'produccion';
        if (parsedUser?.rol === 'transportista') return 'pedidos';
        return 'pedidos_lista';
      }
    } catch (e) {
      console.error("Error reading from localStorage in useUI", e);
    }
    return '';
  });

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  return {
    toast, setToast,
    loading, setLoading,
    activeTab, setActiveTab,
    showToast
  };
};
