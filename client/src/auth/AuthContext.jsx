import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const headers = {
    ...(options.body instanceof FormData ? {} : { "content-type": "application/json" }),
    ...options.headers,
  };
  const response = await fetch(`${API_BASE}/api${path}`, {
    credentials: "include",
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || "The request could not be completed.");
    error.status = response.status;
    const retryAfter = Number(response.headers.get("retry-after"));
    const rateLimitHeader = response.headers.get("ratelimit") || "";
    const resetMatch = rateLimitHeader.match(/reset=(\d+)/i);
    error.retryAfterSeconds = Number(payload.retryAfterSeconds) || retryAfter || Number(resetMatch?.[1]) || 0;
    throw error;
  }
  return payload;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState("");
  const [status, setStatus] = useState("loading");

  const applySession = useCallback(async (session) => {
    setAccessToken(session.accessToken);
    const profile = await request("/users/me", { headers: { authorization: `Bearer ${session.accessToken}` } });
    setUser(profile.user);
    setStatus("ready");
    return profile.user;
  }, []);

  const signIn = useCallback(async (email, password, rememberMe) => {
    const session = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password, rememberMe }) });
    return applySession(session);
  }, [applySession]);

  const signOut = useCallback(async () => {
    try { await request("/auth/logout", { method: "POST", body: "{}" }); }
    finally { setAccessToken(""); setUser(null); setStatus("ready"); }
  }, []);

  const apiRequest = useCallback(async (path, options = {}) => {
    let token = accessToken;
    if (!token) {
      const session = await request("/auth/refresh", { method: "POST", body: "{}" });
      token = session.accessToken;
      if (!token) {
        const error = new Error("Authentication required.");
        error.status = 401;
        throw error;
      }
      setAccessToken(token);
    }
    try {
      return await request(path, { ...options, headers: { ...options.headers, authorization: `Bearer ${token}` } });
    } catch (error) {
      if (!/authentication|required|expired|invalid access|session is no longer valid/i.test(error.message)) throw error;
      const session = await request("/auth/refresh", { method: "POST", body: "{}" });
      setAccessToken(session.accessToken);
      return request(path, { ...options, headers: { ...options.headers, authorization: `Bearer ${session.accessToken}` } });
    }
  }, [accessToken]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await request("/auth/refresh", { method: "POST", body: "{}" });
        if (!session.accessToken) {
          if (active) setStatus("ready");
          return;
        }
        if (!active) return;
        const profile = await request("/users/me", { headers: { authorization: `Bearer ${session.accessToken}` } });
        if (active) { setAccessToken(session.accessToken); setUser(profile.user); setStatus("ready"); }
      } catch { if (active) setStatus("ready"); }
    })();
    return () => { active = false; };
  }, []);

  const value = useMemo(() => ({ user, status, isAuthenticated: Boolean(user), signIn, signOut, apiRequest, setUser }), [user, status, signIn, signOut, apiRequest]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export async function authRequest(path, options = {}) { return request(`/auth${path}`, options); }
