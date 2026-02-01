# posts/feed_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import (
    select,
    func,
    exists,
)
from datetime import datetime

from posts.models import Post, PostLike, PostSave, PostComment
from auth.models import User
from social.models import UserFollow  # ✅ CORRECT



# =========================
# FOLLOWING FEED
# =========================
async def get_following_feed(
    db: AsyncSession,
    current_user_id,
    cursor: datetime | None = None,
    limit: int = 20,
):
    """
    Feed of posts from users that the current user follows
    """

    # --- Subqueries ---
    like_count = (
        select(func.count(PostLike.id))
        .where(PostLike.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )

    comment_count = (
        select(func.count(PostComment.id))
        .where(PostComment.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )

    save_count = (
        select(func.count(PostSave.id))
        .where(PostSave.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )

    is_liked = (
        exists()
        .where(
            (PostLike.post_id == Post.id)
            & (PostLike.user_id == current_user_id)
        )
        .correlate(Post)
    )

    is_saved = (
        exists()
        .where(
            (PostSave.post_id == Post.id)
            & (PostSave.user_id == current_user_id)
        )
        .correlate(Post)
    )

    # --- Base query ---
    stmt = (
        select(
            Post,
            User.id.label("author_id"),
            User.name.label("author_name"),
            like_count.label("like_count"),
            comment_count.label("comment_count"),
            save_count.label("save_count"),
            is_liked.label("is_liked"),
            is_saved.label("is_saved"),
        )
        .join(User, User.id == Post.user_id)
        .join(
            UserFollow,
            UserFollow.following_id == Post.user_id,
        )
        .where(UserFollow.follower_id == current_user_id)
        .order_by(Post.created_at.desc())
        .limit(limit)
    )

    if cursor:
        stmt = stmt.where(Post.created_at < cursor)

    result = await db.execute(stmt)

    # --- Format response ---
    feed = []
    for row in result.all():
        post: Post = row.Post

        feed.append(
            {
                "post": post,
                "author": {
                    "id": row.author_id,
                    "name": row.author_name,
                },
                "stats": {
                    "likes": row.like_count,
                    "comments": row.comment_count,
                    "saves": row.save_count,
                },
                "viewer_state": {
                    "is_liked": row.is_liked,
                    "is_saved": row.is_saved,
                },
            }
        )

    return feed
