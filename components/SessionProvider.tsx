"use client";

import { useEffect } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { Session } from "@/utils/auth";

interface SessionProviderProps {
  session: Session;
  children: React.ReactNode;
}

export default function SessionProvider({
  session,
  children,
}: SessionProviderProps) {
  const setSession = useSessionStore((state) => state.setSession);

  useEffect(() => {
    setSession(session);
  }, [session, setSession]);

  return <>{children}</>;
}
