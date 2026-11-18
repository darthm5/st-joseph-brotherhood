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
const craftsPage = document.getElementById("page-crafts");
const treasuryPage = document.getElementById("page-treasury");
const storehousePage = document.getElementById("page-storehouse");
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
  craftsPage.classList.toggle("active-page", page === "crafts");
  treasuryPage.classList.toggle("active-page", page === "treasury");
  storehousePage.classList.toggle("active-page", page === "storehouse");
  managementPage.classList.toggle("active-page", page === "management");
  waitingPage.classList.toggle("active-page", page === "waiting");
  if (page === "waiting") showWaiting();
  if (page === "management") loadAdminPanel();
  if (page === "members") loadMembers();
  if (page === "crafts") loadDirectory();
  if (page === "treasury") loadTreasury();
  if (page === "storehouse") loadStorehouse();
  if (page === "home") {
    homePage.classList.add("active-page");
    placeholderPage.classList.remove("active-page");
  } else if (page === "waiting") {
    homePage.classList.remove("active-page");
    placeholderPage.classList.remove("active-page");
  } else if (page === "members") {
    homePage.classList.remove("active-page");
    placeholderPage.classList.remove("active-page");
  } else if (page === "crafts") {
    homePage.classList.remove("active-page");
    placeholderPage.classList.remove("active-page");
  } else if (page === "treasury" || page === "storehouse") {
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
const profileFields = ["character_first_name", "character_last_name", "character_age", "about", "character_photo_url"];

const JOB_NAMES = ["Рудокоп","Дровосек","Травник","Фермер","Рыбак","Охотник","Гонец","Возница","Ночной сторож","Вор"];
const MASTERY_NAMES = ["Кузнечное дело","Бронное дело","Портное дело","Лучное дело","Ювелирное дело","Столярное дело","Алхимия","Готовка","Пивоварение"];
const skillLists = { jobs: document.getElementById("jobsList"), masteries: document.getElementById("masteriesList") };
const skillCatalog = { jobs: JOB_NAMES, masteries: MASTERY_NAMES };
function addSkillRow(kind, item = {}) {
  const list = skillLists[kind], names = skillCatalog[kind];
  if (list.children.length >= (kind === "jobs" ? 2 : names.length)) return;
  const row = document.createElement("div"); row.className = "skill-row";
  const choice = document.createElement("select"); choice.className = "skill-name"; choice.setAttribute("aria-label", kind === "jobs" ? "Работа" : "Мастерство");
  choice.append(new Option("Выберите из списка", ""));
  for (const name of names) choice.append(new Option(name, name));
  choice.value = names.includes(item.name) ? item.name : "";
  const level = document.createElement("select"); level.className = "skill-level"; level.setAttribute("aria-label", "Уровень");
  for (let i=1;i<=10;i++) level.append(new Option("Ур. " + i, String(i)));
  level.value = String(Number.isInteger(Number(item.level)) && Number(item.level)>=1 && Number(item.level)<=10 ? item.level : 1);
  const remove = document.createElement("button"); remove.type = "button"; remove.className = "skill-remove"; remove.textContent = "Удалить";
  remove.addEventListener("click", () => { row.remove(); updateSkillButtons(); });
  row.append(choice,level,remove); list.append(row); updateSkillButtons();
}
function updateSkillButtons() {
  document.getElementById("addJob").disabled = skillLists.jobs.children.length >= 2;
  document.getElementById("addMastery").disabled = skillLists.masteries.children.length >= MASTERY_NAMES.length;
}
function loadSkillRows(kind, items) {
  skillLists[kind].replaceChildren();
  for (const item of (Array.isArray(items) ? items : [])) addSkillRow(kind,item);
  updateSkillButtons();
}
function collectSkillRows(kind) {
  const rows = [...skillLists[kind].children].map(row => ({name:row.querySelector(".skill-name").value, level:Number(row.querySelector(".skill-level").value)}));
  if (rows.some(x=>!x.name)) throw new Error("Выберите название для каждой работы и мастерства.");
  if (new Set(rows.map(x=>x.name)).size !== rows.length) throw new Error("Одинаковые работы или мастерства нельзя добавлять дважды.");
  return rows;
}
document.getElementById("addJob").addEventListener("click",()=>addSkillRow("jobs"));
document.getElementById("addMastery").addEventListener("click",()=>addSkillRow("masteries"));
function formatSkills(items) { return Array.isArray(items) && items.length ? items.map(x=>`${x.name} (ур. ${x.level})`).join(" · ") : "Не указано"; }
function memberJobs(p) { return Array.isArray(p.jobs) && p.jobs.length ? formatSkills(p.jobs) : (p.profession || "Не указано"); }
function memberMasteries(p) { return Array.isArray(p.masteries) && p.masteries.length ? formatSkills(p.masteries) : ((p.crafts || []).join(" · ") || "Не указано"); }

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
    .select("discord_username,character_first_name,character_last_name,character_age,profession,crafts,jobs,masteries,about,character_photo_url,membership_status,game_rank")
    .eq("id", user.id).maybeSingle();
  if (sequence !== profileLoadSequence || currentSession?.user?.id !== user.id) return;
  profileForm.hidden = false;
  if (error) { profileMessage.textContent = "Ошибка загрузки: " + error.message; return; }
  if (!data) { profileMessage.textContent = "Профиль не найден. Проверь SQL-шаг создания профилей."; profileForm.querySelector('button[type="submit"]').disabled = true; return; }
  profileForm.querySelector('button[type="submit"]').disabled = false;
  for (const field of profileFields) {
    profileForm.elements[field].value = data[field] ?? "";
  }
  loadSkillRows("jobs", data.jobs);
  loadSkillRows("masteries", data.masteries);
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
  let jobs, masteries;
  try { jobs = collectSkillRows("jobs"); masteries = collectSkillRows("masteries"); } catch(e) { profileMessage.textContent = e.message; return; }
  const payload = {
    character_first_name:first, character_last_name:last,
    character_age:age ? Number(age) : null,
    jobs, masteries,
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
  const filtered = membersCache.filter(p => [characterName(p), p.profession, p.game_rank, memberJobs(p), memberMasteries(p)].join(" ").toLocaleLowerCase().includes(term));
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
    body.append(element("p", "member-card-profession", memberJobs(profile)));
    body.append(element("p", "member-card-crafts", memberMasteries(profile)));
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
  detailField(text, "Работы", memberJobs(profile));
  detailField(text, "Мастерства", memberMasteries(profile));
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
    .select("id,character_first_name,character_last_name,character_age,profession,crafts,jobs,masteries,about,character_photo_url,membership_status,game_rank")
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


// Directory of approved members only; server-side RLS remains the source of access control.
const directoryGrid = document.getElementById("directoryGrid");
const directoryMessage = document.getElementById("directoryMessage");
const directoryDetails = document.getElementById("directoryDetails");
const directoryDetailsBody = document.getElementById("directoryDetailsBody");
const directorySearch = document.getElementById("directorySearch");
const directoryLevel = document.getElementById("directoryLevel");
const directorySort = document.getElementById("directorySort");
let directoryKind = "masteries", directoryCategory = null, directoryProfiles = [], directorySequence = 0;
function directorySkills(p) {
  const raw = p[directoryKind];
  return Array.isArray(raw) ? raw.filter(x => x && typeof x.name === "string" && Number.isInteger(Number(x.level)) && Number(x.level)>=1 && Number(x.level)<=10) : [];
}
function directoryEntry(name) {
  return directoryProfiles.flatMap(p => directorySkills(p).filter(x => x.name === name).map(x => ({p, level:Number(x.level)})));
}
function directoryMemberDetails(p) {
  directoryDetailsBody.replaceChildren();
  directoryDetailsBody.append(photoNode(p, "member-detail-photo"));
  const body = element("div", "member-detail-text");
  body.append(element("div", "eyebrow", "Анкета персонажа"));
  body.append(element("h2", "", characterName(p)));
  detailField(body, "Звание", p.game_rank);
  detailField(body, "Возраст", p.character_age == null ? null : p.character_age + " лет");
  detailField(body, "Работы", memberJobs(p));
  detailField(body, "Мастерства", memberMasteries(p));
  detailField(body, "О персонаже", p.about);
  directoryDetailsBody.append(body);
  directoryDetails.hidden = false;
  directoryGrid.hidden = true;
  directoryDetails.scrollIntoView({behavior:"smooth",block:"start"});
}
function renderDirectory() {
  directoryDetails.hidden = true;
  directoryGrid.hidden = false;
  document.getElementById("directoryLevelValue").textContent = directoryLevel.value;
  document.getElementById("directoryJobs").classList.toggle("directory-selected",directoryKind === "jobs");
  document.getElementById("directoryMasteries").classList.toggle("directory-selected",directoryKind === "masteries");
  document.getElementById("directoryBack").hidden = !directoryCategory;
  directoryGrid.replaceChildren();
  const term = directorySearch.value.trim().toLocaleLowerCase();
  const min = Number(directoryLevel.value);
  if (!directoryCategory) {
    const names = directoryKind === "jobs" ? JOB_NAMES : MASTERY_NAMES;
    for (const name of names) {
      const matches = directoryEntry(name).filter(x=>x.level>=min);
      if (!name.toLocaleLowerCase().includes(term) && !matches.some(x=>characterName(x.p).toLocaleLowerCase().includes(term))) continue;
      const button=element("button","directory-category"); button.type="button";
      button.append(element("span","directory-category-icon",directoryKind==="jobs"?"⚒":"♜"));
      button.append(element("strong","",name));
      button.append(element("small","",matches.length+" специалистов · высший уровень "+(matches.length?Math.max(...matches.map(x=>x.level)):"—")));
      button.addEventListener("click",()=>{directoryCategory=name;directorySearch.value="";renderDirectory();});
      directoryGrid.append(button);
    }
    directoryMessage.textContent = "Категории: " + directoryGrid.children.length;
  } else {
    const heading=element("h2","directory-heading",directoryCategory);
    directoryGrid.append(heading);
    const matches=directoryEntry(directoryCategory).filter(x=>x.level>=min && characterName(x.p).toLocaleLowerCase().includes(term));
    matches.sort((a,b)=>directorySort.value==="desc"?b.level-a.level:a.level-b.level);
    directoryMessage.textContent="Специалисты: "+matches.length;
    for (const {p,level} of matches) {
      const card=element("button","directory-person");card.type="button";
      card.append(photoNode(p,"member-photo"));
      const body=element("div","directory-person-info");body.append(element("strong","",characterName(p)));body.append(element("small","",p.game_rank||"Член братства"));
      const progress=element("div","directory-progress");const fill=element("div","directory-progress-fill");fill.style.width=(level*10)+"%";progress.append(fill);body.append(progress);card.append(body);
      card.append(element("strong","directory-person-level",level+"/10"));
      card.addEventListener("click",()=>directoryMemberDetails(p));directoryGrid.append(card);
    }
    if (!matches.length) directoryGrid.append(element("p","members-message","Специалисты не найдены."));
  }
}
async function loadDirectory() {
  const seq=++directorySequence;directoryProfiles=[];directoryGrid.replaceChildren();directoryMessage.textContent="Загружаем справочник…";
  if (!currentSession?.user || !supabaseClient) {directoryMessage.textContent="Войдите через Discord.";return;}
  const {data,error}=await supabaseClient.from("profiles").select("id,character_first_name,character_last_name,character_age,profession,crafts,jobs,masteries,about,character_photo_url,membership_status,game_rank").eq("membership_status","approved");
  if (seq!==directorySequence || !currentSession?.user) return;
  if(error){directoryMessage.textContent="Не удалось загрузить справочник: "+error.message;return;}
  directoryProfiles=(data||[]).filter(p=>p.character_first_name?.trim() && p.character_last_name?.trim());renderDirectory();
}
document.getElementById("directoryJobs").addEventListener("click",()=>{directoryKind="jobs";directoryCategory=null;directorySearch.value="";renderDirectory();});
document.getElementById("directoryMasteries").addEventListener("click",()=>{directoryKind="masteries";directoryCategory=null;directorySearch.value="";renderDirectory();});
document.getElementById("directoryBack").addEventListener("click",()=>{directoryCategory=null;directorySearch.value="";renderDirectory();});
document.getElementById("directoryCloseMember").addEventListener("click",()=>{directoryDetails.hidden=true;directoryGrid.hidden=false;});
directorySearch.addEventListener("input",renderDirectory);directoryLevel.addEventListener("input",renderDirectory);directorySort.addEventListener("change",renderDirectory);


// v0.9 — казна. No direct writes to finance tables: all changes go through RLS-protected RPCs.
const moneyFormat = new Intl.NumberFormat("ru-RU");
const treasuryNotice = document.getElementById("treasuryNotice");
let treasuryBusy = false;
function treasuryText(parent, tag, value, className = "") {
  const el = document.createElement(tag);
  el.textContent = String(value ?? "");
  if (className) el.className = className;
  parent.appendChild(el);
  return el;
}
function treasuryRow(parent, title, subtitle, amount, status) {
  const row = document.createElement("div"); row.className = "treasury-row";
  const details = document.createElement("div");
  treasuryText(details, "strong", title);
  treasuryText(details, "small", subtitle);
  row.appendChild(details);
  if (amount !== null) treasuryText(row, "b", `${amount > 0 ? "+" : ""}${moneyFormat.format(amount)} гр.`, amount < 0 ? "treasury-negative" : "treasury-positive");
  if (status) treasuryText(row, "span", status, "treasury-status");
  parent.appendChild(row); return row;
}
function treasuryDate(value) { return value ? new Date(value).toLocaleString("ru-RU") : "—"; }
function treasuryStatus(value) {return ({pending:"Ожидает",approved:"Подтверждена",rejected:"Отклонена"})[value] || value;}
async function loadTreasury() {
  if (!supabaseClient || !currentSession?.user || !["approved","admin"].includes(accessState.mode)) return;
  treasuryNotice.textContent = "Загружаем счётную книгу…";
  const userId = currentSession.user.id;
  const ownBox = document.getElementById("treasuryOwnRequests");
  const pendingBox = document.getElementById("treasuryPendingList");
  const historyBox = document.getElementById("treasuryHistory");
  const adminForm = document.getElementById("treasuryManualForm");
  const adminRequests = document.getElementById("treasuryAdminRequests");
  const isAdmin = accessState.mode === "admin";
  adminForm.hidden = !isAdmin; adminRequests.hidden = !isAdmin;
  try {
    const [txResult, reqResult, profilesResult] = await Promise.all([
      supabaseClient.from("treasury_transactions").select("id,member_id,amount,description,created_at,recorded_by").order("created_at",{ascending:false}).limit(500),
      supabaseClient.from("treasury_requests").select("id,user_id,amount,comment,status,created_at,reviewed_at").order("created_at",{ascending:false}).limit(500),
      supabaseClient.from("profiles").select("id,character_first_name,character_last_name").limit(1000)
    ]);
    for (const result of [txResult,reqResult,profilesResult]) if(result.error) throw result.error;
    if (currentSession?.user?.id !== userId || !treasuryPage.classList.contains("active-page")) return;
    const tx = txResult.data || [], requests = reqResult.data || [], profiles = profilesResult.data || [];
    const names = new Map(profiles.map(p=>[p.id,[p.character_first_name,p.character_last_name].filter(Boolean).join(" ") || "Участник"]));
    const sum = tx.reduce((n,t)=>n+Number(t.amount),0);
    document.getElementById("treasuryBalance").textContent = moneyFormat.format(sum);
    document.getElementById("treasuryIncome").textContent = moneyFormat.format(tx.reduce((n,t)=>n+Math.max(0,Number(t.amount)),0));
    document.getElementById("treasuryExpenses").textContent = moneyFormat.format(tx.reduce((n,t)=>n+Math.max(0,-Number(t.amount)),0));
    ownBox.replaceChildren(); pendingBox.replaceChildren(); historyBox.replaceChildren();
    const mine = requests.filter(r=>r.user_id===userId);
    if(!mine.length) treasuryText(ownBox,"p","Вы ещё не подавали заявок.");
    for(const r of mine) treasuryRow(ownBox,treasuryStatus(r.status),`${treasuryDate(r.created_at)} · ${r.comment || "Без комментария"}`,Number(r.amount));
    if(isAdmin) {
      const pending = requests.filter(r=>r.status==="pending");
      if(!pending.length) treasuryText(pendingBox,"p","Заявок на рассмотрении нет.");
      for(const r of pending) {
        const row = treasuryRow(pendingBox,names.get(r.user_id)||"Участник",`${treasuryDate(r.created_at)} · ${r.comment || "Без комментария"}`,Number(r.amount));
        const actions=document.createElement("div");actions.className="treasury-actions";
        for(const [label,approved] of [["Подтвердить",true],["Отклонить",false]]) {
          const btn=document.createElement("button");btn.type="button";btn.className="secondary-button";btn.textContent=label;
          btn.addEventListener("click",async()=>{
            if(treasuryBusy || !window.confirm(`${label} заявку на ${moneyFormat.format(r.amount)} грошей?`)) return;
            treasuryBusy=true;btn.disabled=true;
            try {const {error}=await supabaseClient.rpc("treasury_review_request",{p_request_id:r.id,p_approve:approved});if(error)throw error;showToast("Заявка обработана");await loadTreasury();}
            catch(e){showToast("Ошибка: "+e.message);}finally{treasuryBusy=false;btn.disabled=false;}
          });actions.appendChild(btn);
        }row.appendChild(actions);
      }
      const memberSelect=adminForm.elements.member;
      memberSelect.replaceChildren(new Option("Без привязки к участнику",""));
      for(const p of profiles.filter(p=>p.character_first_name||p.character_last_name).sort((a,b)=>(names.get(a.id)||"").localeCompare(names.get(b.id)||""))) memberSelect.add(new Option(names.get(p.id),p.id));
    }
    if(!tx.length) treasuryText(historyBox,"p","Подтверждённых операций пока нет.");
    for(const t of tx) treasuryRow(historyBox,t.description,`${treasuryDate(t.created_at)} · ${names.get(t.member_id)||"Общая операция"}`,Number(t.amount));
    treasuryNotice.textContent = tx.length===500 ? "Показаны последние 500 операций. Для полного архива позже добавим постраничную загрузку." : "Данные обновлены.";
  } catch(e) {treasuryNotice.textContent="Ошибка загрузки казны: "+e.message;}
}
document.getElementById("treasuryRefresh").addEventListener("click",loadTreasury);
document.getElementById("treasuryRequestForm").addEventListener("submit",async e=>{
  e.preventDefault();if(treasuryBusy)return;
  const form=e.currentTarget;const amount=Number(form.elements.amount.value);
  if(!Number.isSafeInteger(amount)||amount<=0)return showToast("Введите целое положительное число грошей.");
  treasuryBusy=true;
  try {const {error}=await supabaseClient.rpc("treasury_submit_request",{p_amount:amount,p_comment:form.elements.comment.value.trim()});if(error)throw error;form.reset();showToast("Заявка отправлена на рассмотрение");await loadTreasury();}
  catch(err){showToast("Ошибка: "+err.message);}finally{treasuryBusy=false;}
});
document.getElementById("treasuryManualForm").addEventListener("submit",async e=>{
  e.preventDefault();if(treasuryBusy || accessState.mode!=="admin")return;
  const form=e.currentTarget;const amount=Number(form.elements.amount.value);
  if(!Number.isSafeInteger(amount)||amount<=0)return showToast("Введите целое положительное число грошей.");
  const signed=form.elements.type.value==="expense"?-amount:amount;
  if(!window.confirm(`Записать ${signed<0?"расход":"поступление"} на ${moneyFormat.format(amount)} грошей?`))return;
  treasuryBusy=true;
  try {const {error}=await supabaseClient.rpc("treasury_add_transaction",{p_amount:signed,p_description:form.elements.description.value.trim(),p_member_id:form.elements.member.value||null});if(error)throw error;form.reset();showToast("Операция записана");await loadTreasury();}
  catch(err){showToast("Ошибка: "+err.message);}finally{treasuryBusy=false;}
});


// v1.0 — кладовая. Запись только через Supabase RPC; интерфейс не предоставляет прямой INSERT.
const storeNumber = new Intl.NumberFormat("ru-RU");
let storeBusy = false;
let storeLoadToken = 0;
let storeItems = [];
let storeBalances = new Map();
let storeCategories = [];
let storeProfiles = new Map();
const storeEl = id => document.getElementById(id);
function storeText(parent, tag, text, cls = "") {
  const element = document.createElement(tag);
  element.textContent = String(text ?? "");
  if (cls) element.className = cls;
  parent.appendChild(element);
  return element;
}
function storeItemName(id) { return storeItems.find(item => item.id === id)?.name || "Неизвестный предмет"; }
function storeDate(value) { return value ? new Date(value).toLocaleString("ru-RU") : "—"; }
function storeStatus(value) { return ({pending:"Ожидает",approved:"Подтверждена",rejected:"Отклонена"})[value] || value; }
function storeRecord(parent, title, details, quantity = null, status = "") {
  const row = document.createElement("div"); row.className = "treasury-row";
  const main = document.createElement("div");
  storeText(main,"strong",title); storeText(main,"small",details);
  row.appendChild(main);
  if (quantity !== null) storeText(row,"b",`${quantity > 0 ? "+" : ""}${storeNumber.format(quantity)} шт.`,quantity < 0 ? "treasury-negative" : "treasury-positive");
  if (status) storeText(row,"span",status,"treasury-status");
  parent.appendChild(row); return row;
}
async function storeAllRows(table, columns, sortColumn = "created_at") {
  const all = [];
  const chunk = 1000;
  for (let offset = 0; ; offset += chunk) {
    const {data,error} = await supabaseClient.from(table).select(columns).order(sortColumn,{ascending:false}).range(offset,offset + chunk - 1);
    if (error) throw error;
    all.push(...(data || []));
    if (!data || data.length < chunk) break;
    if (offset >= 99000) throw new Error("Слишком много записей. Требуется серверная агрегация остатков.");
  }
  return all;
}
function storePopulateSelect(select, items, emptyLabel) {
  const selected = select.value;
  select.replaceChildren(new Option(emptyLabel,""));
  for (const item of items) select.add(new Option(`${item.name} (${item.category})`,item.id));
  if (items.some(i => i.id === selected)) select.value = selected;
}
function renderStoreCatalog() {
  const query = storeEl("storeSearch").value.trim().toLocaleLowerCase("ru");
  const category = storeEl("storeCategory").value;
  const onlyAvailable = storeEl("storeOnlyAvailable").checked;
  const filtered = storeItems.filter(item =>
    (!query || item.name.toLocaleLowerCase("ru").includes(query)) &&
    (!category || item.category === category) &&
    (!onlyAvailable || (storeBalances.get(item.id) || 0) > 0)
  );
  storeEl("storeFilteredCount").textContent = `${filtered.length} из ${storeItems.length}`;
  const root = storeEl("storeCatalog"); root.replaceChildren();
  if (!filtered.length) {storeText(root,"p","Предметов по выбранным условиям нет.","store-muted");return;}
  for (const item of filtered) {
    const row = document.createElement("div");row.className="store-item";
    const details = document.createElement("div");
    storeText(details,"strong",item.name);
    storeText(details,"small",item.category);
    if (item.description) storeText(details,"small",item.description);
    row.appendChild(details);
    storeText(row,"b",`${storeNumber.format(storeBalances.get(item.id)||0)} ${item.unit || "шт."}`);
    const action=document.createElement("button");action.type="button";action.className="secondary-button";action.textContent="Заявка";
    action.addEventListener("click",()=>{
      storeEl("storeRequestForm").elements.namedItem("item").value=item.id;
      storeEl("storeRequestForm").scrollIntoView({behavior:"smooth",block:"start"});
    });
    row.appendChild(action);root.appendChild(row);
  }
}
async function loadStorehouse() {
  if (!supabaseClient || !currentSession?.user || !["approved","admin"].includes(accessState.mode)) return;
  const token=++storeLoadToken;
  const userId=currentSession.user.id;
  const isAdmin=accessState.mode==="admin";
  storeEl("storeManualForm").hidden=!isAdmin;
  storeEl("storeAddForm").hidden=!isAdmin;
  storeEl("storeAdminRequests").hidden=!isAdmin;
  storeEl("storeNotice").textContent="Сверяем амбарные книги…";
  try {
    const [items,transactions,requests,profiles] = await Promise.all([
      storeAllRows("storage_items","id,name,category,unit,description","name"),
      storeAllRows("storage_transactions","id,item_id,member_id,quantity,description,recorded_by,created_at"),
      storeAllRows("storage_requests","id,item_id,user_id,request_type,quantity,comment,status,created_at,reviewed_at"),
      storeAllRows("profiles","id,character_first_name,character_last_name","created_at")
    ]);
    if (token!==storeLoadToken || currentSession?.user?.id!==userId || !storehousePage.classList.contains("active-page")) return;
    storeItems=items.sort((a,b)=>a.name.localeCompare(b.name,"ru"));
    storeCategories=[...new Set(items.map(i=>i.category))].sort((a,b)=>a.localeCompare(b,"ru"));
    storeProfiles=new Map(profiles.map(p=>[p.id,[p.character_first_name,p.character_last_name].filter(Boolean).join(" ")||"Участник"]));
    storeBalances=new Map(items.map(item=>[item.id,0]));
    for (const t of transactions) storeBalances.set(t.item_id,(storeBalances.get(t.item_id)||0)+Number(t.quantity));
    storeEl("storeItemCount").textContent=storeNumber.format(items.length);
    storeEl("storeInStock").textContent=storeNumber.format(items.filter(item=>(storeBalances.get(item.id)||0)>0).length);
    storeEl("storePendingCount").textContent=storeNumber.format(requests.filter(r=>r.status==="pending").length);
    const categorySelect=storeEl("storeCategory");const currentCategory=categorySelect.value;
    categorySelect.replaceChildren(new Option("Все категории",""));
    for (const c of storeCategories) categorySelect.add(new Option(c,c));
    if(storeCategories.includes(currentCategory))categorySelect.value=currentCategory;
    const datalist=storeEl("storeCategoryOptions");datalist.replaceChildren();
    for(const c of storeCategories)datalist.appendChild(new Option(c,c));
    for(const formId of ["storeRequestForm","storeManualForm"])storePopulateSelect(storeEl(formId).elements.namedItem("item"),storeItems,"Выберите предмет");
    const members=profiles.filter(p=>p.character_first_name||p.character_last_name).sort((a,b)=>(storeProfiles.get(a.id)||"").localeCompare(storeProfiles.get(b.id)||"","ru"));
    const memberSelect=storeEl("storeManualForm").elements.member;const selectedMember=memberSelect.value;
    memberSelect.replaceChildren(new Option("Общая операция",""));
    for(const p of members)memberSelect.add(new Option(storeProfiles.get(p.id),p.id));
    if(members.some(p=>p.id===selectedMember))memberSelect.value=selectedMember;
    renderStoreCatalog();
    const own=storeEl("storeOwnRequests");own.replaceChildren();
    const mine=requests.filter(r=>r.user_id===userId);
    if(!mine.length)storeText(own,"p","Вы пока не подавали заявок.");
    for(const r of mine.slice(0,100)) {
      const sign=r.request_type==="deposit"?1:-1;
      storeRecord(own,`${storeItemName(r.item_id)} — ${r.request_type==="deposit"?"передача":"выдача"}`,`${storeDate(r.created_at)} · ${r.comment||"Без комментария"}`,sign*Number(r.quantity),storeStatus(r.status));
    }
    const pendingBox=storeEl("storePendingList");pendingBox.replaceChildren();
    if(isAdmin) {
      const pending=requests.filter(r=>r.status==="pending");
      if(!pending.length)storeText(pendingBox,"p","Заявок на рассмотрении нет.");
      for(const r of pending) {
        const sign=r.request_type==="deposit"?1:-1;
        const row=storeRecord(pendingBox,`${storeItemName(r.item_id)} · ${storeProfiles.get(r.user_id)||"Участник"}`,`${storeDate(r.created_at)} · ${r.comment||"Без комментария"}`,sign*Number(r.quantity));
        const actions=document.createElement("div");actions.className="treasury-actions";
        for(const [label,approve] of [["Подтвердить",true],["Отклонить",false]]) {
          const btn=document.createElement("button");btn.type="button";btn.className="secondary-button";btn.textContent=label;
          btn.addEventListener("click",async()=>{
            if(storeBusy || !window.confirm(`${label} заявку: ${storeItemName(r.item_id)} (${r.quantity} шт.)?`))return;
            storeBusy=true;btn.disabled=true;
            try {const {error}=await supabaseClient.rpc("storage_review_request",{p_request_id:r.id,p_approve:approve});if(error)throw error;showToast("Заявка обработана");await loadStorehouse();}
            catch(err){showToast("Ошибка: "+err.message);}finally{storeBusy=false;btn.disabled=false;}
          });actions.appendChild(btn);
        }row.appendChild(actions);
      }
    }
    const history=storeEl("storeHistory");history.replaceChildren();
    if(!transactions.length)storeText(history,"p","Операций пока нет.");
    for(const t of transactions.slice(0,100)) {
      const unit=storeItems.find(i=>i.id===t.item_id)?.unit||"шт.";
      const row=storeRecord(history,storeItemName(t.item_id),`${storeDate(t.created_at)} · ${t.description} · ${storeProfiles.get(t.member_id)||"Общая операция"}`,null);
      storeText(row,"b",`${Number(t.quantity)>0?"+":""}${storeNumber.format(Number(t.quantity))} ${unit}`,Number(t.quantity)<0?"treasury-negative":"treasury-positive");
    }
    storeEl("storeHistoryHint").textContent=transactions.length>100?`Показаны последние 100 из ${transactions.length} операций. Все операции учтены в остатках.`:"";
    storeEl("storeNotice").textContent="Данные обновлены. Остатки рассчитаны по всей доступной истории операций.";
  } catch(err) {storeEl("storeNotice").textContent="Ошибка загрузки кладовой: "+err.message;}
}
for(const id of ["storeSearch","storeCategory","storeOnlyAvailable"])storeEl(id).addEventListener(id==="storeCategory"?"change":"input",renderStoreCatalog);
storeEl("storeRefresh").addEventListener("click",loadStorehouse);
storeEl("storeRequestForm").addEventListener("submit",async event=>{
  event.preventDefault();if(storeBusy)return;
  const form=event.currentTarget;const quantity=Number(form.elements.quantity.value);
  if(!Number.isSafeInteger(quantity)||quantity<=0)return showToast("Укажите положительное целое количество.");
  if(!form.elements.namedItem("item").value)return showToast("Выберите предмет.");
  storeBusy=true;
  try {const {error}=await supabaseClient.rpc("storage_submit_request",{p_item_id:form.elements.namedItem("item").value,p_request_type:form.elements.type.value,p_quantity:quantity,p_comment:form.elements.comment.value.trim()});if(error)throw error;form.reset();showToast("Заявка отправлена");await loadStorehouse();}
  catch(err){showToast("Ошибка: "+err.message);}finally{storeBusy=false;}
});
storeEl("storeManualForm").addEventListener("submit",async event=>{
  event.preventDefault();if(storeBusy||accessState.mode!=="admin")return;
  const form=event.currentTarget;const quantity=Number(form.elements.quantity.value);
  if(!Number.isSafeInteger(quantity)||quantity<=0)return showToast("Укажите положительное целое количество.");
  const signed=form.elements.type.value==="withdraw"?-quantity:quantity;
  if(!form.elements.namedItem("item").value)return showToast("Выберите предмет.");
  if(!window.confirm(`Записать ${signed<0?"выдачу":"поступление"} ${quantity} шт. предмета «${storeItemName(form.elements.namedItem("item").value)}»?`))return;
  storeBusy=true;
  try {const {error}=await supabaseClient.rpc("storage_add_transaction",{p_item_id:form.elements.namedItem("item").value,p_quantity:signed,p_description:form.elements.description.value.trim(),p_member_id:form.elements.member.value||null});if(error)throw error;form.reset();showToast("Операция записана");await loadStorehouse();}
  catch(err){showToast("Ошибка: "+err.message);}finally{storeBusy=false;}
});
storeEl("storeAddForm").addEventListener("submit",async event=>{
  event.preventDefault();if(storeBusy||accessState.mode!=="admin")return;
  const form=event.currentTarget;storeBusy=true;
  try {const {error}=await supabaseClient.rpc("storage_add_item",{p_name:form.elements.namedItem("name").value.trim(),p_category:form.elements.category.value.trim(),p_unit:form.elements.unit.value.trim(),p_description:form.elements.description.value.trim()});if(error)throw error;form.reset();showToast("Предмет добавлен в каталог");await loadStorehouse();}
  catch(err){showToast("Ошибка: "+err.message);}finally{storeBusy=false;}
});
