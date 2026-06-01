# Школа №46

Современная школьная платформа на Next.js: новости, расписание, мероприятия, акции, рейтинг классов, заявки на конкурсы, PRo46, Навигаторы детства, ЦДИ, персональные настройки и админ-панель с mock-ролями.

## Запуск

```bash
npm install
npm run dev
```

После запуска:

- главная страница: `http://localhost:3000`
- админ-панель: `http://localhost:3000/admin`
- пароль демо-админки: `school46`

## Разделы

- `/news` и `/news/archive`
- `/schedule`
- `/bells`
- `/rating`
- `/events`
- `/pro46`
- `/navigators`
- `/cdi`

Заявки не являются отдельным главным публичным разделом: пользователь открывает конкретное событие, конкурс или акцию в `/events` и подает заявку внутри этой страницы.

## Данные

Сейчас проект работает на mock-данных из `lib/mock-data.ts`. Серверные API уже отделены от клиента:

- `/api/news`
- `/api/events`
- `/api/actions`
- `/api/applications`
- `/api/rating`
- `/api/schedule`
- `/api/bells`
- `/api/preferences`

Подключение Google Sheets предусмотрено в `lib/sheets.ts`, `lib/sheets-config.ts` и `.env.example`.

### Как подключить Google Sheets

1. Создать сервисный аккаунт Google Cloud.
2. Скачать JSON-ключ.
3. Добавить переменные окружения из `.env.example`.
4. Открыть сервисному аккаунту доступ к нужным таблицам.
5. Запустить `npm run dev`.

Для публичных таблиц проект пробует читать CSV через серверные API. Если таблица недоступна, структура не распознана или ключи не добавлены, API возвращает mock-данные, а сайт продолжает работать в демо-режиме.

Используемые источники:

- расписание: `1uEvu2RU9JT67n4erJu6U0F2sS2MxZGeh1QmTd8qfZ-Q`, лист `Изменения`
- рейтинг: `1Szn0mOGV9lnZO7ODrZftiBVEnUYHxcAii408GXuwnqI`
- события: `1lSH-KBbhocfYSadrJUQUyJvo2Xlf7aj72VXsv1WYiL0`

## Роли

В админке есть переключатель mock-ролей:

- `admin`
- `news_editor`
- `event_manager`
- `class_teacher`
- `viewer`
