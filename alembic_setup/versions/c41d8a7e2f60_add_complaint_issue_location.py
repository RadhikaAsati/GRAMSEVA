"""Add manual issue location details to complaints."""

from alembic import op
import sqlalchemy as sa

revision = "c41d8a7e2f60"
down_revision = "b38d5f75fa9f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "complaints",
        sa.Column("village", sa.String(length=150), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("ward", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "complaints",
        sa.Column("landmark", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("complaints", "landmark")
    op.drop_column("complaints", "ward")
    op.drop_column("complaints", "village")
