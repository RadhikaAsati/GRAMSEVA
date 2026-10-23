
from datetime import datetime,timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship, Mapped, mapped_column
from backend.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(50), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    longitude: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    complaints: Mapped[list["Complaint"]] = relationship(
        back_populates="asset"
    )


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    original_language: Mapped[str] = mapped_column(
        String(5), default="en", nullable=False
    )
    translated_description: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    translation_status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )
    ai_analysis: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_analysis_version: Mapped[str | None] = mapped_column(
        String(20), nullable=True
    )
    input_method: Mapped[str] = mapped_column(
        String(10), default="text", nullable=False
    )
    transcription_status: Mapped[str] = mapped_column(
        String(20), default="not_applicable", nullable=False
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)

    status: Mapped[str] = mapped_column(
        String(50), default="submitted", nullable=False
    )
    asset_id: Mapped[int | None] = mapped_column(
        ForeignKey("assets.id"), nullable=True
    )
    citizen_id: Mapped[int | None] = mapped_column(
    ForeignKey("users.id", ondelete="SET NULL"),
    nullable=True,
    index=True,
    )

    assigned_worker_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    latitude: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    longitude: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    village: Mapped[str | None] = mapped_column(
        String(150), nullable=True
    )
    ward: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    landmark: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    asset: Mapped["Asset | None"] = relationship(back_populates="complaints")
    interventions: Mapped[list["Intervention"]] = relationship(
        back_populates="complaint"
    )
    citizen: Mapped["User | None"] = relationship(
        "User",
        foreign_keys=[citizen_id],
    )
    feedback: Mapped[list["Feedback"]] = relationship(
        back_populates="complaint"
    )
    attachments: Mapped[list["ComplaintAttachment"]] = relationship(
        back_populates="complaint",
        cascade="all, delete-orphan",
    )
class ComplaintAttachment(Base):
    __tablename__ = "complaint_attachments"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    complaint_id: Mapped[int] = mapped_column(
        ForeignKey("complaints.id"), nullable=False, index=True
    )
    file_url: Mapped[str] = mapped_column(
        String(500), nullable=False
    )
    original_filename: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    content_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    file_size: Mapped[int] = mapped_column(
        Integer, nullable=False
    )
    description: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    complaint: Mapped["Complaint"] = relationship(
        back_populates="attachments"
    )
class Intervention(Base):
    __tablename__ = "interventions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    complaint_id: Mapped[int] = mapped_column(
        ForeignKey("complaints.id"), nullable=False
    )
    action_taken: Mapped[str] = mapped_column(Text, nullable=False)
    performed_by: Mapped[str] = mapped_column(String(150), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    complaint: Mapped["Complaint"] = relationship(
        back_populates="interventions"
    )
    evidence: Mapped[list["Evidence"]] = relationship(
        back_populates="intervention"
    )


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    intervention_id: Mapped[int] = mapped_column(
        ForeignKey("interventions.id"), nullable=False
    )
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    intervention: Mapped["Intervention"] = relationship(
        back_populates="evidence"
    )


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    complaint_id: Mapped[int] = mapped_column(
        ForeignKey("complaints.id"), nullable=False
    )
    outcome: Mapped[str] = mapped_column(String(50), nullable=False)
    comments: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    complaint: Mapped["Complaint"] = relationship(back_populates="feedback")

class AdminDecision(Base):
    __tablename__ = "admin_decisions"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    complaint_id: Mapped[int] = mapped_column(
        ForeignKey("complaints.id"), nullable=False, index=True
    )
    decision: Mapped[str] = mapped_column(
        String(50), nullable=False
    )
    administrator: Mapped[str] = mapped_column(
        String(150), nullable=False
    )
    notes: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )
    full_name: Mapped[str] = mapped_column(
        String(150), nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    phone: Mapped[str | None] = mapped_column(
        String(20), unique=True, nullable=True
    )
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    role: Mapped[str] = mapped_column(
        String(20), default="citizen", nullable=False
    )
    department: Mapped[str | None] = mapped_column(
        String(80), nullable=True
    )
    preferred_language: Mapped[str] = mapped_column(
    String(5),
    default="en",
    server_default="en",
    nullable=False,
    )
    phone_verified: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    identity_status: Mapped[str] = mapped_column(
        String(20), default="unverified", nullable=False
    )
    verification_method: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
