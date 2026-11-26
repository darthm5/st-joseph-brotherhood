// Supabase public client configuration. Publishable keys are intended for browser use.
const SUPABASE_URL = "https://codmkmlbezxjccccswjp.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_34fKSc_yV9KPaujxo0bWUA_PwgkxHyT";

const pageInfo = {
  profile: ["Мой кабинет", "Личная анкета персонажа."],
  home: ["Главная", "Новости, объявления и основные сведения резиденции."],
  members: ["Участники", "Реестр членов братства, их анкеты, звания и достижения."],
  info: ["Библиотека", "Устав, правила, решения совета и важные распоряжения."],
  calendar: ["Календарь", "Собрания, события, встречи и общие мероприятия братства."],
  treasury: ["Казна", "Доходы, расходы, взносы и текущее состояние общей казны."],
  market: ["Рынок", "Объявления о покупке и продаже ресурсов и изделий."],
  work: ["Работа", "Заказы, поручения, доступные работы и выполненные задания."],
  crafts: ["Ремёсла", "Ремесленные специализации, мастера и их профессиональные навыки."],
  map: ["Карта", "Карта мира, поселения, маршруты и отмеченные места."],
  chronicle: ["Летопись", "История братства, важные события и памятные записи."],
  ratusha: ["Ратуша", "Открытые и тайные голосования братства."],
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
const chroniclePage = document.getElementById("page-chronicle");
const ratushaPage = document.getElementById("page-ratusha");
const mapPage = document.getElementById("page-map");
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
  document.querySelectorAll(".guild-nav-group").forEach(group => { group.hidden = !group.querySelector(".nav-item:not([hidden])"); });
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
  navButtons.forEach(button => { const active = button.dataset.page === page; button.classList.toggle("active", active); if (active) { button.setAttribute("aria-current", "page"); const group = button.closest("details"); if (group) group.open = true; } else button.removeAttribute("aria-current"); });
  profilePage.classList.toggle("active-page", page === "profile");
  membersPage.classList.toggle("active-page", page === "members");
  craftsPage.classList.toggle("active-page", page === "crafts");
  treasuryPage.classList.toggle("active-page", page === "treasury");
  if (page !== "storehouse" && storehousePage.classList.contains("active-page")) storeClearHighlights();
  storehousePage.classList.toggle("active-page", page === "storehouse");
  workPage.classList.toggle("active-page", page === "work");
  marketPage.classList.toggle("active-page", page === "market");
  calendarPage.classList.toggle("active-page", page === "calendar");
  libraryPage.classList.toggle("active-page", page === "info");
  chroniclePage.classList.toggle("active-page", page === "chronicle");
  ratushaPage.classList.toggle("active-page", page === "ratusha");
  mapPage.classList.toggle("active-page", page === "map");
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
  if (page === "chronicle") { chronShow("timeline"); loadChronicle(); }
  if (page === "ratusha") { hallShow("home"); }
  if (page === "map") { guildMapLoad(); }
  if (page === "info") { libHome(); loadLibrary(); }
  if (page === "home") {
    homePage.classList.add("active-page");
    loadHome272();
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
  } else if (page === "treasury" || page === "storehouse" || page === "work" || page === "market" || page === "calendar" || page === "info" || page === "chronicle" || page === "ratusha" || page === "map") {
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
  if (window.innerWidth <= 900 && sidebar.classList.contains("open") &&
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
  document.getElementById("personalCabinet").hidden = true;
  profileNotice.hidden = !!user;
  if (!user || !supabaseClient) return;
  profileMessage.textContent = "Загружаем анкету…";
  const { data, error } = await supabaseClient.from("profiles")
    .select("discord_username,character_first_name,character_last_name,character_age,profession,crafts,jobs,masteries,about,character_photo_url,membership_status,game_rank,created_at")
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
  pcRender(data, user.id, sequence);
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
    if(currentSession?.user?.id===user.id) navigate("profile");
  } catch (error) {
    profileMessage.textContent = "Ошибка сохранения: " + error.message;
  } finally { button.disabled = false; }
});



