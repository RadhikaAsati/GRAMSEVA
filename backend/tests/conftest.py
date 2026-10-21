import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base
import backend.app.models  # Register all SQLAlchemy models
from backend.app.database import get_db
from backend.app.api.auth import get_current_user
from backend.main import app


TEST_DATABASE_URL = "sqlite://"


@pytest.fixture
def test_db():
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    TestingSessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
    )

    Base.metadata.create_all(bind=engine)

    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def client(test_db):
    def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()



@pytest.fixture
def user_factory(test_db):
    from backend.app.models import User

    def create_user(user_id, email, role="citizen"):
        user = User(
            id=user_id,
            full_name=f"Test User {user_id}",
            email=email,
            password_hash="test-only-not-a-real-password",
            role=role,
            is_active=True,
        )
        test_db.add(user)
        test_db.commit()
        test_db.refresh(user)
        return user

    return create_user


@pytest.fixture
def citizen_factory(user_factory):
    def create_citizen(user_id, email):
        return user_factory(user_id, email, "citizen")

    return create_citizen



@pytest.fixture
def complaint_factory(test_db):
    from backend.app.models import Complaint

    def create_complaint(citizen_id, title):
        complaint = Complaint(
            title=title,
            description=f"Description for {title}",
            category="streetlight",
            status="submitted",
            original_language="en",
            translated_description=f"Description for {title}",
            translation_status="not_needed",
            input_method="text",
            transcription_status="not_applicable",
            citizen_id=citizen_id,
        )
        test_db.add(complaint)
        test_db.commit()
        test_db.refresh(complaint)
        return complaint

    return create_complaint
