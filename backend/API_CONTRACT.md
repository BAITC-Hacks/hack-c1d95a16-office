# Backend API contract

На `feature/agents-backend`. Все числовые поля, валидация и поиск оптимума приходят из `simulation/`; backend и LLM не повторяют расчеты.

## Запуск и адрес

- Base URL: `http://127.0.0.1:8000`; демо без авторизации.
- CORS по умолчанию: `http://127.0.0.1:5173` и `http://localhost:5173`.
- Получите актуальную версию каталога через `GET /bootstrap`.

## Общие endpoint

- `GET /health`: состояние API и доступность engine.
- `GET /bootstrap`: данные для frontend из engine.
- `GET /districts`, `GET /measures`: исходный каталог engine.
- `POST /simulate`: принимает сценарный запрос ниже и возвращает компактный frontend view.
- `GET /docs`: OpenAPI.

### Тело сценария

Такое же тело отправляется в `/simulate`, `/ai/analyze` и `/ai/optimize`:

```json
{
  "datasetVersion": "sim-<значение из /bootstrap>",
  "districtId": "NURA",
  "actionIds": ["M7", "M8", "M10", "M12", "M5"]
}
```

Backend переводит выбранные ID в формат engine. Стоимость и Score клиентом не принимаются. Невалидный набор возвращает HTTP 422 без числового результата.

### `POST /ai/analyze`

Выполняет: scenario → `simulation.simulate_scenario` → Policy + Risk + Optimizer → Executive. Ответ содержит исходный полный результат движка и четыре структурированных объекта анализа:

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

Числа выше иллюстративны. Без `OPENAI_API_KEY` сервер возвращает `analysis: null`, но сохраняет расчет engine и `aiStatus.status=configuration_error` с сообщением и именем требуемой переменной. При отказе AI детерминированные результаты также сохраняются.

### `POST /ai/optimize`

Тело — сценарный запрос плюс необязательный `topN` (целое число 1–10, default 5). Кандидатов вычисляет только `simulation.find_best_scenarios()`; сравнение — только `simulation.compare_scenarios()`.

Ответ содержит `simulation` текущего сценария, engine-ranked `scenarios` и `recommended` с текущим Score, рекомендуемым Score, улучшением от engine, выбранными решениями и AI-пояснением. При отсутствии ключа `reasoning=null`, `aiStatus` сообщает настройку; engine-результаты остаются доступны.

Секреты помещаются только в локальный `.env`, который не коммитится. Скопируйте `.env.example` и задайте `OPENAI_API_KEY`. Таймаут AI по умолчанию 15 секунд.
