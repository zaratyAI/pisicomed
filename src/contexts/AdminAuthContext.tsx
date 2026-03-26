import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "gestor" | "comercial" | "agendamento" | "executor" | "cliente" | "leitura" | "user";

interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  profile: { full_name: string; email: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasPermission: (action: string) => boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

// Permission matrix (mirrors the DB function for client-side UI hints)
const PERMISSION_MAP: Record<string, AppRole[]> = {
  create_case: ["admin", "gestor", "comercial"],
  send_proposal: ["admin", "gestor", "comercial"],
  accept_proposal: ["admin", "gestor", "comercial"],
  schedule: ["admin", "gestor", "agendamento"],
  reschedule: ["admin", "gestor", "agendamento"],
  cancel: ["admin", "gestor"],
  realize: ["admin", "gestor", "executor"],
  complete: ["admin", "gestor", "executor"],
  finalize: ["admin", "gestor"],
  view_all: ["admin", "gestor", "comercial", "agendamento", "executor", "leitura"],
  export: ["admin", "gestor", "leitura"],
  delete: ["admin"],
  manage_users: ["admin"],
};

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [rolesRes, profileRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("profiles").select("full_name, email").eq("id", userId).maybeSingle(),
      ]);

      setRoles((rolesRes.data || []).map((r: any) => r.role as AppRole));
      if (profileRes.data) {
        setProfile({ full_name: profileRes.data.full_name, email: profileRes.data.email });
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Defer data fetch to avoid deadlocks
          setTimeout(() => fetchUserData(newSession.user.id), 0);
        } else {
          setRoles([]);
          setProfile(null);
        }
        setIsLoading(false);
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        fetchUserData(existingSession.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setProfile(null);
  }, []);

  const hasRole = useCallback((role: AppRole) => {
    return roles.includes("admin") || roles.includes(role);
  }, [roles]);

  const hasPermission = useCallback((action: string) => {
    if (roles.includes("admin")) return true;
    const allowed = PERMISSION_MAP[action];
    if (!allowed) return false;
    return roles.some((r) => allowed.includes(r));
  }, [roles]);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        session,
        roles,
        profile,
        isAuthenticated: !!session,
        isLoading,
        login,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
};
