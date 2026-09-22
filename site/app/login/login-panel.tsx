"use client";

import { FormEvent, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { GitBranch, LoaderCircle, LockKeyhole, Mail, Network } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Mode = "login" | "register";

export function LoginPanel({
  config,
  initialError,
}: {
  config: { url: string; publishableKey: string } | null;
  initialError?: string;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialError ?? "");
  const router = useRouter();

  const enterWorkspace = () => {
    router.push("/");
    router.refresh();
  };

  const getClient = () => {
    if (!config) throw new Error("Supabase 尚未配置");
    return createBrowserClient(config.url, config.publishableKey);
  };

  const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const supabase = getClient();
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
          },
        });
        if (error) throw error;
        if (data.session) enterWorkspace();
        else setMessage("注册成功，请打开邮箱中的确认链接完成登录。");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        enterWorkspace();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败，请重试");
    } finally {
      setBusy(false);
    }
  };

  const loginWithGitHub = async () => {
    setBusy(true);
    setMessage("");
    try {
      const supabase = getClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
      if (error) throw error;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "GitHub 登录失败");
      setBusy(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-story" aria-label="MyGraph 简介">
        <div className="login-brand">
          <span className="brand-mark"><Network /></span>
          <span>MyGraph</span>
        </div>
        <div className="login-story-copy">
          <span className="eyebrow">KNOWLEDGE, CONNECTED</span>
          <h1>让每一个想法，找到它的位置。</h1>
          <p>在一张持续生长的图谱里整理概念、建立关系，并把零散知识变成清晰结构。</p>
        </div>
        <div className="login-orbit" aria-hidden="true">
          <i /><i /><i /><i /><i />
          <span />
        </div>
      </section>

      <section className="login-form-side">
        <div className="login-card">
          <div className="login-card-heading">
            <span className="login-lock"><LockKeyhole /></span>
            <div>
              <h2>{mode === "login" ? "欢迎回来" : "创建账户"}</h2>
              <p>{mode === "login" ? "登录以继续使用你的知识工作区" : "注册后即可开始构建知识图谱"}</p>
            </div>
          </div>

          <div className="auth-mode-switch" role="tablist" aria-label="登录方式">
            <button className={mode === "login" ? "is-active" : ""} onClick={() => setMode("login")} type="button">登录</button>
            <button className={mode === "register" ? "is-active" : ""} onClick={() => setMode("register")} type="button">邮箱注册</button>
          </div>

          <Button className="github-auth-button" variant="outline" onClick={loginWithGitHub} disabled={busy || !config}>
            <GitBranch /> 使用 GitHub 快捷登录
          </Button>

          <div className="auth-divider"><span>或使用邮箱</span></div>

          <form onSubmit={submitEmail} className="email-auth-form">
            <div>
              <Label htmlFor="email">邮箱</Label>
              <div className="auth-input-wrap">
                <Mail />
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
              </div>
            </div>
            <div>
              <Label htmlFor="password">密码</Label>
              <div className="auth-input-wrap">
                <LockKeyhole />
                <Input id="password" type="password" minLength={6} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="至少 6 位" required />
              </div>
            </div>
            {message ? <p className="auth-message" role="status">{message}</p> : null}
            {!config ? <p className="auth-message">站点管理员还需要配置 Supabase 项目。</p> : null}
            <Button type="submit" className="email-auth-button" disabled={busy || !config}>
              {busy ? <LoaderCircle className="animate-spin" /> : null}
              {mode === "login" ? "登录 MyGraph" : "创建账户"}
            </Button>
          </form>
          <p className="auth-footnote">身份验证由 Supabase Auth 安全处理，MyGraph 不保存你的密码。</p>
        </div>
      </section>
    </main>
  );
}
