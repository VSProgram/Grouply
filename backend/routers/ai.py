from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Group, GroupMember, File as FileModel
from routers.auth import get_current_user
from services.rag import index_file, ask_question

router = APIRouter(prefix="/ai", tags=["ai"])


# ---------- Schemas ----------

class AskRequest(BaseModel):
    question: str
    file_id: str | None = None


class AskResponse(BaseModel):
    answer: str
    sources: list[str]


# ---------- Helpers ----------

def _check_group_membership(user_id: str, group_id: str, db: Session) -> bool:
    return db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.group_id == group_id,
    ).first() is not None


# ---------- Endpoints ----------

@router.post("/index/{file_id}", status_code=status.HTTP_200_OK)
def index_file_endpoint(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Запустить индексацию файла."""
    db_file = db.query(FileModel).filter(FileModel.id == file_id).first()
    if not db_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Проверяем, что пользователь состоит в группе файла
    if not _check_group_membership(current_user.id, db_file.group_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    try:
        index_file(db_file.id, db_file.filepath, db_file.group_id, db)
    except ValueError as e:
        db_file.index_error = "empty"
        db.commit()
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Indexing failed: {str(e)}",
        )

    return {"message": "File indexed successfully", "file_id": file_id}


@router.post("/ask/{group_id}", response_model=AskResponse)
def ask(
    group_id: str,
    body: AskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Задать вопрос по материалам группы."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    if not _check_group_membership(current_user.id, group_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    try:
        result = ask_question(body.question, group_id, db, file_id=body.file_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get answer: {str(e)}",
        )

    return AskResponse(answer=result["answer"], sources=result["sources"])
