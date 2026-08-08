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
        logger.info(f"URL: {FIND_URL}?{}&".join(f'{k}={v}' for k, v in params.items())}")
        
        response = requests.get(FIND_URL, params=params, headers=HEADERS, timeout=15)
        response.raise_for_status()
        logger.info(f"✅ Response status: {response.status_code}")
        logger.info(f"Response length: {len(response.text)} characters")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        tournaments = []
        
        # Find all tournament items - try multiple selectors
        selectors = ['div.list__item', 'li.list__item', 'a.media__link', 'div.tournament', 'tr']
        all_items = []
        
        for selector in selectors:
            items = soup.select(selector)
            if items:
                logger.info(f"📍 Selector '{selector}': found {len(items)} items")
                all_items.extend(items)
        
        logger.info(f"Total items found: {len(all_items)}")
        
        # Log all text content to see what's on the page
        all_text = soup.get_text()
        logger.info(f"📄 Total page text length: {len(all_text)} characters")
        
        # Look for 'komet' anywhere on the page
        if 'komet' in all_text.lower():
            logger.info("✅ Found 'komet' in page text")
            # Find all occurrences
            komet_lines = [line.strip() for line in all_text.split('\n') if 'komet' in line.lower()]
            logger.info(f"Lines containing 'komet': {len(komet_lines)}")
            for i, line in enumerate(komet_lines[:10]):  # Log first 10
                logger.info(f"  [{i}] {line[:100]}")
        else:
            logger.warning("❌ 'komet' not found in page text")
        
        # Process items
        for idx, item in enumerate(all_items):
            try:
                # Get tournament name - try multiple selectors
                name_el = item.select_one('span.nav-link__value, .media__title, h3, .title, .name')
                if not name_el:
                    name_el = item
                
                name = name_el.get_text(strip=True)
                
                if not name:
                    logger.debug(f"Item {idx}: No name found")
                    continue
                
                logger.info(f"Item {idx}: {name}")
                
                # Filter for 'komet' (case-insensitive, can be part of larger word like "Kometslaget")
                if 'komet' not in name.lower():
                    continue
                
                logger.info(f"✅ Matched 'komet': {name}")
                
                # Get tournament link
                link_el = item if item.name == 'a' else item.find('a', href=True)
                if not link_el or not link_el.get('href'):
                    logger.debug(f"No link found for tournament: {name}")
                    continue
                
                tournament_url = link_el.get('href')
                if not tournament_url.startswith('http'):
                    tournament_url = BADMINTON_SWEDEN_BASE + tournament_url
                
                logger.info(f"Tournament URL: {tournament_url}")
                
                tournaments.append({
                    'name': name,
                    'url': tournament_url
                })
                
            except Exception as e:
                logger.warning(f"Error parsing tournament item {idx}: {e}")
                continue
        
        logger.info(f"✅ Final: Found {len(tournaments)} tournaments with 'komet'")
        return tournaments
    
    except requests.RequestException as e:
        logger.error(f"❌ Error fetching tournaments list: {e}")
        return []
    except Exception as e:
        logger.error(f"❌ Unexpected error in fetch_tournaments_list: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return []


def scrape_tournament_details(tournament_url):
    """Scrape tournament page to get dates and address"""
    try:
        logger.info(f"🔍 Scraping: {tournament_url}")
        
        response = requests.get(tournament_url, headers=HEADERS, timeout=15)
        response.raise_for_status()
        logger.info(f"✅ Status: {response.status_code}, Length: {len(response.text)}")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        details = {
            'start_date': None,
            'end_date': None,
            'venue': None
        }
        
        # Look for date information (Tävlingsstart, Tävlingsslu)
        text = soup.get_text()
        logger.info(f"Page text length: {len(text)}")
        
        # Log relevant sections
        for line in text.split('\n'):
            if any(keyword in line.lower() for keyword in ['tävling', 'start', 'address', 'adress', 'lokal', 'vägen']):
                logger.debug(f"📍 {line.strip()[:80]}")
        
        # Find date patterns - look for Swedish date format
        start_match = re.search(r'Tävlingsstart[^0-9]*(\d{1,2}\s+\w+|\w+\s+den\s+\d{1,2}\s+\w+)', text, re.IGNORECASE)
        if start_match:
            date_str = start_match.group(1)
            details['start_date'] = parse_swedish_date(date_str)
            logger.info(f"✅ Start date found: '{date_str}' → {details['start_date']}")
        else:
            logger.warning(f"⚠️  No start date found (Tävlingsstart)")
        
        end_match = re.search(r'Tävlingsslu[^0-9]*(\d{1,2}\s+\w+|\w+\s+den\s+\d{1,2}\s+\w+)', text, re.IGNORECASE)
        if end_match:
            date_str = end_match.group(1)
            details['end_date'] = parse_swedish_date(date_str)
            logger.info(f"✅ End date found: '{date_str}' → {details['end_date']}")
        else:
            logger.warning(f"⚠️  No end date found (Tävlingsslu)")
        
        # If no end date, use start date
        if details['start_date'] and not details['end_date']:
            details['end_date'] = details['start_date']
        
        # Look for address (Girovägen 8, etc.)
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
                details['venue'] = venue.strip()
                logger.info(f"✅ Venue found: {details['venue']}")
                break
        
        if not details['venue']:
            logger.warning(f"⚠️  No venue found")
        
        logger.info(f"Final details: {details}")
        return details
    
    except requests.RequestException as e:
        logger.error(f"❌ Error scraping {tournament_url}: {e}")
        return None
    except Exception as e:
        logger.error(f"❌ Unexpected error scraping: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return None


def import_tournaments_from_badminton_sweden():
    """Main function to import tournaments from Badminton Sweden"""
    try:
        logger.warning("\n" + "="*70)
        logger.warning("🏸 TOURNAMENT SCRAPER STARTED")
        logger.warning("="*70)
        
        # Fetch tournament list
        logger.warning("\n1️⃣  FETCHING TOURNAMENT LIST...")
        tournaments_list = fetch_tournaments_list()
        logger.warning(f"\n✅ Found {len(tournaments_list)} tournaments with 'komet' in the name")
        
        if not tournaments_list:
            logger.warning("\n❌ No tournaments found!")
            logger.warning("="*70 + "\n")
            return {
                'success': False,
                'message': 'No tournaments found with "komet" in the name',
                'imported': []
            }
        
        imported_tournaments = []
        
        # Scrape details for each tournament
        logger.warning(f"\n2️⃣  SCRAPING DETAILS FOR {len(tournaments_list)} TOURNAMENTS...")
        for idx, tournament in enumerate(tournaments_list, 1):
            logger.warning(f"\n   [{idx}/{len(tournaments_list)}] {tournament['name']}")
            details = scrape_tournament_details(tournament['url'])
            
            if not details or not details['start_date']:
                logger.warning(f"   ❌ Could not get details, skipping")
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
            logger.warning(f"   ✅ Date: {details['start_date']}, Venue: {details['venue']}")
        
        logger.warning(f"\n✅ Successfully prepared {len(imported_tournaments)} tournaments for import")
        logger.warning("="*70 + "\n")
        
        return {
            'success': True,
            'message': f'Found {len(imported_tournaments)} tournaments',
            'imported': imported_tournaments
        }
    
    except Exception as e:
        logger.error(f"\n❌ Error in import_tournaments_from_badminton_sweden: {e}")
        import traceback
        logger.error(traceback.format_exc())
        logger.warning("="*70 + "\n")
        return {
            'success': False,
            'message': f'Error importing tournaments: {str(e)}',
            'imported': []
        }
