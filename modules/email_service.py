"""
Email Service Module for Dental Pricing Calculator
Handles email verification and password reset functionality
"""
import secrets
import hashlib
from datetime import datetime, timedelta
from flask import current_app, url_for
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


def send_verification_email(user_email, user_name, token):
    """Send email verification link to user"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5002')
    verification_link = f"{frontend_url}/verify-email?token={token}"

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
                <p>This link will expire in 24 hours.</p>
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

    This link will expire in 24 hours.

    If you didn't create an account, you can safely ignore this email.

    - Dental Pricing Calculator Team
    """

    try:
        msg = Message(
            subject=subject,
            recipients=[user_email],
            html=html_body,
            body=text_body
        )
        mail.send(msg)
        return True, "Verification email sent successfully"
    except Exception as e:
        current_app.logger.error(f"Failed to send verification email: {str(e)}")
        return False, str(e)


def send_password_reset_email(user_email, user_name, token):
    """Send password reset link to user"""
    frontend_url = current_app.config.get('FRONTEND_URL', 'http://localhost:5002')
    reset_link = f"{frontend_url}/reset-password?token={token}"

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
                    <strong>Important:</strong> This link will expire in 1 hour for security reasons.
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

    Important: This link will expire in 1 hour for security reasons.

    If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

    - Dental Pricing Calculator Team
    """

    try:
        msg = Message(
            subject=subject,
            recipients=[user_email],
            html=html_body,
            body=text_body
        )
        mail.send(msg)
        return True, "Password reset email sent successfully"
    except Exception as e:
        current_app.logger.error(f"Failed to send password reset email: {str(e)}")
        return False, str(e)


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

    try:
        msg = Message(
            subject=subject,
            recipients=[user_email],
            html=html_body,
            body=text_body
        )
        mail.send(msg)
        return True, "Password change notification sent"
    except Exception as e:
        current_app.logger.error(f"Failed to send password change notification: {str(e)}")
        return False, str(e)
