from collections.abc import Callable

from fastapi import Depends, HTTPException, status

from backend.app.api.auth import get_current_user
from backend.app.models import User


def require_roles(*allowed_roles: str) -> Callable:
    """
    Require an authenticated, active user whose role is explicitly allowed.
    Example: Depends(require_roles("admin"))
    """
    normalized_roles = {
        role.strip().lower()
        for role in allowed_roles
        if role.strip()
    }

    if not normalized_roles:
        raise ValueError("At least one allowed role must be specified.")

    def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        user_role = (current_user.role or "").strip().lower()

        if user_role not in normalized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )

        return current_user

    return role_checker
