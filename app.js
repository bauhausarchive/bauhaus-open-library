const state = {
  books: [],
  lang: localStorage.getItem("bol-lang") || "en",
  filters: {
    author: new Set(),
    year: new Set(),
    colors: new Set(),
    composition: new Set(),
    typography: new Set(),
    school: new Set()
  },
  search: ""
};

const filterKeys = ["author", "year", "colors", "composition", "typography", "school"];

const els = {
  bookGrid: document.querySelector("#bookGrid"),
  filterGroups: document.querySelector("#filterGroups"),
  searchInput: document.querySelector("#searchInput"),
  resultCount: document.querySelector("#resultCount"),
  clearFilters: document.querySelector("#clearFilters"),
  bookDialog: document.querySelector("#bookDialog"),
  bookDetail: document.querySelector("#bookDetail"),
  readerDialog: document.querySelector("#readerDialog"),
  readerTitle: document.querySelector("#readerTitle"),
  readerMeta: document.querySelector("#readerMeta"),
  pdfFrame: document.querySelector("#pdfFrame"),
  compareDialog: document.querySelector("#compareDialog"),
  compareA: document.querySelector("#compareA"),
  compareB: document.querySelector("#compareB"),
  compareView: document.querySelector("#compareView")
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    document.documentElement.dataset.lang = state.lang;
    bindStaticEvents();
    applyTranslations();

    const response = await fetch(`data/books.json?v=${Date.now()}`);
    state.books = await response.json();

    buildFilters();
    renderBooks();
    setupCompareSelectors();
  } catch (error) {
    console.error(error);
    els.bookGrid.innerHTML = `
      <p style="font-size:20px">
        Erro ao carregar o acervo.<br>
        Verifique se o arquivo data/books.json está válido.
      </p>
    `;
  }
}

function bindStaticEvents() {
  document.querySelectorAll("[data-scroll]").forEach(button => {
    button.addEventListener("click", () => {
      const target = document.querySelector(button.dataset.scroll);
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  });

  document.querySelectorAll(".lang").forEach(button => {
    button.classList.toggle("active", button.dataset.lang === state.lang);

    button.addEventListener("click", () => {
      state.lang = button.dataset.lang;
      localStorage.setItem("bol-lang", state.lang);

      document.querySelectorAll(".lang").forEach(b => {
        b.classList.toggle("active", b.dataset.lang === state.lang);
      });

      applyTranslations();
      buildFilters();
      renderBooks();
      renderCompare();
    });
  });

  els.searchInput?.addEventListener("input", event => {
    state.search = event.target.value.trim().toLowerCase();
    renderBooks();
  });

  els.clearFilters?.addEventListener("click", () => {
    filterKeys.forEach(key => state.filters[key].clear());
    state.search = "";
    els.searchInput.value = "";
    buildFilters();
    renderBooks();
  });

  document.querySelectorAll("[data-close-dialog]").forEach(button => {
    button.addEventListener("click", () => els.bookDialog.close());
  });

  document.querySelectorAll("[data-close-reader]").forEach(button => {
    button.addEventListener("click", () => {
      els.pdfFrame.src = "";
      els.readerDialog.close();
    });
  });

  document.querySelectorAll("[data-close-compare]").forEach(button => {
    button.addEventListener("click", () => els.compareDialog.close());
  });

  document.querySelector("#openCompare")?.addEventListener("click", () => {
    els.compareDialog.showModal();
    renderCompare();
  });

  els.compareA?.addEventListener("change", renderCompare);
  els.compareB?.addEventListener("change", renderCompare);
}

function translate(path) {
  return path.split(".").reduce((obj, key) => obj?.[key], I18N[state.lang]) || path;
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(node => {
    node.textContent = translate(node.dataset.i18n);
  });

  if (els.searchInput) {
    els.searchInput.placeholder =
      state.lang === "pt"
        ? "Título, autor, tema..."
        : state.lang === "es"
        ? "Título, autor, tema..."
        : "Title, author, topic...";
  }
}

function buildFilters() {
  els.filterGroups.innerHTML = "";

  filterKeys.forEach(key => {
    const values = uniqueValues(key);

    const group = document.createElement("div");
    group.className = "filter-group";

    group.innerHTML = `
      <h3>${translate(`filters.${key}`)}</h3>
      <div class="filter-options"></div>
    `;

    values.forEach(value => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip";
      chip.textContent = value;

      chip.classList.toggle("active", state.filters[key].has(value));

      chip.addEventListener("click", () => {
        state.filters[key].has(value)
          ? state.filters[key].delete(value)
          : state.filters[key].add(value);

        buildFilters();
        renderBooks();
      });

      group.querySelector(".filter-options").appendChild(chip);
    });

    els.filterGroups.appendChild(group);
  });
}

function uniqueValues(key) {
  const values = state.books.flatMap(book => {
    const value = book[key];
    if (Array.isArray(value)) return value;
    if (value) return [value];
    return [];
  });

  return [...new Set(values)].sort();
}

function getFilteredBooks() {
  return state.books.filter(book => {
    const searchable = [
      book.title,
      book.author,
      book.year,
      ...(book.colors || []),
      ...(book.composition || []),
      ...(book.typography || []),
      ...(book.school ? [book.school] : [])
    ].join(" ").toLowerCase();

    const matchesSearch = !state.search || searchable.includes(state.search);

    const matchesFilters = filterKeys.every(key => {
      if (state.filters[key].size === 0) return true;

      const values = Array.isArray(book[key])
        ? book[key]
        : book[key]
        ? [book[key]]
        : [];

      return values.some(value => state.filters[key].has(value));
    });

    return matchesSearch && matchesFilters;
  });
}

function renderBooks() {
  const books = getFilteredBooks();

  els.bookGrid.innerHTML = "";
  els.resultCount.textContent = `${books.length} ${translate("archive.results")}`;

  books.forEach(book => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "book-card";

    card.innerHTML = `
      <div>
        ${coverMarkup(book)}

        <div>
          <h3>${book.title}</h3>
          <p>${book.author} — ${book.year}</p>
        </div>
      </div>

      <div>
        ${(book.colors || [])
          .slice(0, 3)
          .map(tag => `<span class="tag">${tag}</span>`)
          .join("")}
      </div>
    `;

    card.addEventListener("click", () => openBook(book.id));
    els.bookGrid.appendChild(card);
  });
}

