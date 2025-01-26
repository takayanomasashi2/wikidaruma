(function () {
  const API_BASE_URL = "wikidaruma.vercel.app";

  const params = new URLSearchParams(window.location.search);
  const userId =
    params.get("userId") || document.currentScript.getAttribute("data-user-id");

  if (!userId) {
    console.error("User ID is missing!");
    return;
  }

  const chatContainer = document.createElement("div");
  chatContainer.style.position = "fixed";
  chatContainer.style.bottom = "20px";
  chatContainer.style.right = "20px";
  chatContainer.style.width = "300px";
  chatContainer.style.height = "450px";
  chatContainer.style.border = "1px solid #ccc";
  chatContainer.style.borderRadius = "8px";
  chatContainer.style.backgroundColor = "#fff";
  chatContainer.style.zIndex = "9999";
  chatContainer.style.display = "flex";
  chatContainer.style.flexDirection = "column";
  chatContainer.style.boxShadow = "0 2px 10px rgba(0,0,0,0.1)";

  const chatHeader = document.createElement("div");
  chatHeader.style.backgroundColor = "#4CAF50";
  chatHeader.style.padding = "10px";
  chatHeader.style.color = "white";
  chatHeader.style.textAlign = "center";
  chatHeader.style.borderTopLeftRadius = "8px";
  chatHeader.style.borderTopRightRadius = "8px";
  chatHeader.innerHTML = "チャットボット";

  const chatMessages = document.createElement("div");
  chatMessages.style.padding = "10px";
  chatMessages.style.flex = "1";
  chatMessages.style.overflowY = "auto";

  const chatInputContainer = document.createElement("div");
  chatInputContainer.style.padding = "10px";
  chatInputContainer.style.borderTop = "1px solid #ccc";
  chatInputContainer.style.backgroundColor = "#fff";
  chatInputContainer.style.borderBottomLeftRadius = "8px";
  chatInputContainer.style.borderBottomRightRadius = "8px";

  const chatInput = document.createElement("input");
  chatInput.type = "text";
  chatInput.placeholder = "メッセージを入力...";
  chatInput.style.width = "100%";
  chatInput.style.padding = "10px";
  chatInput.style.border = "1px solid #ccc";
  chatInput.style.borderRadius = "4px";
  chatInput.style.marginBottom = "10px";
  chatInput.style.boxSizing = "border-box";
  chatInput.style.backgroundColor = "#fff";

  const chatButton = document.createElement("button");
  chatButton.innerHTML = "送信";
  chatButton.style.width = "100%";
  chatButton.style.padding = "10px";
  chatButton.style.backgroundColor = "#4CAF50";
  chatButton.style.color = "white";
  chatButton.style.border = "none";
  chatButton.style.borderRadius = "4px";
  chatButton.style.cursor = "pointer";

  const appendMessage = (message, isUser = true) => {
    const messageElement = document.createElement("div");
    messageElement.style.padding = "8px";
    messageElement.style.backgroundColor = isUser ? "#f1f1f1" : "#e1e1e1";
    messageElement.style.marginBottom = "8px";
    messageElement.style.borderRadius = "4px";
    messageElement.style.maxWidth = "80%";
    messageElement.style.marginLeft = isUser ? "auto" : "0";
    messageElement.style.marginRight = isUser ? "0" : "auto";
    messageElement.style.wordBreak = "break-word";
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const handleSendMessage = async () => {
    const message = chatInput.value.trim();
    if (!message) return;

    appendMessage(message, true); // ユーザーのメッセージを表示
    chatInput.value = "";
    chatButton.disabled = true;
    chatInput.disabled = true;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: message,
              userId: userId,
            },
          ],
          userId: userId,
        }),
      });

      if (!response.ok) throw new Error("Network response was not ok");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedMessage = ""; // バッファとして使う変数

      // Read the stream until it's finished
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);

        // Remove '0:' prefix and extra spaces, clean any unnecessary characters
        const cleanChunk = chunk.replace(/^0:/, "").replace(/"/g, "").trim();

        // Only accumulate clean chunks that are not empty
        if (cleanChunk) {
          accumulatedMessage += cleanChunk; // Add the cleaned chunk to the message buffer
        }
      }

      // Once the stream is done, display the accumulated message
      if (accumulatedMessage) {
        const finalAccumulatedMessage = accumulatedMessage
          // すべての "0:" を消去
          .replace(/0:/g, "")
          // 連続する改行を1つにまとめる (例: \n\n -> \n)
          .replace(/\n{2,}/g, "\n")
          // 連続する「半角スペースやタブ」を1つにまとめる
          .replace(/[ \t]+/g, " ")
          // 前後の余分な空白を削除
          .trim();

        appendMessage(finalAccumulatedMessage, false); // 完成したメッセージを表示
      }
    } catch (error) {
      console.error("Chat error:", error);
      appendMessage("エラーが発生しました。", false);
    } finally {
      chatButton.disabled = false;
      chatInput.disabled = false;
      chatInput.focus();
    }
  };

  const isUser = (element) => {
    return element && element.style.marginLeft === "auto";
  };

  chatButton.addEventListener("click", handleSendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  chatInputContainer.appendChild(chatInput);
  chatInputContainer.appendChild(chatButton);
  chatContainer.appendChild(chatHeader);
  chatContainer.appendChild(chatMessages);
  chatContainer.appendChild(chatInputContainer);
  document.body.appendChild(chatContainer);
})();
