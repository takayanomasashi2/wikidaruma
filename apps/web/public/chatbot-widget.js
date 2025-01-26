(function () {
  // スクリプトの中で、userIdを取得（クエリパラメータまたはdata属性から）
  const params = new URLSearchParams(window.location.search);
  const userId =
    params.get("userId") || document.currentScript.getAttribute("data-user-id");

  if (!userId) {
    console.error("User ID is missing!");
    return;
  }

  // チャットボットのHTMLを動的に作成
  const chatContainer = document.createElement("div");
  chatContainer.style.position = "fixed";
  chatContainer.style.bottom = "20px";
  chatContainer.style.right = "20px";
  chatContainer.style.width = "300px";
  chatContainer.style.height = "400px";
  chatContainer.style.border = "1px solid #ccc";
  chatContainer.style.borderRadius = "8px";
  chatContainer.style.backgroundColor = "#fff";
  chatContainer.style.zIndex = "9999";

  const chatHeader = document.createElement("div");
  chatHeader.style.backgroundColor = "#4CAF50";
  chatHeader.style.padding = "10px";
  chatHeader.style.color = "white";
  chatHeader.style.textAlign = "center";
  chatHeader.innerHTML = "チャットボット";

  const chatMessages = document.createElement("div");
  chatMessages.style.padding = "10px";
  chatMessages.style.height = "calc(100% - 100px)";
  chatMessages.style.overflowY = "auto";

  const chatInputContainer = document.createElement("div");
  chatInputContainer.style.padding = "10px";
  chatInputContainer.style.borderTop = "1px solid #ccc";

  const chatInput = document.createElement("input");
  chatInput.type = "text";
  chatInput.placeholder = "メッセージを入力...";
  chatInput.style.width = "100%";
  chatInput.style.padding = "10px";
  chatInput.style.border = "1px solid #ccc";
  chatInput.style.borderRadius = "4px";

  const chatButton = document.createElement("button");
  chatButton.innerHTML = "送信";
  chatButton.style.padding = "10px";
  chatButton.style.backgroundColor = "#4CAF50";
  chatButton.style.color = "white";
  chatButton.style.border = "none";
  chatButton.style.borderRadius = "4px";
  chatButton.style.marginTop = "10px";

  // メッセージ送信処理
  chatButton.addEventListener("click", () => {
    const message = chatInput.value;
    if (message) {
      const messageElement = document.createElement("div");
      messageElement.style.padding = "5px";
      messageElement.style.backgroundColor = "#f1f1f1";
      messageElement.style.marginBottom = "5px";
      messageElement.style.borderRadius = "4px";
      messageElement.textContent = message;

      chatMessages.appendChild(messageElement);
      chatInput.value = ""; // 入力をクリア

      // サーバーにメッセージを送信
      fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId, // ここでuserIdをAPIに送信
          message: message,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          // 返ってきたレスポンスをチャットに表示
          const botMessage = document.createElement("div");
          botMessage.style.padding = "5px";
          botMessage.style.backgroundColor = "#e1e1e1";
          botMessage.style.marginBottom = "5px";
          botMessage.style.borderRadius = "4px";
          botMessage.textContent = data.reply;
          chatMessages.appendChild(botMessage);
        })
        .catch((error) => {
          console.error("Error sending message:", error);
        });
    }
  });

  // HTML要素を親要素に追加
  chatInputContainer.appendChild(chatInput);
  chatInputContainer.appendChild(chatButton);

  chatContainer.appendChild(chatHeader);
  chatContainer.appendChild(chatMessages);
  chatContainer.appendChild(chatInputContainer);

  document.body.appendChild(chatContainer);
})();
