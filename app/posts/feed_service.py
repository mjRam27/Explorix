# posts/feed_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, exists, or_
from datetime import datetime

from posts.models import Post, PostLike, PostSave, PostComment
from social.models import UserFollow
from utils.gcs import get_signed_url


async def get_following_feed(
    db: AsyncSession,
    current_user_id,
    cursor: datetime | None = None,
    limit: int = 20,
):
    base_stmt = (
        select(
            Post,
            (
                select(func.count(PostLike.id))
                .where(PostLike.post_id == Post.id)
                .scalar_subquery()
            ).label("likes_count"),
            (
                select(func.count(PostComment.id))
                .where(PostComment.post_id == Post.id)
                .scalar_subquery()
            ).label("comments_count"),
            exists().where(
                PostLike.post_id == Post.id,
                PostLike.user_id == current_user_id,
            ).label("is_liked"),
            exists().where(
                PostSave.post_id == Post.id,
                PostSave.user_id == current_user_id,
            ).label("is_saved"),
        )
        .order_by(Post.created_at.desc())
        .limit(limit)
    )

    # ✅ APPLY CURSOR ONCE
    if cursor:
        base_stmt = base_stmt.where(Post.created_at < cursor)

    # FOLLOWING feed (include own posts)
    stmt = (
        base_stmt
        .outerjoin(UserFollow, Post.user_id == UserFollow.following_id)
        .where(
            or_(
                UserFollow.follower_id == current_user_id,
                Post.user_id == current_user_id,
            )
        )
    )

    result = await db.execute(stmt)
    rows = result.all()

    # GLOBAL fallback (still cursor-safe)
    if not rows:
        result = await db.execute(base_stmt)
        rows = result.all()

    def resolve_media_url(value: str | None) -> str | None:
        if not value:
            return None
        if value.startswith("http://") or value.startswith("https://"):
            return value
        return get_signed_url(value)

    return [
        {
            "id": post.id,
            "user_id": post.user_id,
            "media_url": resolve_media_url(post.media_url),
            "media_type": post.media_type,
            "caption": post.caption,
            "category": post.category,
            "location_name": post.location_name,
            "latitude": post.latitude,
            "longitude": post.longitude,
            "created_at": post.created_at,
            "likes_count": likes_count,
            "comments_count": comments_count,
            "is_liked": is_liked,
            "is_saved": is_saved,
        }
        for post, likes_count, comments_count, is_liked, is_saved in rows
    ]

async def get_my_posts_enriched(
    db: AsyncSession,
    user_id,
    cursor: datetime | None = None,
    limit: int = 20,
):
    stmt = (
        select(
            Post,
            (
                select(func.count(PostLike.id))
                .where(PostLike.post_id == Post.id)
                .scalar_subquery()
            ).label("likes_count"),
            (
                select(func.count(PostComment.id))
                .where(PostComment.post_id == Post.id)
                .scalar_subquery()
            ).label("comments_count"),
            exists().where(
                PostLike.post_id == Post.id,
                PostLike.user_id == user_id,
            ).label("is_liked"),
            exists().where(
                PostSave.post_id == Post.id,
                PostSave.user_id == user_id,
            ).label("is_saved"),
        )
        .where(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
        .limit(limit)
    )

    if cursor:
        stmt = stmt.where(Post.created_at < cursor)

    result = await db.execute(stmt)

    def resolve_media_url(value: str | None) -> str | None:
        if not value:
            return None
        if value.startswith("http://") or value.startswith("https://"):
            return value
        return get_signed_url(value)

    return [
        {
            "id": post.id,
            "user_id": post.user_id,
            "media_url": resolve_media_url(post.media_url),
            "media_type": post.media_type,
            "caption": post.caption,
            "category": post.category,
            "location_name": post.location_name,
            "latitude": post.latitude,
            "longitude": post.longitude,
            "created_at": post.created_at,
            "likes_count": likes_count,
            "comments_count": comments_count,
            "is_liked": is_liked,
            "is_saved": is_saved,
        }
        for post, likes_count, comments_count, is_liked, is_saved in result.all()
    ]
