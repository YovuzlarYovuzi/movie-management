import json

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from users.models import Profile


SHOP_ITEMS = [
    {"id": "classic", "type": "skin", "name": "Classic Knight", "cost": 0, "tint": None},
    {"id": "neo_cyan", "type": "skin", "name": "Neo Cyan", "cost": 40, "tint": 0x00E5FF},
    {"id": "pink_void", "type": "skin", "name": "Pink Void", "cost": 70, "tint": 0xFF2BD6},
    {"id": "gold_legend", "type": "skin", "name": "Gold Legend", "cost": 110, "tint": 0xFFC300},
    {"id": "shadow_lord", "type": "skin", "name": "Shadow Lord", "cost": 160, "tint": 0x1F1F2A},
    {"id": "shinobi_blue", "type": "skin", "name": "Shinobi Blue", "cost": 140, "tint": 0x00E5FF},
    {"id": "katana_1", "type": "weapon", "name": "Katana I (+3% dmg)", "cost": 60, "damage_mult": 1.03},
    {"id": "katana_2", "type": "weapon", "name": "Katana II (+6% dmg)", "cost": 140, "damage_mult": 1.06},
    {"id": "katana_3", "type": "weapon", "name": "Katana III (+10% dmg)", "cost": 260, "damage_mult": 1.10},
    {"id": "skill_scroll_1", "type": "skill", "name": "Skill Scroll I (+6% skill)", "cost": 80, "skill_mult": 1.06},
    {"id": "skill_scroll_2", "type": "skill", "name": "Skill Scroll II (+12% skill)", "cost": 170, "skill_mult": 1.12},
    {"id": "skill_scroll_3", "type": "skill", "name": "Skill Scroll III (+18% skill)", "cost": 300, "skill_mult": 1.18},
]

from django.conf import settings


# Server-side toggle: set `GAME_ENABLED = False` in Django settings to disable the game.
def _game_enabled() -> bool:
    return bool(getattr(settings, "GAME_ENABLED", True))


def _get_profile(user) -> Profile:
    profile, _ = Profile.objects.get_or_create(user=user)
    return profile


def _is_mobile(user_agent: str) -> bool:
    if not user_agent:
        return False
    ua = user_agent.lower()
    return any(token in ua for token in ("android", "iphone", "ipad", "ipod", "mobile"))


def _shop_items() -> list[dict]:
    return list(SHOP_ITEMS)


def _shop_snapshot(profile: Profile) -> dict:
    return {
        "ok": True,
        "items": _shop_items(),
        "owned_skins": profile.owned_skins or [],
        "active_skin": profile.active_skin,
        "damage_multiplier": profile.damage_multiplier,
        "skill_multiplier": profile.skill_multiplier,
        "hp": profile.hp,
    }


@ensure_csrf_cookie
@login_required(login_url="/accounts/login/")
def battle_arena(request):
    profile = _get_profile(request.user)
    # Render the battle page but disable entering the battle; shop and rating endpoints remain available.
    return render(
        request,
        "pages/battle.html",
        {
            "is_mobile": _is_mobile(request.META.get("HTTP_USER_AGENT", "")),
            "battle_disabled": True,
        },
    )


@ensure_csrf_cookie
@login_required(login_url="/accounts/login/")
def mortal_kombat_arena(request):
    profile = _get_profile(request.user)
    # Note: ban checks removed — users are not blocked here.
    return render(
        request,
        "pages/mk-battle.html",
        {
            "is_mobile": _is_mobile(request.META.get("HTTP_USER_AGENT", "")),
            "battle_disabled": False,
        },
    )


@require_GET
@login_required(login_url="/accounts/login/")
def player_data(request):
    profile = _get_profile(request.user)
    return JsonResponse(
        {
            "username": request.user.username,
            "hp": profile.hp,
            "battle_rating": profile.battle_rating,
            "boss_progress": profile.boss_progress,
            # ban flags removed from API response
            "active_skin": profile.active_skin,
            "owned_skins": profile.owned_skins,
            "damage_multiplier": profile.damage_multiplier,
            "skill_multiplier": profile.skill_multiplier,
        }
    )


@require_GET
@login_required(login_url="/accounts/login/")
def battle_shop(request):
    profile = _get_profile(request.user)
    return JsonResponse(_shop_snapshot(profile))


@require_POST
@login_required(login_url="/accounts/login/")
def battle_buy(request):
    profile = _get_profile(request.user)
    # ban enforcement removed for purchases

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"ok": False, "error": "invalid_json"}, status=400)

    item_id = str(payload.get("itemId") or "").strip()
    if not item_id:
        return JsonResponse({"ok": False, "error": "missing_item"}, status=400)

    items = {i["id"]: i for i in _shop_items()}
    item = items.get(item_id)
    if not item:
        return JsonResponse({"ok": False, "error": "unknown_item"}, status=404)

    if item["type"] == "skin" and (item_id == "classic" or item_id in (profile.owned_skins or [])):
        return JsonResponse({"ok": False, "error": "already_owned"}, status=400)

    if item["type"] == "weapon":
        next_mult = float(item.get("damage_mult") or 1.0)
        if float(profile.damage_multiplier or 1.0) >= next_mult:
            return JsonResponse({"ok": False, "error": "already_upgraded"}, status=400)

    if item["type"] == "skill":
        next_mult = float(item.get("skill_mult") or 1.0)
        if float(profile.skill_multiplier or 1.0) >= next_mult:
            return JsonResponse({"ok": False, "error": "already_upgraded"}, status=400)

    cost = int(item.get("cost") or 0)
    if cost > int(profile.hp):
        return JsonResponse({"ok": False, "error": "not_enough_hp"}, status=400)

    update_fields = {"hp", "updated_at"}
    if item["type"] == "skin":
        owned = set(profile.owned_skins or [])
        owned.add(item_id)
        profile.owned_skins = sorted(owned)
        update_fields.add("owned_skins")
    elif item["type"] == "weapon":
        profile.damage_multiplier = float(item.get("damage_mult") or profile.damage_multiplier)
        update_fields.add("damage_multiplier")
    elif item["type"] == "skill":
        profile.skill_multiplier = float(item.get("skill_mult") or profile.skill_multiplier)
        update_fields.add("skill_multiplier")

    profile.hp = int(profile.hp) - cost
    profile.save(update_fields=sorted(update_fields))
    return JsonResponse({"ok": True, "shop": _shop_snapshot(profile), "new_hp": profile.hp})