// v2.7.1: read-only personal charter, backed by existing profile and guild tables.
const pc = id => document.getElementById(id);
function pcTab(tab){document.querySelectorAll('[data-pc-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pcTab===tab)));document.querySelectorAll('[data-pc-panel]').forEach(p=>p.hidden=p.dataset.pcPanel!==tab);}
document.querySelectorAll('[data-pc-tab]').forEach(b=>b.addEventListener('click',()=>pcTab(b.dataset.pcTab)));
pc('pcEdit').onclick=()=>{pc('personalCabinet').hidden=true;profileForm.hidden=false;pc('pcCancel').hidden=false;profileForm.scrollIntoView({block:'start'});};
pc('pcCancel').onclick=()=>loadProfile();
pc('pcCalculator').onclick=()=>{if(canVisit('crafts')){navigate('crafts');pc('craftShowCalculator').click();}};
pc('pcPortrait').onerror=()=>{pc('pcPortrait').hidden=true;pc('pcPortraitFallback').hidden=false;};
function pcSkills(root,p){root.replaceChildren();for(const [label,items] of [['Работы',p.jobs],['Мастерства',p.masteries]]){root.append(element('h4','pc-skill-heading',label));if(!Array.isArray(items)||!items.length){root.append(element('p','pc-muted',label==='Работы'?memberJobs(p):memberMasteries(p)));continue;}for(const item of items){const level=Math.max(1,Math.min(10,Number(item.level)||1));const row=element('div','pc-skill');const track=element('progress','pc-progress');track.max=10;track.value=level;track.setAttribute('aria-label',item.name);row.append(element('span','',item.name),track,element('b','',level+'/10'));root.append(row);}}}
function pcRecords(root,rows,empty){root.replaceChildren();if(!rows.length)root.append(element('p','pc-muted',empty));for(const r of rows){const row=element('div','pc-record');row.append(element('strong','',r.title),element('small','',r.meta));root.append(row);}}
async function pcRender(p,uid,sequence){const allowed=['approved','admin'].includes(accessState.mode);const complete=!!(p.character_first_name?.trim()&&p.character_last_name?.trim());pc('pcCancel').hidden=true;pc('personalCabinet').hidden=!complete;profileForm.hidden=complete;if(!complete)return;
 pc('pcName').textContent=characterName(p);pc('pcRank').textContent=p.game_rank||'Кандидат';pc('pcProfession').textContent=[...(p.masteries||[]),...(p.jobs||[])].map(x=>x.name).join(' · ')||p.profession||'Занятие не указано';pc('pcMembership').textContent=pc('profileMembership').textContent;pc('pcAge').textContent=p.character_age?String(p.character_age):'Не указан';pc('pcDiscord').textContent=p.discord_username||'Discord';pc('pcBio').textContent=p.about||'История персонажа ещё не написана.';const photo=safePhoto(p.character_photo_url);pc('pcPortrait').hidden=!photo;pc('pcPortraitFallback').hidden=!!photo;if(photo)pc('pcPortrait').src=photo;else pc('pcPortrait').removeAttribute('src');pcSkills(pc('pcSkills'),p);pcSkills(pc('pcCraftSkills'),p);pcTab('about');pc('pcStats').hidden=!allowed;for(const b of document.querySelectorAll('[data-pc-tab]:not([data-pc-tab="about"])'))b.hidden=!allowed;pc('pcContribution').textContent='—';pc('pcCompleted').textContent='—';pc('pcDays').textContent=p.created_at&&Number.isFinite(Date.parse(p.created_at))?Math.max(0,Math.floor((Date.now()-Date.parse(p.created_at))/86400000)):'—';pcRecords(pc('pcWork'),[],'Загрузка…');pcRecords(pc('pcHistory'),[],'Загрузка…');if(!allowed)return;
 const date=x=>x?new Date(x).toLocaleDateString('ru-RU'):'';
 const results=await Promise.allSettled([supabaseClient.from('treasury_transactions').select('amount,description,created_at').eq('member_id',uid).order('created_at',{ascending:false}).limit(1000),supabaseClient.from('work_tasks').select('title,status,created_at').eq('assigned_to',uid).order('created_at',{ascending:false}).limit(1000),supabaseClient.from('storage_requests').select('comment,status,request_type,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(100),supabaseClient.from('storage_craft_batches').select('order_name,status,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(100)]);
 if(sequence!==profileLoadSequence||currentSession?.user?.id!==uid)return;const ok=i=>results[i].status==='fulfilled'&&!results[i].value.error;const rows=i=>ok(i)?results[i].value.data||[]:[];const tx=rows(0),tasks=rows(1),requests=rows(2),batches=rows(3);if(ok(0))pc('pcContribution').textContent=new Intl.NumberFormat('ru-RU').format(tx.reduce((a,t)=>a+Math.max(0,Number(t.amount)||0),0))+(tx.length===1000?'+':'');if(ok(1))pc('pcCompleted').textContent=tasks.filter(t=>t.status==='completed').length+(tasks.length===1000?'+':'');const work=tasks.filter(t=>['assigned','submitted'].includes(t.status)).map(t=>({title:t.title,meta:workStatusNames[t.status]}));for(const r of requests.filter(r=>r.status==='pending'))work.push({title:r.comment||'Заявка в кладовую',meta:'Кладовая · Ожидает'});for(const r of batches.filter(r=>r.status==='pending'))work.push({title:r.order_name||'Ремесленный заказ',meta:'Ресурсы · Ожидает'});pcRecords(pc('pcWork'),work,'Активных дел нет.');const history=[...tx.map(t=>({title:t.description||'Операция казны',meta:date(t.created_at)+' · '+t.amount+' грошей',at:t.created_at})),...tasks.filter(t=>t.status==='completed').map(t=>({title:t.title,meta:'Завершённое поручение',at:t.created_at})),...batches.map(t=>({title:t.order_name||'Ремесленная заявка',meta:date(t.created_at)+' · '+storeStatus(t.status),at:t.created_at}))].sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,20);pcRecords(pc('pcHistory'),history,'Записей пока нет.');if(results.some((_,i)=>!ok(i))){for(const id of ['pcWork','pcHistory'])pc(id).prepend(element('p','pc-muted','Часть сведений недоступна. Повторите вход в кабинет позже.'));}}

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
const memberRankFilter = document.getElementById("memberRankFilter");
const memberCraftFilter = document.getElementById("memberCraftFilter");
let registryListMode = false;
function registrySkills(p) {
  const jobs = Array.isArray(p.jobs) && p.jobs.length ? p.jobs : (p.profession ? [{name:p.profession}] : []);
  const crafts = Array.isArray(p.masteries) && p.masteries.length ? p.masteries : (Array.isArray(p.crafts) ? p.crafts.map(name=>({name})) : []);
  return [...jobs,...crafts].filter(x=>x && typeof x.name === 'string' && x.name.trim());
}
function registryFilters() {
  for (const [select,values,label] of [[memberRankFilter,membersCache.map(p=>p.game_rank||'Кандидат'),'Все звания'],[memberCraftFilter,membersCache.flatMap(p=>registrySkills(p).map(x=>x.name)),'Все ремёсла']]) {
    const previous=select.value;
    select.replaceChildren(new Option(label,''));
    [...new Set(values)].sort((a,b)=>a.localeCompare(b,'ru')).forEach(v=>select.add(new Option(v,v)));
    if ([...select.options].some(o=>o.value===previous)) select.value=previous;
  }
}
function registrySkillRows(parent,skills,bars=false) {
  if (!skills.length) {parent.append(element('p','registry-empty','Не указано'));return;}
  for (const skill of skills) {
    const row=element('div','registry-skill');row.append(element('span','',skill.name));
    const level=Number(skill.level);
    if (skill.level!=null && Number.isFinite(level) && level>=1 && level<=10) {
      row.append(element('b','',`${level} / 10`));
      if(bars){const bar=element('div','registry-bar');const fill=element('i');fill.style.width=`${level*10}%`;bar.append(fill);row.append(bar);}
    }
    parent.append(row);
  }
}
function renderMembers() {
  const term = memberSearch.value.trim().toLocaleLowerCase();
  const filtered = membersCache.filter(p => [characterName(p), p.profession, p.game_rank, memberJobs(p), memberMasteries(p)].join(" ").toLocaleLowerCase().includes(term) && (!memberRankFilter.value || (p.game_rank||'Кандидат')===memberRankFilter.value) && (!memberCraftFilter.value || registrySkills(p).some(x=>x.name===memberCraftFilter.value)));
  membersGrid.replaceChildren();
  membersGrid.classList.toggle('registry-list',registryListMode);
  membersCount.textContent = `Показано: ${filtered.length} из ${membersCache.length}`;
  membersMessage.textContent = filtered.length ? '' : membersCache.length ? 'По вашему запросу никого не найдено.' : 'В реестре пока нет заполненных анкет.';
  for (const profile of filtered) {
    const card=element('article','member-card');
    const top=element('div','registry-top');top.append(photoNode(profile,'member-photo'));
    const body=element('div','member-card-body');
    body.append(element('span','member-card-rank',profile.game_rank||'Кандидат'),element('h2','member-card-name',characterName(profile)),element('p','member-card-profession',memberJobs(profile)));
    top.append(body);card.append(top);
    const skills=element('div','registry-skills');registrySkillRows(skills,registrySkills(profile));card.append(skills);
    const open=element('button','registry-open','Анкета →');open.type='button';open.setAttribute('aria-label','Открыть анкету: '+characterName(profile));open.addEventListener('click',()=>openMember(profile));card.append(open);membersGrid.append(card);
  }
}
function registryMode(list){registryListMode=list;document.getElementById('memberCardsMode').setAttribute('aria-pressed',String(!list));document.getElementById('memberListMode').setAttribute('aria-pressed',String(list));renderMembers();}
document.getElementById('memberCardsMode').addEventListener('click',()=>registryMode(false));
document.getElementById('memberListMode').addEventListener('click',()=>registryMode(true));
for(const filter of [memberRankFilter,memberCraftFilter]) filter.addEventListener('change',()=>{closeMember();renderMembers();});
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
  const skillBlock=element("div","member-detail-field");skillBlock.append(element("span","member-detail-label","Ремесленные навыки"));registrySkillRows(skillBlock,registrySkills(profile),true);text.append(skillBlock);
  detailField(text, "О персонаже", profile.about);
  awardAttachToProfile(text,profile.id);
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
  registryFilters();
  renderMembers();
}


// Admin panel. Every write is checked again inside Supabase RPC; UI checks are not security.
const adminNotice = document.getElementById("adminNotice");
const adminPanel = document.getElementById("adminPanel");
const adminList = document.getElementById("adminList");
const adminFilter = document.getElementById("adminFilter");
const adminCount = document.getElementById("adminCount");
let adminProfiles = [];
let adminTab = 'members';
const adminRanks = ["Глава гильдии", "Старейшина гильдии", "Казначей", "Писарь", "Купец", "Гильдмастер", "Мастер", "Подмастерье", "Возница", "Последователь", "Послушник"];
const adminSearch = document.getElementById('adminSearch');
function adminShowTab(tab){
 adminTab=tab;
 document.querySelectorAll('[data-admin-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.adminTab===tab)));
 const directory=document.getElementById('adminDirectory'), extra=document.getElementById('adminExtra');
 directory.hidden=!['members','applications'].includes(tab);extra.hidden=!directory.hidden;extra.replaceChildren();
 if(!directory.hidden){adminFilter.value=tab==='applications'?'pending':'all';renderAdminList();return;}
 const panel=element('div','panel admin-extra-panel');extra.append(panel);
 if(tab==='ranks'){
  panel.append(element('h2','','Иерархия братства'),element('p','members-message','Игровые звания не предоставляют административных прав.'));
  for(const rank of adminRanks){const row=element('div','admin-rank-row');row.append(element('strong','',rank),element('span','',String(adminProfiles.filter(p=>p.membership_status==='approved'&&p.game_rank===rank).length)+' участников'));panel.append(row);}
  const b=element('button','secondary-button','Открыть иерархию и описания');b.type='button';b.onclick=()=>{navigate('ratusha');hallShow('council');};panel.append(b);
 }else{panel.append(element('h2','','Почётные награды'),element('p','members-message','Каталог, вручение и отзыв наград доступны в существующем Зале славы.'));const b=element('button','primary-button','Открыть Зал славы');b.type='button';b.onclick=()=>{navigate('ratusha');hallShow('awards');};panel.append(b);}
}

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
    document.getElementById('adminApplications').textContent='Заявки ('+adminProfiles.filter(p=>p.membership_status==='pending').length+')';
    adminShowTab(adminTab);
  } catch (error) {
    if (sequence === adminLoadSequence) adminNotice.textContent = "Ошибка: " + error.message;
  }
}
function renderAdminList() {
  const filter = adminFilter.value;
  const query=adminSearch.value.trim().toLocaleLowerCase('ru');
  const rows = adminProfiles.filter(p => (filter === "all" || p.membership_status === filter) && (!query || [characterName(p),p.discord_username,p.profession,p.game_rank].join(' ').toLocaleLowerCase('ru').includes(query)));
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
    const manage=element('button','secondary-button admin-manage','Управлять');manage.type='button';manage.setAttribute('aria-expanded','false');head.append(manage);
    card.append(head);
    const controls = element("div", "admin-controls");controls.hidden=true;
    manage.addEventListener('click',()=>{const opening=controls.hidden;for(const other of adminList.querySelectorAll('.admin-controls'))other.hidden=true;for(const other of adminList.querySelectorAll('.admin-manage')){other.textContent='Управлять';other.setAttribute('aria-expanded','false');}controls.hidden=!opening;manage.textContent=opening?'Свернуть':'Управлять';manage.setAttribute('aria-expanded',String(opening));});
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
    const rankInput = element("select");
    rankInput.setAttribute("aria-label", "Выберите ранг гильдии");
    const rankOptions = [
      "Глава гильдии", "Старейшина гильдии", "Казначей", "Писарь", "Купец",
      "Гильдмастер", "Мастер", "Подмастерье", "Возница", "Последователь", "Послушник"
    ];
    const currentRank = (p.game_rank || "").trim();
    const placeholder = element("option", "", "— Выберите ранг —");
    placeholder.value = ""; placeholder.disabled = true;
    rankInput.append(placeholder);
    for (const rankName of rankOptions) {
      const option = element("option", "", rankName);
      option.value = rankName;
      rankInput.append(option);
    }
    rankInput.value = rankOptions.includes(currentRank) ? currentRank : "";
    rankGroup.append(rankInput);
    const saveRank = element("button", "secondary-button", "Сохранить звание");
    saveRank.type = "button";
    saveRank.addEventListener("click", async () => {
      const rank = rankInput.value;
      if (!rankOptions.includes(rank)) return showToast("Выберите ранг из списка.");
      if (rank === p.game_rank) return showToast("Звание не изменилось.");
      if (!confirm(`Назначить персонажу «${characterName(p)}» звание «${rank}»?`)) return;
      await adminMutation("admin_set_member_rank", {target_user_id:p.id, new_rank:rank}, saveRank);
    });
    controls.append(statusGroup,saveStatus,rankGroup,saveRank);
    if(p.membership_status==='pending'&&adminTab==='applications'){
      const actions=element('div','admin-application-actions');
      for(const [status,label,cls] of [['approved','Принять','primary-button'],['rejected','Отклонить','secondary-button']]){const b=element('button',cls,label);b.type='button';b.onclick=async()=>{if(confirm(label+' заявку персонажа «'+characterName(p)+'»?'))await adminMutation('admin_set_member_status',{target_user_id:p.id,new_status:status},b);};actions.append(b);}card.append(actions);
    }
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
adminSearch.addEventListener('input',renderAdminList);
for(const b of document.querySelectorAll('[data-admin-tab]'))b.addEventListener('click',()=>adminShowTab(b.dataset.adminTab));
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
  directoryGrid.classList.toggle("workshop-list", !!directoryCategory);
  const term = directorySearch.value.trim().toLocaleLowerCase();
  const min = Number(directoryLevel.value);
  if (!directoryCategory) {
    const names = directoryKind === "jobs" ? JOB_NAMES : MASTERY_NAMES;
    for (const name of names) {
      const matches = directoryEntry(name).filter(x=>x.level>=min);
      if (!name.toLocaleLowerCase().includes(term) && !matches.some(x=>characterName(x.p).toLocaleLowerCase().includes(term))) continue;
      const button=element("button","directory-category"); button.type="button";
      button.append(element("span","directory-category-icon",directoryKind==="jobs"?"⚒":(["⚒","🛡","✂","🏹","💎","🪚","⚗","🍲","🍺"][MASTERY_NAMES.indexOf(name)]||"⚒")));
      button.append(element("strong","",name));
      button.append(element("small","","Мастеров: "+matches.length));
      button.addEventListener("click",()=>{directoryCategory=name;directorySearch.value="";renderDirectory();});
      directoryGrid.append(button);
    }
    directoryMessage.textContent = "Направлений: " + directoryGrid.children.length;
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
      card.append(element("span","workshop-profile-link","Анкета →"));
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
  document.querySelector('[data-tr-tab="admin"]').hidden = !isAdmin;
  if (!isAdmin && document.querySelector('[data-tr-tab="admin"]').getAttribute('aria-pressed') === 'true') trSelect('journal');
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
    for(const t of tx) { const row=treasuryRow(historyBox,t.description,`${treasuryDate(t.created_at)} · ${names.get(t.member_id)||"Общая операция"}`,Number(t.amount)); row.dataset.trDirection=Number(t.amount)<0?'expense':'income'; }
    trFilter();
    treasuryNotice.textContent = tx.length===500 ? "Показаны последние 500 операций; баланс и итоги рассчитаны только по ним." : "Данные обновлены.";
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
function storeProductCrafts(i){return window.STORE_PRODUCT_CRAFTS?.[String(i.name).trim().toLowerCase().replace(/ё/g,"е")]||[];}
function storeIsBlank(name){return /(?<![\p{L}\p{N}])заготовка(?![\p{L}\p{N}])/iu.test(String(name||""));}
function storeVisibleItems(){ return storeItems.filter(i => storeIsBlank(i.name)?storeSection==="materials":(i.section || "materials") === storeSection || (storeSection==="products" && storeProductCrafts(i).length)); }
function storeItemCategories(i){return storeSection==="products"?[...new Set([...storeProductCrafts(i),...(i.section==="products"?[i.category]:[])])]:[i.category];}
function storeSetSection(section){
  storeSection=section;
  for(const [id,value] of [["storeTabMaterials","materials"],["storeTabProducts","products"]]){const b=storeEl(id);b.classList.toggle("active",section===value);b.setAttribute("aria-selected",String(section===value));}
  storeEl("storeCategory").value="";storeEl("storeSearch").value="";
  storeEl("storeNewSection").value=section;
  storeRenderFilters();renderStoreCatalog();
}
function storeRenderFilters(){
  const categories=[...new Set(storeVisibleItems().flatMap(storeItemCategories))];
  if(storeSection==="products")for(const c of storeProductCategories)if(!categories.includes(c))categories.push(c);
  categories.sort((a,b)=>a.localeCompare(b,"ru"));
  storeEl("storeCategoryLabel").textContent=storeSection==="products"?"Ремесло":"Категория";
  const select=storeEl("storeCategory"),old=select.value;select.replaceChildren(new Option(storeSection==="products"?"Все ремёсла":"Все категории",""));
  for(const c of categories)select.add(new Option(c,c));if(categories.includes(old))select.value=old;
  const datalist=storeEl("storeCategoryOptions");datalist.replaceChildren();
  const addCategories=storeEl("storeNewSection").value==="products"?storeProductCategories:[...new Set(storeItems.filter(i=>(i.section||"materials")==="materials").map(i=>i.category))].sort((a,b)=>a.localeCompare(b,"ru"));
  for(const c of addCategories)datalist.appendChild(new Option(c,c));
}
storeEl("storeTabMaterials").addEventListener("click",()=>storeSetSection("materials"));
storeEl("storeTabProducts").addEventListener("click",()=>storeSetSection("products"));
storeEl("storeNewSection").addEventListener("change",storeRenderFilters);
const storeNewName=storeEl("storeAddForm").elements.namedItem("name");
function storeBlankSectionUI(){if(storeIsBlank(storeNewName.value)){storeEl("storeNewSection").value="materials";storeRenderFilters();}}
storeNewName.addEventListener("input",storeBlankSectionUI);
storeEl("storeNewSection").addEventListener("change",storeBlankSectionUI);
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
  const search=form.querySelector('[data-store-search]'), item=form.elements.namedItem('item'), hint=form.querySelector('[data-store-balance]');
  function describe(){const x=storeItems.find(x=>x.id===item.value);hint.textContent=x?'В наличии: '+storeNumber.format(storeBalances.get(x.id)||0)+' '+(x.unit||'шт.'):'Выберите ресурс из списка.';}
  function update(){const old=item.value,q=search.value.trim().toLocaleLowerCase('ru');item.replaceChildren(new Option('Выберите ресурс',''));for(const x of storeItems.filter(x=>!q||`${x.name} ${x.category}`.toLocaleLowerCase('ru').includes(q)))item.add(new Option(`${x.name} · ${x.category}`,x.id));if([...item.options].some(o=>o.value===old))item.value=old;else if(item.options.length===2)item.selectedIndex=1;describe();}
  search.addEventListener('input',update);item.addEventListener('change',describe);
  return {update,choose(id){search.value='';update();item.value=id;describe();},reset(){search.value='';item.value='';update();}};
}
const storeRequestCascade=storeCascade(storeEl('storeRequestForm'));
const storeManualCascade=storeCascade(storeEl('storeManualForm'));
const storePanelIds=['storeRequestForm','storeManualForm','storeAddForm','storeOwnRequestsPanel','storeAdminRequests','storeHistoryPanel'];
let storeActivePanel=null;
function storeOpenPanel(id, scroll=true){
  if(id && !storePanelIds.includes(id))return;
  if(id && ['storeManualForm','storeAddForm','storeAdminRequests'].includes(id) && accessState.mode!=='admin')return;
  if(id!==storeActivePanel || (scroll && id==="storeOwnRequestsPanel")) storeClearHighlights();
  storeActivePanel=id;
  storeEl("storeBackStock").classList.toggle("store-action-active",!id);
  storeEl("storeInventory").hidden=Boolean(id);
  storeEl("storeModes").hidden=Boolean(id);
  if(id)storeEl("storeManagement").open=false;
  storeEl("storeSectionTabs").hidden=Boolean(id);
  for(const panelId of storePanelIds){
    storeEl(panelId).hidden=panelId!==id;
  }
  for(const button of document.querySelectorAll('[data-store-panel]')){
    const expanded=button.dataset.storePanel===id;
    button.setAttribute('aria-expanded',String(expanded));
    button.classList.toggle('store-action-active',expanded);
  }
  if(id && scroll){storeEl(id).scrollIntoView({behavior:'smooth',block:'nearest'});if(["storeOwnRequestsPanel","storeAdminRequests","storeHistoryPanel"].includes(id))loadStorehouse();}
}
for(const button of document.querySelectorAll('[data-store-panel]')){
  button.addEventListener('click',()=>storeOpenPanel(button.dataset.storePanel));
}

storeEl("storeBackStock").onclick=()=>storeSwitch(false,"take");
let storeMode="take", storeKeeperMode=false, storeDrafts=new Map();
let storeCart=new Map(), storeCartUser=null, storeCartToken=null, storePage=0, storeFilterKey='';
function storeCartScope(){const uid=currentSession?.user?.id;if(uid!==storeCartUser){storeDrafts.clear();storeCart=new Map();storeCartToken=null;storeCartUser=uid;storeKeeperMode=false;storeMode="take";storeEl('storeBasketPurpose').value='';storeEl('storeBasketResult').textContent='';}}
function storeCartChange(id,q){storeEl('storeBasketResult').textContent='';if(storeBusy){showToast("Дождитесь завершения операции");return;}storeCartScope();const max=storeMode==="give"?1000000000:Math.min(1000000000,Math.floor(storeBalances.get(id)||0));if(q<=0)storeCart.delete(id);else if(Number.isSafeInteger(q)&&q<=max){if(!storeCart.has(id)&&storeCart.size>=500)return showToast('Не более 500 позиций');storeCart.set(id,q);}else return showToast('Недостаточно ресурсов');storeCartToken=null;storeRenderBasket();renderStoreCatalog();}
function storeRenderBasket(){storeCartScope();const root=storeEl('storeBasketRows');root.replaceChildren();for(const [id,q] of storeCart){const item=storeItems.find(x=>x.id===id);const row=storeText(root,'div','','store-basket-row');storeText(row,'strong',item?.name||'Неизвестный предмет');const controls=storeText(row,'div','','store-basket-controls');const btn=(label,fn)=>{const b=storeText(controls,'button',label,'secondary-button');b.type='button';b.disabled=storeBusy;b.onclick=fn;};btn('−',()=>storeCartChange(id,q-1));const input=document.createElement('input');input.type='number';input.min='1';input.max=String(storeMode==="give"?1000000000:Math.floor(storeBalances.get(id)||0));input.value=q;input.disabled=storeBusy;input.setAttribute('aria-label','Количество '+(item?.name||''));input.onchange=()=>{const v=Number(input.value);if(!input.value.trim()||!Number.isSafeInteger(v)||v<1){input.value=q;return;}storeCartChange(id,v);input.value=storeCart.get(id)||q;};controls.append(input);btn('+',()=>storeCartChange(id,q+1));btn('×',()=>storeCartChange(id,0));if(storeMode==="take"&&q>(storeBalances.get(id)||0))storeText(row,'small','Недостаточно в наличии','treasury-negative');}if(!storeCart.size)storeText(root,'p','Нажмите на предмет, чтобы добавить его в заявку.','store-muted');storeEl('storeBasketCount').textContent='Всего позиций: '+storeCart.size+' · Количество: '+storeNumber.format([...storeCart.values()].reduce((a,b)=>a+b,0));storeEl('storeBasketSubmit').disabled=storeBusy||!storeCart.size;storeEl('storeBasketPurpose').disabled=storeBusy;}
storeEl('storeBasketPurpose').addEventListener('input',()=>storeCartToken=null);
function storeSwitch(keeper,mode){if(storeBusy)return;storeEl('storeBasketResult').textContent='';storeCartScope();if(keeper&&accessState.mode!=="admin")return;storeDrafts.set(String(storeKeeperMode)+storeMode,{cart:storeCart,purpose:storeEl('storeBasketPurpose').value,token:storeCartToken});storeKeeperMode=keeper;storeMode=mode;const draft=storeDrafts.get(String(keeper)+mode);storeCart=draft?.cart||new Map();storeCartToken=draft?.token||null;storeEl('storeBasketPurpose').value=draft?.purpose||'';storeOpenPanel(null,false);storeEl('storeManagement').open=false;storeModeUI();renderStoreCatalog();}
function storeModeUI(){storeEl('storeTake').textContent=storeKeeperMode?'− Расход':'↓ Получить ресурсы';storeEl('storeGive').textContent=storeKeeperMode?'＋ Приход':'↑ Пополнить запасы';storeEl('storeTake').classList.toggle('store-action-active',storeMode==='take');storeEl('storeGive').classList.toggle('store-action-active',storeMode==='give');storeEl('storeBasketHeading').textContent=storeKeeperMode?'Учёт кладовщика · '+(storeMode==='take'?'Расход':'Приход'):'Заявка на '+(storeMode==='take'?'выдачу':'пополнение');storeEl('storeKeeperMember').hidden=!storeKeeperMode;storeEl('storeBasketSubmit').textContent=storeKeeperMode?'Провести операцию':'Отправить заявку';storeEl('storeBasketHint').textContent=storeKeeperMode?'Остатки изменятся сразу.':'После одобрения администрацией.';storeEl('storeOnlyAvailable').disabled=storeMode==='give';}
storeEl('storeTake').onclick=()=>storeSwitch(storeKeeperMode,'take');storeEl('storeGive').onclick=()=>storeSwitch(storeKeeperMode,'give');storeEl('storeKeeper').onclick=()=>storeSwitch(true,'give');
storeEl("storeKeeperSelect").onchange=()=>storeCartToken=null;
storeEl('storeBasketSubmit').onclick=async()=>{storeCartScope();if(storeBusy||!storeCart.size||!['approved','admin'].includes(accessState.mode)||storeKeeperMode&&accessState.mode!=='admin')return;const uid=currentSession.user.id;const name=storeEl('storeBasketPurpose').value.trim()||(storeMode==='take'?'Выдача из кладовой':'Пополнение кладовой');const items=[...storeCart].map(([id,q])=>({id,q}));if(storeMode==='take'&&items.some(x=>x.q>(storeBalances.get(x.id)||0)))return showToast('Проверьте остатки');if(storeKeeperMode&&!confirm('Провести операцию для '+items.length+' позиций?'))return;storeCartToken=storeCartToken||(storeMode==='give'&&!storeKeeperMode?'CRAFT-DEPOSIT-':'CRAFT-')+crypto.randomUUID();storeBusy=true;storeRenderBasket();try{const args={p_token:storeCartToken,p_order_name:name,p_items:items};const result=storeKeeperMode?await supabaseClient.rpc('storage_manual_batch_2763',{...args,p_deposit:storeMode==='give',p_member:storeEl('storeKeeperSelect').value||null}):storeMode==='give'?await supabaseClient.rpc('storage_submit_deposit_batch_2763',args):await supabaseClient.rpc('storage_submit_craft_batch',args);if(result.error)throw result.error;if(currentSession?.user?.id!==uid)return;storeCart.clear();storeCartToken=null;storeEl('storeBasketPurpose').value='';showToast(storeKeeperMode?'Операция проведена':'Общая заявка отправлена');storeEl('storeBasketResult').textContent=storeKeeperMode?'Операция проведена.':'Заявка создана. Ожидается одобрение кладовщика.';await loadStorehouse();}catch(e){showToast('Ошибка: '+e.message);}finally{storeBusy=false;renderStoreCatalog();}};
function renderStoreCatalog(){
 storeCartScope();if(storeKeeperMode&&accessState.mode!=="admin"){storeKeeperMode=false;storeMode="take";storeCart=new Map();storeCartToken=null;}const query=storeEl('storeSearch').value.trim().toLocaleLowerCase('ru'),category=storeEl('storeCategory').value,only=storeMode==="take"&&storeEl('storeOnlyAvailable').checked;const key=JSON.stringify([storeSection,query,category,only]);if(key!==storeFilterKey){storePage=0;storeFilterKey=key;}
 const visible=storeVisibleItems(),filtered=visible.filter(i=>(!query||i.name.toLocaleLowerCase('ru').includes(query))&&(!category||storeItemCategories(i).includes(category))&&(!only||(storeBalances.get(i.id)||0)>0));const pages=Math.max(1,Math.ceil(filtered.length/48));storePage=Math.min(storePage,pages-1);storeEl('storeFilteredCount').textContent=`${filtered.length} из ${visible.length}`;const root=storeEl('storeCatalog');root.replaceChildren();for(const item of filtered.slice(storePage*48,storePage*48+48)){const balance=storeBalances.get(item.id)||0;const tile=storeText(root,'button','','store-tile');tile.type='button';tile.title=item.name+' · '+storeItemCategories(item).join(", ")+(item.description?' · '+item.description:'');tile.disabled=(storeMode==="take"&&balance<=0&&!storeCart.has(item.id))||storeBusy;tile.setAttribute('aria-pressed',String(storeCart.has(item.id)));tile.classList.toggle('selected',storeCart.has(item.id));const visual=storeText(tile,'div','','store-tile-visual');const fallback=()=>{visual.replaceChildren();const icon=document.createElement('img');icon.src='store-icons/resource.svg';icon.alt='';icon.className='store-tile-placeholder';visual.append(icon);};const src=window.storeIconFor?.(item.name);if(src){const img=document.createElement('img');img.alt='';img.loading='lazy';img.onerror=fallback;img.src=src;visual.append(img);}else fallback();storeText(tile,'strong',item.name);storeText(tile,'b',storeNumber.format(balance)+' '+(item.unit||'шт.'));if(storeCart.has(item.id))storeText(tile,'span','✓','store-tile-selected');tile.onclick=()=>storeCartChange(item.id,storeCart.has(item.id)?0:1);}
 if(!filtered.length)storeText(root,'p','Предметов по выбранным условиям нет.','store-muted');const nav=storeEl('storePagination');nav.replaceChildren();for(const [label,delta] of [['←',-1],['→',1]]){if(delta===1)storeText(nav,'span',`${storePage+1} / ${pages}`);const b=storeText(nav,'button',label,'secondary-button');b.type='button';b.disabled=storePage+delta<0||storePage+delta>=pages;b.onclick=()=>{storePage+=delta;renderStoreCatalog();};}storeModeUI();storeRenderBasket();}
let storeBadgeUser=null,storeSeen=new Set(),storeTerminal=[],storeHighlights=new Set();
function storeClearHighlights(){storeHighlights.clear();for(const row of document.querySelectorAll("#storeOwnRequests .store-request-new")){row.classList.remove("store-request-new");row.querySelector(".store-request-new-label")?.remove();}}
function storeBadgeScope(uid){if(uid===storeBadgeUser)return;storeBadgeUser=uid;storeClearHighlights();storeTerminal=[];storeSeen=new Set();try{storeSeen=new Set(JSON.parse(localStorage.getItem('store-seen-2774:'+uid)||'[]'));}catch(e){}storeEl('storeOwnBadge').textContent='0';storeEl('storeManageBadge').textContent='0';storeEl('storePendingBadge').textContent='0';}
function storeMarkSeen(){for(const key of storeTerminal)storeSeen.add(key);try{localStorage.setItem('store-seen-2774:'+storeBadgeUser,JSON.stringify([...storeSeen]));}catch(e){}storeEl('storeOwnBadge').textContent='0';}
function storeUpdateBadges(requests,batches,uid,admin){storeBadgeScope(uid);storeTerminal=[...requests.filter(r=>r.user_id===uid&&['approved','rejected'].includes(r.status)).map(r=>'single:'+r.id+':'+r.status),...batches.filter(r=>r.user_id===uid&&['approved','rejected'].includes(r.status)).map(r=>'batch:'+r.token+':'+r.status)];if(storeActivePanel==='storeOwnRequestsPanel'){for(const key of storeTerminal)if(!storeSeen.has(key))storeHighlights.add(key);storeMarkSeen();}else storeEl('storeOwnBadge').textContent=String(storeTerminal.filter(k=>!storeSeen.has(k)).length);const pending=admin?[...requests,...batches].filter(r=>r.status==='pending').length:0;storeEl('storeManageBadge').textContent=String(pending);storeEl('storePendingBadge').textContent=String(pending);}
let storeBadgePolling=false;
async function storePollBadges(){if(storeBadgePolling||storeBusy||document.hidden||!storehousePage.classList.contains('active-page')||!currentSession?.user||!['approved','admin'].includes(accessState.mode))return;const uid=currentSession.user.id,admin=accessState.mode==='admin';storeBadgePolling=true;try{const [r,b]=await Promise.all([storeAllRows('storage_requests','id,user_id,status,created_at'),storeAllRows('storage_craft_batches','token,user_id,status,created_at')]);if(currentSession?.user?.id!==uid||!storehousePage.classList.contains('active-page')||storeBusy)return;if(['storeOwnRequestsPanel','storeAdminRequests'].includes(storeActivePanel)){await loadStorehouse();}else storeUpdateBadges(r,b,uid,admin);}catch(e){}finally{storeBadgePolling=false;}}
setInterval(storePollBadges,30000);
async function loadStorehouse() {
  if (!supabaseClient || !currentSession?.user || !["approved","admin"].includes(accessState.mode)) return;
  const token=++storeLoadToken;
  const userId=currentSession.user.id;
  storeBadgeScope(userId);
  const isAdmin=accessState.mode==="admin";
  for(const button of document.querySelectorAll("[data-store-admin]"))button.hidden=!isAdmin;
  if(!isAdmin && ["storeManualForm","storeAddForm","storeAdminRequests"].includes(storeActivePanel))storeActivePanel=null;
  storeOpenPanel(storeActivePanel,false);
  storeEl("storeNotice").textContent="Сверяем амбарные книги…";
  try {
    const [items,transactions,requests,profiles,batches] = await Promise.all([
      storeAllRows("storage_items","id,name,category,unit,description,section","name"),
      storeAllRows("storage_transactions","id,item_id,member_id,quantity,description,recorded_by,created_at"),
      storeAllRows("storage_requests","id,item_id,user_id,request_type,quantity,comment,status,created_at,reviewed_at"),
      storeAllRows("profiles","id,character_first_name,character_last_name","created_at"),
      storeAllRows("storage_craft_batches","token,user_id,order_name,items,status,created_at,request_type")
    ]);
    if (token!==storeLoadToken || currentSession?.user?.id!==userId || !storehousePage.classList.contains("active-page")) return;
    storeItems=items.sort((a,b)=>a.name.localeCompare(b.name,"ru"));
    storeCategories=[...new Set(items.map(i=>i.category))].sort((a,b)=>a.localeCompare(b,"ru"));
    storeProfiles=new Map(profiles.map(p=>[p.id,[p.character_first_name,p.character_last_name].filter(Boolean).join(" ")||"Участник"]));
    storeBalances=new Map(items.map(item=>[item.id,0]));
    for (const t of transactions) storeBalances.set(t.item_id,(storeBalances.get(t.item_id)||0)+Number(t.quantity));
    storeEl("storeItemCount").textContent=storeNumber.format(items.length);
    storeEl("storeInStock").textContent=storeNumber.format(items.filter(item=>(storeBalances.get(item.id)||0)>0).length);
    storeEl("storePendingCount").textContent=storeNumber.format(requests.filter(r=>r.status==="pending").length+batches.filter(r=>r.status==="pending").length);
    storeRenderFilters();
    storeRequestCascade.update();storeManualCascade.update();
    const members=profiles.filter(p=>p.character_first_name||p.character_last_name).sort((a,b)=>(storeProfiles.get(a.id)||"").localeCompare(storeProfiles.get(b.id)||"","ru"));
    const memberSelect=storeEl("storeManualForm").elements.member;const selectedMember=memberSelect.value;
    memberSelect.replaceChildren(new Option("Общая операция",""));
    for(const p of members)memberSelect.add(new Option(storeProfiles.get(p.id),p.id));
    if(members.some(p=>p.id===selectedMember))memberSelect.value=selectedMember;
    const keeperSelect=storeEl("storeKeeperSelect"), keeperOld=keeperSelect.value;keeperSelect.replaceChildren(...Array.from(memberSelect.options,o=>o.cloneNode(true)));keeperSelect.value=keeperOld;
    renderStoreCatalog();
    const own=storeEl("storeOwnRequests");own.replaceChildren();
    const mine=requests.filter(r=>r.user_id===userId);
    if(!mine.length&&!batches.some(r=>r.user_id===userId))storeText(own,"p","Вы пока не подавали заявок.");
    const ownRows=[];
    for(const r of mine) {
      const sign=r.request_type==="deposit"?1:-1;
      ownRows.push({key:"single:"+r.id+":"+r.status,date:r.created_at,row:storeRecord(own,`${storeItemName(r.item_id)} — ${r.request_type==="deposit"?"передача":"выдача"}`,`${storeDate(r.created_at)} · ${r.comment||"Без комментария"}`,sign*Number(r.quantity),storeStatus(r.status))});
    }
    const pendingBox=storeEl("storePendingList");pendingBox.replaceChildren();
    if(isAdmin) {
      const pending=requests.filter(r=>r.status==="pending");
      if(!pending.length&&!batches.some(r=>r.status==="pending"))storeText(pendingBox,"p","Заявок на рассмотрении нет.");
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
            catch(err){showToast("Ошибка: "+err.message);}finally{storeBusy=false;btn.disabled=false;renderStoreCatalog();}
          });actions.appendChild(btn);
        }row.appendChild(actions);
      }
    }
    for(const r of batches){
      const details=(Array.isArray(r.items)?r.items:[]).map(i=>`${storeItemName(i.id)} × ${i.q}`).join(' · ');
      if(r.user_id===userId)ownRows.push({key:"batch:"+r.token+":"+r.status,date:r.created_at,row:storeRecord(own,`${r.request_type==='deposit'?'Пополнение':'Выдача'}: ${r.order_name}`,`${storeDate(r.created_at)} · ${details}`,null,storeStatus(r.status))});
      if(isAdmin&&r.status==='pending'){
        const row=storeRecord(pendingBox,`${r.request_type==='deposit'?'Пополнение':'Выдача'}: ${r.order_name} · ${storeProfiles.get(r.user_id)||'Участник'}`,details);
        const actions=document.createElement('div');actions.className='treasury-actions';
        for(const [label,approve] of [['Одобрить весь заказ',true],['Отклонить весь заказ',false]]){
          const btn=document.createElement('button');btn.type='button';btn.className='secondary-button';btn.textContent=label;
          btn.onclick=async()=>{if(storeBusy||!confirm(label+'?'))return;storeBusy=true;btn.disabled=true;try{const {error}=await supabaseClient.rpc('storage_review_craft_batch',{p_token:r.token,p_approve:approve});if(error)throw error;await loadStorehouse();}catch(e){showToast('Ошибка: '+e.message)}finally{storeBusy=false;btn.disabled=false;renderStoreCatalog();}};actions.appendChild(btn);
        }row.appendChild(actions);
      }
    }
    ownRows.sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(x=>own.appendChild(x.row));
    storeUpdateBadges(requests,batches,userId,isAdmin);
    if(storeActivePanel==="storeOwnRequestsPanel")for(const x of ownRows){if(storeHighlights.has(x.key)){x.row.classList.add("store-request-new");storeText(x.row.firstElementChild,"span","Статус обновлён","store-request-new-label");}}
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
  try {const {error}=await supabaseClient.rpc("storage_submit_request",{p_item_id:form.elements.namedItem("item").value,p_request_type:"deposit",p_quantity:quantity,p_comment:form.elements.comment.value.trim()});if(error)throw error;form.reset();storeRequestCascade.reset();showToast("Заявка на пополнение отправлена");storeOpenPanel("storeOwnRequestsPanel",false);await loadStorehouse();}
  catch(err){showToast("Ошибка: "+err.message);}finally{storeBusy=false;renderStoreCatalog();}
});
storeEl("storeManualForm").addEventListener("submit",async event=>{
  event.preventDefault();if(storeBusy||accessState.mode!=="admin")return;
  const form=event.currentTarget;const quantity=Number(form.elements.quantity.value);
  if(!Number.isSafeInteger(quantity)||quantity<=0)return showToast("Укажите положительное целое количество.");
  const signed=form.elements.type.value==="withdraw"?-quantity:quantity;
  if(signed<0 && quantity>(storeBalances.get(form.elements.namedItem("item").value)||0))return showToast("Недостаточно ресурсов в кладовой.");
  if(!form.elements.namedItem("item").value)return showToast("Выберите предмет.");
  if(!window.confirm(`Записать ${signed<0?"выдачу":"поступление"} ${quantity} шт. предмета «${storeItemName(form.elements.namedItem("item").value)}»?`))return;
  storeBusy=true;
  try {const {error}=await supabaseClient.rpc("storage_add_transaction",{p_item_id:form.elements.namedItem("item").value,p_quantity:signed,p_description:form.elements.description.value.trim(),p_member_id:form.elements.member.value||null});if(error)throw error;form.reset();storeManualCascade.reset();showToast("Операция записана");await loadStorehouse();}
  catch(err){showToast("Ошибка: "+err.message);}finally{storeBusy=false;renderStoreCatalog();}
});
storeEl("storeAddForm").addEventListener("submit",async event=>{
  event.preventDefault();if(storeBusy||accessState.mode!=="admin")return;
  const form=event.currentTarget;storeBusy=true;
  try {const section=storeIsBlank(form.elements.namedItem("name").value)?"materials":form.elements.namedItem("section").value;const category=form.elements.category.value.trim();if(section==="products"&&!storeProductCategories.includes(category))throw new Error("Выберите одну из девяти категорий готовой продукции");const {error}=await supabaseClient.rpc(section==="products"?"storage_add_product_item":"storage_add_item",{p_name:form.elements.namedItem("name").value.trim(),p_category:category,p_unit:form.elements.unit.value.trim(),p_description:form.elements.description.value.trim()});if(error)throw error;form.reset();storeEl("storeNewSection").value=storeSection;showToast("Предмет добавлен в каталог");await loadStorehouse();}
  catch(err){showToast("Ошибка: "+err.message);}finally{storeBusy=false;renderStoreCatalog();}
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
  if(workPanel==='workCreatePanel'){workLoadCatalog();workSyncForm();}
  for(const [id,value] of [['workTabPublic','public']]){const b=workEl(id),active=!workPanel&&workTab===value;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));}
  for(const button of document.querySelectorAll('[data-work-panel]')){
    const expanded=button.dataset.workPanel===workPanel;
    button.setAttribute('aria-expanded',String(expanded));
    button.classList.toggle('work-selected',expanded);
  }
}
function workShowReport(task) {
  workOpenPanel(workPanel==='workReportPanel'?null:'workReportPanel');
  if(workPanel==='workReportPanel'){
    workEl('workReportForm').reset();
    workEl('workReportForm').elements.namedItem('task_id').value=task.id;
    workEl('workReportTitle').textContent='Отчёт: '+task.title;
    workEl('workReportPanel').scrollIntoView({behavior:'smooth',block:'nearest'});
  }
}
function workAction(parent,label,callback) {
  const button=workNode('button',label,'secondary-button');button.type='button';
  button.addEventListener('click',callback);parent.appendChild(button);return button;
}
const workActions=['Добыть','Изготовить','Закупить','Доставить','Пополнить кладовую','Охранять','Сопроводить','Другое'];
let workCatalog=[],workSection='materials';
function workParts(task){const action=workActions.find(a=>task.title.startsWith(a+': '));const rest=action?task.title.slice(action.length+2):task.title;const match=action&&rest.match(/^(.*) × (\d+)$/);return {action:action||'',name:match?match[1]:rest,qty:match?match[2]:'—',resource:!!match};}
function workPicture(name){const img=workNode('img',null,'work-item-icon');img.alt='';img.src=window.storeIconFor?.(name)||'store-icons/resource.svg';img.onerror=()=>{img.onerror=null;img.src='store-icons/resource.svg';};return img;}
function workResource(){return workActions.indexOf(workEl('workActionType').value)<5;}
function workUpdateItems(){const select=workEl('workItem'),old=select.value,term=workEl('workItemSearch').value.trim().toLowerCase();const matches=workCatalog.filter(x=>(x.section||'materials')===workSection&&x.name.toLowerCase().includes(term)).sort((a,b)=>a.name.localeCompare(b.name,'ru'));select.replaceChildren(new Option('Выберите предмет',''),...matches.map(x=>new Option(x.name,x.id)));if(matches.some(x=>x.id===old))select.value=old;workPreview();}
function workDraft(){const action=workEl('workActionType').value,item=workCatalog.find(x=>x.id===workEl('workItem').value),qty=workEl('workQty').value;return {action,item,qty,title:action+': '+(workResource()?(item?.name||'Выберите предмет')+' × '+qty:workEl('workCustom').value.trim())};}
function workPreview(){const d=workDraft(),box=workEl('workPreview');box.replaceChildren(workNode('small','Предварительный вид поручения'));const line=workNode('div',null,'work-item-line');line.append(workPicture(d.item?.name||''));const text=workNode('div');text.append(workNode('strong',d.title),workNode('small','Награда: '+workEl('workCreatePanel').elements.reward_amount.value+' гр.'));line.append(text);box.append(line);}
function workSyncForm(){const resource=workResource(),personal=workEl('workCreateType').value==='personal';for(const [id,visible] of [['workResourceFields',resource],['workQtyLabel',resource],['workCustomLabel',!resource],['workAssigneeLabel',personal]])workEl(id).hidden=!visible;for(const [id,enabled] of [['workItem',resource],['workQty',resource],['workCustom',!resource],['workAssignee',personal]]){workEl(id).disabled=!enabled;workEl(id).required=enabled;}for(const [id,value] of [['workTypeChoice',workEl('workCreateType').value],['workSectionChoice',workSection]])for(const b of workEl(id).querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.value===value));workPreview();}
async function workLoadCatalog(){try{workCatalog=await storeAllRows('storage_items','id,name,section','name');workUpdateItems();}catch(e){showToast('Не удалось загрузить каталог: '+e.message);}}
function workDetailCard(parent,task,kind='board') {
  const card=workNode('article',null,'work-card');
  const top=workNode('div',null,'work-card-top');
  top.append(workNode('strong',task.title),workNode('span',workStatusNames[task.status]||task.status,'treasury-status'));
  card.append(top);
  card.append(workNode('small',`${task.task_type==='personal'?'Личное':'Общее'} · Награда: ${task.reward_amount} грошей`));
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
function workCard(parent,task,kind='board') {
  let table=parent.querySelector('table');
  if(!table){table=workNode('table',null,'work283-table');const head=table.createTHead().insertRow();for(const label of ['Поручение','Кол-во','Награда','Исполнитель','Статус',''])head.append(workNode('th',label));table.createTBody();parent.append(table);}
  const row=table.tBodies[0].insertRow();const title=row.insertCell();const parts=workParts(task),line=workNode('div',null,'work-item-line'),label=workNode('div');label.append(workNode('strong',parts.name),workNode('small',[parts.action,task.task_type==='personal'?'Личное':'Общее'].filter(Boolean).join(' · ')));line.append(workPicture(parts.resource?parts.name:''),label);title.append(line);row.insertCell().textContent=parts.qty;
  row.insertCell().textContent=task.reward_amount+' гр.';row.insertCell().textContent=workPeople.get(task.assigned_to)||'—';row.insertCell().append(workNode('span',workStatusNames[task.status]||task.status,'work283-status '+task.status));
  workAction(row.insertCell(),'›',()=>{const d=workEl('work283Detail'),body=workEl('work283DetailBody');body.replaceChildren();const close=workAction(body,'×',()=>d.close());close.classList.add('work283-close');workDetailCard(body,task,kind);for(const b of body.querySelectorAll('.treasury-actions button'))b.addEventListener('click',()=>d.close(),{capture:true});d.showModal();}).setAttribute('aria-label','Подробности: '+task.title);
}
function workRender() {
  const type=workEl('workTypeFilter').value;
  workEl('workListTitle').textContent='Все поручения';
  const action=workEl('workActionFilter');
  const term=workEl('workSearch').value.trim().toLocaleLowerCase(),status=workEl('workStatusFilter').value;
  const filtered=workTasks.filter(t=>(!type||t.task_type===type)&&!['completed','cancelled'].includes(t.status)&&(!action.value||workParts(t).action===action.value)&&(!status||t.status===status)&&[t.title,t.description,workPeople.get(t.assigned_to)].join(' ').toLocaleLowerCase().includes(term));
  const pendingCount=workReports.filter(r=>r.status==='pending').length;workEl('workPendingCount').textContent=pendingCount?'('+pendingCount+')':'';
  workEl('workCount').textContent=`${filtered.length} поручений`;
  const board=workEl('workTaskList');board.replaceChildren();
  if(!filtered.length)board.append(workNode('p','Нет поручений по выбранным фильтрам.','store-muted'));
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
    workEl('workReviewCount').textContent='Ожидают решения: '+pending.length;
    if(!pending.length)reports.append(workNode('p','Отчётов на проверке нет.','store-muted'));
    else {
      const table=workNode('table',null,'work283-table work-review-table');
      const head=table.createTHead().insertRow();for(const label of ['Поручение','Исполнитель','Результат','Дата',''])head.append(workNode('th',label));const tbody=table.createTBody();reports.append(table);
      for(const r of pending){
        const task=workTasks.find(t=>t.id===r.task_id),parts=task?workParts(task):null;
        const [first,...rest]=String(r.report_text||'').split('\n');const known=['Выполнено','Не выполнено'].includes(first),failed=first==='Не выполнено';
        const result=known?first:'Отчёт',comment=known?rest.join('\n'):r.report_text;
        const row=tbody.insertRow(),line=workNode('div',null,'work-item-line');line.append(workPicture(parts?.resource?parts.name:''),workNode('strong',task?.title||'Поручение'));row.insertCell().append(line);
        row.insertCell().textContent=workPeople.get(r.user_id)||'Участник';row.insertCell().append(workNode('span',result,'work283-status '+(failed?'submitted':'open')));row.insertCell().textContent=workDate(r.created_at);
        workAction(row.insertCell(),'Проверить',()=>{
          const d=workEl('work283Detail'),body=workEl('work283DetailBody');body.replaceChildren();workAction(body,'×',()=>d.close()).classList.add('work283-close');
          const card=workNode('article',null,'work-review-detail');card.append(workNode('h3',task?.title||'Поручение'),workNode('small',workPeople.get(r.user_id)||'Участник'),workNode('strong',result,'work283-status '+(failed?'submitted':'open')),workNode('p',comment||'Без комментария'));
          const actions=workNode('div',null,'work-result-actions');
          if(!failed)workAction(actions,'✓ Подтвердить выполнение',()=>{d.close();workPerform('work_review_report',{p_report_id:r.id,p_approve:true},'Отчёт принят','Подтвердить выполнение?');}).classList.add('work-result-ok');
          workAction(actions,'Вернуть в работу',()=>{d.close();workPerform('work_review_report',{p_report_id:r.id,p_approve:false},'Поручение возвращено в работу','Вернуть поручение исполнителю?');}).classList.add('work-result-no');card.append(actions);body.append(card);d.showModal();
        });
      }
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

function workSwitchTab(tab){
  workTab=tab;
  for(const [id,value] of [['workTabPublic','public']]){
    const b=workEl(id);b.classList.toggle('active',tab===value);b.setAttribute('aria-selected',String(tab===value));
  }
  if(workPanel)workOpenPanel(workPanel);
  workRender();
}
workEl('workRefresh').addEventListener('click',loadWork);
for(const id of ['workSearch','workActionFilter','workStatusFilter','workTypeFilter'])workEl(id).addEventListener(id==='workSearch'?'input':'change',workRender);
setInterval(()=>{if(!document.hidden&&!workBusy&&workPage.classList.contains('active-page')&&!workEl('work283Detail').open&&!workPanel)loadWork();},30000);
for(const a of workActions)workEl('workActionFilter').add(new Option(a,a));
workEl('workTypeChoice').addEventListener('click',e=>{const b=e.target.closest('button');if(b){workEl('workCreateType').value=b.dataset.value;workSyncForm();}});
workEl('workSectionChoice').addEventListener('click',e=>{const b=e.target.closest('button');if(b){workSection=b.dataset.value;workEl('workItemSearch').value='';workUpdateItems();workSyncForm();}});
workEl('workActionType').addEventListener('change',workSyncForm);workEl('workItemSearch').addEventListener('input',workUpdateItems);workEl('workCreatePanel').addEventListener('input',workPreview);workEl('workItem').addEventListener('change',workPreview);workEl('workCreateClose').onclick=()=>workOpenPanel('workCreatePanel');
workSyncForm();
workEl('workCreatePanel').addEventListener('submit',async event=>{
  event.preventDefault();if(workBusy||accessState.mode!=='admin')return;
  const f=event.currentTarget;
  const amount=Number(f.elements.namedItem('reward_amount').value);
  if(!Number.isSafeInteger(amount)||amount<0)return showToast('Укажите целую неотрицательную награду.');
  const deadline=f.elements.namedItem('deadline').value;
  const draft=workDraft();if(workResource()&&(!draft.item||!Number.isSafeInteger(Number(draft.qty))||Number(draft.qty)<1))return showToast('Выберите предмет и количество.');if(draft.title.length>150)return showToast('Название слишком длинное.');
  const args={p_title:draft.title,p_description:f.elements.namedItem('description').value.trim(),p_category:draft.action,p_task_type:f.elements.namedItem('task_type').value,p_reward_amount:amount,p_assigned_to:f.elements.namedItem('assigned_to').value||null,p_deadline:deadline?new Date(deadline).toISOString():null};
  workBusy=true;
  try{const {error}=await supabaseClient.rpc('work_create_task',args);if(error)throw error;f.reset();workSection='materials';workUpdateItems();workSyncForm();workOpenPanel('workCreatePanel');showToast('Поручение создано');await loadWork();}
  catch(err){showToast('Ошибка: '+err.message);}finally{workBusy=false;}
});
workEl('workReportClose').onclick=()=>workOpenPanel('workReportPanel');
workEl('workReportForm').addEventListener('submit',async event=>{
  event.preventDefault();if(workBusy)return;
  const f=event.currentTarget;
  const result=event.submitter?.value;if(!['Выполнено','Не выполнено'].includes(result))return;
  const comment=f.elements.namedItem('report_text').value.trim();
  const args={p_task_id:f.elements.namedItem('task_id').value,p_report_text:result+(comment?'\n'+comment:'')};
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
  marketEl('marketBoardPanel').hidden=Boolean(marketPanel); marketTabState(); marketBadge();
  for(const b of document.querySelectorAll('[data-market-panel]')){const active=b.dataset.marketPanel===marketPanel;b.setAttribute('aria-expanded',String(active));b.classList.toggle('store-action-active',active);}
}
function marketTabState(){const type=marketEl('marketFilterType').value;for(const b of [marketEl('marketAll'),...document.querySelectorAll('[data-market-type]')]){const active=!marketPanel&&(b.dataset.marketType||'all')===type;b.classList.toggle('store-action-active',active);b.setAttribute('aria-pressed',String(active));}}
function marketSelect(options,cls){const s=marketNode('select',null,cls);for(const [value,label] of options)s.add(new Option(label,value));return s;}
function marketAddRow(item=null){
 const wrap=marketNode('div',null,'market-item-row');
 const picker=marketNode('div',null,'market-picker'),search=marketNode('input'),product=marketSelect([]),quantity=marketNode('input'),price=marketNode('input'),priceMax=marketNode('input');
 search.type='search';search.placeholder='Найти предмет…';search.setAttribute('aria-label','Поиск предмета');product.setAttribute('aria-label','Предмет');product.required=true;product.className='market-choice';
 function update(wanted){const term=search.value.trim().toLowerCase();const matches=marketCatalog.filter(x=>x.name.toLowerCase().includes(term)).sort((a,b)=>a.name.localeCompare(b.name,'ru'));product.replaceChildren(new Option('Выбрать предмет',''),...matches.map(x=>new Option(x.name+' · '+x.category,x.id)));if(matches.some(x=>x.id===wanted))product.value=wanted;}
 update(item?.item_id);search.addEventListener('input',()=>update(product.value));picker.append(search,product);
 quantity.type='number';quantity.min='1';quantity.max='100000000';quantity.step='1';quantity.required=true;quantity.value=String(item?.quantity??1);quantity.setAttribute('aria-label','Количество');quantity.className='market-quantity';
 for(const [x,label,cls] of [[price,'Цена от','market-price-min'],[priceMax,'Цена до','market-price-max']]){x.type='number';x.min='0';x.max='1000000000';x.step='1';x.placeholder='—';x.setAttribute('aria-label',label);x.className=cls;}if(item?.price!=null){price.value=String(item.price);priceMax.value=String(item.price_max??item.price);}
 const remove=marketNode('button','×','secondary-button');remove.type='button';remove.setAttribute('aria-label','Удалить товар');remove.onclick=()=>wrap.remove();wrap.append(picker,quantity,price,priceMax,remove);marketEl('marketItemRows').append(wrap);return wrap;
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
  if(items.length){const list=marketNode('ul',null,'market-card-items');for(const it of items)list.append(marketNode('li',`${it.item_name} — ${it.quantity} ${it.unit||'шт.'} · ${it.price==null?'Цена договорная':marketPrice(it)+' грошей/ед.'}`));card.append(list);}
  else card.append(marketNode('small',`${ad.category} · ${ad.quantity} шт. · ${ad.price==null?'Цена договорная':ad.price+' грошей'} (старое объявление)`));
  if(ad.description)card.append(marketNode('p',ad.description));
  card.append(marketNode('small',`Автор: ${marketNames.get(ad.author_id)||'Участник'} · ${new Date(ad.created_at).toLocaleString('ru-RU')}`));
  if(ad.contact)card.append(marketNode('small',`Связь: ${ad.contact}`));
  const mine=ad.author_id===currentSession?.user?.id;
  
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
function marketPrice(it){return it.price==null?'Договорная':it.price_max!=null&&Number(it.price_max)!==Number(it.price)?`${it.price}–${it.price_max}`:String(it.price);}
let marketDeals=[],marketHistoryMine=false,marketReactions=[],marketMineClosed=false,marketSelected=null;
function marketEntries(){const catalog=new Map(marketCatalog.map(x=>[x.id,x]));return marketRows.flatMap(ad=>(ad.market_ad_items?.length?ad.market_ad_items:[{item_name:ad.title,quantity:ad.quantity,price:ad.price,category:ad.category}]).map(it=>({ad,it,cat:catalog.get(it.item_id)})));}
function marketActive(e){return e.ad.status==='active'&&!e.it.closed_v2822;}
function marketReplies(it){return marketReactions.filter(r=>r.position_id===it.id);}
function marketIcon(it){const img=marketNode('img');img.alt='';img.src=window.storeIconFor?.(it.item_name)||'store-icons/resource.svg';img.onerror=()=>{img.onerror=null;img.src='store-icons/resource.svg';};return img;}
function marketCloseDetail(){marketSelected=null;const d=marketEl('marketDetail');if(d.open)d.close();}
function marketDetail(e){const {ad,it,cat}=e,d=marketEl('marketDetail'),mine=ad.author_id===currentSession?.user?.id;marketSelected=it.id||ad.id;d.replaceChildren();const head=marketNode('div',null,'market-dialog-head'),name=marketNode('div');name.append(marketNode('h2',it.item_name),marketNode('small',(marketTypeNames[ad.ad_type]||ad.ad_type)+' · '+(cat?.category||it.category||''),`market-${ad.ad_type}`));head.append(marketIcon(it),name);marketAction(head,'×',marketCloseDetail);d.append(head);const stats=marketNode('div',null,'market-dialog-stats');for(const [label,value] of [['Количество',`${it.quantity} ${it.unit||'шт.'}`],['Цена за единицу',marketPrice(it)+(it.price==null?'':' гр.')]]){const x=marketNode('div');x.append(marketNode('small',label),marketNode('strong',value));stats.append(x);}d.append(stats);d.append(marketNode('p',(ad.ad_type==='buy'?'Покупатель: ':'Продавец: ')+(marketNames.get(ad.author_id)||'Участник')));if(ad.description)d.append(marketNode('p',ad.description));if(ad.contact)d.append(marketNode('p','Связь: '+ad.contact));const replies=marketReplies(it);d.append(marketNode('p','Заинтересованы: '+(replies.map(r=>marketNames.get(r.user_id)||'Участник').join(', ')||'Пока никто'),'market-replies'));const actions=marketNode('div',null,'market-dialog-actions');if(!mine&&it.id&&marketActive(e))marketReactButton(actions,e);if(mine&&it.id&&ad.status==='active'){marketAction(actions,'Изменить',()=>marketEditPosition(e));marketAction(actions,it.closed_v2822?'Открыть':'Закрыть',()=>marketPositionStatus(e));}if(mine&&!it.id)marketAction(actions,'Закрыть / открыть',()=>marketRpc('market_set_status',{p_id:ad.id,p_status:ad.status==='active'?'closed':'active'},'Статус обновлён'));d.append(actions);if(!d.open)d.showModal();}
function marketReactButton(parent,e){const mine=marketReplies(e.it).some(r=>r.user_id===currentSession?.user?.id);marketAction(parent,mine?'✓ Отозвать':'🤝 Сделка',()=>marketRpc('market_react_v2822',{p_position:e.it.id,p_on:!mine},mine?'Отклик отозван':'Отклик отправлен'));parent.lastChild.classList.add(mine?'market-reacted':'market-react');}
function marketPositionStatus(e){
 const change=()=>marketRpc('market_position_v2822',{p_position:e.it.id,p_closed:!e.it.closed_v2822,p_quantity:null,p_price:null,p_max:null},'Статус обновлён');
 if(e.it.closed_v2822)return change();
 const d=marketEl('marketDetail');marketSelected=null;d.replaceChildren(marketNode('h2',e.it.item_name));
 const f=marketNode('form',null,'market-position-edit'), replies=marketReplies(e.it);
 const partner=marketNode('select');partner.required=true;partner.add(new Option('Выберите участника',''));for(const r of replies)partner.add(new Option(marketNames.get(r.user_id)||'Участник',r.user_id));
 const qty=marketNode('input'),price=marketNode('input');for(const [label,input] of [['Контрагент',partner],['Количество',qty],['Цена за единицу',price]]){const l=marketNode('label',label);l.append(input);f.append(l);}qty.type=price.type='number';qty.min=1;qty.max=e.it.quantity;qty.value=e.it.quantity;price.min=0;price.max=1000000000;price.value=e.it.price??'';qty.required=price.required=true;
 const b=marketNode('button','Сделка состоялась','primary-button');b.type='submit';b.disabled=!replies.length;f.append(b);if(!replies.length)f.append(marketNode('small','Нет откликов для выбора контрагента.'));marketAction(f,'Снять объявление',()=>{marketCloseDetail();change();});marketAction(f,'Отмена',()=>marketDetail(e));d.append(f);if(!d.open)d.showModal();f.onsubmit=ev=>{ev.preventDefault();const args={p_position:e.it.id,p_partner:partner.value,p_quantity:Number(qty.value),p_price:Number(price.value)};marketCloseDetail();marketRpc('market_finish_v2823',args,'Сделка записана в историю');};
}
function marketRenderHistory(){const archive=marketEl('marketArchiveList'),uid=currentSession?.user?.id;archive.replaceChildren();const bar=marketNode('div',null,'market-dialog-actions');marketAction(bar,'Все сделки',()=>{marketHistoryMine=false;marketRenderHistory();});marketAction(bar,'Мои сделки',()=>{marketHistoryMine=true;marketRenderHistory();});bar.children[marketHistoryMine?1:0].classList.add('store-action-active');archive.append(bar);const rows=marketDeals.filter(x=>!marketHistoryMine||[x.buyer_id,x.seller_id].includes(uid)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));const table=marketNode('table',null,'market-table'),head=table.createTHead().insertRow();for(const h of ['Предмет','Кол-во','Гр./ед.','Сумма',''])head.append(marketNode('th',h));const body=table.createTBody();for(const x of rows){const tr=body.insertRow();for(const v of [x.item_name,x.quantity+' '+x.unit,x.price,(BigInt(x.quantity)*BigInt(x.price)).toString()+' гр.'])tr.insertCell().textContent=v;marketAction(tr.insertCell(),'›',()=>{const d=marketEl('marketDetail');marketSelected=null;d.replaceChildren(marketNode('h2',x.item_name));for(const t of ['Покупатель: '+(marketNames.get(x.buyer_id)||'Участник'),'Продавец: '+(marketNames.get(x.seller_id)||'Участник'),'Количество: '+x.quantity+' '+x.unit,'Цена: '+x.price+' гр.','Сумма: '+(BigInt(x.quantity)*BigInt(x.price)).toString()+' гр.','Дата: '+new Date(x.created_at).toLocaleString('ru-RU')])d.append(marketNode('p',t));marketAction(d,'Закрыть',marketCloseDetail);d.showModal();});}archive.append(table,marketNode('p','Сделок: '+rows.length+' · Оборот: '+rows.reduce((a,x)=>a+BigInt(x.quantity)*BigInt(x.price),0n).toString()+' гр.'));for(const ad of marketRows.filter(a=>['completed','deal'].includes(a.status)&&(!marketHistoryMine||[a.author_id,a.deal_with].includes(uid))))archive.append(marketCard(ad));}
function marketEditPosition(e){const d=marketEl('marketDetail');d.replaceChildren(marketNode('h2',e.it.item_name));const form=marketNode('form',null,'market-position-edit');for(const [key,label,value] of [['quantity','Количество',e.it.quantity],['price','Цена от',e.it.price],['max','Цена до',e.it.price_max??e.it.price]]){const l=marketNode('label',label),i=marketNode('input');i.name=key;i.type='number';i.min=key==='quantity'?'1':'0';i.step='1';i.value=value??'';i.required=key==='quantity';l.append(i);form.append(l);}const save=marketNode('button','Сохранить','primary-button');save.type='submit';form.append(save);marketAction(form,'Отмена',()=>marketDetail(e));form.onsubmit=ev=>{ev.preventDefault();const v=k=>form.elements[k].value===''?null:Number(form.elements[k].value);marketRpc('market_position_v2822',{p_position:e.it.id,p_closed:null,p_quantity:v('quantity'),p_price:v('price'),p_max:v('max')??v('price')},'Позиция обновлена');};d.append(form);}
function marketTable(container,entries,own=false){container.replaceChildren();const table=marketNode('table',null,'market-table'),head=table.createTHead().insertRow();for(const label of ['Тип','Предмет','Кол-во','Гр./ед.',own?'Статус':'Участник','Отклики',''])head.append(marketNode('th',label));const body=table.createTBody();for(const e of entries){const {ad,it,cat}=e,tr=body.insertRow(),mine=ad.author_id===currentSession?.user?.id;tr.insertCell().append(marketNode('strong',marketTypeNames[ad.ad_type]||ad.ad_type,`market-${ad.ad_type}`));const item=marketNode('div',null,'market-product'),name=marketNode('div');name.append(marketNode('strong',it.item_name),marketNode('small',cat?.category||it.category));item.append(marketIcon(it),name);tr.insertCell().append(item);tr.insertCell().textContent=`${it.quantity} ${it.unit||'шт.'}`;tr.insertCell().textContent=marketPrice(it);tr.insertCell().textContent=own?(marketActive(e)?'Активно':'Закрыто'):marketNames.get(ad.author_id)||'Участник';tr.insertCell().append(marketNode('span','🤝 '+marketReplies(it).length,'market-replies'));const actions=tr.insertCell();actions.className='market-row-actions';if(!mine&&it.id&&marketActive(e))marketReactButton(actions,e);if(own&&it.id&&ad.status==='active'){marketAction(actions,'✎',()=>{marketDetail(e);marketEditPosition(e);});marketAction(actions,marketActive(e)?'Закрыть':'Открыть',()=>marketPositionStatus(e));}marketAction(actions,'›',()=>marketDetail(e));}container.append(table);if(!entries.length)container.append(marketNode('p','Объявлений нет.','store-muted'));}
function marketRender(){marketTabState();const uid=currentSession?.user?.id,type=marketEl('marketFilterType').value,section=marketEl('marketFilterCategory').value,craft=marketEl('marketCraft').value,search=marketEl('marketSearch').value.trim().toLowerCase(),sort=marketEl('marketSort').value;const all=marketEntries();const entries=all.filter(e=>marketActive(e)&&e.ad.ad_type!=='exchange').filter(({ad,it,cat})=>(type==='all'||ad.ad_type===type)&&(section==='all'||cat?.section===section)&&(craft==='all'||cat&&storeProductCrafts(cat).includes(craft))&&[it.item_name,ad.title,ad.description,marketNames.get(ad.author_id)].join(' ').toLowerCase().includes(search));entries.sort((a,b)=>sort==='new'?new Date(b.ad.created_at)-new Date(a.ad.created_at):a.it.price==null?1:b.it.price==null?-1:sort==='low'?Number(a.it.price)-Number(b.it.price):Number(b.it.price_max??b.it.price)-Number(a.it.price_max??a.it.price));marketTable(marketEl('marketAdList'),entries);marketEl('marketCount').textContent=`Позиций: ${entries.length}`;const own=all.filter(e=>e.ad.author_id===uid);marketEl('marketOwnActive').textContent='Активные ('+own.filter(marketActive).length+')';marketEl('marketOwnClosed').textContent='Закрытые ('+own.filter(e=>!marketActive(e)).length+')';marketEl('marketOwnActive').classList.toggle('store-action-active',!marketMineClosed);marketEl('marketOwnClosed').classList.toggle('store-action-active',marketMineClosed);marketTable(marketEl('marketMineList'),own.filter(e=>marketActive(e)!==marketMineClosed).sort((a,b)=>new Date(b.ad.created_at)-new Date(a.ad.created_at)),true);marketRenderHistory();const selected=all.find(e=>(e.it.id||e.ad.id)===marketSelected);if(marketSelected){if(selected)marketDetail(selected);else marketCloseDetail();}marketBadge();}
function marketBadge(){const uid=currentSession?.user?.id;if(!uid)return;const ids=new Set(marketEntries().filter(e=>e.ad.author_id===uid).map(e=>e.it.id));let seen=[];try{seen=JSON.parse(localStorage.getItem('marketSeen2822:'+uid)||'[]');}catch{}const keys=marketReactions.filter(r=>ids.has(r.position_id)).map(r=>r.position_id+':'+r.user_id+':'+r.created_at);if(marketPanel==='marketMinePanel'){try{localStorage.setItem('marketSeen2822:'+uid,JSON.stringify(keys));}catch{}seen=keys;}const n=keys.filter(k=>!seen.includes(k)).length;marketEl('marketMineBadge').textContent=n?String(n):'';}
marketEl('marketOwnActive').onclick=()=>{marketMineClosed=false;marketRender();};marketEl('marketOwnClosed').onclick=()=>{marketMineClosed=true;marketRender();};marketEl('marketDetail').addEventListener('close',()=>{marketSelected=null;});marketEl('marketDetail').addEventListener('click',e=>{if(e.target===marketEl('marketDetail'))marketCloseDetail();});
setInterval(()=>{if(document.getElementById('page-market')?.classList.contains('active-page')&&!marketBusy&&!marketEl('marketDetail').open&&marketPanel!=='marketCreatePanel')loadMarket();},30000);
async function loadMarket(){
  if(!supabaseClient||!currentSession?.user||!['approved','admin'].includes(accessState.mode))return;
  const uid=currentSession.user.id,token=++marketLoadToken;marketEl('marketNotice').textContent='Загружаем объявления…';
  try{
    const [ads,people,catalog,reactions,deals]=await Promise.all([
      storeAllRows('market_ads','id,author_id,deal_with,deal_at,completed_at,ad_type,category,title,description,quantity,price,contact,status,created_at,market_ad_items(id,item_id,item_name,category,unit,quantity,price,price_max,closed_v2822)','id').then(data=>({data})),
      supabaseClient.from('profiles').select('id,character_first_name,character_last_name').limit(1000),
      storeAllRows('storage_items','id,name,category,unit,section','id').then(data=>({data})),
      storeAllRows('market_reactions_v2822','position_id,user_id,created_at','position_id'),
      storeAllRows('market_deals_v2823','id,item_name,unit,buyer_id,seller_id,quantity,price,created_at','id')
    ]);
    if(ads.error)throw ads.error;if(people.error)throw people.error;if(catalog.error)throw catalog.error;if(token!==marketLoadToken||currentSession?.user?.id!==uid)return;
    marketRows=ads.data||[];marketCatalog=catalog.data||[];marketReactions=reactions||[];marketDeals=deals||[];
    marketNames=new Map((people.data||[]).map(p=>[p.id,[p.character_first_name,p.character_last_name].filter(Boolean).join(' ')||'Участник']));
    const cf=marketEl('marketCraft'),old=cf.value;cf.replaceChildren(new Option('Все ремёсла','all'));for(const c of [...new Set(marketCatalog.flatMap(storeProductCrafts))].sort())cf.add(new Option(c,c));if([...cf.options].some(o=>o.value===old))cf.value=old;
    marketRender();marketEl('marketNotice').textContent='';
  }catch(err){if(token===marketLoadToken)marketEl('marketNotice').textContent='Ошибка загрузки рынка: '+err.message;}
}
async function marketRpc(name,args,success,confirmText){
  if(marketBusy)return;if(confirmText&&!window.confirm(confirmText))return;marketBusy=true;
  try{const {error}=await supabaseClient.rpc(name,args);if(error)throw error;showToast(success);await loadMarket();}
  catch(err){showToast('Ошибка: '+err.message);}finally{marketBusy=false;}
}
for(const b of document.querySelectorAll('[data-market-panel]'))b.addEventListener('click',()=>{if(b.dataset.marketPanel==='marketCreatePanel'&&marketPanel!=='marketCreatePanel')marketResetForm();marketOpenPanel(b.dataset.marketPanel);});
marketEl('marketAddItem').addEventListener('click',()=>{if(marketEl('marketItemRows').children.length>=30)return showToast('Не более 30 позиций.');marketAddRow();});
marketEl('marketAll').onclick=()=>{marketOpenPanel(null,true);marketEl('marketFilterType').value='all';marketRender();};for(const b of document.querySelectorAll('[data-market-type]'))b.onclick=()=>{marketOpenPanel(null,true);marketEl('marketFilterType').value=b.dataset.marketType;marketRender();};
marketEl('marketRefresh').addEventListener('click',loadMarket);
for(const id of ['marketFilterType','marketFilterCategory','marketCraft','marketSort'])marketEl(id).addEventListener('change',marketRender);
marketEl('marketSearch').addEventListener('input',marketRender);
marketEl('marketCancelEdit').addEventListener('click',()=>{marketResetForm();marketOpenPanel(null,true);});
marketEl('marketCreatePanel').addEventListener('submit',async e=>{
  e.preventDefault();if(marketBusy)return;const f=e.currentTarget;
  const items=[];
  for(const row of marketEl('marketItemRows').children){
    const [product,quantity,price,priceMax]=['.market-choice','.market-quantity','.market-price-min','.market-price-max'].map(c=>row.querySelector(c));
    const item_id=product.value,q=Number(quantity.value),p=price.value.trim()===''?null:Number(price.value);
    if(!item_id||!Number.isSafeInteger(q)||q<1||q>100000000||(p!==null&&(!Number.isSafeInteger(p)||p<0)))return showToast('Проверьте выбранные товары, количество и цены.');
    const hi=priceMax.value.trim()===''?p:Number(priceMax.value);if((p===null)!==(hi===null)||hi!==null&&(!Number.isSafeInteger(hi)||hi<p||hi>1000000000))return showToast('Проверьте диапазон цены.');items.push({item_id,quantity:q,price:p,price_max:hi});
  }
  if(!items.length||items.length>30||new Set(items.map(x=>x.item_id)).size!==items.length)return showToast('Добавь от 1 до 30 разных товаров.');
  const fields={p_type:f.elements.namedItem('ad_type').value,p_title:f.elements.namedItem('title').value.trim()||((f.elements.namedItem('ad_type').value==='buy'?'Куплю: ':'Продам: ')+items.map(i=>marketCatalog.find(c=>c.id===i.item_id)?.name||'').join(', ')).slice(0,140),p_description:f.elements.namedItem('description').value.trim(),p_contact:f.elements.namedItem('contact').value.trim(),p_items:items};
  const editing=marketEditing,rpc=editing?'market_edit_listing_v282':'market_create_listing_v282',args=editing?{p_id:editing,...fields}:fields;
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
function calOpen(id){calPanel=id==='calendarBoardPanel'?null:calPanel===id?null:id;for(const el of document.querySelectorAll('.calendar-panel'))el.hidden=el.id!==calPanel;calEl('calendarBoardPanel').hidden=!!calPanel;calEl('calendarBoardButton').setAttribute('aria-expanded',String(!calPanel));for(const b of document.querySelectorAll('[data-calendar-panel]'))b.setAttribute('aria-expanded',String(b.dataset.calendarPanel===calPanel));}
function calReset(){calEditing=null;calEl('calendarCreatePanel').reset();calEl('calendarCreatePanel').elements.namedItem('category').value='other';calEl('calendarFormHeading').textContent='Новое мероприятие';calEl('calendarSave').textContent='Создать';}
let calPhotos=new Map();
function calEventCard(ev){const card=calNode('button',null,'cal-event-row');card.type='button';const dt=new Date(ev.starts_at),date=calNode('span',null,'cal-date-plaque');date.append(calNode('strong',String(dt.getDate())),calNode('small',dt.toLocaleDateString('ru-RU',{month:'short'})));const body=calNode('span',null,'cal-event-text');const attendees=calAttendees.filter(a=>a.event_id===ev.id);body.append(calNode('strong',ev.title),calNode('small',dt.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})+' · Участников: '+attendees.length+(ev.location?' · '+ev.location:'')));card.append(date,body,calNode('span',ev.status==='cancelled'?'Отменено':dt<=new Date()?'Прошло':attendees.some(a=>a.user_id===currentSession?.user?.id)?'Вы записаны':'Подробнее →','cal-row-status'));card.onclick=()=>calDetail(ev);return card;}
function calDetail(ev){
 const dialog=calEl("calendarDetail");dialog.replaceChildren();
 const card=calNode('article',null,'cal-detail-body');const head=calNode('div',null,'work-card-top');head.append(calNode('strong',ev.title),calNode('span',ev.status==='cancelled'?'Отменено':calCategories[ev.category]||'Событие','treasury-status'));card.append(head);
 card.append(calNode('p','📅 '+calDate(ev.starts_at)+(ev.ends_at?' — '+calDate(ev.ends_at):'')));
 if(ev.location)card.append(calNode('p','📍 '+ev.location));if(ev.description)card.append(calNode('p',ev.description));
 const attendees=calAttendees.filter(a=>a.event_id===ev.id),mine=attendees.some(a=>a.user_id===currentSession?.user?.id);
 card.append(calNode('p','Организатор: '+(calPeople.get(ev.created_by)||'Участник'),'store-muted'));card.append(calNode('h3','Участники ('+attendees.length+')'));const roster=calNode('div',null,'cal-roster');for(const a of attendees){const person=calNode('div',null,'cal-person'),url=calPhotos.get(a.user_id);if(url){const img=calNode('img');img.src=url;img.alt='';person.append(img);}else person.append(calNode('span','♙','cal-avatar'));person.append(calNode('small',calPeople.get(a.user_id)||'Участник'));roster.append(person);}if(!attendees.length)roster.append(calNode('p','Пока никто не записался'));card.append(roster);
 const actions=calNode('div',null,'treasury-actions');
 if(ev.status==='scheduled'&&new Date(ev.starts_at)>new Date()&&['approved','admin'].includes(accessState.mode)){
  const b=calNode('button',mine?'Отменить участие':'Буду участвовать','secondary-button');b.type='button';b.addEventListener('click',()=>{dialog.close();calRpc(mine?'guild_event_leave':'guild_event_join',{p_event_id:ev.id},mine?'Запись отменена':'Вы записаны');});actions.append(b);
 }
 if(accessState.mode==='admin'&&ev.status==='scheduled'){
  const edit=calNode('button','Изменить','secondary-button');edit.type='button';edit.addEventListener('click',()=>{dialog.close();calReset();calEditing=ev.id;const f=calEl('calendarCreatePanel');for(const key of ['title','description','category','location'])f.elements.namedItem(key).value=ev[key]||'';f.elements.namedItem('starts_at').value=calLocalInput(ev.starts_at);f.elements.namedItem('ends_at').value=calLocalInput(ev.ends_at);calEl('calendarFormHeading').textContent='Редактировать мероприятие';calEl('calendarSave').textContent='Сохранить';calPanel=null;calOpen('calendarCreatePanel');});actions.append(edit);
  const cancel=calNode('button','Отменить мероприятие','secondary-button');cancel.type='button';cancel.addEventListener('click',()=>{if(confirm('Отменить мероприятие «'+ev.title+'»?')){dialog.close();calRpc('guild_event_cancel',{p_event_id:ev.id},'Мероприятие отменено');}});actions.append(cancel);
 }
 const close=calNode('button','Закрыть','secondary-button');close.type='button';close.onclick=()=>dialog.close();actions.append(close);card.append(actions);dialog.append(card);if(!dialog.open)dialog.showModal();
}
function calFill(container,events,empty){container.replaceChildren();for(const ev of events)container.append(calEventCard(ev));if(!events.length)container.append(calNode('p',empty,'store-muted'));}
function calRender(){
 const year=calMonth.getFullYear(),month=calMonth.getMonth();calEl('calendarMonthTitle').textContent=calMonth.toLocaleDateString('ru-RU',{month:'long',year:'numeric'});
 const grid=calEl('calendarGrid');grid.replaceChildren();for(const d of ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'])grid.append(calNode('div',d,'calendar-weekday'));
 const offset=(new Date(year,month,1).getDay()+6)%7;for(let i=0;i<offset;i++)grid.append(calNode('div','', 'calendar-empty'));
 const last=new Date(year,month+1,0).getDate();for(let day=1;day<=last;day++){
  const count=calEvents.filter(ev=>{const dt=new Date(ev.starts_at);return dt.getFullYear()===year&&dt.getMonth()===month&&dt.getDate()===day&&ev.status==='scheduled';}).length;
  const btn=calNode('button',null,'calendar-cell'+(day===calDay?' selected':'')+(count?' has-events':''));btn.type='button';btn.append(calNode('span',String(day)));if(count){const dot=calNode('small','•','cal-dot');dot.title='Событий: '+count;btn.append(dot);}btn.setAttribute('aria-pressed',String(day===calDay));btn.addEventListener('click',()=>{calDay=day;calRender();});grid.append(btn);
 }
 const dayEvents=calEvents.filter(ev=>{const dt=new Date(ev.starts_at);return dt.getFullYear()===year&&dt.getMonth()===month&&dt.getDate()===calDay;});
 calEl('calendarDayHeading').textContent='События на '+calDay+' '+calMonth.toLocaleDateString('ru-RU',{month:'long'});calFill(calEl('calendarDayEvents'),dayEvents,'На этот день мероприятий нет.');
 const now=new Date();const filter=calEl('calendarFilter').value;calFill(calEl('calendarList'),calEvents.filter(ev=>filter==='archive'?ev.status==='cancelled'||new Date(ev.ends_at||ev.starts_at)<now:ev.status==='scheduled'&&new Date(ev.ends_at||ev.starts_at)>=now&&(filter!=='mine'||calAttendees.some(a=>a.event_id===ev.id&&a.user_id===currentSession?.user?.id))).sort((a,b)=>(filter==='archive'?-1:1)*(new Date(a.starts_at)-new Date(b.starts_at))),'Нет событий.');
 const myId=currentSession?.user?.id,ids=new Set(calAttendees.filter(a=>a.user_id===myId).map(a=>a.event_id));calFill(calEl('calendarMyList'),calEvents.filter(ev=>ids.has(ev.id)).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)),'Вы пока не записаны на мероприятия.');
}
async function loadCalendar(){
 if(!supabaseClient||!currentSession?.user||!['approved','admin'].includes(accessState.mode))return;
 const token=++calToken;const calendarAdmin=accessState.mode==='admin';calEl('calendarCreateButton').hidden=!calendarAdmin;if(!calendarAdmin&&calPanel==='calendarCreatePanel'){calPanel=null;calOpen('calendarBoardPanel');}calEl('calendarNotice').textContent='Загрузка событий…';
 try{
  const [events,attendees,people]=await Promise.all([
   supabaseClient.from('guild_events').select('id,title,description,category,location,starts_at,ends_at,status,created_by').order('starts_at',{ascending:true}).limit(2000),
   supabaseClient.from('guild_event_attendees').select('event_id,user_id,joined_at').limit(5000),
   supabaseClient.from('profiles').select('id,character_first_name,character_last_name,character_photo_url').limit(2000)
  ]);
  for(const r of [events,attendees,people])if(r.error)throw r.error;if(token!==calToken)return;
  calPhotos=new Map((people.data||[]).map(p=>[p.id,safePhoto(p.character_photo_url)]));calEvents=events.data||[];calAttendees=attendees.data||[];calPeople=new Map((people.data||[]).map(p=>[p.id,[p.character_first_name,p.character_last_name].filter(Boolean).join(' ')||'Участник']));calRender();calEl('calendarNotice').textContent='';
 }catch(err){if(token===calToken)calEl('calendarNotice').textContent='Ошибка загрузки календаря: '+err.message;}
}
async function calRpc(name,args,success){if(calBusy)return;calBusy=true;try{const {error}=await supabaseClient.rpc(name,args);if(error)throw error;showToast(success);await loadCalendar();}catch(err){showToast('Ошибка: '+err.message);}finally{calBusy=false;}}
for(const b of document.querySelectorAll('[data-calendar-panel]'))b.addEventListener('click',()=>{if(b.dataset.calendarPanel==='calendarCreatePanel'){if(accessState.mode!=='admin')return;if(calPanel!=='calendarCreatePanel')calReset();}calOpen(b.dataset.calendarPanel);});
calEl('calendarCancelEdit').addEventListener('click',()=>{calReset();calPanel='calendarCreatePanel';calOpen('calendarCreatePanel');});
calEl('calendarRefresh').addEventListener('click',loadCalendar);calEl('calendarBoardButton').onclick=()=>calOpen('calendarBoardPanel');calEl('calendarFilter').onchange=calRender;
for(const [id,delta] of [['calendarPrev',-1],['calendarNext',1]])calEl(id).addEventListener('click',()=>{calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()+delta,1);calDay=1;calRender();});
calEl('calendarCreatePanel').addEventListener('submit',async e=>{
 e.preventDefault();if(calBusy||accessState.mode!=='admin')return;const f=e.currentTarget;
 const start=f.elements.namedItem('starts_at').value,end=f.elements.namedItem('ends_at').value;
 if(f.elements.namedItem('title').value.trim().length<3)return showToast('Введите название события.');
 if(!start||(end&&new Date(end)<=new Date(start)))return showToast('Проверьте даты мероприятия.');
 const args={p_title:f.elements.namedItem('title').value.trim(),p_description:f.elements.namedItem('description').value.trim(),p_category:f.elements.namedItem('category').value,p_location:f.elements.namedItem('location').value.trim(),p_starts_at:new Date(start).toISOString(),p_ends_at:end?new Date(end).toISOString():null};
 if(calEditing)args.p_event_id=calEditing;const rpc=calEditing?'guild_event_update':'guild_event_create';calBusy=true;
 try{const {error}=await supabaseClient.rpc(rpc,args);if(error)throw error;showToast(calEditing?'Мероприятие обновлено':'Мероприятие создано');calReset();calPanel='calendarCreatePanel';calOpen('calendarCreatePanel');await loadCalendar();}
 catch(err){showToast('Ошибка: '+err.message);}finally{calBusy=false;}
});


// Library v1.5 — all writes use admin-only Supabase RPCs.
const libCategories={charter:'Устав, законы и правила',rules:'Устав, законы и правила',announcements:'Объявления и изменения',guides:'Руководства'};
const libEl=id=>document.getElementById(id);
let libDocuments=[],libMode='home',libCategory=null,libEditing=null,libSelected=null,libToken=0,libBusy=false;
function libNode(tag,value,cls){
 const el=document.createElement(tag);
 if(value!==undefined&&value!==null)el.textContent=String(value);
 if(cls)el.className=cls;
 return el;
}
function libHome(){
 libCategory=null;libSelected=null;libEditing=null;
 libEl('librarySearch').value='';
 libShow('home');
}
function libOpenCategory(category){
 if(!Object.hasOwn(libCategories,category))return;
 libCategory=category;libSelected=null;libEditing=null;
 libEl('librarySearch').value='';
 libEl('librarySectionTitle').textContent=libCategories[category];
 libShow('board');libRender();
}
function libShow(mode){
 if(mode==='editor'&&accessState.mode!=='admin')return;
 libMode=mode;
 libEl('galleryPanel').hidden=mode!=='gallery';
 libEl('libraryCategories').hidden=mode!=='home';
 libEl('librarySection').hidden=mode==='home'||mode==='gallery';
 libEl('libraryBoard').hidden=mode!=='board';
 libEl('libraryReader').hidden=mode!=='reader';
 libEl('libraryEditor').hidden=mode!=='editor';
 libEl('libraryCreateButton').hidden=mode!=='board'||accessState.mode!=='admin';
 libEl('libraryRefreshButton').hidden=mode!=='board';
 libEl('libraryBackButton').textContent=mode==='board'?'← К разделам':'← К документам';
}
function libBack(){
 if(libMode==='board')libHome();
 else libShow('board');
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
  const picture=line.match(/^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/);
  if(picture){list=null;const img=libSafeImage(picture[2],picture[1],'library-inline-image');if(img)container.append(img);continue;}
  const heading=line.match(/^(#{1,3})\s+(.+)$/);
  if(heading){list=null;const h=libNode('h'+Math.min(heading[1].length+1,4));libInline(heading[2],h);container.append(h);continue;}
  const item=line.match(/^\s*[-*]\s+(.+)$/);
  if(item){if(!list){list=libNode('ul');container.append(list);}const li=libNode('li');libInline(item[1],li);list.append(li);continue;}
  list=null;const p=libNode('p');libInline(line,p);container.append(p);
 }
}
function libSafeImage(url,alt,cls){
 try{
  const u=new URL(url);
  if(u.protocol!=='https:')return null;
  const img=libNode('img',null,cls);img.src=u.href;img.alt=alt||'Иллюстрация статьи';img.loading='lazy';img.referrerPolicy='no-referrer';
  img.addEventListener('error',()=>{img.style.display='none';});
  return img;
 }catch{return null;}
}
function libCategoryCover(category,cls){const key=category==='charter'?'rules':category;const img=libNode('img',null,cls);img.src='theme/library-'+(['rules','announcements','guides'].includes(key)?key:'rules')+'.svg';img.alt=libCategories[category]||'Документ';img.loading='lazy';return img;}
function libRender(){
 const search=libEl('librarySearch').value.trim().toLocaleLowerCase('ru');
 const cat=libCategory;
 const items=libDocuments.filter(d=>((d.category===cat)||(cat==='rules'&&d.category==='charter'))&&(!search||(d.title+' '+(d.summary||'')+' '+d.body).toLocaleLowerCase('ru').includes(search)));
 const list=libEl('libraryList');list.replaceChildren();
 if(!items.length){list.append(libNode('p','В этом разделе пока нет статей.','store-muted'));return;}
 for(const d of items){
  const card=libNode('article',null,'panel library-news-card');
  const cover=libCategoryCover(d.category,'library-news-cover');
  if(cover)card.append(cover);
  const inner=libNode('div',null,'library-news-content');
  const info=libNode('div',null,'library-news-meta');
  info.append(libNode('span',libCategories[d.category]||d.category));
  info.append(libNode('span',new Date(d.updated_at).toLocaleDateString('ru-RU')));
  if(d.is_pinned)info.append(libNode('span','📌 Закреплено'));
  inner.append(info,libNode('h2',d.title));
  const excerpt=(d.summary||String(d.body).replace(/!\[[^\]]*\]\([^)]+\)|[#*[\]]/g,'').slice(0,280));
  inner.append(libNode('p',excerpt+(excerpt.length>=280?'…':''),'library-news-summary'));
  const btn=libNode('button','Читать статью →','secondary-button');btn.type='button';
  btn.addEventListener('click',()=>libRead(d.id));inner.append(btn);
  card.append(inner);list.append(card);
 }
}
function libRead(id){
 const d=libDocuments.find(x=>x.id===id);if(!d)return libShow('board');
 libSelected=id;libEl('libraryReaderTitle').textContent=d.title;
 libEl('libraryReaderCategory').textContent=(d.is_pinned?'📌 Закреплено · ':'')+(libCategories[d.category]||d.category);
 libEl('libraryReaderMeta').textContent='Обновлено: '+new Date(d.updated_at).toLocaleString('ru-RU');
 const body=libEl('libraryReaderBody');libBody(d.body,body);
 const cover=libCategoryCover(d.category,'library-article-cover');
 if(cover)body.prepend(cover);
 if(d.summary){const lead=libNode('p',d.summary,'library-article-lead');if(cover)cover.after(lead);else body.prepend(lead);}
 const actions=libEl('libraryReaderActions');actions.replaceChildren();
 if(accessState.mode==='admin'){
  const edit=libNode('button','Изменить','secondary-button');edit.type='button';edit.addEventListener('click',()=>libEdit(id));
  const del=libNode('button','Удалить','secondary-button');del.type='button';
  del.addEventListener('click',async()=>{if(confirm('Безвозвратно удалить статью «'+d.title+'»?')){await libRpc('guild_document_delete',{p_document_id:id},'Статья удалена');libShow('board');}});
  actions.append(edit,del);
 }
 libShow('reader');
}
function libEdit(id=null){
 if(accessState.mode!=='admin'||!libCategory)return;
 const d=id?libDocuments.find(x=>x.id===id):null;
 libEditing=d?.id||null;
 const f=libEl('libraryEditor');f.reset();
 f.elements.namedItem('title').value=d?.title||'';
 f.elements.namedItem('category').value=d?.category==='charter'?'rules':(d?.category||libCategory);
 f.elements.namedItem('summary').value=d?.summary||'';
 f.elements.namedItem('body').value=d?.body||'';
 f.elements.namedItem('is_pinned').checked=!!d?.is_pinned;
 libEl('libraryEditorHeading').textContent=d?'Редактирование статьи':'Новая статья';
 libEl('librarySaveButton').textContent=d?'Сохранить изменения':'Опубликовать';
 libShow('editor');
}
async function loadLibrary(){
 if(!supabaseClient||!currentSession?.user||!['approved','admin'].includes(accessState.mode))return;
 const token=++libToken;
 if(accessState.mode!=='admin'&&libMode==='editor')libShow('board');
 libEl('libraryCreateButton').hidden=libMode!=='board'||accessState.mode!=='admin';
 libEl('libraryNotice').textContent='Загрузка библиотеки…';
 try{
  const {data,error}=await supabaseClient.from('guild_documents').select('id,title,category,body,summary,cover_image_url,is_pinned,created_by,updated_at').order('is_pinned',{ascending:false}).order('updated_at',{ascending:false}).limit(1000);
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
libEl('libraryBackButton').addEventListener('click',libBack);
libEl('libraryCancelButton').addEventListener('click',()=>libShow('board'));
document.querySelectorAll('[data-library-category]').forEach(button=>button.addEventListener('click',()=>libOpenCategory(button.dataset.libraryCategory)));
libEl('libraryRefreshButton').addEventListener('click',loadLibrary);
libEl('librarySearch').addEventListener('input',libRender);
libEl('libraryEditor').addEventListener('submit',async event=>{
 event.preventDefault();if(accessState.mode!=='admin'||libBusy)return;
 const f=event.currentTarget;
 const args={p_title:f.elements.namedItem('title').value.trim(),p_category:f.elements.namedItem('category').value,p_body:f.elements.namedItem('body').value.trim(),p_summary:f.elements.namedItem('summary').value.trim(),p_cover_image_url:libDocuments.find(d=>d.id===libEditing)?.cover_image_url||null,p_is_pinned:f.elements.namedItem('is_pinned').checked};
 if(!args.p_title||!args.p_body)return showToast('Заполните название и содержание.');
 if(libEditing)args.p_document_id=libEditing;

 const ok=await libRpc(libEditing?'guild_article_update':'guild_article_create',args,libEditing?'Документ обновлён':'Документ опубликован');
 if(ok){libEditing=null;f.reset();libOpenCategory(args.p_category);}
});


// Chronicle v1.6: chronological medieval timeline, Supabase admin-only RPCs.
const chronEl=id=>document.getElementById(id);
let chronRecords=[],chronMode='timeline',chronEditing=null,chronSelected=null,chronSeq=0,chronSaving=false;
const chronDate=d=>{const [y,m,day]=String(d).slice(0,10).split('-').map(Number);return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'long',year:'numeric'}).format(new Date(y,m-1,day));};
function chronShow(mode){
 if(mode==='editor'&&accessState.mode!=='admin')return;
 chronMode=mode;
 chronEl('chronTimelineView').hidden=mode!=='timeline';
 chronEl('chronReader').hidden=mode!=='reader';
 chronEl('chronEditor').hidden=mode!=='editor';
 chronEl('chronBack').hidden=mode==='timeline';
 chronEl('chronCreate').hidden=mode!=='timeline'||accessState.mode!=='admin';
 chronEl('chronRefresh').hidden=mode!=='timeline';
}
let chronKind='brotherhood';
function chronRender(){
 const root=chronEl('chronTimeline');root.replaceChildren();
 const section=chronRecords.filter(r=>r.kind===chronKind);
 const yearSelect=chronEl('chronYear'), previous=yearSelect.value;
 yearSelect.replaceChildren(new Option('Все годы',''));
 for(const year of [...new Set(section.map(r=>r.event_date.slice(0,4)))])yearSelect.add(new Option(year,year));
 yearSelect.value=[...yearSelect.options].some(o=>o.value===previous)?previous:'';
 const q=chronEl('chronSearch').value.trim().toLowerCase();
 const rows=section.filter(r=>(!yearSelect.value||r.event_date.startsWith(yearSelect.value))&&[r.title,r.summary,r.body].join(' ').toLowerCase().includes(q));
 if(!rows.length){root.append(libNode('p','Нет записей.','chron-empty'));return;}
 let lastYear=null,i=0;
 for(const rec of rows){
  const year=rec.event_date.slice(0,4);
  if(year!==lastYear){root.append(libNode('div','Anno Domini '+year,'chron-year'));lastYear=year;i=0;}
  const entry=libNode('article',null,'chron-entry '+(i++%2?'chron-right':'chron-left'));
  entry.append(libNode('span',null,'chron-marker'));
  const button=libNode('button',null,'chron-branch');button.type='button';
  button.append(libNode('time',chronDate(rec.event_date),'chron-date'),libNode('strong',rec.title));
  button.addEventListener('click',()=>chronRead(rec.id));entry.append(button);root.append(entry);
 }
}
document.querySelectorAll('[data-chron-kind]').forEach(b=>b.addEventListener('click',()=>{
 chronKind=b.dataset.chronKind;document.querySelectorAll('[data-chron-kind]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
 chronEl('chronHeading').textContent=b.textContent;chronEl('chronSearch').value='';chronEl('chronYear').value='';chronRender();
}));
chronEl('chronSearch').addEventListener('input',chronRender);chronEl('chronYear').addEventListener('change',chronRender);
function chronRead(id){
 const rec=chronRecords.find(r=>r.id===id);if(!rec)return chronShow('timeline');chronSelected=id;
 chronEl('chronReaderDate').textContent=chronDate(rec.event_date);
 chronEl('chronReaderTitle').textContent=rec.title;
 chronEl('chronReaderSummary').textContent=rec.summary||'';
 const hero=chronEl('chronReaderImage');hero.hidden=true;hero.removeAttribute('src');
 if(rec.image_url){const safe=libSafeImage(rec.image_url,'Иллюстрация: '+rec.title);if(safe){hero.src=safe.src;hero.hidden=false;hero.onerror=()=>{hero.hidden=true;};}}
 libBody(rec.body,chronEl('chronReaderBody'));
 const actions=chronEl('chronReaderActions');actions.replaceChildren();
 if(accessState.mode==='admin'){
  const edit=libNode('button','Изменить запись','secondary-button');edit.type='button';edit.addEventListener('click',()=>chronEdit(id));
  const del=libNode('button','Удалить запись','secondary-button');del.type='button';del.addEventListener('click',async()=>{if(!confirm('Удалить запись «'+rec.title+'» без возможности восстановления?'))return;const ok=await chronRpc('guild_chronicle_delete',{p_id:id},'Запись удалена');if(ok)chronShow('timeline');});
  actions.append(edit,del);
 }
 chronShow('reader');
}
function chronEdit(id=null){
 if(accessState.mode!=='admin')return;
 const rec=id?chronRecords.find(r=>r.id===id):null;chronEditing=rec?.id||null;
 const form=chronEl('chronEditor');form.reset();
 for(const name of ['title','event_date','summary','body','image_url'])form.elements.namedItem(name).value=rec?.[name]||'';
 chronEl('chronEditorTitle').textContent=(rec?'Редактирование записи':'Новая запись')+' · '+(chronKind==='lore'?'Лор':'Летопись братства');chronShow('editor');
}
async function loadChronicle(){
 if(!supabaseClient||!currentSession?.user||!['admin','approved'].includes(accessState.mode))return;
 const token=++chronSeq;chronEl('chronNotice').textContent='Открываем летопись…';
 chronEl('chronCreate').hidden=accessState.mode!=='admin'||chronMode!=='timeline';
 try{
  const {data,error}=await supabaseClient.from('guild_chronicle').select('id,title,event_date,summary,body,image_url,updated_at,kind').order('event_date',{ascending:false}).order('created_at',{ascending:false}).limit(1000);
  if(error)throw error;if(token!==chronSeq)return;
  chronRecords=data||[];chronRender();
  if(chronMode==='reader'&&chronSelected){if(chronRecords.some(r=>r.id===chronSelected))chronRead(chronSelected);else chronShow('timeline');}
  chronEl('chronNotice').textContent='';
 }catch(err){if(token===chronSeq)chronEl('chronNotice').textContent='Ошибка загрузки летописи: '+err.message;}
}
async function chronRpc(name,args,message){
 if(chronSaving)return false;chronSaving=true;chronEl('chronSave').disabled=true;
 try{const {error}=await supabaseClient.rpc(name,args);if(error)throw error;showToast(message);await loadChronicle();return true;}
 catch(err){showToast('Ошибка летописи: '+err.message);return false;}
 finally{chronSaving=false;chronEl('chronSave').disabled=false;}
}
chronEl('chronCreate').addEventListener('click',()=>chronEdit());
chronEl('chronBack').addEventListener('click',()=>chronShow('timeline'));
chronEl('chronCancel').addEventListener('click',()=>chronShow(chronEditing?'reader':'timeline'));
chronEl('chronRefresh').addEventListener('click',loadChronicle);
chronEl('chronEditor').addEventListener('submit',async e=>{
 e.preventDefault();if(accessState.mode!=='admin'||chronSaving)return;
 const f=e.currentTarget;
 const args={p_kind:chronKind,p_title:f.elements.namedItem('title').value.trim(),p_event_date:f.elements.namedItem('event_date').value,p_summary:f.elements.namedItem('summary').value.trim(),p_body:f.elements.namedItem('body').value.trim(),p_image_url:f.elements.namedItem('image_url').value.trim()||null};
 if(!args.p_title||!args.p_event_date||!args.p_body){showToast('Укажите название, дату и историю.');return;}
 if(chronEditing)args.p_id=chronEditing;
 const ok=await chronRpc(chronEditing?'guild_chronicle_update_v2852':'guild_chronicle_create_v2852',args,chronEditing?'Запись обновлена':'Событие внесено в летопись');
 if(ok){chronEditing=null;f.reset();chronShow('timeline');}
});


// v1.7 — Ratusha voting. All reads and writes go through restricted Supabase RPCs.
const pollEl=id=>document.getElementById(id);
const pollText=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==null&&value!==undefined)e.textContent=String(value);if(cls)e.className=cls;return e;};
let pollRows=[],pollData=[],pollMode='board',pollSelected=null,pollFilter='active',pollLoadSeq=0,pollBusy=false;
const pollActive=p=>!p.cancelled_at&&new Date(p.closes_at).getTime()>Date.now();
const pollStatus=p=>p.cancelled_at?'Отменено':pollActive(p)?'Идёт голосование':'Завершено';
const pollDate=value=>new Date(value).toLocaleString('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});
function pollShow(mode){
 if(mode==='editor'&&accessState.mode!=='admin')return;
 pollMode=mode;
 pollEl('pollBoard').hidden=mode!=='board';pollEl('pollReader').hidden=mode!=='reader';pollEl('pollEditor').hidden=mode!=='editor';
 pollEl('pollBackButton').hidden=mode==='board';pollEl('pollCreateButton').hidden=mode!=='board'||accessState.mode!=='admin';
}
function pollOrganize(rows){
 const map=new Map();
 for(const row of rows){
  let p=map.get(row.poll_id);
  if(!p){p={id:row.poll_id,title:row.title,description:row.description,visibility:row.visibility,closes_at:row.closes_at,created_at:row.created_at,cancelled_at:row.cancelled_at,options:[],myVoted:false};map.set(row.poll_id,p);}
  p.options.push({id:row.option_id,label:row.option_label,position:row.option_position,votes:Number(row.votes)||0,mine:row.my_vote===true});
  if(row.my_vote===true)p.myVoted=true;
 }
 return [...map.values()].map(p=>({...p,options:p.options.sort((a,b)=>a.position-b.position)})).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
}
function pollRender(){
 const list=pollEl('pollList');list.replaceChildren();
 for(const b of document.querySelectorAll('[data-poll-filter]')){b.classList.toggle('ratusha-filter-active',b.dataset.pollFilter===pollFilter);b.setAttribute('aria-pressed',String(b.dataset.pollFilter===pollFilter));}
 document.querySelector('[data-poll-filter=active]').textContent='Активные · '+pollData.filter(pollActive).length;
 const visible=pollData.filter(p=>pollFilter==='all'||(pollFilter==='active'?pollActive(p):!pollActive(p)));
 if(!visible.length){list.append(pollText('p',pollFilter==='active'?'Действующих голосований пока нет.':'Голосования не найдены.','ratusha-empty'));return;}
 for(const p of visible){
  const card=pollText('article',null,'panel ratusha-card');
  const top=pollText('div',null,'ratusha-card-top');
  top.append(pollText('span',p.visibility==='secret'?'🔒 Тайное':'⚖ Открытое','ratusha-kicker'));
  top.append(pollText('span',pollStatus(p),'ratusha-status '+(pollActive(p)?'ratusha-live':'')));
  const info=pollText('div',null,'hall-poll-info');info.append(top,pollText('h2',p.title),pollText('p','До '+pollDate(p.closes_at)+' · '+p.options.reduce((sum,o)=>sum+o.votes,0)+' голосов','store-muted'));
  if(p.myVoted)info.append(pollText('span','✓ Ваш голос учтён','ratusha-voted'));card.append(info);
  const btn=pollText('button',pollActive(p)&&!p.myVoted?'Проголосовать':'Посмотреть голосование','secondary-button');btn.type='button';btn.addEventListener('click',()=>pollOpen(p.id));card.append(btn);list.append(card);
 }
}
function pollOpen(id){
 const p=pollData.find(x=>x.id===id);if(!p){pollShow('board');return;}
 pollSelected=id;pollEl('pollReaderTitle').textContent=p.title;
 pollEl('pollReaderType').textContent=(p.visibility==='secret'?'🔒 Тайное голосование':'⚖ Открытое голосование')+' · '+pollStatus(p);
 pollEl('pollReaderDescription').textContent=p.description||'';
 pollEl('pollReaderMeta').textContent='Начало: '+pollDate(p.created_at)+' · Завершение: '+pollDate(p.closes_at);
 const options=pollEl('pollOptions');options.replaceChildren();
 const canVote=pollActive(p)&&!p.myVoted;
 for(const o of p.options){
  if(canVote){const label=pollText('label',null,'ratusha-choice');const input=document.createElement('input');input.type='radio';input.name='pollOption';input.value=o.id;input.required=true;label.append(input,pollText('span',o.label));options.append(label);}
 }
 pollEl('pollVoteForm').hidden=!canVote;
 const results=pollEl('pollResults');results.replaceChildren();
 if(p.myVoted)results.append(pollText('p','✓ Вы уже отдали свой голос. Повторное голосование невозможно.','ratusha-voted'));
 if(!pollActive(p))results.append(pollText('h3',p.cancelled_at?'Голосование отменено':'Итоги голосования'));
 else results.append(pollText('h3','Текущие результаты'));
 const total=p.options.reduce((sum,o)=>sum+o.votes,0);
 for(const o of p.options){
  const line=pollText('div',null,'ratusha-result');const head=pollText('div',null,'ratusha-result-label');
  head.append(pollText('strong',o.label),pollText('span',o.votes+' ('+(total?Math.round(100*o.votes/total):0)+'%)'));line.append(head);
  const track=pollText('div',null,'ratusha-track');const fill=pollText('div',null,'ratusha-fill');fill.style.width=(total?100*o.votes/total:0)+'%';track.append(fill);line.append(track);results.append(line);
 }
 results.append(pollText('p','Всего голосов: '+total,'store-muted'));
 if(p.visibility==='public'){
  const voters=pollText('div',null,'ratusha-voters');results.append(voters);
  voters.append(pollText('h3','Кто и за что проголосовал'));
  voters.append(pollText('p','Загрузка списка участников…','store-muted'));
  const idAtRequest=id;
  supabaseClient.rpc('guild_poll_public_voters',{p_poll_id:id}).then(({data,error})=>{
   if(pollSelected!==idAtRequest||pollMode!=='reader')return;
   voters.replaceChildren(pollText('h3','Кто и за что проголосовал'));
   if(error){voters.append(pollText('p','Не удалось загрузить список: '+error.message,'store-muted'));return;}
   if(!data?.length){voters.append(pollText('p','Голосов пока нет.','store-muted'));return;}
   for(const o of p.options){const group=data.filter(v=>v.option_id===o.id);if(!group.length)continue;voters.append(pollText('h4',o.label));const ul=pollText('ul');for(const v of group)ul.append(pollText('li',v.voter_name||'Участник'));voters.append(ul);}
  }).catch(err=>{if(pollSelected===idAtRequest&&pollMode==='reader')voters.replaceChildren(pollText('p','Ошибка: '+err.message,'store-muted'));});
 }
 const actions=pollEl('pollReaderActions');actions.replaceChildren();
 if(accessState.mode==='admin'&&pollActive(p)){
  const cancel=pollText('button','Отменить голосование','secondary-button');cancel.type='button';cancel.addEventListener('click',async()=>{if(confirm('Отменить голосование «'+p.title+'»?')){if(await pollRpc('guild_poll_cancel',{p_poll_id:p.id},'Голосование отменено'))pollShow('board');}});actions.append(cancel);
 }
 pollShow('reader');
}
async function loadPolls(){
 if(!supabaseClient||!currentSession?.user||!['admin','approved'].includes(accessState.mode))return;
 const token=++pollLoadSeq;pollEl('pollNotice').textContent='Загружаем голосования…';
 pollEl('pollCreateButton').hidden=accessState.mode!=='admin'||pollMode!=='board';
 try{const {data,error}=await supabaseClient.rpc('guild_poll_list');if(error)throw error;if(token!==pollLoadSeq)return;
  pollRows=data||[];pollData=pollOrganize(pollRows);pollRender();
  if(pollMode==='reader'&&pollSelected){if(pollData.some(p=>p.id===pollSelected))pollOpen(pollSelected);else pollShow('board');}
  pollEl('pollNotice').textContent='';
 }catch(err){if(token===pollLoadSeq)pollEl('pollNotice').textContent='Ошибка загрузки: '+err.message;}
}
async function pollRpc(name,args,message){
 if(pollBusy)return false;pollBusy=true;
 try{const {error}=await supabaseClient.rpc(name,args);if(error)throw error;showToast(message);await loadPolls();return true;}
 catch(err){showToast('Ошибка: '+err.message);return false;}
 finally{pollBusy=false;}
}
function pollAddOption(value=''){
 const rows=pollEl('pollEditorOptions');if(rows.children.length>=12){showToast('Допускается не более 12 вариантов');return;}
 const row=pollText('div',null,'ratusha-option-row');const input=document.createElement('input');input.type='text';input.maxLength=160;input.required=true;input.placeholder='Вариант '+(rows.children.length+1);input.value=value;
 const remove=pollText('button','×','secondary-button');remove.type='button';remove.setAttribute('aria-label','Удалить вариант');remove.addEventListener('click',()=>{if(rows.children.length<=2){showToast('Необходимо хотя бы два варианта');return;}row.remove();});
 row.append(input,remove);rows.append(row);
}
function pollNew(){
 if(accessState.mode!=='admin')return;
 const form=pollEl('pollEditor');form.reset();pollEl('pollEditorOptions').replaceChildren();pollAddOption();pollAddOption();
 const local=new Date(Date.now()+86400000);const pad=n=>String(n).padStart(2,'0');
 form.elements.namedItem('closes_at').value=[local.getFullYear(),pad(local.getMonth()+1),pad(local.getDate())].join('-')+'T'+pad(local.getHours())+':'+pad(local.getMinutes());
 pollShow('editor');
}
pollEl('pollCreateButton').addEventListener('click',pollNew);
pollEl('pollBackButton').addEventListener('click',()=>pollShow('board'));
pollEl('pollCancelEditor').addEventListener('click',()=>pollShow('board'));
pollEl('pollRefreshButton').addEventListener('click',loadPolls);
pollEl('pollAddOption').addEventListener('click',()=>pollAddOption());
for(const b of document.querySelectorAll('[data-poll-filter]'))b.addEventListener('click',()=>{pollFilter=b.dataset.pollFilter;pollRender();});
pollEl('pollEditor').addEventListener('submit',async e=>{
 e.preventDefault();if(accessState.mode!=='admin'||pollBusy)return;
 const f=e.currentTarget,values=[...pollEl('pollEditorOptions').querySelectorAll('input')].map(i=>i.value.trim());
 if(values.length<2||values.length>12||values.some(x=>!x)){showToast('Заполните от 2 до 12 вариантов');return;}
 const date=new Date(f.elements.namedItem('closes_at').value);if(!Number.isFinite(date.getTime())||date<=new Date()){showToast('Укажите будущую дату завершения');return;}
 const args={p_title:f.elements.namedItem('title').value.trim(),p_description:f.elements.namedItem('description').value.trim(),p_visibility:f.elements.namedItem('visibility').value,p_closes_at:date.toISOString(),p_options:values};
 const ok=await pollRpc('guild_poll_create',args,'Голосование опубликовано');if(ok){pollFilter='active';pollShow('board');pollRender();}
});
pollEl('pollVoteForm').addEventListener('submit',async e=>{
 e.preventDefault();if(pollBusy)return;const option=pollEl('pollVoteForm').querySelector('input[name="pollOption"]:checked');if(!option){showToast('Выберите вариант');return;}
 const p=pollData.find(x=>x.id===pollSelected);if(!p||!pollActive(p)||p.myVoted)return;
 const ok=await pollRpc('guild_poll_cast',{p_poll_id:p.id,p_option_id:option.value},'Ваш голос учтён');if(ok)pollOpen(p.id);
});


// v1.8 — Ratusha decrees and delegated officers; server RPC enforces authorization.
const decreeEl=id=>document.getElementById(id);
const decreeNode=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined&&value!==null)e.textContent=String(value);if(cls)e.className=cls;return e;};
const decreeKinds={decree:'Указ',order:'Распоряжение',resolution:'Постановление совета'};
let hallMode='home',decreeRows=[],decreeOfficersRows=[],decreePeople=new Map(),decreeCanIssue=false,decreeMode='board',decreeFilter='active',decreeSelected=null,decreeEditing=null,decreeBusy=false,decreeSequence=0;
function hallShow(mode){
 hallMode=mode;
 decreeEl('hallHub').hidden=mode!=='home';
 decreeEl('hallPollSection').hidden=mode!=='polls';
 decreeEl('hallDecreeSection').hidden=mode!=='decrees';
 decreeEl('hallPetitionSection').hidden=mode!=='petitions';
 decreeEl('hallCouncilSection').hidden=mode!=='council';
 decreeEl('hallAwardsSection').hidden=mode!=='awards';
 if(mode==='polls'){pollShow('board');loadPolls();}
 if(mode==='decrees'){decreeShow('board');loadDecrees();}
 if(mode==='petitions'){petitionShow('board');loadPetitions();}
 if(mode==='council'){councilShow('tree');loadCouncil();}
 if(mode==='awards'){awardShow('board');loadAwards();}
}
decreeEl('hallToPolls').addEventListener('click',()=>hallShow('polls'));
decreeEl('hallToDecrees').addEventListener('click',()=>hallShow('decrees'));
decreeEl('hallToPetitions').addEventListener('click',()=>hallShow('petitions'));
decreeEl('hallToCouncil').addEventListener('click',()=>hallShow('council'));
decreeEl('hallToAwards').addEventListener('click',()=>hallShow('awards'));
for(const b of document.querySelectorAll('[data-hall-home]'))b.addEventListener('click',()=>hallShow('home'));
const decreeDate=v=>{if(!v)return '—';const [y,m,d]=String(v).slice(0,10).split('-');return `${d}.${m}.${y}`;};
const decreeNumber=d=>`№ ${String(d.decree_number).padStart(3,'0')}/${d.decree_year}`;
const decreeName=id=>decreePeople.get(id)||'Участник братства';
const decreeMayManage=d=>decreeCanIssue&&!d.repealed_at&&(accessState.mode==='admin'||d.signed_by===currentSession?.user?.id);
function decreeShow(mode){
 if(mode==='editor'&&!decreeCanIssue)return;
 if(mode==='officers'&&accessState.mode!=='admin')return;
 decreeMode=mode;
 for(const [name,id] of [['board','decreeBoard'],['reader','decreeReader'],['editor','decreeEditor'],['officers','decreeOfficersPanel']])decreeEl(id).hidden=mode!==name;
 decreeEl('decreeBack').hidden=mode==='board';
 decreeEl('decreeCreate').hidden=mode!=='board'||!decreeCanIssue;
 decreeEl('decreeOfficers').hidden=mode!=='board'||accessState.mode!=='admin';
}
function hallTable(list,headers){const table=decreeNode('table',null,'hall-register');const head=table.createTHead().insertRow();for(const h of headers){const th=decreeNode('th',h);th.scope='col';head.append(th);}const body=table.createTBody();list.append(table);return body;}
function hallCell(row,value,cls){const td=row.insertCell();if(cls)td.className=cls;if(value instanceof Node)td.append(value);else td.textContent=value;return td;}
function hallLink(title,subtitle,fn){const b=decreeNode('button',null,'hall-document-link');b.type='button';b.append(decreeNode('strong',title),decreeNode('small',subtitle));b.addEventListener('click',fn);return b;}
function decreeRender(){
 const list=decreeEl('decreeList');list.replaceChildren();
 for(const b of document.querySelectorAll('[data-decree-filter]')){b.classList.toggle('ratusha-filter-active',b.dataset.decreeFilter===decreeFilter);b.setAttribute('aria-pressed',String(b.dataset.decreeFilter===decreeFilter));}
 const q=decreeEl('decreeSearch').value.trim().toLocaleLowerCase('ru');
 const rows=decreeRows.filter(d=>(decreeFilter==='all'||(decreeFilter==='active'?!d.repealed_at:!!d.repealed_at))&&[d.title,d.body,decreeNumber(d),decreeName(d.signed_by)].join(' ').toLocaleLowerCase('ru').includes(q));
 if(!rows.length){list.append(decreeNode('p','Документы не найдены.','store-muted'));return;}
 const body=hallTable(list,['Документ','Дата','Статус']);
 for(const d of rows){const row=body.insertRow();hallCell(row,hallLink('📜 '+d.title,`${decreeKinds[d.kind]||'Документ'} ${decreeNumber(d)}`,()=>decreeRead(d.id)));hallCell(row,decreeDate(d.issued_on));hallCell(row,d.repealed_at?'Отменён':'Действует',d.repealed_at?'decree-status-repealed':'decree-status-active');}
}

function decreeRead(id){
 const d=decreeRows.find(x=>x.id===id);if(!d)return decreeShow('board');decreeSelected=id;
 decreeEl('decreeReaderKicker').textContent=`${decreeKinds[d.kind]||'Документ'} ${decreeNumber(d)}`;
 decreeEl('decreeReaderTitle').textContent=d.title;
 decreeEl('decreeReaderMeta').textContent=`Издан: ${decreeDate(d.issued_on)} · Подписал: ${decreeName(d.signed_by)}`;
 decreeEl('decreeReaderBody').textContent=d.body;
 const status=decreeEl('decreeReaderStatus');status.replaceChildren();
 if(d.repealed_at){status.append(decreeNode('h3','Утратил силу'));status.append(decreeNode('p','Причина: '+(d.repeal_reason||'Не указана')));}
 else status.append(decreeNode('p','⚜ Действующий документ','decree-status-active'));
 const actions=decreeEl('decreeReaderActions');actions.replaceChildren();
 if(decreeMayManage(d)){
  const edit=decreeNode('button','Изменить','secondary-button');edit.type='button';edit.addEventListener('click',()=>decreeEdit(id));actions.append(edit);
  const repeal=decreeNode('button','Отменить указ','secondary-button');repeal.type='button';repeal.addEventListener('click',async()=>{
   const reason=prompt('Укажите причину отмены (не менее 3 символов):');if(reason===null)return;
   if(reason.trim().length<3){showToast('Укажите причину отмены.');return;}
   if(!confirm('Отменить этот указ? Он останется в архиве.'))return;
   await decreeRpc('guild_decree_repeal',{p_decree_id:id,p_reason:reason.trim()},'Указ отменён');
  });actions.append(repeal);
 }
 decreeShow('reader');
}
function decreeEdit(id=null){
 if(!decreeCanIssue)return;
 const d=id?decreeRows.find(x=>x.id===id):null;
 if(d&&!decreeMayManage(d))return;
 decreeEditing=d?.id||null;const f=decreeEl('decreeEditor');f.reset();
 f.elements.namedItem('kind').value=d?.kind||'decree';
 f.elements.namedItem('decree_year').value=d?.decree_year||1403;
 f.elements.namedItem('issued_on').value=d?.issued_on||'1403-01-01';
 f.elements.namedItem('title').value=d?.title||'';
 f.elements.namedItem('body').value=d?.body||'';
 decreeEl('decreeEditorTitle').textContent=d?'Изменить указ':'Издать указ';
 decreeEl('decreeSave').textContent=d?'Сохранить изменения':'Издать указ';decreeShow('editor');
}
async function loadDecrees(){
 if(!supabaseClient||!currentSession?.user||!['admin','approved'].includes(accessState.mode))return;
 const seq=++decreeSequence;decreeEl('decreeNotice').textContent='Загружаем реестр…';
 try{
  const [docs,can,officers,people]=await Promise.all([
   supabaseClient.from('guild_decrees').select('id,decree_number,decree_year,kind,title,body,issued_on,signed_by,created_at,updated_at,repealed_at,repealed_by,repeal_reason').order('issued_on',{ascending:false}).order('decree_number',{ascending:false}).limit(1000),
   supabaseClient.rpc('guild_decree_can_issue'),
   supabaseClient.rpc('guild_decree_officers_list'),
   supabaseClient.from('profiles').select('id,character_first_name,character_last_name,membership_status').eq('membership_status','approved').limit(1000)
  ]);
  for(const r of [docs,can,officers,people])if(r.error)throw r.error;
  if(seq!==decreeSequence)return;
  decreeRows=docs.data||[];decreeCanIssue=can.data===true;decreeOfficersRows=officers.data||[];
  decreePeople=new Map((people.data||[]).map(p=>[p.id,([p.character_first_name,p.character_last_name].filter(Boolean).join(' ')||'Участник братства')]));
  decreeEl('decreeNotice').textContent='';decreeRender();
  if(decreeMode==='reader'&&decreeSelected)decreeRead(decreeSelected);
  else if(decreeMode==='officers')decreeRenderOfficers();
  else if(decreeMode==='board')decreeShow('board');
 }catch(err){if(seq===decreeSequence)decreeEl('decreeNotice').textContent='Ошибка загрузки: '+err.message;}
}
async function decreeRpc(fn,args,message){
 if(decreeBusy)return false;decreeBusy=true;
 try{const {error}=await supabaseClient.rpc(fn,args);if(error)throw error;showToast(message);await loadDecrees();return true;}
 catch(err){showToast('Ошибка: '+err.message);return false;}
 finally{decreeBusy=false;}
}
function decreeRenderOfficers(){
 const list=decreeEl('decreeOfficersList');list.replaceChildren();
 if(accessState.mode!=='admin')return;
 if(!decreePeople.size){list.append(decreeNode('p','Нет принятых участников.'));return;}
 const appointed=new Set(decreeOfficersRows.map(o=>o.user_id));
 for(const [id,name] of [...decreePeople.entries()].sort((a,b)=>a[1].localeCompare(b[1],'ru'))){
  const row=decreeNode('div',null,'decree-officer-row');const isOfficer=appointed.has(id);const info=decreeNode('div',null,'hall-officer-info');info.append(decreeNode('strong',name),decreeNode('small',isOfficer?'Руководитель · полномочия действуют':'Участник братства',isOfficer?'hall-officer-active':'store-muted'));row.append(info);
  const btn=decreeNode('button',isOfficer?'Отозвать полномочия':'Назначить руководителем','secondary-button');btn.type='button';
  btn.addEventListener('click',async()=>{
   if(!confirm((isOfficer?'Отозвать полномочия у ':'Назначить руководителем ')+name+'?'))return;
   const ok=await decreeRpc('guild_decree_officer_set',{p_user_id:id,p_enabled:!isOfficer},isOfficer?'Полномочия отозваны':'Руководитель назначен');
   if(ok)decreeRenderOfficers();
  });row.append(btn);list.append(row);
 }
}
decreeEl('decreeCreate').addEventListener('click',()=>decreeEdit());
decreeEl('decreeOfficers').addEventListener('click',()=>{decreeShow('officers');decreeRenderOfficers();});
decreeEl('decreeBack').addEventListener('click',()=>decreeShow('board'));
decreeEl('decreeCancel').addEventListener('click',()=>decreeShow('board'));
decreeEl('decreeRefresh').addEventListener('click',loadDecrees);
for(const b of document.querySelectorAll('[data-decree-filter]'))b.addEventListener('click',()=>{decreeFilter=b.dataset.decreeFilter;decreeRender();});
decreeEl('decreeEditor').addEventListener('submit',async e=>{
 e.preventDefault();if(!decreeCanIssue||decreeBusy)return;
 const f=e.currentTarget,year=Number(f.elements.namedItem('decree_year').value);
 const args={p_decree_year:year,p_kind:f.elements.namedItem('kind').value,p_title:f.elements.namedItem('title').value.trim(),p_body:f.elements.namedItem('body').value.trim(),p_issued_on:f.elements.namedItem('issued_on').value};
 if(!Number.isInteger(year)||year<1300||year>2200||!args.p_title||!args.p_body)return showToast('Проверьте поля указа.');
 if(args.p_issued_on.slice(0,4)!==String(year))return showToast('Игровой год должен совпадать с годом даты издания.');
 if(decreeEditing)args.p_decree_id=decreeEditing;
 const ok=await decreeRpc(decreeEditing?'guild_decree_update':'guild_decree_create',args,decreeEditing?'Указ обновлён':'Указ издан');
 if(ok){decreeEditing=null;f.reset();decreeShow('board');}
});


// v1.9 — private petitions: only authorized Supabase RPCs, no table SELECT.
const petitionEl=id=>document.getElementById(id);
const petitionNode=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined&&text!==null)e.textContent=String(text);if(cls)e.className=cls;return e;};
const petitionCategories={request:'Просьба',complaint:'Жалоба',suggestion:'Предложение',resources:'Запрос ресурсов',other:'Другое'};
const petitionStatuses={submitted:'Подано',reviewing:'На рассмотрении',approved:'Одобрено',rejected:'Отклонено'};
let petitionRows=[],petitionMode='board',petitionFilter='mine',petitionSelected=null,petitionCanReview=false,petitionBusy=false,petitionSeq=0;
function petitionShow(mode){
 petitionMode=mode;
 petitionEl('petitionBoard').hidden=mode!=='board';
 petitionEl('petitionReader').hidden=mode!=='reader';
 petitionEl('petitionEditor').hidden=mode!=='editor';
 petitionEl('petitionBack').hidden=mode==='board';
 petitionEl('petitionCreate').hidden=mode!=='board';
 if(mode!=='reader')petitionEl('petitionResolution').hidden=true;
}
function petitionAuthor(p){
 if(p.author_id===currentSession?.user?.id)return 'Вы';
 return decreeName(p.author_id);
}
function petitionRender(){
 const list=petitionEl('petitionList');list.replaceChildren();const uid=currentSession?.user?.id;
 const pending=petitionRows.filter(p=>['submitted','reviewing'].includes(p.status)).length;
 petitionEl('petitionLeadership').textContent='На рассмотрении · '+pending;
 const items=petitionRows.filter(p=>petitionFilter==='all'&&petitionCanReview?['submitted','reviewing'].includes(p.status):p.author_id===uid);
 if(!items.length){list.append(petitionNode('p','В этом разделе пока нет прошений.','store-muted'));return;}
 const body=hallTable(list,petitionFilter==='all'?['Прошение','Автор','Дата','Статус']:['Прошение','Дата','Статус']);
 for(const p of items){const row=body.insertRow();hallCell(row,hallLink(p.title,petitionCategories[p.category]||p.category,()=>petitionRead(p.id)));if(petitionFilter==='all')hallCell(row,petitionAuthor(p));hallCell(row,new Date(p.created_at).toLocaleDateString('ru-RU'));hallCell(row,petitionStatuses[p.status]||p.status,'petition-status petition-status-'+p.status);}
}

