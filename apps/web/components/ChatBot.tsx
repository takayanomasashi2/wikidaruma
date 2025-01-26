import { useState } from "react";
import { useChat } from "ai/react";
import { X } from "lucide-react";
import opengraphImage from "@/app/opengraph-image.png";

interface ChatBotWithImageProps {
  userId: string;
}

export function ChatBotWithImage({ userId }: ChatBotWithImageProps) {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
    body: {
      userId,
    },
    onResponse: (response) => {
      console.log("Response received:", response);
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
  });

  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleChatWindow = () => {
    setIsChatOpen((prev) => !prev);
  };

  return (
    <div className="relative">
      <img
        src={opengraphImage.src}
        alt="ChatBot"
        className="w-32 h-auto cursor-pointer absolute bottom-4 right-4 z-10"
        onClick={toggleChatWindow}
      />

      {isChatOpen && (
        <div className="fixed inset-0 z-20 flex justify-end items-end p-4">
          <div className="relative w-full max-w-md bg-green-50 shadow-lg rounded-lg mb-28 mr-4">
            <button
              onClick={toggleChatWindow}
              className="absolute top-2 left-2 p-1 rounded-full hover:bg-gray-100 z-30"
              aria-label="Close chat"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col gap-4 h-[500px] overflow-y-auto mt-6 p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "assistant"
                      ? "justify-start"
                      : "justify-end"
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

            <form onSubmit={handleSubmit} className="flex gap-2 mt-4 p-4">
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
        </div>
      )}
    </div>
  );
}
