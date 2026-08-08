import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import re
import logging

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
}

BADMINTON_SWEDEN_BASE = "https://badmintonsweden.tournamentsoftware.com"
COOKIEWALL_URL = f"{BADMINTON_SWEDEN_BASE}/cookiewall/Save"
FIND_URL = f"{BADMINTON_SWEDEN_BASE}/find"
DOSEARCH_URL = f"{BADMINTON_SWEDEN_BASE}/find/tournament/DoSearch"

# Swedish month mapping
SWEDISH_MONTHS = {
    'januari': 1, 'februari': 2, 'mars': 3, 'april': 4,
    'maj': 5, 'juni': 6, 'juli': 7, 'augusti': 8,
    'september': 9, 'oktober': 10, 'november': 11, 'december': 12
}


def create_session_with_cookies():
    """Create a requests session and accept cookies to bypass cookie wall"""
    session = requests.Session()
    session.headers.update(HEADERS)
    
    try:
        logger.info("Accepting cookies on Badminton Sweden...")
        # Post to cookie wall to accept all cookies - EXACT approach from old project
        resp = session.post(
            COOKIEWALL_URL,
            data={
                "ReturnUrl": "/",
                "SettingsOpen": "false",
                "CookieWallCategoryPreferences": "1,2,3"  # Accept all categories
            },
            allow_redirects=True,
            timeout=10
        )
        logger.info(f"✅ Cookie wall response: {resp.status_code}")
        return session
    except Exception as e:
        logger.error(f"Error accepting cookies: {e}")
        return session


def parse_swedish_date(date_str):
    """Parse Swedish date like 'lör den 5 sep' to YYYY-MM-DD"""
    try:
        # Handle ISO format first
        if 'T' in date_str:
            return date_str[:10]
        
        # Remove leading day abbreviation if present (e.g., "lör den 5 sep")
        date_str = date_str.lower().strip()
        
        # Match pattern: "day den D month" or "D month"
        match = re.search(r'(\d{1,2})\s+(\w+)', date_str)
        if not match:
            return None
        
        day = int(match.group(1))
        month_str = match.group(2)
        
        # Match month name (can be abbreviated like "sep" or full like "september")
        month = None
        for swedish_month, month_num in SWEDISH_MONTHS.items():
            if month_str.startswith(swedish_month[:3]):
                month = month_num
                break
        
        if not month:
            logger.warning(f"Could not parse month from: {date_str}")
            return None
        
        # Assume current or next year
        today = datetime.now()
        year = today.year
        
        try:
            date_obj = datetime(year, month, day)
            # If date is in the past, try next year
            if date_obj < today:
                date_obj = datetime(year + 1, month, day)
            return date_obj.strftime('%Y-%m-%d')
        except ValueError:
            logger.warning(f"Invalid date values: day={day}, month={month}, year={year}")
            return None
    except Exception as e:
        logger.error(f"Error parsing Swedish date '{date_str}': {e}")
        return None


