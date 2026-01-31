"""
Email Service Module for Dental Pricing Calculator
Handles email verification and password reset functionality

Configuration (in .env):
- MAIL_ENABLED: True/False - whether to actually send emails
- MAIL_SERVER: SMTP server (default: smtp.gmail.com)
- MAIL_PORT: SMTP port (default: 587)
- MAIL_USE_TLS: Use TLS (default: True)
- MAIL_USERNAME: SMTP username
- MAIL_PASSWORD: SMTP password
- MAIL_DEFAULT_SENDER: Default sender email
- FRONTEND_URL: URL for email links
"""
import secrets
import hashlib
from datetime import datetime, timedelta
from flask import current_app
from flask_mail import Mail, Message

mail = Mail()


def init_mail(app):
    """Initialize Flask-Mail with the application"""
    mail.init_app(app)


def generate_token():
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)


def hash_token(token):
    """Hash a token for secure storage"""
    return hashlib.sha256(token.encode()).hexdigest()


def _is_mail_enabled():
    """Check if email sending is enabled"""
    return current_app.config.get('MAIL_ENABLED', True)


def _log_email(email_type, recipient, subject, link=None):
    """Log email details to console (used when MAIL_ENABLED=False)"""
    print("\n" + "=" * 60)
    print(f"  EMAIL [{email_type}] - NOT SENT (MAIL_ENABLED=False)")
    print("=" * 60)
    print(f"  To: {recipient}")
    print(f"  Subject: {subject}")
    if link:
        print(f"  Link: {link}")
    print("=" * 60 + "\n")


def _send_email(subject, recipient, html_body, text_body, email_type="EMAIL", link=None):
    """
    Internal helper to send email or log it based on MAIL_ENABLED setting.

    Returns:
        tuple: (success: bool, message: str)
    """
    if not _is_mail_enabled():
        _log_email(email_type, recipient, subject, link)
        return True, f"{email_type} logged to console (email disabled)"

    try:
        msg = Message(
            subject=subject,
            recipients=[recipient],
            html=html_body,
            body=text_body
        )
        mail.send(msg)
        return True, f"{email_type} sent successfully"
    except Exception as e:
        current_app.logger.error(f"Failed to send {email_type}: {str(e)}")
        return False, str(e)


def send_verification_email(user_email, user_name, token):
    """Send email verification link to user"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5002')
    verification_link = f"{frontend_url}/verify-email?token={token}"
    expiry_hours = current_app.config.get('EMAIL_VERIFICATION_EXPIRY_HOURS', 24)

    subject = "Verify Your Email - Dental Pricing Calculator"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Dental Pricing Calculator</h1>
            </div>
            <div class="content">
                <p>Hello {user_name},</p>
                <p>Thank you for registering! Please verify your email address by clicking the button below:</p>
                <p style="text-align: center;">
                    <a href="{verification_link}" class="button">Verify Email Address</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">{verification_link}</p>
                <p>This link will expire in {expiry_hours} hours.</p>
                <p>If you didn't create an account, you can safely ignore this email.</p>
            </div>
            <div class="footer">
                <p>Dental Pricing Calculator</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Welcome to Dental Pricing Calculator!

    Hello {user_name},

    Thank you for registering! Please verify your email address by clicking the link below:

    {verification_link}

    This link will expire in {expiry_hours} hours.

    If you didn't create an account, you can safely ignore this email.

    - Dental Pricing Calculator Team
    """

    return _send_email(
        subject=subject,
        recipient=user_email,
        html_body=html_body,
        text_body=text_body,
        email_type="VERIFICATION",
        link=verification_link
    )


def send_password_reset_email(user_email, user_name, token):
    """Send password reset link to user"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5002')
    reset_link = f"{frontend_url}/reset-password?token={token}"
    expiry_hours = current_app.config.get('PASSWORD_RESET_EXPIRY_HOURS', 1)

    subject = "Reset Your Password - Dental Pricing Calculator"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            .warning {{ background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Reset Request</h1>
            </div>
            <div class="content">
                <p>Hello {user_name},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <p style="text-align: center;">
                    <a href="{reset_link}" class="button">Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">{reset_link}</p>
                <div class="warning">
                    <strong>Important:</strong> This link will expire in {expiry_hours} hour(s) for security reasons.
                </div>
                <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
                <p>Dental Pricing Calculator</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Password Reset Request

    Hello {user_name},

    We received a request to reset your password. Click the link below to create a new password:

    {reset_link}

    Important: This link will expire in {expiry_hours} hour(s) for security reasons.

    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

    - Dental Pricing Calculator Team
    """

    return _send_email(
        subject=subject,
        recipient=user_email,
        html_body=html_body,
        text_body=text_body,
        email_type="PASSWORD_RESET",
        link=reset_link
    )


def send_password_changed_notification(user_email, user_name):
    """Send notification that password was changed"""
    subject = "Password Changed - Dental Pricing Calculator"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            .alert {{ background: #d4edda; border: 1px solid #28a745; padding: 15px; border-radius: 5px; margin: 15px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Password Changed</h1>
            </div>
            <div class="content">
                <p>Hello {user_name},</p>
                <div class="alert">
                    Your password has been successfully changed.
                </div>
                <p>If you made this change, no further action is needed.</p>
                <p>If you did not change your password, please contact us immediately as your account may have been compromised.</p>
            </div>
            <div class="footer">
                <p>Dental Pricing Calculator</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    Password Changed

    Hello {user_name},

    Your password has been successfully changed.

    If you made this change, no further action is needed.

    If you did not change your password, please contact us immediately as your account may have been compromised.

    - Dental Pricing Calculator Team
    """

    return _send_email(
        subject=subject,
        recipient=user_email,
        html_body=html_body,
        text_body=text_body,
        email_type="PASSWORD_CHANGED"
    )
