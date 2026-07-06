import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import usersApi from "../api/usersApi";
import type { User } from "../api/usersApi";

type AuthContextType = {
  isAuthenticated: boolean;
  user: User | null;
  login: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("access_token")
  );
  const [user, setUser] = useState<User | null>(null);

  const refreshUser = useCallback(async () => {
    if (isAuthenticated) {
      try {
        const userData = await usersApi.getMe();
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user", error);
        // Could logout here if token is invalid
        // logout();
      }
    } else {
      setUser(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async () => {
    setIsAuthenticated(true);
    await refreshUser();
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
