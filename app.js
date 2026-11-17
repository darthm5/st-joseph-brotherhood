// Supabase public client configuration. Publishable keys are intended for browser use.
const SUPABASE_URL = "https://codmkmlbezxjccccswjp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_34fKSc_yV9KPaujxo0bWUA_PwgkxHyT";

const pageInfo = {
  profile: ["Мой кабинет", "Личная анкета персонажа."],
  home: ["Главная", "Новости, объявления и основные сведения резиденции."],
  members: ["Участники", "Реестр членов братства, их анкеты, звания и достижения."],
  info: ["Важная информация", "Устав, правила, решения совета и важные распоряжения."],
  calendar: ["Календарь", "Собрания, события, встречи и общие мероприятия братства."],
  treasury: ["Казна", "Доходы, расходы, взносы и текущее состояние общей казны."],
  market: ["Рынок", "Объявления о покупке, продаже и обмене товаров и услуг."],
  work: ["Работа", "Заказы, поручения, доступные работы и выполненные задания."],
  crafts: ["Ремёсла", "Ремесленные специализации, мастера и их профессиональные навыки."],
  map: ["Карта", "Карта мира, поселения, маршруты и отмеченные места."],
  chronicle: ["Летопись", "История братства, важные события и памятные записи."],
  storehouse: ["Кладовая", "Общие запасы, материалы, имущество и движение ресурсов."],
  management: ["Управление", "Инструменты администрации, роли, звания и настройки резиденции."]
};

const navButtons = [...document.querySelectorAll(".nav-item")];
const homePage = document.getElementById("page-home");
const profilePage = document.getElementById("page-profile");
const placeholderPage = document.getElementById("page-placeholder");
const breadcrumb = document.getElementById("breadcrumbCurrent");
const sidebar = document.getElementById("sidebar");
const toast = document.getElementById("toast");
const loginButton = document.getElementById("discordLogin");
const statusText = document.querySelector(".status-text");
const statusDot = document.querySelector(".topbar-actions > .status-dot");
let toastTimer;
let currentSession = null;
let profileLoadSequence = 0;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
}

function navigate(page) {
  const info = pageInfo[page] || pageInfo.home;
  navButtons.forEach(button => button.classList.toggle("active", button.dataset.page === page));
  profilePage.classList.toggle("active-page", page === "profile");
  if (page === "home") {
    homePage.classList.add("active-page");
    placeholderPage.classList.remove("active-page");
  } else if (page === "profile") {
    homePage.classList.remove("active-page");
    placeholderPage.classList.remove("active-page");
    loadProfile();
  } else {
    homePage.classList.remove("active-page");
    placeholderPage.classList.add("active-page");
    document.getElementById("placeholderTitle").textContent = info[0];
    document.getElementById("placeholderDescription").textContent = info[1];
  }
  breadcrumb.textContent = info[0];
  sidebar.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAuthState(session) {
  currentSession = session;
  if (profilePage.classList.contains("active-page")) loadProfile();
  if (session?.user) {
    const metadata = session.user.user_metadata || {};
    const displayName = metadata.global_name || metadata.full_name || metadata.name || "участник";
    loginButton.innerHTML = '<span class="discord-mark">↪</span> Выйти';
    loginButton.setAttribute("aria-label", "Выйти из аккаунта");
    statusText.textContent = `Вы вошли как ${displayName}`;
    statusDot.style.background = "#78906b";
    statusDot.style.boxShadow = "0 0 0 3px rgba(120,144,107,.13)";
  } else {
    loginButton.innerHTML = '<span class="discord-mark">◉</span> Войти через Discord';
    loginButton.setAttribute("aria-label", "Войти через Discord");
    statusText.textContent = "Резиденция открыта";
    statusDot.style.background = "#78906b";
  }
}

navButtons.forEach(button => button.addEventListener("click", () => navigate(button.dataset.page)));
document.querySelectorAll("[data-goto]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.goto)));

// Initialize Supabase and listen for the OAuth callback/session changes.
let supabaseClient = null;
try {
  if (window.supabase?.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) showToast("Не удалось проверить сессию: " + error.message);
      renderAuthState(data?.session || null);
    });

    supabaseClient.auth.onAuthStateChange((event, session) => {
      renderAuthState(session);
      if (event === "SIGNED_IN") showToast("Вход выполнен. Добро пожаловать в резиденцию братства.");
      if (event === "SIGNED_OUT") showToast("Вы вышли из аккаунта.");
    });
  } else {
    showToast("Не удалось загрузить библиотеку авторизации. Обновите страницу или проверьте подключение.");
  }
} catch (error) {
  showToast("Ошибка подключения Supabase: " + error.message);
}

