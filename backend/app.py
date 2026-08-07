from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from config import Config
from sheets import get_sheets_manager
from auth import register_auth_routes
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
        """Log a new badminton activity"""
        try:
            data = request.get_json()
            
            print(f"\n{'='*60}")
            print(f"📥 RECEIVED ACTIVITY REQUEST")
            print(f"{'='*60}")
            print(f"Raw JSON data: {data}")
            print(f"Data type: {type(data)}")
            if data:
                for key, value in data.items():
                    print(f"  - {key}: {value} (type: {type(value).__name__})")
            
            if not data:
                return jsonify({'error': 'No data provided'}), 400
            
            sheets = get_sheets_manager()
            print(f"\n📊 Sheets manager authenticated: {sheets.authenticated}")
            print(f"📝 Calling add_activity()...")
            result = sheets.add_activity(data)
            
            print(f"\n📤 ACTIVITY RESULT")
            print(f"{'='*60}")
            print(f"Result: {result}")
            print(f"{'='*60}\n")
            
            status_code = 201 if result['success'] else 400
            return jsonify(result), status_code
        except Exception as e:
            error_msg = str(e)
            print(f"\n❌ ERROR in log_activity: {error_msg}")
            import traceback
            traceback.print_exc()
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
        """Retrieve all logged activities"""
        try:
            limit = request.args.get('limit', 100, type=int)
            sheets = get_sheets_manager()
            result = sheets.get_all_activities(limit=limit)
            
            if not result['success']:
                print(f"DEBUG: GET activities failed: {result}")
            
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            error_msg = str(e)
            print(f"DEBUG: GET activities exception: {error_msg}")
            return jsonify({
                'error': 'Failed to retrieve activities',
                'message': error_msg
            }), 500
    
    # Get trainers list
    @app.route('/api/trainers', methods=['GET'])
    def get_trainers():
        """Get list of all trainers"""
        try:
            sheets = get_sheets_manager()
            result = sheets.get_trainers()
            
            return jsonify(result), 200 if result['success'] else 400
        except Exception as e:
            return jsonify({
                'error': 'Failed to retrieve trainers',
                'message': str(e)
            }), 500

    # Get trainer details with email and phone
    @app.route('/api/trainers/details/all', methods=['GET'])
    def get_trainers_details():
        """Get list of all trainers with their details (email, phone)"""
        try:
            sheets = get_sheets_manager()
            result = sheets.get_trainers_details()
            
            return jsonify(result), 200 if result['success'] else 400
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
            
            sheets = get_sheets_manager()
            
            # Get all activities
            activities_result = sheets.get_all_activities()
            if not activities_result['success']:
                return jsonify(activities_result), 400
            
            activities = activities_result['data']
            print(f"📊 Total activities in sheet: {len(activities)}")
            
            # If trainer_type filter is set, get trainers of that type and filter activities
            if trainer_type_filter:
                try:
                    # Get all trainers with their types from Login sheet
                    trainers_result = sheets.get_trainers_details()
                    if trainers_result['success']:
                        trainers_of_type = [t['name'] for t in trainers_result['data'] if t.get('trainer_type') == trainer_type_filter]
                        print(f"📊 Filtering by trainer type '{trainer_type_filter}': found {len(trainers_of_type)} trainers - {trainers_of_type}")
                        activities = [a for a in activities if a.get('Trainer Name', '') in trainers_of_type]
                        print(f"📊 After type filter: {len(activities)} activities")
                    else:
                        print(f"⚠️  Could not get trainers details: {trainers_result}")
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
            sheets = get_sheets_manager()
            
            # Get query parameters for filtering
            trainer_name = request.args.get('trainer', None)
            activity_type = request.args.get('activity', None)
            start_date = request.args.get('start_date', None)
            end_date = request.args.get('end_date', None)
            limit = request.args.get('limit', 500, type=int)
            
            # Get all activities
            activities = sheets.get_all_activities(limit=limit)
            
            if not activities.get('success'):
                return jsonify({
                    'success': False,
                    'data': [],
                    'message': 'Failed to retrieve activities'
                }), 400
            
            all_activities = activities.get('data', [])
            
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
            result = reports.activity_summary_by_trainer(trainer_filter=trainer_filter)
            
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
            result = reports.activity_types_distribution(trainer_filter=trainer_filter, month_filter=month_filter)
            
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
            result = reports.training_hours_report(trainer_filter=trainer_filter, month_filter=month_filter)
            
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
            result = reports.monthly_activity_trends(trainer_filter=trainer_filter, month_filter=month_filter)
            
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
