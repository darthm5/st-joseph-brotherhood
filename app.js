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
const membersPage = document.getElementById("page-members");
const managementPage = document.getElementById("page-management");
const waitingPage = document.getElementById("page-waiting");
let accessState = { mode: "loading", status: null, complete: false };
let accessSequence = 0;
let accessInitialized = false;
const publicPages = new Set(["profile", "waiting"]);
function canVisit(page) {
  return accessState.mode === "approved" || accessState.mode === "admin" || publicPages.has(page);
}
function updateNavigationAccess() {
  const restricted = accessState.mode !== "approved" && accessState.mode !== "admin";
  for (const button of navButtons) {
    button.hidden = restricted && button.dataset.page !== "profile";
  }
  document.querySelectorAll("[data-goto]").forEach(button => {
    button.hidden = restricted && button.dataset.goto !== "profile";
  });
  document.querySelector(".management-caption").hidden = accessState.mode !== "admin";
  const adminNav = document.querySelector('[data-page="management"]');
  adminNav.hidden = accessState.mode !== "admin";
  // The admin link is hidden for ordinary approved members too.
  if (accessState.mode === "approved") adminNav.hidden = true;
}
function showWaiting() {
  const heading = document.getElementById("waitingHeading");
  const message = document.getElementById("waitingMessage");
  const refresh = document.getElementById("waitingRefresh");
  const profileButton = document.getElementById("waitingProfile");
  const {mode} = accessState;
  const content = {
    loading:["Проверяем доступ…","Подождите, пока проверим вашу учётную запись."],
    register:["Представьтесь братству","Чтобы отправить заявку, заполните имя и фамилию персонажа в разделе «Мой кабинет» и сохраните анкету."],
    pending:["Заявка на рассмотрении","Анкета сохранена. Совет братства рассмотрит вашу заявку. Пока доступны только этот экран и ваш личный кабинет."],
    rejected:["Заявка отклонена","Совет братства отклонил заявку. Вы можете просмотреть и изменить собственную анкету."],
    error:["Не удалось проверить доступ","Проверьте подключение и повторите попытку. Если проблема повторится, обратитесь к администрации."],
    guest:["Войдите через Discord","Для подачи заявки требуется авторизация через Discord."]
  };
  const [title, body] = content[mode] || content.loading;
  heading.textContent = title;
  message.textContent = body;
  profileButton.hidden = mode === "guest" || mode === "loading";
  refresh.hidden = mode === "guest";
  waitingPage.classList.add("active-page");
}
async function refreshAccess() {
  const sequence = ++accessSequence;
  const userId = currentSession?.user?.id;
  accessState = {mode: userId ? "loading" : "guest", status:null,complete:false};
  updateNavigationAccess();
  if (!userId || !supabaseClient) { navigate("waiting"); return; }
  navigate("waiting");
  try {
    const [adminResult, profileResult] = await Promise.all([
      supabaseClient.rpc("is_site_admin"),
      supabaseClient.from("profiles").select("character_first_name,character_last_name,membership_status").eq("id",userId).maybeSingle()
    ]);
    if (sequence !== accessSequence || currentSession?.user?.id !== userId) return;
    if (adminResult.error) throw adminResult.error;
    if (profileResult.error) throw profileResult.error;
    const p = profileResult.data;
    const complete = !!(p?.character_first_name?.trim() && p?.character_last_name?.trim());
    const mode = adminResult.data === true ? "admin" : !complete ? "register" : p.membership_status === "approved" ? "approved" : p.membership_status === "rejected" ? "rejected" : "pending";
    accessState = {mode,status:p?.membership_status || null,complete};
    updateNavigationAccess();
    navigate(mode === "admin" || mode === "approved" ? "home" : "waiting");
  } catch(error) {
    if (sequence !== accessSequence) return;
    accessState = {mode:"error",status:null,complete:false};
    updateNavigationAccess(); navigate("waiting");
    showToast("Проверка доступа: " + error.message);
  }
}
document.getElementById("waitingProfile").addEventListener("click",()=>navigate("profile"));
document.getElementById("waitingRefresh").addEventListener("click",refreshAccess);

