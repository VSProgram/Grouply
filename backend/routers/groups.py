from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Group, GroupMember
from permissions import ALL_ROLES, can_assign_role
from routers.auth import get_current_user

router = APIRouter(prefix="/groups", tags=["groups"])


# ---------- Schemas ----------

class CreateGroupRequest(BaseModel):
    name: str


class JoinGroupRequest(BaseModel):
    invite_code: str


class GroupMemberInfo(BaseModel):
    id: str
    name: str
    role: str

    class Config:
        from_attributes = True


class GroupResponse(BaseModel):
    id: str
    name: str
    invite_code: str
    created_by: str

    class Config:
        from_attributes = True


class GroupDetailResponse(BaseModel):
    id: str
    name: str
    invite_code: str
    created_by: str
    members: list[GroupMemberInfo]

    class Config:
        from_attributes = True


class GroupListResponse(BaseModel):
    id: str
    name: str
    invite_code: str
    created_by: str
    role: str  # роль текущего пользователя в группе

    class Config:
        from_attributes = True


class UpdateRoleRequest(BaseModel):
    role: str


class MemberProfileResponse(BaseModel):
    id: str
    name: str
    email: str
    telegram: str | None = None
    phone: str | None = None
    role: str
    created_at: str

    class Config:
        from_attributes = True


# ---------- Endpoints ----------

@router.post("/", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    body: CreateGroupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Создать новую группу. Создатель автоматически добавляется как starosta."""
    group = Group(name=body.name, created_by=current_user.id)
    db.add(group)
    db.flush()

    membership = GroupMember(user_id=current_user.id, group_id=group.id, role="starosta")
    db.add(membership)
    db.commit()
    db.refresh(group)

    return group


@router.post("/join", status_code=status.HTTP_200_OK)
def join_group(
    body: JoinGroupRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Вступить в группу по invite_code."""
    group = db.query(Group).filter(Group.invite_code == body.invite_code).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    existing_member = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group.id,
    ).first()

    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already a member of this group",
        )

    membership = GroupMember(user_id=current_user.id, group_id=group.id, role="student")
    db.add(membership)
    db.commit()

    return {"message": "Successfully joined the group", "group_id": group.id}


@router.get("/my", response_model=list[GroupListResponse])
def get_my_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Получить список групп текущего пользователя."""
    memberships = db.query(GroupMember).filter(GroupMember.user_id == current_user.id).all()

    groups = []
    for membership in memberships:
        group = db.query(Group).filter(Group.id == membership.group_id).first()
        if group:
            groups.append({
                "id": group.id,
                "name": group.name,
                "invite_code": group.invite_code,
                "created_by": group.created_by,
                "role": membership.role,
            })

    return groups


@router.get("/{group_id}", response_model=GroupDetailResponse)
def get_group(
    group_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Получить информацию о группе (доступно только участникам)."""
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    # Проверяем, что пользователь является участником группы
    is_member = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group.id,
    ).first()

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Получаем всех участников
    members_data = db.query(GroupMember).filter(GroupMember.group_id == group.id).all()
    members = []

    for member in members_data:
        user = db.query(User).filter(User.id == member.user_id).first()
        if user:
            members.append({
                "id": user.id,
                "name": user.name,
                "role": member.role,
            })

    return {
        "id": group.id,
        "name": group.name,
        "invite_code": group.invite_code,
        "created_by": group.created_by,
        "members": members,
    }


@router.get("/{group_id}/members/{user_id}", response_model=MemberProfileResponse)
def get_member_profile(
    group_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Получить профиль участника группы (доступно только другим участникам той же группы)."""
    is_requester_member = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id,
    ).first()
    if not is_requester_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    target_membership = db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.group_id == group_id,
    ).first()
    if not target_membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "telegram": user.telegram,
        "phone": user.phone,
        "role": target_membership.role,
        "created_at": user.created_at.isoformat(),
    }


@router.patch("/{group_id}/members/{user_id}/role")
def update_member_role(
    group_id: str,
    user_id: str,
    body: UpdateRoleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Назначить роль участнику группы. Разрешено старосте/преподавателю (любая роль)
    и заму старосты (только понижение до student)."""
    if body.role not in ALL_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")

    actor_membership = db.query(GroupMember).filter(
        GroupMember.user_id == current_user.id,
        GroupMember.group_id == group_id,
    ).first()
    if not actor_membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if not can_assign_role(actor_membership.role, body.role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    target_membership = db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.group_id == group_id,
    ).first()
    if not target_membership:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    target_membership.role = body.role
    db.commit()

    return {"user_id": user_id, "role": body.role}
