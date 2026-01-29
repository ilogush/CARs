# Project Overview

> **Обзор проекта**: Система управления автопрокатом с многоуровневой архитектурой, ролевой моделью доступа и оптимизированной производительностью базы данных.

## 🛠 Technology Stack

> **Технологический стек**: Современные технологии для высокопроизводительного веб-приложения

- **Frontend:** Next.js 16.1.1, React 19.2.3, TypeScript 5
  - *Пользовательский интерфейс на современном React с серверными компонентами*
- **Styling:** TailwindCSS 4.1.18
  - *Utility-first CSS фреймворк для быстрой разработки интерфейса*
- **Forms:** React Hook Form 7.71 + Zod 4.3.5 validation
  - *Управление формами с типобезопасной валидацией схем данных*
- **Backend:** Next.js API Routes + Server Actions
  - *Серверная логика с маршрутизацией и серверными действиями*
- **Database:** Supabase (PostgreSQL) with 45+ performance indexes
  - *База данных PostgreSQL с 45+ стратегическими индексами для оптимизации запросов*
- **Storage:** Supabase Storage (buckets: `avatars`, `company-logos`, `car-photos`, `car-documents`, `general-images`)
  - *Файловое хранилище для изображений и документов с разделением по типам*
- **Auth:** Supabase Auth (@supabase/ssr 0.8.0)
  - *Аутентификация с поддержкой server-side rendering*
- **Data Fetching:** SWR 2.3.8 for client-side caching
  - *Кеширование данных на стороне клиента с автоматической ревалидацией*
- **Testing:** Vitest 4.0.17, Playwright 1.57.0
  - *Юнит-тесты (Vitest) и E2E-тесты (Playwright) для полного покрытия*
- **Date Handling:** date-fns 4.1.0
  - *Работа с датами и временем*
- **Icons:** Heroicons 2.2.0 (outline version only)
  - *Иконки в едином стиле (только outline версия для консистентности)*

## 🏗 Architecture Layers

> **Слои архитектуры**: Четкое разделение ответственности между уровнями приложения

### Code Organization (as per .cursorrules)

> **Организация кода**: Структура проекта следует принципам чистой архитектуры

```
types/
├── database.types.ts      # Auto-generated Supabase types (автогенерируемые типы БД)
├── api.ts                 # API response types (типы ответов API)
├── cars.ts                # Domain interfaces (доменные интерфейсы)
├── clients.ts
├── contracts.ts
└── locations.ts

lib/
├── validations/           # Zod schemas (единственный источник правды для валидации)
│   ├── car-validations.ts
│   ├── client-validations.ts
│   └── contract-validations.ts
├── repositories/          # Data Access Layer - read-only (слой доступа к данным)
│   ├── base.ts           # Base repository with pagination (базовый репозиторий с пагинацией)
│   ├── cars.ts           # Methods: getCar, listCars, countCars
│   ├── contracts.ts
│   ├── locations.ts
│   └── index.ts
├── api/                   # Client-side fetch wrappers (обертки для запросов с клиента)
│   ├── performance.ts    # Cache utilities, monitoring (утилиты кеширования и мониторинг)
│   ├── cars.ts
│   └── contracts.ts
├── error-handler.ts       # Unified error transformation (единая трансформация ошибок)
├── cache-utils.ts         # React cache utilities (утилиты React кеша)
├── cache-tags.ts          # Cache tag constants (константы тегов кеша)
├── rbac-middleware.ts     # Role-based access control (контроль доступа на основе ролей)
└── audit-middleware.ts    # Audit logging (логирование аудита)

app/
├── api/                   # API Routes with caching (маршруты API с кешированием)
│   ├── cars/route.ts     # Optimized with createCachedResponse
│   ├── contracts/route.ts
│   └── locations/route.ts
├── (dashboard)/          # Protected admin area (защищенная админ-панель)
└── (public)/             # Public pages (публичные страницы)

supabase/migrations/      # Database migrations - versioned (миграции БД с версионированием)
├── 20260127000001_performance_rpcs.sql
├── 20260127000002_performance_indexes.sql
└── 20260128000000_performance_indexes_extended.sql
```

## ⚡ Performance Optimizations

> **Оптимизация производительности**: Многоуровневая стратегия для достижения максимальной скорости работы

### Database Performance

> **Производительность базы данных**: Стратегические индексы и RPC функции для ускорения запросов в 10-50 раз

- **45+ Strategic Indexes**: Covering contracts, payments, users, bookings, tasks
  - *45+ стратегических индексов покрывают ключевые таблицы для быстрого поиска*
