document.addEventListener("DOMContentLoaded", function () {
  // Restore scroll position
  if (sessionStorage.scrollPosition) {
    window.scrollTo(0, sessionStorage.scrollPosition);
    sessionStorage.removeItem("scrollPosition");
  }

  // Save scroll position before form submission
  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", function () {
      sessionStorage.scrollPosition = window.scrollY;
    });
  });
});
