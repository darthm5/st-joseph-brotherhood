// Supabase public client configuration. Publishable keys are intended for browser use.
const SUPABASE_URL = "https://codmkmlbezxjccccswjp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_34fKSc_yV9KPaujxo0bWUA_PwgkxHyT";

const pageInfo = {
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
const placeholderPage = document.getElementById("page-placeholder");
const breadcrumb = document.getElementById("breadcrumbCurrent");
const sidebar = document.getElementById("sidebar");
const toast = document.getElementById("toast");
const loginButton = document.getElementById("discordLogin");
const statusText = document.querySelector(".status-text");
const statusDot = document.querySelector(".topbar-actions > .status-dot");
let toastTimer;
let currentSession = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
}

function navigate(page) {
  const info = pageInfo[page] || pageInfo.home;
  navButtons.forEach(button => button.classList.toggle("active", button.dataset.page === page));
  if (page === "home") {
    homePage.classList.add("active-page");
    placeholderPage.classList.remove("active-page");
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
