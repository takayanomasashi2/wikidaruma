import { useState } from "react";
import { useChat } from "ai/react";
import opengraphImage from "@/app/opengraph-image.png"; // 画像のインポート

export function ChatBotWithImage() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
    initialMessages: [],
    onResponse: (response) => {
      console.log('Response received:', response);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  const [isChatOpen, setIsChatOpen] = useState(false); // チャットウィンドウが開いているかの状態

  // チャットウィンドウを開閉する
  const toggleChatWindow = () => {
    setIsChatOpen((prevState) => !prevState);
  };

  return (
    <div className="relative">
      {/* 画像を右下に配置してクリックでチャットウィンドウを開く */}
      <img
        src={opengraphImage.src}  // .src を使用
        alt="ChatBot"
        className="w-32 h-auto cursor-pointer absolute bottom-4 right-4 z-10" // 画像を右下に配置
        onClick={toggleChatWindow}
      />

      {/* チャットウィンドウ */}
      {isChatOpen && (
        <div className="w-full max-w-md mx-auto p-4 bg-white shadow-lg rounded-lg absolute bottom-36 right-4 z-20">
          <div className="flex flex-col gap-4 h-[500px] overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "assistant" ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    message.role === "assistant"
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>

          {/* 入力フォーム */}
          <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="質問を入力してください..."
              className="flex-1 rounded-md border border-input bg-background px-3 py-2"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
            >
              送信
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