function petitionRead(id){
 const p=petitionRows.find(r=>r.id===id);if(!p){petitionShow('board');return;}
 petitionSelected=id;
 petitionEl('petitionReaderKicker').textContent=(petitionCategories[p.category]||p.category)+' · '+(petitionStatuses[p.status]||p.status);
 petitionEl('petitionReaderTitle').textContent=p.title;
 petitionEl('petitionReaderMeta').textContent='Подано: '+new Date(p.created_at).toLocaleString('ru-RU')+' · Автор: '+petitionAuthor(p);
 petitionEl('petitionReaderBody').textContent=p.body;
 const response=petitionEl('petitionReaderResponse');response.replaceChildren();
 if(p.response){
  const block=petitionNode('div',null,'petition-official-response');
  block.append(petitionNode('h3','✥ Официальный ответ руководства'));
  block.append(petitionNode('p',p.response,'petition-response-text'));
  block.append(petitionNode('small','Решение: '+(petitionStatuses[p.status]||p.status)+' · '+new Date(p.responded_at).toLocaleString('ru-RU'),'store-muted'));
  response.append(block);
 }
 const actions=petitionEl('petitionReaderActions');actions.replaceChildren();
 petitionEl('petitionResolution').hidden=true;
 if(petitionCanReview&&['submitted','reviewing'].includes(p.status)){
  if(p.status==='submitted'){
   const review=petitionNode('button','Принять на рассмотрение','secondary-button');review.type='button';
   review.addEventListener('click',async()=>{if(await petitionRpc('guild_petition_review',{p_petition_id:id},'Прошение принято на рассмотрение'))petitionRead(id);});
   actions.append(review);
  }
  const resolve=petitionNode('button','Вынести решение','secondary-button');resolve.type='button';
  resolve.addEventListener('click',()=>{petitionEl('petitionResolution').hidden=false;petitionEl('petitionResolution').reset();});
  actions.append(resolve);
 }
 petitionShow('reader');
}
async function loadPetitions(){
 if(!supabaseClient||!currentSession?.user||!['approved','admin'].includes(accessState.mode))return;
 const token=++petitionSeq;
 petitionEl('petitionNotice').textContent='Загрузка прошений…';
 try{
  const [list,can]=await Promise.all([
   supabaseClient.rpc('guild_petitions_list'),
   supabaseClient.rpc('guild_petition_can_review')
  ]);
  if(list.error)throw list.error;
  if(can.error)throw can.error;
  if(token!==petitionSeq)return;
  petitionRows=list.data||[];petitionCanReview=can.data===true;
  petitionEl('petitionLeadership').hidden=!petitionCanReview;
  if(!petitionCanReview)petitionFilter='mine';
  petitionEl('petitionMine').classList.toggle('petition-selected',petitionFilter==='mine');
  petitionEl('petitionLeadership').classList.toggle('petition-selected',petitionFilter==='all');
  petitionRender();
  if(petitionMode==='reader'&&petitionSelected){
   if(petitionRows.some(p=>p.id===petitionSelected))petitionRead(petitionSelected);
   else petitionShow('board');
  }
  petitionEl('petitionNotice').textContent='';
 }catch(err){if(token===petitionSeq)petitionEl('petitionNotice').textContent='Не удалось загрузить прошения: '+err.message;}
}
async function petitionRpc(fn,args,message){
 if(petitionBusy)return false;
 petitionBusy=true;
 try{
  const {error}=await supabaseClient.rpc(fn,args);
  if(error)throw error;
  showToast(message);await loadPetitions();return true;
 }catch(err){showToast('Ошибка: '+err.message);return false;}
 finally{petitionBusy=false;}
}
petitionEl('petitionMine').addEventListener('click',()=>{petitionFilter='mine';petitionShow('board');loadPetitions();});
petitionEl('petitionLeadership').addEventListener('click',()=>{if(!petitionCanReview)return;petitionFilter='all';petitionShow('board');loadPetitions();});
petitionEl('petitionCreate').addEventListener('click',()=>{petitionEl('petitionEditor').reset();petitionShow('editor');});
petitionEl('petitionBack').addEventListener('click',()=>petitionShow('board'));
petitionEl('petitionCancel').addEventListener('click',()=>petitionShow('board'));
petitionEl('petitionRefresh').addEventListener('click',loadPetitions);
petitionEl('petitionResolveCancel').addEventListener('click',()=>{petitionEl('petitionResolution').hidden=true;});
petitionEl('petitionEditor').addEventListener('submit',async e=>{
 e.preventDefault();if(petitionBusy)return;
 const f=e.currentTarget;
 const args={p_category:f.elements.namedItem('category').value,p_title:f.elements.namedItem('title').value.trim(),p_body:f.elements.namedItem('body').value.trim()};
 if(args.p_title.length<3||args.p_body.length<5)return showToast('Заполните заголовок и текст.');
 if(await petitionRpc('guild_petition_submit',args,'Прошение подано')){petitionFilter='mine';petitionShow('board');loadPetitions();}
});
petitionEl('petitionResolution').addEventListener('submit',async e=>{
 e.preventDefault();if(!petitionCanReview||!petitionSelected||petitionBusy)return;
 const f=e.currentTarget;
 const args={p_petition_id:petitionSelected,p_status:f.elements.namedItem('status').value,p_response:f.elements.namedItem('response').value.trim()};
 if(args.p_response.length<3)return showToast('Напишите официальный ответ.');
 if(await petitionRpc('guild_petition_resolve',args,'Решение опубликовано'))petitionRead(petitionSelected);
});


