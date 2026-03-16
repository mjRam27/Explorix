# posts/service.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from posts.models import Post, PostComment
from fastapi import HTTPException
from auth.models import User

# =========================
# CREATE POST
# =========================
async def create_post(
    db: AsyncSession,
    user_id,
    media_url: str | None = None,
    media_type: str | None = None,   # image | video
    category: str | None = None,     # food | nature | culture | shopping | hidden_gems
    caption: str | None = None,
    location_name: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> Post:
    """
    Create a post.
    Validation should be handled in Pydantic schemas (NOT here).
    """

    post = Post(
        user_id=user_id,
        media_url=media_url,
        media_type=media_type,
        category=category,
        caption=caption,
        location_name=location_name,
        latitude=latitude,
        longitude=longitude,
    )

    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post


# =========================
# GET MY POSTS
# =========================
async def get_my_posts(
    db: AsyncSession,
    user_id,
    cursor: datetime | None = None,
    limit: int = 20,
):
    """
    Get posts created by the logged-in user.
    Cursor-based pagination supported.
    """

    stmt = (
        select(Post)
        .where(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
        .limit(limit)
    )

    if cursor:
        stmt = stmt.where(Post.created_at < cursor)

    result = await db.execute(stmt)
    return result.scalars().all()


# =========================
# GET USER POSTS (PROFILE VIEW)
# =========================
async def get_user_posts(
    db: AsyncSession,
    user_id,
    cursor: datetime | None = None,
    limit: int = 20,
):
    """
    Get posts of another user (profile page).
    """

    stmt = (
        select(Post)
        .where(Post.user_id == user_id)
        .order_by(Post.created_at.desc())
        .limit(limit)
    )

    if cursor:
        stmt = stmt.where(Post.created_at < cursor)

    result = await db.execute(stmt)
    return result.scalars().all()


async def get_post_navigation(db: AsyncSession, post_id):
    post = await db.scalar(
        select(Post).where(Post.id == post_id)
    )

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if not post.latitude or not post.longitude:
        raise HTTPException(
            status_code=400,
            detail="This post has no navigation location"
        )

    return {
        "post_id": post.id,
        "location_name": post.location_name,
        "latitude": post.latitude,
        "longitude": post.longitude,
        "can_navigate": True,
    }


# =========================
# ADD COMMENT
# =========================
async def add_comment(
    db: AsyncSession,
    post_id,
    user_id,
    content: str,
):
    if not content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    post_exists = await db.scalar(
        select(Post.id).where(Post.id == post_id)
    )

    if not post_exists:
        raise HTTPException(status_code=404, detail="Post not found")

    comment = PostComment(
        post_id=post_id,
        user_id=user_id,
        content=content,
    )

    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    return comment



# =========================
# GET COMMENTS FOR POST
# =========================
async def get_comments(
    db: AsyncSession,
    post_id,
    cursor: datetime | None = None,
    limit: int = 20,
):
    stmt = (
        select(
            PostComment,
            User.id.label("user_id"),
            User.name.label("user_name"),
        )
        .join(User, User.id == PostComment.user_id)
        .where(PostComment.post_id == post_id)
        .order_by(PostComment.created_at.desc())
        .limit(limit)
    )

    if cursor:
        stmt = stmt.where(PostComment.created_at < cursor)

    result = await db.execute(stmt)

    comments = []
    for comment, user_id, user_name in result.all():
        comments.append({
            "id": comment.id,
            "content": comment.content,
            "created_at": comment.created_at,
            "user": {
                "id": user_id,
                "name": user_name,
            }
        })

    return comments
