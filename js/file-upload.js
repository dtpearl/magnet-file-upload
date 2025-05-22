const initializeImageUploader = (productId) => {
  const actualFileInput = document.getElementById(
    `actual-file-input-${productId}`
  );
  const customUploadButton = document.getElementById(
    `custom-upload-button-${productId}`
  );
  const uploadPreviewContainer = document.getElementById(
    `upload-preview-container-${productId}`
  );
  const uploadStatus = document.getElementById(`upload-status-${productId}`);
  const fileCountDisplay = document.getElementById(
    `file-count-display-${productId}`
  );
  const cropModal = document.getElementById("crop-modal");
  const imageToCrop = document.getElementById("image-to-crop");
  const closeCropModal = document.getElementById("close-crop-modal");
  const cropCancel = document.getElementById("crop-cancel");
  const cropApply = document.getElementById("crop-apply");
  const safeAreaToggle = document.getElementById("safe-area-toggle");

  const MAX_FILES = 9;
  const ASPECT_RATIO = 1; // 1:1 square aspect ratio; change as needed (e.g., 16/9 for widescreen)

  // Print safe area configuration - adjust these values as needed
  const SAFE_AREA_PERCENTAGE = 0.9; // 90% of the cropped area is considered "safe" for print
  const SAFE_AREA_COLOR = "rgba(255, 255, 255, 0.2)";
  const SAFE_AREA_BORDER = "rgba(0, 120, 255, 0.8)";
  let showSafeArea = true; // Default state for safe area visibility

  let selectedFiles = [];
  let croppedFiles = [];
  let currentCropperInstance = null;
  let currentCropIndex = -1;

  // Trigger file input when custom button is clicked
  customUploadButton.addEventListener("click", function () {
    actualFileInput.click();
  });

  // Handle file selection
  actualFileInput.addEventListener("change", function (e) {
    const newFiles = Array.from(e.target.files);

    // Check if adding these files would exceed the limit
    if (selectedFiles.length + newFiles.length > MAX_FILES) {
      uploadStatus.textContent = `You can only upload a maximum of ${MAX_FILES} images.`;
      uploadStatus.style.color = "red";
      return;
    }

    // // Add new files to selected files array
    // selectedFiles = [...selectedFiles, ...newFiles];

    // // Update file count display
    // updateFileCountDisplay();

    // // Display previews
    // displayImagePreviews();

    // Process and add new files
    processNewFiles(newFiles);
  });

  // Process newly selected files and start cropping
  function processNewFiles(files) {
    if (files.length === 0) return;

    // Add files to selected files array
    for (let i = 0; i < files.length; i++) {
      selectedFiles.push(files[i]);
      croppedFiles.push(null); // Placeholder for cropped version
    }

    // Update file count display
    updateFileCountDisplay();

    // Start cropping the first new file
    startCropping(selectedFiles.length - files.length);
  }

  // Process newly selected files and start cropping
  function processNewFiles(files) {
    if (files.length === 0) return;

    // Add files to selected files array
    for (let i = 0; i < files.length; i++) {
      selectedFiles.push(files[i]);
      croppedFiles.push(null); // Placeholder for cropped version
    }

    // Update file count display
    updateFileCountDisplay();

    // Start cropping the first new file
    startCropping(selectedFiles.length - files.length);
  }

  // Start the cropping process for a specific file index
  function startCropping(index) {
    if (index >= selectedFiles.length) {
      // All files processed, display the final previews
      displayImagePreviews();
      return;
    }

    currentCropIndex = index;
    const file = selectedFiles[index];

    // Create a URL for the image
    const objectUrl = URL.createObjectURL(file);

    // Set the image source and prepare the cropper
    imageToCrop.onload = function () {
      // Initialize cropper
      currentCropperInstance = new Cropper(imageToCrop, {
        aspectRatio: ASPECT_RATIO,
        viewMode: 1,
        guides: true,
        autoCropArea: 0.8,
        movable: true,
        rotatable: true,
        scalable: true,
        zoomable: true,
        ready: function () {
          console.log("Cropper is ready");
          // Add safe area indicator when cropper is ready
          if (showSafeArea) {
            drawSafeArea();
          }
        },
        cropend: function () {
          // Redraw safe area after crop box is adjusted
          if (showSafeArea) {
            drawSafeArea();
          }
        },
        zoom: function () {
          // Redraw safe area after zooming
          if (showSafeArea) {
            drawSafeArea();
          }
        },
        cropmove: function () {
          // Remove existing safe area when moving the crop box
          if (showSafeArea) {
            drawSafeArea();
            // Remove existing safe area if any
            // const existingSafeArea = document.querySelector(".safe-print-area");
            // if (existingSafeArea) {
            //   existingSafeArea.remove();
            // }
          }
        },
      });

      // Show the modal
      cropModal.style.display = "flex";
    };

    imageToCrop.src = objectUrl;
  }

  // Function to draw the safe area indicator
  function drawSafeArea() {
    if (!currentCropperInstance) return;

    // Remove existing safe area if any
    const existingSafeArea = document.querySelector(".safe-print-area");
    if (existingSafeArea) {
      existingSafeArea.remove();
    }

    // Get crop box dimensions
    const cropBox = currentCropperInstance.getCropBoxData();

    // Calculate safe area dimensions (smaller than the crop box)
    const safeWidth = cropBox.width * SAFE_AREA_PERCENTAGE;
    const safeHeight = cropBox.height * SAFE_AREA_PERCENTAGE;

    // Calculate position (centered within crop box)
    const safeLeft = cropBox.left + (cropBox.width - safeWidth) / 2;
    const safeTop = cropBox.top + (cropBox.height - safeHeight) / 2;

    // Create safe area element
    const safeArea = document.createElement("div");
    safeArea.className = "safe-print-area";
    safeArea.style.position = "absolute";
    safeArea.style.left = `${safeLeft}px`;
    safeArea.style.top = `${safeTop}px`;
    safeArea.style.width = `${safeWidth}px`;
    safeArea.style.height = `${safeHeight}px`;
    safeArea.style.border = `2px dashed ${SAFE_AREA_BORDER}`;
    safeArea.style.backgroundColor = SAFE_AREA_COLOR;
    safeArea.style.pointerEvents = "none"; // Make it non-interactive
    safeArea.style.zIndex = "2000"; // Ensure it's above the crop box but below the handles

    // Add a label to explain what this area represents
    const label = document.createElement("div");
    label.textContent = "Safe Print Area";
    label.style.position = "absolute";
    label.style.top = "-25px";
    label.style.left = "0";
    label.style.backgroundColor = "rgba(0, 120, 255, 0.8)";
    label.style.color = "white";
    label.style.padding = "2px 6px";
    label.style.fontSize = "12px";
    label.style.borderRadius = "3px";
    safeArea.appendChild(label);

    // Add to the cropper container
    const cropperContainer = document.querySelector(".cropper-container");
    cropperContainer.appendChild(safeArea);
  }

  // Toggle safe area visibility if there's a toggle button
  if (safeAreaToggle) {
    safeAreaToggle.addEventListener("click", function () {
      showSafeArea = !showSafeArea;

      if (showSafeArea) {
        drawSafeArea();
        safeAreaToggle.textContent = "Hide Safe Area";
      } else {
        const safeArea = document.querySelector(".safe-print-area");
        if (safeArea) safeArea.remove();
        safeAreaToggle.textContent = "Show Safe Area";
      }
    });
  }

  // Apply the crop and move to the next image
  cropApply.addEventListener("click", function () {
    if (!currentCropperInstance) return;

    // Get the cropped canvas
    const croppedCanvas = currentCropperInstance.getCroppedCanvas({
      width: 600, // Maximum width
      height: 600, // Maximum height
      fillColor: "#fff",
    });

    // Convert to blob
    croppedCanvas.toBlob(function (blob) {
      // Store the cropped version
      croppedFiles[currentCropIndex] = new File(
        [blob],
        selectedFiles[currentCropIndex].name,
        {
          type: "image/jpeg",
          lastModified: new Date().getTime(),
        }
      );

      // Clean up
      currentCropperInstance.destroy();
      currentCropperInstance = null;
      cropModal.style.display = "none";

      // Move to next image
      startCropping(currentCropIndex + 1);
    }, "image/jpeg");
  });

  // Cancel button handling
  cropCancel.addEventListener("click", function () {
    // Remove this file from the queue
    selectedFiles.splice(currentCropIndex, 1);
    croppedFiles.splice(currentCropIndex, 1);

    // Clean up
    if (currentCropperInstance) {
      currentCropperInstance.destroy();
      currentCropperInstance = null;
    }
    cropModal.style.display = "none";

    // Update count
    updateFileCountDisplay();

    // Move to next image
    startCropping(currentCropIndex);
  });

  // Close button handling
  closeCropModal.addEventListener("click", function () {
    cropCancel.click(); // Reuse the cancel logic
  });

  function updateFileCountDisplay() {
    fileCountDisplay.textContent = `${selectedFiles.length}/${MAX_FILES} images selected`;
  }

  function displayImagePreviews() {
    // Clear previous previews
    uploadPreviewContainer.innerHTML = "";

    // Create a preview for each selected file
    selectedFiles.forEach((file, index) => {
      const previewWrapper = document.createElement("div");
      previewWrapper.className = "preview-item";

      // Use cropped version if available, otherwise original
      const fileToDisplay = croppedFiles[index] || file;

      // Create image preview
      const objectUrl = URL.createObjectURL(fileToDisplay);

      previewWrapper.innerHTML = `
        <div class="image-container">
          <img src="${objectUrl}" alt="Preview ${
        index + 1
      }" class="preview-image">
          <div class="image-actions">
            <button type="button" class="edit-image" data-index="${index}">Edit</button>
            <button type="button" class="remove-image" data-index="${index}">×</button>
          </div>
        </div>
      `;

      uploadPreviewContainer.appendChild(previewWrapper);

      // Revoke the URL when the image loads to free memory
      const img = previewWrapper.querySelector("img");
      img.onload = () => URL.revokeObjectURL(objectUrl);
    });

    // Add event listeners to buttons
    addPreviewButtonListeners();
  }

  function addPreviewButtonListeners() {
    // Remove buttons
    const removeButtons = document.querySelectorAll(".remove-image");
    removeButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const index = parseInt(this.dataset.index);
        removeFile(index);
      });
    });

    // Edit buttons
    const editButtons = document.querySelectorAll(".edit-image");
    editButtons.forEach((button) => {
      button.addEventListener("click", function () {
        const index = parseInt(this.dataset.index);
        startCropping(index); // Reopen the cropper for this image
      });
    });
  }

  function removeFile(index) {
    // Remove file from arrays
    selectedFiles.splice(index, 1);
    croppedFiles.splice(index, 1);

    // Update display
    updateFileCountDisplay();
    displayImagePreviews();

    // Reset status message
    uploadStatus.textContent = "";
  }

  // Function to handle upload when form is submitted
  function handleUpload() {
    if (selectedFiles.length === 0) {
      uploadStatus.textContent = "Please select at least one image.";
      return;
    }

    uploadStatus.textContent = "Uploading...";

    // Get the final files (cropped where available)
    const filesToUpload = getFilesForUpload();

    // Here you would implement the actual upload logic with filesToUpload
    console.log("Files ready for upload:", filesToUpload);

    // Example placeholder for upload logic
    // uploadImages(filesToUpload).then(...)
  }

  // Add this function to your form submission handler
  // document.querySelector('form').addEventListener('submit', function(e) {
  //   e.preventDefault();
  //   handleUpload();
  // });
};

// Initialize any uploaders on the page
document.addEventListener("DOMContentLoaded", function () {
  const uploadContainers = document.querySelectorAll(
    ".custom-upload-container"
  );

  uploadContainers.forEach((container) => {
    const productId = container.dataset.productId;
    if (productId) {
      initializeImageUploader(productId);
    }
  });
});