// v2.0 — the hierarchy is a view of existing profiles.game_rank, NOT a second assignment system.
const councilEl=id=>document.getElementById(id);
const councilRanks=[
 [11,'Глава гильдии'],[10,'Старейшина гильдии'],[9,'Казначей'],[8,'Писарь'],[7,'Купец'],[6,'Гильдмастер'],[5,'Мастер'],[4,'Подмастерье'],[3,'Возница'],[2,'Последователь'],[1,'Послушник']
];
const councilNode=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined&&txt!==null)e.textContent=String(txt);if(cls)e.className=cls;return e;};
let councilPeople=[],councilDescriptions=new Map(),councilSeq=0,councilMode='tree',councilBusy=false;
function councilShow(mode){
 if(mode==='descriptions'&&accessState.mode!=='admin')return;
 councilMode=mode;
 councilEl('councilTreePanel').hidden=mode!=='tree';
 councilEl('councilProfile').hidden=mode!=='profile';
 councilEl('councilDescriptions').hidden=mode!=='descriptions';
 councilEl('councilDescriptionsButton').hidden=accessState.mode!=='admin'||mode!=='tree';
}
function councilRankLevel(rank){
 const normalized=String(rank||'').toLocaleLowerCase('ru').replace(/ё/g,'е').trim().replace(/\s+/g,' ');
 for(const [level,name] of councilRanks)if(name.toLocaleLowerCase('ru').replace(/ё/g,'е')===normalized)return level;
 return null;
}
function councilPortrait(p){
 const frame=councilNode('div',null,'council-portrait');
 const url=safePhoto(p.character_photo_url);
 if(url){const img=councilNode('img');img.src=url;img.alt='Портрет '+characterName(p);img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.replaceWith(councilNode('span','♙','council-fallback')));frame.append(img);}
 else frame.append(councilNode('span','♙','council-fallback'));
 return frame;
}
function councilOpenProfile(p){
 const body=councilEl('councilProfileBody');body.replaceChildren();
 const head=councilNode('div',null,'council-profile-header');head.append(councilPortrait(p));
 const info=councilNode('div');info.append(councilNode('span','Анкета персонажа','eyebrow'),councilNode('h2',characterName(p)),councilNode('p',p.game_rank||'Без ранга'));
 head.append(info);body.append(head);
 detailField(body,'Возраст',p.character_age==null?'Не указан':p.character_age+' лет');
 detailField(body,'Работы',memberJobs(p));detailField(body,'Мастерства',memberMasteries(p));
 detailField(body,'О персонаже',p.about);
 awardAttachToProfile(body,p.id);
 councilShow('profile');councilEl('hallCouncilSection').scrollIntoView({behavior:'smooth',block:'start'});
}
function councilRender(){
 const root=councilEl('councilTree');root.replaceChildren();
 for(const [level,name] of councilRanks){
  const group=councilNode('section',null,'council-tier');
  const heading=councilNode('div',null,'council-tier-heading');
  heading.append(councilNode('span',String(level),'council-rank-number'),councilNode('h3',name));
  const description=councilDescriptions.get(level)||'';
  if(description)heading.append(councilNode('p',description,'council-rank-description'));
  group.append(heading);
  const members=councilPeople.filter(p=>councilRankLevel(p.game_rank)===level).sort((a,b)=>characterName(a).localeCompare(characterName(b),'ru'));
  const row=councilNode('div',null,'council-people');
  if(!members.length){row.append(councilNode('div','Место свободно','council-vacant'));}
  else for(const p of members){
   const card=councilNode('button',null,'council-person');card.type='button';card.title='Открыть анкету: '+characterName(p);
   card.append(councilPortrait(p),councilNode('strong',characterName(p)),councilNode('small',name,'council-person-rank'));
   card.addEventListener('click',()=>councilOpenProfile(p));row.append(card);
  }
  group.append(row);root.append(group);
 }
 const unranked=councilPeople.filter(p=>councilRankLevel(p.game_rank)===null);
 if(unranked.length){
  const group=councilNode('section',null,'council-tier council-unranked');
  const heading=councilNode('div',null,'council-tier-heading');heading.append(councilNode('h3','Без назначенного ранга'));
  heading.append(councilNode('p','Персонажи с нераспознанным званием. Администратор может назначить один из 11 существующих рангов в управлении участниками.','council-rank-description'));
  group.append(heading);const row=councilNode('div',null,'council-people');
  for(const p of unranked){const b=councilNode('button',null,'council-person');b.type='button';b.append(councilPortrait(p),councilNode('strong',characterName(p)));b.addEventListener('click',()=>councilOpenProfile(p));row.append(b);}group.append(row);root.append(group);
 }
}
function councilRenderEditor(){
 const root=councilEl('councilDescriptionForms');root.replaceChildren();
 if(accessState.mode!=='admin')return;
 for(const [level,name] of councilRanks){
  const form=councilNode('form',null,'council-description-form');
  const label=councilNode('label',name);const input=councilNode('textarea');input.rows=3;input.maxLength=1000;input.required=false;input.value=councilDescriptions.get(level)||'';
  label.append(input);const button=councilNode('button','Сохранить описание','secondary-button');button.type='submit';form.append(label,button);
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(councilBusy)return;councilBusy=true;button.disabled=true;
   try{const {error}=await supabaseClient.rpc('guild_rank_description_set',{p_rank_level:level,p_description:input.value.trim()});if(error)throw error;councilDescriptions.set(level,input.value.trim());showToast('Описание сохранено');councilRender();}
   catch(err){showToast('Ошибка: '+err.message);}finally{councilBusy=false;button.disabled=false;}
  });root.append(form);
 }
}
async function loadCouncil(){
 if(!supabaseClient||!currentSession?.user||!['approved','admin'].includes(accessState.mode))return;
 const token=++councilSeq;councilEl('councilNotice').textContent='Собираем древо братства…';
 try{
  const [people,descriptions]=await Promise.all([
   supabaseClient.from('profiles').select('id,character_first_name,character_last_name,character_age,profession,crafts,jobs,masteries,about,character_photo_url,membership_status,game_rank').eq('membership_status','approved').limit(3000),
   supabaseClient.from('guild_rank_descriptions').select('rank_level,rank_name,description').order('rank_level',{ascending:false})
  ]);
  if(people.error)throw people.error;if(descriptions.error)throw descriptions.error;
  if(token!==councilSeq)return;
  councilPeople=(people.data||[]).filter(p=>p.character_first_name?.trim()&&p.character_last_name?.trim());
  councilDescriptions=new Map((descriptions.data||[]).map(r=>[Number(r.rank_level),r.description||'']));
  councilEl('councilNotice').textContent='В братстве: '+councilPeople.length+' персонажей';
  councilEl('councilDescriptionsButton').hidden=accessState.mode!=='admin'||councilMode!=='tree';
  councilRender();councilRenderEditor();
 }catch(err){if(token===councilSeq)councilEl('councilNotice').textContent='Ошибка загрузки древа: '+err.message;}
}
councilEl('councilRefresh').addEventListener('click',loadCouncil);
councilEl('councilDescriptionsButton').addEventListener('click',()=>councilShow('descriptions'));
councilEl('councilDescriptionsBack').addEventListener('click',()=>councilShow('tree'));
councilEl('councilProfileBack').addEventListener('click',()=>councilShow('tree'));


