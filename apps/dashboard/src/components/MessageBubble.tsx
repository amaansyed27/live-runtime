import type { ChatMessage } from "@live-runtime/core";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <article className={`message ${isUser ? "message-user" : "message-assistant"}`}>
      <div className="message-meta">
        <span>{isUser ? "You" : "Live Runtime"}</span>
        <time>{message.createdAt ? new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "now"}</time>
      </div>
      <p>{message.content || "Thinking..."}</p>
    </article>
  );
}
