from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from config import Config
from database import get_db_manager
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
    
    # Initialize database
    logger.warning(f"\n🔧 Initializing SQLite database...")
    db = get_db_manager()
    logger.warning(f"✅ Database initialized")
    
    # Register authentication routes (pass db as sheets_manager since it has compatible interface)
    logger.warning(f"\n📝 Registering auth routes...")
    register_auth_routes(app, db)
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
        """Log a new badminton activity to database"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            # Write to database
            db = get_db_manager()
            result = db.add_activity(data)
            
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
            
            db = get_db_manager()
            result = db.delete_activity_by_details(
                trainer_name=data.get('trainer_name'),
                date=data.get('date'),
                activity=data.get('activity'),
                start_time=data.get('start_time'),
                end_time=data.get('end_time')
            )
            
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
            
            db = get_db_manager()
            result = db.delete_activities_by_filter(
                trainer=data.get('trainer'),
                activity_type=data.get('activity_type'),
                month=data.get('month')
            )
            
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
    
    # Mark activity as paid
    @app.route('/api/activities/mark-paid', methods=['POST'])
    @verify_token
    def mark_activity_paid():
        """Mark an activity as paid (only for Junior trainers)"""
        try:
            data = request.get_json()
            
            if not data:
                return jsonify({'success': False, 'message': 'No data provided'}), 400
            
            trainer_name = data.get('trainer_name', '').strip()
            activity_date = data.get('date', '').strip()
            activity_type = data.get('activity', '').strip()
            paid_status = data.get('paid', False)  # True or False
            
            if not trainer_name or not activity_date or not activity_type:
                return jsonify({
                    'success': False,
                    'message': 'Trainer name, date, and activity are required'
                }), 400
            
            sheets = get_db_manager()
            
            # Update the activity's paid status
            result = sheets.update_activity_paid(trainer_name, activity_date, activity_type, paid_status)
            
            if result['success']:
                # If marking as paid, automatically freeze the date
                if paid_status:
                    freeze_result = sheets.add_freeze('Date Range', activity_date + ' to ' + activity_date, 
                                                      f'Auto-frozen: Activity paid for {trainer_name}', 'admin')
                    logger.info(f"✅ Activity frozen after marking as paid: {trainer_name} on {activity_date}")
                
                logger.warning(f"✅ Activity marked as {'paid' if paid_status else 'unpaid'}: {trainer_name} - {activity_date} - {activity_type}")
                
                return jsonify({
                    'success': True,
                    'message': f'Activity marked as {"paid" if paid_status else "unpaid"}'
                }), 200
            else:
                logger.error(f"❌ Failed to mark activity as paid: {result.get('message')}")
                return jsonify({
                    'success': False,
                    'message': result.get('message', 'Failed to mark activity as paid')
                }), 400
        
        except Exception as e:
            logger.error(f"❌ Error marking activity as paid: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'message': f'Error: {str(e)}'
            }), 500
    
    # Get all activities
    @app.route('/api/activities', methods=['GET'])
    def get_activities():
        """Retrieve all logged activities, optionally filtered by trainer"""
        try:
            limit = request.args.get('limit', 100, type=int)
            trainer = request.args.get('trainer', None)  # Optional trainer filter
            
            db = get_db_manager()
            result = db.get_all_activities(limit=limit)
            
            if not result['success']:
                return jsonify(result), 400
            
            all_activities = result['data']
            
            # Filter by trainer if specified
            if trainer:
                trainer_lower = trainer.strip().lower()
                all_activities = [a for a in all_activities if a.get('Trainer Name', '').strip().lower() == trainer_lower]
            
            return jsonify({
                'success': True,
                'data': all_activities[:limit]
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
        """Get list of all trainers"""
        try:
            db = get_db_manager()
            result = db.get_trainers_details()
            
            return jsonify({
                'success': True,
                'data': result['data'] if result['success'] else []
            }), 200
        except Exception as e:
            return jsonify({
                'error': 'Failed to retrieve trainers',
                'message': str(e)
            }), 500

    # Get trainers excluding volunteers
    @app.route('/api/trainers/staff', methods=['GET'])
    def get_staff_trainers():
        """Get list of trainers excluding volunteers (Assistant Trainers and Juniors only)"""
        try:
            db = get_db_manager()
            result = db.get_trainers_details()
            trainers = result['data'] if result['success'] else []
            
            # Filter out volunteers - keep only Assistant Trainer and Junior (supports both 'Junior' and 'Junior Trainer')
            staff_trainers = [t for t in trainers if t.get('trainer_type', 'Assistant Trainer') in ['Assistant Trainer', 'Junior', 'Junior Trainer']]
            
            return jsonify({
                'success': True,
                'data': staff_trainers,
                'count': len(staff_trainers)
            }), 200
        except Exception as e:
            logger.error(f"❌ Error fetching staff trainers: {str(e)}")
            return jsonify({
                'error': 'Failed to retrieve staff trainers',
                'message': str(e)
            }), 500

    # Get trainer details with email and phone
    @app.route('/api/trainers/details/all', methods=['GET'])
    def get_trainers_details():
        """Get list of all trainers with their details"""
        try:
            db = get_db_manager()
            result = db.get_trainers_details()
            
            return jsonify({
                'success': True,
                'data': result['data'] if result['success'] else []
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
            sheets = get_db_manager()
            
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
            db = get_db_manager()
            result = db.delete_trainer(trainer_name)
            
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
            sheets = get_db_manager()
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
            
            # Get activities from database
            db = get_db_manager()
            result = db.get_all_activities(limit=10000)
            if not result['success']:
                return jsonify(result), 400
            activities = result['data']
            
            print(f"📊 Total activities: {len(activities)}")
            
            # If trainer_type filter is set, get trainers of that type and filter activities
            if trainer_type_filter:
                try:
                    trainers_result = db.get_trainers_details()
                    trainers = trainers_result['data'] if trainers_result['success'] else []
                    
                    if trainers:
                        trainers_of_type = [t['name'].strip().lower() for t in trainers if t.get('trainer_type') == trainer_type_filter]
                        print(f"📊 Filtering by trainer type '{trainer_type_filter}': found {len(trainers_of_type)} trainers - {trainers_of_type}")
                        activities = [a for a in activities if a.get('Trainer Name', '').strip().lower() in trainers_of_type]
                        print(f"📊 After type filter: {len(activities)} activities")
                    else:
                        print(f"⚠️  Could not get trainers")
                except Exception as e:
                    print(f"❌ Error filtering by trainer type: {e}")
                    import traceback
                    traceback.print_exc()
            
            # Apply trainer filter
            if trainer_filter:
                trainer_filter_lower = trainer_filter.strip().lower()
                activities = [a for a in activities if a.get('Trainer Name', '').strip().lower() == trainer_filter_lower]
            
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
            
            # Get activities from database
            db = get_db_manager()
            result = db.get_all_activities(limit=limit)
            if not result['success']:
                return jsonify({
                    'success': False,
                    'data': [],
                    'message': 'Failed to retrieve activities'
                }), 400
            all_activities = result['data']
            
            # Filter activities
            filtered = []
            for activity in all_activities:
                # Filter by trainer
                if trainer_name:
                    activity_trainer = activity.get('Trainer Name', '').strip().lower()
                    if activity_trainer != trainer_name.strip().lower():
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
            sheets = get_db_manager()
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
            sheets = get_db_manager()
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
            sheets = get_db_manager()
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
            sheets = get_db_manager()
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
            sheets = get_db_manager()
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
            
            sheets = get_db_manager()
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
            sheets = get_db_manager()
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
            
            sheets = get_db_manager()
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
            sheets = get_db_manager()
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
        """Get list of all tournaments"""
        try:
            db = get_db_manager()
            result = db.get_tournaments()
            tournaments = result['data'] if result['success'] else []
            
            return jsonify({
                'success': True,
                'data': tournaments
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
            sheets = get_db_manager()
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
            sheets = get_db_manager()
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
                sheets = get_db_manager()
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
                
                # No cache to invalidate - DB is always current
                
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
            sheets = get_db_manager()
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
            
            sheets = get_db_manager()
            result = sheets.add_tournament(data)
            
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
            
            # Write to database
            db = get_db_manager()
            result = db.register_volunteer(volunteer_name, tournament_name, comments)
            
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
            
            # Remove from database
            db = get_db_manager()
            result = db.unregister_volunteer(volunteer_name, tournament_name)
            
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error unregistering volunteer: {str(e)}'
            }), 500
    
    # Get volunteer registrations
    @app.route('/api/tournaments/registrations/<volunteer_name>', methods=['GET'])
    def get_volunteer_registrations(volunteer_name):
        """Get all tournament registrations for a volunteer"""
        try:
            db = get_db_manager()
            result = db.get_volunteer_registrations(volunteer_name)
            
            return jsonify({
                'success': True,
                'data': result['data'] if result['success'] else []
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
            logger.warning("📝 GET /api/volunteers/list - Fetching all volunteers")
            sheets = get_db_manager()
            
            if not sheets.authenticated:
                logger.error("❌ Google Sheets not authenticated")
                return jsonify({
                    'success': False,
                    'message': 'Google Sheets not configured'
                }), 400
            
            logger.warning(f"🔄 Google Sheets authenticated: {sheets.authenticated}")
            result = sheets.get_all_volunteers()
            
            logger.warning(f"📊 Result from sheets.get_all_volunteers(): {result}")
            
            if result['success']:
                volunteer_count = len(result.get('data', []))
                logger.warning(f"✅ Successfully fetched {volunteer_count} volunteers")
                return jsonify({
                    'success': True,
                    'data': result['data'],
                    'count': volunteer_count
                }), 200
            else:
                error_msg = result.get('message', 'Failed to fetch volunteers')
                logger.error(f"❌ Error fetching volunteers: {error_msg}")
                return jsonify({
                    'success': False,
                    'message': error_msg
                }), 400
        except Exception as e:
            logger.error(f"❌ Exception in get_all_volunteers: {str(e)}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return jsonify({
                'success': False,
                'message': f'Error fetching volunteers: {str(e)}'
            }), 500

    # Get available volunteers for dropdown (no authentication required for dropdown)
    @app.route('/api/volunteers/available', methods=['GET'])
    @verify_token
    def get_available_volunteers():
        """Get list of registered volunteers for dropdown selection"""
        try:
            logger.warning("📝 GET /api/volunteers/available - Fetching available volunteers for dropdown")
            sheets = get_db_manager()
            
            if not sheets.authenticated:
                logger.error("❌ Google Sheets not authenticated")
                return jsonify({
                    'success': False,
                    'message': 'Google Sheets not configured'
                }), 400
            
            result = sheets.get_all_volunteers()
            
            if result['success']:
                # Extract just the names for dropdown
                volunteer_names = [v.get('name', v) for v in result.get('data', [])]
                logger.warning(f"✅ Successfully fetched {len(volunteer_names)} available volunteers")
                return jsonify({
                    'success': True,
                    'data': volunteer_names,
                    'count': len(volunteer_names)
                }), 200
            else:
                error_msg = result.get('message', 'Failed to fetch volunteers')
                logger.error(f"❌ Error fetching available volunteers: {error_msg}")
                return jsonify({
                    'success': False,
                    'message': error_msg
                }), 400
        except Exception as e:
            logger.error(f"❌ Exception in get_available_volunteers: {str(e)}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return jsonify({
                'success': False,
                'message': f'Error fetching available volunteers: {str(e)}'
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
            
            sheets = get_db_manager()
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
            
            sheets = get_db_manager()
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

    # Freeze Management endpoints
    @app.route('/api/freeze/dates', methods=['GET'])
    @verify_token
    def get_frozen_dates():
        """Get all frozen dates and months"""
        try:
            logger.warning("📝 GET /api/freeze/dates - Fetching frozen dates")
            sheets = get_db_manager()
            result = sheets.get_frozen_dates()
            
            if result['success']:
                count = len(result.get('data', []))
                logger.warning(f"✅ Retrieved {count} frozen entries")
                return jsonify({
                    'success': True,
                    'data': result['data'],
                    'count': count
                }), 200
            else:
                logger.error(f"❌ Error fetching frozen dates: {result.get('message')}")
                return jsonify({
                    'success': False,
                    'message': result.get('message', 'Failed to fetch frozen dates')
                }), 400
        except Exception as e:
            logger.error(f"❌ Exception in get_frozen_dates: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'message': f'Error fetching frozen dates: {str(e)}'
            }), 500

    @app.route('/api/freeze/add', methods=['POST'])
    @verify_token
    def add_freeze():
        """Add a freeze for a date or month"""
        try:
            logger.warning("📝 POST /api/freeze/add - Adding freeze")
            data = request.get_json()
            
            if not data:
                return jsonify({'success': False, 'message': 'No data provided'}), 400
            
            freeze_type = data.get('freeze_type', '').strip()
            date_or_month = data.get('date_or_month', '').strip()
            reason = data.get('reason', '').strip()
            
            if not freeze_type or not date_or_month:
                return jsonify({'success': False, 'message': 'Freeze type and date/month required'}), 400
            
            if freeze_type not in ['Date Range', 'Month']:
                return jsonify({'success': False, 'message': 'Invalid freeze type'}), 400
            
            sheets = get_db_manager()
            result = sheets.add_freeze(freeze_type, date_or_month, reason, 'admin')
            
            if result['success']:
                logger.warning(f"✅ Added freeze: {freeze_type} - {date_or_month}")
                return jsonify({'success': True, 'message': result['message']}), 200
            else:
                logger.error(f"❌ Failed to add freeze: {result.get('message')}")
                return jsonify({
                    'success': False,
                    'message': result.get('message', 'Failed to add freeze')
                }), 400
        except Exception as e:
            logger.error(f"❌ Exception in add_freeze: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'message': f'Error adding freeze: {str(e)}'
            }), 500

    @app.route('/api/freeze/remove', methods=['POST'])
    @verify_token
    def remove_freeze():
        """Remove a freeze"""
        try:
            logger.warning("📝 POST /api/freeze/remove - Removing freeze")
            data = request.get_json()
            
            if not data:
                return jsonify({'success': False, 'message': 'No data provided'}), 400
            
            freeze_type = data.get('freeze_type', '').strip()
            date_or_month = data.get('date_or_month', '').strip()
            
            if not freeze_type or not date_or_month:
                return jsonify({'success': False, 'message': 'Freeze type and date/month required'}), 400
            
            sheets = get_db_manager()
            result = sheets.remove_freeze(freeze_type, date_or_month)
            
            if result['success']:
                logger.warning(f"✅ Removed freeze: {freeze_type} - {date_or_month}")
                return jsonify({'success': True, 'message': result['message']}), 200
            else:
                logger.error(f"❌ Failed to remove freeze: {result.get('message')}")
                return jsonify({
                    'success': False,
                    'message': result.get('message', 'Failed to remove freeze')
                }), 400
        except Exception as e:
            logger.error(f"❌ Exception in remove_freeze: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'message': f'Error removing freeze: {str(e)}'
            }), 500

    @app.route('/api/freeze/check/<date>', methods=['GET'])
    def check_if_frozen(date):
        """Check if a date is frozen"""
        try:
            sheets = get_db_manager()
            is_frozen = sheets.is_date_frozen(date)
            return jsonify({
                'success': True,
                'date': date,
                'is_frozen': is_frozen
            }), 200
        except Exception as e:
            logger.error(f"Error checking if date is frozen: {e}")
            return jsonify({
                'success': False,
                'message': str(e)
            }), 500

    # ==================== PASSWORD RESET ====================

    @app.route('/api/auth/verify-identity', methods=['POST'])
    def verify_identity():
        """Verify user identity with email + phone, return reset token immediately"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'message': 'No data provided'}), 400

            email = data.get('email', '').strip()
            phone = data.get('phone', '').strip()

            if not email or not phone:
                return jsonify({'success': False, 'message': 'Email and phone number are required'}), 400

            # Check if email and phone match a trainer
            db = get_db_manager()
            conn = db._get_connection()
            try:
                cursor = conn.execute(
                    "SELECT name, email, phone FROM trainers WHERE LOWER(email) = LOWER(?)",
                    (email,)
                )
                row = cursor.fetchone()
            finally:
                conn.close()

            if not row:
                return jsonify({'success': False, 'message': 'Email and phone number do not match any account'}), 400

            # Compare phone numbers (strip spaces, dashes, and leading zeros for comparison)
            stored_phone = str(row['phone']).replace(' ', '').replace('-', '').strip()
            input_phone = phone.replace(' ', '').replace('-', '').strip()

            if stored_phone != input_phone:
                return jsonify({'success': False, 'message': 'Email and phone number do not match any account'}), 400

            # Identity verified - create a reset token
            result = db.create_reset_token(email)
            if result.get('token'):
                return jsonify({
                    'success': True,
                    'token': result['token'],
                    'trainer_name': result['trainer_name']
                }), 200
            else:
                return jsonify({'success': False, 'message': 'Error creating reset token'}), 500

        except Exception as e:
            logger.error(f"❌ Error in verify-identity: {str(e)}", exc_info=True)
            return jsonify({'success': False, 'message': 'An error occurred'}), 500

    @app.route('/api/auth/forgot-password', methods=['POST'])
    def forgot_password():
        """Request a password reset link via email"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'message': 'No data provided'}), 400

            email = data.get('email', '').strip()
            if not email:
                return jsonify({'success': False, 'message': 'Email is required'}), 400

            db = get_db_manager()
            result = db.create_reset_token(email)

            if not result['success']:
                # Still return success to not reveal if email exists
                return jsonify({'success': True, 'message': 'If the email is registered, a reset link will be sent'}), 200

            # If token was created (email found), send the email
            if 'token' in result:
                from email_service import send_reset_email
                base_url = os.environ.get('APP_URL', request.host_url.rstrip('/'))
                email_result = send_reset_email(
                    to_email=result['email'],
                    trainer_name=result['trainer_name'],
                    reset_token=result['token'],
                    base_url=base_url
                )
                logger.warning(f"🔗 Reset requested for {result['trainer_name']} ({result['email']})")

                # In dev/no-SMTP mode, include the link in response for testing
                if email_result.get('reset_link'):
                    return jsonify({
                        'success': True,
                        'message': 'If the email is registered, a reset link will be sent',
                        'dev_reset_link': email_result['reset_link']
                    }), 200

            return jsonify({
                'success': True,
                'message': 'If the email is registered, a reset link will be sent'
            }), 200

        except Exception as e:
            logger.error(f"❌ Error in forgot-password: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'message': 'An error occurred. Please try again.'
            }), 500

    @app.route('/api/auth/validate-reset-token', methods=['POST'])
    def validate_reset_token():
        """Validate a reset token (check if still valid before showing form)"""
        try:
            data = request.get_json()
            token = data.get('token', '') if data else ''

            if not token:
                return jsonify({'success': False, 'message': 'Token is required'}), 400

            db = get_db_manager()
            result = db.validate_reset_token(token)

            return jsonify(result), 200 if result['success'] else 400

        except Exception as e:
            return jsonify({'success': False, 'message': 'Invalid reset link'}), 400

    @app.route('/api/auth/reset-password', methods=['POST'])
    def reset_password():
        """Use a reset token to set a new password"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'message': 'No data provided'}), 400

            token = data.get('token', '').strip()
            new_password = data.get('new_password', '').strip()

            if not token or not new_password:
                return jsonify({'success': False, 'message': 'Token and new password are required'}), 400

            if len(new_password) < 6:
                return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400

            db = get_db_manager()
            result = db.use_reset_token(token, new_password)

            if result['success']:
                logger.warning(f"✅ Password reset successful via token")

            return jsonify(result), 200 if result['success'] else 400

        except Exception as e:
            logger.error(f"❌ Error in reset-password: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'message': 'An error occurred. Please try again.'
            }), 500

    # ==================== BILL MANAGEMENT ====================

    @app.route('/api/bills', methods=['POST'])
    @verify_token
    def submit_bill():
        """Submit a new bill/reimbursement request"""
        try:
            trainer_name = request.form.get('trainer_name', '').strip()
            bill_name = request.form.get('bill_name', '').strip()
            description = request.form.get('description', '').strip()
            amount = request.form.get('amount', '').strip()
            payment_date = request.form.get('payment_date', '').strip()

            if not trainer_name or not bill_name or not amount or not payment_date:
                return jsonify({
                    'success': False,
                    'message': 'Trainer name, bill name, amount, and payment date are required'
                }), 400

            # Handle file upload
            file_data = None
            file_name = ''
            file_type = ''
            if 'file' in request.files:
                file = request.files['file']
                if file.filename:
                    file_data = file.read()
                    file_name = file.filename
                    file_type = file.content_type or ''

            db = get_db_manager()
            result = db.add_bill(
                trainer_name=trainer_name,
                bill_name=bill_name,
                description=description,
                amount=amount,
                payment_date=payment_date,
                file_data=file_data,
                file_name=file_name,
                file_type=file_type
            )

            return jsonify(result), 201 if result['success'] else 400
        except Exception as e:
            logger.error(f"❌ Error submitting bill: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'message': f'Error submitting bill: {str(e)}'
            }), 500

    @app.route('/api/bills', methods=['GET'])
    @verify_token
    def get_bills():
        """Get bills with optional filters (trainer, month)"""
        try:
            trainer_name = request.args.get('trainer', None)
            month = request.args.get('month', None)

            db = get_db_manager()
            result = db.get_bills(trainer_name=trainer_name, month=month)

            return jsonify(result), 200
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error retrieving bills: {str(e)}'
            }), 500

    @app.route('/api/bills/<int:bill_id>/file', methods=['GET'])
    @verify_token
    def get_bill_file(bill_id):
        """Download the file attached to a bill"""
        try:
            from flask import send_file
            import io

            db = get_db_manager()
            result = db.get_bill_file(bill_id)

            if not result['success']:
                return jsonify(result), 404

            file_data = result['data']
            file_name = result['file_name']
            file_type = result['file_type']

            return send_file(
                io.BytesIO(file_data),
                mimetype=file_type,
                as_attachment=True,
                download_name=file_name
            )
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error downloading file: {str(e)}'
            }), 500

    @app.route('/api/bills/<int:bill_id>', methods=['DELETE'])
    @verify_token
    def delete_bill(bill_id):
        """Delete a bill"""
        try:
            # Get username from token to check ownership
            username = request.admin.get('username', '')

            db = get_db_manager()
            # Admins can delete any bill, trainers only their own
            result = db.delete_bill(bill_id, trainer_name=None)  # Allow all for now

            return jsonify(result), 200 if result['success'] else 404
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'Error deleting bill: {str(e)}'
            }), 500

    # ==================== PASSWORD VAULT ====================

    @app.route('/api/vault', methods=['GET'])
    @verify_token
    def get_vault_items():
        """Get all password vault items (passwords hidden)"""
        try:
            db = get_db_manager()
            result = db.get_vault_items(decrypt=False)
            return jsonify(result), 200
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500

    @app.route('/api/vault/<int:item_id>/password', methods=['GET'])
    @verify_token
    def get_vault_password(item_id):
        """Get the decrypted password for a specific vault item"""
        try:
            db = get_db_manager()
            result = db.get_vault_item_password(item_id)
            return jsonify(result), 200 if result['success'] else 404
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500

    @app.route('/api/vault', methods=['POST'])
    @verify_token
    def add_vault_item():
        """Add a new item to the password vault"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'message': 'No data provided'}), 400

            username_from_token = request.admin.get('username', 'admin')
            db = get_db_manager()
            result = db.add_vault_item(
                item_name=data.get('item_name', ''),
                item_type=data.get('item_type', 'other'),
                username=data.get('username', ''),
                password=data.get('password', ''),
                url=data.get('url', ''),
                notes=data.get('notes', ''),
                created_by=username_from_token
            )
            return jsonify(result), 201 if result['success'] else 400
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500

    @app.route('/api/vault/<int:item_id>', methods=['PUT'])
    @verify_token
    def update_vault_item(item_id):
        """Update a vault item"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'message': 'No data provided'}), 400

            db = get_db_manager()
            result = db.update_vault_item(
                item_id=item_id,
                item_name=data.get('item_name'),
                item_type=data.get('item_type'),
                username=data.get('username'),
                password=data.get('password'),
                url=data.get('url'),
                notes=data.get('notes')
            )
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500

    @app.route('/api/vault/<int:item_id>', methods=['DELETE'])
    @verify_token
    def delete_vault_item(item_id):
        """Delete a vault item"""
        try:
            db = get_db_manager()
            result = db.delete_vault_item(item_id)
            return jsonify(result), 200 if result['success'] else 404
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500

    # ==================== DATA MANAGEMENT ====================
    
    @app.route('/api/cache/refresh', methods=['POST'])
    @verify_token
    def refresh_cache():
        """Return database stats (no cache to refresh with SQLite)"""
        try:
            logger.warning("🔄 DATA REFRESH REQUESTED (no-op with SQLite - data is always fresh)")
            
            db = get_db_manager()
            
            # Just get counts to confirm DB is healthy
            activities = db.get_all_activities(limit=1)
            trainers = db.get_trainers_details()
            freezes = db.get_all_freezes()
            
            return jsonify({
                'success': True,
                'message': 'Database is live - no cache needed with SQLite',
                'data': {
                    'activities_count': activities.get('total', 0),
                    'trainers_count': len(trainers.get('data', [])),
                    'freezes_count': len(freezes.get('data', []))
                }
            }), 200
        except Exception as e:
            logger.error(f"❌ Error checking database: {str(e)}", exc_info=True)
            return jsonify({
                'success': False,
                'message': f'Error checking database: {str(e)}'
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
