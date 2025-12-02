const videoElement = document.getElementById("videoElement");
const errorMessage = document.getElementById("errorMessage");
const cameraStatus = document.getElementById("camera-status");
const snapshotsContainer = document.getElementById("snapshots");
const imgAnalysis = document.getElementById("img-analysis");
const audioAnalysis = document.getElementById("audio-analysis");

const Education = document.getElementById("option-educate");
const speculative = document.getElementById("option-speculate");
const mindful = document.getElementById("option-mindful");
const funny = document.getElementById("option-funny");

// Variables to store the media stream and current camera
let stream = null;
// 'environment' for back camera, 'user' for front camera
let currentCamera = "environment";
// Flag to track if audio is currently playing
let isAudioPlaying = false;

// Function to start the camera
async function startCamera() {
  // Clear any previous errors
  if (errorMessage) {
    errorMessage.textContent = "";
  }

  // Ensure cameraStatus is hidden before starting
  if (cameraStatus) {
    cameraStatus.style.display = "none";
    cameraStatus.textContent = ""; // Clear any existing text
  }

  try {
    // Request access to the user's camera
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: currentCamera,
      },
      audio: false,
    });

    // Attach the stream to the video element
    videoElement.srcObject = stream;

    // Ensure video plays when it's loaded
    videoElement.onloadedmetadata = function () {
      videoElement.play();
    };

    // Add click event listener to video element after stream is started
    videoElement.addEventListener("click", handleVideoClick);

    // Set text content first, then show the element
    if (cameraStatus) {
      cameraStatus.innerHTML = "";
      cameraStatus.className = "camera-status-message";
      const messageText = document.createElement("p");
      messageText.className = "status-message-text";
      messageText.textContent =
        "Click anywhere on the video to capture an area you want to interact with more.";
      cameraStatus.appendChild(messageText);
      // Use requestAnimationFrame to ensure the text is set before showing the element
      requestAnimationFrame(() => {
        cameraStatus.style.display = "block";
      });
    }

    console.log("Camera started successfully");
  } catch (error) {
    //Handling camera errors
    if (errorMessage) {
      if (error.name === "NotAllowedError") {
        errorMessage.textContent =
          "Camera access denied. Please allow camera access.";
      } else if (error.name === "NotFoundError") {
        errorMessage.textContent = "No camera found on this device.";
      } else {
        errorMessage.textContent = `Error accessing camera: ${error.message}`;
      }
    }

    // Hide camera status when there's an error
    if (cameraStatus) {
      cameraStatus.style.display = "none";
      cameraStatus.textContent = "";
    }

    console.error("Error accessing camera:", error);
  }
}

// Function to remove click indicator
function removeClickIndicator() {
  const existingIndicator = document.querySelector(".click-indicator");
  if (existingIndicator) {
    existingIndicator.style.opacity = "0";
    existingIndicator.style.transform = "scale(0.8)";
    setTimeout(() => {
      if (existingIndicator.parentNode) {
        existingIndicator.remove();
      }
    }, 300);
  }
}

// Function to show click indicator on video
function showClickIndicator(event) {
  // Remove any existing click indicator
  removeClickIndicator();

  // Get video container and video element
  const videoContainer = document.querySelector(".video-container");
  if (!videoContainer || !videoElement) return;

  const videoRect = videoElement.getBoundingClientRect();
  const containerRect = videoContainer.getBoundingClientRect();

  // Calculate click position relative to video element
  const clickX = event.clientX - videoRect.left;
  const clickY = event.clientY - videoRect.top;

  // Size of the capture area (100px in video coordinates, scaled to display)
  const squareSize = 100;
  // Get video dimensions (use actual video dimensions if available, otherwise use display size)
  const videoWidth = videoElement.videoWidth || videoRect.width;
  const videoHeight = videoElement.videoHeight || videoRect.height;
  const scaleX = videoRect.width / videoWidth;
  const scaleY = videoRect.height / videoHeight;
  const displaySize = squareSize * Math.max(scaleX, scaleY);
  const halfSize = displaySize / 2;

  // Create click indicator box
  const indicator = document.createElement("div");
  indicator.className = "click-indicator";

  // Position the indicator relative to the video container
  // Calculate position relative to container
  const relativeX = clickX + (videoRect.left - containerRect.left);
  const relativeY = clickY + (videoRect.top - containerRect.top);

  indicator.style.left = `${relativeX - halfSize}px`;
  indicator.style.top = `${relativeY - halfSize}px`;
  indicator.style.width = `${displaySize}px`;
  indicator.style.height = `${displaySize}px`;

  // Add to video container
  videoContainer.appendChild(indicator);
  // Indicator will remain visible until removed by removeClickIndicator()
}

