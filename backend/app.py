from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from config import Config
from sheets import get_sheets_manager
from auth import register_auth_routes
import os

def create_app():
    """Application factory"""
    app = Flask(__name__, static_folder='static', static_url_path='')
    app.config.from_object(Config)
    
    # Enable CORS for API routes only
    CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}})
    
    # Initialize Google Sheets on startup
    sheets_manager = get_sheets_manager()
    
    # Register authentication routes
    register_auth_routes(app, sheets_manager)
    
    # Health check
    @app.route('/api/health', methods=['GET'])
    def health_check():
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
    app = create_app()
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        debug=Config.DEBUG
    )
