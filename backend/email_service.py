import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from datetime import datetime

SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
FROM_EMAIL       = os.getenv('FROM_EMAIL', 'noreply@seismoiq.com')  


def send_earthquake_alert(to_email: str, earthquake: dict, user: dict) -> bool:
    """Send earthquake alert email via SendGrid"""
    try:
        mag        = earthquake.get('mag', 0)
        place      = earthquake.get('place', 'Unknown')
        depth      = earthquake.get('depth', 0)
        distance   = earthquake.get('distance_km', 0)
        dt         = earthquake.get('dt', datetime.now())

        # Pick emoji + color based on magnitude
        if mag >= 6.0:
            emoji = '🔴'
            color = '#ff3d3d'
            level = 'SEVERE'
        elif mag >= 5.0:
            emoji = '🟠'
            color = '#ff8c00'
            level = 'MAJOR'
        else:
            emoji = '🟡'
            color = '#ffd700'
            level = 'MODERATE'

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#0a1628;font-family:Arial,sans-serif;">
          <div style="max-width:560px;margin:40px auto;background:#0d1b2a;border-radius:16px;
                      border:1px solid rgba(0,200,255,0.2);overflow:hidden;">

            <!-- Header -->
            <div style="background:linear-gradient(135deg,#0a1628,#1e2535);
                        padding:28px 32px;border-bottom:1px solid rgba(0,200,255,0.15);
                        text-align:center;">
              <div style="font-size:36px;margin-bottom:6px;">🌋</div>
              <h1 style="color:#00c8ff;margin:0;font-size:22px;letter-spacing:0.05em;">
                SeismoIQ Alert
              </h1>
              <p style="color:#5a7a99;margin:4px 0 0;font-size:13px;">
                Earthquake Detected Near You
              </p>
            </div>

            <!-- Alert badge -->
            <div style="padding:24px 32px 0;">
              <div style="background:rgba({','.join(str(int(color.lstrip('#')[i:i+2], 16)) for i in (0,2,4))},0.12);
                          border:1px solid {color};border-radius:10px;
                          padding:16px 20px;text-align:center;">
                <div style="font-size:32px;">{emoji}</div>
                <div style="color:{color};font-size:28px;font-weight:700;margin:4px 0;">
                  M {mag:.1f}
                </div>
                <div style="color:{color};font-size:12px;font-weight:700;
                            letter-spacing:0.1em;">{level}</div>
              </div>
            </div>

            <!-- Details -->
            <div style="padding:20px 32px;">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);
                              color:#5a7a99;font-size:12px;font-weight:600;
                              letter-spacing:0.08em;width:40%;">LOCATION</td>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);
                              color:#e0e0e0;font-size:14px;">{place}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);
                              color:#5a7a99;font-size:12px;font-weight:600;
                              letter-spacing:0.08em;">MAGNITUDE</td>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);
                              color:#e0e0e0;font-size:14px;">M {mag:.1f}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);
                              color:#5a7a99;font-size:12px;font-weight:600;
                              letter-spacing:0.08em;">DEPTH</td>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);
                              color:#e0e0e0;font-size:14px;">{depth:.1f} km</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);
                              color:#5a7a99;font-size:12px;font-weight:600;
                              letter-spacing:0.08em;">DISTANCE</td>
                  <td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06);
                              color:#e0e0e0;font-size:14px;">{distance:.0f} km from you</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;color:#5a7a99;font-size:12px;
                              font-weight:600;letter-spacing:0.08em;">TIME (UTC)</td>
                  <td style="padding:10px 0;color:#e0e0e0;font-size:14px;">
                    {str(dt)[:19]}
                  </td>
                </tr>
              </table>
            </div>

            <!-- Footer -->
            <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);
                        text-align:center;">
              <p style="color:#5a7a99;font-size:11px;margin:0;">
                You're receiving this because you subscribed to SeismoIQ alerts.<br>
                Visit <a href="http://localhost:5173" style="color:#00c8ff;">SeismoIQ</a>
                to manage your alert settings.
              </p>
            </div>

          </div>
        </body>
        </html>
        """

        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=to_email,
            subject=f'⚠️ SeismoIQ Alert: M{mag:.1f} Earthquake — {place}',
            html_content=html_content
        )

        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)

        print(f"✓ Alert email sent to {to_email} | Status: {response.status_code}")
        return response.status_code in (200, 202)

    except Exception as e:
        print(f"✗ Email error: {e}")
        return False


def send_welcome_email_to_user(to_email: str, display_name: str) -> bool:
    """Send welcome email when user registers"""
    try:
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#0a1628;font-family:Arial,sans-serif;">
          <div style="max-width:560px;margin:40px auto;background:#0d1b2a;border-radius:16px;
                      border:1px solid rgba(0,200,255,0.2);overflow:hidden;">
            <div style="padding:40px 32px;text-align:center;">
              <div style="font-size:48px;margin-bottom:12px;">🌋</div>
              <h1 style="color:#00c8ff;margin:0 0 8px;font-size:26px;">
                Welcome to SeismoIQ!
              </h1>
              <p style="color:#b0c8e0;font-size:15px;margin:0 0 24px;">
                Hi {display_name}, your account is ready.
              </p>
              <p style="color:#5a7a99;font-size:13px;line-height:1.6;margin:0;">
                You can now monitor earthquakes in real-time, run AI predictions,
                and set up alerts for seismic activity near you.
              </p>
            </div>
            <div style="padding:0 32px 32px;text-align:center;">
              <a href="http://localhost:5173"
                 style="display:inline-block;padding:12px 32px;
                        background:linear-gradient(135deg,#00c8ff,#0099cc);
                        color:#0a1628;border-radius:8px;text-decoration:none;
                        font-weight:700;font-size:14px;">
                Open SeismoIQ →
              </a>
            </div>
          </div>
        </body>
        </html>
        """

        message = Mail(
            from_email=FROM_EMAIL,
            to_emails=to_email,
            subject='🌋 Welcome to SeismoIQ — Your Earthquake Intelligence Platform',
            html_content=html_content
        )

        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"✓ Welcome email sent to {to_email} | Status: {response.status_code}")
        return response.status_code in (200, 202)

    except Exception as e:
        print(f"✗ Welcome email error: {e}")
        return False