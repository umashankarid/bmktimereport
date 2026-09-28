"""Live tournament tracking - scrapes match data from
badmintonsweden.tournamentsoftware.com.

Ported from the badmintonScrapPython project. Provides:
- get_current_tournaments(db): tournaments happening today (with parsed GUID)
- get_live_matches(tournament_id, date): parsed live/done/upcoming matches
"""
import re
import logging
from datetime import datetime

import requests

logger = logging.getLogger(__name__)

TS_BASE = "https://badmintonsweden.tournamentsoftware.com"


def parse_guid_from_url(url):
    """Extract the tournamentsoftware GUID from a tournament URL."""
    if not url:
        return ""
    m = re.search(r'/tournament/([0-9A-Fa-f-]{36})', url) or re.search(r'id=([A-Fa-f0-9-]+)', url)
    return m.group(1) if m else ""


def get_current_tournaments(db):
    """Return tournaments happening today (today within start/end date),
    including the parsed tournamentsoftware GUID for live lookups.

    Args:
        db: DatabaseManager instance.

    Returns:
        dict: {'success': bool, 'tournaments': [...]}
    """
    today = datetime.now().strftime("%Y-%m-%d")
    try:
        result = db.get_tournaments()
        if not result['success']:
            return {'success': False, 'tournaments': [], 'error': 'Could not load tournaments'}

        tournaments = []
        for t in result['data']:
            start_d = (t.get('Start Date') or '').strip()
            end_d = (t.get('End Date') or '').strip()
            if not start_d:
                continue
            end_d = end_d or start_d  # single-day fallback
            if start_d <= today <= end_d:
                url = t.get('Tournament URL', '') or ''
                guid = parse_guid_from_url(url)
                tournaments.append({
                    'name': t.get('Tournament Name', ''),
                    'url': url,
                    'tournament_id': guid,
                    'location': t.get('Venue', ''),
                    'date_start': start_d,
                    'date_end': end_d,
                })
        return {'success': True, 'tournaments': tournaments}
    except Exception as e:
        logger.error(f"Error fetching current tournaments: {e}")
        return {'success': False, 'tournaments': [], 'error': str(e)}


def _normalize_name(name):
    """Normalize a player name for comparison ('Lastname, Firstname' or 'Firstname Lastname')."""
    if not name:
        return ""
    name = name.strip()
    if "," in name:
        parts = [p.strip() for p in name.split(",")]
        if len(parts) == 2:
            name = parts[1] + " " + parts[0]
    return " ".join(name.lower().split())


