from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, exists
from posts.models import PostSave, Post, PostLike, PostComment
from utils.gcs import get_signed_url


async def toggle_save(
    db: AsyncSession,
    post_id,
    user_id,
):
    stmt = select(PostSave).where(
        PostSave.post_id == post_id,
        PostSave.user_id == user_id,
    )

    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        await db.execute(
            delete(PostSave).where(PostSave.id == existing.id)
        )
        await db.commit()
        return {"saved": False}

    save = PostSave(
        post_id=post_id,
        user_id=user_id,
    )
    db.add(save)
    await db.commit()
    return {"saved": True}


async def get_saved_posts_enriched(
    db: AsyncSession,
    user_id,
):
    likes_count = (
        select(func.count(PostLike.id))
        .where(PostLike.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )
    comments_count = (
        select(func.count(PostComment.id))
        .where(PostComment.post_id == Post.id)
        .correlate(Post)
        .scalar_subquery()
    )
    is_liked = (
        select(func.count(PostLike.id))
        .where(
            PostLike.post_id == Post.id,
            PostLike.user_id == user_id,
        )
        .correlate(Post)
        .scalar_subquery()
    )
    is_saved = (
        select(func.count(PostSave.id))
        .where(
            PostSave.post_id == Post.id,
            PostSave.user_id == user_id,
        )
        .correlate(Post)
        .scalar_subquery()
    )

    stmt = (
        select(
            Post,
            likes_count.label("likes_count"),
            comments_count.label("comments_count"),
            (is_liked > 0).label("is_liked"),
            (is_saved > 0).label("is_saved"),
            PostSave.created_at.label("saved_at"),
        )
        .select_from(Post)
        .join(PostSave, PostSave.post_id == Post.id)
        .where(PostSave.user_id == user_id)
        .order_by(PostSave.created_at.desc())
    )

    result = await db.execute(stmt)
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
            "saved_at": saved_at,
        }
        for post, likes_count, comments_count, is_liked, is_saved, saved_at in rows
    ]
