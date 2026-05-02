def user_context(request):
    if not getattr(request, "user", None) or not request.user.is_authenticated:
        return {"user_profile": None, "user_status": None, "user_level": None}

    profile = getattr(request.user, "profile", None)
    if not profile:
        return {"user_profile": None, "user_status": None, "user_level": None}

    rating = int(getattr(profile, "battle_rating", 1000) or 0)
    if rating >= 3000:
        status = "Legend"
    elif rating >= 2200:
        status = "Diamond"
    elif rating >= 1700:
        status = "Gold"
    elif rating >= 1300:
        status = "Silver"
    else:
        status = "Bronze"

    level = int(getattr(profile, "boss_progress", 0) or 0) + 1
    return {"user_profile": profile, "user_status": status, "user_level": level}
