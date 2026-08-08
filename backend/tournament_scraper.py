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
FIND_URL = f"{BADMINTON_SWEDEN_BASE}/find"

# Swedish month mapping
SWEDISH_MONTHS = {
    'januari': 1, 'februari': 2, 'mars': 3, 'april': 4,
    'maj': 5, 'juni': 6, 'juli': 7, 'augusti': 8,
    'september': 9, 'oktober': 10, 'november': 11, 'december': 12
}

SWEDISH_DAYS = {
    'mån': 'Mon', 'tis': 'Tue', 'ons': 'Wed', 'tors': 'Thu',
    'fre': 'Fri', 'lör': 'Sat', 'sön': 'Sun'
}


def parse_swedish_date(date_str):
    """Parse Swedish date like 'lör den 5 sep' to YYYY-MM-DD"""
    try:
        # Remove leading day abbreviation if present (e.g., "lör den 5 sep")
        date_str = date_str.lower().strip()
        
        # Match pattern: "day den D month" or "D month"
        # Example: "lör den 5 sep" or "5 september"
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


def fetch_tournaments_list():
    """Fetch tournaments from Badminton Sweden with 'komet' in the name"""
    try:
        # Calculate date range: today to 5 months from now
        today = datetime.now()
        end_date = today + timedelta(days=150)  # Roughly 5 months
        
        params = {
            'DateFilterType': 0,
            'StartDate': today.strftime('%Y-%m-%d'),
            'EndDate': end_date.strftime('%Y-%m-%d'),
            'Distance': 10,
            'page': 1,
            'StatusFilterID': 2
        }
        
        logger.info(f"Fetching tournaments from Badminton Sweden with params: {params}")
        
        response = requests.get(FIND_URL, params=params, headers=HEADERS, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        tournaments = []
        
        # Find all tournament items
        items = soup.select('div.list__item, li.list__item, a.media__link')
        logger.info(f"Found {len(items)} potential tournament items")
        
        for item in items:
            try:
                # Get tournament name
                name_el = item.select_one('span.nav-link__value, .media__title, h3')
                if not name_el:
                    name_el = item
                
                name = name_el.get_text(strip=True)
                
                # Filter for 'komet' (case-insensitive, can be part of larger word like "Kometslaget")
                if 'komet' not in name.lower():
                    continue
                
                # Get tournament link
                link_el = item if item.name == 'a' else item.find('a', href=True)
                if not link_el or not link_el.get('href'):
                    logger.debug(f"No link found for tournament: {name}")
                    continue
                
                tournament_url = link_el.get('href')
                if not tournament_url.startswith('http'):
                    tournament_url = BADMINTON_SWEDEN_BASE + tournament_url
                
                tournaments.append({
                    'name': name,
                    'url': tournament_url
                })
                logger.info(f"Found tournament: {name} -> {tournament_url}")
                
            except Exception as e:
                logger.warning(f"Error parsing tournament item: {e}")
                continue
        
        return tournaments
    
    except requests.RequestException as e:
        logger.error(f"Error fetching tournaments list: {e}")
        return []
    except Exception as e:
        logger.error(f"Unexpected error in fetch_tournaments_list: {e}")
        return []


def scrape_tournament_details(tournament_url):
    """Scrape tournament page to get dates and address"""
    try:
        logger.info(f"Scraping tournament details from: {tournament_url}")
        
        response = requests.get(tournament_url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        details = {
            'start_date': None,
            'end_date': None,
            'venue': None
        }
        
        # Look for date information (Tävlingsstart, Tävlingsslu)
        # These are typically in labels or strong tags
        text = soup.get_text()
        
        # Find date patterns - look for Swedish date format
        # Pattern: "Tävlingsstart\nlör den 5 sep" or similar
        start_match = re.search(r'Tävlingsstart[^0-9]*(\d{1,2}\s+\w+|\w+\s+den\s+\d{1,2}\s+\w+)', text, re.IGNORECASE)
        if start_match:
            date_str = start_match.group(1)
            details['start_date'] = parse_swedish_date(date_str)
            logger.info(f"Found start date: {date_str} -> {details['start_date']}")
        
        end_match = re.search(r'Tävlingsslu[^0-9]*(\d{1,2}\s+\w+|\w+\s+den\s+\d{1,2}\s+\w+)', text, re.IGNORECASE)
        if end_match:
            date_str = end_match.group(1)
            details['end_date'] = parse_swedish_date(date_str)
            logger.info(f"Found end date: {date_str} -> {details['end_date']}")
        
        # If no end date, use start date
        if details['start_date'] and not details['end_date']:
            details['end_date'] = details['start_date']
        
        # Look for address (Girovägen 8, etc.)
        # Try to find common address patterns
        address_patterns = [
            r'Lokal[^<]*?([A-Zäöå][a-zäöå]+vägen\s+\d+[^<]*)',
            r'Adress[^<]*?([A-Zäöå][a-zäöå]+vägen\s+\d+[^<]*)',
            r'Plats[^<]*?([A-Zäöå][a-zäöå]+vägen\s+\d+[^<]*)',
        ]
        
        for pattern in address_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                venue = match.group(1).strip()
                # Clean up the venue string
                venue = re.sub(r'<[^>]+>', '', venue)  # Remove HTML tags
                venue = venue.split('\n')[0]  # Get first line
                details['venue'] = venue.strip()
                logger.info(f"Found venue: {details['venue']}")
                break
        
        return details
    
    except requests.RequestException as e:
        logger.error(f"Error scraping tournament details from {tournament_url}: {e}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error scraping tournament: {e}")
        return None


def import_tournaments_from_badminton_sweden():
    """Main function to import tournaments from Badminton Sweden"""
    try:
        logger.info("Starting tournament import from Badminton Sweden")
        
        # Fetch tournament list
        tournaments_list = fetch_tournaments_list()
        logger.info(f"Found {len(tournaments_list)} tournaments with 'komet' in the name")
        
        if not tournaments_list:
            return {
                'success': False,
                'message': 'No tournaments found with "komet" in the name',
                'imported': []
            }
        
        imported_tournaments = []
        
        # Scrape details for each tournament
        for tournament in tournaments_list:
            details = scrape_tournament_details(tournament['url'])
            
            if not details or not details['start_date']:
                logger.warning(f"Could not get details for {tournament['name']}, skipping")
                continue
            
            tournament_data = {
                'Tournament Name': tournament['name'],
                'Date': details['start_date'],
                'Venue': details['venue'] or 'TBA',
                'Start Time': '09:00',
                'End Time': '17:00',
                'Available Slots': '4',
                'Status': 'Upcoming'
            }
            
            imported_tournaments.append(tournament_data)
            logger.info(f"Prepared tournament for import: {tournament_data}")
        
        logger.info(f"Successfully prepared {len(imported_tournaments)} tournaments for import")
        
        return {
            'success': True,
            'message': f'Found {len(imported_tournaments)} tournaments',
            'imported': imported_tournaments
        }
    
    except Exception as e:
        logger.error(f"Error in import_tournaments_from_badminton_sweden: {e}")
        return {
            'success': False,
            'message': f'Error importing tournaments: {str(e)}',
            'imported': []
        }
