import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Group, GroupMember, File as FileModel
from permissions import can_manage_content
from routers.auth import get_current_user

router = APIRouter(prefix="/files", tags=["files"])

UPLOADS_DIR = Path("uploads")
ALLOWED_EXTENSIONS = {".pdf", ".txt"}


# ---------- Schemas ----------

class FileResponse(BaseModel):
    id: str
    filename: str
    indexed: bool
    index_error: str | None = None
    created_at: str

    class Config:
        from_attributes = True


# ---------- Helpers ----------

def _get_file_extension(filename: str) -> str:
    """Получить расширение файла."""
    return Path(filename).suffix.lower()


def _is_allowed_file(filename: str) -> bool:
    """Проверить, разрешено ли расширение файла."""
    return _get_file_extension(filename) in ALLOWED_EXTENSIONS


def _check_group_membership(user_id: str, group_id: str, db: Session) -> bool:
    """Проверить, состоит ли пользователь в группе."""
    return db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.group_id == group_id,
    ).first() is not None


# ---------- Endpoints ----------

@router.post("/upload/{group_id}", status_code=status.HTTP_201_CREATED)
def upload_file(
    group_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Загрузить файл в группу."""
    # Проверяем, существует ли группа
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    # Проверяем, что пользователь состоит в группе
    if not _check_group_membership(current_user.id, group_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this group",
        )

    # Проверяем расширение файла
    if not _is_allowed_file(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF and TXT files are allowed",
        )

    # Создаём папку для группы если её нет
    group_dir = UPLOADS_DIR / group_id
    group_dir.mkdir(exist_ok=True)

    # Сохраняем файл под сгенерированным именем — исходное имя от клиента
    # не доверенное (может содержать "../" и вести к path traversal)
    file_id = str(uuid.uuid4())
    stored_name = f"{file_id}{_get_file_extension(file.filename)}"
    file_path = group_dir / stored_name
    with open(file_path, "wb") as f:
        content = file.file.read()
        f.write(content)

    # Создаём запись в БД
    db_file = FileModel(
        id=file_id,
        group_id=group_id,
        uploaded_by=current_user.id,
        filename=file.filename,
        filepath=str(file_path),
        indexed=False,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)

    return {
        "id": db_file.id,
        "filename": db_file.filename,
        "group_id": db_file.group_id,
        "message": "File uploaded successfully",
    }


@router.get("/{group_id}", response_model=list[FileResponse])
def get_group_files(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Получить список файлов группы."""
    # Проверяем, существует ли группа
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    # Проверяем, что пользователь состоит в группе
    if not _check_group_membership(current_user.id, group_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Получаем все файлы группы
    files = db.query(FileModel).filter(FileModel.group_id == group_id).all()

    return [
        {
            "id": f.id,
            "filename": f.filename,
            "indexed": f.indexed,
            "index_error": f.index_error,
            "created_at": f.created_at.isoformat(),
        }
        for f in files
    ]


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Удалить файл."""
    # Получаем файл
    db_file = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Удалять может только заместитель старосты / староста / преподаватель
    membership = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == db_file.group_id,
    ).first()
    if not can_manage_content(membership.role if membership else None):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a deputy, starosta or teacher can delete this file",
        )

    # Удаляем файл с диска
    file_path = Path(db_file.filepath)
    if file_path.exists():
        file_path.unlink()

    # Удаляем запись из БД
    db.delete(db_file)
    db.commit()

    return None
