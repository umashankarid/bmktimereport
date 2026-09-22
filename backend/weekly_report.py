"""Weekly activity report emailer for Assistant Trainers.

Sends each Assistant Trainer a summary of their previous week (Monday-Sunday):
- For each day: hours logged and activities, or "Not logged" if nothing.

Intended to run every Sunday night via a scheduler (cron / APScheduler).
Reuses the SMTP configuration from environment variables. Supports both
SMTP_PASSWORD and SMTP_PASS variable names for compatibility.
"""
import os
import smtplib
import logging
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from database import get_db_manager

logger = logging.getLogger(__name__)


def _get_smtp_config():
    """Read SMTP config from environment (supports multiple var name conventions)."""
    return {
        'host': os.environ.get('SMTP_HOST', ''),
        'port': int(os.environ.get('SMTP_PORT', 587)),
        'user': os.environ.get('SMTP_USER', ''),
        # Support both SMTP_PASSWORD and SMTP_PASS
        'password': os.environ.get('SMTP_PASSWORD') or os.environ.get('SMTP_PASS', ''),
        'from': os.environ.get('SMTP_FROM') or os.environ.get('SMTP_USER', ''),
        # SMTP_SECURE=true forces implicit SSL (used with port 465)
        'secure': str(os.environ.get('SMTP_SECURE', '')).lower() in ('true', '1', 'yes'),
    }


def _calc_hours(start_time, end_time):
    """Calculate hours between two HH:MM times."""
    try:
        sh, sm = map(int, start_time.split(':'))
        eh, em = map(int, end_time.split(':'))
        minutes = (eh * 60 + em) - (sh * 60 + sm)
        return round(minutes / 60, 2) if minutes > 0 else 0
    except Exception:
        return 0


def get_previous_week_range(reference_date=None):
    """Return (monday, sunday) date objects for the previous week.

    If run on Sunday night, 'previous week' is the Mon-Sun that just ended
    (including today, Sunday).
    """
    if reference_date is None:
        reference_date = datetime.now().date()

    # weekday(): Monday=0 ... Sunday=6
    # We want the week containing reference_date (Mon..Sun)
    monday = reference_date - timedelta(days=reference_date.weekday())
    sunday = monday + timedelta(days=6)
    return monday, sunday


def build_trainer_week_summary(db, trainer_name, monday, sunday):
    """Build a per-day summary for a trainer for the given week.

    Returns a list of dicts: [{date, day_name, logged, hours, activities}]
    """
    conn = db._get_connection()
    try:
        cursor = conn.execute(
            "SELECT date, activity, start_time, end_time FROM activities "
            "WHERE TRIM(LOWER(trainer_name)) = TRIM(LOWER(?)) "
            "AND date >= ? AND date <= ? "
            "ORDER BY date, start_time",
            (trainer_name, monday.strftime('%Y-%m-%d'), sunday.strftime('%Y-%m-%d'))
        )
        rows = cursor.fetchall()
    finally:
        conn.close()

    # Group activities by date
    by_date = {}
    for row in rows:
        d = row['date']
        by_date.setdefault(d, []).append({
            'activity': row['activity'],
            'start': row['start_time'],
            'end': row['end_time'],
            'hours': _calc_hours(row['start_time'], row['end_time'])
        })

    # Build day-by-day summary for the full week
    summary = []
    total_hours = 0
    for i in range(7):
        day = monday + timedelta(days=i)
        day_str = day.strftime('%Y-%m-%d')
        day_name = day.strftime('%A')
        acts = by_date.get(day_str, [])
        if acts:
            day_hours = sum(a['hours'] for a in acts)
            total_hours += day_hours
            summary.append({
                'date': day_str,
                'day_name': day_name,
                'logged': True,
                'hours': round(day_hours, 2),
                'activities': acts
            })
        else:
            summary.append({
                'date': day_str,
                'day_name': day_name,
                'logged': False,
                'hours': 0,
                'activities': []
            })

    return summary, round(total_hours, 2)


