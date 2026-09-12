// node-comfort documentation: theme, search, copy buttons, navigation.
(() => {
  "use strict";

  const root = document.documentElement;
  const base = document.querySelector('meta[name="nc-root"]')?.content ?? "";
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const store = {
    get: (key) => {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* storage can be unavailable */
      }
    },
  };

  // theme
  $("#theme-toggle")?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    store.set("nc-theme", next);
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    if (!store.get("nc-theme")) root.dataset.theme = event.matches ? "dark" : "light";
  });

  // copy buttons
  const copyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const checkIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  const copy = async (button, text) => {
    try {
      await navigator.clipboard.writeText(text);
      button.innerHTML = checkIcon;
      button.classList.add("done");
      setTimeout(() => {
        button.innerHTML = copyIcon;
        button.classList.remove("done");
      }, 1500);
    } catch {
      /* clipboard access denied */
    }
  };
  for (const block of $$(".code")) {
    const button = document.createElement("button");
    button.className = "copy";
    button.type = "button";
    button.title = "Copy";
    button.setAttribute("aria-label", "Copy code");
    button.innerHTML = copyIcon;
    button.addEventListener("click", () => copy(button, $("code", block).innerText));
    block.append(button);
  }
  for (const button of $$("[data-copy]")) button.addEventListener("click", () => copy(button, button.dataset.copy));

  // landing page tabs
  for (const tabs of $$("[data-tabs]")) {
    const buttons = $$("button", tabs);
    const panels = $$("[data-panel]", tabs.closest(".window"));
    buttons.forEach((button, index) =>
      button.addEventListener("click", () => {
        buttons.forEach((b, i) => b.setAttribute("aria-selected", String(i === index)));
        panels.forEach((p, i) => (p.hidden = i !== index));
      }),
    );
  }

  // mobile menu
  const sidebar = $(".sidebar");
  $("#menu-toggle")?.addEventListener("click", () => sidebar?.classList.toggle("open"));
  document.addEventListener("click", (event) => {
    if (sidebar?.classList.contains("open") && !sidebar.contains(event.target) && !event.target.closest("#menu-toggle")) sidebar.classList.remove("open");
  });
  $(".sidebar a.active")?.scrollIntoView({ block: "center" });

  // table of contents
  const tocLinks = $$(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(tocLinks.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id);
        const first = [...byId.keys()].find((id) => visible.has(id));
        if (!first) return;
        tocLinks.forEach((a) => a.classList.remove("active"));
        byId.get(first)?.classList.add("active");
      },
      { rootMargin: "-70px 0px -70% 0px" },
    );
    for (const id of byId.keys()) {
      const heading = document.getElementById(id);
      if (heading) observer.observe(heading);
    }
  }

  // search
  const backdrop = $(".search-backdrop");
  const dialog = $(".search-dialog");
  const input = $(".search-dialog input");
  const list = $(".search-results");
  let index = null;
  let results = [];
  let selected = 0;

  const loadIndex = () =>
    new Promise((resolve) => {
      if (index) return resolve(index);
      const script = document.createElement("script");
      script.src = `${base}assets/search-index.js`;
      script.onload = () => resolve((index = window.__NC_SEARCH__ ?? []));
      script.onerror = () => resolve((index = []));
      document.head.append(script);
    });

  const escapeHTML = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const mark = (text, query) => {
    const i = text.toLowerCase().indexOf(query);
    if (i < 0 || !query) return escapeHTML(text);
    return `${escapeHTML(text.slice(0, i))}<mark>${escapeHTML(text.slice(i, i + query.length))}</mark>${escapeHTML(text.slice(i + query.length))}`;
  };

  const score = (entry, query, words) => {
    const title = entry.t.toLowerCase();
    const name = title.split(".").pop();
    let s = 0;
    if (name === query || title === query) s += 100;
    else if (name.startsWith(query)) s += 60;
    else if (title.includes(query)) s += 35;
    const haystack = `${title} ${(entry.s ?? "").toLowerCase()} ${(entry.k ?? "").toLowerCase()}`;
    for (const word of words) {
      if (!haystack.includes(word)) return 0;
      s += 5;
    }
    if (entry.k === "Guide") s += 8;
    return s;
  };

  const renderResults = () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      list.innerHTML = '<li class="search-empty">Search guides, functions and types</li>';
      results = [];
      return;
    }
    const words = query.split(/\s+/);
    results = (index ?? [])
      .map((entry) => ({ entry, s: score(entry, query, words) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s || a.entry.t.length - b.entry.t.length)
      .slice(0, 40)
      .map((r) => r.entry);
    selected = 0;
    if (!results.length) {
      list.innerHTML = `<li class="search-empty">No results for “${escapeHTML(input.value)}”</li>`;
      return;
    }
    list.innerHTML = results
      .map((r, i) => {
        const title = r.k === "Guide" || r.k === "Section" ? `<span>${mark(r.t, query)}</span>` : `<code>${mark(r.t, query)}</code>`;
        return `<li${i === 0 ? ' class="selected"' : ""}><a href="${base}${r.u}"><span class="title">${title}<span class="kind">${escapeHTML(r.k)}</span></span>${r.s ? `<span class="snippet">${escapeHTML(r.s)}</span>` : ""}</a></li>`;
      })
      .join("");
  };

  const select = (i) => {
    const items = $$("li", list);
    if (!items.length) return;
    selected = (i + items.length) % items.length;
    items.forEach((item, k) => item.classList.toggle("selected", k === selected));
    items[selected].scrollIntoView({ block: "nearest" });
  };

  const openSearch = async () => {
    backdrop.classList.add("open");
    dialog.classList.add("open");
    input.focus();
    input.select();
    await loadIndex();
    renderResults();
  };
  const closeSearch = () => {
    backdrop.classList.remove("open");
    dialog.classList.remove("open");
  };

  $$(".search-button").forEach((b) => b.addEventListener("click", openSearch));
  backdrop?.addEventListener("click", closeSearch);
  input?.addEventListener("input", renderResults);
  input?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      select(selected + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      select(selected - 1);
    } else if (event.key === "Enter") {
      const link = $$("li a", list)[selected];
      if (link) location.href = link.href;
    }
  });
  document.addEventListener("keydown", (event) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "") || document.activeElement?.isContentEditable;
    if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
      event.preventDefault();
      dialog.classList.contains("open") ? closeSearch() : openSearch();
    } else if (event.key === "Escape" && dialog?.classList.contains("open")) closeSearch();
  });
  if (/Mac|iPhone|iPad/.test(navigator.platform)) $$(".search-button kbd").forEach((k) => (k.textContent = "⌘K"));
})();
