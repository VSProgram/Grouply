from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, ScheduleItem, GroupMember
from permissions import can_manage_content
from routers.auth import get_current_user

router = APIRouter(prefix="/schedule", tags=["schedule"])


# ---------- Schemas ----------

class CreateScheduleItemRequest(BaseModel):
    subject: str
    teacher: str | None = None
    day_of_week: int
    start_time: str
    end_time: str | None = None
    room: str | None = None


class ScheduleItemResponse(BaseModel):
    id: int
    subject: str
    teacher: str | None
    day_of_week: int
    start_time: str
    end_time: str | None
    room: str | None
    created_at: str

    class Config:
        from_attributes = True


# ---------- Endpoints ----------

@router.post("/{group_id}", status_code=status.HTTP_201_CREATED)
def create_schedule_item(
    group_id: str,
    body: CreateScheduleItemRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Добавить занятие в расписание (доступно только участникам группы)."""
    # Проверяем, что пользователь является участником группы
    is_member = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id,
    ).first()

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Создаём запись в расписании
    schedule_item = ScheduleItem(
        group_id=group_id,
        created_by=current_user.id,
        subject=body.subject,
        teacher=body.teacher,
        day_of_week=body.day_of_week,
        start_time=body.start_time,
        end_time=body.end_time,
        room=body.room,
    )
    db.add(schedule_item)
    db.commit()
    db.refresh(schedule_item)

    return {
        "id": schedule_item.id,
        "subject": schedule_item.subject,
        "teacher": schedule_item.teacher,
        "day_of_week": schedule_item.day_of_week,
        "start_time": schedule_item.start_time,
        "end_time": schedule_item.end_time,
        "room": schedule_item.room,
        "created_at": schedule_item.created_at.isoformat(),
        "message": "Schedule item created successfully",
    }


@router.get("/{group_id}", response_model=list[ScheduleItemResponse])
def get_schedule(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Получить расписание группы, отсортированное по day_of_week и start_time."""
    # Проверяем, что пользователь является участником группы
    is_member = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id,
    ).first()

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Получаем расписание, отсортированное по day_of_week, затем start_time
    schedule_items = db.query(ScheduleItem).filter(
        ScheduleItem.group_id == group_id,
    ).order_by(
        ScheduleItem.day_of_week,
        ScheduleItem.start_time,
    ).all()

    return [
        {
            "id": item.id,
            "subject": item.subject,
            "teacher": item.teacher,
            "day_of_week": item.day_of_week,
            "start_time": item.start_time,
            "end_time": item.end_time,
            "room": item.room,
            "created_at": item.created_at.isoformat(),
        }
        for item in schedule_items
    ]


@router.delete("/{group_id}/{item_id}", status_code=status.HTTP_200_OK)
def delete_schedule_item(
    group_id: str,
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Удалить занятие из расписания (доступно заму старосты/старосте/преподавателю)."""
    # Проверяем, что пользователь является участником группы
    is_member = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id,
    ).first()

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Получаем запись в расписании
    schedule_item = db.query(ScheduleItem).filter(
        ScheduleItem.id == item_id,
        ScheduleItem.group_id == group_id,
    ).first()

    if not schedule_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule item not found",
        )

    if not can_manage_content(is_member.role):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a deputy, starosta or teacher can delete this item",
        )

    db.delete(schedule_item)
    db.commit()

    return {"message": "Schedule item deleted successfully", "id": item_id}
