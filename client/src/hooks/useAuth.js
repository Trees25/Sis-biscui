import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

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
  const verifiedAuthIdRef = useRef(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('biscui_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('biscui_user');
      localStorage.removeItem('biscui_tab');
    }
  }, [user]);

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
      let resolvedEmail = usernameInput;
      if (!usernameInput.includes('@')) {
        const { data: emailData, error: rpcErr } = await supabase.rpc('get_user_email', { p_username: usernameInput });
        if (rpcErr || !emailData) throw new Error('Usuario no encontrado.');
        resolvedEmail = emailData;
      }


      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: passwordInput,
      });

      if (authErr) throw new Error(`Credenciales inválidas para ${resolvedEmail}`);

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
    handleLogin, handleLogout
  };
};
