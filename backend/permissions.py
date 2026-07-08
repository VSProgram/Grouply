ALL_ROLES = {"student", "deputy", "starosta", "teacher"}
MANAGE_ROLES = {"deputy", "starosta", "teacher"}
ASSIGN_ANY_ROLE = {"starosta", "teacher"}


def can_manage_content(role: str | None) -> bool:
    """Может редактировать/удалять чужой контент (файлы, объявления, расписание)."""
    return role in MANAGE_ROLES


def can_assign_role(actor_role: str | None, target_role: str) -> bool:
    """Может ли actor_role назначить участнику роль target_role."""
    if actor_role in ASSIGN_ANY_ROLE:
        return target_role in ALL_ROLES
    if actor_role == "deputy":
        return target_role == "student"
    return False
