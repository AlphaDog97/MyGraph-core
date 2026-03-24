import { FormEvent, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AuthControls() {
  const { user, authMode, loading, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);

  const modeLabel = useMemo(() => (mode === "login" ? "登录" : "注册"), [mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError("请输入有效邮箱地址。");
      return;
    }

    if (password.length < 8) {
      setError("密码至少 8 位。");
      return;
    }

    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      setPassword("");
    } catch (err) {
      setError((err as Error).message || `${modeLabel}失败，请稍后重试。`);
    }
  };

  const handleGuestMode = async () => {
    setError(null);
    try {
      if (authMode === "authenticated") {
        await signOut();
      }
    } catch (err) {
      setError((err as Error).message || "切换访客模式失败。");
    }
  };

  return (
    <div className="auth-controls">
      <div className="auth-status">
        <span className="auth-pill">
          {authMode === "authenticated" ? `已登录：${user?.email ?? "未知用户"}` : "访客模式"}
        </span>
        {authMode === "authenticated" && (
          <button className="btn btn-secondary" onClick={() => void signOut()} disabled={loading}>
            登出
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => void handleGuestMode()} disabled={loading || authMode === "guest"}>
          访客模式
        </button>
      </div>

      {authMode === "guest" && (
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="auth-input"
            type="password"
            placeholder="密码（至少 8 位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {modeLabel}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            disabled={loading}
          >
            {mode === "login" ? "切换注册" : "切换登录"}
          </button>
        </form>
      )}

      {error && <p className="auth-error">{error}</p>}
    </div>
  );
}
