"""Add optional worker assignment to complaints.

Revision ID: 6c2f9a1d4b70
Revises: 27fe37c34f01
"""

from alembic import op
import sqlalchemy as sa

revision = "6c2f9a1d4b70"
down_revision = "27fe37c34f01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "complaints",
        sa.Column("assigned_worker_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_complaints_assigned_worker_id_users",
        "complaints",
        "users",
        ["assigned_worker_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_complaints_assigned_worker_id",
        "complaints",
        ["assigned_worker_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_complaints_assigned_worker_id",
        table_name="complaints",
    )
    op.drop_constraint(
        "fk_complaints_assigned_worker_id_users",
        "complaints",
        type_="foreignkey",
    )
    op.drop_column("complaints", "assigned_worker_id")