def _build_trainer_table_html(trainer_name, summary, total_hours):
    """Build just the per-trainer table block (used in both single and consolidated emails)."""
    rows_html = ""
    for day in summary:
        if day['logged']:
            acts = "<br>".join(
                f"{a['activity']} ({a['start']}-{a['end']}, {a['hours']}h)"
                for a in day['activities']
            )
            status_color = "#155724"
            status_bg = "#d4edda"
            hours_display = f"{day['hours']}h"
        else:
            acts = "<em style='color:#999;'>Not logged</em>"
            status_color = "#721c24"
            status_bg = "#f8d7da"
            hours_display = "—"

        rows_html += f"""
        <tr style="background:{status_bg};">
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;white-space:nowrap;">
                {day['day_name']}<br><span style="font-weight:400;color:#888;font-size:12px;">{day['date']}</span>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:{status_color};">{acts}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;white-space:nowrap;">{hours_display}</td>
        </tr>"""

    return f"""
    <div style="margin-bottom:28px;">
        <h3 style="color:#333;border-bottom:2px solid #667eea;padding-bottom:6px;">{trainer_name}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
                <tr style="background:#f5f5f5;">
                    <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #ddd;">Day</th>
                    <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #ddd;">Activities</th>
                    <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #ddd;">Hours</th>
                </tr>
            </thead>
            <tbody>{rows_html}</tbody>
            <tfoot>
                <tr>
                    <td colspan="2" style="padding:12px;text-align:right;font-weight:700;">Total:</td>
                    <td style="padding:12px;text-align:right;font-weight:700;color:#667eea;">{total_hours}h</td>
                </tr>
            </tfoot>
        </table>
    </div>"""


def send_consolidated_report(recipient_email, reference_date=None):
    """Send ONE email to recipient_email containing the weekly reports of
    ALL Assistant Trainers (each trainer as a section).

    Args:
        recipient_email (str): The single email address to receive the report.
        reference_date (date, optional): Any date within the target week.

    Returns:
        dict: {'success': bool, 'message': str, 'trainers': int}
    """
    cfg = _get_smtp_config()
    if not cfg['host'] or not cfg['from']:
        return {'success': False, 'message': 'SMTP host/from not configured'}

    if not recipient_email or not recipient_email.strip():
        return {'success': False, 'message': 'Recipient email is required'}

    recipient_email = recipient_email.strip()
    monday, sunday = get_previous_week_range(reference_date)

    db = get_db_manager()
    trainers_result = db.get_trainers_details()
    if not trainers_result['success']:
        return {'success': False, 'message': 'Could not load trainers'}

    assistant_trainers = sorted(
        [t for t in trainers_result['data'] if t.get('trainer_type') == 'Assistant Trainer'],
        key=lambda t: t['name'].lower()
    )

    if not assistant_trainers:
        return {'success': False, 'message': 'No Assistant Trainers found'}

    # Build a section per trainer
    sections_html = ""
    text_lines = [
        f"Weekly Activity Report - All Assistant Trainers",
        f"Week: {monday.strftime('%d %b')} - {sunday.strftime('%d %b %Y')}",
        ""
    ]
    grand_total = 0
    for trainer in assistant_trainers:
        summary, total_hours = build_trainer_week_summary(db, trainer['name'], monday, sunday)
        grand_total += total_hours
        sections_html += _build_trainer_table_html(trainer['name'], summary, total_hours)

        text_lines.append(f"=== {trainer['name']} (total {total_hours}h) ===")
        for day in summary:
            if day['logged']:
                acts = "; ".join(f"{a['activity']} ({a['start']}-{a['end']}, {a['hours']}h)" for a in day['activities'])
                text_lines.append(f"  {day['day_name']} {day['date']}: {acts}")
            else:
                text_lines.append(f"  {day['day_name']} {day['date']}: Not logged")
        text_lines.append("")

    html = f"""
<html>
<body style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:20px;">
    <div style="background:#667eea;border-radius:8px 8px 0 0;padding:24px;text-align:center;">
        <h2 style="color:white;margin:0;">🏸 BMK Komet Activity Logger</h2>
        <p style="color:#e0e0ff;margin:6px 0 0 0;">Weekly Report — All Assistant Trainers</p>
        <p style="color:#e0e0ff;margin:4px 0 0 0;font-size:13px;">{monday.strftime('%d %b')} – {sunday.strftime('%d %b %Y')}</p>
    </div>
    <div style="border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
        {sections_html}
        <p style="text-align:right;font-weight:700;font-size:15px;">Grand total (all trainers): <span style="color:#667eea;">{round(grand_total, 2)}h</span></p>
    </div>
    <div style="padding:15px;color:#aaa;font-size:12px;text-align:center;">
        <p>BMK Komet Activity Logger · Weekly report</p>
    </div>
</body>
</html>
"""
    text = "\n".join(text_lines)

    # Send the single consolidated email
    try:
        use_ssl = cfg['port'] == 465 or cfg['secure']
        if use_ssl:
            server = smtplib.SMTP_SSL(cfg['host'], cfg['port'], timeout=30)
            server.ehlo()
        else:
            server = smtplib.SMTP(cfg['host'], cfg['port'], timeout=30)
            server.ehlo()
            if server.has_extn('STARTTLS'):
                server.starttls()
                server.ehlo()
        if cfg['user'] and cfg['password'] and server.has_extn('AUTH'):
            server.login(cfg['user'], cfg['password'])

        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"Weekly Report - All Assistant Trainers ({monday.strftime('%d %b')} - {sunday.strftime('%d %b')})"
        msg['From'] = cfg['from']
        msg['To'] = recipient_email
        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        server.send_message(msg)
        server.quit()

        logger.warning(f"✅ Consolidated report sent to {recipient_email} ({len(assistant_trainers)} trainers)")
        return {
            'success': True,
            'message': f'Report for {len(assistant_trainers)} assistant trainer(s) sent to {recipient_email}',
            'trainers': len(assistant_trainers)
        }
    except Exception as e:
        logger.error(f"❌ Failed to send consolidated report: {e}")
        return {'success': False, 'message': f'Failed to send: {str(e)}'}


