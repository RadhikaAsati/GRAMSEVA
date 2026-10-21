
"""add complaint citizen ownership

Revision ID: 27fe37c34f01
Revises: 8b1e5cd2323b
"""

from alembic import op
import sqlalchemy as sa

revision = "27fe37c34f01"
down_revision = "8b1e5cd2323b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "complaints",
        sa.Column("citizen_id", sa.Integer(), nullable=True),
    )

    op.create_foreign_key(
        "fk_complaints_citizen_id_users",
        "complaints",
        "users",
        ["citizen_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_index(
        "ix_complaints_citizen_id",
        "complaints",
        ["citizen_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_complaints_citizen_id", table_name="complaints")
    op.drop_constraint(
        "fk_complaints_citizen_id_users",
        "complaints",
        type_="foreignkey",
    )
    op.drop_column("complaints", "citizen_id")
