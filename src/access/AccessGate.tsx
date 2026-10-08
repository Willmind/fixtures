import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { AppIcon } from "../AppIcon";
import { Icon } from "../icons";
import { matchesPasscode } from "./passcode";
import "./access.css";

export default function AccessGate({ onUnlock, onBack }: {
  onUnlock: () => void;
  onBack: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      if (await matchesPasscode(password)) {
        setPassword("");
        onUnlock();
      } else {
        setError("密码不正确，请重新输入。");
        input.current?.focus();
        input.current?.select();
      }
    } catch {
      setError("暂时无法验证密码，请使用 HTTPS 地址或更新浏览器后重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="access-page">
      <section className="access-card" aria-labelledby="access-title">
        <AppIcon className="access-emblem" />
        <h1 id="access-title">查看房屋资料</h1>
        <p className="access-description">输入密码以查看电气图、户型资料和现场实拍。</p>
        <form onSubmit={submit} className="access-form">
          <label htmlFor="access-password">访问密码</label>
          <div className={`access-input ${error ? "has-error" : ""}`}>
            <Icon name="lock" size={18} />
            <input
              ref={input}
              id="access-password"
              name="password"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              placeholder="请输入密码"
              value={password}
              maxLength={64}
              required
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "access-error" : "access-hint"}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
            />
          </div>
          <div className="access-feedback" aria-live="polite">
            {error ? (
              <p id="access-error" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <button className="access-submit" type="submit" disabled={pending}>
            {pending ? "正在验证…" : "查看资料"}
            <Icon name="chevron" size={17} />
          </button>
        </form>
        <button type="button" className="access-back" onClick={onBack}>
          返回三维首页
        </button>
        <p className="access-hint" id="access-hint">
          三维首页无需密码
        </p>
      </section>
    </main>
  );
}
