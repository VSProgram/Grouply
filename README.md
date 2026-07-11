# Grouply

🚀 **AI-помощник для учебной группы** — веб-платформа, которая превращает учебные материалы в интерактивный ресурс с поддержкой вопросов-ответов на основе искусственного интеллекта.

## О проекте

**Grouply** — это веб-приложение для студенческих учебных групп, которое объединяет:

- 📚 **Материалы** — загрузка, индексирование и скачивание файлов с тегами
- 📖 **Предметы** — иерархия Предмет → Лекции/Практические/Общие → Занятие с заметками и файлами
- 🤖 **AI-ассистент** — ответы на вопросы по материалам с указанием источников (RAG), поиск по всей группе или конкретному файлу
- 📅 **Расписание** — просмотр и управление занятиями по дням недели
- 📢 **Объявления** — создание, поиск и управление объявлениями с тегами
- 👥 **Профили участников** — просмотр информации о членах группы
- 🔐 **Система ролей** — студент, заместитель, староста, преподаватель

Платформа помогает студентам быстро находить нужную информацию в учебных материалах и повышает организованность работы учебной группы.

## Screenshots

<img width="2157" height="1204" alt="image" src="https://github.com/user-attachments/assets/8fa5cb88-d972-49aa-94ff-ed7ad86a3886" />


<img width="2158" height="1209" alt="image" src="https://github.com/user-attachments/assets/89543773-5183-4b61-bae6-45f0df0cde26" />


<img width="2155" height="1209" alt="image" src="https://github.com/user-attachments/assets/c8559e46-0396-4604-90b6-01684818ca58" />


<img width="2152" height="1204" alt="image" src="https://github.com/user-attachments/assets/6c455076-5111-49ab-a890-b985c9891686" />


<img width="2152" height="1201" alt="image" src="https://github.com/user-attachments/assets/03a6bb45-d834-476e-b68e-7b41518d936c" />


<img width="2149" height="1201" alt="image" src="https://github.com/user-attachments/assets/63bd4988-0e4b-45ad-887f-ffcbf58d4ce8" />


<img width="2157" height="1204" alt="image" src="https://github.com/user-attachments/assets/69f49609-b6d9-4d3d-bbe6-70e86419b995" />


<img width="2158" height="1207" alt="image" src="https://github.com/user-attachments/assets/6437db5f-d4b7-4807-8e4e-03904588d41f" />


<img width="2155" height="1203" alt="image" src="https://github.com/user-attachments/assets/5d8bec4a-6014-45eb-b695-e9651fd5c6b5" />

## Технологический стек

### Backend
- **Python 3.9+** — основной язык
- **FastAPI** — веб-фреймворк
- **SQLAlchemy** — ORM для работы с БД
- **SQLite** — база данных
- **ChromaDB** — векторная база данных для RAG
- **Claude Haiku** — LLM для AI-ассистента
- **python-jose** + **passlib/bcrypt** — аутентификация и JWT

### Frontend
- **React 18** — библиотека UI
- **Vite** — быстрый bundler
- **Tailwind CSS** — утилит-фреймворк для стилей
- **React Router** — маршрутизация

## Реализованные функции

### 🔐 Аутентификация и профили
- ✅ Регистрация с ФИО, email и пароль
- ✅ Вход по email/пароль
- ✅ Редактирование профиля (Telegram, телефон)
- ✅ JWT-токены для безопасной аутентификации

### 👥 Управление группами
- ✅ Создание учебной группы
- ✅ Вступление по инвайт-коду
- ✅ Система ролей: студент, заместитель, староста, преподаватель
- ✅ Назначение ролей старостой/заместителем во вкладке «Участники»
- ✅ Просмотр профилей участников группы

