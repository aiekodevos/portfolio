let projects = [];
let currentProjectIndex = 0;
let currentImageIndex = 0;

const mainImage = document.getElementById("mainImage");
const projectLines = document.getElementById("projectLines");
const textFrame = document.getElementById("textFrame");
const imageFrame = document.getElementById("imageFrame");
const customCursor = document.getElementById("customCursor");

function sanitizeProjects(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((project) => {
      const title = typeof project?.title === "string" ? project.title.trim() : "";
      const description = typeof project?.description === "string" ? project.description.trim() : "";
      const meta = typeof project?.meta === "string" ? project.meta.trim() : "";
      const images = Array.isArray(project?.images)
        ? project.images.filter((img) => typeof img === "string" && img.trim()).map((img) => img.trim())
        : [];
      if (!title || images.length === 0) return null;
      return { title, description, meta, images };
    })
    .filter(Boolean);
}

async function loadProjects() {
  try {
    const response = await fetch("./projects.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load projects.json");
    const data = await response.json();
    projects = sanitizeProjects(data);
  } catch (error) {
    console.warn("Falling back to embedded project data.", error);
    projects = sanitizeProjects(window.PROJECTS_DATA || []);
  }

  if (!projects.length) {
    projectLines.innerHTML = '<div class="project-line">Kon projecten niet laden.</div>';
    mainImage.removeAttribute("src");
    mainImage.alt = "";
    return;
  }

  currentProjectIndex = 0;
  currentImageIndex = 0;
  renderProject();
}

function renderProject() {
  if (!projects.length) return;
  const project = projects[currentProjectIndex];
  const imageSrc = project.images[currentImageIndex] || "";
  const totalImages = project.images.length;
  const counterText = totalImages > 1 ? `(${currentImageIndex + 1}/${totalImages})` : "";

  mainImage.decoding = "async";
  mainImage.loading = "eager";
  mainImage.src = imageSrc;
  mainImage.alt = project.title;

  projectLines.innerHTML = "";
  [project.title, project.description, project.meta].filter(Boolean).forEach((lineText) => {
    const row = document.createElement("div");
    row.className = "project-line";
    row.textContent = lineText;
    projectLines.appendChild(row);
  });

  if (counterText) {
    const counterRow = document.createElement("div");
    counterRow.className = "project-line project-line--counter";
    counterRow.textContent = counterText;
    projectLines.appendChild(counterRow);
  }
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

loadProjects();
