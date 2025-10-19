// src/public/js/faq.js
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const chatBox = document.getElementById("chatMessages");
  const messageForm = document.getElementById("messageForm");
  const messageInput = document.getElementById("messageInput");
  const searchInput = document.getElementById("searchInput");

  const editModal = new bootstrap.Modal(document.getElementById("editModal"));
  const editMessageText = document.getElementById("editMessageText");
  const saveEditBtn = document.getElementById("saveEditBtn");
  let editId = null;

  // 🧭 Load all messages (with optional search)
  async function loadMessages(search = "") {
    try {
      const res = await fetch(`/api/faqs?search=${encodeURIComponent(search)}`);
      const data = await res.json();

      chatBox.innerHTML = "";

      if (!Array.isArray(data) || data.length === 0) {
        chatBox.innerHTML = `<div class="text-center text-muted my-3">No messages yet.</div>`;
        return;
      }

      data.forEach(msg => {
        const isOwner = msg.created_by_user_id === user.user_id;
        const isAdmin = user.role_id === 1;

        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${isOwner ? "message-owner" : ""}`;
        messageDiv.innerHTML = `
          <div class="message-header d-flex justify-content-between align-items-center">
            <span>${escapeHtml(msg.tags || "User")}</span>
            <div>
              ${(isOwner || isAdmin) ? `
                <button class="btn btn-sm btn-warning edit-btn" data-id="${msg.faq_id}" data-text="${escapeHtml(msg.question)}">✏️</button>
                <button class="btn btn-sm btn-danger delete-btn" data-id="${msg.faq_id}">🗑️</button>
              ` : ""}
            </div>
          </div>
          <div>${escapeHtml(msg.question)}</div>
        `;
        chatBox.appendChild(messageDiv);
      });

      attachEventListeners();
    } catch (err) {
      console.error("❌ Error loading messages:", err);
      chatBox.innerHTML = `<div class="alert alert-danger">Failed to load messages.</div>`;
    }
  }

  // ✏️ Attach edit/delete event listeners
  function attachEventListeners() {
    document.querySelectorAll(".edit-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        editId = btn.dataset.id;
        editMessageText.value = btn.dataset.text;
        editModal.show();
      });
    });

    document.querySelectorAll(".delete-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (confirm("Delete this message?")) {
          await fetch(`/api/faqs/${btn.dataset.id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.user_id, role_id: user.role_id })
          });
          loadMessages();
        }
      });
    });
  }

  // ➕ Add new message
  messageForm.addEventListener("submit", async e => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;

    try {
      await fetch("/api/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          user_id: user.user_id,
          username: user.username
        })
      });
      messageInput.value = "";
      loadMessages();
    } catch (err) {
      console.error("❌ Failed to send message:", err);
    }
  });

  // 💾 Save edited message
  saveEditBtn.addEventListener("click", async () => {
    const newText = editMessageText.value.trim();
    if (!newText) return;

    try {
      await fetch(`/api/faqs/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: newText,
          user_id: user.user_id,
          role_id: user.role_id
        })
      });
      editModal.hide();
      loadMessages();
    } catch (err) {
      console.error("❌ Failed to edit message:", err);
    }
  });

  // 🔍 Search messages
  searchInput.addEventListener("input", () => loadMessages(searchInput.value));

  // 🧹 Escape HTML for safe rendering
  function escapeHtml(unsafe) {
    return unsafe
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // ⏱️ Optional: auto-refresh every 5 seconds for live updates
  setInterval(() => loadMessages(searchInput.value), 5000);

  // 🚀 Initial load
  loadMessages();
});
