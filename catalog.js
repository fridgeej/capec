// -----------------------
// Получение основных элементов
// -----------------------
const catalog = document.getElementById("catalog");
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const categorySelect = document.getElementById("category");
const minInput = document.getElementById("minPrice");
const maxInput = document.getElementById("maxPrice");

const API_URL_CATALOG = "http://localhost:3000/services";
const API_URL_CART = "http://localhost:3000/cart";
const API_URL_FAVOURITES = "http://localhost:3000/favourites";

let allData = [];

// -----------------------
// Пользовательский профиль
// -----------------------
function setupUserProfile() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const userProfile = document.getElementById("userProfile");

  if (currentUser) {
    // Если пользователь авторизован, показываем его профиль с кнопкой выхода
    userProfile.innerHTML = `
      <img src="синдзи.jpeg" alt="Профиль" id="profileImage" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
      <span id="userName">${currentUser.name}</span>
      <button onclick="logout()" style="background-color: #FF4D01; border: none; color: white; padding: 8px 16px; border-radius:6px; cursor:pointer;">Выйти</button>
    `;

    // Если пользователь админ, добавляем кнопку админ-панели
    if (currentUser.role === "admin") {
      const adminLink = document.createElement("a");
      adminLink.href = "admin.html";
      adminLink.textContent = "🔑 Админ-панель";
      adminLink.style.display = "inline-block";
      adminLink.style.marginLeft = "10px";
      adminLink.style.padding = "8px";
      adminLink.style.background = "black";
      adminLink.style.color = "white";
      adminLink.style.borderRadius = "5px";
      userProfile.appendChild(adminLink);
    }
  } else {
    // Если пользователь не авторизован, показываем ссылки для входа и регистрации
    userProfile.innerHTML = `
      <a href="login.html" style="color: white; margin-right: 10px;">Войти</a>
      <a href="registration.html" style="color: white;">Регистрация</a>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupUserProfile();
});

// -----------------------
// Загрузка и отображение каталога
// -----------------------
async function loadAllData() {
  try {
    const res = await fetch(API_URL_CATALOG);
    if (!res.ok) throw new Error("Ошибка при загрузке каталога");

    allData = await res.json();
    updateCategories();
    renderCatalog(allData);
    renderSlider(allData); // Динамически формируем слайдер на основе всех данных
    initSlider();          // Инициализируем слайдер
  } catch (error) {
    catalog.innerHTML = `<p>Произошла ошибка: ${error.message}</p>`;
  }
}

function renderCatalog(data) {
  if (data.length === 0) {
    catalog.innerHTML = "<p>Товары не найдены по заданным критериям.</p>";
    return;
  }
  catalog.innerHTML = data
    .map(item => `
    <article class="card">
      <img src="${item.image}" alt="${item.title}">
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <strong>${item.price} ₽</strong>
      <div class="actions">
        <button onclick='addToFavourites(${JSON.stringify(item)})'>❤️ В избранное</button>
        <button onclick='addToCart(${JSON.stringify(item)})'>🛒 В корзину</button>
        <a href="review.html?serviceId=${item.id}">💬 Отзывы</a>
      </div>
    </article>
  `).join("");
}

function buildQuery() {
  const query = searchInput.value.trim().toLowerCase();
  const sort = sortSelect.value;
  const category = categorySelect.value;

  const minVal = minInput.value.trim();
  const maxVal = maxInput.value.trim();
  const min = minVal === "" ? null : Number(minVal);
  const max = maxVal === "" ? null : Number(maxVal);

  let filteredData = allData.filter(item =>
    item.title.toLowerCase().includes(query) &&
    (!category || item.category === category) &&
    (min === null || Number(item.price) >= min) &&
    (max === null || Number(item.price) <= max)
  );

  if (sort) {
    filteredData.sort((a, b) => a[sort] > b[sort] ? 1 : -1);
  }

  renderCatalog(filteredData);
}

function updateCategories() {
  const categories = new Set(allData.map(item => item.category));
  categorySelect.innerHTML = `<option value="">Все категории</option>` +
    [...categories].map(cat => `<option value="${cat}">${cat}</option>`).join("");
}

// -----------------------
// Добавление в избранное и в корзину
// -----------------------
async function addToFavourites(item) {
  try {
    const currentUser = JSON.parse(localStorage.getItem("currentUser")) || { id: "guest" };
    const favItem = { ...item, userId: currentUser.id };

    const postRes = await fetch(API_URL_FAVOURITES, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(favItem)
    });
    if (!postRes.ok) throw new Error("Ошибка при добавлении в избранное");

    // Используем всплывающее уведомление вместо alert
    showNotification("Товар добавлен в избранное", "success", 10000);
  } catch (error) {
    showNotification("Ошибка: " + error.message, "error");
  }
}

async function addToCart(item) {
  try {
    const res = await fetch(`${API_URL_CART}?id=${item.id}`);
    const cartItems = await res.json();
    const existingItem = cartItems.find(cartItem => cartItem.id === item.id);

    if (existingItem) {
      const newQuantity = existingItem.quantity ? existingItem.quantity + 1 : 1;
      const patchRes = await fetch(`${API_URL_CART}/${existingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity })
      });
      if (!patchRes.ok) throw new Error("Ошибка при обновлении количества товара");

      showNotification("Количество товара увеличено", "success", 10000);
    } else {
      const newItem = { ...item, quantity: 1 };
      const postRes = await fetch(API_URL_CART, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem)
      });
      if (!postRes.ok) throw new Error("Ошибка при добавлении товара в корзину");

      showNotification("Товар добавлен в корзину", "success", 10000);
    }
  } catch (error) {
    console.error("Ошибка:", error);
    showNotification("Ошибка: " + error.message, "error");
  }
}

