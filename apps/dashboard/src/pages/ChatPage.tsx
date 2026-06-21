import type { useRuntimeChat } from "../hooks/useRuntimeChat";
import { ChatComposer } from "../components/ChatComposer";
import { MessageBubble } from "../components/MessageBubble";

export function ChatPage({ chat }: { chat: ReturnType<typeof useRuntimeChat> }) {
  return (
    <section className="page-panel chat-page">
      <div className="page-hero"><p className="eyebrow">Local AI</p><h1>Ask anything.</h1><span>Saved until New Chat.</span></div>
      {chat.error && <div className="error-banner">{chat.error}</div>}
      <section className="conversation" aria-label="Conversation">{chat.messages.map((message) => <MessageBubble key={message.id} message={message} />)}</section>
      <ChatComposer disabled={chat.isLoading} onSend={chat.send} onNewChat={chat.clear} />
    </section>
  );
}
