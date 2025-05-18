import pytest
from detector import run_inference, classify_alert_data, classify_alert
from alert_handler import (
    save_alert, get_alert_by_id, mark_alert_seen,
    mark_all_alerts_seen, delete_alert_by_id, delete_alerts_by_filter
)

TEST_IMAGE = "tests/test_images/high_conf.jpg"

#Sample Data Fixture
@pytest.fixture
def sample_alert():
    return {
        "filename": "test_image.jpg",
        "gps": {"lat": 24.7, "lon": 46.7},
        "label": "human",
        "score": 90,
        "type": "critical",
        "image": "test_image.jpg",
        "seen": False
    }

#Function Tests

def test_run_inference():
    result = run_inference(TEST_IMAGE)
    assert isinstance(result, dict)
    assert "label" in result and "confidence" in result
    assert 0 <= result["confidence"] <= 100

def test_classify_alert_data(sample_alert):
    fake_result = {"label": "human", "confidence": 91}
    result = classify_alert_data(fake_result, sample_alert["filename"], sample_alert["gps"])
    assert result["type"] == "critical"
    assert "label" in result

def test_classify_alert(sample_alert):
    detection = {"label": "human", "confidence": 75}
    result = classify_alert(detection, sample_alert["filename"], sample_alert["gps"])
    assert result["type"] in ["alert", "false_positive"]

def test_save_and_get_alert(sample_alert):
    alert_id = save_alert(sample_alert)
    assert alert_id is not None
    fetched = get_alert_by_id(str(alert_id))
    assert fetched["filename"] == sample_alert["filename"]

def test_mark_alert_seen(sample_alert):
    alert_id = save_alert(sample_alert)
    updated = mark_alert_seen(str(alert_id))
    assert updated == 1

def test_mark_all_alerts_seen():
    result = mark_all_alerts_seen()
    assert isinstance(result, int)
    assert result >= 0

def test_delete_alert_by_id(sample_alert):
    alert_id = save_alert(sample_alert)
    deleted = delete_alert_by_id(str(alert_id))
    assert deleted == 1

def test_delete_alerts_by_filter():
    # Save two alerts first
    alert = {
        "filename": "delete_test.jpg",
        "gps": {"lat": 1.1, "lon": 1.1},
        "label": "human",
        "score": 60,
        "type": "alert",
        "image": "delete_test.jpg",
        "seen": False
    }
    save_alert(alert)
    save_alert(alert)
    result = delete_alerts_by_filter({"filename": "delete_test.jpg"})
    assert result >= 1