const breadcrumb = document.getElementById("breadcrumbCurrent");
const sidebar = document.getElementById("sidebar");
const toast = document.getElementById("toast");
const loginButton = document.getElementById("discordLogin");
const statusText = document.querySelector(".status-text");
const statusDot = document.querySelector(".topbar-actions > .status-dot");
let toastTimer;
let currentSession = null;
let profileLoadSequence = 0;
let membersLoadSequence = 0;
let membersCache = [];
let adminLoadSequence = 0;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 4200);
}

function navigate(page) {
  if (!canVisit(page)) page = "waiting";
  const info = pageInfo[page] || pageInfo.home;
  navButtons.forEach(button => button.classList.toggle("active", button.dataset.page === page));
  profilePage.classList.toggle("active-page", page === "profile");
  membersPage.classList.toggle("active-page", page === "members");
  managementPage.classList.toggle("active-page", page === "management");
  waitingPage.classList.toggle("active-page", page === "waiting");
  if (page === "waiting") showWaiting();
  if (page === "management") loadAdminPanel();
  if (page === "members") loadMembers();
  if (page === "home") {
    homePage.classList.add("active-page");
    placeholderPage.classList.remove("active-page");
  } else if (page === "waiting") {
    homePage.classList.remove("active-page");
    placeholderPage.classList.remove("active-page");
  } else if (page === "members") {
    homePage.classList.remove("active-page");
    placeholderPage.classList.remove("active-page");
  } else if (page === "management") {
    homePage.classList.remove("active-page");
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
  breadcrumb.textContent = page === "waiting" ? "Вступление" : info[0];
  sidebar.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAuthState(session) {
  const previousUserId = currentSession?.user?.id;
  currentSession = session;
  if (!accessInitialized || previousUserId !== (session?.user?.id || null)) {
    accessInitialized = true;
    // Avoid making Supabase requests synchronously inside onAuthStateChange.
    setTimeout(refreshAccess, 0);
  }
  if (membersPage.classList.contains("active-page")) loadMembers();
  if (managementPage.classList.contains("active-page")) loadAdminPanel();
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
    await refreshAccess();
  } catch (error) {
    profileMessage.textContent = "Ошибка сохранения: " + error.message;
  } finally { button.disabled = false; }
});


// Member registry: read-only, loaded from Supabase using the logged-in session.
const membersGrid = document.getElementById("membersGrid");
const membersMessage = document.getElementById("membersMessage");
const membersCount = document.getElementById("membersCount");
const memberSearch = document.getElementById("memberSearch");
const memberDetails = document.getElementById("memberDetails");
const memberDetailsBody = document.getElementById("memberDetailsBody");

