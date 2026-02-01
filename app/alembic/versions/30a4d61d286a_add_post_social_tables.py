"""add post social tables

Revision ID: 30a4d61d286a
Revises:
Create Date: 2026-02-01 22:40:42.084895
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision: str = "30a4d61d286a"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# -------------------------------------------------
# ENUM TYPES (Postgres requires explicit creation)
# -------------------------------------------------
media_type_enum = sa.Enum(
    "image",
    "video",
    name="media_type",
)

post_category_enum = sa.Enum(
    "food",
    "nature",
    "culture",
    "shopping",
    "hidden_gems",
    name="post_category",
)


def upgrade() -> None:
    # -------------------------
    # CREATE ENUM TYPES FIRST
    # -------------------------
    media_type_enum.create(op.get_bind(), checkfirst=True)
    post_category_enum.create(op.get_bind(), checkfirst=True)

    # -------------------------
    # POST COMMENTS
    # -------------------------
    op.create_table(
        "post_comments",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("post_id", sa.UUID(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # -------------------------
    # POST LIKES
    # -------------------------
    op.create_table(
        "post_likes",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("post_id", sa.UUID(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # -------------------------
    # POST SAVES (NEXT STOP)
    # -------------------------
    op.create_table(
        "post_saves",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("post_id", sa.UUID(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    # -------------------------
    # POSTS: ADD COLUMNS
    # -------------------------
    op.add_column("posts", sa.Column("media_url", sa.Text(), nullable=True))
    op.add_column("posts", sa.Column("media_type", media_type_enum, nullable=True))
    op.add_column("posts", sa.Column("has_audio", sa.String(), nullable=True))
    op.add_column("posts", sa.Column("caption", sa.Text(), nullable=True))
    op.add_column("posts", sa.Column("category", post_category_enum, nullable=True))
    op.add_column("posts", sa.Column("location_name", sa.String(), nullable=True))
    op.add_column("posts", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("posts", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    # -------------------------
    # DROP TABLES
    # -------------------------
    op.drop_table("post_comments")
    op.drop_table("post_likes")
    op.drop_table("post_saves")

    # -------------------------
    # DROP COLUMNS
    # -------------------------
    op.drop_column("posts", "longitude")
    op.drop_column("posts", "latitude")
    op.drop_column("posts", "location_name")
    op.drop_column("posts", "category")
    op.drop_column("posts", "caption")
    op.drop_column("posts", "has_audio")
    op.drop_column("posts", "media_type")
    op.drop_column("posts", "media_url")

    # -------------------------
    # DROP ENUM TYPES LAST
    # -------------------------
    post_category_enum.drop(op.get_bind(), checkfirst=True)
    media_type_enum.drop(op.get_bind(), checkfirst=True)
