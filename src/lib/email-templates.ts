// Email Templates for TeeReserve Notification System

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface TemplateData {
  [key: string]: any;
}

// Template helper function to replace placeholders
import Mustache from 'mustache';

function replacePlaceholders(template: string, data: TemplateData): string {
  return Mustache.render(template, data);
}

// Welcome Email Template
export function getWelcomeEmailTemplate(data: TemplateData): EmailTemplate {
  const subject = "Welcome to TeeReserve! 🏌️‍♂️";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to TeeReserve</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏌️‍♂️ Welcome to TeeReserve!</h1>
        </div>
        <div class="content">
          <h2>Hello {{displayName}}!</h2>
          <p>Welcome to TeeReserve, your premier golf course booking platform! We're thrilled to have you join our community of golf enthusiasts.</p>
          
          <h3>What you can do with TeeReserve:</h3>
          <ul>
            <li>🏌️ Book tee times at premium golf courses</li>
            <li>📊 Track your scorecards and handicap</li>
            <li>🏆 Earn achievements and XP points</li>
            <li>💳 Manage payment methods securely</li>
            <li>⭐ Leave reviews for courses you've played</li>
          </ul>
          
          <p>Ready to get started? Complete your profile and book your first tee time!</p>
          
          <a href="{{profileUrl}}" class="button">Complete Your Profile</a>
          
          <p>If you have any questions, our support team is here to help. Just reply to this email!</p>
          
          <p>Happy golfing!<br>The TeeReserve Team</p>
        </div>
        <div class="footer">
          <p>© 2024 TeeReserve. All rights reserved.</p>
          <p>You received this email because you created an account with TeeReserve.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Welcome to TeeReserve!
    
    Hello {{displayName}}!
    
    Welcome to TeeReserve, your premier golf course booking platform! We're thrilled to have you join our community of golf enthusiasts.
    
    What you can do with TeeReserve:
    - Book tee times at premium golf courses
    - Track your scorecards and handicap
    - Earn achievements and XP points
    - Manage payment methods securely
    - Leave reviews for courses you've played
    
    Ready to get started? Complete your profile and book your first tee time!
    
    Visit: {{profileUrl}}
    
    If you have any questions, our support team is here to help. Just reply to this email!
    
    Happy golfing!
    The TeeReserve Team
    
    © 2024 TeeReserve. All rights reserved.
    You received this email because you created an account with TeeReserve.
  `;
  
  return {
    subject: replacePlaceholders(subject, data),
    html: replacePlaceholders(html, data),
    text: replacePlaceholders(text, data)
  };
}

// Booking Confirmation Email Template
export function getBookingConfirmationTemplate(data: TemplateData): EmailTemplate {
  const subject = "Booking Confirmed: \{\{courseName\}\} - \{\{date\}\} at \{\{time\}\}";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .booking-details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Booking Confirmed!</h1>
        </div>
        <div class="content">
          <h2>Hello \{\{playerName\}\}!</h2>
          <p>Great news! Your tee time has been confirmed. Here are your booking details:</p>
          
          <div class="booking-details">
            <h3>🏌️ Booking Details</h3>
            <p><strong>Course:</strong> \{\{courseName\}\}</p>
            <p><strong>Date:</strong> \{\{date\}\}</p>
            <p><strong>Time:</strong> \{\{time\}\}</p>
            <p><strong>Players:</strong> \{\{playerCount\}\}</p>
            <p><strong>Booking ID:</strong> \{\{bookingId\}\}</p>
            \{\{#specialRequests\}\}
            <p><strong>Indicaciones Especiales:</strong> \{\{specialRequests\}\}</p>
            \{\{/specialRequests\}\}
            
            \{\{#subtotal\}\}
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
              <h4>💰 Price Breakdown</h4>
              <p><strong>Subtotal:</strong> $\{\{subtotal\}\} USD</p>
              \{\{#discount\}\}<p><strong>Discount \{\{#discountCode\}\}(\{\{discountCode\}\})\{\{/discountCode\}\}:</strong> <span style="color: #059669;">-$\{\{discount\}\} USD</span></p>\{\{/discount\}\}
              \{\{#taxes\}\}<p><strong>Taxes (\{\{taxRate\}\}%):</strong> $\{\{taxes\}\} USD</p>\{\{/taxes\}\}
              <p style="font-size: 18px; font-weight: bold; color: #10b981; margin-top: 10px;"><strong>Total Final: $\{\{totalAmount\}\} USD</strong></p>
            </div>
            \{\{/subtotal\}\}
            \{\{^subtotal\}\}
            \{\{#totalAmount\}\}<p><strong>Total:</strong> $\{\{totalAmount\}\}</p>\{\{/totalAmount\}\}
            \{\{/subtotal\}\}
          </div>
          
          <h3>📋 What to bring:</h3>
          <ul>
            <li>Valid ID</li>
            <li>Golf clubs (or rent at the course)</li>
            <li>Appropriate golf attire</li>
            <li>This confirmation email</li>
          </ul>
          
          <p><strong>Important:</strong> Please arrive 30 minutes before your tee time for check-in.</p>
          
          <a href="\{\{bookingUrl\}\}" class="button">View Booking Details</a>
          
          <p>Need to make changes? Contact the course directly or manage your booking online.</p>
          
          <p>Have a fantastic round!<br>The TeeReserve Team</p>
        </div>
        <div class="footer">
          <p>© 2024 TeeReserve. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Booking Confirmed!
    
    Hello \{\{playerName\}\}!
    
    Great news! Your tee time has been confirmed. Here are your booking details:
    
    Booking Details:
    Course: \{\{courseName\}\}
    Date: \{\{date\}\}
    Time: \{\{time\}\}
    Players: \{\{playerCount\}\}
    Booking ID: \{\{bookingId\}\}
    \{\{#specialRequests\}\}
    Indicaciones Especiales: \{\{specialRequests\}\}
    \{\{/specialRequests\}\}
    
    \{\{#subtotal\}\}
    Price Breakdown:
    Subtotal: $\{\{subtotal\}\} USD
    \{\{#discount\}\}Discount \{\{#discountCode\}\}(\{\{discountCode\}\})\{\{/discountCode\}\}: -$\{\{discount\}\} USD\{\{/discount\}\}
    \{\{#taxes\}\}Taxes (\{\{taxRate\}\}%): $\{\{taxes\}\} USD\{\{/taxes\}\}
    Total Final: $\{\{totalAmount\}\} USD
    \{\{/subtotal\}\}
    \{\{^subtotal\}\}
    \{\{#totalAmount\}\}Total: $\{\{totalAmount\}\}\{\{/totalAmount\}\}
    \{\{/subtotal\}\}
    
    What to bring:
    - Valid ID
    - Golf clubs (or rent at the course)
    - Appropriate golf attire
    - This confirmation email
    
    Important: Please arrive 30 minutes before your tee time for check-in.
    
    View booking details: \{\{bookingUrl\}\}
    
    Need to make changes? Contact the course directly or manage your booking online.
    
    Have a fantastic round!
    The TeeReserve Team
    
    © 2024 TeeReserve. All rights reserved.
  `;
  
  return {
    subject: replacePlaceholders(subject, data),
    html: replacePlaceholders(html, data),
    text: replacePlaceholders(text, data)
  };
}

