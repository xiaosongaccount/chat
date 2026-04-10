"use client";

import { FormEvent, useState } from "react";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export default function Home() {
  const [willingToContact, setWillingToContact] = useState<string>("");
  const [willingAsFriends, setWillingAsFriends] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [message, setMessage] = useState<string>("");

  const canSubmit = willingToContact !== "" && willingAsFriends !== "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setStatus("error");
      setMessage("请先完成两个问题的选择。");
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

      setStatus("success");
      setMessage(payload.message ?? "已提交，谢谢你的回答。");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "未知错误";
      setStatus("error");
      setMessage(`提交失败：${detail}`);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        background: "#f5f7fb",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid #e7eaf0",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: "12px", fontSize: "24px" }}>
          我想认真问你两个问题
        </h1>
        <p style={{ marginTop: 0, marginBottom: "20px", color: "#505a6b" }}>
          你只需要按真实想法选择即可，我会尊重你的答案。
        </p>

        <form onSubmit={handleSubmit}>
          <fieldset style={{ border: "none", padding: 0, marginBottom: "18px" }}>
            <legend style={{ fontWeight: 600, marginBottom: "10px" }}>
              1) 你还愿意和我相处联系吗？
            </legend>
            <label style={{ display: "block", marginBottom: "8px" }}>
              <input
                type="radio"
                name="q1"
                value="yes"
                checked={willingToContact === "yes"}
                onChange={(e) => setWillingToContact(e.target.value)}
              />{" "}
              愿意
            </label>
            <label style={{ display: "block" }}>
              <input
                type="radio"
                name="q1"
                value="no"
                checked={willingToContact === "no"}
                onChange={(e) => setWillingToContact(e.target.value)}
              />{" "}
              不愿意
            </label>
          </fieldset>

          <fieldset style={{ border: "none", padding: 0, marginBottom: "18px" }}>
            <legend style={{ fontWeight: 600, marginBottom: "10px" }}>
              2) 你愿意重新以朋友身份相处吗？
            </legend>
            <label style={{ display: "block", marginBottom: "8px" }}>
              <input
                type="radio"
                name="q2"
                value="yes"
                checked={willingAsFriends === "yes"}
                onChange={(e) => setWillingAsFriends(e.target.value)}
              />{" "}
              愿意
            </label>
            <label style={{ display: "block" }}>
              <input
                type="radio"
                name="q2"
                value="no"
                checked={willingAsFriends === "no"}
                onChange={(e) => setWillingAsFriends(e.target.value)}
              />{" "}
              不愿意
            </label>
          </fieldset>

          <label style={{ display: "block", marginBottom: "18px" }}>
            <span style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
              其他想说的话（可选）
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
              placeholder="如果你愿意，可以留一句话"
            />
          </label>

          <button
            type="submit"
            disabled={status === "submitting"}
            style={{
              width: "100%",
              background: "#1f6feb",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "12px 14px",
              fontWeight: 600,
              cursor: status === "submitting" ? "not-allowed" : "pointer",
              opacity: status === "submitting" ? 0.75 : 1,
            }}
          >
            {status === "submitting" ? "提交中..." : "提交"}
          </button>
        </form>

        {message ? (
          <p
            style={{
              marginTop: "14px",
              marginBottom: 0,
              color: status === "success" ? "#0a7a2f" : "#b42318",
              fontWeight: 500,
            }}
          >
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