- **RPC Functions**: `get_admin_dashboard_stats()`, `get_company_dashboard_stats()`
  - *Хранимые процедуры для атомарных операций и агрегации данных*
- **Query Optimization**: Using `count: 'estimated'` instead of `'exact'` (10x faster)
  - *Приблизительный подсчет вместо точного для ускорения в 10 раз*
- **Result:** 10-50x faster database queries
  - *Результат: запросы к БД быстрее в 10-50 раз*

### API Response Caching

> **Кеширование ответов API**: Интеллектуальное кеширование с разными TTL для разных типов данных

- **Cache Headers**: Implemented via `lib/api/performance.ts`
  - *Заголовки кеша реализованы через утилиты производительности*
  - Reference data: 1 hour cache (*справочные данные: кеш 1 час*)
  - Dynamic data: 1 minute cache (*динамические данные: кеш 1 минута*)
  - User-specific: 30 second cache (*пользовательские данные: кеш 30 секунд*)
- **Performance Monitoring**: Automatic logging for slow queries (>500ms)
  - *Автоматическое логирование медленных запросов для мониторинга*
- **Result:** 10x faster API responses
  - *Результат: ответы API быстрее в 10 раз*

### Next.js Configuration

> **Конфигурация Next.js**: Оптимизация сборки, изображений и импортов

- Image optimization with 7-day cache
  - *Оптимизация изображений с кешированием на 7 дней*
- Package import optimization (@heroicons/react, @headlessui/react)
  - *Оптимизация импортов пакетов для уменьшения размера бандла*
- Compression enabled
  - *Включено сжатие ответов сервера*
- Standalone output for smaller Docker images
  - *Standalone режим для меньшего размера Docker образов*

### SEO Optimization

> **SEO оптимизация**: Правильная индексация поисковыми системами

- `app/robots.ts`: Search engine crawling rules
  - *Правила для поисковых роботов*
- `app/sitemap.ts`: Dynamic sitemap generation
  - *Динамическая генерация карты сайта*
- Proper metadata and Open Graph tags
  - *Корректные метаданные и Open Graph теги для социальных сетей*

## 🔒 Security & Data Integrity

> **Безопасность и целостность данных**: Многоуровневая защита с RBAC, аудитом и строгими правилами целостности

### Access Control Model (RBAC + Scopes)

> **Модель контроля доступа**: Гибридная система роли + область видимости

Hybrid model using `role + scope`:
*Гибридная модель использует роль (role) + область видимости (scope) для точного контроля доступа*

- **Admin**: `scope = system` - Full system access. Can "enter" any company context.
  - *Администратор: полный доступ к системе, может войти в контекст любой компании*
- **Owner**: `scope = company_id` - Access limited to own company.
  - *Владелец: доступ ограничен собственной компанией*
- **Manager**: `scope = company_id` - Restricted access within company.
  - *Менеджер: ограниченный доступ в рамках компании*
- **Client**: `scope = self` - Access to own bookings and profile.
  - *Клиент: доступ только к своим бронированиям и профилю*

Implementation: `lib/rbac-middleware.ts` + `lib/auth.ts`
*Реализация через middleware и утилиты аутентификации*

### Data Integrity Rules (from .cursorrules)

> **Правила целостности данных**: Строгие требования для предотвращения потери и повреждения данных

1. **Atomic Writes**: Multi-table operations MUST use Supabase RPC (SQL functions)
   - *Атомарные записи: операции с несколькими таблицами ДОЛЖНЫ использовать RPC функции*
   - ❌ **Forbidden**: Sequential `await` chains in Server Actions/Routes
     - *Запрещено: последовательные цепочки await (риск потери данных при ошибке)*
   - ✅ **Required**: RPC functions with transactions
     - *Обязательно: RPC функции с транзакциями для атомарности*

2. **Soft Delete Only**: Physical deletion (`DELETE`) is forbidden
   - *Только мягкое удаление: физическое удаление DELETE запрещено*
   - All tables have `deleted_at` field
     - *Все таблицы имеют поле deleted_at для мягкого удаления*
   - Use `.is('deleted_at', null)` in queries
     - *Используйте фильтр .is('deleted_at', null) во всех запросах*

3. **No Client-Side Data Fetching**: Prohibited in Client Components
   - *Запрет на загрузку данных в клиентских компонентах*
   - Pass data via props from Server Components
     - *Передавайте данные через props из серверных компонентов*
   - Use repositories for server-side reads
     - *Используйте репозитории для чтения на сервере*