// Booking Reminder Email Template
export function getBookingReminderTemplate(data: TemplateData): EmailTemplate {
  const subject = "Reminder: Your tee time at {{courseName}} is {{timeUntil}}";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .reminder-box { background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Tee Time Reminder</h1>
        </div>
        <div class="content">
          <h2>Hello \{\{playerName\}\}!</h2>
          
          <div class="reminder-box">
            <h3>🏌️ Your tee time is {{timeUntil}}!</h3>
            <p><strong>{{courseName}}</strong></p>
            <p>{{date}} at {{time}}</p>
          </div>
          
          <h3>📋 Quick Checklist:</h3>
          <ul>
            <li>✅ Check the weather forecast</li>
            <li>✅ Prepare your golf equipment</li>
            <li>✅ Plan your route to the course</li>
            <li>✅ Arrive 30 minutes early for check-in</li>
          </ul>
          
          <p><strong>Course Contact:</strong> {{coursePhone}}</p>
          <p><strong>Address:</strong> {{courseAddress}}</p>
          
          <a href="{{bookingUrl}}" class="button">View Booking Details</a>
          
          <p>Need to cancel or reschedule? Please do so as soon as possible to avoid cancellation fees.</p>
          
          <p>Enjoy your round!<br>The TeeReserve Team</p>
        </div>
        <div class="footer">
          <p>© 2024 TeeReserve. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Tee Time Reminder
    
    Hello {{playerName}}!
    
    Your tee time is {{timeUntil}}!
    
    {{courseName}}
    {{date}} at {{time}}
    
    Quick Checklist:
    - Check the weather forecast
    - Prepare your golf equipment
    - Plan your route to the course
    - Arrive 30 minutes early for check-in
    
    Course Contact: {{coursePhone}}
    Address: {{courseAddress}}
    
    View booking details: {{bookingUrl}}
    
    Need to cancel or reschedule? Please do so as soon as possible to avoid cancellation fees.
    
    Enjoy your round!
    The TeeReserve Team
    
    © 2024 TeeReserve. All rights reserved.
  `;
  
  return {
    subject: replacePlaceholders(subject, data),
    html: replacePlaceholders(html, data),
    text: replacePlaceholders(text, data)
  };
}

// Payment Confirmation Email Template
export function getPaymentConfirmationTemplate(data: TemplateData): EmailTemplate {
  const subject = "Payment Confirmed: \{\{courseName\}\} - $\{\{amount\}\}";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .payment-details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>💳 Payment Confirmed</h1>
        </div>
        <div class="content">
          <h2>Hello {{playerName}}!</h2>
          <p>Your payment has been successfully processed. Here are the details:</p>
          
          <div class="payment-details">
            <h3>💰 Payment Details</h3>
            <p><strong>Amount:</strong> $\{\{amount\}\}</p>
            <p><strong>Course:</strong> \{\{courseName\}\}</p>
            <p><strong>Date:</strong> \{\{date\}\}</p>
            <p><strong>Time:</strong> \{\{time\}\}</p>
            <p><strong>Transaction ID:</strong> \{\{transactionId\}\}</p>
            <p><strong>Payment Method:</strong> \{\{paymentMethod\}\}</p>
          </div>
          
          <p>Your booking is now fully confirmed and paid. You should receive a separate booking confirmation email shortly.</p>
          
          <a href="\{\{receiptUrl\}\}" class="button">Download Receipt</a>
          
          <p>If you have any questions about this payment, please contact our support team.</p>
          
          <p>Thank you for choosing TeeReserve!<br>The TeeReserve Team</p>
        </div>
        <div class="footer">
          <p>© 2024 TeeReserve. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Payment Confirmed
    
    Hello \{\{playerName\}\}!
    
    Your payment has been successfully processed. Here are the details:
    
    Payment Details:
    Amount: $\{\{amount\}\}
    Course: \{\{courseName\}\}
    Date: \{\{date\}\}
    Time: \{\{time\}\}
    Transaction ID: \{\{transactionId\}\}
    Payment Method: \{\{paymentMethod\}\}
    
    Your booking is now fully confirmed and paid. You should receive a separate booking confirmation email shortly.
    
    Download receipt: \{\{receiptUrl\}\}
    
    If you have any questions about this payment, please contact our support team.
    
    Thank you for choosing TeeReserve!
    The TeeReserve Team
    
    © 2024 TeeReserve. All rights reserved.
  `;
  
  return {
    subject: replacePlaceholders(subject, data),
    html: replacePlaceholders(html, data),
    text: replacePlaceholders(text, data)
  };
}

// Review Invitation Email Template
export function getReviewInvitationTemplate(data: TemplateData): EmailTemplate {
  const subject = "How was your round at {{courseName}}? Share your experience!";
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Review Invitation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .course-info { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #8b5cf6; }
        .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .stars { font-size: 24px; color: #fbbf24; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⭐ Share Your Experience</h1>
        </div>
        <div class="content">
          <h2>Hello {{playerName}}!</h2>
          <p>We hope you had a fantastic round of golf! Your experience matters to us and helps other golfers make informed decisions.</p>
          
          <div class="course-info">
            <h3>🏌️ Your Recent Round</h3>
            <p><strong>Course:</strong> {{courseName}}</p>
            <p><strong>Date:</strong> {{date}}</p>
            <p><strong>Time:</strong> {{time}}</p>
          </div>
          
          <p>Would you mind taking a few minutes to share your thoughts about:</p>
          <ul>
            <li>Course conditions and maintenance</li>
            <li>Staff friendliness and service</li>
            <li>Facilities and amenities</li>
            <li>Overall value for money</li>
          </ul>
          
          <div style="text-align: center;">
            <p>Rate your experience:</p>
            <div class="stars">⭐⭐⭐⭐⭐</div>
          </div>
          
          <a href="{{reviewUrl}}" class="button">Write Your Review</a>
          
          <p>Your honest feedback helps us maintain high standards and assists fellow golfers in choosing the perfect course for their next round.</p>
          
          <p>Thank you for being part of the TeeReserve community!<br>The TeeReserve Team</p>
        </div>
        <div class="footer">
          <p>© 2024 TeeReserve. All rights reserved.</p>
          <p>This invitation was sent because you recently played at {{courseName}}.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Share Your Experience
    
    Hello {{playerName}}!
    
    We hope you had a fantastic round of golf! Your experience matters to us and helps other golfers make informed decisions.
    
    Your Recent Round:
    Course: {{courseName}}
    Date: {{date}}
    Time: {{time}}
    
    Would you mind taking a few minutes to share your thoughts about:
    - Course conditions and maintenance
    - Staff friendliness and service
    - Facilities and amenities
    - Overall value for money
    
    Write your review: {{reviewUrl}}
    
    Your honest feedback helps us maintain high standards and assists fellow golfers in choosing the perfect course for their next round.
    
    Thank you for being part of the TeeReserve community!
    The TeeReserve Team
    
    © 2024 TeeReserve. All rights reserved.
    This invitation was sent because you recently played at {{courseName}}.
  `;
  
  return {
    subject: replacePlaceholders(subject, data),
    html: replacePlaceholders(html, data),
    text: replacePlaceholders(text, data)
  };
}

// Export all template functions
export const emailTemplates = {
  welcome: getWelcomeEmailTemplate,
  bookingConfirmation: getBookingConfirmationTemplate,
  bookingReminder: getBookingReminderTemplate,
  paymentConfirmation: getPaymentConfirmationTemplate,
  reviewInvitation: getReviewInvitationTemplate
};