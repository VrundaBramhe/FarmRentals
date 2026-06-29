document.addEventListener("DOMContentLoaded", () => {
  // 1. Handle the Image Click
  const uploadBox = document.getElementById("upload-box");
  const imageInput = document.getElementById("image-upload");
  const uploadText = document.getElementById("upload-text");

  if (uploadBox && imageInput) {
    // When the box is clicked, trigger the hidden file input
    uploadBox.addEventListener("click", () => imageInput.click());

    // When a file is selected, update the text to show the file name
    imageInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        uploadText.innerText = `Selected: ${e.target.files[0].name}`;
        uploadBox.style.borderColor = "#2e7d32"; // Turn green to show success
      }
    });
  }

  // 2. Handle the Form Submission
  const submitBtn = document.querySelector(".btn-primary");

  if (submitBtn) {
    submitBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const token = localStorage.getItem("farmToken");
      if (!token) {
        alert("Please log in to list equipment.");
        window.location.href = "index.html";
        return;
      }

      const category = document.getElementById("equip-type").value;
      const name = document.getElementById("equip-name").value;
      const description = document.getElementById("equip-desc").value;
      const dailyPrice = document.getElementById("equip-price").value;
      const district = document.getElementById("equip-district").value;
      const imageFile = imageInput.files[0];

      if (!category || !name || !dailyPrice || !district) {
        return alert("Please fill out all required fields.");
      }

      submitBtn.innerText = "Uploading...";
      submitBtn.disabled = true;

      try {
        // When sending files, we MUST use FormData instead of JSON!
        const formData = new FormData();
        formData.append("category", `${name} (${category})`);
        formData.append("description", description);
        formData.append("dailyPrice", dailyPrice);
        formData.append("district", district);
        if (imageFile) {
          formData.append("image", imageFile); // Attach the file!
        }

        const response = await fetch("/api/equipment", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Note: Do NOT set 'Content-Type'. The browser sets it automatically for FormData!
          },
          body: formData,
        });

        const result = await response.json();

        if (result.success) {
          alert("Equipment listed successfully!");
          window.location.href = "dashboard.html";
        } else {
          alert("Error: " + result.message);
        }
      } catch (error) {
        console.error(error);
        alert("Failed to connect to the server.");
      } finally {
        submitBtn.innerText = "List My Equipment";
        submitBtn.disabled = false;
      }
    });
  }
});
