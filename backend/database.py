from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from SQL import Base

DATABASE_URL = "sqlite:///./crm.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


if __name__ == "__main__":
    create_db()
    print("Database tables created: crm.db")
