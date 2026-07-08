import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer,
    String, Text,
)
from sqlalchemy.orm import relationship

from database import Base


def _gen_invite_code():
    return uuid.uuid4().hex[:8].upper()


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    telegram = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    groups_created = relationship("Group", back_populates="creator")
    memberships = relationship("GroupMember", back_populates="user")
    files = relationship("File", back_populates="uploader")
    announcements = relationship("Announcement", back_populates="author")
    schedule_items = relationship("ScheduleItem", back_populates="creator")


class Group(Base):
    __tablename__ = "groups"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    invite_code = Column(String, unique=True, nullable=False, default=_gen_invite_code)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)

    creator = relationship("User", back_populates="groups_created")
    members = relationship("GroupMember", back_populates="group")
    files = relationship("File", back_populates="group")
    announcements = relationship("Announcement", back_populates="group")
    schedule_items = relationship("ScheduleItem", back_populates="group")


class GroupMember(Base):
    __tablename__ = "group_members"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    group_id = Column(String, ForeignKey("groups.id"), primary_key=True)
    role = Column(String, nullable=False, default="student")  # student / starosta / teacher

    user = relationship("User", back_populates="memberships")
    group = relationship("Group", back_populates="members")


class File(Base):
    __tablename__ = "files"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    uploaded_by = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    filepath = Column(String, nullable=False)
    indexed = Column(Boolean, default=False, nullable=False)
    index_error = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="files")
    uploader = relationship("User", back_populates="files")


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    tags = Column(Text, nullable=True)  # JSON string, e.g. '["tag1", "tag2"]'
    created_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="announcements")
    author = relationship("User", back_populates="announcements")


class ScheduleItem(Base):
    __tablename__ = "schedule_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    group_id = Column(String, ForeignKey("groups.id"), nullable=False)
    created_by = Column(String, ForeignKey("users.id"), nullable=False)
    subject = Column(String, nullable=False)
    teacher = Column(String, nullable=True)
    day_of_week = Column(Integer, nullable=False)
    start_time = Column(String, nullable=False)
    end_time = Column(String, nullable=True)
    room = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    group = relationship("Group", back_populates="schedule_items")
    creator = relationship("User", back_populates="schedule_items")
