const STORAGE_KEY = "portfolioProjectsV2";
const LEGACY_STORAGE_KEY = "portfolioProjectsV1";
const IMAGE_DB_NAME = "portfolioImageDB";
const IMAGE_STORE_NAME = "images";
const MAX_DIMENSION = 2400;
const JPEG_QUALITY = 0.8;
const WEBP_QUALITY = 0.78;

const DEFAULT_PROJECTS = [
  {
    title: "Designing a poster for Minima Docta",
    description: "Poster for Minima Docta, a project exploring contemporary art and society through documentary cinema and discussions.",
    meta: "12 February 2025 • 84 × 118.8 cm",
    images: ["assets/minima-1.png", "assets/minima-2.png", "assets/minima-3.png"]
  }
];

const projectList = document.getElementById("projectList");
const projectForm = document.getElementById("projectForm");
const titleInput = document.getElementById("titleInput");
const descriptionInput = document.getElementById("descriptionInput");
const metaInput = document.getElementById("metaInput");
const imagesInput = document.getElementById("imagesInput");
const imageUploadInput = document.getElementById("imageUploadInput");
const imageList = document.getElementById("imageList");
const statusText = document.getElementById("statusText");
const newBtn = document.getElementById("newBtn");
const deleteBtn = document.getElementById("deleteBtn");
const resetBtn = document.getElementById("resetBtn");
const exportBtn = document.getElementById("exportBtn");

function openImageDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putImageRecord(record) {
  const db = await openImageDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
    tx.objectStore(IMAGE_STORE_NAME).put(record);
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
  });
}

async function getImageRecord(id) {
  const db = await openImageDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, "readonly");
    const request = tx.objectStore(IMAGE_STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function deleteImageRecord(id) {
  const db = await openImageDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, "readwrite");
    tx.objectStore(IMAGE_STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function sanitizeImageEntry(entry) {
  if (typeof entry === "string" && entry.trim()) {
    return entry.trim();
  }

  if (entry && typeof entry === "object" && entry.type === "db" && entry.id) {
    return {
      type: "db",
      id: String(entry.id),
      name: typeof entry.name === "string" ? entry.name : "",
      mimeType: typeof entry.mimeType === "string" ? entry.mimeType : "image/jpeg",
      width: Number(entry.width) || 0,
      height: Number(entry.height) || 0,
      size: Number(entry.size) || 0
    };
  }

  return null;
}

function sanitizeProjects(input) {
  if (!Array.isArray(input)) return [...DEFAULT_PROJECTS];

  const cleaned = input
    .map((project) => {
      const title = typeof project?.title === "string" ? project.title.trim() : "";
      const description = typeof project?.description === "string" ? project.description.trim() : "";
      const meta = typeof project?.meta === "string" ? project.meta.trim() : "";
      const images = Array.isArray(project?.images)
        ? project.images.map(sanitizeImageEntry).filter(Boolean)
        : [];

      return { title, description, meta, images };
    })
    .filter((project) => project.title || project.description || project.meta || project.images.length);

  return cleaned.length ? cleaned : [...DEFAULT_PROJECTS];
}

function readProjects() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return sanitizeProjects(JSON.parse(stored));

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) return sanitizeProjects(JSON.parse(legacy));

    return [...DEFAULT_PROJECTS];
  } catch {
    return [...DEFAULT_PROJECTS];
  }
}

let projects = readProjects();
let activeIndex = 0;

