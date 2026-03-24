const DEFAULT_PROJECTS = [
  {
    title: "Portfolio",
    description: "Geen projecten gevonden.",
    meta: "",
    images: []
  }
];

function sanitizeImageEntry(entry) {
  if (typeof entry === "string" && entry.trim()) {
    return entry.trim();
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

async function loadProjects() {
  try {
    const response = await fetch("./projects.json", { cache: "no-store" });
    if (!response.ok) throw new Error("projects.json kon niet geladen worden");
    const data = await response.json();
    return sanitizeProjects(data);
  } catch (error) {
    console.warn(error);
    return DEFAULT_PROJECTS;
  }
}

let projects = DEFAULT_PROJECTS;
let currentProjectIndex = 0;
let currentImageIndex = 0;

const mainImage = document.getElementById("mainImage");
const projectLines = document.getElementById("projectLines");
const textFrame = document.getElementById("textFrame");
const imageFrame = document.getElementById("imageFrame");
const customCursor = document.getElementById("customCursor");

function resolveImageSource(entry) {
  return typeof entry === "string" ? entry : "";
}

function renderProject() {
  mainImage.decoding = "async";
  mainImage.loading = "eager";
  const project = projects[currentProjectIndex];
  const imageEntry = project.images[currentImageIndex] || "";
  const imageSrc = resolveImageSource(imageEntry);

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

mainImage.addEventListener("dragstart", (event) => event.preventDefault());
mainImage.addEventListener("mousedown", (event) => { if (event.detail > 1) event.preventDefault(); });

loadProjects().then((loaded) => {
  projects = loaded;
  renderProject();
});
