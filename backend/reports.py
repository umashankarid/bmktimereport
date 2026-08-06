"""Reports generation for activity data"""
from datetime import datetime, timedelta
from collections import defaultdict
import csv
from io import StringIO
import json

class ReportsManager:
    """Generate various reports from activity data"""
    
    def __init__(self, sheets_manager):
        self.sheets = sheets_manager
    
    def get_all_activities(self):
        """Get all activities from the sheet"""
        try:
            if self.sheets.demo_mode:
                return self.sheets.demo_data
            
            sheet_id = self.sheets.client.open_by_key(
                __import__('os').getenv('GOOGLE_SHEET_ID')
            )
            sheet = sheet_id.worksheet(self.sheets.SHEET_NAME)
            return sheet.get_all_records()
        except Exception as e:
            print(f"Error getting activities: {e}")
            return []
    
    def activity_summary_by_trainer(self):
        """Generate activity summary grouped by trainer"""
        try:
            activities = self.get_all_activities()
            
            summary = defaultdict(lambda: {
                'total_activities': 0,
                'total_hours': 0,
                'activity_types': defaultdict(int),
                'dates': set()
            })
            
            for activity in activities:
                trainer = activity.get('Trainer Name', 'Unknown')
                activity_type = activity.get('Activity', 'Unknown')
                start_time = activity.get('Start Time', '')
                end_time = activity.get('End Time', '')
                date = activity.get('Date', '')
                
                summary[trainer]['total_activities'] += 1
                summary[trainer]['activity_types'][activity_type] += 1
                summary[trainer]['dates'].add(date)
                
                # Calculate hours
                if start_time and end_time:
                    try:
                        start_h, start_m = map(int, start_time.split(':'))
                        end_h, end_m = map(int, end_time.split(':'))
                        duration_minutes = (end_h - start_h) * 60 + (end_m - start_m)
                        summary[trainer]['total_hours'] += duration_minutes / 60
                    except:
                        pass
            
            # Convert to JSON-serializable format
            result = {}
            for trainer, data in summary.items():
                result[trainer] = {
                    'total_activities': data['total_activities'],
                    'total_hours': round(data['total_hours'], 2),
                    'activity_types': dict(data['activity_types']),
                    'active_days': len(data['dates'])
                }
            
            return {
                'success': True,
                'data': result,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error generating activity summary: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def activity_types_distribution(self):
        """Generate distribution of activity types"""
        try:
            activities = self.get_all_activities()
            
            distribution = defaultdict(lambda: {
                'count': 0,
                'hours': 0,
                'trainers': set()
            })
            
            for activity in activities:
                activity_type = activity.get('Activity', 'Unknown')
                start_time = activity.get('Start Time', '')
                end_time = activity.get('End Time', '')
                trainer = activity.get('Trainer Name', 'Unknown')
                
                distribution[activity_type]['count'] += 1
                distribution[activity_type]['trainers'].add(trainer)
                
                # Calculate hours
                if start_time and end_time:
                    try:
                        start_h, start_m = map(int, start_time.split(':'))
                        end_h, end_m = map(int, end_time.split(':'))
                        duration_minutes = (end_h - start_h) * 60 + (end_m - start_m)
                        distribution[activity_type]['hours'] += duration_minutes / 60
                    except:
                        pass
            
            # Convert to JSON-serializable format and sort by count
            result = []
            for activity_type, data in distribution.items():
                result.append({
                    'activity_type': activity_type,
                    'count': data['count'],
                    'hours': round(data['hours'], 2),
                    'unique_trainers': len(data['trainers']),
                    'percentage': 0  # Will calculate after
                })
            
            # Calculate percentages
            total = sum(r['count'] for r in result)
            for r in result:
                r['percentage'] = round((r['count'] / total * 100) if total > 0 else 0, 1)
            
            # Sort by count descending
            result.sort(key=lambda x: x['count'], reverse=True)
            
            return {
                'success': True,
                'data': result,
                'total_activities': total,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error generating distribution: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def training_hours_report(self):
        """Generate training hours report"""
        try:
            activities = self.get_all_activities()
            
            hours_data = defaultdict(lambda: {
                'total_hours': 0,
                'sessions': 0,
                'avg_session_hours': 0
            })
            
            for activity in activities:
                trainer = activity.get('Trainer Name', 'Unknown')
                start_time = activity.get('Start Time', '')
                end_time = activity.get('End Time', '')
                
                hours_data[trainer]['sessions'] += 1
                
                if start_time and end_time:
                    try:
                        start_h, start_m = map(int, start_time.split(':'))
                        end_h, end_m = map(int, end_time.split(':'))
                        duration_minutes = (end_h - start_h) * 60 + (end_m - start_m)
                        hours = duration_minutes / 60
                        hours_data[trainer]['total_hours'] += hours
                    except:
                        pass
            
            # Calculate averages and convert to JSON-serializable
            result = []
            for trainer, data in hours_data.items():
                avg_hours = data['total_hours'] / data['sessions'] if data['sessions'] > 0 else 0
                result.append({
                    'trainer': trainer,
                    'total_hours': round(data['total_hours'], 2),
                    'total_sessions': data['sessions'],
                    'avg_session_hours': round(avg_hours, 2)
                })
            
            # Sort by total hours descending
            result.sort(key=lambda x: x['total_hours'], reverse=True)
            
            total_hours = sum(r['total_hours'] for r in result)
            total_sessions = sum(r['total_sessions'] for r in result)
            
            return {
                'success': True,
                'data': result,
                'summary': {
                    'total_hours': round(total_hours, 2),
                    'total_sessions': total_sessions,
                    'avg_hours_per_trainer': round(total_hours / len(result) if result else 0, 2)
                },
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error generating training hours report: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def monthly_activity_trends(self):
        """Generate monthly activity trends"""
        try:
            activities = self.get_all_activities()
            
            trends = defaultdict(lambda: defaultdict(lambda: {
                'count': 0,
                'hours': 0
            }))
            
            for activity in activities:
                date_str = activity.get('Date', '')
                if not date_str:
                    continue
                
                try:
                    # Parse date (YYYY-MM-DD format)
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                    month_key = date_obj.strftime('%Y-%m')  # YYYY-MM
                except:
                    continue
                
                activity_type = activity.get('Activity', 'Unknown')
                start_time = activity.get('Start Time', '')
                end_time = activity.get('End Time', '')
                
                trends[month_key][activity_type]['count'] += 1
                
                if start_time and end_time:
                    try:
                        start_h, start_m = map(int, start_time.split(':'))
                        end_h, end_m = map(int, end_time.split(':'))
                        duration_minutes = (end_h - start_h) * 60 + (end_m - start_m)
                        trends[month_key][activity_type]['hours'] += duration_minutes / 60
                    except:
                        pass
            
            # Convert to JSON-serializable format
            result = []
            for month in sorted(trends.keys()):
                month_data = {
                    'month': month,
                    'activities': [],
                    'total_count': 0,
                    'total_hours': 0
                }
                
                for activity_type, data in trends[month].items():
                    month_data['activities'].append({
                        'activity_type': activity_type,
                        'count': data['count'],
                        'hours': round(data['hours'], 2)
                    })
                    month_data['total_count'] += data['count']
                    month_data['total_hours'] += data['hours']
                
                month_data['total_hours'] = round(month_data['total_hours'], 2)
                month_data['activities'].sort(key=lambda x: x['count'], reverse=True)
                result.append(month_data)
            
            return {
                'success': True,
                'data': result,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error generating trends: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def export_to_csv(self, report_type='all'):
        """Export activities to CSV"""
        try:
            activities = self.get_all_activities()
            
            if not activities:
                return {
                    'success': False,
                    'error': 'No activities to export'
                }
            
            output = StringIO()
            writer = csv.DictWriter(output, fieldnames=[
                'Trainer Name', 'Date', 'Activity', 'Start Time', 'End Time', 'Note'
            ])
            
            writer.writeheader()
            for activity in activities:
                writer.writerow({
                    'Trainer Name': activity.get('Trainer Name', ''),
                    'Date': activity.get('Date', ''),
                    'Activity': activity.get('Activity', ''),
                    'Start Time': activity.get('Start Time', ''),
                    'End Time': activity.get('End Time', ''),
                    'Note': activity.get('Note', '')
                })
            
            csv_content = output.getvalue()
            output.close()
            
            return {
                'success': True,
                'data': csv_content,
                'filename': f'activities_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            }
        except Exception as e:
            print(f"Error exporting to CSV: {e}")
            return {
                'success': False,
                'error': str(e)
            }
