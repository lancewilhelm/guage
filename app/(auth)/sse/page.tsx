"use client";

import { useState } from "react";

export default function ChatStream() {
  const [messages, setMessages] = useState<string[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const startStream = async () => {
    if (isStreaming || !userInput.trim()) return;

    setIsStreaming(true);
    setMessages((prev) => [...prev, `You: ${userInput}`]); // Add user message
    setUserInput(""); // Clear input field

    try {
      const response = await fetch("/api/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let accumulatedResponse = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedResponse += chunk;
        setMessages((prev) => [...prev.slice(0, -1), `AI: ${accumulatedResponse}`]);
      }
    } catch (error) {
      console.error("Error streaming:", error);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold">Streaming Chat with OpenAI</h2>

      {/* Input Field */}
      <div className="flex gap-2 mt-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message..."
          className="px-4 py-2 border rounded w-full"
        />
        <button
          onClick={startStream}
          disabled={isStreaming || !userInput.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {isStreaming ? "Streaming..." : "Send"}
        </button>
      </div>

      {/* Messages */}
      <div className="mt-2 p-2 border rounded">
        {messages.map((msg, index) => (
          <p key={index}>{msg}</p>
        ))}
      </div>
    </div>
  );
}