// Function to handle video click to capture snapshot
function handleVideoClick(event) {
  console.log("Video clicked");
  if (stream) {
    // Only proceed if audio is not playing
    if (!isAudioPlaying) {
      // Show click indicator
      showClickIndicator(event);

      // Update camera status to show loading bar
      if (cameraStatus) {
        cameraStatus.innerHTML = "";
        cameraStatus.className = "camera-status-loading";

        // Create loading bar container
        const loadingContainer = document.createElement("div");
        loadingContainer.className = "loading-container";

        // Create loading text
        const loadingText = document.createElement("p");
        loadingText.className = "loading-text";
        loadingText.textContent = "Analyzing your image...";

        // Create loading bar
        const loadingBar = document.createElement("div");
        loadingBar.className = "loading-bar";

        // Create loading bar fill
        const loadingBarFill = document.createElement("div");
        loadingBarFill.className = "loading-bar-fill";

        loadingBar.appendChild(loadingBarFill);
        loadingContainer.appendChild(loadingText);
        loadingContainer.appendChild(loadingBar);
        cameraStatus.appendChild(loadingContainer);
        cameraStatus.style.display = "block";
      }
      captureSnapshot(event);
      console.log("Snapshot captured");
    } else {
      // Show message that analysis is disabled during audio playback
      if (cameraStatus) {
        cameraStatus.innerHTML = "";
        cameraStatus.className = "camera-status-message";
        const messageText = document.createElement("p");
        messageText.className = "status-message-text";
        messageText.textContent =
          "Please wait for the audio to finish before capturing a new image";
        cameraStatus.appendChild(messageText);
        cameraStatus.style.display = "block";
      }
    }
  } else {
    if (errorMessage) {
      errorMessage.textContent = "Please start the camera first";
    }
  }
}

// Function to stop the camera
function stopCamera() {
  if (!stream) return;

  // Remove click event listener
  videoElement.removeEventListener("click", handleVideoClick);

  // Remove click indicator
  removeClickIndicator();

  // Get all tracks from the stream and stop each one
  stream.getTracks().forEach((track) => {
    track.stop();
  });

  // Clear the video source
  videoElement.srcObject = null;
  stream = null;

  // Hide camera status when camera is stopped
  if (cameraStatus) {
    cameraStatus.style.display = "none";
  }

  console.log("Camera stopped");
}

// Function to switch between front and back cameras
async function switchCamera() {
  if (!stream) {
    if (errorMessage) {
      errorMessage.textContent =
        "Camera is not active. Please start the camera first.";
    }
    return;
  }
  // Stop the current stream
  stopCamera();
  // Switch the camera facing mode
  currentCamera = currentCamera === "environment" ? "user" : "environment";
  // Start the camera with the new facing mode
  await startCamera();
}