def fetch_tournament_form_data(session):
    """Load the find page to get form data - EXACT approach from old project"""
    try:
        today = datetime.now()
        end = today + timedelta(days=90)
        
        # Load the find page to get form data
        resp = session.get(
            f"{FIND_URL}?StatusFilterID=2&DateFilterType=0&StartDate={today.strftime('%Y-%m-%dT00:00')}&EndDate={end.strftime('%Y-%m-%dT00:00')}&Distance=10&page=1&SportID=2",
            timeout=10
        )
        
        logger.info(f"✅ Find page response: {resp.status_code}")
        logger.info(f"📄 Find page size: {len(resp.text)} characters")
        
        page_soup = BeautifulSoup(resp.text, "html.parser")
        form = page_soup.select_one("#form_globalsearch")
        
        form_data = {}
        if form:
            logger.info("✅ Found form_globalsearch")
            for inp in form.find_all("input"):
                name = inp.get("name", "")
                value = inp.get("value", "")
                if name:
                    form_data[name] = value
            logger.info(f"✅ Extracted {len(form_data)} form fields")
        else:
            logger.warning("⚠️  Could not find #form_globalsearch")
        
        # Set StatusFilterID to 2 for 'Online-anmälan öppen' (registration open)
        form_data["TournamentExtendedFilter.StatusFilterID"] = "2"
        logger.info(f"Form data: {form_data}")
        
        return form_data
    
    except Exception as e:
        logger.error(f"Error fetching form data: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return {}


def fetch_tournaments_list(session, form_data):
    """POST to /find/tournament/DoSearch to get results - EXACT approach from old project"""
    try:
        logger.info("POSTing to /find/tournament/DoSearch...")
        
        # POST to get results - EXACT approach from old project
        resp = session.post(
            DOSEARCH_URL,
            data=form_data,
            headers={"X-Requested-With": "XMLHttpRequest"},
            timeout=10
        )
        
        logger.info(f"✅ DoSearch response: {resp.status_code}")
        logger.info(f"📄 Response size: {len(resp.text)} characters")
        
        soup = BeautifulSoup(resp.text, "html.parser")
        tournaments = []
        
        items = soup.select("li.list__item")
        logger.info(f"📍 Found {len(items)} tournament items")
        
        for idx, item in enumerate(items):
            try:
                link = item.select_one("a.media__link")
                if not link:
                    continue
                
                name = link.get_text(strip=True)
                href = link.get("href", "")
                
                logger.info(f"  [{idx}] {name} → {href[:60]}")
                
                # Filter for 'komet' (case-insensitive)
                if 'komet' not in name.lower():
                    logger.debug(f"     Skipping (no 'komet')")
                    continue
                
                logger.info(f"     ✅ Matched 'komet'!")
                
                # Get location
                location_el = item.select_one(".media__subheading .nav-link__value")
                location = location_el.get_text(strip=True) if location_el else ""
                
                # Get dates
                time_els = item.select("time")
                date_start = time_els[0].get("datetime", "")[:10] if time_els else ""
                date_end = time_els[1].get("datetime", "")[:10] if len(time_els) > 1 else ""
                
                logger.info(f"     Location: {location}")
                logger.info(f"     Dates: {date_start} to {date_end}")
                
                # Build full URL
                tid_match = re.search(r'id=([A-Fa-f0-9-]+)', href)
                tournament_url = f"{BADMINTON_SWEDEN_BASE}/tournament/{tid_match.group(1)}" if tid_match else ""
                
                tournaments.append({
                    'name': name,
                    'url': tournament_url,
                    'location': location,
                    'date_start': date_start,
                    'date_end': date_end
                })
                
            except Exception as e:
                logger.warning(f"Error parsing item {idx}: {e}")
                continue
        
        logger.info(f"✅ Found {len(tournaments)} tournaments with 'komet'")
        return tournaments
    
    except Exception as e:
        logger.error(f"Error in DoSearch: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return []


def scrape_tournament_details(session, tournament_url):
    """Scrape tournament page to get venue and additional details"""
    try:
        logger.info(f"🔍 Scraping details: {tournament_url}")
        
        response = session.get(tournament_url, timeout=15, allow_redirects=True)
        response.raise_for_status()
        logger.info(f"✅ Status: {response.status_code}")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        text = soup.get_text()
        
        venue = "TBA"
        
        # Look for address patterns
        address_patterns = [
            r'Lokal[^<]*?([A-Zäöå][a-zäöå]+vägen\s+\d+[^<]*)',
            r'Adress[^<]*?([A-Zäöå][a-zäöå]+vägen\s+\d+[^<]*)',
            r'Plats[^<]*?([A-Zäöå][a-zäöå]+vägen\s+\d+[^<]*)',
        ]
        
        for pattern in address_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                venue = match.group(1).strip()
                venue = re.sub(r'<[^>]+>', '', venue)
                venue = venue.split('\n')[0]
                logger.info(f"✅ Venue: {venue}")
                return venue
        
        logger.warning(f"⚠️  No venue found, using TBA")
        return venue
    
    except Exception as e:
        logger.error(f"Error scraping details: {e}")
        return "TBA"


def import_tournaments_from_badminton_sweden():
    """Main function to import tournaments from Badminton Sweden - EXACT approach from old project"""
    try:
        logger.warning("\n" + "="*70)
        logger.warning("🏸 TOURNAMENT SCRAPER STARTED (OLD PROJECT APPROACH)")
        logger.warning("="*70)
        
        # Create session and accept cookies
        logger.warning("\n1️⃣  ACCEPTING COOKIES...")
        session = create_session_with_cookies()
        logger.warning("✅ Cookie wall accepted\n")
        
        # Fetch form data
        logger.warning("2️⃣  LOADING FORM DATA...")
        form_data = fetch_tournament_form_data(session)
        if not form_data:
            logger.warning("❌ Could not load form data")
            logger.warning("="*70 + "\n")
            return {
                'success': False,
                'message': 'Could not load search form',
                'imported': []
            }
        logger.warning("✅ Form data loaded\n")
        
        # Fetch tournaments via DoSearch
        logger.warning("3️⃣  SEARCHING FOR TOURNAMENTS WITH 'komet'...")
        tournaments_list = fetch_tournaments_list(session, form_data)
        logger.warning(f"\n✅ Found {len(tournaments_list)} tournaments with 'komet'\n")
        
        if not tournaments_list:
            logger.warning("❌ No tournaments found!")
            logger.warning("="*70 + "\n")
            return {
                'success': False,
                'message': 'No tournaments found with "komet" in the name',
                'imported': []
            }
        
        # Scrape details for each tournament
        imported_tournaments = []
        logger.warning(f"4️⃣  SCRAPING DETAILS FOR {len(tournaments_list)} TOURNAMENTS...")
        
        for idx, tournament in enumerate(tournaments_list, 1):
            logger.warning(f"\n   [{idx}/{len(tournaments_list)}] {tournament['name']}")
            
            venue = scrape_tournament_details(session, tournament['url'])
            
            # Use date_start, or parse if needed
            start_date = tournament['date_start'] or parse_swedish_date(tournament['name'])
            
            if not start_date:
                logger.warning(f"   ⚠️  No date found, skipping")
                continue
            
            tournament_data = {
                'Tournament Name': tournament['name'],
                'Date': start_date,
                'Venue': venue or tournament['location'] or 'TBA',
                'Start Time': '09:00',
                'End Time': '17:00',
                'Available Slots': '4',
                'Status': 'Upcoming'
            }
            
            imported_tournaments.append(tournament_data)
            logger.warning(f"   ✅ Ready to import")
        
        logger.warning(f"\n✅ Successfully prepared {len(imported_tournaments)} tournaments for import")
        logger.warning("="*70 + "\n")
        
        return {
            'success': True,
            'message': f'Found {len(imported_tournaments)} tournaments',
            'imported': imported_tournaments
        }
    
    except Exception as e:
        logger.error(f"\n❌ Error: {e}")
        import traceback
        logger.error(traceback.format_exc())
        logger.warning("="*70 + "\n")
        return {
            'success': False,
            'message': f'Error importing tournaments: {str(e)}',
            'imported': []
        }
