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

  const chatButton = document.createElement("button");
  chatButton.innerHTML = "送信";
  chatButton.style.width = "100%";
  chatButton.style.padding = "10px";
  chatButton.style.backgroundColor = "#4CAF50";
  chatButton.style.color = "white";
  chatButton.style.border = "none";
  chatButton.style.borderRadius = "4px";
  chatButton.style.cursor = "pointer";
  chatButton.style.transition = "background-color 0.3s";

  chatButton.addEventListener("mouseover", () => {
    chatButton.style.backgroundColor = "#45a049";
  });

  chatButton.addEventListener("mouseout", () => {
    chatButton.style.backgroundColor = "#4CAF50";
  });

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

  let isProcessing = false;

  const handleSendMessage = () => {
    const message = chatInput.value.trim();
    if (!message || isProcessing) return;

    isProcessing = true;
    chatButton.disabled = true;
    chatButton.style.backgroundColor = "#cccccc";

    appendMessage(message, true);
    chatInput.value = "";

    fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        message: message,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(response.statusText);
        const reader = response.body.getReader();
        return new ReadableStream({
          start(controller) {
            return pump();
            function pump() {
              return reader.read().then(({ done, value }) => {
                if (done) {
                  controller.close();
                  return;
                }
                controller.enqueue(value);
                return pump();
              });
            }
          },
        });
      })
      .then((stream) => new Response(stream))
      .then((response) => response.text())
      .then((text) => appendMessage(text, false))
      .catch((error) => {
        console.error("Error:", error);
        appendMessage("エラーが発生しました。", false);
      })
      .finally(() => {
        isProcessing = false;
        chatButton.disabled = false;
        chatButton.style.backgroundColor = "#4CAF50";
      });
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