loginButton.addEventListener("click", async () => {
  if (!supabaseClient) {
    showToast("Подключение Supabase недоступно. Проверьте загрузку страницы.");
    return;
  }

  loginButton.disabled = true;
  try {
    if (currentSession) {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
    } else {
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo }
      });
      if (error) throw error;
    }
  } catch (error) {
    showToast("Ошибка авторизации: " + error.message);
    loginButton.disabled = false;
  }
});

document.getElementById("mobileMenu").addEventListener("click", () => sidebar.classList.toggle("open"));

document.addEventListener("click", event => {
  if (window.innerWidth <= 800 && sidebar.classList.contains("open") &&
      !sidebar.contains(event.target) && !event.target.closest("#mobileMenu")) {
    sidebar.classList.remove("open");
  }
});


const profileForm = document.getElementById("profileForm");
const profileNotice = document.getElementById("profileLoginNotice");
const profileMessage = document.getElementById("profileMessage");
const profilePreview = document.getElementById("characterPhotoPreview");
const profileFields = ["character_first_name", "character_last_name", "character_age", "profession", "crafts", "about", "character_photo_url"];

function renderPreview(url) {
  if (url && /^https:\/\//i.test(url)) {
    profilePreview.src = url;
    profilePreview.hidden = false;
  } else {
    profilePreview.removeAttribute("src");
    profilePreview.hidden = true;
  }
}
profilePreview.addEventListener("error", () => { profilePreview.hidden = true; });
profileForm.elements.character_photo_url.addEventListener("change", e => renderPreview(e.target.value.trim()));

async function loadProfile() {
  const sequence = ++profileLoadSequence;
  const user = currentSession?.user;
  profileForm.hidden = true;
  profileNotice.hidden = !!user;
  if (!user || !supabaseClient) return;
  profileMessage.textContent = "Загружаем анкету…";
  const { data, error } = await supabaseClient.from("profiles")
    .select("discord_username,character_first_name,character_last_name,character_age,profession,crafts,about,character_photo_url,membership_status,game_rank")
    .eq("id", user.id).maybeSingle();
  if (sequence !== profileLoadSequence || currentSession?.user?.id !== user.id) return;
  profileForm.hidden = false;
  if (error) { profileMessage.textContent = "Ошибка загрузки: " + error.message; return; }
  if (!data) { profileMessage.textContent = "Профиль не найден. Проверь SQL-шаг создания профилей."; profileForm.querySelector('button[type="submit"]').disabled = true; return; }
  profileForm.querySelector('button[type="submit"]').disabled = false;
  for (const field of profileFields) {
    profileForm.elements[field].value = field === "crafts" ? (data.crafts || []).join(", ") : (data[field] ?? "");
  }
  document.getElementById("profileDiscordName").textContent = data.discord_username || "Discord-пользователь";
  document.getElementById("profileRank").textContent = data.game_rank || "Кандидат";
  const statuses = {pending:"Ожидает рассмотрения",approved:"Принят",rejected:"Отклонён"};
  document.getElementById("profileMembership").textContent = "Статус: " + (statuses[data.membership_status] || data.membership_status);
  renderPreview(data.character_photo_url);
  profileMessage.textContent = "";
}

profileForm.addEventListener("submit", async event => {
  event.preventDefault();
  const user = currentSession?.user;
  if (!user || !supabaseClient) return showToast("Сначала войдите через Discord.");
  const value = name => profileForm.elements[name].value.trim();
  const first = value("character_first_name"), last = value("character_last_name");
  if (!first || !last) return showToast("Укажите имя и фамилию персонажа.");
  const age = value("character_age");
  if (age && (!Number.isInteger(Number(age)) || Number(age) < 16 || Number(age) > 100)) return showToast("Возраст должен быть от 16 до 100.");
  const photo = value("character_photo_url");
  if (photo && !/^https:\/\//i.test(photo)) return showToast("Для изображения нужна ссылка HTTPS.");
  const payload = {
    character_first_name:first, character_last_name:last,
    character_age:age ? Number(age) : null,
    profession:value("profession") || null,
    crafts:value("crafts").split(",").map(x=>x.trim()).filter(Boolean),
    about:value("about") || null,
    character_photo_url:photo || null
  };
  const button = document.getElementById("saveProfile");
  button.disabled = true;
  profileMessage.textContent = "Сохраняем…";
  try {
    const { data, error } = await supabaseClient.from("profiles").update(payload).eq("id", user.id).select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("Профиль не обновлён. Проверьте права доступа.");
    profileMessage.textContent = "Анкета сохранена.";
    showToast("Анкета персонажа успешно сохранена.");
    renderPreview(photo);
  } catch (error) {
    profileMessage.textContent = "Ошибка сохранения: " + error.message;
  } finally { button.disabled = false; }
});
