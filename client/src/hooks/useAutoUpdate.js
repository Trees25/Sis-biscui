import { useEffect, useRef } from 'react';

export const useAutoUpdate = (showToast) => {
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    // 1. Manejo de error de precarga de Vite (cuando un hash viejo ya no existe en el servidor)
    const handlePreloadError = () => {
      console.log('Detectado nuevo despliegue por hash desactualizado. Recargando...');
      window.location.reload();
    };
    window.addEventListener('vite:preloadError', handlePreloadError);

    // 2. Función de verificación de versión
    const checkVersion = async () => {
      if (isUpdatingRef.current) return;
      try {
        // Consultar version.json con timestamp para evitar cualquier caché local
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (!res.ok) return;
        const data = await res.json();
        
        // __APP_BUILD_TIME__ es inyectado por vite.config.js durante el build
        const currentVersion = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : null;
        
        if (data.version && currentVersion && data.version !== currentVersion) {
          isUpdatingRef.current = true;
          if (showToast) {
            showToast('Nueva versión detectada. Actualizando sistema...', 'info');
          }
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        }
      } catch (e) {
        // Ignorar fallos de red silenciosamente
      }
    };

    // 3. Chequeo cuando la pestaña vuelve a estar visible (empleado toma la tablet/cambia de ventana)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Chequeo en segundo plano cada 5 minutos
    const interval = setInterval(checkVersion, 5 * 60 * 1000);

    return () => {
      window.removeEventListener('vite:preloadError', handlePreloadError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [showToast]);
};