// v2.1 — manual awards, administered only through SQL-guarded RPCs.
const awardEl=id=>document.getElementById(id);
const awardNode=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined&&value!==null)e.textContent=String(value);if(cls)e.className=cls;return e;};
const awardKinds={order:'Орден',medal:'Медаль',certificate:'Грамота',honorary:'Почётный знак',other:'Награда'};
let awardTypes=[],awardGrants=[],awardPeople=[],awardPeopleMap=new Map(),awardMode='board',awardTab='people',awardEditing=null,awardBusy=false,awardSeq=0;
const awardDate=value=>{if(!value)return '—';const [y,m,d]=String(value).slice(0,10).split('-');return [d,m,y].join('.');};
const awardName=id=>awardPeopleMap.get(id)||'Участник братства';
const awardType=id=>awardTypes.find(t=>t.id===id);
function awardImage(type){
 const wrap=awardNode('div',null,'award-medallion');const url=safePhoto(type?.image_url);
 if(url){const img=awardNode('img');img.src=url;img.alt=type.name;img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.replaceWith(awardNode('span','✥')));wrap.append(img);}
 else wrap.append(awardNode('span',type?.category==='certificate'?'📜':type?.category==='order'?'✠':'✥'));
 return wrap;
}
function awardShow(mode){
 if(mode!=='board'&&accessState.mode!=='admin')return;
 awardMode=mode;awardEl('awardBoard').hidden=mode!=='board';awardEl('awardTypeForm').hidden=mode!=='type';awardEl('awardGrantForm').hidden=mode!=='grant';
 awardEl('awardNewType').hidden=accessState.mode!=='admin'||mode!=='board';awardEl('awardNewGrant').hidden=accessState.mode!=='admin'||mode!=='board';
}
function awardEntry(grant,compact=false){
 const type=awardType(grant.award_type_id);if(!type)return awardNode('div','Награда недоступна','award-record');
 const item=awardNode('article',null,'award-record'+(grant.revoked_at?' award-revoked':''));item.append(awardImage(type));
 const body=awardNode('div',null,'award-record-body');body.append(awardNode('strong',type.name),awardNode('span',(awardKinds[type.category]||'Награда')+' · '+awardDate(grant.awarded_on)));
 if(!compact)body.append(awardNode('p','Награждён: '+awardName(grant.recipient_id)),awardNode('p','Основание: '+grant.reason),awardNode('small','Вручил: '+awardName(grant.granted_by)));
 else body.append(awardNode('small',grant.reason));
 if(grant.revoked_at)body.append(awardNode('p','Отозвана '+awardDate(grant.revoked_at)+'. Причина: '+(grant.revocation_reason||'Не указана')));
 item.append(body);
 if(accessState.mode==='admin'&&!grant.revoked_at){const revoke=awardNode('button','Отозвать','secondary-button award-revoke');revoke.type='button';revoke.addEventListener('click',()=>awardRevoke(grant));item.append(revoke);}
 return item;
}
function awardRender(){
 const root=awardEl('awardContent');root.replaceChildren();
 awardEl('awardTabPeople').classList.toggle('active',awardTab==='people');awardEl('awardTabCatalog').classList.toggle('active',awardTab==='catalog');awardEl('awardTabHistory').classList.toggle('active',awardTab==='history');
 if(awardTab==='catalog'){
  const grid=awardNode('div',null,'award-catalog');
  for(const type of awardTypes){const card=awardNode('article',null,'award-type-card');card.append(awardImage(type),awardNode('h3',type.name),awardNode('small',awardKinds[type.category]||'Награда'),awardNode('p',type.description||'Описание не указано'));
   if(!type.is_active)card.append(awardNode('small','Архивная награда'));
   if(accessState.mode==='admin'){const edit=awardNode('button','Изменить','secondary-button');edit.type='button';edit.addEventListener('click',()=>awardEditType(type));card.append(edit);}grid.append(card);}
  root.append(grid);if(!awardTypes.length)root.append(awardNode('p','Каталог пока пуст.','store-muted'));return;
 }
 if(awardTab==='history'){
  if(!awardGrants.length)root.append(awardNode('p','Пока не было награждений.','store-muted'));
  for(const grant of awardGrants)root.append(awardEntry(grant));return;
 }
 const active=awardGrants.filter(g=>!g.revoked_at);const grouped=new Map();for(const g of active){if(!grouped.has(g.recipient_id))grouped.set(g.recipient_id,[]);grouped.get(g.recipient_id).push(g);}
 if(!grouped.size)root.append(awardNode('p','Доска почёта ждёт первых достойных братьев и сестёр.','store-muted'));
 for(const [id,grants] of grouped){const profile=awardPeople.find(p=>p.id===id);const card=awardNode('article',null,'award-honoree');const head=awardNode('div',null,'award-honoree-head');if(profile)head.append(councilPortrait(profile));head.append(awardNode('h3',awardName(id)));card.append(head);const medals=awardNode('div',null,'award-honoree-medals');for(const g of grants)medals.append(awardEntry(g,true));card.append(medals);root.append(card);}
}
async function loadAwards(){
 if(!supabaseClient||!currentSession?.user||!['approved','admin'].includes(accessState.mode))return;
 const seq=++awardSeq;awardEl('awardNotice').textContent='Открываем летопись наград…';
 try{const [types,grants,people]=await Promise.all([
  supabaseClient.from('guild_award_types').select('*').order('created_at',{ascending:false}).limit(1000),
  supabaseClient.from('guild_award_grants').select('*').order('granted_at',{ascending:false}).limit(3000),
  supabaseClient.from('profiles').select('id,character_first_name,character_last_name,character_photo_url,membership_status').eq('membership_status','approved').limit(3000)
 ]);if(types.error)throw types.error;if(grants.error)throw grants.error;if(people.error)throw people.error;if(seq!==awardSeq)return;
 awardTypes=types.data||[];awardGrants=grants.data||[];awardPeople=people.data||[];awardPeopleMap=new Map(awardPeople.map(p=>[p.id,characterName(p)]));
 awardEl('awardNotice').textContent='Наград в каталоге: '+awardTypes.length+' · Награждений: '+awardGrants.filter(g=>!g.revoked_at).length;awardRender();
 }catch(err){if(seq===awardSeq)awardEl('awardNotice').textContent='Ошибка загрузки наград: '+err.message;}
}
function awardAttachToProfile(parent,id){
 const section=awardNode('section',null,'award-profile');section.append(awardNode('h3','⚜ Награды и заслуги'));
 const list=awardNode('div',null,'award-profile-list');section.append(list);parent.append(section);
 const render=()=>{list.replaceChildren();const grants=awardGrants.filter(g=>g.recipient_id===id&&!g.revoked_at);if(!grants.length){list.append(awardNode('p','Наград пока нет.','store-muted'));return;}for(const g of grants)list.append(awardEntry(g,true));};
 if(awardTypes.length||awardGrants.length){render();return;}
 list.append(awardNode('p','Загрузка наград…','store-muted'));
 Promise.all([supabaseClient.from('guild_award_types').select('*').limit(1000),supabaseClient.from('guild_award_grants').select('*').eq('recipient_id',id).limit(500)]).then(([types,grants])=>{
  if(types.error||grants.error)throw types.error||grants.error;
  awardTypes=types.data||[];awardGrants=[...awardGrants.filter(g=>g.recipient_id!==id),...(grants.data||[])];render();
 }).catch(()=>{list.replaceChildren(awardNode('p','Не удалось загрузить награды.','store-muted'));});
}
function awardEditType(type){
 awardEditing=type?.id||null;const f=awardEl('awardTypeForm');f.reset();f.elements.namedItem('name').value=type?.name||'';f.elements.namedItem('category').value=type?.category||'medal';f.elements.namedItem('description').value=type?.description||'';f.elements.namedItem('image_url').value=type?.image_url||'';f.elements.namedItem('is_active').checked=type?.is_active??true;awardEl('awardTypeTitle').textContent=type?'Редактирование награды':'Создание награды';awardShow('type');
}
function awardGrantNew(){
 const f=awardEl('awardGrantForm');f.reset();const awards=f.elements.namedItem('award_type_id'),people=f.elements.namedItem('recipient_id');awards.replaceChildren();people.replaceChildren();
 for(const t of awardTypes.filter(t=>t.is_active))awards.add(new Option(t.name,t.id));for(const p of [...awardPeople].sort((a,b)=>characterName(a).localeCompare(characterName(b),'ru')))people.add(new Option(characterName(p),p.id));
 if(!awards.length||!people.length){showToast('Нужны активная награда и принятый участник.');return;}
 const now=new Date();f.elements.namedItem('awarded_on').value=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');awardShow('grant');
}
async function awardRpc(name,args,success){if(awardBusy||accessState.mode!=='admin')return false;awardBusy=true;
 try{const {error}=await supabaseClient.rpc(name,args);if(error)throw error;showToast(success);awardShow('board');await loadAwards();return true;}
 catch(err){showToast('Ошибка: '+err.message);return false;}finally{awardBusy=false;}}