// Function to capture a snapshot from the video stream with a highlighted area
function captureSnapshot(event) {
  if (!stream) {
    if (errorMessage) {
      errorMessage.textContent =
        "Camera is not active. Please start the camera first.";
    }
    return;
  }

  // Get coordinates - either from click event or use center of video for automatic capture
  const rect = videoElement.getBoundingClientRect();
  let x, y;

  if (event) {
    // If event exists (click), use click coordinates
    x = ((event.clientX - rect.left) / rect.width) * videoElement.videoWidth;
    y = ((event.clientY - rect.top) / rect.height) * videoElement.videoHeight;
  } else {
    // For automatic capture, use center of video
    x = videoElement.videoWidth / 2;
    y = videoElement.videoHeight / 2;
  }

  // Define square size (50x50 pixels)
  const squareSize = 100;
  const halfSize = squareSize / 2;

  // Set canvas dimensions to match the video
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;

  // Draw the current video frame on the canvas
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Draw a red square around the clicked area
  ctx.strokeStyle = "red";
  ctx.lineWidth = 3;
  ctx.strokeRect(x - halfSize, y - halfSize, squareSize, squareSize);

  // Convert canvas to image data URL (full frame with red square)
  const fullImageDataURL = canvas.toDataURL("image/png");

  // Now create a second canvas just for the cropped area
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = squareSize;
  cropCanvas.height = squareSize;
  const cropCtx = cropCanvas.getContext("2d");

  // Draw just the selected area to the crop canvas
  cropCtx.drawImage(
    videoElement,
    Math.max(0, x - halfSize),
    Math.max(0, y - halfSize),
    squareSize,
    squareSize, // Source coordinates
    0,
    0,
    squareSize,
    squareSize // Destination coordinates
  );

  // Convert cropped canvas to image data URL
  const croppedImageDataURL = cropCanvas.toDataURL("image/png");

  // Get current timestamp
  const now = new Date();
  const timestamp = now.toLocaleTimeString();

  // Create a temporary div to show the analysis result
  const analysisDiv = document.createElement("div");
  analysisDiv.className = "analysis-result";

  // Add it to snapshots container if it exists
  if (snapshotsContainer) {
    const snapshotDiv = document.createElement("div");
    snapshotDiv.className = "snapshot";

    // Create image element
    const img = document.createElement("img");
    img.src = fullImageDataURL;
    img.alt = "Snapshot at " + timestamp;
    snapshotDiv.appendChild(img);

    // Add timestamp
    const timestampDiv = document.createElement("div");
    timestampDiv.className = "timestamp";
    timestampDiv.textContent = timestamp;
    snapshotDiv.appendChild(timestampDiv);

    // Add analysis div
    snapshotDiv.appendChild(analysisDiv);

    // Add to container
    snapshotsContainer.prepend(snapshotDiv);
  }

  // Analyze the full image with red box
  analyzeImage(fullImageDataURL, analysisDiv, fullImageDataURL);

  console.log("Snapshot captured at", timestamp, "at position", x, y);
}

// Function to create and add a snapshot element to the page
function createSnapshotElement(imageURL, caption, analysisText, audioURL) {
  // Create container for the snapshot
  const snapshotDiv = document.createElement("div");
  snapshotDiv.className = "snapshot";

  // Create image element with the captured frame
  const img = document.createElement("img");
  img.src = imageURL;
  img.alt = caption;
  snapshotDiv.appendChild(img);

  // Create timestamp display
  const timestampDiv = document.createElement("div");
  timestampDiv.className = "timestamp";
  timestampDiv.textContent = caption;
  snapshotDiv.appendChild(timestampDiv);

  // Create analysis text div
  const analysisDiv = document.createElement("div");
  analysisDiv.className = "analysis-result";
  analysisDiv.textContent = analysisText || "Analysis not available";
  snapshotDiv.appendChild(analysisDiv);

  // Create audio element if URL provided
  if (audioURL) {
    // Create custom audio player container
    const audioPlayerContainer = document.createElement("div");
    audioPlayerContainer.className = "custom-audio-player";

    // Create hidden audio element for actual playback
    const audioElement = document.createElement("audio");
    audioElement.src = audioURL;
    audioElement.className = "hidden-audio";

    // Create play button
    const playButton = document.createElement("button");
    playButton.className = "audio-play-button";
    playButton.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 5V19L19 12L8 5Z" fill="#65B2C2"/>
      </svg>
    `;
    playButton.setAttribute("aria-label", "Play audio");

    // Create waveform container
    const waveformContainer = document.createElement("div");
    waveformContainer.className = "audio-waveform";

    // Create waveform bars
    for (let i = 0; i < 40; i++) {
      const bar = document.createElement("div");
      bar.className = "waveform-bar";
      waveformContainer.appendChild(bar);
    }

    // Add click handler to play button
    playButton.addEventListener("click", () => {
      if (audioElement.paused) {
        audioElement.play();
        playButton.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="4" width="4" height="16" fill="#65B2C2"/>
            <rect x="14" y="4" width="4" height="16" fill="#65B2C2"/>
          </svg>
        `;
        playButton.setAttribute("aria-label", "Pause audio");
        animateWaveform(waveformContainer, true);
      } else {
        audioElement.pause();
        playButton.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5V19L19 12L8 5Z" fill="#65B2C2"/>
          </svg>
        `;
        playButton.setAttribute("aria-label", "Play audio");
        animateWaveform(waveformContainer, false);
      }
    });

    // Reset button when audio ends
    audioElement.addEventListener("ended", () => {
      playButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 5V19L19 12L8 5Z" fill="#65B2C2"/>
        </svg>
      `;
      playButton.setAttribute("aria-label", "Play audio");
      animateWaveform(waveformContainer, false);
    });

    // Assemble audio player
    audioPlayerContainer.appendChild(audioElement);
    audioPlayerContainer.appendChild(playButton);
    audioPlayerContainer.appendChild(waveformContainer);

    snapshotDiv.appendChild(audioPlayerContainer);
  }

  // Add the snapshot to the page
  if (snapshotsContainer) {
    snapshotsContainer.prepend(snapshotDiv);
  }
}

