const FILE_STATUS = {
  readme: { file: "Markdown", connection: "● Connected · ecommerce_demo", line: "Ln 1, Col 1" },
  query: { file: "PostgreSQL", connection: "● Connected · ecommerce_demo", line: "Ln 8, Col 1" },
  features: { file: "JSON", connection: "● Connected · ecommerce_demo", line: "Ln 4, Col 3" },
  connections: { file: "Form", connection: "○ Not connected", line: "New Connection" },
  install: { file: "Markdown", connection: "● pgstudio.astrx.dev", line: "Ln 1, Col 1" }
};

const FEATURE_DETAILS = {
  notebooks: "Notebook workflows keep query logic, explanations, and outcomes together so teams can review and repeat analysis.",
  explorer: "Explorer navigation keeps schema context close to your query so you spend less time switching between tools.",
  ai: "AI assistance can explain query intent, suggest safer rewrites, and provide targeted optimization guidance.",
  safety: "Environment tags and confirmation prompts reduce accidental execution in sensitive systems."
};

const TOUR_STEPS = ["readme", "connections", "features", "query", "install"];

const TYPING_INTERVAL_MS = 16;
const RUN_RESULT_DELAY_MS = 900;
const THEME_KEY = "pgstudio-docs-theme";
let tourTimer = null;

function setStatusText(element, text) {
  if (!element) {
    return;
  }

  element.textContent = "";
  let cursor = 0;
  const intervalId = window.setInterval(() => {
    element.textContent = text.slice(0, cursor);
    cursor += 1;
    if (cursor > text.length) {
      window.clearInterval(intervalId);
    }
  }, TYPING_INTERVAL_MS);
}

function openFile(fileName) {
  document.querySelectorAll(".file-view").forEach((view) => view.classList.remove("visible"));
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.remove("active");
    tab.setAttribute("aria-selected", "false");
  });
  document.querySelectorAll(".tree-row").forEach((row) => row.classList.remove("active"));

  const view = document.getElementById(`file-${fileName}`);
  if (view) {
    view.classList.add("visible");
  }

  const tab = document.querySelector(`.tab[data-open="${fileName}"]`);
  if (tab) {
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");
  }

  const rows = document.querySelectorAll(`.tree-row[data-open="${fileName}"]`);
  rows.forEach((row) => row.classList.add("active"));

  document.querySelectorAll(".activity-icon").forEach((icon) => {
    icon.classList.toggle("active", icon.getAttribute("data-open") === fileName);
  });

  const status = FILE_STATUS[fileName];
  if (status) {
    setStatusText(document.getElementById("sb-file"), status.file);
    setStatusText(document.getElementById("sb-connection"), status.connection);
    setStatusText(document.getElementById("sb-line"), status.line);
  }
}

function wireActivityIcons() {
  document.querySelectorAll(".activity-icon[data-open]").forEach((icon) => {
    icon.addEventListener("click", () => {
      const fileName = icon.getAttribute("data-open");
      if (fileName) {
        openFile(fileName);
      }
    });
  });
}

function applyTheme(theme) {
  const body = document.body;
  if (!body) {
    return;
  }

  body.setAttribute("data-theme", theme);
  const toggle = document.getElementById("theme-toggle");
  const statusTheme = document.getElementById("sb-theme");
  const label = `Theme: ${theme === "light" ? "Light" : "Dark"}`;

  if (toggle) {
    toggle.textContent = label;
  }

  if (statusTheme) {
    statusTheme.textContent = label;
  }
}

function wireThemeToggle() {
  const saved = window.localStorage.getItem(THEME_KEY);
  const initialTheme = saved === "light" ? "light" : "dark";
  applyTheme(initialTheme);

  const toggle = document.getElementById("theme-toggle");
  if (!toggle) {
    return;
  }

  toggle.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    applyTheme(next);
    window.localStorage.setItem(THEME_KEY, next);
  });
}

function wireTour() {
  const playTourBtn = document.getElementById("play-tour");
  if (!playTourBtn) {
    return;
  }

  playTourBtn.addEventListener("click", () => {
    if (tourTimer) {
      window.clearInterval(tourTimer);
      tourTimer = null;
      playTourBtn.textContent = "Play Tour";
      return;
    }

    let index = 0;
    playTourBtn.textContent = "Stop Tour";
    openFile(TOUR_STEPS[index]);

    tourTimer = window.setInterval(() => {
      index += 1;
      if (index >= TOUR_STEPS.length) {
        window.clearInterval(tourTimer);
        tourTimer = null;
        playTourBtn.textContent = "Play Tour";
        return;
      }
      openFile(TOUR_STEPS[index]);
    }, 1800);
  });
}

function wireNavigation() {
  document.querySelectorAll("[data-open]").forEach((target) => {
    target.addEventListener("click", () => {
      const fileName = target.getAttribute("data-open");
      if (fileName) {
        openFile(fileName);
      }
    });
  });
}

function wireSidebarTools() {
  const tools = document.querySelectorAll(".sidebar-tool");
  if (!tools.length) {
    return;
  }

  tools.forEach((tool) => {
    tool.addEventListener("click", () => {
      tools.forEach((item) => item.classList.remove("active"));
      tool.classList.add("active");
    });
  });
}

