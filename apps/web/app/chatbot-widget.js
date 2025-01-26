(function () {
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
  chatMessages.style.height = "calc(100% - 130px)";
  chatMessages.style.marginBottom = "60px";
  chatMessages.style.overflowY = "auto";

  const chatInputContainer = document.createElement("div");
  chatInputContainer.style.position = "absolute";
  chatInputContainer.style.bottom = "0";
  chatInputContainer.style.left = "0";
  chatInputContainer.style.right = "0";
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

  const chatButton = document.createElement("button");
  chatButton.innerHTML = "送信";
  chatButton.style.width = "100%";
  chatButton.style.padding = "10px";
  chatButton.style.backgroundColor = "#4CAF50";
  chatButton.style.color = "white";
  chatButton.style.border = "none";
  chatButton.style.borderRadius = "4px";

  const appendMessage = (message, isUser = true) => {
    const messageElement = document.createElement("div");
    messageElement.style.padding = "5px";
    messageElement.style.backgroundColor = isUser ? "#f1f1f1" : "#e1e1e1";
    messageElement.style.marginBottom = "5px";
    messageElement.style.borderRadius = "4px";
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const handleSendMessage = () => {
    const message = chatInput.value;
    if (!message) return;

    appendMessage(message, true);
    chatInput.value = "";

    fetch("https://wikidaruma.vercel.app/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: message,
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(response.statusText);
        return new Response(response.body).text();
      })
      .then((text) => {
        const botMessage = document.createElement("div");
        botMessage.style.padding = "5px";
        botMessage.style.backgroundColor = "#e1e1e1";
        botMessage.style.marginBottom = "5px";
        botMessage.style.borderRadius = "4px";
        botMessage.textContent = text;
        chatMessages.appendChild(botMessage);
      })
      .catch((error) => {
        console.error("Error:", error);
        appendMessage("エラーが発生しました。もう一度お試しください。", false);
      });
  };

  chatButton.addEventListener("click", handleSendMessage);
  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSendMessage();
  });

  chatInputContainer.appendChild(chatInput);
  chatInputContainer.appendChild(chatButton);
  chatContainer.appendChild(chatHeader);
  chatContainer.appendChild(chatMessages);
  chatContainer.appendChild(chatInputContainer);
  document.body.appendChild(chatContainer);
})();
