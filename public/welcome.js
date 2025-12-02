function zoomLeaf() {
  const svg = document.getElementById("intro-leaf");
  // start the zoom animation
  svg.style.transform = "translate(-50%, -50%) scale(20)";

  // end of the transition, then go to camera.html
  svg.addEventListener(
    "transitionend",
    function () {
      // Set flag to indicate user is coming from index.html
      sessionStorage.setItem("fromIndex", "true");
      window.location.href = "camera.html";
    },
    { once: true }
  );
}
