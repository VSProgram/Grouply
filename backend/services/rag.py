import os
from pathlib import Path
from typing import List

import chromadb
import pdfplumber
from openai import OpenAI
from sqlalchemy.orm import Session

from models import File as FileModel

GENAPI_API_KEY = os.getenv("GENAPI_API_KEY", "")
GENAPI_BASE_URL = "https://proxy.gen-api.ru/v1"

# ChromaDB — постоянное хранилище рядом с backend
_chroma_client = chromadb.PersistentClient(path="chroma_db")


def _get_collection():
    """Получить (или создать) коллекцию ChromaDB."""
    return _chroma_client.get_or_create_collection(
        name="study_materials",
        metadata={"hnsw:space": "cosine"},
    )


def _extract_text(filepath: str) -> str:
    """Извлечь текст из PDF или TXT."""
    ext = Path(filepath).suffix.lower()
    if ext == ".pdf":
        text_parts = []
        with pdfplumber.open(filepath) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n".join(text_parts)
    elif ext == ".txt":
        with open(filepath, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    return ""


def _split_text(text: str, chunk_size: int = 1200, overlap: int = 150) -> List[str]:
    """Разбить текст на куски с перекрытием."""
    chunks = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunks.append(text[start:end])
        if end == length:
            break
        start = end - overlap
    return chunks


def index_file(file_id: str, filepath: str, group_id: str, db: Session) -> None:
    """Индексировать файл в ChromaDB и пометить File.indexed = True."""
    text = _extract_text(filepath)
    if not text.strip():
        raise ValueError("File contains no extractable text")

    chunks = _split_text(text)
    collection = _get_collection()

    # Удаляем старые куски для этого файла (если переиндексация)
    existing = collection.get(where={"file_id": file_id})
    if existing["ids"]:
        collection.delete(ids=existing["ids"])

    ids = [f"{file_id}_chunk_{i}" for i in range(len(chunks))]
    metadatas = [
        {"file_id": file_id, "group_id": group_id, "chunk_index": i}
        for i in range(len(chunks))
    ]

    collection.add(documents=chunks, ids=ids, metadatas=metadatas)

    # Ставим indexed = True в БД
    db_file = db.query(FileModel).filter(FileModel.id == file_id).first()
    if db_file:
        db_file.indexed = True
        db_file.index_error = None
        db.commit()


FULL_CONTEXT_CHAR_LIMIT = 12000


def ask_question(question: str, group_id: str, db: Session) -> dict:
    """Найти релевантные куски в ChromaDB и получить ответ от Claude."""
    collection = _get_collection()

    # Если весь материал группы небольшой — отдаём модели его целиком, без
    # потерь от векторного поиска (эмбеддинг-модель по умолчанию плохо
    # ранжирует русский текст и может не найти нужный кусок даже среди топ-N).
    all_chunks = collection.get(where={"group_id": group_id})
    total_chars = sum(len(d) for d in all_chunks["documents"])

    if all_chunks["ids"] and total_chars <= FULL_CONTEXT_CHAR_LIMIT:
        paired = sorted(
            zip(all_chunks["documents"], all_chunks["metadatas"]),
            key=lambda p: (p[1]["file_id"], p[1]["chunk_index"]),
        )
        documents = [doc for doc, _ in paired]
        metadatas = [meta for _, meta in paired]
    else:
        results = collection.query(
            query_texts=[question],
            n_results=20,
            where={"group_id": group_id},
        )
        documents = results["documents"][0] if results["documents"] else []
        metadatas = results["metadatas"][0] if results["metadatas"] else []

    if not documents:
        return {
            "answer": "No indexed materials found for this group. Please upload and index files first.",
            "sources": [],
        }

    # Получаем имена файлов-источников из БД
    file_ids = list({m["file_id"] for m in metadatas})
    db_files = db.query(FileModel).filter(FileModel.id.in_(file_ids)).all()
    filename_by_id = {f.id: f.filename for f in db_files}
    sources = [filename_by_id[fid] for fid in file_ids if fid in filename_by_id]

    # Формируем контекст
    context_parts = []
    for i, (doc, meta) in enumerate(zip(documents, metadatas), 1):
        fname = filename_by_id.get(meta["file_id"], "unknown")
        context_parts.append(f"[{i}] (from file '{fname}'):\n{doc}")
    context = "\n\n".join(context_parts)

    prompt = (
        "You are a helpful study assistant. Answer the student's question "
        "using ONLY the provided context, but be thorough and detailed — use "
        "every relevant fact from the context, not just a short summary. If the "
        "context doesn't contain enough information, say so. Respond in the "
        "same language as the question.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}"
    )

    client = OpenAI(base_url=GENAPI_BASE_URL, api_key=GENAPI_API_KEY)
    completion = client.chat.completions.create(
        model="claude-haiku-4-5",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    answer = completion.choices[0].message.content or "No response from model."

    return {"answer": answer, "sources": sources}
