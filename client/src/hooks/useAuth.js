import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { enforceRateLimit } from '../utils/rateLimiter';
import { validateLoginIdentifier, validateEmail } from '../utils/validators';
import {
  SESSION_STORAGE_KEY,
  getSessionPolicyForRole,
  evaluateSessionState
} from '../utils/sessionPolicy';

export const ROLE_DEFAULT_TAB = {
  admin: 'matrix',
  heladero: 'produccion',
  pastelero: 'produccion',
  transportista: 'pedidos',
  sucursal: 'pedidos_lista'
};

export const ROLE_ALLOWED_TABS = {
  admin: ['matrix', 'logistics', 'flujo', 'produccion_req', 'carga_produccion', 'catalogo', 'proveedores', 'maquinas', 'auditoria'],
  heladero: ['produccion', 'stock', 'pedidos_eventos'],
  pastelero: ['produccion', 'stock'],
  transportista: ['pedidos', 'rutas', 'carga_insumos', 'stock_fabrica'],
  sucursal: ['pedido_nuevo', 'pedidos_lista', 'consumo', 'mi_stock', 'ajuste_inventario', 'retiro_interno']
};

export const useAuth = (showToast, setActiveTab, setLoading) => {
  const [user, setUser] = useState(() => {
    try {
      const localData = localStorage.getItem('biscui_user');
      return localData ? JSON.parse(localData) : null;
    } catch (e) {
      console.error("Error reading biscui_user from localStorage", e);
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [sessionWarning, setSessionWarning] = useState(null);
  const verifiedAuthIdRef = useRef(null);
  const sessionTimingRef = useRef(null);
  const lastActivityWriteRef = useRef(0);

  // Lee o inicializa las marcas de tiempo de sesión (Graceful Rollout: no desconecta usuarios ya activos)
  const ensureSessionTiming = useCallback((authId, forceResetLogin = false) => {
    const now = Date.now();
    try {
      if (!forceResetLogin) {
        const raw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.auth_id === authId && Number(parsed.loginAt) > 0) {
            const hydrated = {
              auth_id: authId,
              loginAt: Number(parsed.loginAt),
              lastActivityAt: Number(parsed.lastActivityAt) || now
            };
            sessionTimingRef.current = hydrated;
            return hydrated;
          }
        }
      }
    } catch {
      // Si hay datos corruptos en localStorage, reinicializar de forma segura
    }

    const freshTiming = {
      auth_id: authId,
      loginAt: now,
      lastActivityAt: now
    };
    sessionTimingRef.current = freshTiming;
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(freshTiming));
    } catch {
      // Ignorar errores de cuota de localStorage
    }
    return freshTiming;
  }, []);

  const clearSessionTiming = useCallback(() => {
    sessionTimingRef.current = null;
    setSessionWarning(null);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignorar
    }
  }, []);

  // Permite al usuario renovar su ventana de inactividad desde el banner de aviso
  const extendSession = useCallback(() => {
    if (!user?.auth_id) return;
    const now = Date.now();
    const current = sessionTimingRef.current || ensureSessionTiming(user.auth_id, false);
    const updated = {
      ...current,
      auth_id: user.auth_id,
      lastActivityAt: now
    };
    sessionTimingRef.current = updated;
    lastActivityWriteRef.current = now;
    setSessionWarning(null);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignorar
    }
  }, [user?.auth_id, ensureSessionTiming]);

  useEffect(() => {
    if (user) {
      // Guardar únicamente metadatos básicos de sesión en localStorage (nunca email, password ni tokens)
      const safeSessionMeta = {
        id: user.id,
        auth_id: user.auth_id,
        nombre: user.nombre,
        rol: user.rol,
        sucursal_id: user.sucursal_id,
        sucursal_nombre: user.sucursal_nombre
      };
      localStorage.setItem('biscui_user', JSON.stringify(safeSessionMeta));
      ensureSessionTiming(user.auth_id, false);
    } else {
      localStorage.removeItem('biscui_user');
      localStorage.removeItem('biscui_tab');
      clearSessionTiming();
    }
  }, [user, ensureSessionTiming, clearSessionTiming]);

  // Monitor de Inactividad (Idle Timeout: 60 min) y Expiración Absoluta de Turno (8h admin / 12h operativos)
  useEffect(() => {
    if (!user?.auth_id || !user?.rol) {
      setSessionWarning(null);
      return;
    }

    // Limpiar cualquier parámetro de prueba que haya quedado en la URL del navegador
    if (typeof window !== 'undefined' && window.location.search && window.history?.replaceState) {
      try {
        const cleanUrl = new URL(window.location.href);
        if (cleanUrl.searchParams.has('test_idle_sec') || cleanUrl.searchParams.has('test_max_sec')) {
          cleanUrl.searchParams.delete('test_idle_sec');
          cleanUrl.searchParams.delete('test_max_sec');
          window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
        }
      } catch {
        // Ignorar
      }
    }

    // Usar siempre la política real de producción en el navegador (60 minutos de inactividad)
    const policy = getSessionPolicyForRole(user.rol);
    const throttleMs = 3000;

    const recordUserActivity = () => {
      const now = Date.now();
      if (now - lastActivityWriteRef.current < throttleMs) return;
      lastActivityWriteRef.current = now;

      const current = sessionTimingRef.current || ensureSessionTiming(user.auth_id, false);
      const updated = {
        ...current,
        auth_id: user.auth_id,
        lastActivityAt: now
      };
      sessionTimingRef.current = updated;
      setSessionWarning(prev => (prev?.warningType === 'inactivity' ? null : prev));
      try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignorar
      }
    };

    const checkSessionExpiration = async () => {
      const now = Date.now();
      // Sincronizar con localStorage por si el usuario estuvo activo en otra pestaña
      try {
        const storedRaw = localStorage.getItem(SESSION_STORAGE_KEY);
        if (storedRaw) {
          const parsed = JSON.parse(storedRaw);
          if (parsed?.auth_id === user.auth_id) {
            sessionTimingRef.current = parsed;
          }
        }
      } catch {
        // Ignorar
      }

      const timing = sessionTimingRef.current || ensureSessionTiming(user.auth_id, false);
      const evaluation = evaluateSessionState({
        loginAt: timing.loginAt,
        lastActivityAt: timing.lastActivityAt,
        now,
        policy
      });

      if (evaluation.status === 'EXPIRED_ABSOLUTE' || evaluation.status === 'EXPIRED_IDLE') {
        verifiedAuthIdRef.current = null;
        clearSessionTiming();
        // Si estaba en modo de prueba por URL (?test_idle_sec o ?test_max_sec),
        // limpiar el parámetro de la barra de direcciones tras completar la prueba
        // para que no siga cerrando la sesión cada pocos segundos.
        if (policy.isTestOverride && typeof window !== 'undefined' && window.history?.replaceState) {
          try {
            const cleanUrl = new URL(window.location.href);
            cleanUrl.searchParams.delete('test_idle_sec');
            cleanUrl.searchParams.delete('test_max_sec');
            window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
          } catch {
            // Ignorar
          }
        }
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setUser(null);
        setUsernameInput('');
        setPasswordInput('');
        if (showToast) {
          showToast(evaluation.message, 'error');
        }
        return;
      }

      if (evaluation.status === 'WARNING') {
        setSessionWarning({
          warningType: evaluation.warningType,
          remainingSeconds: evaluation.remainingSeconds,
          isTestOverride: policy.isTestOverride
        });
      } else {
        setSessionWarning(null);
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach(evt => window.addEventListener(evt, recordUserActivity, { passive: true }));

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkSessionExpiration();
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    const intervalMs = policy.isTestOverride ? 1000 : 5000;
    const timerId = setInterval(checkSessionExpiration, intervalMs);
    checkSessionExpiration();

    return () => {
      clearInterval(timerId);
      activityEvents.forEach(evt => window.removeEventListener(evt, recordUserActivity));
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [user?.auth_id, user?.rol, ensureSessionTiming, clearSessionTiming, showToast]);

  // Sincronizar sesión real de Supabase Auth y verificar rol desde la BD
  useEffect(() => {
    let isMounted = true;

    const verifyProfile = async (authUser) => {
      if (!authUser?.id) {
        if (isMounted) {
          verifiedAuthIdRef.current = null;
          setUser(null);
          setAuthLoading(false);
        }
        return;
      }

      // Evitar volver a consultar la tabla usuarios si ya verificamos este mismo auth_id en esta sesión
      if (verifiedAuthIdRef.current === authUser.id) {
        if (isMounted) setAuthLoading(false);
        return;
      }

      try {
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select(`
            id,
            auth_id,
            nombre,
            email,
            rol,
            sucursal_id,
            sucursales (
              nombre
            )
          `)
          .eq('auth_id', authUser.id)
          .single();

        if (!isMounted) return;

        if (userError || !userData) {
          verifiedAuthIdRef.current = null;
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          setUser(null);
        } else {
          verifiedAuthIdRef.current = authUser.id;
          setUser({
            id: userData.id,
            auth_id: userData.auth_id,
            nombre: userData.nombre,
            rol: userData.rol,
            sucursal_id: userData.sucursal_id,
            sucursal_nombre: userData.sucursales?.nombre
          });
        }
      } catch (err) {
        console.error('Error verificando sesión de usuario:', err);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (!session?.user) {
        verifiedAuthIdRef.current = null;
        setUser(null);
        setAuthLoading(false);
      } else {
        verifyProfile(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        verifiedAuthIdRef.current = null;
        setUser(null);
        setAuthLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        verifyProfile(session.user);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleLogin = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await enforceRateLimit('login');

      const sanitizedIdentifier = validateLoginIdentifier(usernameInput);
      const rawPassword = String(passwordInput || '');
      if (rawPassword.length < 4 || rawPassword.length > 128) {
        throw new Error('La contraseña debe tener entre 4 y 128 caracteres.');
      }

      let resolvedEmail = sanitizedIdentifier;
      if (sanitizedIdentifier.includes('@')) {
        resolvedEmail = validateEmail(sanitizedIdentifier, { required: true });
      } else {
        const { data: emailData, error: rpcErr } = await supabase.rpc('get_user_email', { p_username: sanitizedIdentifier });
        if (rpcErr) {
          if (rpcErr.message?.includes('Límite de solicitudes excedido')) throw new Error(rpcErr.message);
          throw new Error('Usuario o contraseña incorrectos.');
        }
        if (!emailData) throw new Error('Usuario o contraseña incorrectos.');
        resolvedEmail = emailData;
      }

      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: rawPassword,
      });

      if (authErr) {
        if (authErr.status === 429 || authErr.message?.toLowerCase().includes('rate limit')) {
          throw new Error('Límite de solicitudes de inicio de sesión excedido. Por favor, espera un minuto antes de volver a intentarlo.');
        }
        throw new Error('Usuario o contraseña incorrectos.');
      }

      const { data: userData, error: userError } = await supabase.from('usuarios').select(`
            id,
            auth_id,
            nombre,
            email,
            rol,
            sucursal_id,
            sucursales (
              nombre
            )
          `).eq('auth_id', authData.user.id).single();

      if (userError || !userData) {
        throw new Error(`Perfil de usuario bloqueado por RLS o no encontrado: ${userError?.message || 'Sin detalles'}`);
      }

      const sessionUser = {
        id: userData.id,
        auth_id: userData.auth_id,
        nombre: userData.nombre,
        rol: userData.rol,
        sucursal_id: userData.sucursal_id,
        sucursal_nombre: userData.sucursales?.nombre
      };
      verifiedAuthIdRef.current = userData.auth_id;
      ensureSessionTiming(userData.auth_id, true);
      setUser(sessionUser);
      showToast(`¡Bienvenido, ${sessionUser.nombre}!`);

      setActiveTab(ROLE_DEFAULT_TAB[sessionUser.rol] || 'pedidos_lista');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    verifiedAuthIdRef.current = null;
    clearSessionTiming();
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    setUser(null);
    setUsernameInput('');
    setPasswordInput('');
    showToast('Sesión cerrada.');
  };

  return {
    user, setUser,
    authLoading,
    usernameInput, setUsernameInput,
    passwordInput, setPasswordInput,
    sessionWarning, extendSession,
    handleLogin, handleLogout
  };
};