def get_live_matches(tournament_id, req_date="", komet_names=None):
    """Scrape a tournament's Matches page: done, ongoing and upcoming matches
    with court + duration, players, score and status.

    Args:
        tournament_id (str): The tournamentsoftware GUID.
        req_date (str): Optional YYYYMMDD to fetch a specific day.
        komet_names (list): Optional list of Komet player names to flag matches.

    Returns:
        dict: {'success': bool, 'matches': [...], 'days': [...], 'selected_day': str}
    """
    tournament_id = (tournament_id or "").strip()
    req_date = (req_date or "").strip()
    komet_set = set(_normalize_name(n) for n in (komet_names or []) if n)
    if not tournament_id:
        return {'success': False, 'error': 'No tournament ID', 'matches': []}

    try:
        from bs4 import BeautifulSoup
        s = requests.Session()
        s.headers.update({"User-Agent": "Mozilla/5.0"})
        # Accept the cookie wall first
        s.post(f"{TS_BASE}/cookiewall/Save", data={
            "ReturnUrl": "/", "SettingsOpen": "false", "CookieWallCategoryPreferences": "1,2,3"
        }, allow_redirects=True, timeout=8)

        base = f"{TS_BASE}/tournament/{tournament_id}"

        # 1) Discover available day dates
        index_resp = s.get(base + "/matches", timeout=25)
        available_days = sorted(set(re.findall(r"/matches/(\d{8})", index_resp.text)))

        # 2) Decide which day to fetch
        selected_day = ""
        if req_date and req_date in available_days:
            selected_day = req_date
        elif available_days:
            today_compact = datetime.now().strftime("%Y%m%d")
            selected_day = today_compact if today_compact in available_days else available_days[-1]

        # 3) Fetch the chosen day's page
        if selected_day:
            resp = s.get(f"{base}/matches/{selected_day}", timeout=25)
        else:
            resp = index_resp
        soup = BeautifulSoup(resp.text, "html.parser")

        today_compact = datetime.now().strftime("%Y%m%d")
        is_today_page = (selected_day == today_compact) or (not selected_day)

        # Komet club id on tournamentsoftware pages (BMK Komet = 3 in this tournament,
        # but detection also falls back to name matching for robustness).
        KOMET_CLUB_IDS = {"3"}

        matches = []
        # The matches page groups matches under time headers:
        #   <li class="match-group__item">
        #     <div class="match-group__wrapper">
        #       <h5 class="match-group__header">09:00</h5>
        #       <ol class="match-group"> <li> <div class="match ..."> ... </ol>
        # Iterate only the wrappers that carry a time header (avoids double-counting
        # the nested match-group that also matches a generic selector).
        seen_matches = set()
        for wrapper in soup.select(".match-group__wrapper"):
            header = wrapper.select_one(".match-group__header")
            if not header:
                continue
            group_time = header.get_text(strip=True)
            tm = re.search(r"(\d{1,2}:\d{2})", group_time)
            group_time = tm.group(1) if tm else group_time

            for m in wrapper.select(".match"):
                # De-dupe in case of nested structures
                mid = id(m)
                if mid in seen_matches:
                    continue
                seen_matches.add(mid)

                header_items = m.select(".match__header-title-item .nav-link__value")
                event = header_items[0].get_text(strip=True) if header_items else ""
                round_name = header_items[1].get_text(strip=True) if len(header_items) > 1 else ""

                # Court / duration / now-playing from aside blocks (present when scheduled/live)
                now_playing = False
                court = ""
                duration = ""
                court_assigned = False
                for ab in m.select("span.match__header-aside-block"):
                    t = (ab.get("title") or ab.get("data-original-title") or "").strip()
                    if not t:
                        continue
                    if t.lower() in ("now playing", "spelas nu", "pågår"):
                        now_playing = True
                        continue
                    if "|" in t:
                        left, right = t.split("|", 1)
                        dm = re.search(r"(\d+\s*m)", left)
                        duration = dm.group(1).replace(" ", "") if dm else left.replace("Spelperiod:", "").strip()
                        court = right.strip()
                    else:
                        court = t
                    if re.search(r"\s-\s\d+\s*$", court):
                        court_assigned = True

                # Teams: each .match__row is one side; players are the nav-link values.
                # Also collect club ids to detect Komet involvement.
                teams = []
                team_won = []
                all_player_names = []
                club_ids = set()
                for row in m.select(".match__row"):
                    names = [el.get_text(strip=True) for el in row.select(".nav-link__value") if el.get_text(strip=True)]
                    # strip seeding markers like [1], [3/4], [WC]
                    names = [re.sub(r"\s*\[[^\]]*\]\s*$", "", n).strip() for n in names]
                    all_player_names.extend(names)
                    for a in row.select("a[data-club-id]"):
                        cid = a.get("data-club-id")
                        if cid:
                            club_ids.add(str(cid))
                    teams.append(" / ".join(names) if names else "")
                    team_won.append("has-won" in (row.get("class") or []))

                team1 = teams[0] if teams else ""
                team2 = teams[1] if len(teams) > 1 else ""
                team1_won = team_won[0] if team_won else False
                has_winner = any(team_won)

                # Komet detection: club id match OR name match (fallback)
                has_komet = bool(club_ids & KOMET_CLUB_IDS)
                komet_names = []
                if komet_set:
                    for n in all_player_names:
                        if _normalize_name(n) in komet_set:
                            has_komet = True
                            komet_names.append(n)

                # Score
                score_sets = []
                for pts in m.select("ul.points"):
                    cells = pts.select("li.points__cell")
                    if len(cells) == 2:
                        score_sets.append(f"{cells[0].get_text(strip=True)}-{cells[1].get_text(strip=True)}")
                score = " ".join(score_sets)
                status_tags = [t.get_text(strip=True) for t in m.select(".match__status") if t.get_text(strip=True)]
                status_text = " ".join(status_tags)
                if not score and has_winner:
                    score = status_text or "W.O."

                # Status: done if score/winner; ongoing if now-playing/court assigned; else upcoming
                if score_sets or has_winner:
                    status = "done"
                elif now_playing or court_assigned:
                    status = "ongoing"
                else:
                    status = "upcoming"

                # Skip placeholder matches (e.g. "Pool A #1" vs "Pool B #2" with no real players)
                is_placeholder = bool(re.search(r"Pool\s|#\d", team1 + team2)) and not all_player_names
                if is_placeholder:
                    continue

                if event or team1 or team2:
                    matches.append({
                        "event": event, "round": round_name,
                        "court": court, "duration": duration, "time": group_time,
                        "team1": team1, "team2": team2, "team1_won": team1_won,
                        "score": score, "status": status, "has_komet": has_komet,
                        "komet_names": komet_names,
                    })

        return {
            'success': True,
            'matches': matches,
            'days': available_days,
            'selected_day': selected_day
        }
    except Exception as e:
        logger.error(f"❌ Error fetching live matches: {e}")
        return {'success': False, 'error': str(e), 'matches': []}


