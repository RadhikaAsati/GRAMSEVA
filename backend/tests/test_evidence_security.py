
import pytest
from pydantic import ValidationError

from backend.app.api.evidence import EvidenceCreate, validate_evidence_reference


@pytest.mark.parametrize(
    "value",
    [
        "demo/streetlight-repair-001.jpg",
        "evidence/photo-001.png",
    ],
)
def test_valid_relative_evidence_reference_is_accepted(value):
    assert validate_evidence_reference(value) == value


@pytest.mark.parametrize(
    "value",
    [
        "https://example.com/evidence.jpg",
        "http://example.com/evidence.jpg",
        "//example.com/evidence.jpg",
        "/etc/passwd",
        "../private/file.jpg",
        "demo/../../private/file.jpg",
        r"demo\..\private.jpg",
        "demo/file.jpg?token=secret",
        "demo/file.jpg#fragment",
        "",
        "   ",
    ],
)
def test_unsafe_evidence_reference_is_rejected(value):
    with pytest.raises(ValueError):
        validate_evidence_reference(value)


def test_evidence_create_rejects_external_url():
    with pytest.raises(ValidationError):
        EvidenceCreate(
            intervention_id=1,
            file_url="https://example.com/evidence.jpg",
        )


def test_evidence_create_rejects_invalid_intervention_id():
    with pytest.raises(ValidationError):
        EvidenceCreate(
            intervention_id=0,
            file_url="demo/evidence.jpg",
        )