def build_email_html(trainer_name, monday, sunday, summary, total_hours):
    """Build the HTML email body for a trainer's weekly report."""
    rows_html = ""
    for day in summary:
        if day['logged']:
            acts = "<br>".join(
                f"{a['activity']} ({a['start']}-{a['end']}, {a['hours']}h)"
                for a in day['activities']
            )
            status_color = "#155724"
            status_bg = "#d4edda"
            hours_display = f"{day['hours']}h"
        else:
            acts = "<em style='color:#999;'>Not logged</em>"
            status_color = "#721c24"
            status_bg = "#f8d7da"
            hours_display = "—"

        rows_html += f"""
        <tr style="background:{status_bg};">
            <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;white-space:nowrap;">
                {day['day_name']}<br><span style="font-weight:400;color:#888;font-size:12px;">{day['date']}</span>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:{status_color};">{acts}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;white-space:nowrap;">{hours_display}</td>
        </tr>"""

    return f"""
<html>
<body style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;">
    <div style="background:#667eea;border-radius:8px 8px 0 0;padding:24px;text-align:center;">
        <h2 style="color:white;margin:0;">🏸 BMK Komet Activity Logger</h2>
        <p style="color:#e0e0ff;margin:6px 0 0 0;">Weekly Activity Report</p>
    </div>

    <div style="border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px;padding:24px;">
        <p>Hi <strong>{trainer_name}</strong>,</p>
        <p>Here is your activity summary for the week of
           <strong>{monday.strftime('%d %b')} – {sunday.strftime('%d %b %Y')}</strong>:</p>

        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
            <thead>
                <tr style="background:#f5f5f5;">
                    <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #ddd;">Day</th>
                    <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #ddd;">Activities</th>
                    <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #ddd;">Hours</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="2" style="padding:12px;text-align:right;font-weight:700;">Total this week:</td>
                    <td style="padding:12px;text-align:right;font-weight:700;color:#667eea;">{total_hours}h</td>
                </tr>
            </tfoot>
        </table>

        <p style="color:#888;font-size:13px;">
            Days marked <span style="color:#721c24;">Not logged</span> have no recorded activities.
            If you forgot to log something, please log in and add it.
        </p>
    </div>

    <div style="padding:15px;color:#aaa;font-size:12px;text-align:center;">
        <p>BMK Komet Activity Logger · Automated weekly report</p>
    </div>
</body>
</html>
"""


def build_email_text(trainer_name, monday, sunday, summary, total_hours):
    """Plain text fallback."""
    lines = [
        f"Hi {trainer_name},",
        "",
        f"Weekly activity report for {monday.strftime('%d %b')} - {sunday.strftime('%d %b %Y')}:",
        ""
    ]
    for day in summary:
        if day['logged']:
            acts = "; ".join(f"{a['activity']} ({a['start']}-{a['end']}, {a['hours']}h)" for a in day['activities'])
            lines.append(f"{day['day_name']} {day['date']}: {acts} = {day['hours']}h")
        else:
            lines.append(f"{day['day_name']} {day['date']}: Not logged")
    lines += ["", f"Total this week: {total_hours}h", "", "- BMK Komet"]
    return "\n".join(lines)