def get_komet_players(tournament_id, club_filter="komet"):
    """Scrape a tournament's player list and return players whose club matches
    the club_filter (default 'komet', case-insensitive substring match).

    Args:
        tournament_id (str): The tournamentsoftware GUID.
        club_filter (str): Club name substring to match (default 'komet').

    Returns:
        dict: {'success': bool, 'players': [{'name','club','player_id'}]}
    """
    tournament_id = (tournament_id or "").strip()
    if not tournament_id:
        return {'success': False, 'error': 'No tournament ID', 'players': []}

    try:
        from bs4 import BeautifulSoup
        s = requests.Session()
        s.headers.update({"User-Agent": "Mozilla/5.0"})
        s.post(f"{TS_BASE}/cookiewall/Save", data={
            "ReturnUrl": "/", "SettingsOpen": "false", "CookieWallCategoryPreferences": "1,2,3"
        }, allow_redirects=True, timeout=8)

        url = f"{TS_BASE}/tournament/{tournament_id}/Players/GetPlayersContent"
        resp = s.get(url, headers={"X-Requested-With": "XMLHttpRequest"}, timeout=20)
        soup = BeautifulSoup(resp.text, "html.parser")

        players = []
        for item in soup.select("li"):
            name_el = item.select_one("a")
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            if not name or len(name) < 3:
                continue
            href = name_el.get("href", "")
            pid_match = re.search(r"player=(\d+)", href)
            player_id = pid_match.group(1) if pid_match else ""
            all_text = [t.strip() for t in item.get_text(separator="|", strip=True).split("|") if t.strip()]
            club = ""
            for t in all_text:
                if t != name and len(t) > 2 and not t.startswith("("):
                    club = t
                    break
            players.append({"name": name, "club": club, "player_id": player_id})

        # Filter by club and deduplicate by name
        cf = (club_filter or "").lower()
        seen = set()
        komet_players = []
        for p in players:
            if cf and cf not in (p["club"] or "").lower():
                continue
            if p["name"] in seen:
                continue
            seen.add(p["name"])
            komet_players.append(p)

        return {'success': True, 'players': komet_players}
    except Exception as e:
        logger.error(f"❌ Error fetching komet players: {e}")
        return {'success': False, 'error': str(e), 'players': []}


def search_open_tournaments(days_ahead=28):
    """Search badmintonsweden for upcoming tournaments from today to `days_ahead`
    days out (default 4 weeks). Returns name, url, location, and dates.

    Includes all upcoming tournaments in the window regardless of registration
    status (so events whose registration has closed still appear).

    Returns:
        dict: {'success': bool, 'tournaments': [{'name','url','location','date_start','date_end'}]}
    """
    try:
        from bs4 import BeautifulSoup
        from datetime import datetime, timedelta

        s = requests.Session()
        s.headers.update({"User-Agent": "Mozilla/5.0"})
        s.post(f"{TS_BASE}/cookiewall/Save", data={
            "ReturnUrl": "/", "SettingsOpen": "false", "CookieWallCategoryPreferences": "1,2,3"
        }, allow_redirects=True, timeout=8)

        start = datetime.now().strftime("%Y-%m-%dT00:00")
        end = (datetime.now() + timedelta(days=days_ahead)).strftime("%Y-%m-%dT00:00")

        # StatusFilterID=0 = all statuses (not just registration-open) within the date range
        resp = s.get(
            f"{TS_BASE}/find?StatusFilterID=0&DateFilterType=0&StartDate={start}&EndDate={end}&Distance=10&page=1&SportID=2",
            timeout=15
        )
        page_soup = BeautifulSoup(resp.text, "html.parser")
        form = page_soup.select_one("#form_globalsearch")
        form_data = {}
        if form:
            for inp in form.find_all("input"):
                name = inp.get("name", "")
                if name:
                    form_data[name] = inp.get("value", "")

        # StatusFilterID 0 = all statuses; keep the date range to limit to the window
        form_data["TournamentExtendedFilter.StatusFilterID"] = "0"
        form_data["TournamentExtendedFilter.DateFilterType"] = "0"
        form_data["TournamentExtendedFilter.StartDate"] = start
        form_data["TournamentExtendedFilter.EndDate"] = end

        resp = s.post(
            f"{TS_BASE}/find/tournament/DoSearch",
            data=form_data,
            headers={"X-Requested-With": "XMLHttpRequest"},
            timeout=15
        )
        soup = BeautifulSoup(resp.text, "html.parser")

        tournaments = []
        for item in soup.select("li.list__item"):
            link = item.select_one("a.media__link")
            if not link:
                continue
            name = link.get_text(strip=True)
            href = link.get("href", "")
            location_el = item.select_one(".media__subheading .nav-link__value")
            location = location_el.get_text(strip=True) if location_el else ""
            time_els = item.select("time")
            date_start = time_els[0].get("datetime", "")[:10] if time_els else ""
            date_end = time_els[1].get("datetime", "")[:10] if len(time_els) > 1 else ""
            tid_match = re.search(r'id=([A-Fa-f0-9-]+)', href) or re.search(r'/tournament/([0-9A-Fa-f-]{36})', href)
            tournament_url = f"{TS_BASE}/tournament/{tid_match.group(1)}" if tid_match else ""

            if name:
                tournaments.append({
                    "name": name,
                    "url": tournament_url,
                    "location": location,
                    "date_start": date_start,
                    "date_end": date_end or date_start,
                })

        return {'success': True, 'tournaments': tournaments}
    except Exception as e:
        logger.error(f"❌ Error searching open tournaments: {e}")
        return {'success': False, 'error': str(e), 'tournaments': []}


