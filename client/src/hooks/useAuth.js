import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useAuth = (showToast, setActiveTab, setLoading) => {
  const [user, setUser] = useState(() => {
    const localData = localStorage.getItem('biscui_user');
    return localData ? JSON.parse(localData) : null;
  });
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  useEffect(() => {
    if (user) {
      localStorage.setItem('biscui_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('biscui_user');
      localStorage.removeItem('biscui_tab');
    }
  }, [user]);

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
            nombre,
            email,
            password,
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
        nombre: userData.nombre,
        rol: userData.rol,
        sucursal_id: userData.sucursal_id,
        sucursal_nombre: userData.sucursales?.nombre
      };
      setUser(sessionUser);
      showToast(`¡Bienvenido, ${sessionUser.nombre}!`);

      if (sessionUser.rol === 'admin') setActiveTab('matrix');
      else if (sessionUser.rol === 'heladero' || sessionUser.rol === 'pastelero' || sessionUser.rol === 'pastelero_helado') setActiveTab('produccion');
      else if (sessionUser.rol === 'transportista') setActiveTab('pedidos');
      else setActiveTab('pedido_nuevo');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUsernameInput('');
    setPasswordInput('');
    showToast('Sesión cerrada.');
  };

  return {
    user, setUser,
    usernameInput, setUsernameInput,
    passwordInput, setPasswordInput,
    handleLogin, handleLogout
  };
};