async function awardRevoke(grant){const reason=window.prompt('Причина отзыва награды (обязательно):');if(reason===null)return;if(reason.trim().length<3){showToast('Укажите причину не короче 3 символов.');return;}
 if(!window.confirm('Отозвать награду? Запись останется в истории.'))return;
 await awardRpc('guild_award_revoke',{p_grant_id:grant.id,p_reason:reason.trim()},'Награда отозвана');}
awardEl('awardRefresh').addEventListener('click',loadAwards);
awardEl('awardNewType').addEventListener('click',()=>awardEditType(null));
awardEl('awardNewGrant').addEventListener('click',awardGrantNew);
awardEl('awardTypeCancel').addEventListener('click',()=>awardShow('board'));
awardEl('awardGrantCancel').addEventListener('click',()=>awardShow('board'));
for(const [id,tab] of [['awardTabPeople','people'],['awardTabCatalog','catalog'],['awardTabHistory','history']])awardEl(id).addEventListener('click',()=>{awardTab=tab;awardRender();});
awardEl('awardTypeForm').addEventListener('submit',async e=>{
 e.preventDefault();const f=e.currentTarget;const args={p_name:f.elements.namedItem('name').value.trim(),p_description:f.elements.namedItem('description').value.trim(),p_category:f.elements.namedItem('category').value,p_image_url:f.elements.namedItem('image_url').value.trim()||null};
 if(awardEditing)await awardRpc('guild_award_type_update',{p_award_type_id:awardEditing,...args,p_is_active:f.elements.namedItem('is_active').checked},'Награда изменена');
 else await awardRpc('guild_award_type_create',args,'Награда создана');
});
awardEl('awardGrantForm').addEventListener('submit',async e=>{
 e.preventDefault();const f=e.currentTarget;await awardRpc('guild_award_grant',{p_award_type_id:f.elements.namedItem('award_type_id').value,p_recipient_id:f.elements.namedItem('recipient_id').value,p_reason:f.elements.namedItem('reason').value.trim(),p_awarded_on:f.elements.namedItem('awarded_on').value},'Награда вручена');
});