def get_player_matches(tournament_id, player_name):
    """Return all matches (across all days) involving a specific player, plus the
    set of event categories they play. Uses get_live_matches per day.

    Args:
        tournament_id (str): The tournamentsoftware GUID.
        player_name (str): The player's name to filter by.

    Returns:
        dict: {'success': bool, 'matches': [...], 'categories': [...]}
    """
    tournament_id = (tournament_id or "").strip()
    target = _normalize_name(player_name)
    if not tournament_id or not target:
        return {'success': False, 'error': 'Tournament ID and player required', 'matches': []}

    try:
        # First call to discover days
        first = get_live_matches(tournament_id, komet_names=[player_name])
        if not first.get('success'):
            return first
        days = first.get('days', [])

        all_matches = []
        seen = set()

        def collect(day_result):
            for m in day_result.get('matches', []):
                # match involves the player if either team contains the name
                names = []
                for team in (m.get('team1', ''), m.get('team2', '')):
                    names.extend([p.strip() for p in team.split('/')])
                if any(_normalize_name(n) == target for n in names):
                    key = (m.get('event'), m.get('round'), m.get('team1'), m.get('team2'))
                    if key not in seen:
                        seen.add(key)
                        all_matches.append(m)

        collect(first)
        # Fetch remaining days
        for d in days:
            if d and d != first.get('selected_day'):
                dr = get_live_matches(tournament_id, req_date=d, komet_names=[player_name])
                if dr.get('success'):
                    collect(dr)

        categories = sorted({m.get('event', '') for m in all_matches if m.get('event')})
        return {'success': True, 'matches': all_matches, 'categories': categories}
    except Exception as e:
        logger.error(f"❌ Error fetching player matches: {e}")
        return {'success': False, 'error': str(e), 'matches': []}


def get_players_with_categories(tournament_id, komet_names):
    """For each Komet player, derive the event categories they play from matches.

    Returns:
        dict: {'success': bool, 'players': [{'name','categories':[...]}]}
    """
    try:
        # Gather all matches across all days once, then map players to categories
        first = get_live_matches(tournament_id, komet_names=komet_names)
        if not first.get('success'):
            return {'success': False, 'players': [], 'error': first.get('error', '')}
        days = first.get('days', [])
        all_matches = list(first.get('matches', []))
        for d in days:
            if d and d != first.get('selected_day'):
                dr = get_live_matches(tournament_id, req_date=d, komet_names=komet_names)
                if dr.get('success'):
                    all_matches.extend(dr.get('matches', []))

        target_set = {_normalize_name(n): n for n in komet_names}
        cats_by_player = {}
        for m in all_matches:
            event = m.get('event', '')
            names = []
            for team in (m.get('team1', ''), m.get('team2', '')):
                names.extend([p.strip() for p in team.split('/')])
            for n in names:
                key = _normalize_name(n)
                if key in target_set and event:
                    cats_by_player.setdefault(target_set[key], set()).add(event)

        players = [
            {'name': name, 'categories': sorted(cats_by_player.get(name, []))}
            for name in komet_names
        ]
        return {'success': True, 'players': players}
    except Exception as e:
        logger.error(f"❌ Error deriving player categories: {e}")
        return {'success': False, 'players': [], 'error': str(e)}
