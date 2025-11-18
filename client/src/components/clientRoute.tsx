import { useEffect } from "react";
import { useLocation } from "wouter";

interface ClientRouteProps {
  children: React.ReactNode;
}

export default function ClientRoute({ children }: ClientRouteProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const session = localStorage.getItem("clientSession");
    if (!session) {
      setLocation("/"); 
      return;
    }

    const user = JSON.parse(session);
    if (!user.fullName || !user.email) { 
      setLocation("/"); 
    }
  }, [setLocation]);

  return <>{children}</>;
}