function element(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined && content !== null) node.textContent = String(content);
  return node;
}
function safePhoto(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch { return null; }
}
function characterName(profile) {
  return [profile.character_first_name, profile.character_last_name].filter(Boolean).join(" ") || "Безымянный персонаж";
}
function photoNode(profile, className) {
  const url = safePhoto(profile.character_photo_url);
  const wrapper = element("div", className);
  if (url) {
    const img = element("img");
    img.src = url;
    img.alt = "Портрет персонажа " + characterName(profile);
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.addEventListener("error", () => img.replaceWith(element("span", "member-photo-fallback", "♙")));
    wrapper.append(img);
  } else wrapper.append(element("span", "member-photo-fallback", "♙"));
  return wrapper;
}
function displayStatus(status) {
  return ({pending:"Ожидает рассмотрения",approved:"Принят",rejected:"Отклонён"})[status] || "Не указан";
}
function renderMembers() {
  const term = memberSearch.value.trim().toLocaleLowerCase();
  const filtered = membersCache.filter(p => [characterName(p), p.profession, p.game_rank, ...(p.crafts || [])].join(" ").toLocaleLowerCase().includes(term));
  membersGrid.replaceChildren();
  membersCount.textContent = `Показано: ${filtered.length} из ${membersCache.length}`;
  if (!filtered.length) {
    membersMessage.textContent = membersCache.length ? "По вашему запросу никого не найдено." : "В реестре пока нет заполненных анкет.";
    return;
  }
  membersMessage.textContent = "";
  for (const profile of filtered) {
    const card = element("button", "member-card");
    card.type = "button";
    card.append(photoNode(profile, "member-photo"));
    const body = element("div", "member-card-body");
    body.append(element("span", "member-card-rank", profile.game_rank || "Кандидат"));
    body.append(element("h2", "member-card-name", characterName(profile)));
    body.append(element("p", "member-card-profession", profile.profession || "Род занятий не указан"));
    body.append(element("p", "member-card-crafts", (profile.crafts || []).join(" · ") || "Ремёсла не указаны"));
    body.append(element("span", "member-card-more", "Открыть анкету →"));
    card.append(body);
    card.addEventListener("click", () => openMember(profile));
    membersGrid.append(card);
  }
}
function detailField(parent, title, value) {
  const block = element("div", "member-detail-field");
  block.append(element("span", "member-detail-label", title));
  block.append(element("p", "", value || "Не указано"));
  parent.append(block);
}
function openMember(profile) {
  memberDetailsBody.replaceChildren();
  memberDetailsBody.append(photoNode(profile, "member-detail-photo"));
  const text = element("div", "member-detail-text");
  text.append(element("div", "eyebrow", "Анкета персонажа"));
  text.append(element("h2", "", characterName(profile)));
  detailField(text, "Звание", profile.game_rank || "Кандидат");
  detailField(text, "Статус", displayStatus(profile.membership_status));
  detailField(text, "Возраст", profile.character_age == null ? null : profile.character_age + " лет");
  detailField(text, "Профессия", profile.profession);
  detailField(text, "Ремёсла", (profile.crafts || []).join(", "));
  detailField(text, "О персонаже", profile.about);
  memberDetailsBody.append(text);
  membersGrid.hidden = true;
  document.querySelector(".members-tools").hidden = true;
  memberDetails.hidden = false;
  memberDetails.scrollIntoView({behavior:"smooth",block:"start"});
}
function closeMember() {
  memberDetails.hidden = true;
  membersGrid.hidden = false;
  document.querySelector(".members-tools").hidden = false;
}
document.getElementById("closeMemberDetails").addEventListener("click", closeMember);
memberSearch.addEventListener("input", () => { closeMember(); renderMembers(); });

async function loadMembers() {
  const sequence = ++membersLoadSequence;
  closeMember();
  membersGrid.replaceChildren();
  membersCount.textContent = "";
  membersCache = [];
  if (!currentSession?.user || !supabaseClient) {
    membersMessage.textContent = "Для просмотра реестра войдите через Discord.";
    return;
  }
  membersMessage.textContent = "Загружаем реестр участников…";
  const { data, error } = await supabaseClient.from("profiles")
    .select("id,character_first_name,character_last_name,character_age,profession,crafts,about,character_photo_url,membership_status,game_rank")
    .order("created_at", {ascending:true});
  if (sequence !== membersLoadSequence || !currentSession?.user) return;
  if (error) {
    membersMessage.textContent = "Не удалось загрузить реестр: " + error.message;
    return;
  }
  // Do not list blank profiles; registered members with a named character are included.
  membersCache = (data || []).filter(p => p.character_first_name?.trim() && p.character_last_name?.trim());
  renderMembers();
}


// Admin panel. Every write is checked again inside Supabase RPC; UI checks are not security.
const adminNotice = document.getElementById("adminNotice");
const adminPanel = document.getElementById("adminPanel");
const adminList = document.getElementById("adminList");
const adminFilter = document.getElementById("adminFilter");
const adminCount = document.getElementById("adminCount");
let adminProfiles = [];
const allowedStatuses = ["pending", "approved", "rejected"];

