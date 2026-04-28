const scenes = {
  rome: {
    title: "Voxel Rome",
    contexts: {
      "400k": {
        label: "400k Context",
        path: "scenes/voxel-rome-400k/index.html",
      },
      "1m": {
        label: "1m Context",
        path: "scenes/voxel-rome-1m/index.html",
      },
    },
  },
  "golden-gate": {
    title: "Golden Gate",
    contexts: {
      "400k": {
        label: "400k Context",
        path: "scenes/golden-gate-400k/index.html",
      },
      "1m": {
        label: "1m Context",
        path: "scenes/golden-gate-1m/index.html",
      },
    },
  },
  stonehenge: {
    title: "Stonehenge",
    contexts: {
      "400k": {
        label: "400k Context",
        path: "scenes/stonehenge-400k/index.html",
      },
      "1m": {
        label: "1m Context",
        path: "scenes/stonehenge-1m/index.html",
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
const viewer = document.querySelector(".viewer");
const promptTabs = [...document.querySelectorAll(".prompt-tab")];
const contextButtons = [...document.querySelectorAll(".context-button")];
const sceneJumps = [...document.querySelectorAll(".scene-jump")];

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
  viewSource.href = context.path;
  setActiveClasses();

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

frame.addEventListener("load", () => {
  viewer.classList.remove("is-switching");
});

restoreHash();
render();