function wireQueryRunAnimation() {
  const runButton = document.getElementById("run-query-btn");
  const resultContainer = document.getElementById("query-result");
  const resultBody = document.getElementById("result-body");
  const resultMeta = resultContainer?.querySelector(".result-meta");
  const insightText = document.getElementById("insight-text");

  if (!runButton || !resultContainer || !resultBody || !resultMeta || !insightText) {
    return;
  }

  runButton.addEventListener("click", () => {
    resultContainer.classList.add("running");
    resultMeta.textContent = "Executing query";
    insightText.textContent = "Analyzing scan strategy and aggregations...";
    runButton.disabled = true;

    window.setTimeout(() => {
      const dataRows = [
        ["2026-04-07", 142, "18,420.00"],
        ["2026-04-08", 158, "21,340.50"],
        ["2026-04-09", 131, "17,890.00"],
        ["2026-04-10", 177, "24,110.25"],
        ["2026-04-11", 191, "27,905.40"],
        ["2026-04-12", 168, "22,490.00"],
        ["2026-04-13", 182, "26,331.75"]
      ];

      resultBody.innerHTML = dataRows
        .map(
          (row) =>
            `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`
        )
        .join("");

      resultBody.querySelectorAll("tr").forEach((row, index) => {
        row.style.opacity = "0";
        row.style.transform = "translateY(4px)";
        row.style.transition = "opacity 180ms ease, transform 180ms ease";

        window.setTimeout(() => {
          row.style.opacity = "1";
          row.style.transform = "translateY(0)";
        }, index * 45);
      });

      resultContainer.classList.remove("running");
      resultMeta.textContent = "✓ 7 rows in 43ms · ecommerce_demo";
      insightText.textContent = "Suggestion: add an index on orders(created_at) and keep daily aggregation in a materialized view for dashboard latency under 100ms.";
      runButton.disabled = false;
    }, RUN_RESULT_DELAY_MS);
  });
}

function wireFeatureCards() {
  const detail = document.getElementById("feature-detail");
  if (!detail) {
    return;
  }

  document.querySelectorAll(".feature-card").forEach((card) => {
    card.addEventListener("click", () => {
      document.querySelectorAll(".feature-card").forEach((item) => item.classList.remove("active"));
      card.classList.add("active");

      const key = card.getAttribute("data-feature");
      if (key && FEATURE_DETAILS[key]) {
        detail.textContent = FEATURE_DETAILS[key];
      }
    });
  });
}

function wireConnectionSimulation() {
  const connectButton = document.querySelector(".connect-preview");
  const connectionLog = document.getElementById("connection-log");
  const connectionLabel = document.getElementById("sb-connection");
  const engineLabel = document.getElementById("sb-engine");

  if (!connectButton || !connectionLog || !connectionLabel || !engineLabel) {
    return;
  }

  connectButton.addEventListener("click", () => {
    connectButton.setAttribute("disabled", "true");
    connectionLog.innerHTML = "";

    const steps = [
      "Resolving localhost:5432...",
      "TLS mode set to prefer.",
      "Authentication succeeded for postgres.",
      "Connection healthy. Notebook execution enabled."
    ];

    steps.forEach((step, index) => {
      window.setTimeout(() => {
        const line = document.createElement("li");
        line.textContent = step;
        connectionLog.appendChild(line);
      }, index * 380);
    });

    window.setTimeout(() => {
      setStatusText(connectionLabel, "● Connected · ecommerce_demo");
      setStatusText(engineLabel, "PostgreSQL 16");
      connectButton.removeAttribute("disabled");
      openFile("query");
    }, steps.length * 380 + 80);
  });
}

function formatCompactNumber(value) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return `${value}`;
}

async function hydrateMarketplaceStats() {
  const endpoint = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json;api-version=3.0-preview.1"
      },
      body: JSON.stringify({
        filters: [
          {
            criteria: [{ filterType: 7, value: "ric-v.postgres-explorer" }]
          }
        ],
        flags: 914
      })
    });

    if (!response.ok) {
      throw new Error(`Marketplace API request failed: ${response.status}`);
    }

    const data = await response.json();
    const extension = data?.results?.[0]?.extensions?.[0];
    if (!extension) {
      throw new Error("Marketplace extension data missing");
    }

    const installCount = extension.statistics?.find((item) => item.statisticName === "install")?.value ?? 0;
    const rating = extension.statistics?.find((item) => item.statisticName === "weightedRating")?.value ?? 0;
    const latestVersion = extension.versions?.[0]?.version ?? "0.0.0";

    const downloadsEl = document.getElementById("stat-downloads");
    const ratingEl = document.getElementById("stat-rating");
    const versionEl = document.getElementById("stat-version");
    const badgeEl = document.getElementById("badge-version");

    if (downloadsEl) {
      downloadsEl.textContent = formatCompactNumber(installCount);
    }
    if (ratingEl) {
      ratingEl.textContent = rating.toFixed(1);
    }
    if (versionEl) {
      versionEl.textContent = `v${latestVersion}`;
    }
    if (badgeEl) {
      badgeEl.textContent = `v${latestVersion}`;
    }
  } catch (error) {
    console.error("Failed to hydrate marketplace stats", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  wireThemeToggle();
  wireTour();
  wireActivityIcons();
  wireSidebarTools();
  wireNavigation();
  wireQueryRunAnimation();
  wireFeatureCards();
  wireConnectionSimulation();
  hydrateMarketplaceStats();
});