// Ensure all event listeners are only added when the elements exist
function addEventListeners() {
  // Add event listeners for mode selection
  if (Education) Education.addEventListener("click", () => setMode("educate"));
  if (speculative)
    speculative.addEventListener("click", () => setMode("speculate"));
  if (mindful) mindful.addEventListener("click", () => setMode("mindful"));
  if (funny) funny.addEventListener("click", () => setMode("funny"));
}

function setMode(mode) {
  localStorage.setItem("selectedCategory", mode);
  console.log("Mode set to:", mode);
}

// Automatically start the camera on camera.html page
function initializePage() {
  console.log("Initializing page:", window.location.pathname);

  // Check if we're on the camera page
  if (
    window.location.pathname.includes("camera.html") ||
    window.location.pathname === "/" ||
    window.location.pathname === ""
  ) {
    console.log("Camera page detected, starting camera automatically");

    // Make sure the video element exists
    if (videoElement) {
      // Add needed attributes for mobile functionality
      videoElement.setAttribute("autoplay", "");
      videoElement.setAttribute("playsinline", ""); // Important for iOS
      videoElement.setAttribute("muted", "");

      // Start camera automatically
      startCamera().catch((error) => {
        console.error("Failed to start camera during page init:", error);
        if (errorMessage) {
          errorMessage.textContent =
            "Failed to start camera. Please check permissions.";
        }
      });
    } else {
      console.error("Video element not found on camera page");
    }
  } else if (window.location.pathname.includes("archive.html")) {
    console.log("Archive page detected, displaying analysis results");
    displayAnalysisResults();
  }

  // Add event listeners regardless of page
  addEventListeners();
}

