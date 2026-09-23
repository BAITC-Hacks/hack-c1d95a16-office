# Backend + AI agents

FastAPI адаптер соединяет frontend, deterministic simulation engine и AI-объяснения. Движок — единственный источник чисел: он проверяет сценарии, рассчитывает стоимость, эффекты и Score, а также ищет оптимальные варианты. AI объясняет готовые результаты и не выполняет вычислений.

## Локальный запуск

Из корня репозитория, Python 3.11+:

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r requirements-dev.txt
Copy-Item .env.example .env
# Добавьте OPENAI_API_KEY в локальный .env; не коммитьте его.
uvicorn backend.main:app --reload
```

Без ключа API запускается, а AI-маршруты возвращают результат движка вместе с `aiStatus` и сообщением о конфигурации. OpenAI вызывается с таймаутом `OPENAI_TIMEOUT_SECONDS` (по умолчанию 15 секунд), без автоматических повторов. Ключ нужен только серверу.

## Архитектура

- `backend/routes.py`: frontend API и AI маршруты.
- `backend/simulation_api.py`: JSON API-адаптер для полного сценария, baseline, engine optimizer и сравнения.
- `agents/orchestrator.py`: координирует Policy, Risk, Optimizer и Executive.
- `agents/*_agent.py`: структурированные объяснения на основе данных движка.
- `agents/prompts.py`: общие system prompts.
- `simulation/`: правила, все расчёты и deterministic optimizer.

## Основные маршруты

- `GET /health`, `GET /bootstrap`, `GET /districts`, `GET /measures`
- `POST /simulate`: frontend-сценарий или полный список per-measure решений
- `POST /ai/analyze`: симуляция и структурированный анализ четырёх агентов
- `POST /ai/optimize`: текущая симуляция, лучшие варианты движка и AI-объяснение
- `GET /baseline`, `POST /optimize`, `POST /compare`: deterministic API без AI

Актуальные JSON-примеры и поля ответов находятся в [API_CONTRACT.md](API_CONTRACT.md). OpenAPI UI: `http://127.0.0.1:8000/docs`.

## Проверка

Из корня репозитория запустите `python -m pytest -q`. HTTP и simulation тесты не требуют OpenAI-вызовов; полный optimizer тест может занять около 90 секунд.
