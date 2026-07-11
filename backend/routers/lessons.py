import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, GroupMember, Subject, Lesson, LessonFile
from permissions import can_manage_content
from routers.auth import get_current_user
from services.rag import index_lesson_file

router = APIRouter(prefix="/lessons", tags=["lessons"])

LESSON_UPLOADS_DIR = Path("uploads/lessons")
LESSON_TYPES = {"lecture", "practical", "general"}


# ---------- Helpers ----------

def _get_subject_and_member(
    subject_id: str,
    user_id: str,
    db: Session,
) -> tuple[Subject, GroupMember]:
    subject = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    member = db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.group_id == subject.group_id,
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return subject, member


def _get_lesson_and_member(
    lesson_id: str,
    user_id: str,
    db: Session,
) -> tuple[Lesson, GroupMember]:
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    subject = db.query(Subject).filter(Subject.id == lesson.subject_id).first()
    member = db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.group_id == subject.group_id,
    ).first()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return lesson, member


def _lesson_dict(lesson: Lesson) -> dict:
    return {
        "id": lesson.id,
        "subject_id": lesson.subject_id,
        "type": lesson.type,
        "number": lesson.number,
        "date": lesson.date.isoformat() if lesson.date else None,
        "title": lesson.title,
        "notes": lesson.notes,
        "created_by": lesson.created_by,
        "created_at": lesson.created_at.isoformat(),
    }


def _file_dict(f: LessonFile) -> dict:
    return {
        "id": f.id,
        "lesson_id": f.lesson_id,
        "filename": f.filename,
        "indexed": f.indexed,
        "index_error": f.index_error,
        "created_by": f.created_by,
        "created_at": f.created_at.isoformat(),
    }


# ---------- Schemas ----------

class CreateLessonRequest(BaseModel):
    type: str
    number: int
    date: Optional[str] = None  # ISO date string YYYY-MM-DD
    title: Optional[str] = None
    notes: Optional[str] = None


class UpdateLessonRequest(BaseModel):
    type: Optional[str] = None
    number: Optional[int] = None
    date: Optional[str] = None
    title: Optional[str] = None
    notes: Optional[str] = None


# ---------- Endpoints ----------

@router.post("/{subject_id}", status_code=status.HTTP_201_CREATED)
def create_lesson(
    subject_id: str,
    body: CreateLessonRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Создать занятие в предмете."""
    if body.type not in LESSON_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"type must be one of: {', '.join(LESSON_TYPES)}",
        )

    _get_subject_and_member(subject_id, current_user.id, db)

    from datetime import date as date_type
    parsed_date = None
    if body.date:
        try:
            parsed_date = date_type.fromisoformat(body.date)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="date must be in YYYY-MM-DD format",
            )

    lesson = Lesson(
        subject_id=subject_id,
        type=body.type,
        number=body.number,
        date=parsed_date,
        title=body.title,
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    return _lesson_dict(lesson)


@router.get("/{subject_id}")
def get_lessons(
    subject_id: str,
    type: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Получить список занятий предмета. Опциональный фильтр по type."""
    _get_subject_and_member(subject_id, current_user.id, db)

    query = db.query(Lesson).filter(Lesson.subject_id == subject_id)

    if type:
        if type not in LESSON_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"type must be one of: {', '.join(LESSON_TYPES)}",
            )
        query = query.filter(Lesson.type == type)

    lessons = query.order_by(Lesson.number.asc()).all()

    return [_lesson_dict(l) for l in lessons]