async function analyzeImage(imageData, resultElement, fullImageURL = null) {
  try {
    // Extract base64 data from the dataURL
    const base64Image = imageData.split(",")[1];

    if (resultElement) {
      // Clear previous content and create loading container
      resultElement.innerHTML = "";
    }

    const selectedMode = localStorage.getItem("selectedCategory") || "educate";

    // Check if test mode is enabled (skip audio)
    const skipAudio = localStorage.getItem("skipAudio") === "true";
    const apiUrl = skipAudio ? "/api/analyze?skipAudio=true" : "/api/analyze";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64Image: base64Image,
        mode: selectedMode,
      }),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: `HTTP error! status: ${response.status}` }));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    console.log("Analysis response received");

    // Remove click indicator when analysis completes
    removeClickIndicator();

    // Create new analysis data
    const analysisData = {
      timestamp: new Date().toLocaleString(),
      image: fullImageURL || imageData,
      analysis: data.content || "No analysis available",
      audioUrl: data.audio,
    };

    // Store last 3 analyses (keep only the most recent 3)
    const existingAnalyses = JSON.parse(
      localStorage.getItem("analysisResults") || "[]"
    );
    const updatedAnalyses = [analysisData, ...existingAnalyses].slice(0, 3);
    localStorage.setItem("analysisResults", JSON.stringify(updatedAnalyses));

    // Display the analysis in the result element
    if (resultElement) {
      resultElement.innerHTML = ""; // Clear loading state
      resultElement.textContent = data.content || "No analysis available";
    }

    // Update camera status with custom audio player or test mode message
    if (cameraStatus) {
      cameraStatus.innerHTML = "";
      cameraStatus.className = "camera-status-message";

      // Show different message if audio was skipped (test mode)
      if (!data.audio) {
        const messageText = document.createElement("p");
        messageText.className = "status-message-text";
        messageText.textContent =
          "Your insights are ready. Explore on the archive page";
        cameraStatus.appendChild(messageText);
        cameraStatus.style.display = "block";
        console.log("⚠️  TEST MODE: Audio generation was skipped");
      } else {
        // Create custom audio player with waveform
        try {
          const audioBlob = new Blob(
            [Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0))],
            { type: "audio/mpeg" }
          );
          const audioUrl = URL.createObjectURL(audioBlob);
          const audioElement = new Audio(audioUrl);

          // Create audio player container
          const audioPlayerContainer = document.createElement("div");
          audioPlayerContainer.className = "custom-audio-player";

          // Create hidden audio element
          audioElement.className = "hidden-audio";
          audioElement.setAttribute("preload", "auto");

          // Create play button
          const playButton = document.createElement("button");
          playButton.className = "audio-play-button";
          playButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5V19L19 12L8 5Z" fill="#a6bb65"/>
            </svg>
          `;
          playButton.setAttribute("aria-label", "Play audio");

          // Create waveform container
          const waveformContainer = document.createElement("div");
          waveformContainer.className = "audio-waveform";

          // Create waveform bars
          for (let i = 0; i < 40; i++) {
            const bar = document.createElement("div");
            bar.className = "waveform-bar";
            waveformContainer.appendChild(bar);
          }

          // Create engaging text
          const messageText = document.createElement("p");
          messageText.className = "status-message-text";
          messageText.style.marginBottom = "10px";

          // Add click handler to play button
          playButton.addEventListener("click", () => {
            if (audioElement.paused) {
              audioElement.play();
              playButton.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="4" width="4" height="16" fill="#a6bb65"/>
                  <rect x="14" y="4" width="4" height="16" fill="#a6bb65"/>
                </svg>
              `;
              playButton.setAttribute("aria-label", "Pause audio");
              animateWaveform(waveformContainer, true);

              isAudioPlaying = true;
            } else {
              audioElement.pause();
              playButton.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 5V19L19 12L8 5Z" fill="#a6bb65"/>
                </svg>
              `;
              playButton.setAttribute("aria-label", "Play audio");
              animateWaveform(waveformContainer, false);

              isAudioPlaying = false;
            }
          });

          // Auto-play audio and update UI
          audioElement.play().catch((error) => {
            console.error("Error playing audio:", error);
            isAudioPlaying = false;
          });

          // Set flag when audio starts playing
          audioElement.addEventListener("play", () => {
            isAudioPlaying = true;
            playButton.innerHTML = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="4" width="4" height="16" fill="#a6bb65"/>
                <rect x="14" y="4" width="4" height="16" fill="#a6bb65"/>
              </svg>
            `;
            playButton.setAttribute("aria-label", "Pause audio");
            animateWaveform(waveformContainer, true);
          });

          // Reset button when audio ends
          audioElement.addEventListener("ended", () => {
            isAudioPlaying = false;
            playButton.innerHTML = `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 5V19L19 12L8 5Z" fill="#a6bb65"/>
              </svg>
            `;
            playButton.setAttribute("aria-label", "Play audio");
            animateWaveform(waveformContainer, false);
            messageText.textContent = "Click again to discover more";
            console.log("Audio playback finished");
          });

          // Assemble audio player
          cameraStatus.appendChild(messageText);
          audioPlayerContainer.appendChild(audioElement);
          audioPlayerContainer.appendChild(playButton);
          audioPlayerContainer.appendChild(waveformContainer);
          cameraStatus.appendChild(audioPlayerContainer);
          cameraStatus.style.display = "block";
        } catch (audioError) {
          console.error("Error processing audio:", audioError);
          isAudioPlaying = false;
          const messageText = document.createElement("p");
          messageText.className = "status-message-text";

          cameraStatus.appendChild(messageText);
          cameraStatus.style.display = "block";
        }
      }
    }
  } catch (error) {
    console.error("Error analyzing image:", error);
    // Remove click indicator on error
    removeClickIndicator();
    if (resultElement) {
      resultElement.innerHTML = ""; // Clear loading state
      resultElement.textContent = "Error analyzing image. Please try again.";
    }
    if (cameraStatus) {
      cameraStatus.innerHTML = "";
      cameraStatus.className = "camera-status-message";
      const messageText = document.createElement("p");
      messageText.className = "status-message-text";
      messageText.textContent = "Error analyzing image. Please try again.";
      cameraStatus.appendChild(messageText);
      cameraStatus.style.display = "block";
    }
    isAudioPlaying = false; // Reset flag if there's an error
  }
}

let currentSelectedIndex = 0;
let currentAudioElement = null;

