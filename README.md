# Братство Святого Иосифа — v2.2.1

Добавлена предоставленная пользователем карта Куттенберга (2048 × 1706) как `map-kuttenberg.jpg`. Исправлено соотношение сторон карты, чтобы метки и маршруты совпадали с изображением при масштабировании.

## Установка
Загрузите в корень репозитория файлы `index.html`, `app.js`, `styles.css`, `map-kuttenberg.jpg` из архива. Другие файлы оставьте без изменений. SQL не требуется.

Карта Троски пока без изображения. При замене картографического изображения в будущем важно сохранять одинаковую географическую привязку точек.


## v2.2.2
Колесо мыши масштабирует карту в точке курсора; максимальный зум 8×. Метки уменьшены и снабжены значками категорий, линии маршрутов тоньше. SQL не требуется.


v2.2.3: smaller map markers; route stroke unchanged; adaptive layout for browser zoom and narrow screens. No SQL required.


v2.2.4: исправлен зум колесом и кнопками (до 10×), CSS больше не ограничивает ширину увеличенной карты; карта автоматически пересчитывает размеры при изменении ширины окна; панель слоёв переносится вниз при недостатке места. Маршруты и данные Supabase не изменены. SQL не требуется.

## v2.7.1
Personal cabinet: charter, profile editing, skill levels, personal guild activity. Existing database schema retained.

## v2.7.2
Новая главная: объявления библиотеки, показатели, личные дела, календарь, летопись, счётчики заявок для совета. SQL не требуется. Летопись показывает существующие записи, не создаёт автоматически новые.

### v2.7.2.1
Главная сокращена до доски объявлений включительно; удалены лишние запросы. SQL не требуется.

## v2.7.3
Компактный реестр: карточки, список, фильтры по званию и ремеслу, шкалы навыков в анкете. SQL не требуется. Административные права и существующие награды сохранены.

## v2.7.4 — Канцелярия совета
Вкладки участников, заявок, званий и наград; поиск и раскрываемые настройки, подтверждение решений. Звания фиксированы существующей схемой; описания и награды открываются в соответствующих разделах Ратуши. Права администратора не изменяются. Новых SQL-миграций нет.

## v2.7.5
Казна: вкладки, фильтр журнала, отдельная операция казначея. SQL не требуется.

## v2.7.6
Квадратный инвентарь, изображения из ремесленного каталога, общая заявка через существующий RPC v2.5.8. Новых SQL-миграций нет.

## v2.7.6.3
Перед загрузкой сайта выполните storage_unified_v2_7_6_3.sql в Supabase SQL Editor. Единый инвентарь для выдачи, пополнения и учёта кладовщика.

### v2.7.6.4
Исправлены поиск иконок, резервный значок ресурса и сетка инвентаря. Названия не обрезаются. SQL не требуется.

## v2.7.7
Run storage_products_v2_7_7.sql in Supabase before deployment. Existing rows and balances are preserved; matching material rows are also visible in products.

## v2.7.7.1
Market screenshot material icons. No new SQL migration required.

## v2.8.0
Visual-only theme layer in theme/global.css; local oak and parchment textures. No SQL migration.


## v2.8.1
Scoped visual refinements for home, profile, members, management and treasury. No JS or database changes. Upload all files; hard refresh. Existing award functionality remains in member details; no new profile award integration.

## v2.8.2
Run market_v2_8_2.sql before deployment. Market price ranges are integer groschen per unit. Existing multi-item RPCs required.

### v2.8.2.1
Compact market board and editor. No new SQL migration.