function saveProjects() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function formatBytes(bytes) {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function renderList() {
  projectList.innerHTML = "";
  projects.forEach((project, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `project-item ${index === activeIndex ? "is-active" : ""}`;
    button.textContent = project.title || `Werk ${index + 1}`;
    button.addEventListener("click", () => {
      activeIndex = index;
      fillForm();
      renderList();
    });
    projectList.appendChild(button);
  });
}

async function renderImageList() {
  const project = projects[activeIndex];
  imageList.innerHTML = "";

  if (!project || !project.images.length) {
    imageList.innerHTML = `<div class="empty-images">Nog geen afbeeldingen voor dit werk.</div>`;
    return;
  }

  for (let index = 0; index < project.images.length; index += 1) {
    const entry = project.images[index];
    const card = document.createElement("div");
    card.className = "image-item";

    const preview = document.createElement("div");
    preview.className = "image-thumb";

    const info = document.createElement("div");
    info.className = "image-meta";

    let previewUrl = "";
    if (typeof entry === "string") {
      previewUrl = entry;
      info.innerHTML = `<strong>Pad</strong><span>${entry}</span>`;
    } else if (entry.type === "db") {
      const record = await getImageRecord(entry.id);
      if (record?.blob) {
        previewUrl = URL.createObjectURL(record.blob);
      }
      info.innerHTML = `<strong>${entry.name || "Upload"}</strong><span>${entry.width || "?"} × ${entry.height || "?"} • ${formatBytes(entry.size)}</span>`;
    }

    if (previewUrl) {
      const img = document.createElement("img");
      img.src = previewUrl;
      img.alt = "";
      preview.appendChild(img);

      if (entry && typeof entry === "object" && entry.type === "db") {
        img.addEventListener("load", () => URL.revokeObjectURL(previewUrl), { once: true });
      }
    }

    const controls = document.createElement("div");
    controls.className = "image-actions";

    const moveUp = document.createElement("button");
    moveUp.type = "button";
    moveUp.className = "small-button";
    moveUp.textContent = "↑";
    moveUp.disabled = index === 0;
    moveUp.addEventListener("click", () => {
      const temp = project.images[index - 1];
      project.images[index - 1] = project.images[index];
      project.images[index] = temp;
      saveProjects();
      renderImageList();
    });

    const moveDown = document.createElement("button");
    moveDown.type = "button";
    moveDown.className = "small-button";
    moveDown.textContent = "↓";
    moveDown.disabled = index === project.images.length - 1;
    moveDown.addEventListener("click", () => {
      const temp = project.images[index + 1];
      project.images[index + 1] = project.images[index];
      project.images[index] = temp;
      saveProjects();
      renderImageList();
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "small-button danger";
    removeBtn.textContent = "verwijder";
    removeBtn.addEventListener("click", async () => {
      const removed = project.images.splice(index, 1)[0];
      if (removed && typeof removed === "object" && removed.type === "db") {
        await deleteImageRecord(removed.id);
      }
      saveProjects();
      fillForm();
      renderImageList();
    });

    controls.append(moveUp, moveDown, removeBtn);
    card.append(preview, info, controls);
    imageList.appendChild(card);
  }
}

function fillForm() {
  const project = projects[activeIndex];
  if (!project) return;

  titleInput.value = project.title || "";
  descriptionInput.value = project.description || "";
  metaInput.value = project.meta || "";
  imagesInput.value = (project.images || [])
    .filter((entry) => typeof entry === "string")
    .join("\n");

  renderImageList();
}

function syncProjectFromForm() {
  const project = projects[activeIndex];
  const manualImages = imagesInput.value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const uploadedImages = (project.images || []).filter((entry) => typeof entry === "object" && entry.type === "db");

  projects[activeIndex] = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    meta: metaInput.value.trim(),
    images: [...uploadedImages, ...manualImages]
  };
}

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  syncProjectFromForm();
  saveProjects();
  renderList();
  fillForm();
  statusText.textContent = "Opgeslagen.";
});

newBtn.addEventListener("click", () => {
  projects.push({
    title: "Nieuw werk",
    description: "",
    meta: "",
    images: []
  });
  activeIndex = projects.length - 1;
  saveProjects();
  renderList();
  fillForm();
});

deleteBtn.addEventListener("click", async () => {
  if (projects.length === 1) {
    alert("Je moet minstens 1 werk behouden.");
    return;
  }

  const project = projects[activeIndex];
  for (const image of project.images) {
    if (image && typeof image === "object" && image.type === "db") {
      await deleteImageRecord(image.id);
    }
  }

  projects.splice(activeIndex, 1);
  activeIndex = Math.max(0, activeIndex - 1);
  saveProjects();
  renderList();
  fillForm();
});

resetBtn.addEventListener("click", async () => {
  const existing = projects.flatMap((project) => project.images || []);
  for (const image of existing) {
    if (image && typeof image === "object" && image.type === "db") {
      await deleteImageRecord(image.id);
    }
  }

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  projects = [...DEFAULT_PROJECTS];
  activeIndex = 0;
  renderList();
  fillForm();
  statusText.textContent = "Demo-inhoud hersteld.";
});

exportBtn.addEventListener("click", () => {
  syncProjectFromForm();
  saveProjects();
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "portfolio-projects.json";
  link.click();
  URL.revokeObjectURL(url);
});

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function compressImage(file) {
  const dataUrl = await readFileAsDataURL(file);
  const image = await loadImage(dataUrl);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.drawImage(image, 0, 0, width, height);

  let mimeType = "image/webp";
  let quality = WEBP_QUALITY;

  const outputBlob = await new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      mimeType = "image/jpeg";
      quality = JPEG_QUALITY;
      canvas.toBlob((fallbackBlob) => resolve(fallbackBlob), mimeType, quality);
    }, mimeType, quality);
  });

  return {
    blob: outputBlob,
    width,
    height,
    mimeType
  };
}

imageUploadInput.addEventListener("change", async (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  syncProjectFromForm();
  const project = projects[activeIndex];

  statusText.textContent = `Bezig met ${files.length} afbeelding(en) verwerken…`;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    statusText.textContent = `Verwerken ${index + 1}/${files.length}: ${file.name}`;

    try {
      const compressed = await compressImage(file);
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      await putImageRecord({
        id,
        name: file.name.replace(/\.[^.]+$/, "") + (compressed.mimeType === "image/webp" ? ".webp" : ".jpg"),
        mimeType: compressed.blob.type || compressed.mimeType,
        width: compressed.width,
        height: compressed.height,
        size: compressed.blob.size,
        blob: compressed.blob,
        createdAt: Date.now()
      });

      project.images.push({
        type: "db",
        id,
        name: file.name,
        mimeType: compressed.blob.type || compressed.mimeType,
        width: compressed.width,
        height: compressed.height,
        size: compressed.blob.size
      });
    } catch (error) {
      console.error(error);
      statusText.textContent = `Fout bij upload van ${file.name}`;
    }
  }

  saveProjects();
  fillForm();
  renderList();
  imageUploadInput.value = "";
  statusText.textContent = "Upload klaar. Vergeet niet op opslaan te klikken als je ook tekst hebt aangepast.";
});

renderList();
fillForm();