// v2.2 Cartographic Chamber. All coordinates are normalized to the base image.
const gm = id => document.getElementById(id);
const guildMapState = {region:'kuttenberg',markers:[],routes:[],draft:[],point:null,editing:null,scale:1};
const guildMapCategories = {
 marker:[['resource','Ресурсы'],['trade','Торговля'],['meeting','Место сбора'],['workshop','Мастерская'],['warning','Опасность'],['other','Другое']],
 route:[['trade','Торговый путь'],['expedition','Экспедиция'],['resource','Добыча'],['patrol','Патруль'],['other','Другое']]
};
const gmSvgNS='http://www.w3.org/2000/svg';
const gmMarkerIcons={resource:'⛏',trade:'⚖',meeting:'⚑',workshop:'⚒',warning:'!',other:'✦'};

function gmSvg(tag,attrs){const el=document.createElementNS(gmSvgNS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));return el;}
function gmStatus(s){gm('guildMapStatus').textContent=s;}
function gmMode(){return gm('guildMapMode').value;}
function gmEscape(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function gmAllowed(r){return accessState.mode==='admin'||r.created_by===currentSession?.user?.id;}
function gmCategorySelect(kind,selected){gm('guildMapCategory').replaceChildren(...guildMapCategories[kind].map(([v,l])=>{const e=document.createElement('option');e.value=v;e.textContent=l;return e;}));if(selected)gm('guildMapCategory').value=selected;}
function gmEdit(kind,record=null){
 guildMapState.editing=record?{kind,id:record.id}:null;
 gm('guildMapEditor').hidden=false;gm('guildMapEditorTitle').textContent=record?'Редактирование':'Новая '+(kind==='marker'?'метка':'маршрут');
 gm('guildMapTitle').value=record?.title||'';gm('guildMapDescription').value=record?.description||'';
 gmCategorySelect(kind,record?.category);gm('guildMapVisibility').value=record?.visibility||'guild';
 gm('guildMapColorWrap').hidden=kind!=='route';gm('guildMapColor').value=record?.color||'#b88a4a';
 gm('guildMapEditorHint').textContent=kind==='route'?'Маршрут состоит из выбранных точек карты.':'Координаты сохраняются относительно изображения.';
 gm('guildMapSave').dataset.kind=kind;
}
function gmClose(){gm('guildMapEditor').hidden=true;guildMapState.editing=null;guildMapState.point=null;guildMapState.draft=[];gm('guildMapDraftActions').hidden=true;gm('guildMapMode').value='view';gmRender();}
function gmXY(event){const r=gm('guildMapSvg').getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))};}
function gmDraw(){
 const s=gm('guildMapSvg');s.replaceChildren();const st=guildMapState;const only=gm('guildMapShowMineOnly').checked;const mine=r=>!only||r.created_by===currentSession?.user?.id;
 if(gm('guildMapShowRoutes').checked){for(const r of st.routes.filter(mine)){
 const line=gmSvg('polyline',{points:r.points.map(p=>`${p.x*1000},${p.y*700}`).join(' '),fill:'none',stroke:r.color||'#b88a4a','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round',class:'gm-route'});
 line.addEventListener('click',e=>{e.stopPropagation();gmSelect('route',r.id)});s.append(line);
 }}
 if(st.draft.length){s.append(gmSvg('polyline',{points:st.draft.map(p=>`${p.x*1000},${p.y*700}`).join(' '),fill:'none',stroke:'#f7e8b0','stroke-width':2,'stroke-dasharray':'7 5'}));for(const p of st.draft)s.append(gmSvg('circle',{cx:p.x*1000,cy:p.y*700,r:3,fill:'#f7e8b0'}));}
 if(gm('guildMapShowMarkers').checked){for(const r of st.markers.filter(mine)){
 const g=gmSvg('g',{class:'gm-pin'});
 g.append(gmSvg('circle',{cx:r.x*1000,cy:r.y*700,r:5,fill:'#712f2e',stroke:'#ffe0a5','stroke-width':1}));
 const icon=gmSvg('text',{x:r.x*1000,y:r.y*700+2.3,'text-anchor':'middle',fill:'#fff2d5','font-size':7,'font-weight':'bold'});
 icon.textContent=gmMarkerIcons[r.category]||gmMarkerIcons.other;g.append(icon);
 const title=gmSvg('title',{});title.textContent=r.title;g.append(title);
 g.addEventListener('click',e=>{e.stopPropagation();gmSelect('marker',r.id)});s.append(g);
 }}
 if(st.point)s.append(gmSvg('circle',{cx:st.point.x*1000,cy:st.point.y*700,r:5,fill:'#e6b95d',stroke:'#4b2a21','stroke-width':3}));
}
function gmSelect(kind,id){const r=guildMapState[kind==='marker'?'markers':'routes'].find(x=>x.id===id);if(!r)return;gmStatus(`${kind==='marker'?'Метка':'Маршрут'}: ${r.title}${r.description?' — '+r.description:''}`);}
function gmRender(){gmDraw();const list=gm('guildMapList');list.replaceChildren();const st=guildMapState;const only=gm('guildMapShowMineOnly').checked;
 const entries=[...st.markers.map(r=>({...r,kind:'marker'})),...st.routes.map(r=>({...r,kind:'route'}))].filter(r=>!only||r.created_by===currentSession?.user?.id);
 entries.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
 for(const r of entries){const item=document.createElement('div');item.className='map-record';const heading=document.createElement('strong');heading.textContent=(r.kind==='marker'?'⌖ ':'↝ ')+r.title;item.append(heading);
 const meta=document.createElement('small');meta.textContent= r.visibility==='guild'?'Общая':r.visibility==='personal'?'Личная':'Руководству';item.append(meta);
 if(r.description){const desc=document.createElement('p');desc.textContent=r.description;item.append(desc);}
 const buttons=document.createElement('div');buttons.className='map-record-buttons';const focus=document.createElement('button');focus.type='button';focus.className='secondary-button';focus.textContent='Показать';focus.onclick=()=>gmSelect(r.kind,r.id);buttons.append(focus);
 if(gmAllowed(r)){const edit=document.createElement('button');edit.type='button';edit.className='secondary-button';edit.textContent='Изменить';edit.onclick=()=>{gm('guildMapMode').value='view';gmEdit(r.kind,r);};buttons.append(edit);
 const del=document.createElement('button');del.type='button';del.className='secondary-button';del.textContent='Удалить';del.onclick=()=>gmDelete(r);buttons.append(del);}
 item.append(buttons);list.append(item);
 }
 if(!entries.length)list.textContent='Пока нет записей для выбранного слоя.';
}
async function guildMapLoad(){if(!supabaseClient||!currentSession?.user)return;gmStatus('Загружаем метки и маршруты…');const region=guildMapState.region;
 const [a,b]=await Promise.all([supabaseClient.from('guild_map_markers').select('*').eq('map_key',region).order('created_at',{ascending:false}),supabaseClient.from('guild_map_routes').select('*').eq('map_key',region).order('created_at',{ascending:false})]);
 if(region!==guildMapState.region)return;if(a.error||b.error){gmStatus('Ошибка загрузки: '+(a.error||b.error).message);return;}
 guildMapState.markers=a.data||[];guildMapState.routes=b.data||[];gmStatus(`Метки: ${a.data.length} · Маршруты: ${b.data.length}`);gmRender();
}
async function gmSave(){const kind=gm('guildMapSave').dataset.kind;const title=gm('guildMapTitle').value.trim();if(!title){showToast('Укажите название');return;}
 const st=guildMapState;const edit=st.editing;const old=edit?st[kind==='marker'?'markers':'routes'].find(r=>r.id===edit.id):null;
 const data={title,description:gm('guildMapDescription').value.trim(),category:gm('guildMapCategory').value,visibility:gm('guildMapVisibility').value};
 if(kind==='marker') {const p=old?{x:old.x,y:old.y}:st.point;if(!p){showToast('Сначала выберите место на карте');return;}Object.assign(data,p);}
 else {data.color=gm('guildMapColor').value;data.points=old?.points||st.draft;if(data.points.length<2){showToast('Нужно минимум две точки маршрута');return;}}
 const table='guild_map_'+(kind==='marker'?'markers':'routes');
 const query=edit?supabaseClient.from(table).update(data).eq('id',edit.id):supabaseClient.from(table).insert({...data,map_key:st.region,created_by:currentSession.user.id});
 const {error}=await query;if(error){showToast('Ошибка сохранения: '+error.message);return;}gmClose();showToast('Запись сохранена');await guildMapLoad();
}
async function gmDelete(r){if(!confirm(`Удалить «${r.title}»?`))return;const {error}=await supabaseClient.from('guild_map_'+(r.kind==='marker'?'markers':'routes')).delete().eq('id',r.id);if(error){showToast(error.message);return;}showToast('Запись удалена');await guildMapLoad();}
function gmBase(){const st=guildMapState;const paper=gm('guildMapStage');const file=st.region==='kuttenberg'?'map-kuttenberg.jpg':'map-trosky.jpg';
 paper.style.backgroundImage=`url("${file}")`;gm('guildMapViewport').classList.toggle('map-with-image',false);
 const test=new Image();test.onload=()=>{if(st.region===(file.includes('kuttenberg')?'kuttenberg':'trosky'))gm('guildMapViewport').classList.add('map-with-image');};test.src=file;
}
gm('guildMapRegion').addEventListener('change',()=>{guildMapState.region=gm('guildMapRegion').value;gmClose();gmBase();guildMapLoad();});
gm('guildMapMode').addEventListener('change',(event)=>{const value=event.target.value;gmClose();gm('guildMapMode').value=value;gmStatus(gmMode()==='marker'?'Нажмите на карту, чтобы поставить метку.':gmMode()==='route'?'Нажимайте на карту, чтобы отметить точки маршрута.':'Режим просмотра');});
gm('guildMapSvg').addEventListener('click',e=>{const mode=gmMode();if(mode==='view')return;const p=gmXY(e);if(mode==='marker'){guildMapState.point=p;gmEdit('marker');gmRender();}else{guildMapState.draft.push(p);gm('guildMapDraftActions').hidden=false;gm('guildMapDraftCount').textContent=`Точек: ${guildMapState.draft.length}`;gmDraw();}});
gm('guildMapRouteDone').onclick=()=>{if(guildMapState.draft.length<2){showToast('Нужно минимум две точки');return;}gmEdit('route');};
gm('guildMapUndo').onclick=()=>{guildMapState.draft.pop();gm('guildMapDraftCount').textContent=`Точек: ${guildMapState.draft.length}`;gmDraw();};
gm('guildMapSave').onclick=gmSave;gm('guildMapCancel').onclick=gmClose;gm('guildMapRefresh').onclick=guildMapLoad;
for(const id of ['guildMapShowMarkers','guildMapShowRoutes','guildMapShowMineOnly'])gm(id).onchange=gmRender;
// Zoom is measured against the viewport's actual width, not percentage CSS widths.
// Keep a stable coordinate system so saved pins and routes never move.
function gmSizeStage(preserveCenter=false){
 const viewport=gm('guildMapViewport'),stage=gm('guildMapStage');
 const oldWidth=stage.offsetWidth||viewport.clientWidth;
 const oldLeft=viewport.scrollLeft,oldTop=viewport.scrollTop;
 const oldCenterX=(oldLeft+viewport.clientWidth/2)/oldWidth;
 const oldCenterY=(oldTop+viewport.clientHeight/2)/(oldWidth*1706/2048);
 const width=Math.max(1,viewport.clientWidth)*guildMapState.scale;
 stage.style.setProperty('width',`${width}px`,'important');
 stage.style.setProperty('height',`${width*1706/2048}px`,'important');
 if(preserveCenter){viewport.scrollLeft=oldCenterX*width-viewport.clientWidth/2;viewport.scrollTop=oldCenterY*(width*1706/2048)-viewport.clientHeight/2;}
}
function gmZoom(factor,clientX,clientY){
 const viewport=gm('guildMapViewport'),stage=gm('guildMapStage');
 const before=guildMapState.scale,after=Math.max(1,Math.min(10,before*factor));
 if(Math.abs(after-before)<0.00001)return;
 const rect=viewport.getBoundingClientRect();
 const x=clientX===undefined?viewport.clientWidth/2:clientX-rect.left-viewport.clientLeft;
 const y=clientY===undefined?viewport.clientHeight/2:clientY-rect.top-viewport.clientTop;
 const oldW=stage.offsetWidth,oldH=stage.offsetHeight;
 const imageX=(viewport.scrollLeft+x)/oldW,imageY=(viewport.scrollTop+y)/oldH;
 guildMapState.scale=after;
 gmSizeStage();
 viewport.scrollLeft=imageX*stage.offsetWidth-x;
 viewport.scrollTop=imageY*stage.offsetHeight-y;
}
gm('guildMapZoomIn').onclick=()=>gmZoom(1.35);
gm('guildMapZoomOut').onclick=()=>gmZoom(1/1.35);
gm('guildMapZoomReset').onclick=()=>{const st=guildMapState.scale;gmZoom(1/st);gm('guildMapViewport').scrollTo(0,0);};
gm('guildMapViewport').addEventListener('wheel',e=>{
 if(e.ctrlKey||e.metaKey)return;
 e.preventDefault();gmZoom(e.deltaY<0?1.18:1/1.18,e.clientX,e.clientY);
},{passive:false});
gmBase();
// The map column changes width with browser zoom, window resizing and side panel stacking.
const gmResizeObserver=new ResizeObserver(()=>gmSizeStage(true));
gmResizeObserver.observe(gm('guildMapViewport'));
requestAnimationFrame(()=>gmSizeStage());

