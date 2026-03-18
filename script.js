const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const welcomeState = document.getElementById("welcomeState");
const loadingState = document.getElementById("loadingState");
const resultsState = document.getElementById("resultsState");
const emptyState = document.getElementById("emptyState");
const errorState = document.getElementById("errorState");
const moviesGrid = document.getElementById("moviesGrid");
const loadingText = document.getElementById("loadingText");
const resultsTitle = document.getElementById("resultsTitle");
const newSearchBtn = document.getElementById("newSearchBtn");
const errorText = document.getElementById("errorText");
const showAllMoviesBtn = document.getElementById("showAllMoviesBtn");

const moviesDropdown = document.getElementById("moviesDropdown");
let allMovieTitles = [];
let filteredTitles = [];
let selectedIndex = -1;

const moviesModal = document.getElementById("moviesModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalClose = document.getElementById("modalClose");
const modalSearchInput = document.getElementById("modalSearchInput");
const modalMoviesGrid = document.getElementById("modalMoviesGrid");
const modalMoviesCount = document.getElementById("modalMoviesCount");
let allMovies = [];

let currentQuery = "";

resetToWelcome();
loadAllMovieTitles();
loadAllMovies();

searchButton.addEventListener("click", performSearch);

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    performSearch();
  }
});

searchInput.addEventListener("input", (e) => {
  const value = e.target.value.toLowerCase();

  if (value.length < 2) {
    hideDropdown();
    return;
  }

  const matches = allMovieTitles.filter((title) =>
    title.toLowerCase().includes(value),
  );

  selectedIndex = -1;
  showDropdown(matches);
});

moviesDropdown.addEventListener("click", (e) => {
  const item = e.target.closest(".movies-dropdown-item");
  if (item) {
    const index = parseInt(item.dataset.index);
    searchInput.value = filteredTitles[index];
    hideDropdown();
    performSearch();
  }
});

document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !moviesDropdown.contains(e.target)) {
    hideDropdown();
  }
});

newSearchBtn.addEventListener("click", resetToWelcome);

async function loadAllMovieTitles() {
  try {
    const response = await fetch("/api/getAllMovies.php");
    const data = await response.json();
    if (data.success) {
      allMovieTitles = data.movies.map((m) => m.movie_title);
    } else {
      console.error("Ошибка загрузки фильмов:", data.error);
    }
  } catch (error) {
    console.error("Ошибка соединения при загрузке фильмов:", error);
  }
}

async function loadAllMovies() {
  try {
    const response = await fetch("/api/getAllMovies.php");
    const data = await response.json();
    if (data.success) {
      allMovies = data.movies;
    }
  } catch (error) {
    console.error("Ошибка загрузки фильмов:", error);
  }
}

function showDropdown(matches) {
  if (matches.length === 0) {
    moviesDropdown.classList.remove("show");
    return;
  }

  filteredTitles = matches.slice(0, 10);

  moviesDropdown.innerHTML = filteredTitles
    .map(
      (title, index) => `
      <div class="movies-dropdown-item ${index === selectedIndex ? "selected" : ""}" data-index="${index}">
        ${title}
      </div>
    `,
    )
    .join("");

  moviesDropdown.classList.add("show");
}

function hideDropdown() {
  moviesDropdown.classList.remove("show");
  selectedIndex = -1;
}

function highlightSelected() {
  const items = document.querySelectorAll(".movies-dropdown-item");
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add("selected");
      item.scrollIntoView({ block: "nearest" });
    } else {
      item.classList.remove("selected");
    }
  });
}

async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    showError("Введите запрос");
    return;
  }

  currentQuery = query;
  hideDropdown();

  hideAllStates();
  loadingState.style.display = "flex";
  loadingText.textContent = "Нейросеть ищет фильм...";

  try {
    const response = await fetch("/api/search.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: query }),
    });

    const data = await response.json();

    if (!data.success) {
      showError(data.error || "Ошибка поиска");
      return;
    }

    if (data.movies && data.movies.length > 0) {
      displayMovies(data.movies);
    } else {
      if (data.reply) {
        displayTextResponse(data.reply);
      } else {
        showEmpty();
      }
    }
  } catch (error) {
    console.error("Search error:", error);
    showError("Ошибка соединения с сервером");
  }
}