// -----------------------
// Функция выхода (logout)
// -----------------------
function logout() {
  localStorage.removeItem("currentUser");
  location.reload();
}

[searchInput, sortSelect, categorySelect, minInput, maxInput].forEach(el => {
  el.addEventListener("input", buildQuery);
});

// -----------------------
// Рендеринг слайдера на основе всех данных
// -----------------------
function renderSlider(data) {
  const sliderContainer = document.querySelector('.slider-container');
  if (!sliderContainer) return;
  sliderContainer.innerHTML = data.map(item => `
    <div class="slide">
      <img src="${item.image}" alt="${item.title}">
    </div>
  `).join('');
}

// -----------------------
// Инициализация слайдера
// -----------------------
function initSlider() {
  const sliderContainer = document.querySelector('.slider-container');
  const slides = document.querySelectorAll('.slide');
  const prevBtn = document.querySelector('.slider-btn.prev');
  const nextBtn = document.querySelector('.slider-btn.next');
  let currentIndex = 0;
  const slideCount = slides.length;
  let sliderInterval;

  function goToSlide(index) {
    if (index < 0) {
      currentIndex = slideCount - 1;
    } else if (index >= slideCount) {
      currentIndex = 0;
    } else {
      currentIndex = index;
    }
    sliderContainer.style.transform = `translateX(-${currentIndex * 100}%)`;
  }

  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  function startSlider() {
    sliderInterval = setInterval(nextSlide, 3000);
  }

  function stopSlider() {
    clearInterval(sliderInterval);
  }

  nextBtn.addEventListener('click', () => {
    nextSlide();
    stopSlider();
    startSlider();
  });

  prevBtn.addEventListener('click', () => {
    prevSlide();
    stopSlider();
    startSlider();
  });

  startSlider();
}

