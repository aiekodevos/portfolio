const STORAGE_KEY = "portfolioProjectsV2";
const IMAGE_DB_NAME = "portfolioImageDB";
const IMAGE_STORE_NAME = "images";

const DEFAULT_PROJECTS = [
  {
    title: "Designing a poster for Minima Docta",
    description: "Poster for Minima Docta, a project exploring contemporary art and society through documentary cinema and discussions.",
    meta: "12 February 2025 • 84 × 118.8 cm",
    images: [
      "assets/minima-1.png",
      "assets/minima-2.png",
      "assets/minima-3.png"
    ]
  },
  {
    title: "Identity exploration",
    description: "Visual identity research with typography, structured grids and print based outcomes.",
    meta: "Portfolio piece",
    images: [
      "assets/minima-1.png",
      "assets/minima-2.png"
    ]
  }
];

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

async function getImageRecord(id) {
  const db = await openImageDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGE_STORE_NAME, "readonly");
    const store = tx.objectStore(IMAGE_STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
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
      mimeType: typeof entry.mimeType === "string" ? entry.mimeType : "image/jpeg"
    };
  }

  return null;
}

function sanitizeProjects(input) {
  if (!Array.isArray(input)) return DEFAULT_PROJECTS;

  const cleaned = input
    .map((project) => {
      const title = typeof project?.title === "string" ? project.title.trim() : "";
      const description = typeof project?.description === "string" ? project.description.trim() : "";
      const meta = typeof project?.meta === "string" ? project.meta.trim() : "";
      const images = Array.isArray(project?.images)
        ? project.images.map(sanitizeImageEntry).filter(Boolean)
        : [];

      if (!title || images.length === 0) return null;
      return { title, description, meta, images };
    })
    .filter(Boolean);

  return cleaned.length ? cleaned : DEFAULT_PROJECTS;
}

function getProjects() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PROJECTS;
    return sanitizeProjects(JSON.parse(stored));
  } catch (error) {
    console.warn("Could not read stored projects:", error);
    return DEFAULT_PROJECTS;
  }
}

const projects = getProjects();

let currentProjectIndex = 0;
let currentImageIndex = 0;
let currentObjectUrl = null;

const mainImage = document.getElementById("mainImage");
const projectLines = document.getElementById("projectLines");
const textFrame = document.getElementById("textFrame");
const imageFrame = document.getElementById("imageFrame");
const customCursor = document.getElementById("customCursor");

async function resolveImageSource(entry) {
  if (typeof entry === "string") {
    return entry;
  }

  if (entry && entry.type === "db") {
    const record = await getImageRecord(entry.id);
    if (!record || !record.blob) return "";
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl);
      currentObjectUrl = null;
    }
    currentObjectUrl = URL.createObjectURL(record.blob);
    return currentObjectUrl;
  }

  return "";
}

async function renderProject() {
  mainImage.decoding = "async";
  mainImage.loading = "eager";
  const project = projects[currentProjectIndex];
  const imageEntry = project.images[currentImageIndex] || "";
  const imageSrc = await resolveImageSource(imageEntry);

  mainImage.src = imageSrc || "";
  mainImage.alt = project.title;
  projectLines.innerHTML = "";

  [project.title, project.description, project.meta].filter(Boolean).forEach((lineText) => {
    const row = document.createElement("div");
    row.className = "project-line";
    row.textContent = lineText;
    projectLines.appendChild(row);
  });
}

function nextProject() {
  currentProjectIndex = (currentProjectIndex + 1) % projects.length;
  currentImageIndex = 0;
  renderProject();
}

function nextImage() {
  const activeProject = projects[currentProjectIndex];
  currentImageIndex = (currentImageIndex + 1) % activeProject.images.length;
  renderProject();
}

textFrame.addEventListener("click", nextProject);
imageFrame.addEventListener("click", nextImage);

function moveCustomCursor(event) {
  customCursor.style.left = `${event.clientX}px`;
  customCursor.style.top = `${event.clientY}px`;
}

function showCustomCursor(src, cursorType) {
  customCursor.src = src;
  customCursor.classList.remove("is-hidden");
  customCursor.classList.remove("is-green", "is-red");
  if (cursorType) customCursor.classList.add(cursorType);
}

function hideCustomCursor() {
  customCursor.classList.add("is-hidden");
}

imageFrame.addEventListener("mouseenter", () => showCustomCursor("./arrow_green.svg", "is-green"));
imageFrame.addEventListener("mousemove", moveCustomCursor);
imageFrame.addEventListener("mouseleave", hideCustomCursor);

textFrame.addEventListener("mouseenter", () => showCustomCursor("./arrow_red.svg", "is-red"));
textFrame.addEventListener("mousemove", moveCustomCursor);
textFrame.addEventListener("mouseleave", hideCustomCursor);

window.addEventListener("beforeunload", () => {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
  }
});

renderProject();


mainImage.addEventListener("dragstart", (event) => event.preventDefault());
mainImage.addEventListener("mousedown", (event) => { if (event.detail > 1) event.preventDefault(); });
