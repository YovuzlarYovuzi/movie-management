LANGUAGE_OPTIONS = [
    {"code": "uz", "label": "O'zbek"},
    {"code": "ru", "label": "Русский"},
    {"code": "en", "label": "English"},
    {"code": "ja", "label": "日本語"},
    {"code": "ko", "label": "한국어"},
]

THEME_OPTIONS = [
    {"code": "midnight", "label": "Midnight"},
    {"code": "light", "label": "Pearl"},
    {"code": "crimson", "label": "Crimson"},
    {"code": "gold", "label": "Gold"},
    {"code": "ocean", "label": "Ocean"},
    {"code": "emerald", "label": "Emerald"},
]

AVATAR_ITEMS = [
    {"id": "default_ember", "type": "avatar", "name": "Ember", "cost": 0, "icon": "fa-fire", "palette": "ember"},
    {"id": "kitsune", "type": "avatar", "name": "Kitsune", "cost": 40, "icon": "fa-mask", "palette": "crimson"},
    {"id": "ronin", "type": "avatar", "name": "Ronin", "cost": 65, "icon": "fa-khanda", "palette": "ocean"},
    {"id": "luna", "type": "avatar", "name": "Luna", "cost": 75, "icon": "fa-moon", "palette": "violet"},
    {"id": "zen", "type": "avatar", "name": "Zen", "cost": 95, "icon": "fa-leaf", "palette": "emerald"},
]

BADGE_ITEMS = [
    {"id": "spark", "type": "badge", "name": "Spark Badge", "cost": 30, "label": "SPARK"},
    {"id": "sensei", "type": "badge", "name": "Sensei Badge", "cost": 85, "label": "SENSEI"},
    {"id": "otaku", "type": "badge", "name": "Otaku Badge", "cost": 120, "label": "OTAKU"},
]

NAME_STYLE_ITEMS = [
    {"id": "classic", "type": "name_style", "name": "Classic Nick", "cost": 0, "class_name": "name-style-classic"},
    {"id": "premium_glow", "type": "name_style", "name": "Premium Glow", "cost": 70, "class_name": "name-style-glow"},
    {"id": "gold_foil", "type": "name_style", "name": "Gold Foil", "cost": 100, "class_name": "name-style-gold"},
    {"id": "ice_wave", "type": "name_style", "name": "Ice Wave", "cost": 115, "class_name": "name-style-ice"},
]

SHOP_ITEMS = AVATAR_ITEMS + BADGE_ITEMS + NAME_STYLE_ITEMS

DEFAULT_LANGUAGE = "uz"
DEFAULT_THEME = "midnight"
DEFAULT_AVATAR = "default_ember"
DEFAULT_NAME_STYLE = "classic"

