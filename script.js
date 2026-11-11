/* ==========================================================
   Population Specialty Group website — script.js
   - Hash-based page routing (#home, #about, #about/board, ...)
   - Mobile menu toggle
   - Full-text site search with highlighted snippets
   ========================================================== */

const DEFAULT_PAGE = "home";

/* ---------- Helpers ---------- */

function getPages() {
  return Array.from(document.querySelectorAll("section.page"));
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ---------- Routing ---------- */

function showPage(pageId) {
  const pages = getPages();
  const target = document.getElementById(pageId) ? pageId : DEFAULT_PAGE;

  pages.forEach((page) => {
    page.hidden = page.id !== target;
  });

  setActiveNav(target);
  const page = document.getElementById(target);
  document.title = `${page.dataset.title || "Home"} | Population Specialty Group`;
  window.scrollTo(0, 0);
}

function setActiveNav(pageId) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const key = link.dataset.nav;
    // Highlight exact match, and the parent "About" for its sub-pages
    const active = key === pageId || (key === "about" && pageId.startsWith("about/"));
    link.classList.toggle("active", active);
    if (key === pageId) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function handleRoute() {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));

  if (hash.startsWith("search=")) {
    const query = hash.slice("search=".length);
    document.getElementById("searchInput").value = query;
    runSearch(query);
    return;
  }

  showPage(hash || DEFAULT_PAGE);
  closeMenu();
}

/* ---------- Mobile menu ---------- */

function toggleMenu() {
  const nav = document.getElementById("mainNav");
  const btn = document.getElementById("menuToggle");
  const open = nav.classList.toggle("open");
  btn.setAttribute("aria-expanded", String(open));
}

function closeMenu() {
  document.getElementById("mainNav").classList.remove("open");
  document.getElementById("menuToggle").setAttribute("aria-expanded", "false");
}

/* ---------- Search ---------- */

let searchIndex = [];

// Build the index once from the page content already in the HTML
function buildSearchIndex() {
  searchIndex = getPages()
    .filter((page) => page.dataset.searchable !== "false")
    .map((page) => ({
      id: page.id,
      title: page.dataset.title || page.id,
      text: page.textContent.replace(/\s+/g, " ").trim()
    }));
}

function makeSnippet(text, terms, radius = 80) {
  const lower = text.toLowerCase();
  let pos = -1;
  for (const term of terms) {
    pos = lower.indexOf(term);
    if (pos !== -1) break;
  }
  const start = Math.max(0, pos - radius);
  const end = Math.min(text.length, pos + radius);
  let snippet = escapeHTML(text.slice(start, end));

  terms.forEach((term) => {
    const re = new RegExp(`(${escapeRegExp(escapeHTML(term))})`, "gi");
    snippet = snippet.replace(re, "<mark>$1</mark>");
  });

  return (start > 0 ? "…" : "") + snippet + (end < text.length ? "…" : "");
}

function searchSite(query) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  return searchIndex
    .map((page) => {
      const lower = page.text.toLowerCase();
      // Every term must appear on the page
      if (!terms.every((t) => lower.includes(t))) return null;
      // Score: total occurrences, with a bonus for title matches
      let score = 0;
      terms.forEach((t) => {
        score += lower.split(t).length - 1;
        if (page.title.toLowerCase().includes(t)) score += 10;
      });
      return { ...page, score, snippet: makeSnippet(page.text, terms) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

function runSearch(query) {
  const trimmed = query.trim();
  const results = searchSite(trimmed);
  const list = document.getElementById("resultsList");
  const summary = document.getElementById("searchSummary");

  summary.textContent = trimmed
    ? `${results.length} result${results.length === 1 ? "" : "s"} for “${trimmed}”`
    : "Please enter a search term.";

  list.innerHTML = results
    .map((r) => `
      <li>
        <a href="#${encodeURI(r.id)}"><strong>${escapeHTML(r.title)}</strong></a>
        <p>${r.snippet}</p>
      </li>`)
    .join("");

  showPage("search-results");
}

function onSearchSubmit(event) {
  event.preventDefault();
  const query = document.getElementById("searchInput").value.trim();
  if (!query) return;
  // Put the search in the URL so results can be bookmarked / use Back button
  window.location.hash = "search=" + encodeURIComponent(query);
}

/* ---------- Init ---------- */

function init() {
  document.getElementById("year").textContent = new Date().getFullYear();
  buildSearchIndex();

  document.getElementById("menuToggle").addEventListener("click", toggleMenu);
  document.getElementById("searchForm").addEventListener("submit", onSearchSubmit);
  window.addEventListener("hashchange", handleRoute);

  handleRoute();
}

document.addEventListener("DOMContentLoaded", init);
