import os
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import StoredFile


def store_file(db: Session, path: str, content: bytes) -> None:
    """Keep a copy of an uploaded file in the shared database, so every laptop can open it."""
    db.add(StoredFile(path=path, content=content))

def restore_file(db: Session, path: str) -> bool:
    """Make sure the file is on this laptop: if it is missing, copy it down from the database.
    Returns False only when the file is nowhere to be found."""
    if os.path.exists(path):
        return True
    stored = db.query(StoredFile).filter(StoredFile.path == path).first()
    if not stored:
        return False
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "wb") as f:
        f.write(stored.content)
    return True

def delete_stored_file(db: Session, path: str) -> None:
    db.query(StoredFile).filter(StoredFile.path == path).delete()
