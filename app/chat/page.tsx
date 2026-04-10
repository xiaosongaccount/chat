"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./chat.module.css";
import { CHAT_HISTORY_KEY } from "../lib/storage-keys";

type ChatMessage = {
  id: string;
  text: string;
  createdAt: string;
  side: "left" | "right";
};

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

const POLL_MS = 2800;

export default function ChatPage() {
  const [chatInputLeft, setChatInputLeft] = useState<string>("");
  const [chatInputRight, setChatInputRight] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [ready, setReady] = useState(false);
  const [syncHint, setSyncHint] = useState<string>("");
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: ChatMessage[] = [];
      try {
        const res = await fetch("/api/chat");
        const data = (await res.json()) as { messages?: ChatMessage[] };
        if (res.ok && Array.isArray(data.messages)) {
          next = data.messages;
        }
      } catch {
        /* 稍后尝试本地 */
      }

      if (cancelled) return;

      if (next.length === 0) {
        try {
          const raw = localStorage.getItem(CHAT_HISTORY_KEY);
          if (raw) {
            const local = JSON.parse(raw) as ChatMessage[];
            if (Array.isArray(local) && local.length > 0) {
              next = local;
              setSyncHint("暂从本机缓存恢复；连上服务器后会以 JSON 为准。");
            }
          }
        } catch {
          localStorage.removeItem(CHAT_HISTORY_KEY);
        }
      } else {
        setSyncHint("记录来自 data/chat-messages.json，多端定时同步。");
      }

      if (!cancelled) {
        setChatHistory(next);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
  }, [chatHistory, ready]);

  useEffect(() => {
    if (!ready) return;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/chat");
        const data = (await res.json()) as { messages?: ChatMessage[] };
        if (res.ok && Array.isArray(data.messages)) {
          setChatHistory(data.messages);
        }
      } catch {
        /* 保持当前列表 */
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [ready]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [chatHistory]);

  async function appendChat(side: "left" | "right", raw: string) {
    const text = raw.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, text }),
      });
      const data = (await res.json()) as {
        entry?: ChatMessage;
        persisted?: boolean;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error ?? "发送失败");
      }

      if (data.entry) {
        setChatHistory((prev) => {
          if (prev.some((m) => m.id === data.entry!.id)) return prev;
          return [...prev, data.entry!];
        });
        if (data.persisted === false) {
          setSyncHint("无法写入服务器文件（如 Vercel），本条仅保存在本机；本地仍会备份。");
        } else {
          setSyncHint("已写入 data/chat-messages.json；对方页面约 " + POLL_MS / 1000 + " 秒内会刷到。");
        }
      }

      if (side === "left") setChatInputLeft("");
      else setChatInputRight("");
    } catch {
      const fallback: ChatMessage = {
        id: crypto.randomUUID(),
        side,
        text,
        createdAt: new Date().toISOString(),
      };
      setChatHistory((prev) => [...prev, fallback]);
      if (side === "left") setChatInputLeft("");
      else setChatInputRight("");
      setSyncHint("未连上服务器，已只存本机；开发时请确认 npm run dev 已启动。");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className={styles.shell}>
      <div className={styles.ambient} aria-hidden>
        <div className={styles.blobA} />
        <div className={styles.blobB} />
        <div className={styles.blobC} />
        <div className={styles.gridGlow} />
      </div>

      <div className={styles.frame}>
        <header className={styles.header}>
          <p className={styles.kicker}>Server · JSON 同步</p>
          <h1 className={styles.title}>
            <span className={styles.titleMain}>徐秋玲</span>
            <span className={styles.titleDot} />
            <span className={styles.titleMain}>宋健波</span>
          </h1>
          <p className={styles.subtitle}>
            消息写入项目里的 chat-messages.json；本页会定时拉取，两人各开一页即可「通讯」。
          </p>
          {syncHint ? (
            <p className={styles.syncBanner} role="status">
              {syncHint}
            </p>
          ) : null}
        </header>

        <div className={styles.chatPanel}>
          <div className={styles.panelChrome}>
            <span className={styles.chromeDot} />
            <span className={styles.chromeDot} />
            <span className={styles.chromeDot} />
            <span className={styles.chromeLabel}>对话流</span>
          </div>

          <div ref={chatScrollRef} className={styles.viewport}>
            {chatHistory.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyOrbit} aria-hidden />
                <p className={styles.emptyTitle}>从这里开始</p>
                <p className={styles.emptyText}>
                  发送后写入服务器 JSON；另一设备同一地址打开本页，几秒内会同步显示。
                </p>
              </div>
            ) : (
              <div className={styles.thread}>
                {chatHistory.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.bubbleRow} ${
                      item.side === "right"
                        ? styles.bubbleRowRight
                        : styles.bubbleRowLeft
                    }`}
                  >
                    <div
                      className={`${styles.bubbleCol} ${
                        item.side === "right"
                          ? styles.bubbleColRight
                          : styles.bubbleColLeft
                      }`}
                    >
                      <span className={styles.bubbleSender}>
                        {item.side === "left" ? "徐秋玲" : "宋健波"}
                      </span>
                      <p
                        className={`${styles.bubble} ${
                          item.side === "right"
                            ? styles.bubbleRight
                            : styles.bubbleLeft
                        }`}
                      >
                        {item.text}
                      </p>
                      <time
                        className={styles.bubbleTime}
                        dateTime={item.createdAt}
                      >
                        {formatTime(item.createdAt)}
                      </time>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.composerDock}>
            <div className={styles.dockGlow} aria-hidden />
            <div className={styles.composerGrid}>
              <div className={`${styles.card} ${styles.cardMoon}`}>
                <div className={styles.cardHead}>
                  <span className={`${styles.avatar} ${styles.avatarLeft}`}>
                    玲
                  </span>
                  <div className={styles.cardTitles}>
                    <span className={styles.name}>徐秋玲</span>
                    <span className={styles.nameSub}>左侧 · 月白</span>
                  </div>
                  <span className={styles.tag}>L</span>
                </div>
                <textarea
                  className={styles.textarea}
                  value={chatInputLeft}
                  onChange={(e) => setChatInputLeft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void appendChat("left", chatInputLeft);
                    }
                  }}
                  rows={3}
                  placeholder="写在这里… ⌘/Ctrl + Enter"
                  disabled={sending}
                />
                <button
                  type="button"
                  className={styles.btnGhost}
                  disabled={sending}
                  onClick={() => void appendChat("left", chatInputLeft)}
                >
                  发送
                </button>
              </div>

              <div className={`${styles.card} ${styles.cardJade}`}>
                <div className={styles.cardHead}>
                  <span className={`${styles.avatar} ${styles.avatarRight}`}>
                    波
                  </span>
                  <div className={styles.cardTitles}>
                    <span className={styles.name}>宋健波</span>
                    <span className={styles.nameSub}>右侧 · 翡翠</span>
                  </div>
                  <span className={styles.tag}>R</span>
                </div>
                <textarea
                  className={styles.textarea}
                  value={chatInputRight}
                  onChange={(e) => setChatInputRight(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void appendChat("right", chatInputRight);
                    }
                  }}
                  rows={3}
                  placeholder="写在这里… ⌘/Ctrl + Enter"
                  disabled={sending}
                />
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={sending}
                  onClick={() => void appendChat("right", chatInputRight)}
                >
                  发送
                </button>
              </div>
            </div>
            <p className={styles.footerNote}>
              主存储：data/chat-messages.json · 约每 {POLL_MS / 1000}s
              拉取 · localStorage 备份
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
