# TranslateJTBDBook

Локальный проект для перевода книги и экспериментов с пайплайном “PDF → Markdown → перевод → reader → standalone HTML / Next.js site”.

## Быстрый старт с opendataloader-pdf

Требования:

- Python 3.10+
- Java 11+

Установка зависимости:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
```

Создать проект книги:

```bash
.venv/bin/python -m book_pipeline.init_project \
  --book-id wcakc \
  --title "When Coffee and Kale Compete" \
  --author "Alan Klement" \
  --pdf WCAKC.pdf \
  --translator-contact "@mark0vartem"
```

Извлечение PDF:

```bash
.venv/bin/python -m book_pipeline.extract_opendataloader --project-dir projects/wcakc
```

Проверить статус проекта:

```bash
.venv/bin/python -m book_pipeline.project_status projects/wcakc
```

Документ с принципами системы: [docs/SYSTEM_PRINCIPLES.md](docs/SYSTEM_PRINCIPLES.md).

Спецификация целевой структуры репозитория: [docs/REPOSITORY_SPEC.md](docs/REPOSITORY_SPEC.md).

## Публикация текущего перевода

### Next.js сайт для GitHub Pages

Требования:

- Node.js 22+
- npm

Локальный запуск:

```bash
npm install
npm run dev
```

Статическая сборка для GitHub Pages:

```bash
npm run pages:build
```

Готовый сайт появится в `out/`. При пуше в `main` workflow `.github/workflows/deploy-pages.yml` сам соберёт Next.js static export и опубликует его в GitHub Pages. Для project pages base path вычисляется автоматически из имени репозитория.

### Яндекс Метрика

По умолчанию используется счетчик `109588087`:

```bash
NEXT_PUBLIC_YANDEX_METRIKA_ID=109588087
```

Для GitHub Pages можно добавить ID счётчика в repository secret `YANDEX_METRIKA_ID`, если нужно переопределить значение. Workflow прокинет его в `NEXT_PUBLIC_YANDEX_METRIKA_ID` на этапе сборки.

Для автономного HTML `npm run build:single-html` берёт ID из `NEXT_PUBLIC_YANDEX_METRIKA_ID` или `YANDEX_METRIKA_ID`.

В код добавлены JavaScript-event goals:

- `search_used` — пользователь начал поиск.
- `read_50` — пользователь дочитал текущую главу до 50%.
- `read_100` — пользователь дочитал текущую главу до конца.
- `telegram_click` — клик по ссылке Telegram переводчика.

Эти цели нужно завести в интерфейсе Яндекс Метрики как цели типа `JavaScript-событие` с такими же идентификаторами.

Открытия глав не заведены как цели. Они отслеживаются как виртуальные просмотры страниц с URL вида `/?chapter=01_chapter.md`.

Пошаговый чек-лист для интерфейса Метрики: [docs/YANDEX_METRIKA_SETUP.md](docs/YANDEX_METRIKA_SETUP.md).

Перед первым запуском workflow включите Pages в GitHub:

1. Откройте `Settings → Pages`.
2. В блоке `Build and deployment` выберите `Source: GitHub Actions`.
3. Сохраните настройку и перезапустите workflow `Deploy Next site to Pages`.

Если workflow падает на `Get Pages site failed`, значит GitHub Pages ещё не включён для этого репозитория или выбран не источник `GitHub Actions`.

### Автономный HTML

Собрать автономный HTML-файл:

```bash
npm run build:single-html
```

Готовый файл:

```text
dist/when-coffee-and-kale-compete-ru.html
```
