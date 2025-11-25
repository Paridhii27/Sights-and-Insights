// Get all category buttons
const educateButton = document.getElementById("option-educate");
const speculateButton = document.getElementById("option-speculate");
const mindfulButton = document.getElementById("option-mindful");
const funnyButton = document.getElementById("option-funny");
const testModeCheckbox = document.getElementById("test-mode-checkbox");

// Load saved category on page load
document.addEventListener("DOMContentLoaded", () => {
  const savedCategory = localStorage.getItem("selectedCategory") || "educate";
  setActiveCategory(savedCategory);

  // Load test mode setting
  const skipAudio = localStorage.getItem("skipAudio") === "true";
  if (testModeCheckbox) {
    testModeCheckbox.checked = skipAudio;
  }
});

// Handle test mode toggle
if (testModeCheckbox) {
  testModeCheckbox.addEventListener("change", (e) => {
    localStorage.setItem("skipAudio", e.target.checked ? "true" : "false");
    console.log("Test mode:", e.target.checked ? "enabled" : "disabled");
  });
}

// Function to set active category
function setActiveCategory(category) {
  // Remove active class from all buttons
  [educateButton, speculateButton, mindfulButton, funnyButton].forEach(
    (button) => {
      button.classList.remove("active");
    }
  );

  // Add active class to selected button
  switch (category) {
    case "educate":
      educateButton.classList.add("active");
      break;
    case "speculate":
      speculateButton.classList.add("active");
      break;
    case "mindful":
      mindfulButton.classList.add("active");
      break;
    case "funny":
      funnyButton.classList.add("active");
      break;
  }

  // Save selection to localStorage
  localStorage.setItem("selectedCategory", category);
}

// Add click event listeners to buttons
educateButton.addEventListener("click", () => setActiveCategory("educate"));
speculateButton.addEventListener("click", () => setActiveCategory("speculate"));
mindfulButton.addEventListener("click", () => setActiveCategory("mindful"));
funnyButton.addEventListener("click", () => setActiveCategory("funny"));