### 📚 Материалы
- ✅ Загрузка PDF и TXT файлов
- ✅ Автоматическая индексация в ChromaDB
- ✅ Статусы индексации: Проиндексирован / Пустой / Обрабатывается
- ✅ Скачивание файлов
- ✅ Теги через запятую (#математика, #лекция)
- ✅ Поиск по названию и тегам
- ✅ Удаление файлов (автор или управляющая роль)

### 📖 Предметы
- ✅ Создание предметов с семестром (строковое поле: "Осень 2025")
- ✅ Фильтрация по семестру
- ✅ Три раздела внутри предмета: Лекции / Практические / Общие
- ✅ Занятия с номером, датой, заголовком и текстовыми заметками
- ✅ Прикрепление файлов любого типа к занятию (включая CSV, изображения)
- ✅ Скачивание вложений занятий
- ✅ Права: создавать могут все, редактировать/удалять — deputy/starosta/teacher

### 🤖 AI-ассистент
- ✅ Вопросы по материалам группы с ответом и ссылкой на источник
- ✅ RAG-пайплайн: ChromaDB + Claude Haiku
- ✅ Поиск по конкретному файлу — выпадающий список над полем вопроса
- ✅ В списке объединены файлы из «Материалов» и вложения из «Предметов»

### 📢 Объявления
- ✅ Создание объявлений с заголовком и текстом
- ✅ Система тегов (#формат)
- ✅ Поиск по заголовку, тексту и тегам
- ✅ Редактирование объявлений (только для автора или управляющей роли)
- ✅ Удаление объявлений с подтверждением

### 📅 Расписание
- ✅ Просмотр расписания по дням недели
- ✅ Добавление занятий (предмет, преподаватель, время, аудитория)
- ✅ Удаление занятий

## Как запустить локально

### Предварительные требования
- Python 3.9+
- Node.js 16+
- pip, npm

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Создайте файл `.env` в папке `backend/`:

```env
SECRET_KEY=your-secret-key-here
GENAPI_API_KEY=your-api-key-here
```

Запустите сервер:

```bash
uvicorn main:app --reload
```

API будет доступен на `http://localhost:8000`
Документация Swagger: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Приложение будет доступно на `http://127.0.0.1:5173`

> ⚠️ Открывать строго `http://127.0.0.1:5173`, **не** `localhost:5173` — Node 18+ слушает только IPv6 для `localhost`, что ломает запросы к бэкенду.

## Переменные окружения

### backend/.env

```env
# Секретный ключ для подписи JWT токенов
SECRET_KEY=your-super-secret-key-change-in-production

# API ключ для LLM (Claude Haiku через совместимый с OpenAI эндпоинт)
GENAPI_API_KEY=your-api-key-here
```

## Архитектура API

### Основные эндпоинты

**Аутентификация:**
- `POST /auth/register` — регистрация
- `POST /auth/login` — вход
- `GET /auth/me` — текущий пользователь
- `PATCH /auth/profile` — редактирование профиля

**Группы:**
- `GET /groups/my` — список групп пользователя
- `POST /groups/` — создание группы
- `POST /groups/join` — вступление в группу
- `GET /groups/{group_id}/members/{user_id}` — профиль участника
- `PATCH /groups/{group_id}/members/{user_id}/role` — назначение роли

**Материалы:**
- `POST /files/upload/{group_id}` — загрузка файла
- `GET /files/{group_id}` — список файлов группы
- `GET /files/{file_id}/download` — скачивание файла
- `PATCH /files/{file_id}` — редактирование тегов
- `DELETE /files/{file_id}` — удаление файла

**AI-ассистент:**
- `POST /ai/ask/{group_id}` — вопрос по материалам (опциональный `file_id` для поиска по конкретному файлу)

**Предметы:**
- `POST /subjects/{group_id}` — создать предмет
- `GET /subjects/{group_id}` — список предметов (фильтр по `semester`)
- `DELETE /subjects/{subject_id}` — удалить предмет
- `GET /subjects/{group_id}/files` — все проиндексированные вложения занятий (для AI-дропдауна)

**Занятия:**
- `POST /lessons/{subject_id}` — создать занятие
- `GET /lessons/{subject_id}` — список занятий (фильтр по `type`)
- `PATCH /lessons/{lesson_id}` — обновить занятие
- `DELETE /lessons/{lesson_id}` — удалить занятие
- `POST /lessons/{lesson_id}/files` — прикрепить файл
- `GET /lessons/{lesson_id}/files` — список файлов занятия
- `GET /lessons/{lesson_id}/files/{file_id}/download` — скачать файл
- `DELETE /lessons/{lesson_id}/files/{file_id}` — удалить файл

**Объявления:**
- `GET /announcements/{group_id}` — список (с поддержкой `search`)
- `POST /announcements/{group_id}` — создание
- `PATCH /announcements/{announcement_id}` — редактирование
- `DELETE /announcements/{announcement_id}` — удаление

**Расписание:**
- `GET /schedule/{group_id}` — расписание группы
- `POST /schedule/{group_id}` — добавление занятия
- `DELETE /schedule/{group_id}/{item_id}` — удаление занятия

## Структура проекта

```
.
├── backend/
│   ├── models.py           # SQLAlchemy модели
│   ├── database.py         # Инициализация БД
│   ├── main.py             # FastAPI приложение
│   ├── permissions.py      # Матрица прав доступа по ролям
│   ├── routers/
│   │   ├── auth.py         # Аутентификация
│   │   ├── groups.py       # Группы и участники
│   │   ├── files.py        # Материалы
│   │   ├── ai.py           # AI-ассистент
│   │   ├── announcements.py# Объявления
│   │   ├── schedule.py     # Расписание
│   │   ├── subjects.py     # Предметы
│   │   └── lessons.py      # Занятия и вложения
│   ├── services/
│   │   └── rag.py          # RAG-пайплайн (ChromaDB + LLM)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api.js          # Клиент API с авто-JWT
│   │   ├── AuthContext.jsx
│   │   ├── App.jsx
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── GroupsPage.jsx
│   │       ├── GroupPage.jsx        # 6 вкладок
│   │       ├── ProfileModal.jsx
│   │       └── MemberProfileModal.jsx
│   └── index.html
└── README.md
```

## В планах

- 💬 **Групповой чат** — общение участников группы в реальном времени с прикреплением файлов и фрагментов AI-ответов
- 📊 **Аналитика** — статистика активности группы
- 🔔 **Уведомления** — оповещения о новых объявлениях и событиях
- 🌙 **Тёмная тема** — поддержка dark mode
- 🗂️ **Система семестров** — переключение между семестрами с раздельными данными

## Лицензия

MIT

## Контакты

По вопросам и предложениям пишите в issues или создавайте pull requests.
