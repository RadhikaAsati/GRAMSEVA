from getpass import getpass

from sqlalchemy.exc import IntegrityError

from backend.app.database import SessionLocal
from backend.app.models import User
from backend.app.services.auth import hash_password


def main():
    name = input("Admin full name: ").strip()
    email = input("Admin email: ").strip().lower()
    password = getpass("Choose admin password: ")
    confirm_password = getpass("Confirm admin password: ")

    if not name or not email:
        print("Name and email are required.")
        return

    if len(password) < 12:
        print("Use a password with at least 12 characters.")
        return

    if password != confirm_password:
        print("Passwords do not match.")
        return

    db = SessionLocal()

    try:
        existing_user = db.query(User).filter(User.email == email).first()

        if existing_user:
            print(
                f"An account already exists for {email}. "
                "No changes were made."
            )
            return

        admin = User(
            full_name=name,
            email=email,
            password_hash=hash_password(password),
            role="admin",
            is_active=True,
            phone_verified=False,
            identity_status="unverified",
        )

        db.add(admin)
        db.commit()
        db.refresh(admin)

        print("\nAdmin account created successfully!")
        print(f"Admin ID: {admin.id}")
        print(f"Email: {admin.email}")
        print(f"Role: {admin.role}")
        print("Now log in using the email and password you selected.")

    except IntegrityError:
        db.rollback()
        print("The account could not be created because of a database conflict.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
