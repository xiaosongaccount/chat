"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type SubmitStatus = "idle" | "submitting" | "success" | "error";
type AnswerValue = "yes" | "no" | "";
type ChatMessage = {
  id: string;
  text: string;
  createdAt: string;
  side: "left" | "right";
};

const FORM_DRAFT_KEY = "xql-form-draft";
const LAST_SUBMIT_KEY = "xql-last-submit";
const CHAT_HISTORY_KEY = "xql-chat-history";

export default function Home() {
  const [willingToContact, setWillingToContact] = useState<AnswerValue>("");
  const [willingAsFriends, setWillingAsFriends] = useState<AnswerValue>("");
  const [note, setNote] = useState<string>("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [chatInput, setChatInput] = useState<string>("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatSide, setChatSide] = useState<"left" | "right">("right");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const canSubmit = willingToContact !== "" && willingAsFriends !== "";

  useEffect(() => {
    const draftRaw = localStorage.getItem(FORM_DRAFT_KEY);
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw) as {
          willingToContact?: AnswerValue;
          willingAsFriends?: AnswerValue;
          note?: string;
        };
        if (draft.willingToContact) setWillingToContact(draft.willingToContact);
        if (draft.willingAsFriends) setWillingAsFriends(draft.willingAsFriends);
        if (typeof draft.note === "string") setNote(draft.note);
      } catch {
        localStorage.removeItem(FORM_DRAFT_KEY);
      }
    }

    const lastSubmitRaw = localStorage.getItem(LAST_SUBMIT_KEY);
    if (lastSubmitRaw) {
      try {
        const lastSubmit = JSON.parse(lastSubmitRaw) as { message?: string };
        if (lastSubmit.message) {
          setStatus("success");
          setMessage(lastSubmit.message);
        }
      } catch {
        localStorage.removeItem(LAST_SUBMIT_KEY);
      }
    }

    const chatRaw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (chatRaw) {
      try {
        const chat = JSON.parse(chatRaw) as ChatMessage[];
        if (Array.isArray(chat)) setChatHistory(chat);
      } catch {
        localStorage.removeItem(CHAT_HISTORY_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      FORM_DRAFT_KEY,
      JSON.stringify({ willingToContact, willingAsFriends, note }),
    );
  }, [willingToContact, willingAsFriends, note]);

  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [chatHistory]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setStatus("error");
      setMessage("我想听到你真实的答案，请先完成两个选择。");
      return;
    }

    setStatus("submitting");
    setMessage("");

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

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "提交失败");
      }

      const successMessage =
        payload.message ?? "谢谢你认真看完，也谢谢你的回答。";
      setStatus("success");
      setMessage(successMessage);
      localStorage.setItem(
        LAST_SUBMIT_KEY,
        JSON.stringify({
          message: successMessage,
          submittedAt: new Date().toISOString(),
          willingToContact,
          willingAsFriends,
          note: note.trim(),
        }),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : "未知错误";
      setStatus("error");
      setMessage(`提交失败：${detail}`);
    }
  }

  function handleAddChatMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatHistory((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text,
        createdAt: new Date().toISOString(),
        side: chatSide,
      },
    ]);
    setChatInput("");
  }

  function handleClearChat() {
    setChatHistory([]);
    localStorage.removeItem(CHAT_HISTORY_KEY);
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        background:
          "radial-gradient(circle at top, #fff1f2 0%, #fff 35%, #f9fafb 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "rgba(255,255,255,0.92)",
          borderRadius: "18px",
          border: "1px solid #f1d5db",
          padding: "28px",
          boxShadow: "0 16px 40px rgba(167, 47, 88, 0.1)",
        }}
      >
        <h1
          style={{
            marginTop: 0,
            marginBottom: "10px",
            fontSize: "28px",
            color: "#7a2940",
            letterSpacing: "0.5px",
          }}
        >
          徐秋玲，给你的一封小小回信
        </h1>
        <p
          style={{
            marginTop: 0,
            marginBottom: "8px",
            color: "#5f4b53",
            lineHeight: 1.75,
          }}
        >
          我想把心里话说清楚，也想把选择权交给你。
          <br />
          无论你的答案是什么，我都会认真接住，也会尊重你。
        </p>
        <p
          style={{
            marginTop: 0,
            marginBottom: "22px",
            color: "#9b6b78",
            fontSize: "14px",
          }}
        >
          这不是逼你决定，只是想给彼此一个明白。
        </p>

        <form onSubmit={handleSubmit}>
          <fieldset
            style={{ border: "none", padding: 0, marginBottom: "18px" }}
          >
            <legend style={{ fontWeight: 600, marginBottom: "10px" }}>
              1) 你还愿意和我继续保持联系吗？
            </legend>
            <label style={{ display: "block", marginBottom: "8px" }}>
              <input
                type="radio"
                name="q1"
                value="yes"
                checked={willingToContact === "yes"}
                onChange={(e) =>
                  setWillingToContact(e.target.value as AnswerValue)
                }
              />{" "}
              愿意，我们可以慢慢来
            </label>
            <label style={{ display: "block" }}>
              <input
                type="radio"
                name="q1"
                value="no"
                checked={willingToContact === "no"}
                onChange={(e) =>
                  setWillingToContact(e.target.value as AnswerValue)
                }
              />{" "}
              暂时不愿意
            </label>
          </fieldset>

          <fieldset
            style={{ border: "none", padding: 0, marginBottom: "18px" }}
          >
            <legend style={{ fontWeight: 600, marginBottom: "10px" }}>
              2) 你愿意我们重新以朋友身份相处吗？
            </legend>
            <label style={{ display: "block", marginBottom: "8px" }}>
              <input
                type="radio"
                name="q2"
                value="yes"
                checked={willingAsFriends === "yes"}
                onChange={(e) =>
                  setWillingAsFriends(e.target.value as AnswerValue)
                }
              />{" "}
              愿意，先从朋友开始
            </label>
            <label style={{ display: "block" }}>
              <input
                type="radio"
                name="q2"
                value="no"
                checked={willingAsFriends === "no"}
                onChange={(e) =>
                  setWillingAsFriends(e.target.value as AnswerValue)
                }
              />{" "}
              还不想以朋友方式相处
            </label>
          </fieldset>

          <label style={{ display: "block", marginBottom: "18px" }}>
            <span
              style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}
            >
              如果你愿意，给我留一句话（可选）
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                borderRadius: "10px",
                border: "1px solid #d4dae5",
                padding: "10px 12px",
                resize: "vertical",
                font: "inherit",
              }}
              placeholder="比如：希望以后怎么相处，或你现在真实的想法"
            />
          </label>

          <button
            type="submit"
            disabled={status === "submitting"}
            style={{
              width: "100%",
              background: "linear-gradient(135deg, #b63a62 0%, #d85a83 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "12px 14px",
              fontWeight: 600,
              cursor: status === "submitting" ? "not-allowed" : "pointer",
              opacity: status === "submitting" ? 0.75 : 1,
            }}
          >
            {status === "submitting" ? "正在发送..." : "把答案告诉我"}
          </button>
        </form>

        {message ? (
          <p
            style={{
              marginTop: "14px",
              marginBottom: 0,
              color: status === "success" ? "#7a2940" : "#b42318",
              fontWeight: 500,
            }}
          >
            {message}
          </p>
        ) : null}

        <hr
          style={{
            border: "none",
            borderTop: "1px solid #f1d5db",
            margin: "24px 0",
          }}
        />
        <h2 style={{ margin: "0 0 8px", fontSize: "20px", color: "#7a2940" }}>
          聊天记录
        </h2>
        <p style={{ margin: "0 0 12px", color: "#7c6a70", fontSize: "14px" }}>
          这里是本地聊天区，内容只保存在当前浏览器。
        </p>

        <div
          ref={chatScrollRef}
          style={{
            border: "1px solid #ecd4db",
            borderRadius: "10px",
            padding: "10px",
            minHeight: "120px",
            maxHeight: "220px",
            overflowY: "auto",
            background: "#fff7f9",
          }}
        >
          {chatHistory.length === 0 ? (
            <p style={{ margin: 0, color: "#9b8b90" }}>还没有聊天记录。</p>
          ) : (
            chatHistory.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent:
                    item.side === "right" ? "flex-end" : "flex-start",
                  marginBottom: "8px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    maxWidth: "75%",
                    borderRadius: "14px",
                    padding: "8px 12px",
                    color: item.side === "right" ? "#fff" : "#5b444b",
                    background: item.side === "right" ? "#b63a62" : "#ffe8ef",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {item.text}
                </p>
              </div>
            ))
          )}
        </div>

        <div
          style={{
            marginTop: "10px",
            marginBottom: "8px",
            display: "flex",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => setChatSide("left")}
            style={{
              border: "1px solid #dcbac4",
              borderRadius: "999px",
              padding: "6px 10px",
              background: chatSide === "left" ? "#b63a62" : "#fff",
              color: chatSide === "left" ? "#fff" : "#7a2940",
              cursor: "pointer",
            }}
          >
            徐秋玲
          </button>
          <button
            type="button"
            onClick={() => setChatSide("right")}
            style={{
              border: "1px solid #dcbac4",
              borderRadius: "999px",
              padding: "6px 10px",
              background: chatSide === "right" ? "#b63a62" : "#fff",
              color: chatSide === "right" ? "#fff" : "#7a2940",
              cursor: "pointer",
            }}
          >
            宋健波
          </button>
        </div>

        <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
          <input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="输入想说的话，点发送后会保存到本地"
            style={{
              flex: 1,
              borderRadius: "10px",
              border: "1px solid #dcbac4",
              padding: "10px 12px",
              font: "inherit",
            }}
          />
          <button
            type="button"
            onClick={handleAddChatMessage}
            style={{
              border: "none",
              borderRadius: "10px",
              padding: "10px 14px",
              background: "#b63a62",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            发送
          </button>
        </div>
        <button
          type="button"
          onClick={handleClearChat}
          style={{
            marginTop: "8px",
            border: "1px solid #dcbac4",
            borderRadius: "10px",
            padding: "8px 12px",
            background: "#fff",
            color: "#7a2940",
            cursor: "pointer",
          }}
        >
          清空聊天记录
        </button>
      </section>
    </main>
  );
}