4. **Rate Limiting**: Mandatory for all mutation endpoints
   - *Rate limiting обязателен для всех endpoints изменения данных*

5. **Pagination**: Hard limit (max 50-100) on all list queries
   - *Пагинация: жесткий лимит (макс 50-100) на все списочные запросы*
   - NEVER query `all` records without limit
     - *НИКОГДА не запрашивайте все записи без лимита*

### Audit Logging

> **Аудит-логирование**: Полная история всех изменений данных для безопасности

All state-changing operations logged to `audit_logs` table:
*Все операции изменения состояния логируются в таблицу audit_logs*

- Fields: `user_id`, `action_type`, `table_name`, `record_id`, `before_state`, `after_state` (JSONB)
  - *Поля: ID пользователя, тип действия, таблица, ID записи, состояние до/после в JSONB*
- Implementation: `lib/audit-middleware.ts`
  - *Реализация через middleware для автоматического логирования*
- Automatic via middleware on critical routes
  - *Автоматически работает на критичных маршрутах*

### Optimistic Locking

> **Оптимистическая блокировка**: Предотвращение потерянных обновлений в конкурентных сценариях

- RPC functions check `updated_at` or `version` field
  - *RPC функции проверяют поле updated_at или version перед записью*
- Prevents lost updates in concurrent scenarios
  - *Предотвращает потерю обновлений при одновременном редактировании*

### Data Normalization (Zod)

> **Нормализация данных**: Автоматическая очистка и форматирование входных данных

- `z.preprocess()` and `.transform()` for data cleaning
  - *Препроцессинг и трансформация для очистки данных*
- String trimming, email lowercase, phone mask removal
  - *Обрезка пробелов, приведение email к нижнему регистру, удаление масок телефонов*
- Implementation: `lib/validations/*.ts`
  - *Реализовано в Zod схемах валидации*

## 👥 User Roles & Capabilities

> **Роли пользователей и возможности**: Четырехуровневая иерархия с четким разделением прав доступа

### 🔑 Admin (System Administrator)

> **Администратор системы**: Оператор платформы с полным доступом

*Platform operator - оператор всей платформы*

- Manages global reference data (Locations, Brands, Models, Colors, Currencies)
  - *Управляет глобальными справочниками: локации, бренды, модели, цвета, валюты*
- Creates car templates (`car_templates`)
  - *Создает шаблоны автомобилей для использования владельцами компаний*
- Full CRUD access to all companies, users, contracts
  - *Полный CRUD доступ ко всем компаниям, пользователям, контрактам*
- Manages payment types and statuses
  - *Управляет типами и статусами платежей*
- Can enter any company context (admin mode)
  - *Может войти в контекст любой компании через admin mode*
- Access: `/dashboard/admin/*` routes
  - *Доступ: специальные маршруты администратора*

### 👑 Owner (Business Owner)

> **Владелец бизнеса**: Владелец компании по аренде автомобилей

*Rental business proprietor - собственник арендного бизнеса*

- **Rule:** 1 Owner = 1 Company
  - *Правило: один владелец = одна компания*
- Creates company (linked to 1 location)
  - *Создает компанию, привязанную к одной локации*
- Builds fleet from Admin's templates (adds VIN, license plate, pricing)
  - *Формирует автопарк из шаблонов админа (добавляет VIN, госномер, цены)*
- Hires managers
  - *Нанимает менеджеров для управления операциями*
- Views full financial reports for own company
  - *Просматривает полные финансовые отчеты своей компании*
- Cannot edit system-wide reference data
  - *Не может редактировать системные справочники*
- Access: `/dashboard/companies/*`, `/dashboard/cars/*`
  - *Доступ: управление компанией и автопарком*

### 🧑‍💼 Manager (Company Employee)

> **Менеджер компании**: Сотрудник, выполняющий повседневные операции

*Day-to-day operations staff - персонал для ежедневных операций*

- Processes bookings and creates contracts
  - *Обрабатывает бронирования и создает контракты*
- Accepts payments
  - *Принимает платежи от клиентов*
- Registers clients
  - *Регистрирует новых клиентов в системе*
- **Restrictions:** Cannot edit payments, cannot view closed contracts
  - *Ограничения: не может редактировать платежи, не видит закрытые контракты*
- Access: Limited to own company data
  - *Доступ: ограничен данными своей компании*

### 🚗 Client (End User)

> **Клиент**: Конечный пользователь, арендующий автомобили

