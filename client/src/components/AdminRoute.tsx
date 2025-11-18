import { useEffect } from "react";
import { useLocation } from "wouter";

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const session = localStorage.getItem("adminSession");
    if (!session) {
      setLocation("/admin-login"); 
      return;
    }

    const user = JSON.parse(session);
    if (user.email !== "maryem@gmail.com") {
      setLocation("/admin-login"); 
    }
  }, [setLocation]);

  return <>{children}</>;
}
