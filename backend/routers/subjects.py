from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, GroupMember, Lesson, LessonFile, Subject
from permissions import can_manage_content
from routers.auth import get_current_user

router = APIRouter(prefix="/subjects", tags=["subjects"])


# ---------- Helpers ----------

def _check_member(db: Session, user_id: str, group_id: str) -> GroupMember:
    member = db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.group_id == group_id,
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return member


def _subject_dict(s: Subject) -> dict:
    return {
        "id": s.id,
        "group_id": s.group_id,
        "name": s.name,
        "semester": s.semester,
        "created_by": s.created_by,
        "created_at": s.created_at.isoformat(),
    }


# ---------- Schemas ----------

class CreateSubjectRequest(BaseModel):
    name: str
    semester: Optional[str] = None


# ---------- Endpoints ----------

@router.post("/{group_id}", status_code=status.HTTP_201_CREATED)
def create_subject(
    group_id: str,
    body: CreateSubjectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Создать предмет в группе."""
    _check_member(db, current_user.id, group_id)

    subject = Subject(
        group_id=group_id,
        name=body.name,
        semester=body.semester,
        created_by=current_user.id,
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)

    return _subject_dict(subject)


@router.get("/{group_id}")
def get_subjects(
    group_id: str,
    semester: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Получить список предметов группы. Опциональный фильтр по semester."""
    _check_member(db, current_user.id, group_id)

    query = db.query(Subject).filter(Subject.group_id == group_id)

    if semester:
        query = query.filter(Subject.semester == semester)

    subjects = query.order_by(Subject.created_at.asc()).all()

    return [_subject_dict(s) for s in subjects]


@router.get("/{group_id}/files")
def get_group_lesson_files(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Получить все файлы занятий («Предметы») всей группы одним запросом —
    используется дропдауном во вкладке AI-ассистент."""
    _check_member(db, current_user.id, group_id)

    files = (
        db.query(LessonFile)
        .join(Lesson, LessonFile.lesson_id == Lesson.id)
        .join(Subject, Lesson.subject_id == Subject.id)
        .filter(Subject.group_id == group_id)
        .all()
    )

    return [
        {
            "id": f.id,
            "lesson_id": f.lesson_id,
            "filename": f.filename,
            "indexed": f.indexed,
            "index_error": f.index_error,
        }
        for f in files
    ]


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_subject(
    subject_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Удалить предмет. Только для deputy, starosta, teacher."""
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    member = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == subject.group_id,
    ).first()
    if not can_manage_content(member.role if member else None):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Удаляем файлы занятий с диска — cascade удалит только записи в БД
    for lesson in subject.lessons:
        for f in lesson.files:
            path = Path(f.filepath)
            if path.exists():
                path.unlink()

    db.delete(subject)
    db.commit()
