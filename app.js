let books = [];
let currentLanguage = "pt";

const grid = document.getElementById("booksGrid");
const resultCount = document.getElementById("resultCount");

async function loadBooks() {
  try {
    const response = await fetch("./data/books.json");
    books = await response.json();

    renderBooks(books);
    populateCompareSelects();

  } catch (error) {
    console.error(error);

    grid.innerHTML = `
      <div style="padding:40px;color:white;">
        Erro ao carregar acervo.
      </div>
    `;
  }
}

function renderBooks(items) {

  resultCount.innerText = `${items.length} livros`;

  grid.innerHTML = items.map(book => `
    
    <article class="book-card">

      <button 
        class="book-cover-button"
        onclick="openBookModal('${book.id}')"
      >

        <img 
          src="${book.cover}" 
          alt="${book.title}"
          class="book-cover"
        />

      </button>

      <div class="book-info">

        <h3>${book.title}</h3>

        <p class="book-meta">
          ${book.author} — ${book.year}
        </p>

        <div class="book-tags">
          ${(book.tags || []).map(tag => `
            <span class="tag">${tag}</span>
          `).join("")}
        </div>

      </div>

    </article>

  `).join("");
}

function openBookModal(bookId) {

  const book = books.find(b => b.id === bookId);

  if (!book) return;

  const modal = document.createElement("div");

  modal.className = "book-modal";

  modal.innerHTML = `

    <div class="book-modal-content">

      <button class="close-modal" onclick="closeModal()">
        ×
      </button>

      <div class="modal-grid">

        <div class="modal-cover">
          <img src="${book.cover}" alt="${book.title}" />
        </div>

        <div class="modal-info">

          <h2>${book.title}</h2>

          <p class="modal-author">
            ${book.author} — ${book.year}
          </p>

          <div class="modal-tags">
            ${(book.tags || []).map(tag => `
              <span class="tag">${tag}</span>
            `).join("")}
          </div>

          <div class="modal-actions">

            <a 
              href="${book.pdf}" 
              target="_blank"
              class="modal-button"
            >
              ABRIR LIVRO
            </a>

            <button 
              class="modal-button"
              onclick="openCompare('${book.id}')"
            >
              COMPARAR CAPAS
            </button>

          </div>

          <div class="modal-context">

            <div class="modal-context-title">
              CONTEXTO
            </div>

            <p>
              ${book.description || ""}
            </p>

          </div>

        </div>

      </div>

    </div>

  `;

  document.body.appendChild(modal);

  document.body.style.overflow = "hidden";
}

function closeModal() {

  const modal = document.querySelector(".book-modal");

  if (modal) {
    modal.remove();
  }

  document.body.style.overflow = "auto";
}

function populateCompareSelects() {

  const left = document.getElementById("compareLeft");
  const right = document.getElementById("compareRight");

  if (!left || !right) return;

  const options = books.map(book => `
    <option value="${book.id}">
      ${book.title}
    </option>
  `).join("");

  left.innerHTML = options;
  right.innerHTML = options;

  if (books[0]) left.value = books[0].id;
  if (books[1]) right.value = books[1].id;

  updateCompare();
}

function updateCompare() {

  const leftId = document.getElementById("compareLeft")?.value;
  const rightId = document.getElementById("compareRight")?.value;

  const leftBook = books.find(b => b.id === leftId);
  const rightBook = books.find(b => b.id === rightId);

  const leftPreview = document.getElementById("comparePreviewLeft");
  const rightPreview = document.getElementById("comparePreviewRight");

  if (leftBook && leftPreview) {
    leftPreview.innerHTML = `
      <img src="${leftBook.cover}" alt="${leftBook.title}">
    `;
  }

  if (rightBook && rightPreview) {
    rightPreview.innerHTML = `
      <img src="${rightBook.cover}" alt="${rightBook.title}">
    `;
  }
}

function openCompare(bookId) {

  const compareSection = document.getElementById("compare");

  if (!compareSection) return;

  compareSection.scrollIntoView({
    behavior: "smooth"
  });

  const left = document.getElementById("compareLeft");

  if (left && bookId) {
    left.value = bookId;
  }

  updateCompare();

  closeModal();
}

document.addEventListener("change", (event) => {

  if (
    event.target.id === "compareLeft" ||
    event.target.id === "compareRight"
  ) {
    updateCompare();
  }

});

loadBooks();