// -----------------------
// Логика бургер-меню
// -----------------------
document.addEventListener("DOMContentLoaded", () => {
  const burgerIcon = document.getElementById("burgerIcon");
  const burgerMenu = document.getElementById("burgerMenu");
  const menuOverlay = document.getElementById("menuOverlay");

  function openMenu() {
    burgerMenu.classList.add("active");
    menuOverlay.classList.add("active");
    burgerIcon.classList.add("active");
    document.body.classList.add("menu-open");
  }

  function closeMenu() {
    burgerMenu.classList.remove("active");
    menuOverlay.classList.remove("active");
    burgerIcon.classList.remove("active");
    document.body.classList.remove("menu-open");
  }

  burgerIcon.addEventListener("click", () => {
    if (burgerMenu.classList.contains("active")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menuOverlay.addEventListener("click", closeMenu);

  const burgerLinks = burgerMenu.querySelectorAll("a");
  burgerLinks.forEach(link => {
    link.addEventListener("click", closeMenu);
  });
});

document.addEventListener("DOMContentLoaded", loadAllData);
// Экспорт функции logout для использования в inline onclick
window.logout = logout;

// ----------------------------------------------------------
// Интерактивная медиагалерея
// ----------------------------------------------------------
const galleryItems = [
  { image: 'carp2.webp', audio: 'The_Cranberries_-_Empty_slowed.mp3' },
  { image: 'cl2.jpeg', audio: 'Gab3_x_Lil_Peep_-_Hollywood_Dreaming_Prod_by_Money_Posse.mp3' },
  { image: 'conc2.jpg', audio: 'ocean_eyes.mp3' },
  { image: 'door2.jpg', audio: '505_-_arctic_monkeys.mp3' },
  { image: 'dry2.jpg', audio: 'ARCANE_-_Wasteland_Mekill_Remix.mp3' },
  { image: 'gen2.jpg', audio: 'From_Eden_Hozier.mp3' },
  { image: 'hvac2.jpg', audio: 'sombr_-_undressed_slowed_reverb_lyricsmp3.mp3' },
  { image: 'land2.webp', audio: 'Happier_Than_Ever.mp3' },
  { image: 'sec2.webp', audio: 'star_shopping_prod_kryptik.mp3' },
  { image: 'win2.jpg', audio: 'ich_seh.mp3' },
  { type: "video", video: 'ssstik.io_@testirovshik_1747501646628.mp4' }
];

const galleryImg = document.getElementById('galleryImg');
const galleryVideo = document.getElementById('galleryVideo');
const element1 = document.getElementById('element1');
const element2 = document.getElementById('element2');
const pauseBtn = document.getElementById('pauseBtn');
const playerStatus = document.getElementById('playerStatus');
const volumeControl = document.getElementById('volumeControl');

let currentAudio = null;

function playRandomItem() {
  // Сброс аудио
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  
  // Сброс видео: остановка, сброс currentTime и очистка src
  galleryVideo.pause();
  galleryVideo.currentTime = 0;
  galleryVideo.removeAttribute("src");
  
  // Скрываем оба элемента
  galleryImg.style.display = "none";
  galleryVideo.style.display = "none";
  
  // Выбор случайного медиаресурса
  const randomIndex = Math.floor(Math.random() * galleryItems.length);
  console.log("Random index:", randomIndex);
  const selectedItem = galleryItems[randomIndex];
  console.log("Selected item:", selectedItem);
  
  if (!selectedItem.type || selectedItem.type === "image") {
    // Отображаем изображение
    galleryImg.style.display = "block";
    galleryVideo.style.display = "none";
    galleryImg.classList.remove('active');
    galleryImg.src = selectedItem.image;
    galleryImg.onload = () => {
      galleryImg.classList.add('active');
    };

    // Если аудио задано, запускаем его
    if (selectedItem.audio) {
      currentAudio = new Audio(selectedItem.audio);
      currentAudio.volume = volumeControl.value;
      currentAudio.play().then(() => {
        playerStatus.textContent = "Играет";
        pauseBtn.textContent = "Пауза";
      }).catch(err => {
        console.error("Ошибка при воспроизведении аудио:", err);
      });
      
      currentAudio.onended = () => {
        playerStatus.textContent = "Пауза";
        pauseBtn.textContent = "Пауза";
      };
    }
  } else if (selectedItem.type === "video") {
    // Отображаем видео
    galleryVideo.style.display = "block";
    galleryImg.style.display = "none";

    galleryVideo.src = selectedItem.video;
    galleryVideo.load();
    galleryVideo.play().then(() => {
      playerStatus.textContent = "Воспроизведение видео";
      pauseBtn.textContent = "Пауза";
    }).catch(err => {
      console.error("Ошибка при воспроизведении видео:", err);
    });

    galleryVideo.onended = () => {
      playerStatus.textContent = "Пауза";
      pauseBtn.textContent = "Пауза";
    };
  }
}

volumeControl.addEventListener('input', () => {
  if (currentAudio) {
    currentAudio.volume = volumeControl.value;
  }
  if (galleryVideo && galleryVideo.style.display !== "none") {
    galleryVideo.volume = volumeControl.value;
  }
});

element1.addEventListener('click', playRandomItem);
element2.addEventListener('click', playRandomItem);

pauseBtn.addEventListener('click', () => {
  if (currentAudio) {
    if (!currentAudio.paused) {
      currentAudio.pause();
      playerStatus.textContent = "Пауза";
      pauseBtn.textContent = "Продолжить";
    } else {
      currentAudio.play();
      playerStatus.textContent = "Играет";
      pauseBtn.textContent = "Пауза";
    }
  } else if (galleryVideo && galleryVideo.style.display !== "none") {
    if (!galleryVideo.paused) {
      galleryVideo.pause();
      playerStatus.textContent = "Пауза";
      pauseBtn.textContent = "Продолжить";
    } else {
      galleryVideo.play();
      playerStatus.textContent = "Воспроизведение видео";
      pauseBtn.textContent = "Пауза";
    }
  }
});
