import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


BASE_DIR = Path(__file__).resolve().parents[2]

TEMPLATE_PATH = BASE_DIR / "email-confirmation-template.html"
LOGIN_ALERT_TEMPLATE_PATH = BASE_DIR / "email-login-alert-template.html"




FALLBACK_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loan Application Received</title>
</head>
<body style="margin:0;padding:20px;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;color:#17212B;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;padding:30px;border-radius:10px;">
    <h1 style="color:#005B3F;margin-top:0;">Application Received!</h1>

    <p>
      Thank you, {{APPLICANT_NAME}}. Your loan application has been received.
    </p>

    <p>
      <strong>Reference:</strong> {{REFERENCE_NUMBER}}
    </p>

    <p>
      <strong>Amount:</strong> R {{LOAN_AMOUNT}}
    </p>

    <p>
      We will review your application within 24 hours and contact you via
      email or SMS.
    </p>

    <p style="color:#666;font-size:12px;margin-top:30px;">
      Mbudzi Tshena Financial Solutions
    </p>
  </div>
</body>
</html>
"""



LOGIN_ALERT_FALLBACK_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Login Detected</title>
</head>

<body style="margin:0;padding:0;background:#F3F6F8;font-family:Arial,Helvetica,sans-serif;color:#17212B;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background:#F3F6F8;padding:35px 15px;">

    <tr>
      <td align="center">

        <table width="100%" cellpadding="0" cellspacing="0" border="0"
               style="max-width:620px;background:#FFFFFF;border-radius:14px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#063D2E;padding:28px 32px;">

              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>

                  <td>
                    <div style="font-size:23px;font-weight:700;color:#FFFFFF;">
                      Mbudzi Tshena
                    </div>

                    <div style="font-size:12px;color:#B9D8CD;margin-top:4px;letter-spacing:.4px;">
                      FINANCIAL SOLUTIONS
                    </div>
                  </td>

                  <td align="right">
                    <div style="width:42px;height:42px;line-height:42px;text-align:center;border-radius:50%;background:#0A624A;color:#FFFFFF;font-size:18px;">
                      SECURITY
                    </div>
                  </td>

                </tr>
              </table>

            </td>
          </tr>


          <!-- Main heading -->
          <tr>
            <td style="padding:35px 32px 10px;">

              <div style="font-size:13px;font-weight:700;color:#C47A00;text-transform:uppercase;letter-spacing:.7px;">
                Security Alert
              </div>

              <h1 style="margin:8px 0 12px;font-size:28px;line-height:1.25;color:#17212B;">
                New login detected
              </h1>

              <p style="margin:0;font-size:15px;line-height:1.7;color:#59656F;">
                Hi {{CUSTOMER_NAME}}, we detected a successful login to your
                Mbudzi Tshena account.
              </p>

              <p style="margin:10px 0 0;font-size:15px;line-height:1.7;color:#59656F;">
                If this was you, no action is required.
              </p>

            </td>
          </tr>


          <!-- Login status -->
          <tr>
            <td style="padding:25px 32px 5px;">

              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#F1F8F5;border:1px solid #D5EAE1;border-radius:10px;">

                <tr>

                  <td style="padding:17px 18px;">
                    <span style="font-size:14px;font-weight:700;color:#087A55;">
                      Login successful
                    </span>
                  </td>

                  <td align="right"
                      style="padding:17px 18px;font-size:13px;color:#68747C;">
                    {{LOGIN_TIME}}
                  </td>

                </tr>

              </table>

            </td>
          </tr>


          <!-- Login details -->
          <tr>
            <td style="padding:25px 32px 10px;">

              <div style="font-size:16px;font-weight:700;color:#17212B;margin-bottom:14px;">
                Login details
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="border:1px solid #E5E9EC;border-radius:10px;overflow:hidden;">

                <tr>
                  <td width="42%"
                      style="padding:14px 16px;border-bottom:1px solid #EAEDEF;font-size:13px;color:#76818A;">
                    Date &amp; time
                  </td>

                  <td style="padding:14px 16px;border-bottom:1px solid #EAEDEF;font-size:13px;font-weight:600;color:#27333C;">
                    {{LOGIN_TIME}}
                  </td>
                </tr>

                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #EAEDEF;font-size:13px;color:#76818A;">
                    IP address
                  </td>

                  <td style="padding:14px 16px;border-bottom:1px solid #EAEDEF;font-size:13px;font-weight:600;color:#27333C;">
                    {{IP_ADDRESS}}
                  </td>
                </tr>

                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #EAEDEF;font-size:13px;color:#76818A;">
                    Location
                  </td>

                  <td style="padding:14px 16px;border-bottom:1px solid #EAEDEF;font-size:13px;font-weight:600;color:#27333C;">
                    {{LOCATION}}
                  </td>
                </tr>

                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #EAEDEF;font-size:13px;color:#76818A;">
                    Device
                  </td>

                  <td style="padding:14px 16px;border-bottom:1px solid #EAEDEF;font-size:13px;font-weight:600;color:#27333C;">
                    {{DEVICE}}
                  </td>
                </tr>

                <tr>
                  <td style="padding:14px 16px;font-size:13px;color:#76818A;">
                    Browser
                  </td>

                  <td style="padding:14px 16px;font-size:13px;font-weight:600;color:#27333C;">
                    {{BROWSER}}
                  </td>
                </tr>

              </table>

            </td>
          </tr>


          <!-- Security warning -->
          <tr>
            <td style="padding:25px 32px 10px;">

              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                     style="background:#FFF7ED;border:1px solid #F6D8A8;border-radius:10px;">

                <tr>
                  <td style="padding:20px;">

                    <div style="font-size:15px;font-weight:700;color:#8A5200;margin-bottom:7px;">
                      Wasn't you?
                    </div>

                    <div style="font-size:13px;line-height:1.6;color:#725C3A;margin-bottom:17px;">
                      If you do not recognize this login, secure your account
                      immediately. We recommend changing your password and
                      reviewing your recent account activity.
                    </div>

                    <a href="{{SECURITY_URL}}"
                       style="display:inline-block;background:#063D2E;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;padding:12px 19px;border-radius:7px;">
                      Secure My Account
                    </a>

                  </td>
                </tr>

              </table>

            </td>
          </tr>


          <!-- Security information -->
          <tr>
            <td style="padding:25px 32px 5px;">

              <div style="font-size:15px;font-weight:700;color:#17212B;margin-bottom:8px;">
                Keep your account secure
              </div>

              <p style="margin:0;font-size:13px;line-height:1.7;color:#68747C;">
                Mbudzi Tshena will never ask you to provide your password,
                PIN, or one-time security code by email.
              </p>

              <p style="margin:10px 0 0;font-size:13px;line-height:1.7;color:#68747C;">
                Always access your account through the official Mbudzi Tshena
                website or application.
              </p>

            </td>
          </tr>


          <!-- Footer -->
          <tr>
            <td style="padding:30px 32px;background:#F8FAFB;margin-top:25px;">

              <div style="font-size:13px;font-weight:700;color:#063D2E;margin-bottom:7px;">
                Mbudzi Tshena Financial Solutions
              </div>

              <div style="font-size:11px;line-height:1.7;color:#87929A;">
                This is an automated security notification.
                Please do not reply directly to this email.

                <br><br>

                If you need assistance, please contact our support team.

                <br><br>

                &copy; {{CURRENT_YEAR}} Mbudzi Tshena Financial Solutions.
                All rights reserved.
              </div>

            </td>
          </tr>

        </table>


        <!-- Bottom notice -->
        <div style="max-width:620px;padding:18px 15px;text-align:center;font-size:10px;line-height:1.6;color:#9AA3A9;">
          You received this email because a login was detected on your account.
        </div>

      </td>
    </tr>

  </table>

</body>
</html>
"""



