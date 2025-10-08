document.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("user");
  const currentPage = window.location.pathname.split("/").pop();

  // Pages that require login
  const protectedPages = ["index.html", "faq.html", "sop.html", "project.html"];

  if (protectedPages.includes(currentPage) && !user) {
    console.warn("Unauthorized access. Redirecting to login page...");
    alert("Please log in first!");
    window.location.href = "login.html";
    return;
  }

  // Logout logic
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user");
      alert("You have logged out.");
      window.location.href = "login.html";
    });
  }
});