function displayMovies(movies) {
  hideAllStates();
  resultsState.style.display = "block";

  resultsTitle.textContent = `Найдено фильмов: ${movies.length}`;

  moviesGrid.innerHTML = movies
    .map(
      (movie) => `
        <a href="#" class="movie-card" onclick="return false;">
            <div class="movie-poster">
                ${
                  movie.movie_poster_url
                    ? `<img src="${movie.movie_poster_url}" alt="${movie.movie_title}" onerror="this.src='https://via.placeholder.com/300x450?text=No+poster'">`
                    : `<div class="placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="2" y="2" width="20" height="20" rx="2"/>
                            <circle cx="12" cy="10" r="2"/>
                            <path d="M22 16L18 12L13 17L10 14L2 22"/>
                        </svg>
                       </div>`
                }
            </div>
            <div class="movie-title">${movie.movie_title}</div>
        </a>
    `,
    )
    .join("");
}

function displayTextResponse(text) {
  hideAllStates();
  resultsState.style.display = "block";

  resultsTitle.textContent = "Результат поиска";

  let cleanText = text
    .replace("[В_БАЗЕ]", "")
    .replace("[НЕТ_В_БАЗЕ]", "")
    .trim();

  moviesGrid.innerHTML = `
    <div style="grid-column: 1 / -1; padding: 30px; background: #f9f9f9; border-radius: 12px; text-align: center;">
      <div style="font-size: 16px; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        ${cleanText.replace(/\n/g, "<br>")}
      </div>
    </div>
  `;
}

function resetToWelcome() {
  hideAllStates();
  welcomeState.style.display = "flex";
  searchInput.value = "";
  searchInput.focus();
  hideDropdown();
}

function showEmpty() {
  hideAllStates();
  emptyState.style.display = "flex";
}

function showError(message) {
  hideAllStates();
  errorState.style.display = "flex";
  errorText.textContent = message;
}

function hideAllStates() {
  welcomeState.style.display = "none";
  loadingState.style.display = "none";
  resultsState.style.display = "none";
  emptyState.style.display = "none";
  errorState.style.display = "none";
}

showAllMoviesBtn.addEventListener("click", openMoviesModal);

function openMoviesModal() {
  if (allMovies.length === 0) {
    loadAllMovies().then(() => {
      renderModalMovies(allMovies);
      moviesModal.classList.add("show");
    });
  } else {
    renderModalMovies(allMovies);
    moviesModal.classList.add("show");
  }
}

function closeMoviesModal() {
  moviesModal.classList.remove("show");
  modalSearchInput.value = "";
}

modalBackdrop.addEventListener("click", closeMoviesModal);
modalClose.addEventListener("click", closeMoviesModal);

modalSearchInput.addEventListener("input", (e) => {
  const value = e.target.value.toLowerCase();
  const filtered = allMovies.filter((movie) =>
    movie.movie_title.toLowerCase().includes(value),
  );
  renderModalMovies(filtered);
});

function renderModalMovies(movies) {
  modalMoviesCount.textContent = movies.length;

  modalMoviesGrid.innerHTML = movies
    .map(
      (movie) => `
        <div class="modal-movie-card">
            <div class="modal-movie-poster">
                ${
                  movie.movie_poster_url
                    ? `<img src="${movie.movie_poster_url}" alt="${movie.movie_title}" onerror="this.src='https://via.placeholder.com/300x450?text=No+poster'">`
                    : `<div class="placeholder">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <rect x="2" y="2" width="20" height="20" rx="2"/>
                            <circle cx="12" cy="10" r="2"/>
                            <path d="M22 16L18 12L13 17L10 14L2 22"/>
                        </svg>
                       </div>`
                }
            </div>
            <div class="modal-movie-title">${movie.movie_title}</div>
        </div>
    `,
    )
    .join("");
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && moviesModal.classList.contains("show")) {
    closeMoviesModal();
  }
});
