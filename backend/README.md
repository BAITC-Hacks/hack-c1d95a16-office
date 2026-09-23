# Backend + AI agents

FastAPI адаптер соединяет frontend, детерминированный пакет `simulation/` и слой AI. Только simulation engine проверяет сценарии и рассчитывает стоимость, эффекты, Score и оптимальные варианты. AI-агенты получают его результаты и формируют текстовые объяснения.

## Локальный запуск

Из корня репозитория (Python 3.10+):

```powershell
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Добавьте OPENAI_API_KEY в локальный .env; ключ не коммитьте.
uvicorn backend.main:app --reload
```

Без ключа сервер и обычный `/simulate` работают. AI endpoints возвращают deterministic simulation/top scenarios и `aiStatus` с понятной конфигурационной ошибкой; приложение не падает. Провайдер вызывается с таймаутом `OPENAI_TIMEOUT_SECONDS` (по умолчанию 15 секунд) и без автоматических повторов.

## Архитектура

- `backend/routes.py`: входная проверка API, адаптация запросов и вызовы engine.
- `agents/orchestrator.py`: Policy, Risk, Optimizer и Executive agents.
- `agents/*_agent.py`: структурированные JSON-результаты; тексты основаны на фактах движка.
- `agents/prompts.py`: централизованные инструкции для языковой модели.
- `simulation/`: единственный источник расчетов и поиска оптимума.
- `OPENAI_API_KEY` хранится только в серверном окружении.

## Примеры API

Загрузите актуальный `datasetVersion` через `GET /bootstrap`. Пример тела сценария:

```json
{
  "datasetVersion": "sim-<из-bootstrap>",
  "districtId": "NURA",
  "actionIds": ["M7", "M8", "M10", "M12", "M5"]
}
```

- `POST /simulate`: возвращает компактный frontend результат.
- `POST /ai/analyze`: принимает то же тело; возвращает полный `simulation` и структурированные `analysis.policy`, `risk`, `optimizer`, `executive`.
- `POST /ai/optimize`: принимает тот же сценарий и необязательный `topN` (1–10); возвращает engine-ranked `scenarios` и объяснение рекомендованного варианта.

Например:

```powershell
$body = @{ datasetVersion = "sim-<из-bootstrap>"; districtId = "NURA"; actionIds = @("M7","M8","M10","M12","M5") } | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8000/ai/analyze -Method Post -ContentType "application/json" -Body $body
```

`GET /docs` показывает OpenAPI. Перед запуском backend ветку `feature/simulation` нужно интегрировать в общий репозиторий; backend не содержит копию движка.
