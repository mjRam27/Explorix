// context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { api } from "../api/client";

type User = {
  user_id: string;
  email: string;
  name?: string;
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
      try {
        const storedToken = await SecureStore.getItemAsync("access_token");

        if (storedToken) {
          setToken(storedToken);
          api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;

          const res = await api.get("/users/me");
          setUser(res.data);
        }
      } catch (e) {
        console.log("Auth restore failed");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (jwt: string) => {
    await SecureStore.setItemAsync("access_token", jwt);

    api.defaults.headers.common.Authorization = `Bearer ${jwt}`;

    setToken(jwt);

    const res = await api.get("/users/me");
    setUser(res.data);
  };


const logout = async () => {
  await SecureStore.deleteItemAsync("access_token");
  delete api.defaults.headers.common.Authorization;
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