function displayAnalysisResults() {
  const snapshotsContainer = document.getElementById("snapshots");
  const carouselContainer = document.getElementById("image-carousel-container");
  const carousel = document.getElementById("image-carousel");

  if (!snapshotsContainer || !carousel) {
    console.error("Required containers not found on archive page");
    return;
  }

  // Clear existing content
  snapshotsContainer.innerHTML = "";
  carousel.innerHTML = "";

  // Get all saved analyses (up to 3)
  const savedAnalyses = JSON.parse(
    localStorage.getItem("analysisResults") || "[]"
  );

  if (savedAnalyses.length === 0) {
    const noDataMsg = document.createElement("div");
    noDataMsg.className = "no-data-message";
    noDataMsg.textContent =
      "No analysis results available. Capture an image on the camera page first.";
    noDataMsg.style.textAlign = "center";
    noDataMsg.style.marginTop = "20px";
    noDataMsg.style.fontFamily = "Lexend, sans-serif";
    noDataMsg.style.fontSize = "1rem";
    noDataMsg.style.color = "var(--dark-text)";
    noDataMsg.style.padding = "20px";
    noDataMsg.style.borderRadius = "15px";
    noDataMsg.style.border = "3px solid var(--primary-blue)";
    noDataMsg.style.backgroundColor = "var(--bg-color)";
    noDataMsg.style.boxSizing = "border-box";
    noDataMsg.style.overflowWrap = "break-word";
    snapshotsContainer.appendChild(noDataMsg);
    carouselContainer.style.display = "none";
    return;
  }

  carouselContainer.style.display = "block";
  currentSelectedIndex = 0;

  // Add class to center if only one image
  if (savedAnalyses.length === 1) {
    carouselContainer.classList.add("single-image");
    carousel.classList.add("single-image");
  } else {
    carouselContainer.classList.remove("single-image");
    carousel.classList.remove("single-image");
  }

  // Create carousel images
  savedAnalyses.forEach((analysis, index) => {
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "carousel-image-wrapper";
    if (index === 0) {
      imageWrapper.classList.add("active");
    }
    imageWrapper.dataset.index = index;

    const img = document.createElement("img");
    img.src = analysis.image;
    img.className = "carousel-image";
    imageWrapper.appendChild(img);

    // Add click handler
    imageWrapper.addEventListener("click", () => {
      selectAnalysis(index);
    });

    carousel.appendChild(imageWrapper);
  });

  // Handle scroll to detect which image is in view (only if multiple images)
  if (savedAnalyses.length > 1) {
    let scrollTimeout;
    carouselContainer.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const containerRect = carouselContainer.getBoundingClientRect();
        const images = carousel.querySelectorAll(".carousel-image-wrapper");

        images.forEach((imgWrapper, index) => {
          const imgRect = imgWrapper.getBoundingClientRect();
          const imgCenter = imgRect.left + imgRect.width / 2;
          const containerCenter = containerRect.left + containerRect.width / 2;

          // If image is centered (within 50px), select it
          if (Math.abs(imgCenter - containerCenter) < 50) {
            selectAnalysis(index);
          }
        });
      }, 100);
    });
  }

  // Display the first analysis by default
  displaySelectedAnalysis(savedAnalyses[0], snapshotsContainer);
}

function selectAnalysis(index) {
  const savedAnalyses = JSON.parse(
    localStorage.getItem("analysisResults") || "[]"
  );

  if (index < 0 || index >= savedAnalyses.length) return;

  currentSelectedIndex = index;

  // Update active state in carousel
  const images = document.querySelectorAll(".carousel-image-wrapper");
  images.forEach((imgWrapper, i) => {
    if (i === index) {
      imgWrapper.classList.add("active");
      // Scroll to center the selected image
      const carouselContainer = document.getElementById(
        "image-carousel-container"
      );
      const imgRect = imgWrapper.getBoundingClientRect();
      const containerRect = carouselContainer.getBoundingClientRect();
      const scrollLeft =
        imgWrapper.offsetLeft - containerRect.width / 2 + imgRect.width / 2;
      carouselContainer.scrollTo({ left: scrollLeft, behavior: "smooth" });
    } else {
      imgWrapper.classList.remove("active");
    }
  });

  // Stop current audio if playing
  if (currentAudioElement) {
    currentAudioElement.pause();
    currentAudioElement.currentTime = 0;
  }

  // Display selected analysis
  const snapshotsContainer = document.getElementById("snapshots");
  displaySelectedAnalysis(savedAnalyses[index], snapshotsContainer);
}

