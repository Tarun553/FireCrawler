(function () {
  // Chatbot Widget - Embeddable chat interface
  // Usage: <script src="https://yourdomain.com/chatbot-widget.js" data-public-key="pk_xxx"></script>

  // Get script tag and extract configuration
  const scriptTag = document.currentScript;
  const publicKey = scriptTag?.getAttribute("data-public-key");
  
  // Use the script's origin as API URL (where the widget is hosted)
  const scriptSrc = scriptTag?.src || "";
  const apiOrigin = scriptSrc ? new URL(scriptSrc).origin : window.location.origin;
  const API_URL = apiOrigin + "/api/chat";

  if (!publicKey) {
    console.error("Chatbot widget: data-public-key attribute is required");
    return;
  }
  
  console.log("[Chatbot Widget] Initialized with API URL:", API_URL);

  // Create styles
  const styles = `
    .chatbot-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    .chatbot-widget-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }

    .chatbot-widget-button:hover {
      transform: scale(1.05);
    }

    .chatbot-widget-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    .chatbot-widget-modal {
      display: none;
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      height: 550px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      flex-direction: column;
      overflow: hidden;
    }

    .chatbot-widget-modal.open {
      display: flex;
    }

    .chatbot-widget-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      font-weight: 600;
      font-size: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chatbot-widget-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .chatbot-widget-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f7f9fc;
    }

    .chatbot-widget-message {
      margin-bottom: 16px;
      display: flex;
      flex-direction: column;
    }

    .chatbot-widget-message.user {
      align-items: flex-end;
    }

    .chatbot-widget-message.bot {
      align-items: flex-start;
    }

    .chatbot-widget-message-bubble {
      max-width: 80%;
      padding: 12px 16px;
      border-radius: 12px;
      word-wrap: break-word;
      line-height: 1.5;
      font-size: 14px;
    }

    .chatbot-widget-message.user .chatbot-widget-message-bubble {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .chatbot-widget-message.bot .chatbot-widget-message-bubble {
      background: white;
      color: #333;
      border: 1px solid #e2e8f0;
    }

    .chatbot-widget-input-container {
      padding: 16px;
      background: white;
      border-top: 1px solid #e2e8f0;
      display: flex;
      gap: 8px;
    }

    .chatbot-widget-input {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 24px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    .chatbot-widget-input:focus {
      border-color: #667eea;
    }

    .chatbot-widget-send {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
    }

    .chatbot-widget-send:hover:not(:disabled) {
      transform: scale(1.05);
    }

    .chatbot-widget-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .chatbot-widget-send svg {
      width: 20px;
      height: 20px;
      fill: white;
    }

    .chatbot-widget-loading {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
    }

    .chatbot-widget-loading span {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #667eea;
      animation: chatbot-bounce 1.4s infinite ease-in-out both;
    }

    .chatbot-widget-loading span:nth-child(1) {
      animation-delay: -0.32s;
    }

    .chatbot-widget-loading span:nth-child(2) {
      animation-delay: -0.16s;
    }

    @keyframes chatbot-bounce {
      0%, 80%, 100% {
        transform: scale(0);
      }
      40% {
        transform: scale(1);
      }
    }

    @media (max-width: 480px) {
      .chatbot-widget-modal {
        width: calc(100vw - 40px);
        height: calc(100vh - 120px);
      }
    }
  `;

  // Inject styles
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Create widget HTML
  const widgetHTML = `
    <div class="chatbot-widget-container">
      <button class="chatbot-widget-button" id="chatbot-toggle">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.38 0-2.67-.33-3.82-.91l-.27-.15-2.85.48.48-2.85-.15-.27A7.934 7.934 0 014 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
      </button>
      <div class="chatbot-widget-modal" id="chatbot-modal">
        <div class="chatbot-widget-header">
          <span>Chat with us</span>
          <button class="chatbot-widget-close" id="chatbot-close">&times;</button>
        </div>
        <div class="chatbot-widget-messages" id="chatbot-messages">
          <div class="chatbot-widget-message bot">
            <div class="chatbot-widget-message-bubble">
              Hi! How can I help you today?
            </div>
          </div>
        </div>
        <div class="chatbot-widget-input-container">
          <input
            type="text"
            class="chatbot-widget-input"
            id="chatbot-input"
            placeholder="Type your message..."
            autocomplete="off"
          />
          <button class="chatbot-widget-send" id="chatbot-send">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Inject widget into page
  const widgetContainer = document.createElement("div");
  widgetContainer.innerHTML = widgetHTML;
  document.body.appendChild(widgetContainer.firstElementChild);

  // Get elements
  const toggleButton = document.getElementById("chatbot-toggle");
  const modal = document.getElementById("chatbot-modal");
  const closeButton = document.getElementById("chatbot-close");
  const messagesContainer = document.getElementById("chatbot-messages");
  const input = document.getElementById("chatbot-input");
  const sendButton = document.getElementById("chatbot-send");

  // Toggle modal
  toggleButton.addEventListener("click", () => {
    modal.classList.toggle("open");
    if (modal.classList.contains("open")) {
      input.focus();
    }
  });

  closeButton.addEventListener("click", () => {
    modal.classList.remove("open");
  });

  // Add message to UI
  function addMessage(text, isUser = false) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `chatbot-widget-message ${isUser ? "user" : "bot"}`;
    messageDiv.innerHTML = `
      <div class="chatbot-widget-message-bubble">
        ${text}
      </div>
    `;
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Add loading indicator
  function addLoading() {
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "chatbot-widget-message bot";
    loadingDiv.id = "chatbot-loading";
    loadingDiv.innerHTML = `
      <div class="chatbot-widget-message-bubble">
        <div class="chatbot-widget-loading">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(loadingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Remove loading indicator
  function removeLoading() {
    const loading = document.getElementById("chatbot-loading");
    if (loading) {
      loading.remove();
    }
  }

  // Send message
  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    // Disable input while sending
    input.disabled = true;
    sendButton.disabled = true;

    // Add user message
    addMessage(message, true);
    input.value = "";

    // Add loading indicator
    addLoading();

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicKey: publicKey,
          message: message,
        }),
      });

      const data = await response.json();

      removeLoading();

      if (response.ok) {
        addMessage(data.reply);
      } else {
        addMessage(data.error || "Sorry, something went wrong. Please try again.");
      }
    } catch (error) {
      removeLoading();
      addMessage("Sorry, I'm having trouble connecting. Please try again later.");
      console.error("Chat error:", error);
    } finally {
      input.disabled = false;
      sendButton.disabled = false;
      input.focus();
    }
  }

  // Event listeners
  sendButton.addEventListener("click", sendMessage);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
})();
