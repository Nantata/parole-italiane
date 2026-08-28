import { cloneElement, FormEvent, isValidElement, ReactElement, ReactNode, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

type Mode = "login" | "signup" | "recovery" | "new-password";

export default function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [mode, setMode] = useState<Mode>(() => {
    const recoveryType = new URLSearchParams(window.location.hash.slice(1)).get("type");
    return recoveryType === "recovery" ? "new-password" : "login";
  });
  const [email, setEmail] = useState("nantata8@gmail.com");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setMode("new-password");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user.email) {
      setAllowed(null);
      setIsOwner(false);
      return;
    }
    // Доступ к приложению получают все подтверждённые аккаунты.
    // Таблица allowed_emails используется только для определения владельца
    // и, следовательно, права редактировать карточки.
    supabase
      .from("allowed_emails")
      .select("is_owner")
      .eq("email", session.user.email.toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        setAllowed(true);
        setIsOwner(Boolean(data?.is_owner));
      });
  }, [session]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.href.split("#")[0] },
        });
        if (error) throw error;
        setMessage(data.session ? "Регистрация завершена." : "Проверьте почту и подтвердите регистрацию по ссылке.");
      } else if (mode === "recovery") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.href.split("#")[0],
        });
        if (error) throw error;
        setMessage("Ссылка для восстановления пароля отправлена на почту.");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage("Новый пароль сохранён.");
        setMode("login");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось выполнить действие");
    } finally {
      setBusy(false);
    }
  }

  if (session && allowed === true && mode !== "new-password") {
    if (!isValidElement(children)) return <>{children}</>;

    return cloneElement(
      children as ReactElement<{
        account?: {
          email: string;
          onSignOut: () => Promise<unknown>;
        };
      }>,
      {
        account: {
          email: session.user.email ?? "",
          isOwner,
          onSignOut: () => supabase.auth.signOut(),
        },
      },
    );
  }

  if (session && allowed === null && mode !== "new-password")
    return <div className="authPage"><div className="authCard">Проверяю доступ…</div></div>;

  if (session && allowed === false && mode !== "new-password") {
    return (
      <div className="authPage"><div className="authCard">
        <div className="authLogo">ciao</div>
        <h1>Нет доступа</h1>
        <p>Адрес {session.user.email} не добавлен в список разрешённых пользователей.</p>
        <button className="authPrimary" onClick={() => supabase.auth.signOut()}>Выйти</button>
      </div></div>
    );
  }

  const title = mode === "signup" ? "Создайте аккаунт" : mode === "recovery" ? "Восстановление пароля" : mode === "new-password" ? "Придумайте новый пароль" : "Войдите, чтобы открыть карточки";
  return (
    <div className="authPage">
      <form className="authCard" onSubmit={submit}>
        <div className="authLogo">ciao</div>
        <h1>Le mie parole italiane</h1>
        <p>{title}</p>
        {mode !== "new-password" && (
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
        )}
        {mode !== "recovery" && (
          <label>{mode === "new-password" ? "Новый пароль" : "Пароль"}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        )}
        <button className="authPrimary" disabled={busy}>
          {busy ? "Подождите…" : mode === "signup" ? "Зарегистрироваться" : mode === "recovery" ? "Отправить ссылку" : mode === "new-password" ? "Сохранить пароль" : "Войти"}
        </button>
        {message && <div className="authMessage">{message}</div>}
        <div className="authLinks">
          {mode !== "login" && <button type="button" onClick={() => { setMode("login"); setMessage(""); }}>Войти</button>}
          {mode === "login" && <><button type="button" onClick={() => setMode("signup")}>Регистрация</button><button type="button" onClick={() => setMode("recovery")}>Забыли пароль?</button></>}
        </div>
      </form>
    </div>
  );
}
