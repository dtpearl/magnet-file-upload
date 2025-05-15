// Global function to initialize image uploaders
function initializeImageUploader(productId) {
  const actualFileInput = document.getElementById(
    `actual-file-input-${productId}`
  );
  const customUploadButton = document.getElementById(
    `custom-upload-button-${productId}`
  );
  const uploadPreview = document.getElementById(`upload-preview-${productId}`);
  const uploadStatus = document.getElementById(`upload-status-${productId}`);

  if (!actualFileInput || !customUploadButton) return;

  // Trigger the hidden file input when custom button is clicked
  customUploadButton.addEventListener("click", function () {
    actualFileInput.click();
  });

  // Handle file selection
  actualFileInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    // Show preview
    displayImagePreview(file, uploadPreview);

    // Upload the file
    uploadImage(file, productId, uploadStatus);
  });
}

function displayImagePreview(file, previewElement) {
  // Create image preview
  const reader = new FileReader();
  reader.onload = function (e) {
    previewElement.innerHTML = `<img src="${e.target.result}" alt="Preview" class="preview-image">`;
  };
  reader.readAsDataURL(file);
}

async function uploadImage(file, productId, statusElement) {
  statusElement.textContent = "Uploading...";

  try {
    // Your upload logic here
    // ...

    // Add to cart form
    const form = document.querySelector(
      `form[action="/cart/add"][data-product-id="${productId}"]`
    );
    if (form) {
      // Add the image URL to the form as a hidden input
      // ...
    }

    statusElement.textContent = "Upload successful!";
  } catch (error) {
    statusElement.textContent = "Upload failed. Please try again.";
    console.error(error);
  }
}

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
