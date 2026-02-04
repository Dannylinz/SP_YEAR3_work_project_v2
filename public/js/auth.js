document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;
  const currentPage = path.split("/").pop(); // e.g. "index.html"

  // Pages that do NOT require login
  // Root ("") usually serves index.html via server; keep that protected via redirect logic below.
  const publicPages = ["login.html", "register.html"];

  // Read and parse user object from localStorage
  let user = null;
  const rawUser = localStorage.getItem("user");
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch (e) {
      console.warn("[auth.js] Invalid user data in localStorage, clearing.", e);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      user = null;
    }
  }

  const isPublic = publicPages.includes(currentPage);

  // If this is a protected page and no valid user -> redirect to login
  if (!isPublic && !user) {
    console.warn(
      "[auth.js] Unauthorized access to",
      currentPage || "(root)",
      "— redirecting to login."
    );
    alert("Please log in first!");
    window.location.href = "login.html";
    return;
  }

  // If logged in, update UI elements that show current username
  if (user) {
    const nameSpan = document.getElementById("currentUserName");
    if (nameSpan) {
      nameSpan.textContent = user.username || user.email || "User";
    }
  }

  // Logout logic (any page that has #logoutBtn)
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // Remove both user and token from localStorage
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      alert("You have logged out.");
      window.location.href = "login.html";
    });
  }
});
