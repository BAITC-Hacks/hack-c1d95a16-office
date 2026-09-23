"""Small shared types and normalization helpers for simulation inputs."""

from dataclasses import dataclass
from typing import Any, Mapping


@dataclass(frozen=True)
class Decision:
    measure_id: str
    district: str | None = None

    @classmethod
    def from_value(cls, value: Any) -> "Decision":
        if isinstance(value, cls):
            return value
        if isinstance(value, Mapping):
            measure_id = value.get("measure_id", value.get("measure", value.get("id")))
            district = value.get("district")
            return cls(str(measure_id) if measure_id is not None else "", str(district).upper() if district is not None else None)
        if isinstance(value, (tuple, list)) and 1 <= len(value) <= 2:
            return cls(str(value[0]), str(value[1]).upper() if len(value) == 2 and value[1] is not None else None)
        return cls("")

    def to_dict(self) -> dict[str, str | None]:
        return {"measure_id": self.measure_id, "district": self.district}

