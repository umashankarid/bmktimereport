"""Reports generation for activity data"""
from datetime import datetime, timedelta
from collections import defaultdict
import csv
from io import StringIO
import json

class ReportsManager:
    """Generate various reports from activity data"""
    
    MONTHLY_QUOTA = 180  # Hours per month
    
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
    
    def activity_summary_by_trainer(self, trainer_filter=None, date_filter=None, date_from=None, date_to=None):
        """Generate activity summary grouped by trainer with quota tracking
        
        Args:
            trainer_filter: Filter by specific trainer name
            date_filter: Filter by specific date (YYYY-MM-DD)
            date_from: Filter from this date (YYYY-MM-DD)
            date_to: Filter to this date (YYYY-MM-DD)
        """
        try:
            activities = self.get_all_activities()
            
            # Filter by trainer if specified
            if trainer_filter:
                activities = [a for a in activities if a.get('Trainer Name') == trainer_filter]
            
            # Filter by date if specified
            if date_filter:
                activities = [a for a in activities if a.get('Date') == date_filter]
            elif date_from or date_to:
                filtered_activities = []
                for a in activities:
                    activity_date = a.get('Date', '')
                    if not activity_date:
                        continue
                    
                    if date_from and activity_date < date_from:
                        continue
                    if date_to and activity_date > date_to:
                        continue
                    
                    filtered_activities.append(a)
                activities = filtered_activities
            
            summary = defaultdict(lambda: {
                'total_activities': 0,
                'total_hours': 0,
                'activity_types': defaultdict(lambda: {'count': 0, 'hours': 0}),
                'dates': set(),
                'monthly_hours': defaultdict(float)
            })
            
            # Get current month
            current_month = datetime.now().strftime('%Y-%m')
            
            for activity in activities:
                trainer = activity.get('Trainer Name', 'Unknown')
                activity_type = activity.get('Activity', 'Unknown')
                start_time = activity.get('Start Time', '')
                end_time = activity.get('End Time', '')
                date = activity.get('Date', '')
                
                summary[trainer]['total_activities'] += 1
                summary[trainer]['activity_types'][activity_type]['count'] += 1
                summary[trainer]['dates'].add(date)
                
                # Calculate hours
                if start_time and end_time:
                    try:
                        start_h, start_m = map(int, start_time.split(':'))
                        end_h, end_m = map(int, end_time.split(':'))
                        duration_minutes = (end_h - start_h) * 60 + (end_m - start_m)
                        hours = duration_minutes / 60
                        summary[trainer]['total_hours'] += hours
                        summary[trainer]['activity_types'][activity_type]['hours'] += hours
                        
                        # Track monthly hours
                        if date:
                            try:
                                date_obj = datetime.strptime(date, '%Y-%m-%d')
                                month_key = date_obj.strftime('%Y-%m')
                                summary[trainer]['monthly_hours'][month_key] += hours
                            except:
                                pass
                    except:
                        pass
            
            # Convert to JSON-serializable format and calculate current month stats
            result = {}
            for trainer, data in summary.items():
                current_month_hours = data['monthly_hours'].get(current_month, 0)
                overtime = max(0, current_month_hours - self.MONTHLY_QUOTA)
                hours_left = max(0, self.MONTHLY_QUOTA - current_month_hours)
                
                # Convert activity_types to JSON-serializable format
                activity_types_dict = {}
                for activity_type, stats in data['activity_types'].items():
                    activity_types_dict[activity_type] = {
                        'count': stats['count'],
                        'hours': round(stats['hours'], 2)
                    }
                
                result[trainer] = {
                    'total_activities': data['total_activities'],
                    'total_hours': round(data['total_hours'], 2),
                    'activity_types': activity_types_dict,
                    'active_days': len(data['dates']),
                    'current_month_hours': round(current_month_hours, 2),
                    'current_month_quota': self.MONTHLY_QUOTA,
                    'current_month_overtime': round(overtime, 2),
                    'current_month_hours_left': round(hours_left, 2),
                    'current_month_percentage': round((current_month_hours / self.MONTHLY_QUOTA * 100) if current_month_hours > 0 else 0, 1)
                }
            
            return {
                'success': True,
                'data': result,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error generating activity summary: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e)
            }
    
    def activity_types_distribution(self, trainer_filter=None, month_filter=None, date_filter=None, date_from=None, date_to=None):
        """Generate distribution of activity types, optionally filtered by trainer, month, or dates"""
        try:
            activities = self.get_all_activities()
            
            # Filter by trainer if specified
            if trainer_filter:
                activities = [a for a in activities if a.get('Trainer Name') == trainer_filter]
            
            # Filter by specific date if specified
            if date_filter:
                activities = [a for a in activities if a.get('Date') == date_filter]
            # Filter by date range if specified
            elif date_from or date_to:
                filtered_activities = []
                for a in activities:
                    activity_date = a.get('Date', '')
                    if not activity_date:
                        continue
                    
                    if date_from and activity_date < date_from:
                        continue
                    if date_to and activity_date > date_to:
                        continue
                    
                    filtered_activities.append(a)
                activities = filtered_activities
            # Filter by month if specified (only if no date filter)
            elif month_filter:
                filtered_activities = []
                for activity in activities:
                    date_str = activity.get('Date', '')
                    if date_str:
                        try:
                            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                            activity_month = date_obj.strftime('%Y-%m')
                            if activity_month == month_filter:
                                filtered_activities.append(activity)
                        except:
                            pass
                activities = filtered_activities
            
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
    
    def training_hours_report(self, trainer_filter=None, month_filter=None, date_filter=None, date_from=None, date_to=None):
        """Generate training hours report with monthly quota and overtime"""
        try:
            activities = self.get_all_activities()
            
            # Filter by trainer if specified
            if trainer_filter:
                activities = [a for a in activities if a.get('Trainer Name') == trainer_filter]
            
            # Filter by specific date if specified
            if date_filter:
                activities = [a for a in activities if a.get('Date') == date_filter]
            # Filter by date range if specified
            elif date_from or date_to:
                filtered_activities = []
                for a in activities:
                    activity_date = a.get('Date', '')
                    if not activity_date:
                        continue
                    
                    if date_from and activity_date < date_from:
                        continue
                    if date_to and activity_date > date_to:
                        continue
                    
                    filtered_activities.append(a)
                activities = filtered_activities
            # Filter by month if specified (only if no date filter)
            elif month_filter:
                filtered_activities = []
                for activity in activities:
                    date_str = activity.get('Date', '')
                    if date_str:
                        try:
                            date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                            activity_month = date_obj.strftime('%Y-%m')
                            if activity_month == month_filter:
                                filtered_activities.append(activity)
                        except:
                            pass
                activities = filtered_activities
            
            MONTHLY_QUOTA = 180  # Hours per month
            
            # Group by trainer and month
            trainer_monthly_data = defaultdict(lambda: defaultdict(lambda: {
                'total_hours': 0,
                'sessions': 0
            }))
            
            for activity in activities:
                trainer = activity.get('Trainer Name', 'Unknown')
                date_str = activity.get('Date', '')
                start_time = activity.get('Start Time', '')
                end_time = activity.get('End Time', '')
                
                # Get month key (YYYY-MM)
                month_key = 'Unknown'
                if date_str:
                    try:
                        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                        month_key = date_obj.strftime('%Y-%m')
                    except:
                        pass
                
                trainer_monthly_data[trainer][month_key]['sessions'] += 1
                
                if start_time and end_time:
                    try:
                        start_h, start_m = map(int, start_time.split(':'))
                        end_h, end_m = map(int, end_time.split(':'))
                        duration_minutes = (end_h - start_h) * 60 + (end_m - start_m)
                        hours = duration_minutes / 60
                        trainer_monthly_data[trainer][month_key]['total_hours'] += hours
                    except:
                        pass
            
            # Calculate aggregates with quota tracking
            result = []
            overall_totals = {
                'total_hours': 0,
                'total_sessions': 0,
                'total_overtime': 0
            }
            
            for trainer, monthly_data in trainer_monthly_data.items():
                trainer_total_hours = 0
                trainer_total_sessions = 0
                trainer_total_overtime = 0
                monthly_breakdown = []
                
                for month, data in sorted(monthly_data.items(), reverse=True):
                    monthly_hours = data['total_hours']
                    monthly_sessions = data['sessions']
                    
                    # Calculate overtime
                    hours_left = MONTHLY_QUOTA - monthly_hours
                    overtime = max(0, monthly_hours - MONTHLY_QUOTA)
                    
                    trainer_total_hours += monthly_hours
                    trainer_total_sessions += monthly_sessions
                    trainer_total_overtime += overtime
                    
                    monthly_breakdown.append({
                        'month': month,
                        'hours': round(monthly_hours, 2),
                        'sessions': monthly_sessions,
                        'quota': MONTHLY_QUOTA,
                        'hours_left': round(max(0, hours_left), 2),
                        'overtime': round(overtime, 2),
                        'percentage': round((monthly_hours / MONTHLY_QUOTA * 100) if monthly_hours > 0 else 0, 1)
                    })
                
                avg_hours = trainer_total_hours / trainer_total_sessions if trainer_total_sessions > 0 else 0
                
                result.append({
                    'trainer': trainer,
                    'total_hours': round(trainer_total_hours, 2),
                    'total_sessions': trainer_total_sessions,
                    'avg_session_hours': round(avg_hours, 2),
                    'total_overtime': round(trainer_total_overtime, 2),
                    'monthly_breakdown': monthly_breakdown
                })
                
                overall_totals['total_hours'] += trainer_total_hours
                overall_totals['total_sessions'] += trainer_total_sessions
                overall_totals['total_overtime'] += trainer_total_overtime
            
            # Sort by total hours descending
            result.sort(key=lambda x: x['total_hours'], reverse=True)
            
            return {
                'success': True,
                'data': result,
                'summary': {
                    'total_hours': round(overall_totals['total_hours'], 2),
                    'total_sessions': overall_totals['total_sessions'],
                    'total_overtime': round(overall_totals['total_overtime'], 2),
                    'avg_hours_per_trainer': round(overall_totals['total_hours'] / len(result) if result else 0, 2),
                    'monthly_quota': MONTHLY_QUOTA
                },
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error generating training hours report: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e)
            }
    
    def monthly_activity_trends(self, trainer_filter=None, month_filter=None, date_filter=None, date_from=None, date_to=None):
        """Generate monthly activity trends, optionally filtered by trainer and/or month"""
        try:
            activities = self.get_all_activities()
            
            # Filter by trainer if specified
            if trainer_filter:
                activities = [a for a in activities if a.get('Trainer Name') == trainer_filter]
            
            # Filter by specific date if specified
            if date_filter:
                activities = [a for a in activities if a.get('Date') == date_filter]
            # Filter by date range if specified
            elif date_from or date_to:
                filtered_activities = []
                for a in activities:
                    activity_date = a.get('Date', '')
                    if not activity_date:
                        continue
                    
                    if date_from and activity_date < date_from:
                        continue
                    if date_to and activity_date > date_to:
                        continue
                    
                    filtered_activities.append(a)
                activities = filtered_activities
            
            trends = defaultdict(lambda: defaultdict(lambda: {
                'count': 0,
                'hours': 0
            }))
            
            # Track total hours per month per trainer
            monthly_totals = defaultdict(lambda: defaultdict(float))
            
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
                
                # Filter by month if specified
                if month_filter and month_key != month_filter:
                    continue
                
                activity_type = activity.get('Activity', 'Unknown')
                start_time = activity.get('Start Time', '')
                end_time = activity.get('End Time', '')
                trainer_name = activity.get('Trainer Name', 'Unknown')
                
                trends[month_key][activity_type]['count'] += 1
                
                if start_time and end_time:
                    try:
                        start_h, start_m = map(int, start_time.split(':'))
                        end_h, end_m = map(int, end_time.split(':'))
                        duration_minutes = (end_h - start_h) * 60 + (end_m - start_m)
                        hours = duration_minutes / 60
                        trends[month_key][activity_type]['hours'] += hours
                        monthly_totals[month_key][trainer_name] += hours
                    except:
                        pass
            
            # Convert to JSON-serializable format
            result = []
            for month in sorted(trends.keys()):
                month_data = {
                    'month': month,
                    'activities': [],
                    'total_count': 0,
                    'total_hours': 0,
                    'overtime': 0,
                    'undertime': 0,
                    'trainers_data': {}
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
                
                # Calculate overtime/undertime per trainer
                for trainer, total_hours in monthly_totals[month].items():
                    overtime = max(0, total_hours - self.MONTHLY_QUOTA)
                    undertime = max(0, self.MONTHLY_QUOTA - total_hours)
                    
                    month_data['trainers_data'][trainer] = {
                        'hours': round(total_hours, 2),
                        'overtime': round(overtime, 2),
                        'undertime': round(undertime, 2),
                        'status': 'overtime' if overtime > 0 else ('normal' if total_hours >= self.MONTHLY_QUOTA else 'undertime')
                    }
                
                # Calculate overall overtime/undertime for the month
                # Total hours across all trainers
                month_total_hours = sum(monthly_totals[month].values())
                total_overtime = max(0, month_total_hours - self.MONTHLY_QUOTA)
                total_undertime = max(0, self.MONTHLY_QUOTA - month_total_hours)
                
                month_data['overtime'] = round(total_overtime, 2)
                month_data['undertime'] = round(total_undertime, 2)
                month_data['activities'].sort(key=lambda x: x['count'], reverse=True)
                result.append(month_data)
            
            return {
                'success': True,
                'data': result,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            print(f"Error generating trends: {e}")
            import traceback
            traceback.print_exc()
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
