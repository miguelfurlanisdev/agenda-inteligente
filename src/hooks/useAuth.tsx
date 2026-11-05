/**
 * Hook de autenticação.
 * Mantém a sessão do usuário em estado React e atualiza sozinho quando
 * ele entra, sai ou o token é renovado.
 */
import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Escuta mudanças (login, logout, refresh). Registrado ANTES do getSession
    //    para não perder nenhum evento.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    // 2) Lê a sessão que já estava salva no navegador.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    // 3) Limpa o listener quando o componente sai da tela.
    return () => sub.subscription.unsubscribe();
  }, []);

  const user: User | null = session?.user ?? null;
  return { session, user, loading, signOut: () => supabase.auth.signOut() };
}