SEND_RESET_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP</title>
</head>

<body style="margin:0;padding:0;background:#F3F6F8;font-family:Arial,Helvetica,sans-serif;color:#17212B;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F6F8;padding:35px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#FFFFFF;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#063D2E;padding:28px 32px;">
              <div style="font-size:23px;font-weight:700;color:#FFFFFF;">Mbudzi Tshena</div>
              <div style="font-size:12px;color:#B9D8CD;margin-top:4px;letter-spacing:.4px;">FINANCIAL SOLUTIONS</div>
            </td>
          </tr>
          <tr>
            <td style="padding:35px 32px 15px;">
              <div style="font-size:13px;font-weight:700;color:#C47A00;text-transform:uppercase;letter-spacing:.7px;">Account security</div>
              <h1 style="margin:8px 0 12px;font-size:28px;line-height:1.25;color:#17212B;">Reset your password</h1>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#59656F;">Hi {{CUSTOMER_NAME}}, use the one-time password below to reset your Mbudzi Tshena account password.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F8F5;border:1px solid #D5EAE1;border-radius:10px;">
                <tr><td align="center" style="padding:25px 18px;">
                  <div style="font-size:12px;font-weight:700;color:#68747C;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Your verification code</div>
                  <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#063D2E;">{{OTP_CODE}}</div>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 32px 30px;">
              <p style="margin:0;font-size:13px;line-height:1.7;color:#68747C;">This code is valid for a limited time. Do not share it with anyone, including Mbudzi Tshena staff.</p>
              <p style="margin:12px 0 0;font-size:13px;line-height:1.7;color:#68747C;">If you did not request a password reset, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px;background:#F8FAFB;">
              <div style="font-size:13px;font-weight:700;color:#063D2E;margin-bottom:7px;">Mbudzi Tshena Financial Solutions</div>
              <div style="font-size:11px;line-height:1.7;color:#87929A;">This is an automated email. Please do not reply directly.<br><br>&copy; {{CURRENT_YEAR}} Mbudzi Tshena Financial Solutions. All rights reserved.</div>
            </td>
          </tr>
        </table>
        <div style="max-width:620px;padding:18px 15px;text-align:center;font-size:10px;line-height:1.6;color:#9AA3A9;">Keep your verification code private.</div>
      </td>
    </tr>
  </table>
