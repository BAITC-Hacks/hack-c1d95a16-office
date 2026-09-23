# Backend API contract

Все расчёты, проверки сценариев и поиск оптимума принадлежат `simulation/`. Backend передаёт данные движку, AI-агенты объясняют его выводы. Клиент не отправляет cost или Score.

## Локальный адрес

- Base URL: `http://127.0.0.1:8000`; для демо авторизация не включена.
- CORS по умолчанию: `http://127.0.0.1:5173`, `http://localhost:5173`.
- Сначала запросите `GET /bootstrap`, чтобы получить актуальный `datasetVersion`.

## Общие маршруты

- `GET /health`: статус API и наличие simulation engine.
- `GET /bootstrap`: каталоги в формате frontend.
- `GET /districts`, `GET /measures`: исходные каталоги движка.
- `GET /docs`: интерактивная OpenAPI документация.

### Сценарий для frontend и AI

Тело для `POST /simulate`, `POST /ai/analyze` и `POST /ai/optimize`:

```json
{
  "datasetVersion": "sim-<значение из /bootstrap>",
  "districtId": "NURA",
  "actionIds": ["M7", "M8", "M10", "M12", "M5"]
}
```

Все районные меры применяются к выбранному району, городские передаются без района. Движок проверяет сценарий. При ошибке API отвечает HTTP 422 и не возвращает Score.

### `POST /simulate`: явные назначения

Можно передать per-measure решения вместо frontend тела:

```json
{"decisions": [
  {"measure_id": "M7", "district": "NURA"},
  {"measure_id": "M8", "district": "NURA"},
  {"measure_id": "M10", "district": "NURA"},
  {"measure_id": "M12"},
  {"measure_id": "M5", "district": "SARYARKA"}
]}
```

`measureId` тоже принимается вместо `measure_id`. Ответ — полный результат движка с районными показателями, эффектами и Score. Для городских мер опустите `district` или укажите `null`. Стоимость/Score во входе запрещены. Этот формат доступен только в `/simulate`; AI endpoints принимают frontend тело выше.

### `POST /ai/analyze`

Принимает frontend-сценарий выше. Порядок: engine simulation → Policy и Risk → Optimizer → Executive. Ответ содержит полный результат движка, структурированные AI-выводы и оптимизированные варианты:

```json
{
  "datasetVersion": "sim-...",
  "simulation": {"valid": true, "score": 56.5, "total_cost": 95},
  "analysis": {
    "policy": {"summary": "...", "strengths": [], "tradeoffs": [], "district_observations": []},
    "risk": {"risk_level": "medium", "risks": [], "critical_findings": [], "warnings": []},
    "optimizer": {"current_score": 56.5, "recommended_score": 60.2, "improvement": 3.7, "recommended_scenario": [], "reasoning": "..."},
    "executive": {"executive_summary": "...", "top_strengths": [], "main_risks": [], "recommended_actions": [], "final_comment": "..."}
  },
  "optimizedScenarios": [],
  "aiStatus": {"status": "available", "source": "openai"}
}
```

Числа в примере условные. Если нет `OPENAI_API_KEY`, расчёт движка возвращается, `analysis` становится `null`, а `aiStatus` содержит `configuration_error` с инструкцией настроить ключ. При временной ошибке AI детерминированный результат также сохраняется.

### `POST /ai/optimize`

Принимает frontend тело сценария и необязательный `topN` от 1 до 10 (по умолчанию 5). Candidate ranking приходит из `simulation.find_best_scenarios()`, сравнение — из `simulation.compare_scenarios()`. Ответ включает текущий результат, список engine-кандидатов, значения Score/improvement от движка и AI-пояснение. Без API-ключа детерминированные данные доступны, `reasoning=null`, `aiStatus` сообщает об ошибке настройки.

## Deterministic engine API

Эти маршруты не используют OpenAI и возвращают оригинальные результаты движка.

### `GET /baseline`

Возвращает результат `simulation.calculate_baseline()`.

### `POST /optimize`

Тело: `{}` или `{"top_n": 5}` (также принимается `topN`; допустимо 1–10). Возвращает `{"scenarios": [...]}` без изменения ранжирования `simulation.find_best_scenarios()`. Сценарий из `selected_measures` можно отправить в явную форму `/simulate`. Перебор синхронный и может занять до примерно 90 секунд на машине разработки.

### `POST /compare`

```json
{
  "scenario_a": {"decisions": [{"measure_id": "M7", "district": "NURA"}]},
  "scenario_b": {"decisions": [{"measure_id": "M7", "district": "ESIL"}]}
}
```

Также принимаются алиасы `scenarioA` / `scenarioB`. Возвращает результат `simulation.compare_scenarios()`; разницы — B минус A. Невалидный сценарий возвращает HTTP 422 с полным сообщением движка и без Score.

## Секреты и настройки

Создайте локальный `.env` по образцу `.env.example` и задайте `OPENAI_API_KEY`. Файл `.env` и все варианты `.env.*`, кроме отслеживаемого `.env.example`, исключены из Git. Никогда не передавайте API-ключ frontend или GitHub.