// v2.7.2 — read-only home dashboard, using existing RLS policies.
let home272Sequence=0;
const home272=id=>document.getElementById(id);
const home272Date=value=>value?new Date(value).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'}):'';
function home272List(id,rows,empty){const root=home272(id);root.replaceChildren();if(!rows.length)root.append(element('p','home272-meta',empty));for(const r of rows){const card=element('div','home272-record'+(r.pinned?' home272-pinned':''));if(r.meta)card.append(element('small','home272-meta',r.meta));card.append(element('strong','',r.title));if(r.body)card.append(element('p','',r.body));root.append(card);}}
async function loadHome272(){
 const uid=currentSession?.user?.id,admin=accessState.mode==='admin';if(!uid||!supabaseClient||!['admin','approved'].includes(accessState.mode))return;
 const seq=++home272Sequence;const active=()=>seq===home272Sequence&&currentSession?.user?.id===uid&&['admin','approved'].includes(accessState.mode)&&homePage.classList.contains('active-page');
 const ids=['homeNotices'];for(const id of ids)home272List(id,[],'Загрузка…');for(const id of ['homeMembers','homeBalance','homeTasks','homeMine'])home272(id).textContent='—';home272('homeGreeting').textContent='Добро пожаловать!';home272('homeStatus').textContent='Загрузка сведений…';
 const count=(table,field,value)=>supabaseClient.from(table).select('*',{count:'exact',head:true}).eq(field,value);
 const jobs=[
 supabaseClient.from('profiles').select('character_first_name').eq('id',uid).maybeSingle(),
 count('profiles','membership_status','approved'),
 workFetchAll('treasury_transactions','amount'),
 supabaseClient.from('work_tasks').select('id',{count:'exact',head:true}).eq('status','open').eq('task_type','public'),
 supabaseClient.from('work_tasks').select('id',{count:'exact',head:true}).eq('assigned_to',uid).in('status',['assigned','submitted']),
 supabaseClient.from('storage_requests').select('id',{count:'exact',head:true}).eq('user_id',uid).eq('status','pending'),
 supabaseClient.from('storage_craft_batches').select('id',{count:'exact',head:true}).eq('user_id',uid).eq('status','pending'),
 supabaseClient.from('guild_documents').select('title,summary,is_pinned,updated_at').eq('category','announcements').order('is_pinned',{ascending:false}).order('updated_at',{ascending:false}).limit(4),
 ];
 const results=await Promise.allSettled(jobs);if(!active())return;const ok=i=>results[i]?.status==='fulfilled'&&!results[i].value?.error;const val=i=>ok(i)?results[i].value:null;const rows=i=>val(i)?.data||[];const num=i=>val(i)?.count;const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat('ru-RU').format(n):'—';const set=(id,n)=>home272(id).textContent=fmt(n);
 if(val(0)?.data?.character_first_name)home272('homeGreeting').textContent='Доброго дня, '+val(0).data.character_first_name+'!';set('homeMembers',num(1));set('homeBalance',ok(2)?val(2).reduce((n,t)=>n+Number(t.amount),0):NaN);set('homeTasks',num(3));set('homeMine',[4,5,6].every(i=>Number.isFinite(num(i)))?num(4)+num(5)+num(6):NaN);
 home272List('homeNotices',rows(7).map(t=>({title:t.title,body:t.summary,meta:(t.is_pinned?'Закреплено · ':'')+home272Date(t.updated_at),pinned:t.is_pinned})),ok(7)?'Объявлений пока нет.':'Объявления недоступны.');home272('homeStatus').textContent=results.every((_,i)=>ok(i))?'Обновлено: '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'Часть сведений недоступна. Попробуйте обновить.';
}
home272('homeRefresh').onclick=loadHome272;
home272('homeAnnouncements').onclick=()=>{if(canVisit('info')){navigate('info');libOpenCategory('announcements');}};

function trSelect(tab){
  if(tab==='admin' && accessState.mode!=='admin') tab='journal';
  document.querySelectorAll('[data-tr-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.trTab===tab)));
  document.querySelectorAll('[data-tr-panel]').forEach(p=>p.hidden=p.dataset.trPanel!==tab);
}
function trFilter(){
 const q=document.getElementById('trSearch').value.trim().toLocaleLowerCase('ru');
 const d=document.getElementById('trDirection').value;
 const rows=[...document.querySelectorAll('#treasuryHistory [data-tr-direction]')];
 rows.forEach(r=>r.hidden=!(r.textContent.toLocaleLowerCase('ru').includes(q)&&(d==='all'||r.dataset.trDirection===d)));
 document.getElementById('trEmpty').hidden=!rows.length||rows.some(r=>!r.hidden);
}
document.querySelectorAll('[data-tr-tab]').forEach(b=>b.addEventListener('click',()=>trSelect(b.dataset.trTab)));
document.getElementById('trSearch').addEventListener('input',trFilter);
document.getElementById('trDirection').addEventListener('change',trFilter);

 document.getElementById('decreeSearch').addEventListener('input',decreeRender);
 document.getElementById('decreeStatusFilter').addEventListener('change',e=>{decreeFilter=e.target.value;decreeRender();});

// Gallery v2.8.5.1 — private Storage, signed image URLs.
const galSafeUrl=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.href.length<=2048?u.href:'';}catch{return '';}};
const galBucket='brotherhood-gallery';let galAuthors=new Map(),galRows=[],galSelected=new Set(),galUrls=new Map(),galSeq=0,galBusy=false;
const galEl=id=>document.getElementById(id);
const galButton=(label,fn,cls='secondary-button')=>{const b=libNode('button',label,cls);b.type='button';b.addEventListener('click',fn);return b;};
const galTags=value=>[...new Set(String(value||'').toLocaleLowerCase('ru').split(/[\s,;]+/).map(t=>t.replace(/^#+/,'')).filter(t=>/^[\p{L}\p{N}_-]{1,40}$/u.test(t)))].slice(0,20);
function galCounts(){const m=new Map();for(const r of galRows)for(const t of r.tags||[])m.set(t,(m.get(t)||0)+1);return [...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'ru'));}
function galAuthor(id){return galAuthors.get(id)||'Автор недоступен';}
function galAuthorOptions(){const select=galEl('galleryAuthor'),old=select.value;select.replaceChildren(new Option('Все авторы',''));const counts=new Map();for(const r of galRows)counts.set(r.author_id,(counts.get(r.author_id)||0)+1);for(const [id,n] of [...counts].sort((a,b)=>galAuthor(a[0]).localeCompare(galAuthor(b[0]),'ru')))select.add(new Option(galAuthor(id)+' · '+n,id));select.value=counts.has(old)?old:'';}
function galRender(){const tags=galEl('galleryTags');tags.replaceChildren();const all=galButton('Все · '+galRows.length,()=>{galSelected.clear();galRender();});all.classList.toggle('active',!galSelected.size);tags.append(all);for(const [t,n] of galCounts()){const b=galButton('#'+t+' · '+n,()=>{galSelected.has(t)?galSelected.delete(t):galSelected.add(t);galRender();});b.classList.toggle('active',galSelected.has(t));tags.append(b);}const q=galEl('gallerySearch').value.toLocaleLowerCase('ru').trim();const root=galEl('galleryGrid');root.replaceChildren();for(const r of galRows.filter(r=>(!galEl('galleryAuthor').value||r.author_id===galEl('galleryAuthor').value)&&[...galSelected].every(t=>r.tags.includes(t))&&[r.title,r.description,galAuthor(r.author_id),...r.tags].join(' ').toLocaleLowerCase('ru').includes(q.replace(/^#/,'')))){const b=galButton('',()=>galRead(r),'gallery-card');const img=libNode('img');img.alt=r.title||'Снимок';img.loading='lazy';img.referrerPolicy='no-referrer';img.src=galSafeUrl(r.image_url)||galUrls.get(r.thumb_path)||'';img.onerror=()=>{img.removeAttribute('src');img.alt='Изображение недоступно';};const d=libNode('div');d.append(libNode('strong',r.title||'Без названия'),libNode('small','Автор: '+galAuthor(r.author_id),'gallery-author'),libNode('small',r.tags.map(t=>'#'+t).join(' ')));b.append(img,d);root.append(b);}if(!root.children.length)root.append(libNode('p','Снимки не найдены.','store-muted'));}
async function galLoad(){const seq=++galSeq,uid=currentSession?.user?.id;galEl('galleryNotice').textContent='Загрузка…';try{const rows=await storeAllRows('guild_gallery','id,author_id,title,description,tags,image_url,image_path,thumb_path,created_at');const authors=new Map();const ids=[...new Set(rows.map(r=>r.author_id))];for(let i=0;i<ids.length;i+=100){const {data,error}=await supabaseClient.from('profiles').select('id,character_first_name,character_last_name').in('id',ids.slice(i,i+100));if(error)throw error;for(const p of data||[])authors.set(p.id,characterName(p));}const urls=new Map();for(let i=0;i<rows.length;i+=100){const paths=rows.slice(i,i+100).map(r=>r.thumb_path).filter(Boolean);if(!paths.length)continue;const {data,error}=await supabaseClient.storage.from(galBucket).createSignedUrls(paths,3600);if(error)throw error;for(const u of data||[])if(u.signedUrl)urls.set(u.path,u.signedUrl);}if(seq!==galSeq||uid!==currentSession?.user?.id)return;galRows=rows;galUrls=urls;galAuthors=authors;galAuthorOptions();galSelected=new Set([...galSelected].filter(t=>galCounts().some(x=>x[0]===t)));galRender();galEl('galleryNotice').textContent='';}catch(e){if(seq===galSeq)galEl('galleryNotice').textContent='Ошибка галереи: '+e.message;}}
function galDialog(title){const d=galEl('galleryDialog');d.replaceChildren();const head=libNode('div',null,'treasury-heading');head.append(libNode('h2',title),galButton('×',()=>d.close()));d.append(head);if(!d.open)d.showModal();return d;}
async function galRead(r){const d=galDialog(r.title||'Снимок');const img=libNode('img');img.alt=r.title||'Снимок';d.append(img,libNode('p',r.description||'Без описания'));d.append(libNode('small','Автор: '+galAuthor(r.author_id)+' · '+new Date(r.created_at).toLocaleDateString('ru-RU')));const tags=libNode('div',null,'gallery-tags');for(const t of r.tags)tags.append(galButton('#'+t,()=>{galSelected=new Set([t]);galRender();d.close();}));d.append(tags);const actions=libNode('div',null,'treasury-actions');d.append(actions);if(r.author_id===currentSession?.user?.id||accessState.mode==='admin'){actions.append(galButton('Редактировать',()=>galEdit(r)),galButton('Удалить',async()=>{if(galBusy||!confirm('Удалить снимок?'))return;galBusy=true;try{const {error}=await supabaseClient.from('guild_gallery').delete().eq('id',r.id);if(error)throw error;if(r.image_path){const result=await supabaseClient.storage.from(galBucket).remove([r.image_path,r.thumb_path]);if(result.error)showToast('Запись удалена, файл требует очистки: '+result.error.message);}d.close();await galLoad();}catch(e){showToast(e.message);}finally{galBusy=false;}}));}let url=galSafeUrl(r.image_url);if(!url&&r.image_path){const {data,error}=await supabaseClient.storage.from(galBucket).createSignedUrl(r.image_path,3600);if(!error)url=data.signedUrl;}if(!url){d.append(libNode('p','Не удалось открыть изображение'));return;}img.referrerPolicy='no-referrer';img.src=url;img.onerror=()=>{img.removeAttribute('src');img.alt='Изображение недоступно';};const link=libNode('a','Открыть изображение','secondary-button');link.href=url;link.target='_blank';link.rel='noopener noreferrer';actions.prepend(link);}
function galEdit(r=null){const d=galDialog(r?'Редактировать снимок':'Добавить в галерею');const f=libNode('form');d.append(f);const field=(name,el)=>{const l=libNode('label',name);l.append(el);f.append(l);return el;};const url=field('Прямая HTTPS-ссылка на изображение',libNode('input'));url.type='url';url.maxLength=2048;url.placeholder='https://…/image.png';url.value=r?.image_url||'';url.required=!r||!!r.image_url;const hint=libNode('small','Вставьте прямую ссылку на JPG, PNG или WEBP, а не страницу фотохостинга.','store-muted');f.append(hint);const preview=libNode('img');preview.hidden=true;preview.referrerPolicy='no-referrer';preview.alt='Предпросмотр';f.append(preview);const check=galButton('Проверить изображение',()=>{const v=galSafeUrl(url.value.trim());if(!v){hint.textContent='Нужна действительная HTTPS-ссылка.';return;}preview.hidden=false;preview.onload=()=>{hint.textContent='Изображение доступно.';};preview.onerror=()=>{preview.hidden=true;hint.textContent='Изображение недоступно. Проверьте прямую ссылку.';};preview.src=v;});f.append(check);const title=field('Название (необязательно)',libNode('input'));title.maxLength=160;title.value=r?.title||'';const desc=field('Описание (необязательно)',libNode('textarea'));desc.rows=3;desc.maxLength=1000;desc.value=r?.description||'';const tags=field('Хештеги (через пробел или запятую)',libNode('input'));tags.value=(r?.tags||[]).map(t=>'#'+t).join(' ');tags.maxLength=900;const suggestions=libNode('div',null,'gallery-tags');for(const [t,n] of galCounts().slice(0,30))suggestions.append(galButton('#'+t+' · '+n,()=>{tags.value=galTags(tags.value+' '+t).map(x=>'#'+x).join(' ');}));f.append(suggestions);const submit=libNode('button',r?'Сохранить':'Опубликовать','primary-button');submit.type='submit';f.append(submit);f.addEventListener('submit',async e=>{e.preventDefault();if(galBusy)return;galBusy=true;submit.disabled=true;try{const uid=currentSession.user.id;const raw=url.value.trim(),v=galSafeUrl(raw);if((raw&&!v)||(!r&&!v))throw Error('Укажите действительную HTTPS-ссылку');const payload={title:title.value.trim(),description:desc.value.trim(),tags:galTags(tags.value)};if(v)payload.image_url=v;if(r){const {error}=await supabaseClient.from('guild_gallery').update(payload).eq('id',r.id);if(error)throw error;}else{const {error}=await supabaseClient.from('guild_gallery').insert({...payload,author_id:uid});if(error)throw error;}d.close();await galLoad();}catch(e){showToast('Ошибка: '+e.message);}finally{galBusy=false;submit.disabled=false;}});}
galEl('galleryOpen').addEventListener('click',()=>{galRows=[];galAuthors.clear();galAuthorOptions();galUrls.clear();galSelected.clear();galEl('gallerySearch').value='';libShow('gallery');galRender();galLoad();});galEl('galleryBack').addEventListener('click',()=>{++galSeq;libHome();});galEl('galleryAdd').addEventListener('click',()=>galEdit());galEl('gallerySearch').addEventListener('input',galRender);galEl('galleryAuthor').addEventListener('change',galRender);
for(const [label,pre,post] of [['Жирный','**','**'],['Заголовок','## ',''],['Список','- ',''],['Ссылка','[','](https://)']])libEl('libFormat').append(galButton(label,()=>{const t=libEl('libraryEditor').elements.namedItem('body');const a=t.selectionStart,b=t.selectionEnd;t.setRangeText(pre+(t.value.slice(a,b)||'текст')+post,a,b,'end');t.focus();}));

// Unified image uploads v2.8.5.2.1. Existing URL fields remain compatible.
const mediaBucket='brotherhood-media';
async function mediaUpload(file,avatar=false){
 const uid=currentSession?.user?.id;if(!uid)throw Error('Войдите в аккаунт.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>20*1024*1024)throw Error('Выберите JPG, PNG или WebP до 20 МБ.');
 const bmp=await createImageBitmap(file);let blob;
 try{const max=avatar?512:1920,target=avatar?80000:300000;let scale=Math.min(1,max/Math.max(bmp.width,bmp.height));const canvas=document.createElement('canvas');
 for(let i=0;i<8;i++){canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));canvas.getContext('2d').drawImage(bmp,0,0,canvas.width,canvas.height);blob=await new Promise(r=>canvas.toBlob(r,'image/webp',Math.max(.45,.8-i*.06)));if(blob?.type==='image/webp'&&blob.size<=target)break;scale*=.82;}
 if(!blob||blob.type!=='image/webp'||blob.size>target)throw Error('Не удалось сжать изображение.');}finally{bmp.close();}
 if(currentSession?.user?.id!==uid)throw Error('Аккаунт изменился.');
 const path=uid+'/'+crypto.randomUUID()+'.webp';const bucket=supabaseClient.storage.from(mediaBucket);const {error}=await bucket.upload(path,blob,{contentType:'image/webp',upsert:false});if(error)throw error;return bucket.getPublicUrl(path).data.publicUrl;
}
function mediaField(form,name,avatar=false){
 const field=form.elements.namedItem(name);const wrap=document.createElement('div');wrap.className='media-upload';const preview=document.createElement('img');preview.alt='Текущее изображение';preview.hidden=true;const pick=document.createElement('input');pick.type='file';pick.accept='image/jpeg,image/png,image/webp';const status=document.createElement('small');const remove=galButton('Убрать изображение',()=>{field.value='';field.dispatchEvent(new Event('change'));sync();});const migrate=galButton('Перенести старое фото',()=>run(async()=>{const response=await fetch(field.value,{credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error('Ссылка недоступна');return await response.blob();}));wrap.append(preview,pick,remove,migrate,status);field.after(wrap);
 function sync(){const url=safePhoto(field.value);preview.hidden=!url;if(url&&preview.src!==url)preview.src=url;remove.hidden=!url;migrate.hidden=!url||url.includes('/storage/v1/object/public/'+mediaBucket+'/');}
 let busy=false;async function run(get){if(busy)return;busy=true;const buttons=[...form.querySelectorAll('button[type=submit]')].filter(b=>!b.disabled);buttons.forEach(b=>b.disabled=true);pick.disabled=remove.disabled=migrate.disabled=true;status.textContent='Загрузка…';try{const url=await mediaUpload(await get(),avatar);field.value=url;field.dispatchEvent(new Event('change'));status.textContent='Загружено. Сохраните форму.';sync();}catch(e){status.textContent='Ошибка: '+e.message+' — при необходимости выберите файл с устройства.';}finally{busy=false;pick.disabled=remove.disabled=migrate.disabled=false;buttons.forEach(b=>b.disabled=false);pick.value='';}}
 pick.addEventListener('change',()=>{const f=pick.files[0];if(f)run(async()=>f);});form.addEventListener('submit',e=>{if(busy){e.preventDefault();e.stopImmediatePropagation();}},true);new MutationObserver(sync).observe(field,{attributes:true,attributeFilter:['value']});new MutationObserver(sync).observe(form,{attributes:true,attributeFilter:['hidden']});form.addEventListener('reset',()=>queueMicrotask(sync));sync();
}
mediaField(profileForm,'character_photo_url',true);mediaField(chronEl('chronEditor'),'image_url');mediaField(awardEl('awardTypeForm'),'image_url');
function mediaInline(form,host){const t=form.elements.namedItem('body');const pick=document.createElement('input');pick.type='file';pick.accept='image/jpeg,image/png,image/webp';pick.hidden=true;const button=galButton('Загрузить изображение',()=>pick.click());host.append(button,pick);pick.addEventListener('change',async()=>{const file=pick.files[0];if(!file)return;const a=t.selectionStart,b=t.selectionEnd;button.disabled=true;const buttons=[...form.querySelectorAll('button[type=submit]')].filter(x=>!x.disabled);buttons.forEach(x=>x.disabled=true);try{const url=await mediaUpload(file);t.setRangeText('\n![Иллюстрация]('+url+')\n',a,b,'end');showToast('Изображение загружено. Сохраните запись.');}catch(e){showToast('Ошибка: '+e.message);}finally{button.disabled=false;buttons.forEach(x=>x.disabled=false);pick.value='';}});}
mediaInline(libEl('libraryEditor'),libEl('libFormat'));const chronBody=chronEl('chronEditor').elements.namedItem('body');const chronTools=document.createElement('div');chronBody.after(chronTools);mediaInline(chronEl('chronEditor'),chronTools);
