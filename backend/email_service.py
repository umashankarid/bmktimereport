"""Email utility for sending password reset links and notifications."""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

logger = logging.getLogger(__name__)


def send_reset_email(to_email, trainer_name, reset_token, base_url=None):
    """Send a password reset email.

    Args:
        to_email (str): Recipient email address.
        trainer_name (str): Trainer's name for personalization.
        reset_token (str): The reset token.
        base_url (str): Base URL of the app (e.g., https://activitylogger.bmkkomet.se).

    Returns:
        dict: {'success': bool, 'message': str}
    """
    try:
        smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        smtp_user = os.environ.get('SMTP_USER', '')
        smtp_pass = os.environ.get('SMTP_PASS', '')
        from_email = os.environ.get('SMTP_FROM', smtp_user)

        if not smtp_user or not smtp_pass:
            logger.warning("⚠️  SMTP not configured, logging reset link instead")
            if not base_url:
                base_url = os.environ.get('APP_URL', 'http://localhost:5000')
            reset_link = f"{base_url}/reset-password?token={reset_token}"
            logger.warning(f"🔗 Reset link for {trainer_name} ({to_email}): {reset_link}")
            return {
                'success': True,
                'message': 'Reset link generated (SMTP not configured - check server logs)',
                'reset_link': reset_link
            }

        if not base_url:
            base_url = os.environ.get('APP_URL', 'https://activitylogger.bmkkomet.se')

        reset_link = f"{base_url}/reset-password?token={reset_token}"

        # Build email
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Password Reset - BMK Komet Activity Logger'
        msg['From'] = from_email
        msg['To'] = to_email

        # Plain text version
        text = f"""Hi {trainer_name},

You requested a password reset for your BMK Komet Activity Logger account.

Click the link below to reset your password:
{reset_link}

This link will expire in 1 hour and can only be used once.

If you did not request this, you can safely ignore this email.

- BMK Komet"""

        # HTML version
        html = f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #f8f9fa; border-radius: 8px; padding: 30px; text-align: center;">
        <h2 style="color: #333; margin-bottom: 10px;">🏸 BMK Komet Activity Logger</h2>
        <h3 style="color: #555; margin-top: 0;">Password Reset</h3>
    </div>
    
    <div style="padding: 20px 0;">
        <p>Hi <strong>{trainer_name}</strong>,</p>
        <p>You requested a password reset for your account.</p>
        <p>Click the button below to set a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_link}" 
               style="background: #4a90d9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                Reset Password
            </a>
        </div>
        
        <p style="color: #888; font-size: 13px;">This link will expire in <strong>1 hour</strong> and can only be used once.</p>
        <p style="color: #888; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
    </div>
    
    <div style="border-top: 1px solid #eee; padding-top: 15px; color: #aaa; font-size: 12px; text-align: center;">
        <p>BMK Komet Activity Logger</p>
    </div>
</body>
</html>
"""

        msg.attach(MIMEText(text, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        # Send
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)

        logger.info(f"✅ Reset email sent to {to_email}")
        return {
            'success': True,
            'message': 'Reset link sent to your email'
        }

    except smtplib.SMTPAuthenticationError:
        logger.error("❌ SMTP authentication failed")
        return {'success': False, 'message': 'Email service configuration error'}
    except Exception as e:
        logger.error(f"❌ Error sending email: {e}")
        return {'success': False, 'message': f'Error sending email: {str(e)}'}
