from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from config import Config
from sheets import get_sheets_manager
from cache import get_data_cache
from auth import register_auth_routes, verify_token
import os
import sys

# Configure logging to print to stdout (Render can capture this)
import logging
logging.basicConfig(
    level=logging.DEBUG,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

def create_app():
    """Application factory"""
    logger.warning("\n" + "="*60)
    logger.warning("🚀 CREATING FLASK APP")
    logger.warning("="*60)
    
    app = Flask(__name__, static_folder='static', static_url_path='')
    app.config.from_object(Config)
    
    logger.warning(f"✅ Flask app created")
    logger.warning(f"   DEBUG: {app.config.get('DEBUG')}")
    logger.warning(f"   CORS_ORIGINS: {Config.CORS_ORIGINS}")
    
    # Enable CORS for API routes only
    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})
    logger.warning(f"✅ CORS enabled")
    
    # Add request logging middleware
    @app.before_request
    def log_request():
        logger.warning(f"\n📍 REQUEST: {request.method} {request.path}")
        logger.warning(f"   Content-Type: {request.content_type}")
        logger.warning(f"   Remote Addr: {request.remote_addr}")
        if request.data:
            logger.warning(f"   Data length: {len(request.data)} bytes")
            try:
                import json
                data = json.loads(request.data)
                logger.warning(f"   Parsed JSON: {json.dumps({k: v if k != 'password' else '[REDACTED]' for k, v in data.items()}, indent=2)}")
            except:
                logger.warning(f"   Raw data: {request.data[:200]}")
    
    @app.after_request
    def log_response(response):
        logger.warning(f"📤 RESPONSE: {response.status_code}")
        return response
    
    # Initialize Google Sheets on startup
    logger.warning(f"\n🔧 Initializing Google Sheets...")
    sheets_manager = get_sheets_manager()
    logger.warning(f"✅ Google Sheets initialized")
    
    # Initialize data cache and load initial data
    logger.warning(f"\n💾 Initializing data cache...")
    cache = get_data_cache()
    try:
        cache.load_initial_data(sheets_manager)
        logger.warning(f"✅ Data cache initialized and loaded")
        logger.warning(f"ℹ️  Cache will stay in sync via write operations (no background polling)")
    except Exception as e:
        logger.warning(f"⚠️  Error initializing cache: {e}")
        logger.warning(f"⚠️  Continuing without cache - will use direct sheet access with fallback")
    
    # Register authentication routes
    logger.warning(f"\n📝 Registering auth routes...")
    register_auth_routes(app, sheets_manager)
    logger.warning(f"✅ Auth routes registered")
    
    # Health check
    @app.route('/api/health', methods=['GET'])
    def health_check():
        logger.warning(f"✅ Health check called")
        return jsonify({
            'status': 'healthy',
            'service': 'badminton-activity-logger',
            'version': '1.0.0'
        })
    
    # Serve React app
    @app.route('/')
    def serve_index():
        """Serve index.html for root path"""
        return send_from_directory(app.static_folder, 'index.html')
    
    @app.route('/<path:path>')
    def serve_static(path):
        """Serve static files and fallback to index.html for React Router"""
        if os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')
    
    # Log activity
    @app.route('/api/activities', methods=['POST'])
    def log_activity():
        """Log a new badminton activity to sheets and cache"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Write to sheets first
            sheets = get_sheets_manager()
            result = sheets.add_activity(data)
            
            # If successful, also update cache
            if result['success']:
                try:
                    cache = get_data_cache()
                    cache.add_activity(data)
                    logger.info(f"✅ Activity added to cache")
                except Exception as e:
                    logger.warning(f"⚠️  Could not update cache: {e}")
            
            status_code = 201 if result['success'] else 400
            return jsonify(result), status_code
        except Exception as e:
            error_msg = str(e)
            logger.error(f"❌ ERROR in log_activity: {error_msg}")
            return jsonify({
                'error': 'Failed to log activity',
                'message': error_msg
            }), 500
    
    # Delete an activity (by POST with full details)
    @app.route('/api/activities/delete', methods=['POST'])
    def delete_activity_by_details():
        """Delete a specific activity by providing full details"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            sheets = get_sheets_manager()
            result = sheets.delete_activity_by_details(
                trainer_name=data.get('trainer_name'),
                date=data.get('date'),
                activity=data.get('activity'),
                start_time=data.get('start_time'),
                end_time=data.get('end_time')
            )
            
            # Invalidate cache if delete was successful
            if result['success']:
                try:
                    cache = get_data_cache()
                    with cache.lock:
                        cache.data['activities'] = []
                    logger.info("✅ Cache invalidated after activity deletion")
                except Exception as e:
                    logger.warning(f"⚠️  Could not invalidate cache: {e}")
            
            status_code = 200 if result['success'] else 400
            return jsonify(result), status_code
        except Exception as e:
            error_msg = str(e)
            print(f"❌ ERROR in delete_activity_by_details: {error_msg}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'error': 'Failed to delete activity',
                'message': error_msg
            }), 500
    
    # Delete multiple activities
    @app.route('/api/activities/delete-all', methods=['POST'])
    def delete_all_activities():
        """Delete multiple activities matching filter criteria"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            sheets = get_sheets_manager()
            result = sheets.delete_activities_by_filter(
                trainer=data.get('trainer'),
                activity_type=data.get('activity_type'),
                month=data.get('month')
            )
            
            # Invalidate cache if delete was successful
            if result['success']:
                try:
                    cache = get_data_cache()
                    with cache.lock:
                        cache.data['activities'] = []
                    logger.info("✅ Cache invalidated after activities deletion")
                except Exception as e:
                    logger.warning(f"⚠️  Could not invalidate cache: {e}")
            
            status_code = 200 if result['success'] else 400
            return jsonify(result), status_code
        except Exception as e:
            error_msg = str(e)
            print(f"❌ ERROR in delete_all_activities: {error_msg}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'error': 'Failed to delete activities',
                'message': error_msg
            }), 500
    
    # Get all activities
    @app.route('/api/activities', methods=['GET'])
    def get_activities():
        """Retrieve all logged activities from cache"""
        try:
            limit = request.args.get('limit', 100, type=int)
            cache = get_data_cache()
            all_activities = cache.get_activities()
            
            # Fallback to sheets if cache is empty
            if not all_activities:
                logger.warning("⚠️  Cache empty, fetching from sheets...")
                sheets = get_sheets_manager()
                result = sheets.get_all_activities(limit=limit)
                if result['success']:
                    all_activities = result['data']
                    # Update cache for next time
                    with cache.lock:
                        cache.data['activities'] = all_activities
            
            # Apply limit
            activities = all_activities[:limit]
            
            return jsonify({
                'success': True,
                'data': activities,
                'from_cache': len(all_activities) > 0
            }), 200
        except Exception as e:
            error_msg = str(e)
            print(f"❌ ERROR in get_activities: {error_msg}")
            return jsonify({
                'success': False,
                'message': f'Error retrieving activities: {error_msg}'
            }), 500
    
    # Get trainers list
    @app.route('/api/trainers', methods=['GET'])
    def get_trainers():
        """Get list of all trainers from cache"""
        try:
            cache = get_data_cache()
            trainers = cache.get_trainers()
            
            # Fallback to sheets if cache is empty
            if not trainers:
                logger.warning("⚠️  Cache empty, fetching from sheets...")
                sheets = get_sheets_manager()
                result = sheets.get_trainers_details()
                if result['success']:
                    trainers = result['data']
                    # Update cache for next time
                    with cache.lock:
                        cache.data['trainers'] = trainers
            
            return jsonify({
                'success': True,
                'data': trainers,
                'from_cache': len(trainers) > 0
            }), 200
        except Exception as e:
            return jsonify({
                'error': 'Failed to retrieve trainers',
                'message': str(e)
            }), 500

    # Get trainer details with email and phone
    @app.route('/api/trainers/details/all', methods=['GET'])
    def get_trainers_details():
        """Get list of all trainers with their details from cache"""
        try:
            cache = get_data_cache()
            trainers = cache.get_trainers()
            
            # Fallback to sheets if cache is empty
            if not trainers:
                logger.warning("⚠️  Cache empty, fetching from sheets...")
                sheets = get_sheets_manager()
                result = sheets.get_trainers_details()
                if result['success']:
                    trainers = result['data']
                    # Update cache for next time
                    with cache.lock:
                        cache.data['trainers'] = trainers
            
            return jsonify({
                'success': True,
                'data': trainers,
                'from_cache': len(trainers) > 0
            }), 200
        except Exception as e:
            return jsonify({
                'error': 'Failed to retrieve trainer details',
                'message': str(e)
            }), 500

    # Update trainer information
    @app.route('/api/trainers/<trainer_name>/update', methods=['PUT'])
    def update_trainer(trainer_name):
        """Update trainer information (email, phone)"""
        try:
            data = request.get_json()
            sheets = get_sheets_manager()
            
            new_name = data.get('new_name', trainer_name)
            email = data.get('email', '')
            phone = data.get('phone', '')
            
            result = sheets.update_trainer(trainer_name, new_name, email, phone)
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            return jsonify({
                'error': 'Failed to update trainer',
                'message': str(e)
            }), 500

    # Delete trainer
    @app.route('/api/trainers/<trainer_name>/delete', methods=['DELETE'])
    def delete_trainer(trainer_name):
        """Delete a trainer and all their activities"""
        try:
            sheets = get_sheets_manager()
            result = sheets.delete_trainer(trainer_name)
            
            # Invalidate cache if delete was successful
            if result['success']:
                try:
                    cache = get_data_cache()
                    with cache.lock:
                        cache.data['trainers'] = []
                        cache.data['activities'] = []
                    logger.info("✅ Cache invalidated after trainer deletion")
                except Exception as e:
                    logger.warning(f"⚠️  Could not invalidate cache: {e}")
            
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            return jsonify({
                'error': 'Failed to delete trainer',
                'message': str(e)
            }), 500
    
    # Get activity list
    @app.route('/api/activity-list', methods=['GET'])
    def get_activity_list():
        """Get list of all available activities"""
        try:
            sheets = get_sheets_manager()
            result = sheets.get_activity_list()
            
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            return jsonify({
                'error': 'Failed to retrieve activity list',
                'message': str(e)
            }), 500
    
    # Get activity summary for table display
    @app.route('/api/activities/summary', methods=['GET'])
    def get_activity_summary():
        """Get detailed activity summary with optional filtering"""
        try:
            trainer_filter = request.args.get('trainer')
            month_filter = request.args.get('month')
            trainer_type_filter = request.args.get('trainer_type')
            
            print(f"📊 get_activity_summary called with: trainer={trainer_filter}, month={month_filter}, trainer_type={trainer_type_filter}")
            
            # Get activities from cache first
            cache = get_data_cache()
            activities = cache.get_activities()
            
            # Fallback to sheets if cache is empty
            if not activities:
                logger.warning("⚠️  Cache empty, fetching from sheets...")
                sheets = get_sheets_manager()
                result = sheets.get_all_activities()
                if result['success']:
                    activities = result['data']
                    # Update cache for next time
                    with cache.lock:
                        cache.data['activities'] = activities
                else:
                    return jsonify(result), 400
            
            print(f"📊 Total activities: {len(activities)}")
            
            # If trainer_type filter is set, get trainers of that type and filter activities
            if trainer_type_filter:
                try:
                    # Get trainers from cache first
                    trainers = cache.get_trainers()
                    
                    # Fallback to sheets if cache is empty
                    if not trainers:
                        logger.warning("⚠️  Cache empty, fetching trainers from sheets...")
                        sheets = get_sheets_manager()
                        trainers_result = sheets.get_trainers_details()
                        if trainers_result['success']:
                            trainers = trainers_result['data']
                            # Update cache
                            with cache.lock:
                                cache.data['trainers'] = trainers
                    
                    if trainers:
                        trainers_of_type = [t['name'] for t in trainers if t.get('trainer_type') == trainer_type_filter]
                        print(f"📊 Filtering by trainer type '{trainer_type_filter}': found {len(trainers_of_type)} trainers - {trainers_of_type}")
                        activities = [a for a in activities if a.get('Trainer Name', '') in trainers_of_type]
                        print(f"📊 After type filter: {len(activities)} activities")
                    else:
                        print(f"⚠️  Could not get trainers")
                except Exception as e:
                    print(f"❌ Error filtering by trainer type: {e}")
                    import traceback
                    traceback.print_exc()
            
            # Apply trainer filter
            if trainer_filter:
                activities = [a for a in activities if a.get('Trainer Name', '').lower() == trainer_filter.lower()]
            
            if month_filter:
                filtered = []
                for activity in activities:
                    date_str = activity.get('Date', '')
                    if date_str:
                        try:
                            from datetime import datetime
                            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                            activity_month = date_obj.strftime('%Y-%m')
                            if activity_month == month_filter:
                                filtered.append(activity)
                        except:
                            pass
                activities = filtered
            
            # Calculate hours for each activity
            for activity in activities:
                start_time = activity.get('Start Time', '')
                end_time = activity.get('End Time', '')
                if start_time and end_time:
                    try:
                        start_h, start_m = map(int, start_time.split(':'))
                        end_h, end_m = map(int, end_time.split(':'))
                        duration_minutes = (end_h - start_h) * 60 + (end_m - start_m)
                        activity['hours'] = round(duration_minutes / 60, 2)
                    except:
                        activity['hours'] = 0
                else:
                    activity['hours'] = 0
            
            # Calculate totals
            total_hours = sum(a.get('hours', 0) for a in activities)
            MONTHLY_QUOTA = 180
            overtime = max(0, total_hours - MONTHLY_QUOTA)
            undertime = max(0, MONTHLY_QUOTA - total_hours)
            
            return jsonify({
                'success': True,
                'data': activities,
                'totals': {
                    'total_hours': round(total_hours, 2),
                    'overtime': round(overtime, 2),
                    'undertime': round(undertime, 2)
                },
                'count': len(activities)
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'error': 'Failed to retrieve activity summary',
                'message': str(e)
            }), 500
    
    # Activity History endpoint
    @app.route('/api/activity-history', methods=['GET'])
    def get_activity_history():
        """Get activity history with optional filtering"""
        try:
            # Get query parameters for filtering
            trainer_name = request.args.get('trainer', None)
            activity_type = request.args.get('activity', None)
            start_date = request.args.get('start_date', None)
            end_date = request.args.get('end_date', None)
            limit = request.args.get('limit', 500, type=int)
            
            # Get activities from cache first
            cache = get_data_cache()
            all_activities = cache.get_activities()
            
            # Fallback to sheets if cache is empty
            if not all_activities:
                logger.warning("⚠️  Cache empty, fetching from sheets...")
                sheets = get_sheets_manager()
                result = sheets.get_all_activities(limit=limit)
                if result['success']:
                    all_activities = result['data']
                    # Update cache for next time
                    with cache.lock:
                        cache.data['activities'] = all_activities
                else:
                    return jsonify({
                        'success': False,
                        'data': [],
                        'message': 'Failed to retrieve activities'
                    }), 400
            
            # Filter activities
            filtered = []
            for activity in all_activities:
                # Filter by trainer
                if trainer_name and activity.get('Trainer Name', '').lower() != trainer_name.lower():
                    continue
                
                # Filter by activity type
                if activity_type and activity.get('Activity', '').lower() != activity_type.lower():
                    continue
                
                # Filter by date range
                if start_date or end_date:
                    activity_date = activity.get('Date', '')
                    if start_date and activity_date < start_date:
                        continue
                    if end_date and activity_date > end_date:
                        continue
                
                filtered.append(activity)
            
            # Sort by date descending (most recent first)
            filtered.sort(key=lambda x: x.get('Date', ''), reverse=True)
            
            return jsonify({
                'success': True,
                'data': filtered,
                'total': len(filtered)
            }), 200
        except Exception as e:
            print(f"Error retrieving activity history: {e}")
            return jsonify({
                'success': False,
                'error': str(e),
                'data': []
            }), 500
    
    # Reports endpoints
    @app.route('/api/reports/activity-summary', methods=['GET'])
    def report_activity_summary():
        """Generate activity summary by trainer"""
        try:
            from reports import ReportsManager
            sheets = get_sheets_manager()
            reports = ReportsManager(sheets)
            trainer_filter = request.args.get('trainer')
            date_filter = request.args.get('date')
            date_from = request.args.get('dateFrom')
            date_to = request.args.get('dateTo')
            result = reports.activity_summary_by_trainer(
                trainer_filter=trainer_filter,
                date_filter=date_filter,
                date_from=date_from,
                date_to=date_to
            )
            
            return jsonify(result), 200 if result.get('success') else 400
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/reports/activity-distribution', methods=['GET'])
    def report_activity_distribution():
        """Generate activity types distribution report"""
        try:
            from reports import ReportsManager
            sheets = get_sheets_manager()
            reports = ReportsManager(sheets)
            trainer_filter = request.args.get('trainer')
            month_filter = request.args.get('month')
            date_filter = request.args.get('date')
            date_from = request.args.get('dateFrom')
            date_to = request.args.get('dateTo')
            result = reports.activity_types_distribution(
                trainer_filter=trainer_filter,
                month_filter=month_filter,
                date_filter=date_filter,
                date_from=date_from,
                date_to=date_to
            )
            
            return jsonify(result), 200 if result.get('success') else 400
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/reports/training-hours', methods=['GET'])
    def report_training_hours():
        """Generate training hours report"""
        try:
            from reports import ReportsManager
            sheets = get_sheets_manager()
            reports = ReportsManager(sheets)
            trainer_filter = request.args.get('trainer')
            month_filter = request.args.get('month')
            date_filter = request.args.get('date')
            date_from = request.args.get('dateFrom')
            date_to = request.args.get('dateTo')
            result = reports.training_hours_report(
                trainer_filter=trainer_filter,
                month_filter=month_filter,
                date_filter=date_filter,
                date_from=date_from,
                date_to=date_to
            )
            
            return jsonify(result), 200 if result.get('success') else 400
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/reports/monthly-trends', methods=['GET'])
    def report_monthly_trends():
        """Generate monthly activity trends report"""
        try:
            from reports import ReportsManager
            sheets = get_sheets_manager()
            reports = ReportsManager(sheets)
            trainer_filter = request.args.get('trainer')
            month_filter = request.args.get('month')
            date_filter = request.args.get('date')
            date_from = request.args.get('dateFrom')
            date_to = request.args.get('dateTo')
            result = reports.monthly_activity_trends(
                trainer_filter=trainer_filter,
                month_filter=month_filter,
                date_filter=date_filter,
                date_from=date_from,
                date_to=date_to
            )
            
            return jsonify(result), 200 if result.get('success') else 400
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    @app.route('/api/reports/export-csv', methods=['GET'])
    def export_csv():
        """Export activities to CSV"""
        try:
            from reports import ReportsManager
            sheets = get_sheets_manager()
            reports = ReportsManager(sheets)
            result = reports.export_to_csv()
            
            if result.get('success'):
                # Return CSV file
                from flask import make_response
                response = make_response(result['data'])
                response.headers['Content-Type'] = 'text/csv'
                response.headers['Content-Disposition'] = f'attachment; filename="{result["filename"]}"'
                return response
            else:
                return jsonify(result), 400
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500

    # Get time report status for trainers
    @app.route('/api/reports/time-status', methods=['GET'])
    def get_time_status():
        """Get daily time report status for trainers in a month"""
        try:
            month = request.args.get('month')
            trainer_type = request.args.get('trainer_type', 'Assistant Trainer')
            if not month:
                # Default to current month
                from datetime import datetime
                month = datetime.now().strftime('%Y-%m')
            
            sheets = get_sheets_manager()
            result = sheets.get_time_report_status(month, trainer_type=trainer_type)
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    # Get activities by trainer and date
    @app.route('/api/activities/<trainer_name>/<date>', methods=['GET'])
    def get_activities_by_date(trainer_name, date):
        """Get all activities for a trainer on a specific date"""
        try:
            sheets = get_sheets_manager()
            result = sheets.get_activities_by_trainer_and_date(trainer_name, date)
            
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            return jsonify({
                'error': 'Failed to retrieve activities',
                'message': str(e)
            }), 500
    
    # Update activity
    @app.route('/api/activities/<trainer_name>/<date>/<activity_name>', methods=['PUT'])
    def update_activity(trainer_name, date, activity_name):
        """Update an existing activity"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
            
            sheets = get_sheets_manager()
            result = sheets.update_activity(
                trainer_name=trainer_name,
                date=date,
                activity_name=activity_name,
                start_time=data.get('start_time'),
                end_time=data.get('end_time'),
                note=data.get('note', ''),
                old_start_time=data.get('old_start_time'),
                old_end_time=data.get('old_end_time')
            )
            
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error updating activity: {str(e)}'
            }), 500
    
    # Delete activity
    @app.route('/api/activities/<trainer_name>/<date>/<activity_name>', methods=['DELETE'])
    def delete_activity(trainer_name, date, activity_name):
        """Delete an existing activity"""
        try:
            sheets = get_sheets_manager()
            result = sheets.delete_activity(
                trainer_name=trainer_name,
                date=date,
                activity_name=activity_name
            )
            
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error deleting activity: {str(e)}'
            }), 500
    
    # Get tournaments
    @app.route('/api/tournaments', methods=['GET'])
    def get_tournaments():
        """Get list of all tournaments from cache"""
        try:
            cache = get_data_cache()
            tournaments = cache.get_tournaments()
            
            # Fallback to sheets if cache is empty
            if not tournaments:
                logger.warning("⚠️  Cache empty, fetching from sheets...")
                sheets = get_sheets_manager()
                result = sheets.get_tournaments()
                if result['success']:
                    tournaments = result['data']
                    # Update cache for next time
                    with cache.lock:
                        cache.data['tournaments'] = tournaments
            
            return jsonify({
                'success': True,
                'data': tournaments,
                'from_cache': len(tournaments) > 0
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error fetching tournaments: {str(e)}'
            }), 500
    
    # Get tournaments with volunteer info (for admin dashboard)
    @app.route('/api/tournaments/with-volunteers', methods=['GET'])
    def get_tournaments_with_volunteers():
        """Get list of tournaments with volunteer registration info"""
        try:
            sheets = get_sheets_manager()
            result = sheets.get_tournaments()
            
            if not result['success']:
                return jsonify({
                    'success': False,
                    'message': 'Failed to fetch tournaments'
                }), 500
            
            tournaments = result['data']
            
            # Add volunteer info to each tournament
            for tournament in tournaments:
                tournament_name = tournament.get('Tournament Name', '')
                vol_result = sheets.get_tournament_volunteers(tournament_name)
                tournament['volunteers'] = vol_result['volunteers']
                tournament['volunteer_count'] = vol_result['count']
            
            return jsonify({
                'success': True,
                'data': tournaments
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error fetching tournaments: {str(e)}'
            }), 500
    
    # Import tournaments from Badminton Sweden
    @app.route('/api/tournaments/import', methods=['POST'])
    def import_tournaments():
        """Import tournaments from Badminton Sweden website"""
        try:
            from tournament_scraper import import_tournaments_from_badminton_sweden
            
            logger.warning("\n" + "="*70)
            logger.warning("🏸 TOURNAMENT IMPORT STARTED")
            logger.warning("="*70)
            
            # First, repair the tournaments sheet if needed
            sheets = get_sheets_manager()
            logger.warning("\n0️⃣  VERIFYING SHEET STRUCTURE...")
            sheets.repair_tournaments_sheet()
            
            result = import_tournaments_from_badminton_sweden()
            
            logger.warning(f"\n📊 IMPORT RESULT:")
            logger.warning(f"   Success: {result['success']}")
            logger.warning(f"   Message: {result['message']}")
            logger.warning(f"   Tournaments found: {len(result.get('imported', []))}")
            
            if result['success'] and result['imported']:
                logger.warning(f"\n✅ Processing {len(result['imported'])} tournaments...")
                
                # Add tournaments to sheets
                sheets = get_sheets_manager()
                added_count = 0
                skipped_count = 0
                errors = []
                skipped = []
                
                for idx, tournament_data in enumerate(result['imported'], 1):
                    tournament_name = tournament_data.get('Tournament Name', 'N/A')
                    logger.warning(f"\n   [{idx}] {tournament_name}")
                    logger.warning(f"       Start Date: {tournament_data.get('Start Date', 'N/A')}")
                    logger.warning(f"       End Date: {tournament_data.get('End Date', 'N/A')}")
                    logger.warning(f"       Venue: {tournament_data.get('Venue', 'N/A')}")
                    
                    # Check if tournament already exists
                    if sheets.tournament_exists(tournament_name):
                        logger.warning(f"       ⚠️  Tournament already exists, skipping")
                        skipped_count += 1
                        skipped.append(tournament_name)
                        continue
                    
                    add_result = sheets.add_tournament(tournament_data)
                    if add_result['success']:
                        added_count += 1
                        logger.warning(f"       ✅ Added successfully")
                    else:
                        error_msg = f"{tournament_name}: {add_result['message']}"
                        errors.append(error_msg)
                        logger.warning(f"       ❌ {error_msg}")
                
                # Invalidate cache
                try:
                    cache = get_data_cache()
                    with cache.lock:
                        cache.data['tournaments'] = []
                    logger.warning(f"\n✅ Cache invalidated")
                except Exception as e:
                    logger.warning(f"⚠️  Could not invalidate cache: {e}")
                
                logger.warning("\n" + "="*70)
                logger.warning(f"🎉 IMPORT COMPLETE:")
                logger.warning(f"   Added: {added_count}/{len(result['imported'])}")
                if skipped_count > 0:
                    logger.warning(f"   Skipped (already exist): {skipped_count}")
                if errors:
                    logger.warning(f"   Errors: {len(errors)}")
                logger.warning("="*70 + "\n")
                
                return jsonify({
                    'success': True,
                    'message': f'Imported {added_count} tournaments' + (f', skipped {skipped_count} duplicates' if skipped_count > 0 else ''),
                    'imported_count': added_count,
                    'skipped_count': skipped_count,
                    'total_found': len(result['imported']),
                    'skipped': skipped,
                    'errors': errors,
                    'tournaments': result['imported']
                }), 200
            else:
                logger.warning(f"\n❌ IMPORT FAILED: {result['message']}")
                logger.warning("="*70 + "\n")
                
                return jsonify({
                    'success': False,
                    'message': result['message']
                }), 400
        
        except Exception as e:
            logger.error(f"Error importing tournaments: {e}")
            return jsonify({
                'success': False,
                'message': f'Error importing tournaments: {str(e)}'
            }), 500
    
    # Repair tournaments sheet
    @app.route('/api/tournaments/repair', methods=['POST'])
    def repair_tournaments_sheet():
        """Repair the tournaments sheet structure"""
        try:
            sheets = get_sheets_manager()
            success = sheets.repair_tournaments_sheet()
            
            if success:
                return jsonify({
                    'success': True,
                    'message': 'Tournaments sheet repaired successfully'
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to repair tournaments sheet'
                }), 400
        except Exception as e:
            logger.error(f"Error repairing tournaments sheet: {e}")
            return jsonify({
                'success': False,
                'message': f'Error repairing tournaments sheet: {str(e)}'
            }), 500
    
    # Add new tournament
    @app.route('/api/tournaments', methods=['POST'])
    def add_tournament():
        """Add a new tournament"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
            
            tournament_name = data.get('Tournament Name')
            date = data.get('Date')
            
            if not tournament_name or not date:
                return jsonify({
                    'success': False,
                    'message': 'Tournament name and date are required'
                }), 400
            
            sheets = get_sheets_manager()
            result = sheets.add_tournament(data)
            
            # If successful, update cache
            if result['success']:
                try:
                    cache = get_data_cache()
                    with cache.lock:
                        cache.data['tournaments'] = []  # Invalidate cache
                    logger.info("✅ Tournament added to cache")
                except Exception as e:
                    logger.warning(f"⚠️  Could not update cache: {e}")
            
            return jsonify(result), 201 if result['success'] else 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error adding tournament: {str(e)}'
            }), 500
    
    # Register volunteer for tournament
    @app.route('/api/tournaments/register', methods=['POST'])
    def register_tournament():
        """Register a volunteer for a tournament with optional comments"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
            
            volunteer_name = data.get('volunteer_name')
            tournament_name = data.get('tournament_name')
            comments = data.get('comments', '')
            
            if not volunteer_name or not tournament_name:
                return jsonify({
                    'success': False,
                    'message': 'Volunteer name and tournament name required'
                }), 400
            
            # Write to sheets
            sheets = get_sheets_manager()
            result = sheets.register_volunteer(volunteer_name, tournament_name, comments)
            
            # If successful, also update cache
            if result['success']:
                try:
                    from datetime import datetime
                    cache = get_data_cache()
                    registration = {
                        'Volunteer Name': volunteer_name,
                        'Tournament Name': tournament_name,
                        'Registration Date': datetime.now().strftime('%Y-%m-%d'),
                        'Status': 'Registered',
                        'Comments': comments
                    }
                    cache.add_volunteer_registration(registration)
                    logger.info(f"✅ Volunteer registration added to cache")
                except Exception as e:
                    logger.warning(f"⚠️  Could not update cache: {e}")
            
            
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error registering volunteer: {str(e)}'
            }), 500
    
    # Unregister volunteer from tournament
    @app.route('/api/tournaments/unregister', methods=['POST'])
    def unregister_tournament():
        """Unregister a volunteer from a tournament"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
            
            volunteer_name = data.get('volunteer_name')
            tournament_name = data.get('tournament_name')
            
            if not volunteer_name or not tournament_name:
                return jsonify({
                    'success': False,
                    'message': 'Volunteer name and tournament name required'
                }), 400
            
            # Remove from sheets
            sheets = get_sheets_manager()
            result = sheets.unregister_volunteer(volunteer_name, tournament_name)
            
            # If successful, invalidate cache
            if result['success']:
                try:
                    cache = get_data_cache()
                    with cache.lock:
                        cache.data['volunteer_registrations'] = []
                    logger.info(f"✅ Volunteer unregistration completed, cache invalidated")
                except Exception as e:
                    logger.warning(f"⚠️  Could not update cache: {e}")
            
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error unregistering volunteer: {str(e)}'
            }), 500
    
    # Get volunteer registrations
    @app.route('/api/tournaments/registrations/<volunteer_name>', methods=['GET'])
    def get_volunteer_registrations(volunteer_name):
        """Get all tournament registrations for a volunteer from cache"""
        try:
            cache = get_data_cache()
            all_registrations = cache.get_volunteer_registrations()
            
            # Filter by volunteer name
            volunteer_registrations = [
                reg for reg in all_registrations 
                if reg.get('Volunteer Name', '').strip() == volunteer_name
            ]
            
            return jsonify({
                'success': True,
                'data': volunteer_registrations,
                'from_cache': True
            }), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error fetching registrations: {str(e)}'
            }), 500

    # Get all volunteers (for admin management)
    @app.route('/api/volunteers/list', methods=['GET'])
    @verify_token
    def get_all_volunteers():
        """Get list of all unique volunteers"""
        try:
            sheets = get_sheets_manager()
            result = sheets.get_all_volunteers()
            
            if result['success']:
                return jsonify({
                    'success': True,
                    'data': result['data']
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': result.get('message', 'Failed to fetch volunteers')
                }), 400
        except Exception as e:
            logger.error(f"Error fetching volunteers: {e}")
            return jsonify({
                'success': False,
                'message': f'Error fetching volunteers: {str(e)}'
            }), 500

    # Update volunteer
    @app.route('/api/volunteers/update', methods=['POST'])
    @verify_token
    def update_volunteer():
        """Update volunteer details"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
            
            old_name = data.get('old_name', '').strip()
            new_name = data.get('name', '').strip()
            email = data.get('email', '').strip()
            phone = data.get('phone', '').strip()
            
            if not old_name or not new_name:
                return jsonify({
                    'success': False,
                    'message': 'Volunteer name cannot be empty'
                }), 400
            
            sheets = get_sheets_manager()
            result = sheets.update_volunteer(old_name, new_name, email, phone)
            
            if result['success']:
                return jsonify({
                    'success': True,
                    'message': 'Volunteer updated successfully'
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': result.get('message', 'Failed to update volunteer')
                }), 400
        except Exception as e:
            logger.error(f"Error updating volunteer: {e}")
            return jsonify({
                'success': False,
                'message': f'Error updating volunteer: {str(e)}'
            }), 500

    # Remove volunteer
    @app.route('/api/volunteers/remove', methods=['POST'])
    @verify_token
    def remove_volunteer():
        """Remove volunteer from registrations"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
            
            volunteer_name = data.get('name', '').strip()
            
            if not volunteer_name:
                return jsonify({
                    'success': False,
                    'message': 'Volunteer name is required'
                }), 400
            
            sheets = get_sheets_manager()
            result = sheets.remove_volunteer(volunteer_name)
            
            if result['success']:
                return jsonify({
                    'success': True,
                    'message': 'Volunteer removed successfully'
                }), 200
            else:
                return jsonify({
                    'success': False,
                    'message': result.get('message', 'Failed to remove volunteer')
                }), 400
        except Exception as e:
            logger.error(f"Error removing volunteer: {e}")
            return jsonify({
                'success': False,
                'message': f'Error removing volunteer: {str(e)}'
            }), 500
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        # If it's an API request, return JSON
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Endpoint not found'}), 404
        # Otherwise serve index.html for React Router
        try:
            return send_from_directory(app.static_folder, 'index.html')
        except:
            return jsonify({'error': 'Not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error'}), 500
    
    return app


if __name__ == '__main__':
    print("\n" + "="*60)
    print("🎯 STARTING BADMINTON ACTIVITY LOGGER")
    print("="*60)
    print(f"PORT: {os.getenv('PORT', 5000)}")
    print(f"DEBUG: {Config.DEBUG}")
    print("="*60 + "\n")
    
    app = create_app()
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        debug=Config.DEBUG
    )
