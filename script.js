const movies = [
    { title: "Inception", img: "images/inception.jpg", category: "Bilim Kurgu" },
    { title: "The Dark Knight", img: "images/batman.jfif", category: "Aksiyon" },
    { title: "Matrix", img: "images/matrix.jpg", category: "Bilim Kurgu" },
    { title: "Interstellar", img: "images/interstellar.jpg", category: "Bilim Kurgu" },
    { title: "Avatar", img: "images/Avatar.jpg", category: "Dram" },
    { title: "Spederman", img: "images/inception.jpg", category: "Aksiyon" },
    { title: "Spederman2", img: "images/batman.jfif", category: "Aksiyon" },
    { title: "Spederman3", img: "images/matrix.jpg", category: "Aksiyon" },
    { title: "Amenzing Spederman", img: "images/interstellar.jpg", category: "Aksiyon" },
    { title: "Amenzing Spederman2", img: "images/Avatar.jpg", category: "Aksiyon" }
];

const movieGrid = document.getElementById("movieGrid");
const playerSection = document.getElementById("playerSection");
const mainVideo = document.getElementById("mainVideo");
const playingTitle = document.getElementById("playingTitle");
const sectionTitle = document.getElementById("sectionTitle");
const searchBar = document.getElementById("searchBar");

function filterByCategory(category) {
    sectionTitle.innerText = category === 'Hepsi' ? "Popüler Filmler" : category + " Filmleri";
    const filtered = category === 'Hepsi' ? movies : movies.filter(m => m.category === category);
    renderMovies(filtered);
    playerSection.style.display = "none";
    movieGrid.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderMovies(data) {
    movieGrid.innerHTML = "";
    data.forEach(movie => {
        const card = document.createElement("div");
        card.className = "movie-card";
        card.innerHTML = `<img src="${movie.img}" alt="${movie.title}"><div class="movie-info">${movie.title}</div>`;
        card.onclick = () => {
            playerSection.style.display = "block";
            playingTitle.innerText = "Şu an İzleniyor: " + movie.title;
            playerSection.scrollIntoView({ behavior: "smooth" });
            mainVideo.play();
        };
        movieGrid.appendChild(card);
    });
}

searchBar.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    const searched = movies.filter(m => m.title.toLowerCase().includes(term));
    renderMovies(searched);
});

renderMovies(movies);