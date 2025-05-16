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

  const MAX_FILES = 9;
  let selectedFiles = [];

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

    // Add new files to selected files array
    selectedFiles = [...selectedFiles, ...newFiles];

    // Update file count display
    updateFileCountDisplay();

    // Display previews
    displayImagePreviews();
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

      // Create image preview
      const reader = new FileReader();
      reader.onload = function (e) {
        previewWrapper.innerHTML = `
          <div class="image-container">
            <img src="${e.target.result}" alt="Preview ${
          index + 1
        }" class="preview-image">
            <button type="button" class="remove-image" data-index="${index}">×</button>
          </div>
        `;
      };
      reader.readAsDataURL(file);

      uploadPreviewContainer.appendChild(previewWrapper);
    });

    // Add event listeners to remove buttons after all previews are created
    setTimeout(() => {
      const removeButtons = document.querySelectorAll(".remove-image");
      removeButtons.forEach((button) => {
        button.addEventListener("click", function () {
          const index = parseInt(this.dataset.index);
          removeFile(index);
        });
      });
    }, 100);
  }

  function removeFile(index) {
    // Remove file from array
    selectedFiles.splice(index, 1);

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

    // Here you would implement the actual upload logic
    // For each file in selectedFiles array...

    // Example placeholder:
    selectedFiles.forEach((file) => {
      // uploadImage(file)...
    });
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
