const repoBase = "https://github.com/petergpt/claude-opus-47-context-worlds";

const scenes = {
  rome: {
    title: "Voxel Rome",
    promptPath: "prompts/voxel-rome.md",
    contexts: {
      "400k": {
        label: "400k Context",
        path: "scenes/voxel-rome-400k/index.html",
        sourcePath: "scenes/voxel-rome-400k",
      },
      "1m": {
        label: "1m Context",
        path: "scenes/voxel-rome-1m/index.html",
        sourcePath: "scenes/voxel-rome-1m",
      },
    },
  },
  "golden-gate": {
    title: "Golden Gate",
    promptPath: "prompts/golden-gate.md",
    contexts: {
      "400k": {
        label: "400k Context",
        path: "scenes/golden-gate-400k/index.html",
        sourcePath: "scenes/golden-gate-400k",
      },
      "1m": {
        label: "1m Context",
        path: "scenes/golden-gate-1m/index.html",
        sourcePath: "scenes/golden-gate-1m",
      },
    },
  },
  stonehenge: {
    title: "Stonehenge",
    promptPath: "prompts/stonehenge.md",
    contexts: {
      "400k": {
        label: "400k Context",
        path: "scenes/stonehenge-400k/index.html",
        sourcePath: "scenes/stonehenge-400k",
      },
      "1m": {
        label: "1m Context",
        path: "scenes/stonehenge-1m/index.html",
        sourcePath: "scenes/stonehenge-1m",
      },
    },
  },
};

const state = {
  scene: "rome",
  context: "400k",
};

const frame = document.querySelector("#sceneFrame");
const summary = document.querySelector("#sceneSummary");
const openScene = document.querySelector("#openScene");
const viewSource = document.querySelector("#viewSource");
const viewPrompt = document.querySelector("#viewPrompt");
const copyPrompt = document.querySelector("#copyPrompt");
const closePrompt = document.querySelector("#closePrompt");
const promptPanel = document.querySelector("#promptPanel");
const promptBackdrop = document.querySelector("#promptBackdrop");
const promptTitle = document.querySelector("#promptTitle");
const promptContent = document.querySelector("#promptContent");
const viewer = document.querySelector(".viewer");
const promptTabs = [...document.querySelectorAll(".prompt-tab")];
const contextButtons = [...document.querySelectorAll(".context-button")];
const sceneJumps = [...document.querySelectorAll(".scene-jump")];
const promptCache = new Map();
let promptRawText = "";

function activeEntry() {
  const scene = scenes[state.scene];
  return {
    scene,
    context: scene.contexts[state.context],
  };
}

function setActiveClasses() {
  promptTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.scene === state.scene);
  });

  contextButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.context === state.context);
  });

  sceneJumps.forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.dataset.scene === state.scene && button.dataset.context === state.context,
    );
  });
}

function render() {
  const { scene, context } = activeEntry();
  const label = `${scene.title} · ${context.label}`;

  viewer.classList.add("is-switching");
  frame.title = label;
  frame.src = context.path;
  summary.textContent = label;
  openScene.href = context.path;
  viewSource.href = `${repoBase}/tree/main/${context.sourcePath}`;
  promptTitle.textContent = scene.title;
  copyPrompt.textContent = "Copy Prompt";
  setActiveClasses();

  if (promptPanel.getAttribute("aria-hidden") === "false") {
    loadPrompt();
  }

  window.history.replaceState(null, "", `#${state.scene}-${state.context}`);
}

function setScene(scene) {
  if (!scenes[scene]) return;
  state.scene = scene;
  render();
}

function setContext(context) {
  if (!scenes[state.scene].contexts[context]) return;
  state.context = context;
  render();
}

function restoreHash() {
  const hash = window.location.hash.replace(/^#/, "");
  const match = hash.match(/^(rome|golden-gate|stonehenge)-(400k|1m)$/);
  if (!match) return;
  state.scene = match[1];
  state.context = match[2];
}

async function loadPrompt() {
  const { scene } = activeEntry();

  if (promptCache.has(scene.promptPath)) {
    promptRawText = promptCache.get(scene.promptPath);
    promptContent.innerHTML = renderPromptMarkdown(promptRawText);
    return;
  }

  promptRawText = "";
  promptContent.textContent = "Loading prompt...";

  try {
    const response = await fetch(scene.promptPath);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    promptCache.set(scene.promptPath, text);
    promptRawText = text;
    promptContent.innerHTML = renderPromptMarkdown(text);
  } catch (error) {
    promptRawText = `Prompt source is available in the GitHub repo at ${scene.promptPath}.`;
    promptContent.textContent = promptRawText;
  }
}

function openPromptPanel() {
  promptBackdrop.hidden = false;
  promptPanel.setAttribute("aria-hidden", "false");
  copyPrompt.textContent = "Copy Prompt";
  loadPrompt();
}

function closePromptPanel() {
  promptPanel.setAttribute("aria-hidden", "true");
  promptBackdrop.hidden = true;
}

async function copyActivePrompt() {
  if (!promptRawText || promptRawText === "Loading prompt...") return;

  try {
    await navigator.clipboard.writeText(promptRawText);
    copyPrompt.textContent = "Copied";
  } catch (error) {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(promptContent);
    selection.removeAllRanges();
    selection.addRange(range);
    copyPrompt.textContent = "Selected";
  }

  window.setTimeout(() => {
    copyPrompt.textContent = "Copy Prompt";
  }, 1600);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineMarkdown(value) {
  return escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderPromptMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let listOpen = false;

  function closeList() {
    if (!listOpen) return;
    html.push("</ul>");
    listOpen = false;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      const level = Math.min(headingMatch[1].length + 1, 4);
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const bulletMatch = trimmed.match(/^-\s+(.+)$/);
    if (bulletMatch) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${renderInlineMarkdown(bulletMatch[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  }

  closeList();
  return html.join("");
}

promptTabs.forEach((button) => {
  button.addEventListener("click", () => setScene(button.dataset.scene));
});

contextButtons.forEach((button) => {
  button.addEventListener("click", () => setContext(button.dataset.context));
});

sceneJumps.forEach((button) => {
  button.addEventListener("click", () => {
    state.scene = button.dataset.scene;
    state.context = button.dataset.context;
    render();
  });
});

viewPrompt.addEventListener("click", openPromptPanel);
copyPrompt.addEventListener("click", copyActivePrompt);
closePrompt.addEventListener("click", closePromptPanel);
promptBackdrop.addEventListener("click", closePromptPanel);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && promptPanel.getAttribute("aria-hidden") === "false") {
    closePromptPanel();
  }
});

frame.addEventListener("load", () => {
  viewer.classList.remove("is-switching");
});

restoreHash();
render();
