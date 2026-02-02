# posts/social_routes.py    
from fastapi import APIRouter, Depends, Body
from sqlalchemy.ext.asyncio import AsyncSession

from db.postgres import get_db
from core.dependencies import get_current_user
from posts.social_service import (
    like_post,
    unlike_post,
    save_post,
    unsave_post,
    # add_comment,
    # get_comments,
)

router = APIRouter(prefix="/posts", tags=["Post Social"])


@router.post("/{post_id}/like")
async def like(post_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    await like_post(db, post_id, user.id)
    return {"status": "liked"}


@router.post("/{post_id}/unlike")
async def unlike(post_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    await unlike_post(db, post_id, user.id)
    return {"status": "unliked"}


@router.post("/{post_id}/save")
async def save(post_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    await save_post(db, post_id, user.id)
    return {"status": "saved"}


@router.post("/{post_id}/unsave")
async def unsave(post_id: str, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    await unsave_post(db, post_id, user.id)
    return {"status": "unsaved"}


# @router.post("/{post_id}/comment")
# async def comment(
#     post_id: str,
#     content: str = Body(..., embed=True),
#     db: AsyncSession = Depends(get_db),
#     user=Depends(get_current_user),
# ):
#     return await add_comment(db, post_id, user.id, content)


# @router.get("/{post_id}/comments")
# async def comments(post_id: str, db: AsyncSession = Depends(get_db)):
#     return await get_comments(db, post_id)
