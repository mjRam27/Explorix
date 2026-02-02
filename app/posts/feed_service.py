# posts/feed_service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, exists
from datetime import datetime

from posts.models import Post, PostLike, PostSave, PostComment
from social.models import UserFollow


async def get_following_feed(
    db: AsyncSession,
    current_user_id,
    cursor: datetime | None = None,
    limit: int = 20,
):
    """
    Returns enriched feed:
    - post
    - likes_count
    - comments_count
    - is_liked
    - is_saved
    """

    # Base post query (only followed users)
    stmt = (
        select(
            Post,

            # 🔢 likes count
            (
                select(func.count(PostLike.id))
                .where(PostLike.post_id == Post.id)
                .scalar_subquery()
            ).label("likes_count"),

            # 💬 comments count
            (
                select(func.count(PostComment.id))
                .where(PostComment.post_id == Post.id)
                .scalar_subquery()
            ).label("comments_count"),

            # ❤️ is liked by current user
            exists().where(
                PostLike.post_id == Post.id,
                PostLike.user_id == current_user_id,
            ).label("is_liked"),

            # 🔖 is saved by current user
            exists().where(
                PostSave.post_id == Post.id,
                PostSave.user_id == current_user_id,
            ).label("is_saved"),
        )
        .join(UserFollow, Post.user_id == UserFollow.following_id)
        .where(UserFollow.follower_id == current_user_id)
        .order_by(Post.created_at.desc())
        .limit(limit)
    )

    if cursor:
        stmt = stmt.where(Post.created_at < cursor)

    result = await db.execute(stmt)

    # 🎁 Format response
    feed = []
    for post, likes_count, comments_count, is_liked, is_saved in result.all():
        feed.append({
            "id": post.id,
            "user_id": post.user_id,
            "media_url": post.media_url,
            "media_type": post.media_type,
            "caption": post.caption,
            "category": post.category,
            "location_name": post.location_name,
            "latitude": post.latitude,
            "longitude": post.longitude,
            "created_at": post.created_at,

            # 🔥 Enriched fields
            "likes_count": likes_count,
            "comments_count": comments_count,
            "is_liked": is_liked,
            "is_saved": is_saved,
        })

    return feed