*Customer - клиент сервиса аренды*

- Books vehicles
  - *Бронирует автомобили через публичный интерфейс*
- Views rental history
  - *Просматривает историю своих аренд*
- Updates profile
  - *Обновляет свой профиль и контактные данные*
- Access: `/client/*` routes
  - *Доступ: личный кабинет клиента*

## 🗄 Key Database Entities

> **Ключевые сущности базы данных**: Нормализованная структура с индексами для производительности

### Core Tables

> **Основные таблицы**: Ядро системы с оптимизированными индексами

- **companies**: Business entity (1:1 with location)
  - *Компании: бизнес-сущность (связь 1:1 с локацией)*
  - Fields: `id`, `name`, `owner_id`, `location_id`, `district_id`, `deleted_at`
    - *Поля: ID, название, ID владельца, ID локации, ID района, дата удаления*
  - Indexes: `idx_companies_owner_id`, `idx_companies_location_id`
    - *Индексы для быстрого поиска по владельцу и локации*

- **car_templates** (Admin-managed): Base vehicle model
  - *Шаблоны автомобилей (управляются админом): базовая модель транспортного средства*
  - Example: Toyota Camry 2022, specifications
    - *Пример: Toyota Camry 2022 со спецификациями*
  - Indexes: `idx_car_templates_brand_model`
    - *Индекс для поиска по бренду и модели*

- **company_cars** (Owner-managed): Actual fleet vehicle
  - *Автомобили компании (управляются владельцем): реальный автомобиль в автопарке*
  - Links to `car_templates` + adds VIN, license plate, pricing
    - *Ссылка на шаблон + добавляет VIN, госномер, цены*
  - Status: `available`, `rented`, `maintenance`, `out_of_service`
    - *Статусы: доступен, в аренде, на обслуживании, выведен из эксплуатации*
  - Indexes: `idx_company_cars_company_status`, `idx_company_cars_status`, `idx_company_cars_license_plate`
    - *Индексы для поиска по компании/статусу, статусу, госномеру*

- **contracts**: Rental agreement
  - *Контракты: договор аренды между компанией и клиентом*
  - Links: `client_id`, `company_car_id`, `manager_id`
    - *Связи: ID клиента, ID автомобиля, ID менеджера*
  - Status workflow: `draft` → `active` → `completed` / `cancelled`
    - *Статусный воркфлоу: черновик → активный → завершен / отменен*
  - Indexes: `idx_contracts_dates`, `idx_contracts_client_status`, `idx_contracts_company_car_status`
    - *Индексы для поиска по датам, клиенту/статусу, автомобилю/статусу*

- **payments**: Financial transactions
  - *Платежи: финансовые транзакции, связанные с контрактами*
  - Links to `contracts`
    - *Привязаны к контрактам*
  - Types: deposit, rental_fee, fine, additional_service
    - *Типы: залог, арендная плата, штраф, доп. услуги*
  - Indexes: `idx_payments_contract_created`, `idx_payments_amount`, `idx_payments_status`
    - *Индексы для поиска по контракту/дате, сумме, статусу*

- **audit_logs**: Security journal
  - *Журнал аудита: журнал безопасности со всеми изменениями*
  - Full state tracking: `before_state`, `after_state` (JSONB)
    - *Полное отслеживание состояния: до и после изменения в JSONB*
  - Indexes: `idx_audit_logs_created_at`, `idx_audit_logs_entity_lookup`
    - *Индексы для поиска по дате и по сущности*

- **bookings**: Reservation system
  - *Бронирования: система предварительных резерваций*
  - Status: `pending`, `confirmed`, `cancelled`
    - *Статусы: в ожидании, подтверждено, отменено*
  - Indexes: `idx_bookings_company_car_status`, `idx_bookings_created_desc`
    - *Индексы для поиска по автомобилю/статусу, по дате создания*

- **tasks**: Internal workflow management
  - *Задачи: внутренняя система управления рабочими процессами*
  - Indexes: `idx_tasks_status_due`, `idx_tasks_assigned_to`
    - *Индексы для поиска по статусу/сроку, по исполнителю*

## 📜 Contract Workflow

### 1. Contract Creation (Start)
- **Car Status:** Changes to `rented` **immediately** upon contract creation (vehicle locked)
- **Activation:** Contract requires deposit or first payment to move to `active` status
- **Implementation:** RPC function ensures atomic operation

