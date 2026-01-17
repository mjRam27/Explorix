# app/rag/retriever.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List

from places.models import Place


class RAGRetriever:
    """
    SQL-based POI retriever for RAG
    """

    async def search_places(
        self,
        db: AsyncSession,
        query: str,
        limit: int = 20
    ) -> List[Place]:

        keywords = query.split()

        stmt = (
            select(Place)
            .where(
                or_(
                    *[Place.title.ilike(f"%{k}%") for k in keywords],
                    *[Place.normalized_title.ilike(f"%{k}%") for k in keywords],
                    *[Place.category.ilike(f"%{k}%") for k in keywords],
                    *[Place.city.ilike(f"%{k}%") for k in keywords],
                )
            )
            .limit(limit)
        )

        result = await db.execute(stmt)
        return result.scalars().all()


rag_retriever = RAGRetriever()
