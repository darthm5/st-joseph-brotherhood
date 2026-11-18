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
  market: ["Рынок", "Объявления о покупке и продаже ресурсов и изделий."],
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
const workPage = document.getElementById("page-work");
const marketPage = document.getElementById("page-market");
const calendarPage = document.getElementById("page-calendar");
const libraryPage = document.getElementById("page-info");
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
  workPage.classList.toggle("active-page", page === "work");
  marketPage.classList.toggle("active-page", page === "market");
  calendarPage.classList.toggle("active-page", page === "calendar");
  libraryPage.classList.toggle("active-page", page === "info");
  managementPage.classList.toggle("active-page", page === "management");
  waitingPage.classList.toggle("active-page", page === "waiting");
  if (page === "waiting") showWaiting();
  if (page === "management") loadAdminPanel();
  if (page === "members") loadMembers();
  if (page === "crafts") loadDirectory();
  if (page === "treasury") loadTreasury();
  if (page === "storehouse") loadStorehouse();
  if (page === "work") loadWork();
  if (page === "market") loadMarket();
  if (page === "calendar") loadCalendar();
  if (page === "info") loadLibrary();
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
  } else if (page === "treasury" || page === "storehouse" || page === "work" || page === "market" || page === "calendar" || page === "info") {
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
const storeEl = id => document.getElementById(id);
let storeSection = "materials";
const storeProductCategories = ["Броня","Оружие","Портняжное","Лучное","Ювелирное","Алхимия","Готовка","Пивоварение","Столярное"];
function storeVisibleItems(){ return storeItems.filter(i => (i.section || "materials") === storeSection); }
function storeSetSection(section){
  storeSection=section;
  for(const [id,value] of [["storeTabMaterials","materials"],["storeTabProducts","products"]]){const b=storeEl(id);b.classList.toggle("active",section===value);b.setAttribute("aria-selected",String(section===value));}
  storeEl("storeCategory").value="";storeEl("storeSearch").value="";
  storeEl("storeNewSection").value=section;
  storeRenderFilters();renderStoreCatalog();
}
function storeRenderFilters(){
  const categories=[...new Set(storeVisibleItems().map(i=>i.category))];
  if(storeSection==="products")for(const c of storeProductCategories)if(!categories.includes(c))categories.push(c);
  categories.sort((a,b)=>a.localeCompare(b,"ru"));
  const select=storeEl("storeCategory"),old=select.value;select.replaceChildren(new Option("Все категории",""));
  for(const c of categories)select.add(new Option(c,c));if(categories.includes(old))select.value=old;
  const datalist=storeEl("storeCategoryOptions");datalist.replaceChildren();
  const addCategories=storeEl("storeNewSection").value==="products"?storeProductCategories:[...new Set(storeItems.filter(i=>(i.section||"materials")==="materials").map(i=>i.category))].sort((a,b)=>a.localeCompare(b,"ru"));
  for(const c of addCategories)datalist.appendChild(new Option(c,c));
}
storeEl("storeTabMaterials").addEventListener("click",()=>storeSetSection("materials"));
storeEl("storeTabProducts").addEventListener("click",()=>storeSetSection("products"));
storeEl("storeNewSection").addEventListener("change",storeRenderFilters);
let storeBalances = new Map();
let storeCategories = [];
let storeProfiles = new Map();
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
// Каскадные фильтры: раздел → категория → предмет с текущим остатком.
function storeCascade(form) {
  const section=form.querySelector('[data-store-section]');
  const category=form.querySelector('[data-store-category]');
  const item=form.elements.namedItem('item');
  function refreshCategories() {
    category.replaceChildren(new Option('Выберите категорию',''));
    const cats=[...new Set(storeItems.filter(x=>(x.section||'materials')===section.value).map(x=>x.category))].sort((a,b)=>a.localeCompare(b,'ru'));
    for(const c of cats)category.add(new Option(c,c));
    category.disabled=!section.value;
    category.value='';
    refreshItems();
  }
  function refreshItems(keepSelection=false) {
    const old=keepSelection?item.value:'';
    item.replaceChildren(new Option('Выберите предмет',''));
    const matches=storeItems.filter(x=>(x.section||'materials')===section.value && x.category===category.value).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
    for(const x of matches){
      const balance=storeNumber.format(storeBalances.get(x.id)||0);
      item.add(new Option(`${x.name} — ${balance} ${x.unit||'шт.'}`,x.id));
    }
    item.disabled=!category.value;
    if(matches.some(x=>x.id===old))item.value=old;
  }
  section.addEventListener('change',refreshCategories);
  category.addEventListener('change',()=>refreshItems());
  return {
    update(){
      const current=item.value;
      const chosen=storeItems.find(x=>x.id===current);
      const desired=chosen?(chosen.section||'materials'):section.value;
      section.value=desired||'';
      refreshCategories();
      if(chosen){category.value=chosen.category;refreshItems();item.value=chosen.id;}
    },
    choose(id){
      const chosen=storeItems.find(x=>x.id===id);if(!chosen)return;
      section.value=chosen.section||'materials';refreshCategories();
      category.value=chosen.category;refreshItems();item.value=id;
    },
    reset(){section.value='';refreshCategories();}
  };
}
const storeRequestCascade=storeCascade(storeEl('storeRequestForm'));
const storeManualCascade=storeCascade(storeEl('storeManualForm'));
const storePanelIds=['storeRequestForm','storeManualForm','storeAddForm','storeOwnRequestsPanel','storeAdminRequests','storeHistoryPanel'];
let storeActivePanel=null;
function storeOpenPanel(id, scroll=true){
  if(id && !storePanelIds.includes(id))return;
  if(id && ['storeManualForm','storeAddForm','storeAdminRequests'].includes(id) && accessState.mode!=='admin')return;
  storeActivePanel=id;
  for(const panelId of storePanelIds){
    storeEl(panelId).hidden=panelId!==id;
  }
  for(const button of document.querySelectorAll('[data-store-panel]')){
    const expanded=button.dataset.storePanel===id;
    button.setAttribute('aria-expanded',String(expanded));
    button.classList.toggle('store-action-active',expanded);
  }
  if(id && scroll)storeEl(id).scrollIntoView({behavior:'smooth',block:'nearest'});
}
for(const button of document.querySelectorAll('[data-store-panel]')){
  button.addEventListener('click',()=>storeOpenPanel(storeActivePanel===button.dataset.storePanel?null:button.dataset.storePanel));
}

function renderStoreCatalog() {
  const query = storeEl("storeSearch").value.trim().toLocaleLowerCase("ru");
  const category = storeEl("storeCategory").value;
  const onlyAvailable = storeEl("storeOnlyAvailable").checked;
  const visibleItems=storeVisibleItems();
  const filtered = visibleItems.filter(item =>
    (!query || item.name.toLocaleLowerCase("ru").includes(query)) &&
    (!category || item.category === category) &&
    (!onlyAvailable || (storeBalances.get(item.id) || 0) > 0)
  );
  storeEl("storeFilteredCount").textContent = `${filtered.length} из ${visibleItems.length}`;
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
      storeRequestCascade.choose(item.id);
      storeOpenPanel("storeRequestForm");
    });
    row.appendChild(action);root.appendChild(row);
  }
}
async function loadStorehouse() {
  if (!supabaseClient || !currentSession?.user || !["approved","admin"].includes(accessState.mode)) return;
  const token=++storeLoadToken;
  const userId=currentSession.user.id;
  const isAdmin=accessState.mode==="admin";
  for(const button of document.querySelectorAll("[data-store-admin]"))button.hidden=!isAdmin;
  if(!isAdmin && ["storeManualForm","storeAddForm","storeAdminRequests"].includes(storeActivePanel))storeActivePanel=null;
  storeOpenPanel(storeActivePanel,false);
  storeEl("storeNotice").textContent="Сверяем амбарные книги…";
  try {
    const [items,transactions,requests,profiles] = await Promise.all([
      storeAllRows("storage_items","id,name,category,unit,description,section","name"),
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
    storeRenderFilters();
    storeRequestCascade.update();storeManualCascade.update();
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
  try {const {error}=await supabaseClient.rpc("storage_submit_request",{p_item_id:form.elements.namedItem("item").value,p_request_type:form.elements.type.value,p_quantity:quantity,p_comment:form.elements.comment.value.trim()});if(error)throw error;form.reset();storeRequestCascade.reset();showToast("Заявка отправлена");await loadStorehouse();}
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
  try {const {error}=await supabaseClient.rpc("storage_add_transaction",{p_item_id:form.elements.namedItem("item").value,p_quantity:signed,p_description:form.elements.description.value.trim(),p_member_id:form.elements.member.value||null});if(error)throw error;form.reset();storeManualCascade.reset();showToast("Операция записана");await loadStorehouse();}
  catch(err){showToast("Ошибка: "+err.message);}finally{storeBusy=false;}
});
storeEl("storeAddForm").addEventListener("submit",async event=>{
  event.preventDefault();if(storeBusy||accessState.mode!=="admin")return;
  const form=event.currentTarget;storeBusy=true;
  try {const section=form.elements.namedItem("section").value;const category=form.elements.category.value.trim();if(section==="products"&&!storeProductCategories.includes(category))throw new Error("Выберите одну из девяти категорий готовой продукции");const {error}=await supabaseClient.rpc(section==="products"?"storage_add_product_item":"storage_add_item",{p_name:form.elements.namedItem("name").value.trim(),p_category:category,p_unit:form.elements.unit.value.trim(),p_description:form.elements.description.value.trim()});if(error)throw error;form.reset();storeEl("storeNewSection").value=storeSection;showToast("Предмет добавлен в каталог");await loadStorehouse();}
  catch(err){showToast("Ошибка: "+err.message);}finally{storeBusy=false;}
});


// WORK v1.2 — all panels closed by default, one panel at a time.
const workEl = id => document.getElementById(id);
let workTab = 'public';
let workPanel = null;
let workLoadToken = 0;
let workBusy = false;
let workTasks = [];
let workReports = [];
let workPeople = new Map();
const workDate = value => value ? new Date(value).toLocaleString('ru-RU') : 'Без срока';
const workStatusNames = {open:'Свободно',assigned:'В работе',submitted:'Отчёт на проверке',completed:'Завершено',cancelled:'Отменено'};
function workNode(tag, content, className='') {
  const node=document.createElement(tag);
  if(content!==undefined && content!==null)node.textContent=String(content);
  if(className)node.className=className;
  return node;
}
function workOpenPanel(id) {
  workPanel = workPanel===id ? null : id;
  for(const panel of document.querySelectorAll('.work-panel'))panel.hidden=panel.id!==workPanel;
  // Показываем основную доску только когда дополнительные панели закрыты.
  workEl('workBoardPanel').hidden=Boolean(workPanel);
  for(const button of document.querySelectorAll('[data-work-panel]')){
    const expanded=button.dataset.workPanel===workPanel;
    button.setAttribute('aria-expanded',String(expanded));
    button.classList.toggle('work-selected',expanded);
  }
}
function workShowReport(task) {
  workOpenPanel(workPanel==='workReportPanel'?null:'workReportPanel');
  if(workPanel==='workReportPanel'){
    workEl('workReportForm').elements.namedItem('task_id').value=task.id;
    workEl('workReportTitle').textContent='Отчёт: '+task.title;
    workEl('workReportPanel').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
}
function workAction(parent,label,callback) {
  const button=workNode('button',label,'secondary-button');button.type='button';
  button.addEventListener('click',callback);parent.appendChild(button);return button;
}
function workCard(parent,task,kind='board') {
  const card=workNode('article',null,'work-card');
  const top=workNode('div',null,'work-card-top');
  top.append(workNode('strong',task.title),workNode('span',workStatusNames[task.status]||task.status,'treasury-status'));
  card.append(top);
  card.append(workNode('small',`${task.category} · ${task.task_type==='personal'?'Личное':'Общее'} · Награда: ${task.reward_amount} грошей`));
  if(task.description)card.append(workNode('p',task.description));
  card.append(workNode('small',`Срок: ${workDate(task.deadline)} · Исполнитель: ${workPeople.get(task.assigned_to)||'Не назначен'}`));
  const actions=workNode('div',null,'treasury-actions');
  const mine=task.assigned_to===currentSession?.user?.id;
  if(kind==='board' && task.status==='open' && task.task_type==='public')
    workAction(actions,'Взять поручение',()=>workPerform('work_claim_task',{p_task_id:task.id},'Поручение принято',`Взять поручение «${task.title}»?`));
  if((kind==='board'||kind==='mine') && mine && task.status==='assigned')
    workAction(actions,'Отправить отчёт',()=>workShowReport(task));
  if(accessState.mode==='admin' && !['completed','cancelled','submitted'].includes(task.status))
    workAction(actions,'Отменить',()=>workPerform('work_cancel_task',{p_task_id:task.id},'Поручение отменено',`Отменить «${task.title}»?`));
  if(actions.childNodes.length)card.append(actions);
  parent.append(card);
}
function workRender() {
  const personal=workTab==='personal';
  workEl('workListTitle').textContent=personal?'Личные поручения':'Доска общих поручений';
  const filtered=workTasks.filter(t=>t.task_type===workTab && !['completed','cancelled'].includes(t.status));
  workEl('workCount').textContent=`${filtered.length} поручений`;
  const board=workEl('workTaskList');board.replaceChildren();
  if(!filtered.length)board.append(workNode('p',personal?'Личных поручений пока нет.':'Общих поручений пока нет.','store-muted'));
  for(const task of filtered)workCard(board,task);
  const mine=workEl('workMineList');mine.replaceChildren();
  const myTasks=workTasks.filter(t=>t.assigned_to===currentSession?.user?.id && !['completed','cancelled'].includes(t.status));
  if(!myTasks.length)mine.append(workNode('p','Активных заданий нет.','store-muted'));
  for(const task of myTasks)workCard(mine,task,'mine');
  const archive=workEl('workArchiveList');archive.replaceChildren();
  const archived=workTasks.filter(t=>['completed','cancelled'].includes(t.status));
  if(!archived.length)archive.append(workNode('p','Архив пока пуст.','store-muted'));
  for(const task of archived)workCard(archive,task,'archive');
  const reports=workEl('workReportsList');reports.replaceChildren();
  if(accessState.mode==='admin'){
    const pending=workReports.filter(r=>r.status==='pending');
    if(!pending.length)reports.append(workNode('p','Отчётов на проверке нет.','store-muted'));
    for(const r of pending){
      const task=workTasks.find(t=>t.id===r.task_id);
      const card=workNode('article',null,'work-card');
      card.append(workNode('strong',task?.title||'Поручение'),workNode('small',`${workPeople.get(r.user_id)||'Участник'} · ${workDate(r.created_at)}`),workNode('p',r.report_text));
      const actions=workNode('div',null,'treasury-actions');
      workAction(actions,'Подтвердить',()=>workPerform('work_review_report',{p_report_id:r.id,p_approve:true},'Отчёт принят',`Подтвердить отчёт по «${task?.title||'поручению'}»?`));
      workAction(actions,'Отклонить',()=>workPerform('work_review_report',{p_report_id:r.id,p_approve:false},'Отчёт отклонён',`Отклонить отчёт? Исполнитель сможет отправить новый.`));
      card.append(actions);reports.append(card);
    }
  }
}
async function workFetchAll(table,columns,sort='created_at') {
  const rows=[];
  for(let offset=0;offset<10000;offset+=500){
    const {data,error}=await supabaseClient.from(table).select(columns).order(sort,{ascending:false}).range(offset,offset+499);
    if(error)throw error;
    rows.push(...(data||[]));if(!data||data.length<500)return rows;
  }
  throw new Error('Слишком много записей для загрузки.');
}
async function loadWork() {
  if(!supabaseClient||!currentSession?.user||!['approved','admin'].includes(accessState.mode))return;
  const token=++workLoadToken;
  const admin=accessState.mode==='admin';
  for(const button of document.querySelectorAll('[data-work-admin]'))button.hidden=!admin;
  if(!admin && ['workCreatePanel','workReportsPanel'].includes(workPanel))workOpenPanel(workPanel);
  workEl('workNotice').textContent='Загружаем поручения…';
  try{
    const [tasks,reports,people]=await Promise.all([
      workFetchAll('work_tasks','id,title,description,category,task_type,status,reward_amount,assigned_to,created_by,deadline,created_at'),
      admin?workFetchAll('work_reports','id,task_id,user_id,report_text,status,created_at'):Promise.resolve([]),
      workFetchAll('profiles','id,character_first_name,character_last_name,membership_status','created_at')
    ]);
    if(token!==workLoadToken)return;
    workTasks=tasks;workReports=reports;
    workPeople=new Map(people.map(p=>[p.id,[p.character_first_name,p.character_last_name].filter(Boolean).join(' ')||'Участник']));
    const assignee=workEl('workAssignee');assignee.replaceChildren(new Option('Выберите участника',''));
    for(const p of people.filter(p=>p.membership_status==='approved').sort((a,b)=>(workPeople.get(a.id)||'').localeCompare(workPeople.get(b.id)||'','ru')))
      assignee.add(new Option(workPeople.get(p.id),p.id));
    workRender();
    workEl('workNotice').textContent='Поручения обновлены.';
  }catch(err){if(token===workLoadToken)workEl('workNotice').textContent='Ошибка загрузки поручений: '+err.message;}
}
async function workPerform(rpc,args,success,confirmText){
  if(workBusy)return;
  if(confirmText&&!window.confirm(confirmText))return;
  workBusy=true;
  try{const {error}=await supabaseClient.rpc(rpc,args);if(error)throw error;showToast(success);await loadWork();}
  catch(err){showToast('Ошибка: '+err.message);}finally{workBusy=false;}
}
for(const button of document.querySelectorAll('[data-work-panel]'))button.addEventListener('click',()=>workOpenPanel(button.dataset.workPanel));
workEl('workTabPublic').addEventListener('click',()=>workSwitchTab('public'));
workEl('workTabPersonal').addEventListener('click',()=>workSwitchTab('personal'));
function workSwitchTab(tab){
  workTab=tab;
  for(const [id,value] of [['workTabPublic','public'],['workTabPersonal','personal']]){
    const b=workEl(id);b.classList.toggle('active',tab===value);b.setAttribute('aria-selected',String(tab===value));
  }
  if(workPanel)workOpenPanel(workPanel);
  workRender();
}
workEl('workRefresh').addEventListener('click',loadWork);
workEl('workCreateType').addEventListener('change',event=>{
  const personal=event.target.value==='personal';
  workEl('workAssigneeLabel').hidden=!personal;
  workEl('workAssignee').required=personal;
});
workEl('workCreatePanel').addEventListener('submit',async event=>{
  event.preventDefault();if(workBusy||accessState.mode!=='admin')return;
  const f=event.currentTarget;
  const amount=Number(f.elements.namedItem('reward_amount').value);
  if(!Number.isSafeInteger(amount)||amount<0)return showToast('Укажите целую неотрицательную награду.');
  const deadline=f.elements.namedItem('deadline').value;
  const args={p_title:f.elements.namedItem('title').value.trim(),p_description:f.elements.namedItem('description').value.trim(),p_category:f.elements.namedItem('category').value,p_task_type:f.elements.namedItem('task_type').value,p_reward_amount:amount,p_assigned_to:f.elements.namedItem('assigned_to').value||null,p_deadline:deadline?new Date(deadline).toISOString():null};
  workBusy=true;
  try{const {error}=await supabaseClient.rpc('work_create_task',args);if(error)throw error;f.reset();workEl('workAssigneeLabel').hidden=true;workEl('workAssignee').required=false;workOpenPanel('workCreatePanel');showToast('Поручение создано');await loadWork();}
  catch(err){showToast('Ошибка: '+err.message);}finally{workBusy=false;}
});
workEl('workReportForm').addEventListener('submit',async event=>{
  event.preventDefault();if(workBusy)return;
  const f=event.currentTarget;
  const args={p_task_id:f.elements.namedItem('task_id').value,p_report_text:f.elements.namedItem('report_text').value.trim()};
  workBusy=true;
  try{const {error}=await supabaseClient.rpc('work_submit_report',args);if(error)throw error;f.reset();workOpenPanel('workReportPanel');showToast('Отчёт отправлен на проверку');await loadWork();}
  catch(err){showToast('Ошибка: '+err.message);}finally{workBusy=false;}
});


// MARKET v1.3.1: multi-item listings; items selected from the storehouse catalog.
const marketEl = id => document.getElementById(id);
const marketNode = (tag,text,cls='') => {const el=document.createElement(tag);if(text!==null&&text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;};
let marketPanel=null,marketEditing=null,marketRows=[],marketNames=new Map(),marketLoadToken=0,marketBusy=false,marketCatalog=[];
const marketTypeNames={sell:'Продам',buy:'Куплю'};
function marketOpenPanel(id,force=false){
  marketPanel=force?id:(marketPanel===id?null:id);
  for(const el of document.querySelectorAll('#page-market .market-panel'))el.hidden=el.id!==marketPanel;
  marketEl('marketBoardPanel').hidden=Boolean(marketPanel);
  for(const b of document.querySelectorAll('[data-market-panel]')){const active=b.dataset.marketPanel===marketPanel;b.setAttribute('aria-expanded',String(active));b.classList.toggle('store-action-active',active);}
}
function marketSelect(options,cls){const s=marketNode('select',null,cls);for(const [value,label] of options)s.add(new Option(label,value));return s;}
function marketAddRow(item=null){
  const wrap=marketNode('div',null,'market-item-row');
  const section=marketSelect([['materials','Материалы и ресурсы'],['products','Готовая продукция']]);
  const category=marketSelect([]),product=marketSelect([]);
  const quantity=marketNode('input'),price=marketNode('input');
  quantity.type='number';quantity.min='1';quantity.max='100000000';quantity.step='1';quantity.required=true;quantity.value=String(item?.quantity??1);
  price.type='number';price.min='0';price.step='1';price.placeholder='По договорённости';if(item?.price!=null)price.value=String(item.price);
  const remove=marketNode('button','Удалить позицию','secondary-button');remove.type='button';remove.addEventListener('click',()=>{wrap.remove();});
  function updateCategories(wanted){
    const cats=[...new Set(marketCatalog.filter(x=>(x.section||'materials')===section.value).map(x=>x.category))].sort((a,b)=>a.localeCompare(b,'ru'));
    category.replaceChildren(...cats.map(x=>new Option(x,x)));
    if(wanted&&cats.includes(wanted))category.value=wanted;
    updateProducts(item?.item_id);
  }
  function updateProducts(wanted){
    const matches=marketCatalog.filter(x=>(x.section||'materials')===section.value&&x.category===category.value).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
    product.replaceChildren(...matches.map(x=>new Option(x.name,x.id)));
    if(wanted&&matches.some(x=>x.id===wanted))product.value=wanted;
  }
  section.addEventListener('change',()=>updateCategories());category.addEventListener('change',()=>updateProducts());
  const selected=marketCatalog.find(x=>x.id===item?.item_id);if(selected)section.value=selected.section||'materials';
  updateCategories(selected?.category);
  for(const [label,el] of [['Раздел',section],['Категория',category],['Предмет',product],['Количество',quantity],['Цена за единицу, грошей',price]]){const field=marketNode('label',label);field.append(el);wrap.append(field);}
  wrap.append(remove);marketEl('marketItemRows').append(wrap);
  return wrap;
}
function marketResetForm(){marketEditing=null;marketEl('marketCreatePanel').reset();marketEl('marketItemRows').replaceChildren();marketAddRow();marketEl('marketFormTitle').textContent='Новое объявление';marketEl('marketSubmit').textContent='Опубликовать объявление';}
function marketStartEdit(ad){
  marketResetForm();marketEditing=ad.id;const f=marketEl('marketCreatePanel');
  for(const [name,value] of Object.entries({ad_type:ad.ad_type,title:ad.title,description:ad.description,contact:ad.contact}))f.elements.namedItem(name).value=value??'';
  marketEl('marketItemRows').replaceChildren();
  for(const item of ad.market_ad_items||[])marketAddRow(item);
  if(!ad.market_ad_items?.length)marketAddRow();
  marketEl('marketFormTitle').textContent='Редактирование объявления';marketEl('marketSubmit').textContent='Сохранить изменения';marketOpenPanel('marketCreatePanel',true);f.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function marketAction(parent,label,fn){const b=marketNode('button',label,'secondary-button');b.type='button';b.addEventListener('click',fn);parent.append(b);}
function marketCard(ad){
  const card=marketNode('article',null,'work-card market-ad-'+(ad.status==='active'?'fresh':ad.status==='deal'?'deal':ad.status==='completed'?'completed':'closed'));const top=marketNode('div',null,'work-card-top');
  const statusText=ad.status==='deal'?'Сделка':ad.status==='completed'?'Завершено':ad.status==='closed'?'Закрыто':marketTypeNames[ad.ad_type]||'Архив';
  top.append(marketNode('strong',ad.title),marketNode('span',statusText,'treasury-status'));card.append(top);
  if(['deal','completed'].includes(ad.status))card.append(marketNode('p',(ad.status==='completed'?'✓ Сделка завершена с ':'🤝 Сделка с ')+(marketNames.get(ad.deal_with)||'участником братства'),'market-deal-person'));
  if(ad.status==='completed'&&ad.completed_at)card.append(marketNode('small','Дата завершения: '+new Date(ad.completed_at).toLocaleString('ru-RU')));
  const items=ad.market_ad_items||[];
  if(items.length){const list=marketNode('ul',null,'market-card-items');for(const it of items)list.append(marketNode('li',`${it.item_name} — ${it.quantity} ${it.unit||'шт.'} · ${it.price==null?'Цена договорная':it.price+' грошей/ед.'}`));card.append(list);}
  else card.append(marketNode('small',`${ad.category} · ${ad.quantity} шт. · ${ad.price==null?'Цена договорная':ad.price+' грошей'} (старое объявление)`));
  if(ad.description)card.append(marketNode('p',ad.description));
  card.append(marketNode('small',`Автор: ${marketNames.get(ad.author_id)||'Участник'} · ${new Date(ad.created_at).toLocaleString('ru-RU')}`));
  if(ad.contact)card.append(marketNode('small',`Связь: ${ad.contact}`));
  const mine=ad.author_id===currentSession?.user?.id;
  if(ad.status==='active'&&!mine){
    const actions=marketNode('div',null,'treasury-actions');
    marketAction(actions,'🤝 Сделка',()=>marketRpc('market_take_deal',{p_id:ad.id},'Сделка закреплена за вами',`Закрепить объявление «${ad.title}» за собой?`));card.append(actions);
  }
  if(mine||accessState.mode==='admin'){
    const actions=marketNode('div',null,'treasury-actions');
    if(mine){
      if(ad.status==='active'&&ad.ad_type!=='exchange'&&items.every(x=>x.item_id))marketAction(actions,'Изменить',()=>marketStartEdit(ad));
      if(ad.status==='deal')marketAction(actions,'✓ Завершить сделку',()=>marketRpc('market_complete_deal',{p_id:ad.id},'Сделка завершена',`Подтвердить завершение сделки «${ad.title}»?`));
      if(ad.status==='deal')marketAction(actions,'Отменить сделку',()=>marketRpc('market_cancel_deal',{p_id:ad.id},'Объявление снова доступно','Отменить закреплённую сделку?'));
      if(['active','closed'].includes(ad.status))marketAction(actions,ad.status==='active'?'Закрыть':'Открыть',()=>marketRpc('market_set_status',{p_id:ad.id,p_status:ad.status==='active'?'closed':'active'},'Статус обновлён'));
    }
    marketAction(actions,'Удалить',()=>marketRpc('market_delete_ad',{p_id:ad.id},'Объявление удалено',`Удалить объявление «${ad.title}»?`));card.append(actions);
  }
  return card;
}
function marketRender(){
  const myId=currentSession?.user?.id,active=marketRows.filter(ad=>['active','deal'].includes(ad.status)&&ad.ad_type!=='exchange');
  const type=marketEl('marketFilterType').value,category=marketEl('marketFilterCategory').value,search=marketEl('marketSearch').value.trim().toLocaleLowerCase('ru');
  const visible=active.filter(ad=>{
    const items=ad.market_ad_items||[];
    const matchesCategory=category==='all'||ad.category===category||items.some(it=>it.category===category);
    const haystack=[ad.title,ad.description,ad.category,...items.flatMap(it=>[it.item_name,it.category])].join(' ').toLocaleLowerCase('ru');
    return (type==='all'||ad.ad_type===type)&&matchesCategory&&(!search||haystack.includes(search));
  });
  const board=marketEl('marketAdList');board.replaceChildren();for(const ad of visible)board.append(marketCard(ad));
  if(!visible.length)board.append(marketNode('p','Объявлений по выбранным условиям пока нет.','store-muted'));
  marketEl('marketCount').textContent=`Найдено: ${visible.length}`;
  const mine=marketEl('marketMineList');mine.replaceChildren();const own=marketRows.filter(ad=>ad.author_id===myId);
  for(const ad of own)mine.append(marketCard(ad));if(!own.length)mine.append(marketNode('p','Вы пока не размещали объявления.','store-muted'));
  const archive=marketEl('marketArchiveList');archive.replaceChildren();const done=marketRows.filter(ad=>ad.status==='completed'&&ad.ad_type!=='exchange').sort((a,b)=>new Date(b.completed_at||b.created_at)-new Date(a.completed_at||a.created_at));for(const ad of done)archive.append(marketCard(ad));if(!done.length)archive.append(marketNode('p','Завершённых сделок пока нет.','store-muted'));
}
async function loadMarket(){
  if(!supabaseClient||!currentSession?.user||!['approved','admin'].includes(accessState.mode))return;
  const token=++marketLoadToken;marketEl('marketNotice').textContent='Загружаем объявления…';
  try{
    const [ads,people,catalog]=await Promise.all([
      supabaseClient.from('market_ads').select('id,author_id,deal_with,deal_at,completed_at,ad_type,category,title,description,quantity,price,contact,status,created_at,market_ad_items(id,item_id,item_name,category,unit,quantity,price)').order('created_at',{ascending:false}).limit(1000),
      supabaseClient.from('profiles').select('id,character_first_name,character_last_name').limit(1000),
      supabaseClient.from('storage_items').select('id,name,category,unit,section').order('name').limit(5000)
    ]);
    if(ads.error)throw ads.error;if(people.error)throw people.error;if(catalog.error)throw catalog.error;if(token!==marketLoadToken)return;
    marketRows=ads.data||[];marketCatalog=catalog.data||[];
    marketNames=new Map((people.data||[]).map(p=>[p.id,[p.character_first_name,p.character_last_name].filter(Boolean).join(' ')||'Участник']));
    const filter=marketEl('marketFilterCategory'),old=filter.value;filter.replaceChildren(new Option('Все категории','all'));
    const cats=new Set();for(const a of marketRows.filter(a=>['active','deal'].includes(a.status))){cats.add(a.category);for(const it of a.market_ad_items||[])cats.add(it.category);}
    for(const cat of [...cats].sort((a,b)=>a.localeCompare(b,'ru')))filter.add(new Option(cat,cat));
    if([...filter.options].some(o=>o.value===old))filter.value=old;
    marketRender();marketEl('marketNotice').textContent='Объявления обновлены.';
  }catch(err){if(token===marketLoadToken)marketEl('marketNotice').textContent='Ошибка загрузки рынка: '+err.message;}
}
async function marketRpc(name,args,success,confirmText){
  if(marketBusy)return;if(confirmText&&!window.confirm(confirmText))return;marketBusy=true;
  try{const {error}=await supabaseClient.rpc(name,args);if(error)throw error;showToast(success);await loadMarket();}
  catch(err){showToast('Ошибка: '+err.message);}finally{marketBusy=false;}
}
for(const b of document.querySelectorAll('[data-market-panel]'))b.addEventListener('click',()=>{if(b.dataset.marketPanel==='marketCreatePanel'&&marketPanel!=='marketCreatePanel')marketResetForm();marketOpenPanel(b.dataset.marketPanel);});
marketEl('marketAddItem').addEventListener('click',()=>{if(marketEl('marketItemRows').children.length>=30)return showToast('Не более 30 позиций.');marketAddRow();});
marketEl('marketRefresh').addEventListener('click',loadMarket);
for(const id of ['marketFilterType','marketFilterCategory'])marketEl(id).addEventListener('change',marketRender);
marketEl('marketSearch').addEventListener('input',marketRender);
marketEl('marketCancelEdit').addEventListener('click',()=>{marketResetForm();marketOpenPanel(null,true);});
marketEl('marketCreatePanel').addEventListener('submit',async e=>{
  e.preventDefault();if(marketBusy)return;const f=e.currentTarget;
  const items=[];
  for(const row of marketEl('marketItemRows').children){
    const [section,category,product,quantity,price]=row.querySelectorAll('select,input');
    const item_id=product.value,q=Number(quantity.value),p=price.value.trim()===''?null:Number(price.value);
    if(!item_id||!Number.isSafeInteger(q)||q<1||q>100000000||(p!==null&&(!Number.isSafeInteger(p)||p<0)))return showToast('Проверьте выбранные товары, количество и цены.');
    items.push({item_id,quantity:q,price:p});
  }
  if(!items.length||items.length>30||new Set(items.map(x=>x.item_id)).size!==items.length)return showToast('Добавь от 1 до 30 разных товаров.');
  const fields={p_type:f.elements.namedItem('ad_type').value,p_title:f.elements.namedItem('title').value.trim(),p_description:f.elements.namedItem('description').value.trim(),p_contact:f.elements.namedItem('contact').value.trim(),p_items:items};
  const editing=marketEditing,rpc=editing?'market_edit_listing':'market_create_listing',args=editing?{p_id:editing,...fields}:fields;
  marketBusy=true;
  try{const {error}=await supabaseClient.rpc(rpc,args);if(error)throw error;marketResetForm();marketOpenPanel(null,true);showToast(editing?'Объявление обновлено':'Объявление опубликовано');await loadMarket();}
  catch(err){showToast('Ошибка: '+err.message);}finally{marketBusy=false;}
});


// Calendar v1.4 — only one auxiliary panel at a time.
const calEl=id=>document.getElementById(id);
const calCategories={meeting:'Собрание',work:'Совместная работа',expedition:'Поход',fair:'Ярмарка',holiday:'Праздник',other:'Другое'};
let calEvents=[],calAttendees=[],calPeople=new Map(),calMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),calDay=new Date().getDate(),calPanel=null,calEditing=null,calBusy=false,calToken=0;
function calNode(tag,txt,cls){const el=document.createElement(tag);if(txt!==undefined&&txt!==null)el.textContent=txt;if(cls)el.className=cls;return el;}
function calDate(v){return new Date(v).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'});}
function calLocalInput(v){if(!v)return '';const d=new Date(v);const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;}
function calOpen(id){calPanel=calPanel===id?null:id;for(const el of document.querySelectorAll('.calendar-panel'))el.hidden=el.id!==calPanel;calEl('calendarBoardPanel').hidden=!!calPanel;for(const b of document.querySelectorAll('[data-calendar-panel]'))b.setAttribute('aria-expanded',String(b.dataset.calendarPanel===calPanel));}
function calReset(){calEditing=null;calEl('calendarCreatePanel').reset();calEl('calendarFormHeading').textContent='Новое мероприятие';calEl('calendarSave').textContent='Создать';}
function calEventCard(ev){
 const card=calNode('article',null,'work-card calendar-event-card');const head=calNode('div',null,'work-card-top');head.append(calNode('strong',ev.title),calNode('span',ev.status==='cancelled'?'Отменено':calCategories[ev.category]||'Событие','treasury-status'));card.append(head);
 card.append(calNode('p','📅 '+calDate(ev.starts_at)+(ev.ends_at?' — '+calDate(ev.ends_at):'')));
 if(ev.location)card.append(calNode('p','📍 '+ev.location));if(ev.description)card.append(calNode('p',ev.description));
 const attendees=calAttendees.filter(a=>a.event_id===ev.id),mine=attendees.some(a=>a.user_id===currentSession?.user?.id);
 card.append(calNode('p','Участники ('+attendees.length+'): '+(attendees.map(a=>calPeople.get(a.user_id)||'Участник').join(', ')||'Пока никто не записался'),'store-muted'));
 const actions=calNode('div',null,'treasury-actions');
 if(ev.status==='scheduled'&&new Date(ev.starts_at)>new Date()&&['approved','admin'].includes(accessState.mode)){
  const b=calNode('button',mine?'Отменить участие':'Буду участвовать','secondary-button');b.type='button';b.addEventListener('click',()=>calRpc(mine?'guild_event_leave':'guild_event_join',{p_event_id:ev.id},mine?'Запись отменена':'Вы записаны'));actions.append(b);
 }
 if(accessState.mode==='admin'&&ev.status==='scheduled'){
  const edit=calNode('button','Изменить','secondary-button');edit.type='button';edit.addEventListener('click',()=>{calReset();calEditing=ev.id;const f=calEl('calendarCreatePanel');for(const key of ['title','description','category','location'])f.elements.namedItem(key).value=ev[key]||'';f.elements.namedItem('starts_at').value=calLocalInput(ev.starts_at);f.elements.namedItem('ends_at').value=calLocalInput(ev.ends_at);calEl('calendarFormHeading').textContent='Редактировать мероприятие';calEl('calendarSave').textContent='Сохранить';calPanel=null;calOpen('calendarCreatePanel');});actions.append(edit);
  const cancel=calNode('button','Отменить мероприятие','secondary-button');cancel.type='button';cancel.addEventListener('click',()=>{if(confirm('Отменить мероприятие «'+ev.title+'»?'))calRpc('guild_event_cancel',{p_event_id:ev.id},'Мероприятие отменено');});actions.append(cancel);
 }
 if(actions.childElementCount)card.append(actions);return card;
}
function calFill(container,events,empty){container.replaceChildren();for(const ev of events)container.append(calEventCard(ev));if(!events.length)container.append(calNode('p',empty,'store-muted'));}
function calRender(){
 const year=calMonth.getFullYear(),month=calMonth.getMonth();calEl('calendarMonthTitle').textContent=calMonth.toLocaleDateString('ru-RU',{month:'long',year:'numeric'});
 const grid=calEl('calendarGrid');grid.replaceChildren();for(const d of ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'])grid.append(calNode('div',d,'calendar-weekday'));
 const offset=(new Date(year,month,1).getDay()+6)%7;for(let i=0;i<offset;i++)grid.append(calNode('div','', 'calendar-empty'));
 const last=new Date(year,month+1,0).getDate();for(let day=1;day<=last;day++){
  const count=calEvents.filter(ev=>{const dt=new Date(ev.starts_at);return dt.getFullYear()===year&&dt.getMonth()===month&&dt.getDate()===day&&ev.status==='scheduled';}).length;
  const btn=calNode('button',null,'calendar-cell'+(day===calDay?' selected':'')+(count?' has-events':''));btn.type='button';btn.append(calNode('span',String(day)));if(count)btn.append(calNode('small',String(count)+' событ.'));btn.addEventListener('click',()=>{calDay=day;calRender();});grid.append(btn);
 }
 const dayEvents=calEvents.filter(ev=>{const dt=new Date(ev.starts_at);return dt.getFullYear()===year&&dt.getMonth()===month&&dt.getDate()===calDay;});
 calEl('calendarDayHeading').textContent='События на '+calDay+' '+calMonth.toLocaleDateString('ru-RU',{month:'long'});calFill(calEl('calendarDayEvents'),dayEvents,'На этот день мероприятий нет.');
 const now=new Date();calFill(calEl('calendarList'),calEvents.filter(ev=>ev.status==='scheduled'&&new Date(ev.starts_at)>=now).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)),'Ближайших мероприятий нет.');
 const myId=currentSession?.user?.id,ids=new Set(calAttendees.filter(a=>a.user_id===myId).map(a=>a.event_id));calFill(calEl('calendarMyList'),calEvents.filter(ev=>ids.has(ev.id)).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)),'Вы пока не записаны на мероприятия.');
}
async function loadCalendar(){
 if(!supabaseClient||!currentSession?.user||!['approved','admin'].includes(accessState.mode))return;
 const token=++calToken;const calendarAdmin=accessState.mode==='admin';calEl('calendarCreateButton').hidden=!calendarAdmin;if(!calendarAdmin&&calPanel==='calendarCreatePanel'){calPanel=null;calOpen('calendarBoardPanel');}calEl('calendarNotice').textContent='Загрузка событий…';
 try{
  const [events,attendees,people]=await Promise.all([
   supabaseClient.from('guild_events').select('id,title,description,category,location,starts_at,ends_at,status,created_by').order('starts_at',{ascending:true}).limit(2000),
   supabaseClient.from('guild_event_attendees').select('event_id,user_id,joined_at').limit(5000),
   supabaseClient.from('profiles').select('id,character_first_name,character_last_name').limit(2000)
  ]);
  for(const r of [events,attendees,people])if(r.error)throw r.error;if(token!==calToken)return;
  calEvents=events.data||[];calAttendees=attendees.data||[];calPeople=new Map((people.data||[]).map(p=>[p.id,[p.character_first_name,p.character_last_name].filter(Boolean).join(' ')||'Участник']));calRender();calEl('calendarNotice').textContent='';
 }catch(err){if(token===calToken)calEl('calendarNotice').textContent='Ошибка загрузки календаря: '+err.message;}
}
async function calRpc(name,args,success){if(calBusy)return;calBusy=true;try{const {error}=await supabaseClient.rpc(name,args);if(error)throw error;showToast(success);await loadCalendar();}catch(err){showToast('Ошибка: '+err.message);}finally{calBusy=false;}}
for(const b of document.querySelectorAll('[data-calendar-panel]'))b.addEventListener('click',()=>{if(b.dataset.calendarPanel==='calendarCreatePanel'){if(accessState.mode!=='admin')return;if(calPanel!=='calendarCreatePanel')calReset();}calOpen(b.dataset.calendarPanel);});
calEl('calendarCancelEdit').addEventListener('click',()=>{calReset();calPanel='calendarCreatePanel';calOpen('calendarCreatePanel');});
calEl('calendarRefresh').addEventListener('click',loadCalendar);
for(const [id,delta] of [['calendarPrev',-1],['calendarNext',1]])calEl(id).addEventListener('click',()=>{calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()+delta,1);calDay=1;calRender();});
calEl('calendarCreatePanel').addEventListener('submit',async e=>{
 e.preventDefault();if(calBusy||accessState.mode!=='admin')return;const f=e.currentTarget;
 const start=f.elements.namedItem('starts_at').value,end=f.elements.namedItem('ends_at').value;
 if(!start||(end&&new Date(end)<=new Date(start)))return showToast('Проверьте даты мероприятия.');
 const args={p_title:f.elements.namedItem('title').value.trim(),p_description:f.elements.namedItem('description').value.trim(),p_category:f.elements.namedItem('category').value,p_location:f.elements.namedItem('location').value.trim(),p_starts_at:new Date(start).toISOString(),p_ends_at:end?new Date(end).toISOString():null};
 if(calEditing)args.p_event_id=calEditing;const rpc=calEditing?'guild_event_update':'guild_event_create';calBusy=true;
 try{const {error}=await supabaseClient.rpc(rpc,args);if(error)throw error;showToast(calEditing?'Мероприятие обновлено':'Мероприятие создано');calReset();calPanel='calendarCreatePanel';calOpen('calendarCreatePanel');await loadCalendar();}
 catch(err){showToast('Ошибка: '+err.message);}finally{calBusy=false;}
});


// Library v1.5 — all writes use admin-only Supabase RPCs.
const libCategories={charter:'Устав братства',rules:'Законы и правила',announcements:'Объявления',guides:'Руководства'};
const libEl=id=>document.getElementById(id);
let libDocuments=[],libMode='board',libEditing=null,libSelected=null,libToken=0,libBusy=false;
function libNode(tag,value,cls){
 const el=document.createElement(tag);
 if(value!==undefined&&value!==null)el.textContent=String(value);
 if(cls)el.className=cls;
 return el;
}
function libShow(mode){
 if((mode==='editor')&&accessState.mode!=='admin')return;
 libMode=mode;
 libEl('libraryBoard').hidden=mode!=='board';
 libEl('libraryReader').hidden=mode!=='reader';
 libEl('libraryEditor').hidden=mode!=='editor';
 libEl('libraryBackButton').hidden=mode==='board';
}
function libInline(text,parent){
 // Render a deliberately small safe Markdown subset without injecting HTML.
 const re=/\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
 let pos=0,match;
 while((match=re.exec(text))!==null){
  if(match.index>pos)parent.append(document.createTextNode(text.slice(pos,match.index)));
  if(match[1])parent.append(libNode('strong',match[1]));
  else {const a=libNode('a',match[2]);a.href=match[3];a.target='_blank';a.rel='noopener noreferrer';parent.append(a);}
  pos=re.lastIndex;
 }
 if(pos<text.length)parent.append(document.createTextNode(text.slice(pos)));
}
function libBody(text,container){
 container.replaceChildren();
 const lines=String(text||'').split(/\r?\n/);
 let list=null;
 for(const line of lines){
  if(!line.trim()){list=null;continue;}
  const heading=line.match(/^(#{1,3})\s+(.+)$/);
  if(heading){list=null;const h=libNode('h'+Math.min(heading[1].length+1,4));libInline(heading[2],h);container.append(h);continue;}
  const item=line.match(/^\s*[-*]\s+(.+)$/);
  if(item){if(!list){list=libNode('ul');container.append(list);}const li=libNode('li');libInline(item[1],li);list.append(li);continue;}
  list=null;const p=libNode('p');libInline(line,p);container.append(p);
 }
}
function libRender(){
 const search=libEl('librarySearch').value.trim().toLocaleLowerCase('ru');
 const cat=libEl('libraryCategory').value;
 const items=libDocuments.filter(d=>(cat==='all'||d.category===cat)&&(!search||(d.title+' '+d.body).toLocaleLowerCase('ru').includes(search)));
 const list=libEl('libraryList');list.replaceChildren();
 if(!items.length){list.append(libNode('p','Документы не найдены.','store-muted'));return;}
 for(const d of items){
  const card=libNode('article',null,'panel library-card');
  const header=libNode('div',null,'treasury-heading');
  header.append(libNode('h2',d.title));
  if(d.is_pinned)header.append(libNode('span','📌 Закреплено','treasury-status'));
  card.append(header,libNode('small',libCategories[d.category]||d.category,'store-muted'));
  const excerpt=String(d.body).replace(/[#*[\]]/g,'').slice(0,190);
  card.append(libNode('p',excerpt+(d.body.length>190?'…':'')));
  const btn=libNode('button','Читать документ','secondary-button');btn.type='button';
  btn.addEventListener('click',()=>libRead(d.id));card.append(btn);list.append(card);
 }
}
function libRead(id){
 const d=libDocuments.find(x=>x.id===id);if(!d)return libShow('board');
 libSelected=id;libEl('libraryReaderTitle').textContent=d.title;
 libEl('libraryReaderCategory').textContent=(d.is_pinned?'📌 Закреплено · ':'')+(libCategories[d.category]||d.category);
 libEl('libraryReaderMeta').textContent='Обновлено: '+new Date(d.updated_at).toLocaleString('ru-RU');
 libBody(d.body,libEl('libraryReaderBody'));
 const actions=libEl('libraryReaderActions');actions.replaceChildren();
 if(accessState.mode==='admin'){
  const edit=libNode('button','Изменить','secondary-button');edit.type='button';edit.addEventListener('click',()=>libEdit(id));
  const del=libNode('button','Удалить','secondary-button');del.type='button';
  del.addEventListener('click',async()=>{if(confirm('Безвозвратно удалить документ «'+d.title+'»?')){await libRpc('guild_document_delete',{p_document_id:id},'Документ удалён');libShow('board');}});
  actions.append(edit,del);
 }
 libShow('reader');
}
function libEdit(id=null){
 if(accessState.mode!=='admin')return;
 const d=id?libDocuments.find(x=>x.id===id):null;
 libEditing=d?.id||null;
 const f=libEl('libraryEditor');f.reset();
 f.elements.namedItem('title').value=d?.title||'';
 f.elements.namedItem('category').value=d?.category||'charter';
 f.elements.namedItem('body').value=d?.body||'';
 f.elements.namedItem('is_pinned').checked=!!d?.is_pinned;
 libEl('libraryEditorHeading').textContent=d?'Редактирование документа':'Новый документ';
 libEl('librarySaveButton').textContent=d?'Сохранить изменения':'Опубликовать';
 libShow('editor');
}
async function loadLibrary(){
 if(!supabaseClient||!currentSession?.user||!['approved','admin'].includes(accessState.mode))return;
 const token=++libToken;
 libEl('libraryCreateButton').hidden=accessState.mode!=='admin';
 if(accessState.mode!=='admin'&&libMode==='editor')libShow('board');
 libEl('libraryNotice').textContent='Загрузка библиотеки…';
 try{
  const {data,error}=await supabaseClient.from('guild_documents').select('id,title,category,body,is_pinned,created_by,updated_at').order('is_pinned',{ascending:false}).order('updated_at',{ascending:false}).limit(1000);
  if(error)throw error;if(token!==libToken)return;
  libDocuments=data||[];libRender();
  if(libMode==='reader'&&libSelected){if(libDocuments.some(d=>d.id===libSelected))libRead(libSelected);else libShow('board');}
  libEl('libraryNotice').textContent='';
 }catch(err){if(token===libToken)libEl('libraryNotice').textContent='Ошибка загрузки библиотеки: '+err.message;}
}
async function libRpc(name,args,success){
 if(libBusy)return false;
 libBusy=true;
 try{const {error}=await supabaseClient.rpc(name,args);if(error)throw error;showToast(success);await loadLibrary();return true;}
 catch(err){showToast('Ошибка: '+err.message);return false;}
 finally{libBusy=false;}
}
libEl('libraryCreateButton').addEventListener('click',()=>libEdit());
libEl('libraryBackButton').addEventListener('click',()=>libShow('board'));
libEl('libraryCancelButton').addEventListener('click',()=>libShow('board'));
libEl('libraryRefreshButton').addEventListener('click',loadLibrary);
libEl('librarySearch').addEventListener('input',libRender);
libEl('libraryCategory').addEventListener('change',libRender);
libEl('libraryEditor').addEventListener('submit',async event=>{
 event.preventDefault();if(accessState.mode!=='admin'||libBusy)return;
 const f=event.currentTarget;
 const args={p_title:f.elements.namedItem('title').value.trim(),p_category:f.elements.namedItem('category').value,p_body:f.elements.namedItem('body').value.trim(),p_is_pinned:f.elements.namedItem('is_pinned').checked};
 if(!args.p_title||!args.p_body)return showToast('Заполните название и содержание.');
 if(libEditing)args.p_document_id=libEditing;
 const ok=await libRpc(libEditing?'guild_document_update':'guild_document_create',args,libEditing?'Документ обновлён':'Документ опубликован');
 if(ok){libEditing=null;f.reset();libShow('board');}
});
