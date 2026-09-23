"""Explain engine-computed results without recalculating them."""
from __future__ import annotations

import json
import os
from typing import Any


class AIServiceError(RuntimeError):
    """A requested live AI explanation could not be produced."""


_INDICATOR_LABELS = {
    "T1": "жолдардың өткізу қабілеті",
    "T2": "қоғамдық көлік қолжетімділігі",
    "E1": "көгалдандыру",
    "E2": "ауа сапасы",
    "S1": "мектептер мен балабақшалар",
    "S2": "алғашқы медициналық көмек",
    "B1": "көшедегі қауіпсіздік",
    "B2": "жол қозғалысы қауіпсіздігі",
    "C1": "коммуналдық желілер сенімділігі",
    "C2": "тұрғындар өтініштерін өңдеу",
}


def _analysis_shape(value: Any, source: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise AIServiceError("AI response had an invalid structure.")
    summary = value.get("summary")
    lists = ("strengths", "risks", "recommendations")
    if not isinstance(summary, str) or not summary.strip():
        raise AIServiceError("AI response had an invalid structure.")
    if any(
        not isinstance(value.get(key), list)
        or any(not isinstance(item, str) for item in value[key])
        for key in lists
    ):
        raise AIServiceError("AI response had an invalid structure.")
    return {
        "summary": f"Тірі AI талдауы: {summary.strip()}" if source == "live" else f"{source}: {summary.strip()}",
        "strengths": value["strengths"],
        "risks": value["risks"],
        "recommendations": value["recommendations"],
        "source": source,
    }


def _template_analysis(result: dict[str, Any], source: str) -> dict[str, Any]:
    delta = float(result["score_delta"])
    spent = result["total_cost"]
    remaining = result["remaining_budget"]
    strengths: list[str] = []
    for item in result.get("measure_contributions", []):
        effects = item.get("realized_effects", {})
        positive = [
            f"{_INDICATOR_LABELS.get(code, code)} +{float(amount):g}"
            for code, amount in effects.items()
            if float(amount) > 0
        ]
        if positive:
            strengths.append(f"{item['name']}: " + ", ".join(positive) + ".")
    for synergy in result.get("synergies_triggered", []):
        strengths.append(f"Синергия: {synergy['description']}.")

    if not strengths:
        strengths.append("Сценарий есептеу қозғалтқышынан өтті.")

    weak_name = result["weakest_district"]
    weak_score = result["districts"][weak_name]["final_score"]
    risks = [
        f"Ең әлсіз аудан — {weak_name} (аудандық балл {weak_score:.2f})."
    ]
    critical = int(result["critical_count"])
    if critical:
        risks.append(f"Қозғалтқыш {critical} критикалық көрсеткішті қалдырды.")
    else:
        risks.append("Қозғалтқыш критикалық көрсеткіш қалмағанын хабарлады.")

    recommendations = [
        f"Келесі сценарийде {weak_name} ауданына арналған шараларды салыстырыңыз."
    ]
    if delta < 0:
        recommendations.append(
            "Таңдалған жиынтықтың әсерін балама сценариймен салыстырып барып таңдаңыз."
        )
    summary = (
        f"Қалалық Score {result['baseline_score']:.2f}-ден "
        f"{result['score']:.2f}-ге өзгерді (Δ {delta:+.2f}). "
        f"Шығын: {spent}, қалған бюджет: {remaining} шартты бірлік."
    )
    return {
        "summary": f"{'Шаблондық түсіндірме' if source == 'template' else 'Резервтік шаблондық түсіндірме'}: {summary}",
        "strengths": strengths,
        "risks": risks,
        "recommendations": recommendations,
        "source": source,
    }


def _live_analysis(result: dict[str, Any]) -> dict[str, Any]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise AIServiceError("OPENAI_API_KEY is not configured.")

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL", "gpt-6-astra"),
            input=[
                {
                    "role": "system",
                    "content": (
                        "Сен қалалық сценарийді түсіндіретін сарапшысың. "
                        "Төмендегі есеп қозғалтқышының нәтижесін ғана түсіндір: "
                        "Score, құн, шектеу немесе әсерді қайта есептеме және "
                        "жаңа сан ойлап таппа. Қазақ тілінде жауап бер. "
                        "JSON объектісін қайтар: summary (string), strengths "
                        "(string[]), risks (string[]), recommendations (string[])."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(result, ensure_ascii=False, separators=(",", ":")),
                },
            ],
            text={"format": {"type": "json_object"}},
        )
        parsed = json.loads(response.output_text)
        return _analysis_shape(parsed, "live")
    except AIServiceError:
        raise
    except Exception as error:
        raise AIServiceError("Live AI analysis is unavailable.") from error


def analyze_result(result: dict[str, Any], mode: str = "auto") -> dict[str, Any]:
    """Return live, mock, or clearly labelled rule-based analysis."""
    if mode == "mock":
        return {
            "summary": "MOCK: бұл сынақ мәтіні, тірі AI жауабы емес.",
            "strengths": [],
            "risks": [],
            "recommendations": [],
            "source": "mock",
        }
    if mode == "template":
        return _template_analysis(result, "template")
    if mode == "live":
        return _live_analysis(result)

    if os.getenv("OPENAI_API_KEY", "").strip():
        try:
            return _live_analysis(result)
        except AIServiceError:
            return _template_analysis(result, "template_fallback")
    return _template_analysis(result, "template_fallback")