def send_weekly_reports(reference_date=None, only_email=None, recipient_emails=None):
    """Generate and send weekly reports to Assistant Trainers.

    Args:
        reference_date (date, optional): Any date within the week to report on.
            Defaults to today (run on Sunday night → reports Mon-Sun of this week).
        only_email (str, optional): If set, only send to this email among the
            Assistant Trainers (for testing a single existing trainer).
        recipient_emails (list, optional): If set, send reports ONLY to these
            specific email addresses. Each email is matched to a trainer by email
            (case-insensitive). Emails not matching any trainer are reported as errors.

    Returns:
        dict: {'success': bool, 'sent': int, 'skipped': int, 'errors': [...]}
    """
    cfg = _get_smtp_config()
    # Only the host is strictly required. User/password are optional because
    # some relays (e.g. relay.hostup.se) use IP-based auth and reject SMTP AUTH.
    if not cfg['host']:
        logger.error("❌ SMTP host not configured for weekly reports")
        return {'success': False, 'message': 'SMTP host not configured', 'sent': 0}
    if not cfg['from']:
        logger.error("❌ SMTP_FROM not configured for weekly reports")
        return {'success': False, 'message': 'SMTP_FROM address not configured', 'sent': 0}

    monday, sunday = get_previous_week_range(reference_date)
    logger.warning(f"📧 Generating weekly reports for {monday} to {sunday}")

    db = get_db_manager()
    trainers_result = db.get_trainers_details()
    if not trainers_result['success']:
        return {'success': False, 'message': 'Could not load trainers', 'sent': 0}

    all_trainers = trainers_result['data']

    # Determine the recipients
    if recipient_emails:
        # Send only to the specified emails, matched to any trainer by email
        wanted = {e.strip().lower() for e in recipient_emails if e and e.strip()}
        assistant_trainers = [
            t for t in all_trainers
            if t.get('email') and t['email'].strip().lower() in wanted
        ]
        # Track emails that didn't match any trainer
        matched_emails = {t['email'].strip().lower() for t in assistant_trainers}
        unmatched = wanted - matched_emails
    else:
        # Default: all Assistant Trainers with an email
        assistant_trainers = [
            t for t in all_trainers
            if t.get('trainer_type') == 'Assistant Trainer' and t.get('email')
        ]
        unmatched = set()

    sent = 0
    skipped = 0
    errors = []

    for u in unmatched:
        errors.append(f"{u}: no trainer found with this email")

    try:
        # Port 465 uses implicit SSL (SMTP_SSL). Port 587 uses STARTTLS.
        # SMTP_SECURE=true also forces SSL. Otherwise decide by port.
        use_ssl = cfg['port'] == 465 or cfg['secure']

        if use_ssl:
            server = smtplib.SMTP_SSL(cfg['host'], cfg['port'], timeout=30)
            server.ehlo()
        else:
            server = smtplib.SMTP(cfg['host'], cfg['port'], timeout=30)
            server.ehlo()
            if server.has_extn('STARTTLS'):
                server.starttls()
                server.ehlo()

        # Only authenticate if credentials are provided AND the server supports AUTH.
        # Relays like relay.hostup.se use IP-based auth and don't support SMTP AUTH.
        if cfg['user'] and cfg['password'] and server.has_extn('AUTH'):
            server.login(cfg['user'], cfg['password'])
    except Exception as e:
        logger.error(f"❌ SMTP connection failed: {e}")
        return {'success': False, 'message': f'SMTP connection failed: {str(e)}', 'sent': 0}

    try:
        for trainer in assistant_trainers:
            email = trainer['email'].strip()
            name = trainer['name']

            if only_email and email.lower() != only_email.lower():
                skipped += 1
                continue

            try:
                summary, total_hours = build_trainer_week_summary(db, name, monday, sunday)
                html = build_email_html(name, monday, sunday, summary, total_hours)
                text = build_email_text(name, monday, sunday, summary, total_hours)

                msg = MIMEMultipart('alternative')
                msg['Subject'] = f"Weekly Activity Report ({monday.strftime('%d %b')} - {sunday.strftime('%d %b')})"
                msg['From'] = cfg['from']
                msg['To'] = email
                msg.attach(MIMEText(text, 'plain'))
                msg.attach(MIMEText(html, 'html'))

                server.send_message(msg)
                sent += 1
                logger.warning(f"✅ Weekly report sent to {name} ({email})")
            except Exception as e:
                errors.append(f"{name}: {str(e)}")
                logger.error(f"❌ Failed to send to {name}: {e}")
    finally:
        try:
            server.quit()
        except Exception:
            pass

    logger.warning(f"📧 Weekly reports done: {sent} sent, {skipped} skipped, {len(errors)} errors")
    return {'success': True, 'sent': sent, 'skipped': skipped, 'errors': errors}


if __name__ == '__main__':
    # Allow running manually: python3 weekly_report.py
    import sys
    test_email = sys.argv[1] if len(sys.argv) > 1 else None
    result = send_weekly_reports(only_email=test_email)
    print(result)