@require_POST
@login_required(login_url="/accounts/login/")
def battle_equip(request):
    profile = _get_profile(request.user)
    # ban enforcement removed for equip

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"ok": False, "error": "invalid_json"}, status=400)

    skin_id = str(payload.get("skinId") or "").strip()
    if not skin_id:
        return JsonResponse({"ok": False, "error": "missing_skin"}, status=400)

    if skin_id != "classic" and skin_id not in (profile.owned_skins or []):
        return JsonResponse({"ok": False, "error": "not_owned"}, status=400)

    profile.active_skin = None if skin_id == "classic" else skin_id
    profile.save(update_fields=["active_skin", "updated_at"])

    # Return updated shop snapshot for UI refresh.
    return JsonResponse({"ok": True, "shop": _shop_snapshot(profile)})


@require_GET
@login_required(login_url="/accounts/login/")
def battle_leaderboard(request):
    qs = Profile.objects.select_related("user").order_by("-battle_rating", "-hp", "user__username")[:50]
    profiles = [
        {"username": p.user.username, "battle_rating": p.battle_rating, "hp": p.hp, "boss_progress": p.boss_progress}
        for p in qs
    ]
    return JsonResponse({"ok": True, "profiles": profiles})


@require_GET
@login_required(login_url="/accounts/login/")
def battle_multiplayer_demo(request):
    if not GAME_ENABLED:
        return JsonResponse({"ok": False, "error": "game_disabled", "message": "Battle multiplayer disabled."}, status=410)

    return JsonResponse(
        {
            "ok": False,
            "demo": True,
            "message": "Multiplayer demo is not enabled yet.",
        }
    )


@require_POST
@login_required(login_url="/accounts/login/")
def battle_result(request):
    profile = _get_profile(request.user)
    # ban enforcement removed for results
    if not GAME_ENABLED:
        return JsonResponse({"ok": False, "error": "game_disabled", "message": "Battle multiplayer disabled."}, status=410)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"ok": False, "error": "invalid_json"}, status=400)

    boss_id = int(payload.get("bossId", 0) or 0)
    victory = bool(payload.get("victory", False))
    device = (payload.get("device") or "unknown").lower()
    duration_ms = int(payload.get("durationMs", 0) or 0)

    # Rewards (simplified): victory gives more, plus small time bonus.
    base_reward = 12 if victory else 3
    time_bonus = 3 if victory and duration_ms and duration_ms < 90_000 else 0
    hp_reward = base_reward + time_bonus

    rating_change = 15 if victory else 5

    if device == "pc":
        hp_reward = int(round(hp_reward * 1.2))

    # Apply updates.
    profile.hp = int(profile.hp) + int(hp_reward)
    profile.battle_rating = int(profile.battle_rating) + int(rating_change)
    if victory and boss_id >= int(profile.boss_progress):
        profile.boss_progress = int(boss_id) + 1
    profile.save(update_fields=["hp", "battle_rating", "boss_progress", "updated_at"])

    return JsonResponse(
        {
            "ok": True,
            "hp_reward": hp_reward,
            "rating_change": rating_change,
            "new_hp": profile.hp,
            "new_battle_rating": profile.battle_rating,
            "boss_progress": profile.boss_progress,
        }
    )


@require_POST
@login_required(login_url="/accounts/login/")
def mortal_kombat_result(request):
    profile = _get_profile(request.user)
    # ban enforcement removed for Mortal Kombat results
    if not GAME_ENABLED:
        return JsonResponse({"ok": False, "error": "game_disabled"}, status=410)

    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except Exception:
        return JsonResponse({"ok": False, "error": "invalid_json"}, status=400)

    victory = bool(payload.get("victory", False))
    device = (payload.get("device") or "unknown").lower()
    duration_ms = int(payload.get("durationMs", 0) or 0)

    hp_reward = 10 if victory else 3
    if victory and duration_ms and duration_ms < 75_000:
        hp_reward += 3

    rating_change = 12 if victory else 4

    if device == "pc":
        hp_reward = int(round(hp_reward * 1.2))

    profile.hp = int(profile.hp) + int(hp_reward)
    profile.battle_rating = int(profile.battle_rating) + int(rating_change)
    profile.save(update_fields=["hp", "battle_rating", "updated_at"])

    return JsonResponse(
        {
            "ok": True,
            "hp_reward": hp_reward,
            "rating_change": rating_change,
            "new_hp": profile.hp,
            "new_battle_rating": profile.battle_rating,
            "boss_progress": profile.boss_progress,
        }
    )
