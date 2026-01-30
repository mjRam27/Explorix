import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api } from "../api/client";

type User = {
  id: string;
  username: string;
  avatar?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>(null as any);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const storedToken = await SecureStore.getItemAsync("token");
      if (storedToken) {
        setToken(storedToken);
        api.defaults.headers.Authorization = `Bearer ${storedToken}`;
        const res = await api.get("/users/me");
        setUser(res.data);
      }
      setLoading(false);
    })();
  }, []);

  const login = async (jwt: string) => {
    await SecureStore.setItemAsync("token", jwt);
    api.defaults.headers.Authorization = `Bearer ${jwt}`;
    setToken(jwt);
    const res = await api.get("/users/me");
    setUser(res.data);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync("token");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
