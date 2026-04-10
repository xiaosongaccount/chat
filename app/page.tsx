"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import styles from "./letter.module.css";
import {
  FORM_DRAFT_KEY,
  LAST_SUBMIT_KEY,
  SUBMIT_LOG_KEY,
} from "./lib/storage-keys";

type SubmitStatus = "idle" | "submitting" | "success" | "error";
type AnswerValue = "yes" | "no" | "";

type LastSubmitStored = {
  message?: string;
  submittedAt?: string;
  willingToContact?: AnswerValue;
  willingAsFriends?: AnswerValue;
  note?: string;
  serverSaved?: boolean;
};

type SubmitLogEntry = {
  at: string;
  willingToContact: "yes" | "no";
  willingAsFriends: "yes" | "no";
  note: string;
  serverSaved?: boolean;
};

function isAnswer(v: unknown): v is "yes" | "no" {
  return v === "yes" || v === "no";
}

function readSubmitLog(): SubmitLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SUBMIT_LOG_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    return Array.isArray(p) ? (p as SubmitLogEntry[]) : [];
  } catch {
    return [];
  }
}

function appendSubmitLog(entry: Omit<SubmitLogEntry, "at">) {
  const list = readSubmitLog();
  list.push({ ...entry, at: new Date().toISOString() });
  localStorage.setItem(SUBMIT_LOG_KEY, JSON.stringify(list.slice(-40)));
}

function formatShortTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function LetterPage() {
  const [willingToContact, setWillingToContact] = useState<AnswerValue>("");
  const [willingAsFriends, setWillingAsFriends] = useState<AnswerValue>("");
  const [note, setNote] = useState<string>("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [storageReady, setStorageReady] = useState(false);
  const [persistHint, setPersistHint] = useState<string>("");
  const [submitCount, setSubmitCount] = useState(0);
  const [lastSubmitAt, setLastSubmitAt] = useState<string | null>(null);
  const [lastServerSaved, setLastServerSaved] = useState<boolean | null>(null);

  const canSubmit = willingToContact !== "" && willingAsFriends !== "";

  useEffect(() => {
    queueMicrotask(() => {
      let q1: AnswerValue = "";
      let q2: AnswerValue = "";
      let noteVal = "";

      const draftRaw = localStorage.getItem(FORM_DRAFT_KEY);
      let hadMeaningfulDraft = false;
      if (draftRaw) {
        try {
          const draft = JSON.parse(draftRaw) as {
            willingToContact?: AnswerValue;
            willingAsFriends?: AnswerValue;
            note?: string;
          };
          if (isAnswer(draft.willingToContact)) q1 = draft.willingToContact;
          if (isAnswer(draft.willingAsFriends)) q2 = draft.willingAsFriends;
          if (typeof draft.note === "string") noteVal = draft.note;
          hadMeaningfulDraft =
            isAnswer(draft.willingToContact) ||
            isAnswer(draft.willingAsFriends) ||
            typeof draft.note === "string";
        } catch {
          localStorage.removeItem(FORM_DRAFT_KEY);
        }
      }

      const lastSubmitRaw = localStorage.getItem(LAST_SUBMIT_KEY);
      if (lastSubmitRaw) {
        try {
          const last = JSON.parse(lastSubmitRaw) as LastSubmitStored;
          if (!isAnswer(q1) && isAnswer(last.willingToContact))
            q1 = last.willingToContact;
          if (!isAnswer(q2) && isAnswer(last.willingAsFriends))
            q2 = last.willingAsFriends;
          if (!hadMeaningfulDraft && typeof last.note === "string")
            noteVal = last.note;
          if (last.message) {
            setStatus("success");
            setMessage(last.message);
          }
          if (last.submittedAt) setLastSubmitAt(last.submittedAt);
          if (typeof last.serverSaved === "boolean")
            setLastServerSaved(last.serverSaved);
        } catch {
          localStorage.removeItem(LAST_SUBMIT_KEY);
        }
      }

      setWillingToContact(q1);
      setWillingAsFriends(q2);
      setNote(noteVal);

      const log = readSubmitLog();
      setSubmitCount(log.length);
      if (log.length > 0) setLastSubmitAt(log[log.length - 1].at);

      setStorageReady(true);
    });
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(
      FORM_DRAFT_KEY,
      JSON.stringify({ willingToContact, willingAsFriends, note }),
    );
  }, [willingToContact, willingAsFriends, note, storageReady]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setStatus("error");
      setMessage("我想听到你真实的答案，请先完成两个选择。");
      return;
    }

    setStatus("submitting");
    setMessage("");
    setPersistHint("");

    try {
      const response = await fetch("/api/response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          willingToContact,
          willingAsFriends,
          note: note.trim(),
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        serverSaved?: boolean;
      };

      if (!response.ok) {
        throw new Error(payload.message ?? "提交失败");
      }

      const successMessage =
        payload.message ?? "谢谢你认真看完，也谢谢你的回答。";
      const serverSaved = payload.serverSaved === true;
      const submittedAt = new Date().toISOString();

      setStatus("success");
      setMessage(successMessage);
      setLastSubmitAt(submittedAt);
      setLastServerSaved(serverSaved);

      const snapshot: LastSubmitStored = {
        message: successMessage,
        submittedAt,
        willingToContact,
        willingAsFriends,
        note: note.trim(),
        serverSaved,
      };
      localStorage.setItem(LAST_SUBMIT_KEY, JSON.stringify(snapshot));
      localStorage.setItem(
        FORM_DRAFT_KEY,
        JSON.stringify({
          willingToContact,
          willingAsFriends,
          note: note.trim(),
        }),
      );

      appendSubmitLog({
        willingToContact,
        willingAsFriends,
        note: note.trim(),
        serverSaved,
      });
      setSubmitCount(readSubmitLog().length);

      setPersistHint(
        serverSaved
          ? "本次已写入项目里的 data/responses.json（本机开发时有效）。"
          : "本次未写入服务器文件，内容已安全存在你的浏览器中。",
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "未知错误";
      setStatus("error");
      setMessage(`提交失败：${detail}`);
    }
  }

  return (
    <main className={styles.shell}>
      <div className={styles.layout}>
        <aside className={styles.aside} aria-hidden>
          <div className={styles.asideLine} />
          <p className={styles.asideQuote}>
            真诚的话，不必太大声；认真选的答案，已经足够。
          </p>
          <div className={styles.asideMark}>寄</div>
        </aside>

        <div className={styles.main}>
          <header className={styles.hero}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              To 徐秋玲
            </p>
            <h1 className={styles.title}>
              给你的一封
              <span className={styles.titleAccent}>小小回信</span>
            </h1>
            <p className={styles.lead}>
              我想把心里话说清楚，也想把选择权交给你。无论你的答案是什么，我都会认真接住，也会尊重你。
            </p>
            <p className={styles.leadMuted}>
              这不是逼你决定，只是想给彼此一个明白。
            </p>
          </header>

          {storageReady && submitCount > 0 ? (
            <div className={styles.persistStrip} role="status">
              <span className={styles.persistIcon} aria-hidden>
                ✓
              </span>
              <div className={styles.persistText}>
                <strong>本地已留存</strong>
                共 {submitCount} 次提交
                {lastSubmitAt ? ` · 最近 ${formatShortTime(lastSubmitAt)}` : ""}
                {lastServerSaved === true
                  ? " · 上次已写入服务器文件"
                  : lastServerSaved === false
                    ? " · 上次仅浏览器保存"
                    : ""}
              </div>
            </div>
          ) : null}

          <article
            className={`${styles.paper} ${storageReady ? styles.paperVisible : styles.paperHidden}`}
          >
            <div className={styles.paperCorner} aria-hidden />
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>两个问题</h2>
              <span className={styles.panelHint}>按真实想法选择即可</span>
            </div>

            <form onSubmit={handleSubmit}>
              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>
                  1）你还愿意和我继续保持联系吗？
                </legend>
                <div className={styles.radioList}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="q1"
                      value="yes"
                      checked={willingToContact === "yes"}
                      onChange={(e) =>
                        setWillingToContact(e.target.value as AnswerValue)
                      }
                    />
                    <span>愿意，我们可以慢慢来</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="q1"
                      value="no"
                      checked={willingToContact === "no"}
                      onChange={(e) =>
                        setWillingToContact(e.target.value as AnswerValue)
                      }
                    />
                    <span>暂时不愿意</span>
                  </label>
                </div>
              </fieldset>

              <fieldset className={styles.fieldset}>
                <legend className={styles.legend}>
                  2）你愿意重新以朋友身份相处吗？
                </legend>
                <div className={styles.radioList}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="q2"
                      value="yes"
                      checked={willingAsFriends === "yes"}
                      onChange={(e) =>
                        setWillingAsFriends(e.target.value as AnswerValue)
                      }
                    />
                    <span>愿意，先从朋友开始</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="q2"
                      value="no"
                      checked={willingAsFriends === "no"}
                      onChange={(e) =>
                        setWillingAsFriends(e.target.value as AnswerValue)
                      }
                    />
                    <span>还不想以朋友方式相处</span>
                  </label>
                </div>
              </fieldset>

              <label className={styles.textareaLabel}>
                <span>如果你愿意，给我留一句话（可选）</span>
                <textarea
                  className={styles.textarea}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="比如：希望以后怎么相处，或你现在真实的想法"
                />
              </label>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={status === "submitting"}
              >
                {status === "submitting" ? "正在发送…" : "把答案告诉我"}
              </button>
            </form>

            {message ? (
              <div
                className={`${styles.feedback} ${
                  status === "success"
                    ? styles.feedbackSuccess
                    : styles.feedbackError
                }`}
              >
                <p className={styles.feedbackMain}>{message}</p>
                {status === "success" && persistHint ? (
                  <p className={styles.feedbackMeta}>{persistHint}</p>
                ) : null}
              </div>
            ) : null}
          </article>

          <Link href="/chat" className={styles.toChat}>
            去对话里慢慢写
            <span className={styles.toChatArrow} aria-hidden>
              →
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