async function loadAdminPanel() {
  const sequence = ++adminLoadSequence;
  const userId = currentSession?.user?.id;
  adminPanel.hidden = true;
  adminList.replaceChildren();
  if (!userId || !supabaseClient) {
    adminNotice.textContent = "Для доступа войдите через Discord.";
    return;
  }
  adminNotice.textContent = "Проверяем административные права…";
  try {
    const {data: isAdmin, error: checkError} = await supabaseClient.rpc("is_site_admin");
    if (checkError) throw checkError;
    if (sequence !== adminLoadSequence || currentSession?.user?.id !== userId) return;
    if (isAdmin !== true) {
      adminNotice.textContent = "Доступ разрешён только администрации братства.";
      return;
    }
    adminNotice.textContent = "Загружаем участников…";
    const {data, error} = await supabaseClient.from("profiles")
      .select("id,discord_username,character_first_name,character_last_name,membership_status,game_rank,profession,created_at")
      .order("created_at", {ascending: false});
    if (error) throw error;
    if (sequence !== adminLoadSequence || currentSession?.user?.id !== userId) return;
    adminProfiles = data || [];
    adminPanel.hidden = false;
    adminNotice.textContent = "";
    renderAdminList();
  } catch (error) {
    if (sequence === adminLoadSequence) adminNotice.textContent = "Ошибка: " + error.message;
  }
}
function renderAdminList() {
  const filter = adminFilter.value;
  const rows = adminProfiles.filter(p => filter === "all" || p.membership_status === filter);
  adminCount.textContent = `Показано: ${rows.length} из ${adminProfiles.length}`;
  adminList.replaceChildren();
  if (!rows.length) {
    adminList.append(element("p", "members-message", "Нет участников с выбранным статусом."));
    return;
  }
  for (const p of rows) {
    const card = element("article", "panel admin-card");
    const head = element("div", "admin-card-heading");
    const title = element("div");
    title.append(element("h2", "", characterName(p)));
    title.append(element("p", "", `Discord: ${p.discord_username || "не указан"} · ${p.profession || "профессия не указана"}`));
    head.append(title, element("span", "admin-status", displayStatus(p.membership_status)));
    card.append(head);
    const controls = element("div", "admin-controls");
    const statusGroup = element("label");
    statusGroup.append(element("span", "", "Статус членства"));
    const statusSelect = element("select");
    for (const [value, label] of [["pending", "Кандидат"], ["approved", "Принят"], ["rejected", "Отклонён"]]) {
      const opt = element("option", "", label); opt.value = value;
      statusSelect.append(opt);
    }
    statusSelect.value = allowedStatuses.includes(p.membership_status) ? p.membership_status : "pending";
    statusGroup.append(statusSelect);
    const saveStatus = element("button", "secondary-button", "Сохранить статус");
    saveStatus.type = "button";
    saveStatus.addEventListener("click", async () => {
      if (statusSelect.value === p.membership_status) return showToast("Статус не изменился.");
      if (!confirm(`Изменить статус персонажа «${characterName(p)}» на «${displayStatus(statusSelect.value)}»?`)) return;
      await adminMutation("admin_set_member_status", {target_user_id:p.id, new_status:statusSelect.value}, saveStatus);
    });
    const rankGroup = element("label");
    rankGroup.append(element("span", "", "Игровое звание"));
    const rankInput = element("input");
    rankInput.type = "text"; rankInput.maxLength = 60; rankInput.value = p.game_rank || "Кандидат";
    rankGroup.append(rankInput);
    const saveRank = element("button", "secondary-button", "Сохранить звание");
    saveRank.type = "button";
    saveRank.addEventListener("click", async () => {
      const rank = rankInput.value.trim();
      if (rank.length < 2 || rank.length > 60) return showToast("Звание должно содержать от 2 до 60 символов.");
      if (rank === p.game_rank) return showToast("Звание не изменилось.");
      if (!confirm(`Назначить персонажу «${characterName(p)}» звание «${rank}»?`)) return;
      await adminMutation("admin_set_member_rank", {target_user_id:p.id, new_rank:rank}, saveRank);
    });
    controls.append(statusGroup,saveStatus,rankGroup,saveRank);
    card.append(controls);
    adminList.append(card);
  }
}
async function adminMutation(functionName, args, button) {
  const userId = currentSession?.user?.id;
  if (!userId || !supabaseClient) return;
  button.disabled = true;
  try {
    const {error} = await supabaseClient.rpc(functionName,args);
    if (error) throw error;
    if (currentSession?.user?.id !== userId) return;
    showToast("Изменения сохранены.");
    await loadAdminPanel();
  } catch (error) {
    showToast("Не удалось сохранить: " + error.message);
  } finally { button.disabled = false; }
}
adminFilter.addEventListener("change", renderAdminList);
document.getElementById("adminRefresh").addEventListener("click", loadAdminPanel);

// Always begin behind the access gate until Supabase confirms the user status.
updateNavigationAccess();
navigate("waiting");
