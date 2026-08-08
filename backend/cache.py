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
        self.sync_in_progress = False
        self.syncing = False

    def load_initial_data(self, sheets_manager):
        """Load all data from sheets on startup"""
        logger.info("📂 Loading initial data from Google Sheets...")
        start_time = time.time()
        
        try:
            with self.lock:
                # Load activities
                result = sheets_manager.get_all_activities(limit=1000)
                if result['success']:
                    self.data['activities'] = result['data']
                    logger.info(f"✅ Loaded {len(self.data['activities'])} activities")
                
                # Load all activities list
                result = sheets_manager.get_activities_list()
                if result['success']:
                    self.data['all_activities'] = result['data']
                    logger.info(f"✅ Loaded {len(self.data['all_activities'])} activity types")
                
                # Load trainers
                result = sheets_manager.get_trainers_details()
                if result['success']:
                    self.data['trainers'] = result['data']
                    logger.info(f"✅ Loaded {len(self.data['trainers'])} trainers")
                
                # Load tournaments
                result = sheets_manager.get_tournaments()
                if result['success']:
                    self.data['tournaments'] = result['data']
                    logger.info(f"✅ Loaded {len(self.data['tournaments'])} tournaments")
                
                # Load volunteer registrations
                result = sheets_manager.get_volunteer_registrations('')
                if result['success']:
                    self.data['volunteer_registrations'] = result['data']
                    logger.info(f"✅ Loaded {len(self.data['volunteer_registrations'])} volunteer registrations")
                
                self.last_sync = datetime.now()
                elapsed = time.time() - start_time
                logger.info(f"🎉 Initial data load complete in {elapsed:.2f}s")
                
        except Exception as e:
            logger.error(f"❌ Error loading initial data: {e}")
            raise

    def start_background_sync(self, sheets_manager, poll_interval=60):
        """Start background thread to sync data periodically"""
        if self.syncing:
            logger.warning("⚠️  Background sync already running")
            return
        
        self.syncing = True
        
        def sync_loop():
            logger.info(f"🔄 Starting background sync thread (interval: {poll_interval}s)")
            
            while self.syncing:
                try:
                    time.sleep(poll_interval)
                    self.sync_from_sheets(sheets_manager)
                except Exception as e:
                    logger.error(f"❌ Error in background sync: {e}")
                    # Continue syncing even on error
        
        # Start as daemon thread
        sync_thread = threading.Thread(target=sync_loop, daemon=True, name="DataCacheSyncThread")
        sync_thread.start()
        logger.info("✅ Background sync thread started")

    def sync_from_sheets(self, sheets_manager):
        """Fetch latest data from sheets and update cache"""
        if self.sync_in_progress:
            logger.debug("⏳ Sync already in progress, skipping...")
            return
        
        self.sync_in_progress = True
        start_time = time.time()
        
        try:
            with self.lock:
                logger.debug("🔄 Syncing data from Google Sheets...")
                
                # Sync activities
                result = sheets_manager.get_all_activities(limit=1000)
                if result['success']:
                    self.data['activities'] = result['data']
                    logger.debug(f"✅ Synced {len(self.data['activities'])} activities")
                
                # Sync trainers
                result = sheets_manager.get_trainers_details()
                if result['success']:
                    self.data['trainers'] = result['data']
                    logger.debug(f"✅ Synced {len(self.data['trainers'])} trainers")
                
                # Sync tournaments
                result = sheets_manager.get_tournaments()
                if result['success']:
                    self.data['tournaments'] = result['data']
                    logger.debug(f"✅ Synced {len(self.data['tournaments'])} tournaments")
                
                # Sync volunteer registrations (fetch all)
                result = sheets_manager.get_volunteer_registrations('')
                if result['success']:
                    self.data['volunteer_registrations'] = result['data']
                    logger.debug(f"✅ Synced {len(self.data['volunteer_registrations'])} volunteer registrations")
                
                self.last_sync = datetime.now()
                elapsed = time.time() - start_time
                logger.info(f"🔄 Sync complete in {elapsed:.2f}s at {self.last_sync}")
                
        except Exception as e:
            logger.error(f"❌ Error during sync: {e}")
        finally:
            self.sync_in_progress = False

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
