// components/ChatBot.tsx
"use client";

import { useState } from "react";
import { useChat } from "ai/react";

export function ChatBot() {
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

 return (
   <div className="w-full max-w-md mx-auto">
     <div className="flex flex-col gap-4 p-4 h-[500px] overflow-y-auto">
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
     <form onSubmit={handleSubmit} className="flex gap-2 p-4">
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
 );
}