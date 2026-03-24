const FALLBACK_PROJECTS = [
  {
    title: "Portfolio selectie",
    description: "Statische GitHub-versie van het portfolio.",
    meta: "1 afbeelding",
    images: ["assets/foto01.jpg"]
  }
];

async function loadProjects() {
  try {
    const response = await fetch("./projects.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return FALLBACK_PROJECTS;

    return data
      .map((project) => ({
        title: typeof project?.title === "string" ? project.title.trim() : "",
        description: typeof project?.description === "string" ? project.description.trim() : "",
        meta: typeof project?.meta === "string" ? project.meta.trim() : "",
        images: Array.isArray(project?.images)
          ? project.images.filter((item) => typeof item === "string" && item.trim())
          : []
      }))
      .filter((project) => project.title && project.images.length);
  } catch (error) {
    console.warn("Kon projects.json niet laden:", error);
    return FALLBACK_PROJECTS;
  }
}

let projects = [];
let currentProjectIndex = 0;
let currentImageIndex = 0;

const mainImage = document.getElementById("mainImage");
const projectLines = document.getElementById("projectLines");
const textFrame = document.getElementById("textFrame");
const imageFrame = document.getElementById("imageFrame");
const customCursor = document.getElementById("customCursor");

function renderProject() {
  const project = projects[currentProjectIndex];
  if (!project) return;

  const imageSrc = project.images[currentImageIndex] || "";
  mainImage.decoding = "async";
  mainImage.loading = "eager";
  mainImage.src = imageSrc;
  mainImage.alt = project.title;

  projectLines.innerHTML = "";
  const lines = [
    project.title,
    project.description,
    `${project.meta} • ${currentImageIndex + 1}/${project.images.length}`
  ].filter(Boolean);

  lines.forEach((lineText) => {
    const row = document.createElement("div");
    row.className = "project-line";
    row.textContent = lineText;
    projectLines.appendChild(row);
  });
}

function nextProject() {
  if (!projects.length) return;
  currentProjectIndex = (currentProjectIndex + 1) % projects.length;
  currentImageIndex = 0;
  renderProject();
}

function nextImage() {
  if (!projects.length) return;
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

loadProjects().then((loadedProjects) => {
  projects = loadedProjects.length ? loadedProjects : FALLBACK_PROJECTS;
  renderProject();
});