@router.patch("/{lesson_id}")
def update_lesson(
    lesson_id: str,
    body: UpdateLessonRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Обновить занятие. Только для deputy, starosta, teacher."""
    lesson, member = _get_lesson_and_member(lesson_id, current_user.id, db)

    if not can_manage_content(member.role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    updates = body.model_dump(exclude_unset=True)

    if "type" in updates and updates["type"] not in LESSON_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"type must be one of: {', '.join(LESSON_TYPES)}",
        )

    if "date" in updates and updates["date"] is not None:
        from datetime import date as date_type
        try:
            updates["date"] = date_type.fromisoformat(updates["date"])
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="date must be in YYYY-MM-DD format",
            )

    for key, value in updates.items():
        setattr(lesson, key, value)

    db.commit()
    db.refresh(lesson)

    return _lesson_dict(lesson)


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Удалить занятие. Только для deputy, starosta, teacher."""
    lesson, member = _get_lesson_and_member(lesson_id, current_user.id, db)

    if not can_manage_content(member.role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Удаляем файлы с диска (cascade удалит LessonFile записи)
    for f in lesson.files:
        path = Path(f.filepath)
        if path.exists():
            path.unlink()

    db.delete(lesson)
    db.commit()


# ---------- Files ----------

@router.post("/{lesson_id}/files", status_code=status.HTTP_201_CREATED)
def upload_lesson_file(
    lesson_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Загрузить файл к занятию. Любой тип файла."""
    _get_lesson_and_member(lesson_id, current_user.id, db)

    ext = Path(file.filename).suffix.lower()
    file_id = str(uuid.uuid4())

    lesson_dir = LESSON_UPLOADS_DIR / lesson_id
    lesson_dir.mkdir(parents=True, exist_ok=True)

    filepath = lesson_dir / f"{file_id}{ext}"
    with open(filepath, "wb") as out:
        out.write(file.file.read())

    lesson_file = LessonFile(
        id=file_id,
        lesson_id=lesson_id,
        filename=file.filename,
        filepath=str(filepath),
        created_by=current_user.id,
    )
    db.add(lesson_file)
    db.commit()
    db.refresh(lesson_file)

    return _file_dict(lesson_file)


@router.get("/{lesson_id}/files")
def get_lesson_files(
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Получить список файлов занятия."""
    _get_lesson_and_member(lesson_id, current_user.id, db)

    files = db.query(LessonFile).filter(LessonFile.lesson_id == lesson_id).all()

    return [_file_dict(f) for f in files]


@router.post("/{lesson_id}/files/{file_id}/index")
def index_lesson_file_endpoint(
    lesson_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Проиндексировать вложение занятия для поиска в AI-ассистенте (если это
    текстовый файл — PDF/TXT; для остальных типов индексация не удастся, что
    ожидаемо и не является ошибкой пользователя)."""
    lesson, member = _get_lesson_and_member(lesson_id, current_user.id, db)

    lesson_file = db.query(LessonFile).filter(
        LessonFile.id == file_id,
        LessonFile.lesson_id == lesson_id,
    ).first()
    if not lesson_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    subject = db.query(Subject).filter(Subject.id == lesson.subject_id).first()

    try:
        index_lesson_file(lesson_file.id, lesson_file.filepath, subject.group_id, db)
    except ValueError as e:
        lesson_file.index_error = "empty"
        db.commit()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    return {"message": "File indexed successfully", "file_id": file_id}


@router.get("/{lesson_id}/files/{file_id}/download")
def download_lesson_file(
    lesson_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Скачать файл занятия."""
    _get_lesson_and_member(lesson_id, current_user.id, db)

    lesson_file = db.query(LessonFile).filter(
        LessonFile.id == file_id,
        LessonFile.lesson_id == lesson_id,
    ).first()
    if not lesson_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    path = Path(lesson_file.filepath)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing on disk")

    return FileResponse(path, filename=lesson_file.filename)


@router.delete("/{lesson_id}/files/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lesson_file(
    lesson_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Удалить файл занятия с диска и из БД."""
    lesson, member = _get_lesson_and_member(lesson_id, current_user.id, db)

    if not can_manage_content(member.role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    lesson_file = db.query(LessonFile).filter(
        LessonFile.id == file_id,
        LessonFile.lesson_id == lesson_id,
    ).first()
    if not lesson_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    path = Path(lesson_file.filepath)
    if path.exists():
        path.unlink()

    db.delete(lesson_file)
    db.commit()
