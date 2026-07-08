import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Announcement, GroupMember
from permissions import can_manage_content
from routers.auth import get_current_user

router = APIRouter(prefix="/announcements", tags=["announcements"])


# ---------- Helpers ----------

def _check_member(db: Session, user_id: str, group_id: str) -> GroupMember:
    member = db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.group_id == group_id,
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return member


def _announcement_dict(a: Announcement) -> dict:
    return {
        "id": a.id,
        "title": a.title,
        "content": a.content,
        "tags": json.loads(a.tags) if a.tags else [],
        "created_at": a.created_at.isoformat(),
        "author_id": a.user_id,
        "author_name": a.author.name if a.author else "Unknown",
    }


# ---------- Schemas ----------

class CreateAnnouncementRequest(BaseModel):
    content: str
    title: Optional[str] = None
    tags: Optional[list[str]] = []


class UpdateAnnouncementRequest(BaseModel):
    content: Optional[str] = None
    title: Optional[str] = None
    tags: Optional[list[str]] = None


# ---------- Endpoints ----------

@router.post("/{group_id}", status_code=status.HTTP_201_CREATED)
def create_announcement(
    group_id: str,
    body: CreateAnnouncementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Создать объявление в группе (доступно только участникам группы)."""
    _check_member(db, current_user.id, group_id)

    announcement = Announcement(
        group_id=group_id,
        user_id=current_user.id,
        title=body.title,
        content=body.content,
        tags=json.dumps(body.tags or [], ensure_ascii=False),
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    return _announcement_dict(announcement)


@router.get("/{group_id}")
def get_announcements(
    group_id: str,
    search: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Получить список объявлений группы, отсортированный по created_at DESC."""
    _check_member(db, current_user.id, group_id)

    query = db.query(Announcement).filter(Announcement.group_id == group_id)

    if search:
        like = f"%{search}%"
        query = query.filter(
            Announcement.title.like(like)
            | Announcement.content.like(like)
            | Announcement.tags.like(like)
        )

    announcements = query.order_by(Announcement.created_at.desc()).all()

    return [_announcement_dict(a) for a in announcements]


@router.patch("/{announcement_id}")
def update_announcement(
    announcement_id: str,
    body: UpdateAnnouncementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Обновить объявление. Разрешено автору или старосте группы."""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    member = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == announcement.group_id,
    ).first()

    if not can_manage_content(member.role if member else None):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    updates = body.model_dump(exclude_unset=True)
    if "tags" in updates:
        updates["tags"] = json.dumps(updates["tags"], ensure_ascii=False)
    for key, value in updates.items():
        setattr(announcement, key, value)

    db.commit()
    db.refresh(announcement)

    return _announcement_dict(announcement)


@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_announcement(
    announcement_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Удалить объявление. Разрешено автору или старосте группы."""
    announcement = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not announcement:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found")

    member = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == announcement.group_id,
    ).first()

    if not can_manage_content(member.role if member else None):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(announcement)
    db.commit()
