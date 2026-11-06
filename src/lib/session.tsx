import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { callApi } from "@/lib/api";

export type AdminSession = { role: "admin"; token: string; username: string };
export type TeacherSession = { role: "teacher"; token: string; username: string };
export type StudentSession = { role: "student"; name: string; kelas: string; tingkat: string };
export type Session = AdminSession | TeacherSession | StudentSession;

const STORAGE_KEY = "cbt-axshat-session";

type SessionContextValue = {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function readStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    return parsed && typeof parsed.role === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readStoredSession);

  const signIn = useCallback((next: Session) => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const signOut = useCallback(() => {
    setSession((current) => {
      if (current && current.role !== "student") {
        callApi("logout", undefined, current.token).catch(() => undefined);
      }
      return null;
    });
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