function displaySelectedAnalysis(analysis, container) {
  container.innerHTML = "";

  // Create snapshot container
  const snapshotContainer = document.createElement("div");
  snapshotContainer.className = "snapshot-container";

  // Create and append timestamp
  const timestamp = document.createElement("div");
  timestamp.className = "snapshot-timestamp";
  timestamp.textContent = analysis.timestamp;
  snapshotContainer.appendChild(timestamp);

  // Add audio player if available
  if (analysis.audioUrl) {
    try {
      const audioBlob = new Blob(
        [Uint8Array.from(atob(analysis.audioUrl), (c) => c.charCodeAt(0))],
        { type: "audio/mpeg" }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      // Create custom audio player container
      const audioPlayerContainer = document.createElement("div");
      audioPlayerContainer.className = "custom-audio-player";

      // Create hidden audio element for actual playback
      const audioElement = document.createElement("audio");
      audioElement.src = audioUrl;
      audioElement.className = "hidden-audio";
      currentAudioElement = audioElement;

      // Create play button
      const playButton = document.createElement("button");
      playButton.className = "audio-play-button";
      playButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 5V19L19 12L8 5Z" fill="#65B2C2"/>
        </svg>
      `;
      playButton.setAttribute("aria-label", "Play audio");

      // Create waveform container
      const waveformContainer = document.createElement("div");
      waveformContainer.className = "audio-waveform";

      // Create waveform bars
      for (let i = 0; i < 40; i++) {
        const bar = document.createElement("div");
        bar.className = "waveform-bar";
        waveformContainer.appendChild(bar);
      }

      // Add click handler to play button
      playButton.addEventListener("click", () => {
        if (audioElement.paused) {
          audioElement.play();
          playButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="6" y="4" width="4" height="16" fill="#65B2C2"/>
              <rect x="14" y="4" width="4" height="16" fill="#65B2C2"/>
            </svg>
          `;
          playButton.setAttribute("aria-label", "Pause audio");
          animateWaveform(waveformContainer, true);
        } else {
          audioElement.pause();
          playButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5V19L19 12L8 5Z" fill="#65B2C2"/>
            </svg>
          `;
          playButton.setAttribute("aria-label", "Play audio");
          animateWaveform(waveformContainer, false);
        }
      });

      // Reset button when audio ends
      audioElement.addEventListener("ended", () => {
        playButton.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5V19L19 12L8 5Z" fill="#65B2C2"/>
          </svg>
        `;
        playButton.setAttribute("aria-label", "Play audio");
        animateWaveform(waveformContainer, false);
      });

      // Assemble audio player
      audioPlayerContainer.appendChild(audioElement);
      audioPlayerContainer.appendChild(playButton);
      audioPlayerContainer.appendChild(waveformContainer);

      snapshotContainer.appendChild(audioPlayerContainer);
    } catch (error) {
      console.error("Error creating audio player:", error);
    }
  }

  // Create and append analysis text
  const analysisText = document.createElement("div");
  analysisText.className = "analysis-text";
  analysisText.textContent = analysis.analysis;
  snapshotContainer.appendChild(analysisText);

  container.appendChild(snapshotContainer);
}

// Function to animate waveform
function animateWaveform(waveformContainer, isPlaying) {
  const bars = waveformContainer.querySelectorAll(".waveform-bar");

  if (!isPlaying) {
    bars.forEach((bar) => {
      bar.style.animation = "none";
      bar.style.height = "8px";
    });
    return;
  }

  bars.forEach((bar, index) => {
    const delay = index * 0.1;
    const duration = 0.6 + Math.random() * 0.4;
    const height = 8 + Math.random() * 24;

    bar.style.animation = `waveform ${duration}s ease-in-out infinite`;
    bar.style.animationDelay = `${delay}s`;
    bar.style.height = `${height}px`;
  });
}

// Use DOMContentLoaded to initialize the page
document.addEventListener("DOMContentLoaded", initializePage);

// Clean up click indicator when navigating away
window.addEventListener("beforeunload", () => {
  removeClickIndicator();
});

// Also clean up on page visibility change (when user switches tabs/apps)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    removeClickIndicator();
  }
});