function openBook(id) {
  const book = state.books.find(item => String(item.id) === String(id));
  if (!book) return;

  const description =
    book.description?.[state.lang] ||
    book.description?.en ||
    book.context?.[state.lang] ||
    book.context?.en ||
    "";

  els.bookDetail.innerHTML = `
    <div class="detail-grid">
      <div class="detail-cover">
        ${coverMarkup(book)}
      </div>

      <div class="detail-info">
        <h2>${book.title}</h2>

        <div class="detail-meta">
          ${book.author} — ${book.year}
        </div>

        <div class="tags">
          ${[
            ...(Array.isArray(book.school) ? book.school : [book.school]),
            ...(book.composition || []),
            ...(book.typography || [])
          ]
            .filter(Boolean)
            .map(tag => `<span class="tag">${tag}</span>`)
            .join("")}
        </div>

        <div class="detail-actions">
          <button class="primary" type="button" data-read="${book.id}">
            ${translate("detail.read")}
          </button>

          <button type="button" data-compare="${book.id}">
            ${translate("detail.compare")}
          </button>
        </div>

        <p class="eyebrow">${translate("detail.context")}</p>

        <p class="detail-context">
          ${description}
        </p>
      </div>
    </div>
  `;

  els.bookDetail.querySelector("[data-read]")?.addEventListener("click", event => {
    event.stopPropagation();
    openReader(book.id);
  });

  els.bookDetail.querySelector("[data-compare]")?.addEventListener("click", event => {
    event.stopPropagation();

    els.bookDialog.close();
    els.compareA.value = book.id;
    els.compareDialog.showModal();
    renderCompare();
  });

  els.bookDialog.showModal();
}

function openReader(id) {
  const book = state.books.find(item => String(item.id) === String(id));
  if (!book?.pdf) {
    alert(translate("detail.pdfMissing"));
    return;
  }

  els.readerTitle.textContent = book.title;
  els.readerMeta.textContent = `${book.author} — ${book.year}`;
  els.pdfFrame.src = `${book.pdf}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;

  els.readerDialog.showModal();
}

function setupCompareSelectors() {
  const options = state.books
    .map(book => `
      <option value="${book.id}">
        ${book.title}
      </option>
    `)
    .join("");

  els.compareA.innerHTML = options;
  els.compareB.innerHTML = options;

  if (state.books[1]) {
    els.compareB.value = state.books[1].id;
  }
}

function renderCompare() {
  if (!state.books.length || !els.compareView) return;

  const a =
    state.books.find(book => String(book.id) === String(els.compareA.value)) ||
    state.books[0];

  const b =
    state.books.find(book => String(book.id) === String(els.compareB.value)) ||
    state.books[1] ||
    state.books[0];

  els.compareView.innerHTML = [a, b]
    .map(book => `
      <article class="compare-card">
        ${coverMarkup(book)}

        <h3>${book.title}</h3>

        <div class="compare-table">
          ${compareRow("author", book.author)}
          ${compareRow("year", book.year)}
          ${compareRow("colors", book.colors)}
          ${compareRow("composition", book.composition)}
          ${compareRow("typography", book.typography)}
          ${compareRow("school", book.school)}
        </div>
      </article>
    `)
    .join("");
}

function compareRow(label, value) {
  const normalized = Array.isArray(value) ? value.join(", ") : value;

  return `
    <div class="compare-row">
      <strong>${translate(`compare.${label}`)}</strong>
      <span>${normalized || "—"}</span>
    </div>
  `;
}

function coverMarkup(book) {
  const initials = (book.title || "B")
    .split(" ")
    .map(word => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (book.cover) {
    return `
      <div class="cover-wrap">
        <img
          src="${book.cover}?v=10"
          alt="${book.title}"
          loading="lazy"
          onerror="this.parentElement.innerHTML='<div class=&quot;cover-placeholder&quot;>${initials}</div>'"
        />
      </div>
    `;
  }

  return `
    <div class="cover-placeholder">
      ${initials}
    </div>
  `;
}