TRANSLATIONS = {
    "brand_tagline": {
        "uz": "Anime, klub va o'yinlar bir joyda",
        "ru": "Аниме, клуб и игры в одном месте",
        "en": "Anime, club, and games in one place",
        "ja": "アニメとクラブとゲームを一つに",
        "ko": "애니메이션과 클럽과 게임을 한곳에",
    },
    "nav_home": {"uz": "Bosh sahifa", "ru": "Главная", "en": "Home", "ja": "ホーム", "ko": "홈"},
    "nav_leaderboard": {"uz": "Reyting", "ru": "Рейтинг", "en": "Leaderboard", "ja": "ランキング", "ko": "랭킹"},
    "nav_genres": {"uz": "Janrlar", "ru": "Жанры", "en": "Genres", "ja": "ジャンル", "ko": "장르"},
    "nav_club": {"uz": "Club", "ru": "Клуб", "en": "Club", "ja": "クラブ", "ko": "클럽"},
    "nav_shop": {"uz": "Shop", "ru": "Магазин", "en": "Shop", "ja": "ショップ", "ko": "상점"},
    "nav_profile": {"uz": "Hisob", "ru": "Профиль", "en": "Profile", "ja": "プロフィール", "ko": "프로필"},
    "nav_logout": {"uz": "Chiqish", "ru": "Выход", "en": "Logout", "ja": "ログアウト", "ko": "로그아웃"},
    "nav_login": {"uz": "Kirish", "ru": "Вход", "en": "Login", "ja": "ログイン", "ko": "로그인"},
    "nav_register": {"uz": "Ro'yhatdan o'tish", "ru": "Регистрация", "en": "Register", "ja": "登録", "ko": "회원가입"},
    "nav_search": {"uz": "Qidiruv", "ru": "Поиск", "en": "Search", "ja": "検索", "ko": "검색"},
    "nav_language": {"uz": "Til", "ru": "Язык", "en": "Language", "ja": "言語", "ko": "언어"},
    "nav_theme": {"uz": "Rang", "ru": "Тема", "en": "Theme", "ja": "テーマ", "ko": "테마"},
    "hero_browse": {"uz": "Janr tanlang, qidiruv qiling, ko'rishni boshlang", "ru": "Выберите жанр, найдите и начните смотреть", "en": "Choose a genre, search, and start watching", "ja": "ジャンルを選んで検索し、視聴を始めましょう", "ko": "장르를 고르고 검색해서 시청을 시작하세요"},
    "top_rating": {"uz": "Top Reyting", "ru": "Топ рейтинг", "en": "Top Ranking", "ja": "トップランキング", "ko": "상위 랭킹"},
    "show_all": {"uz": "Barchasi", "ru": "Все", "en": "Show all", "ja": "すべて", "ko": "전체"},
    "more": {"uz": "Ko'proq", "ru": "Больше", "en": "More", "ja": "もっと見る", "ko": "더보기"},
    "profile_greeting": {"uz": "AniClass hisobingiz shu yerda.", "ru": "Ваш аккаунт AniClass здесь.", "en": "Your AniClass account lives here.", "ja": "AniClassアカウントはここです。", "ko": "AniClass 계정이 여기에 있습니다."},
    "leaderboard_desc": {"uz": "Eng kuchli va eng faol foydalanuvchilar", "ru": "Самые сильные и активные пользователи", "en": "Strongest and most active users", "ja": "最も強く活動的なユーザー", "ko": "가장 강하고 활동적인 사용자"},
    "footer_hiring": {"uz": "Bizga dayberlar kerak", "ru": "Нам нужны дабберы", "en": "We need dubbers", "ja": "吹き替えメンバー募集中", "ko": "더빙 멤버 모집 중"},
    "footer_contact": {"uz": "Bog'lanish", "ru": "Связь", "en": "Contact", "ja": "連絡先", "ko": "연락처"},
    "footer_notice": {"uz": "Eslatma", "ru": "Примечание", "en": "Notice", "ja": "注意", "ko": "안내"},
    "club_title": {"uz": "Strategy Club", "ru": "Strategy Club", "en": "Strategy Club", "ja": "Strategy Club", "ko": "Strategy Club"},
    "club_desc": {"uz": "Shahmat va shashkada AI bilan o'ynang, HP va status to'plang", "ru": "Играйте в шахматы и шашки против ИИ, зарабатывайте HP и статус", "en": "Play chess and checkers against AI and earn HP and status", "ja": "チェスとチェッカーをAIと対戦し、HPとステータスを獲得", "ko": "체스와 체커를 AI와 플레이하고 HP와 상태를 획득하세요"},
    "club_chess": {"uz": "Shahmat", "ru": "Шахматы", "en": "Chess", "ja": "チェス", "ko": "체스"},
    "club_checkers": {"uz": "Shashka", "ru": "Шашки", "en": "Checkers", "ja": "チェッカー", "ko": "체커"},
    "club_reset": {"uz": "Qayta boshlash", "ru": "Сброс", "en": "Reset", "ja": "リセット", "ko": "리셋"},
    "club_shop": {"uz": "HP Shop", "ru": "HP магазин", "en": "HP Shop", "ja": "HPショップ", "ko": "HP 상점"},
    "club_status": {"uz": "Status", "ru": "Статус", "en": "Status", "ja": "ステータス", "ko": "상태"},
    "club_level": {"uz": "Daraja", "ru": "Уровень", "en": "Level", "ja": "レベル", "ko": "레벨"},
    "club_result": {"uz": "Natija", "ru": "Результат", "en": "Result", "ja": "結果", "ko": "결과"},
    "shop_title": {"uz": "Profile Shop", "ru": "Магазин профиля", "en": "Profile Shop", "ja": "プロフィールショップ", "ko": "프로필 상점"},
    "shop_desc": {"uz": "HP evaziga avatar, badge va premium nick style sotib oling", "ru": "Покупайте аватары, бейджи и стили ника за HP", "en": "Buy avatars, badges, and premium nick styles with HP", "ja": "HPでアバター、バッジ、プレミアム名札スタイルを購入", "ko": "HP로 아바타, 배지, 프리미엄 닉 스타일을 구매하세요"},
    "shop_buy": {"uz": "Sotib olish", "ru": "Купить", "en": "Buy", "ja": "購入", "ko": "구매"},
    "shop_equip": {"uz": "Yoqish", "ru": "Надеть", "en": "Equip", "ja": "装備", "ko": "장착"},
    "shop_owned": {"uz": "Sizniki", "ru": "Ваше", "en": "Owned", "ja": "所持済み", "ko": "보유"},
    "shop_active": {"uz": "Faol", "ru": "Активно", "en": "Active", "ja": "使用中", "ko": "사용 중"},
    "games_retired": {"uz": "Eski arena o'yinlari vaqtincha o'chirilgan", "ru": "Старые арена-игры временно отключены", "en": "Legacy arena games are temporarily disabled", "ja": "旧アリーナゲームは一時停止中です", "ko": "기존 아레나 게임은 일시적으로 비활성화되었습니다"},
}


def get_shop_item(item_id):
    for item in SHOP_ITEMS:
        if item["id"] == item_id:
            return item
    return None


def translate(key, language):
    item = TRANSLATIONS.get(key, {})
    return item.get(language) or item.get(DEFAULT_LANGUAGE) or key


def resolve_status(rating):
    value = int(rating or 0)
    if value >= 3200:
        return "Mythic"
    if value >= 2500:
        return "Legend"
    if value >= 1900:
        return "Diamond"
    if value >= 1450:
        return "Gold"
    if value >= 1100:
        return "Silver"
    return "Bronze"


def resolve_level(profile):
    hp = int(getattr(profile, "hp", 0) or 0)
    wins = int(getattr(profile, "wins", 0) or 0)
    return max(1, 1 + wins // 3 + hp // 90)


def avatar_meta(avatar_id):
    return get_shop_item(avatar_id) or get_shop_item(DEFAULT_AVATAR)


def name_style_meta(style_id):
    return get_shop_item(style_id) or get_shop_item(DEFAULT_NAME_STYLE)
