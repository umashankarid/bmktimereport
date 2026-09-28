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


def get_live_matches(tournament_id, req_date=""):
    """Scrape a tournament's Matches page: done, ongoing and upcoming matches
    with court + duration, players, score and status.

    Args:
        tournament_id (str): The tournamentsoftware GUID.
        req_date (str): Optional YYYYMMDD to fetch a specific day.

    Returns:
        dict: {'success': bool, 'matches': [...], 'days': [...], 'selected_day': str}
    """
    tournament_id = (tournament_id or "").strip()
    req_date = (req_date or "").strip()
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

        matches = []
        for m in soup.select(".match"):
            header_items = m.select(".match__header-title-item .nav-link__value")
            event = header_items[0].get_text(strip=True) if header_items else ""
            round_name = header_items[1].get_text(strip=True) if len(header_items) > 1 else ""

            aside_blocks = m.select("span.match__header-aside-block")
            now_playing = False
            court = ""
            duration = ""
            court_assigned = False
            for ab in aside_blocks:
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

            # Teams / players
            teams = []
            team_won = []
            for row in m.select(".match__row"):
                names = [el.get_text(strip=True) for el in row.select(".nav-link__value") if el.get_text(strip=True)]
                teams.append(" / ".join(names) if names else row.get_text(strip=True).strip())
                team_won.append("has-won" in (row.get("class") or []))
            team1 = teams[0] if teams else ""
            team2 = teams[1] if len(teams) > 1 else ""
            team1_won = team_won[0] if team_won else False
            has_winner = any(team_won)

            status_tags = [t.get_text(strip=True) for t in m.select(".match__status") if t.get_text(strip=True)]
            status_text = " ".join(status_tags)

            # Score
            score_sets = []
            for pts in m.select("ul.points"):
                cells = pts.select("li.points__cell")
                if len(cells) == 2:
                    score_sets.append(f"{cells[0].get_text(strip=True)}-{cells[1].get_text(strip=True)}")
            score = " ".join(score_sets)
            if not score and has_winner:
                score = status_text or "W.O."

            # Derive status
            if score_sets or has_winner:
                status = "done"
            elif now_playing or court_assigned:
                status = "ongoing"
            else:
                status = "upcoming"

            if event or team1 or team2:
                matches.append({
                    "event": event, "round": round_name,
                    "court": court, "duration": duration,
                    "team1": team1, "team2": team2, "team1_won": team1_won,
                    "score": score, "status": status,
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
