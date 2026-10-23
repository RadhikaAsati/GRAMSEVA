
"""add user preferred language

Revision ID: b38d5f75fa9f
Revises: 6c2f9a1d4b70
"""

from alembic import op
import sqlalchemy as sa

# Revision identifiers
revision = "b38d5f75fa9f"
down_revision = "6c2f9a1d4b70"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add the preferred language column to users."""
    op.add_column(
        "users",
        sa.Column(
            "preferred_language",
            sa.String(length=5),
            server_default="en",
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Remove the preferred language column from users."""
    op.drop_column("users", "preferred_language")