</body>
</html>
"""



SEND_CONFIRM_EMAIL_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Confirmation</title>
</head>

<body style="margin:0;padding:0;background:#F3F6F8;font-family:Arial,Helvetica,sans-serif;color:#17212B;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3F6F8;padding:35px 15px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;background:#FFFFFF;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="background:#063D2E;padding:28px 32px;">
              <div style="font-size:23px;font-weight:700;color:#FFFFFF;">Mbudzi Tshena</div>
              <div style="font-size:12px;color:#B9D8CD;margin-top:4px;letter-spacing:.4px;">FINANCIAL SOLUTIONS</div>
            </td>
          </tr>
          <tr>
            <td style="padding:35px 32px 15px;">
              <div style="font-size:13px;font-weight:700;color:#C47A00;text-transform:uppercase;letter-spacing:.7px;">Account security</div>
              <h1 style="margin:8px 0 12px;font-size:28px;line-height:1.25;color:#17212B;">Confirm your account</h1>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#59656F;">Hi {{CUSTOMER_NAME}}, please confirm your account by entering the Code below.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F1F8F5;border:1px solid #D5EAE1;border-radius:10px;">
                <tr><td align="center" style="padding:25px 18px;">
                  <div style="font-size:12px;font-weight:700;color:#68747C;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Your verification code</div>
                  <div style="font-size:34px;font-weight:700;letter-spacing:8px;color:#063D2E;">{{OTP_CODE}}</div>
                </td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 32px 30px;">
              <p style="margin:0;font-size:13px;line-height:1.7;color:#68747C;">This code is valid for a limited time. Do not share it with anyone, including Mbudzi Tshena staff.</p>
              <p style="margin:12px 0 0;font-size:13px;line-height:1.7;color:#68747C;">If you did not request to confirm your account, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px 32px;background:#F8FAFB;">
              <div style="font-size:13px;font-weight:700;color:#063D2E;margin-bottom:7px;">Mbudzi Tshena Financial Solutions</div>
              <div style="font-size:11px;line-height:1.7;color:#87929A;">This is an automated email. Please do not reply directly.<br><br>&copy; {{CURRENT_YEAR}} Mbudzi Tshena Financial Solutions. All rights reserved.</div>
            </td>
          </tr>
        </table>
        <div style="max-width:620px;padding:18px 15px;text-align:center;font-size:10px;line-height:1.6;color:#9AA3A9;">Keep your verification code private.</div>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _load_template(
    template_path: Path,
    fallback_template: str,
) -> str:
   
    try:
        if template_path.exists():
            return template_path.read_text(encoding="utf-8")
    except Exception as exc:
        logger.warning(
            "Unable to load email template %s: %s",
            template_path,
            exc,
        )

    return fallback_template



def _replace_template_values(
    html: str,
    values: dict,
) -> str:
   
    for key, value in values.items():
        html = html.replace(
            f"{{{{{key}}}}}",
            str(value),
        )

    return html




def render_confirmation_email(
    applicant_name: str,
    reference_number: str,
    loan_amount: float,
) -> str:
 
    html = _load_template(
        TEMPLATE_PATH,
        FALLBACK_TEMPLATE,
    )

    return _replace_template_values(
        html,
        {
            "APPLICANT_NAME": applicant_name,
            "REFERENCE_NUMBER": reference_number,
            "LOAN_AMOUNT": f"{loan_amount:,.0f}",
        },
    )




def render_login_alert_email(
    customer_name: str,
    login_time: str,
    ip_address: str,
    location: str,
    device: str,
    browser: str,
    security_url: str,
    current_year: Optional[int] = None,
) -> str:
    

    html = _load_template(
        LOGIN_ALERT_TEMPLATE_PATH,
        LOGIN_ALERT_FALLBACK_TEMPLATE,
    )

    if current_year is None:
        current_year = datetime.now().year

    return _replace_template_values(
        html,
        {
            "CUSTOMER_NAME": customer_name,
            "LOGIN_TIME": login_time,
            "IP_ADDRESS": ip_address,
            "LOCATION": location,
            "DEVICE": device,
            "BROWSER": browser,
            "SECURITY_URL": security_url,
            "CURRENT_YEAR": current_year,
        },
    )

def render_reset_email(
    customer_name: str,
    otp_code: str,
    current_year: Optional[int] = None,
) -> str:

    if current_year is None:
        current_year = datetime.now().year

    return _replace_template_values(
        SEND_RESET_EMAIL_TEMPLATE,
        {
            "CUSTOMER_NAME": customer_name,
            "OTP_CODE": otp_code,
            "CURRENT_YEAR": current_year,
        },
    )

def render_confirmation_email(
    customer_name: str,
    otp_code: str,
    current_year: Optional[int] = None,
) -> str:

    if current_year is None:
        current_year = datetime.now().year

    return _replace_template_values(
        SEND_CONFIRM_EMAIL_TEMPLATE,
        {
            "CUSTOMER_NAME": customer_name,
            "OTP_CODE": otp_code,
            "CURRENT_YEAR": current_year,
        },
    )


async def send_email(
    to_email: str,
    subject: str,
    html_body: str,
) -> bool:
 

    if not settings.EMAIL_ENABLED or not settings.SMTP_USER:
        logger.info(
            "EMAIL (dev mode) -> To: %s | Subject: %s\n%s",
            to_email,
            subject,
            html_body[:500] + "..." if len(html_body) > 500 else html_body,
        )

        return True

    try:
        import aiosmtplib

        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        message = MIMEMultipart("alternative")

        message["From"] = settings.SMTP_FROM
        message["To"] = to_email
        message["Subject"] = subject

        message.attach(
            MIMEText(
                html_body,
                "html",
                "utf-8",
            )
        )

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )

        logger.info(
            "Email sent successfully to %s",
            to_email,
        )

        return True

    except Exception as exc:
        logger.error(
            "Failed to send email to %s: %s",
            to_email,
            exc,
            exc_info=True,
        )

        return False



async def send_application_confirmation(
    to_email: str,
    applicant_name: str,
    reference_number: str,
    loan_amount: float,
) -> bool:


    subject = (
        f"Loan Application Received – "
        f"{reference_number} | Mbudzi Tshena"
    )

    body = render_confirmation_email(
        applicant_name=applicant_name,
        reference_number=reference_number,
        loan_amount=loan_amount,
    )

    return await send_email(
        to_email=to_email,
        subject=subject,
        html_body=body,
    )




async def send_login_alert(
    to_email: str,
    customer_name: str,
    login_time: str,
    ip_address: str,
    location: str,
    device: str,
    browser: str,
    security_url: str,
) -> bool:


    subject = (
        "New Login Detected | "
        "Mbudzi Tshena Security Alert"
    )

    body = render_login_alert_email(
        customer_name=customer_name,
        login_time=login_time,
        ip_address=ip_address,
        location=location,
        device=device,
        browser=browser,
        security_url=security_url,
    )

    return await send_email(
        to_email=to_email,
        subject=subject,
        html_body=body,
    )

async def send_reset_email(
    to_email: str,
    customer_name: str,
    otp_code: str,
) -> bool:

    subject = (
        "Password Reset Request | "
        "Mbudzi Tshena"
    )

    body = render_reset_email(
        customer_name=customer_name,
        otp_code=otp_code,
    )

    return await send_email(
        to_email=to_email,
        subject=subject,
        html_body=body,
    )


async def send_confirmation_email(
    to_email: str,
    customer_name: str,
    otp_code: str,
) -> bool:

    subject = (
        "Account Confirmation | "
        "Mbudzi Tshena"
    )

    body = render_confirmation_email(
        customer_name=customer_name,
        otp_code=otp_code,
    )

    return await send_email(
        to_email=to_email,
        subject=subject,
        html_body=body,
    )