### 2. Contract Closure (Close)
- **Action:** Manual, via "Close Contract" button
- **Car Status:** Returns to `available` immediately after closure
- **Financials:**
  - Total Amount is **fixed** at creation (no automatic recalculation)
  - Close modal allows entry of additional charges (fines, cleaning, excess mileage)
  - Additional payment types configured by company owner
  - Filled fields automatically create `payments` records linked to contract
- **Implementation:** Must use RPC to ensure atomicity (car status + payments)

## 🚀 Feature Roadmap

### 1. Vehicle Maintenance
- **Logic:** System tracks vehicle mileage
- **Alert:** Mileage highlighted **red** if <1000km until oil change
- **Action:** "Oil Change" function resets `next_oil_change_mileage` counter
- **Status:** Car can be marked as `maintenance` to block from bookings

### 2. Logistics & Districts
- **Districts:** Owner creates delivery zone list
- **Pricing:** Each district has delivery/return cost
- **Activation:** Owner selects active districts
- **Calculation:** Delivery cost added to contract total
- **Implementation:** `districts` table linked to `locations`

### 3. Seasonality Pricing
- **Types:** Peak, High, Low season
- **Configuration:** Owner sets season start/end dates
- **Pricing:** Calendar and contract prices vary by current season
- **Implementation:** `location_seasons` table, pricing logic in contract creation

### 4. Calendar View (Timeline)
- **Display:** Gantt-style timeline of all vehicles and bookings
- **Indication:** Color-coded status visualization
- **Route:** `/dashboard/calendar`
- **Implementation:** React + date-fns, status-based styling

### 5. Platform Features
- **Public Site:** Available at `/(public)/*` routes
- **Mobile-First:** Critical for managers (check-in/check-out at vehicle)
- **Responsive:** Tailwind breakpoints optimized for mobile workflow

## 🧪 Testing Strategy

### Unit Tests (Vitest)
- Location: `*.test.ts` files
- Coverage: Utilities, validation schemas
- Run: `npm test`

### E2E Tests (Playwright)
- Location: `tests/e2e/*.spec.ts`
- Coverage: Critical user flows (login, contract creation)
- Run: `npm run test:e2e`

### Database Tests (pgTAP)
- Critical RPC functions tested via SQL unit tests
- Location: `supabase/tests/*.sql`

## 🎨 UI/UX Standards (from .cursorrules)

### Form Layout
- **Grid:** All forms use **4 columns** (`grid-cols-4`)
- **Consistency:** Input fields and info blocks aligned

### Button Behavior
- **Disabled State:** Button locks immediately on click
- **Loading Indicator:** Spinner shown during async operations
- **Component:** Use `@/components/ui/Button.tsx`

### Empty States
- **Required:** All lists/tables must have empty state
- **Content:** Heroicons icon + clear text + CTA button
- **Example:** "No cars yet. Add your first vehicle"

### Icons
- **Library:** Heroicons **outline version only**
- **Forbidden:** Do not mix with other icon libraries

## 📝 Code Standards

### File Size
- **Max:** ~500 lines per file
- **Action:** Refactor if exceeded

### Cleanup Rules
- **Forbidden in production:**
  - Commented code
  - `console.log()` / `console.error()`
  - Temporary files
- **Action:** Remove before task completion

### Naming Conventions
- **API/Database:** English only
- **Variables:** camelCase
- **Components:** PascalCase
- **Files:** kebab-case or PascalCase (components)

### Error Handling
- **Unified:** All errors through `lib/error-handler.ts`
- **User-Facing:** Transform DB codes (23505) to readable English
- **Format:** `{ error: string, details?: any }`

## 🔄 Development Workflow

### Database Changes
1. Create migration file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Test locally: `npm run db:migrate`
3. Apply to production via Supabase CLI

### API Development
1. Define types in `types/*.ts`
2. Create Zod schema in `lib/validations/*.ts`
3. Implement repository (read) in `lib/repositories/*.ts`
4. Create API route in `app/api/*/route.ts`
5. Add client wrapper in `lib/api/*.ts`
6. Use `createCachedResponse()` for performance

### Component Development
1. Server Component by default
2. Use Client Component only when needed ('use client')
3. Fetch data in Server Component, pass via props
4. Use `@/components/ui/DataTable.tsx` for lists

## 📚 Key Documentation

- **Performance:** `/docs/PERFORMANCE-SUMMARY.md`
- **Implementation Guide:** `/docs/performance-implementation-guide.md`
- **API Templates:** `/docs/api-optimization-template.md`
- **Admin UI:** `/docs/admin-ui-components.md`
