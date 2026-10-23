import getpass
from sqlalchemy.exc import IntegrityError
from backend.database import SessionLocal
from backend.app.models import User
from backend.app.services.auth import hash_password

def main():
    print("\n========== CREATE TEST FIELD WORKER ==========")

    name = input("Worker full name: ").strip()
    email = input("Worker email: ").strip().lower()
    phone = input("Phone (press Enter to skip): ").strip() or None
    password = getpass.getpass("Set password (minimum 12 characters): ")

    if len(name) < 2:
        print("Name must contain at least 2 characters.")
        return

    if len(password) < 12 or len(password) > 128:
        print("Password must be between 12 and 128 characters.")
        return

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            print("That email already exists. No changes made.")
            return

        if phone and db.query(User).filter(User.phone == phone).first():
            print("That phone number already exists. No changes made.")
            return

        worker = User(
            full_name=name,
            email=email,
            phone=phone,
            password_hash=hash_password(password),
            role="worker",
            phone_verified=False,
            identity_status="unverified",
            is_active=True,
        )

        db.add(worker)
        db.commit()
        db.refresh(worker)

        print("\nWorker created successfully!")
        print(f"Worker ID: FW-{worker.id:03d}")
        print(f"Name: {worker.full_name}")
        print(f"Email: {worker.email}")
        print("Role: worker")
        print("Active: True")
    except IntegrityError:
        db.rollback()
        print("A duplicate account detail prevented creation. No changes saved.")
    finally:
        db.close()

if __name__ == "__main__":
    main()
