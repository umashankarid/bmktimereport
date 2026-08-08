import threading
import time
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class DataCache:
    """In-memory cache for all Google Sheets data with automatic sync"""
    
    def __init__(self):
        self.data = {
            'activities': [],
            'all_activities': [],
            'trainers': [],
            'tournaments': [],
            'volunteer_registrations': []
        }
        self.lock = threading.RLock()  # Recursive lock for thread-safe access
        self.last_sync = None

    def load_initial_data(self, sheets_manager):
        """Load all data from sheets on startup with retry logic"""
        logger.info("📂 Loading initial data from Google Sheets...")
        start_time = time.time()
        
        # If sheets_manager is in demo mode, skip loading
        if sheets_manager.demo_mode:
            logger.info("ℹ️  Demo mode - skipping Google Sheets data load")
            return
        
        try:
            with self.lock:
                # Load activities with retry
                try:
                    result = sheets_manager.get_all_activities(limit=1000)
                    if result['success']:
                        self.data['activities'] = result['data']
                        logger.info(f"✅ Loaded {len(self.data['activities'])} activities")
                except Exception as e:
                    logger.warning(f"⚠️  Could not load activities: {e}")
                
                # Load all activities list with retry
                try:
                    result = sheets_manager.get_activities_list()
                    if result['success']:
                        self.data['all_activities'] = result['data']
                        logger.info(f"✅ Loaded {len(self.data['all_activities'])} activity types")
                except Exception as e:
                    logger.warning(f"⚠️  Could not load activity types: {e}")
                
                # Load trainers with retry
                try:
                    result = sheets_manager.get_trainers_details()
                    if result['success']:
                        self.data['trainers'] = result['data']
                        logger.info(f"✅ Loaded {len(self.data['trainers'])} trainers")
                except Exception as e:
                    logger.warning(f"⚠️  Could not load trainers: {e}")
                
                # Load tournaments with retry
                try:
                    result = sheets_manager.get_tournaments()
                    if result['success']:
                        self.data['tournaments'] = result['data']
                        logger.info(f"✅ Loaded {len(self.data['tournaments'])} tournaments")
                except Exception as e:
                    logger.warning(f"⚠️  Could not load tournaments: {e}")
                
                self.last_sync = datetime.now()
                elapsed = time.time() - start_time
                logger.info(f"🎉 Data load complete in {elapsed:.2f}s")
                
        except Exception as e:
            logger.error(f"❌ Error loading data: {e}")
            # Don't raise - let the app continue with empty cache

    def start_background_sync(self, sheets_manager, poll_interval=None):
        """Background sync disabled - cache is kept in sync via write operations"""
        logger.info("ℹ️  Background sync disabled (cache synced via write operations)")
        # No background polling needed if all writes go through the app

    def sync_from_sheets(self, sheets_manager):
        """Deprecated - cache is kept in sync via write operations"""
        logger.debug("ℹ️  Direct sync not needed - cache synced via write operations")

    def get_activities(self):
        """Get all activities from cache"""
        with self.lock:
            return list(self.data['activities'])

    def get_all_activities(self):
        """Get all activity types from cache"""
        with self.lock:
            return list(self.data['all_activities'])

    def get_trainers(self):
        """Get all trainers from cache"""
        with self.lock:
            return list(self.data['trainers'])

    def get_tournaments(self):
        """Get all tournaments from cache"""
        with self.lock:
            return list(self.data['tournaments'])

    def get_volunteer_registrations(self):
        """Get all volunteer registrations from cache"""
        with self.lock:
            return list(self.data['volunteer_registrations'])

    def add_activity(self, activity):
        """Add activity to cache and sheets"""
        with self.lock:
            self.data['activities'].append(activity)
            logger.debug(f"✅ Added activity to cache: {activity}")

    def add_trainer(self, trainer):
        """Add trainer to cache"""
        with self.lock:
            # Check if trainer already exists
            existing = next((t for t in self.data['trainers'] if t.get('name') == trainer.get('name')), None)
            if not existing:
                self.data['trainers'].append(trainer)
                logger.debug(f"✅ Added trainer to cache: {trainer}")

    def update_tournament_slots(self, tournament_name, new_slots):
        """Update available slots for a tournament"""
        with self.lock:
            for tournament in self.data['tournaments']:
                if tournament.get('Tournament Name') == tournament_name:
                    tournament['Available Slots'] = new_slots
                    logger.debug(f"✅ Updated tournament slots: {tournament_name} -> {new_slots}")
                    return True
            return False

    def add_volunteer_registration(self, registration):
        """Add volunteer registration to cache"""
        with self.lock:
            self.data['volunteer_registrations'].append(registration)
            logger.debug(f"✅ Added volunteer registration to cache")

    def get_cache_stats(self):
        """Get cache statistics"""
        with self.lock:
            return {
                'activities': len(self.data['activities']),
                'activity_types': len(self.data['all_activities']),
                'trainers': len(self.data['trainers']),
                'tournaments': len(self.data['tournaments']),
                'volunteer_registrations': len(self.data['volunteer_registrations']),
                'last_sync': self.last_sync.isoformat() if self.last_sync else 'Never'
            }

    def clear_cache(self):
        """Clear all cached data"""
        with self.lock:
            self.data = {
                'activities': [],
                'all_activities': [],
                'trainers': [],
                'tournaments': [],
                'volunteer_registrations': []
            }
            self.last_sync = None
            logger.info("🗑️  Cache cleared")


# Global cache instance
_cache = None

def get_data_cache():
    """Get or create the global cache instance"""
    global _cache
    if _cache is None:
        _cache = DataCache()
    return _cache

def reset_data_cache():
    """Reset the global cache instance"""
    global _cache
    _cache = None
