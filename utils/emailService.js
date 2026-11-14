const nodemailer = require('nodemailer');

const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
const mailConfigured = () => Boolean((process.env.RESEND_API_KEY && process.env.EMAIL_FROM) || (smtpUser && smtpPass));
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    requireTLS: true,
    connectionTimeout: 10000,
    socketTimeout: 15000,
    auth: { user: smtpUser, pass: smtpPass }
});

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

const deliverEmail = async (to, subject, html, attachments = [], idempotencyKey) => {
    if (!mailConfigured()) throw new Error('Email provider is not configured');
    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
                ...(idempotencyKey && { 'Idempotency-Key': idempotencyKey })
            },
            body: JSON.stringify({
                from: process.env.EMAIL_FROM, to: [to], subject, html,
                attachments: attachments.map(({ filename, content }) => ({
                    filename, content: Buffer.isBuffer(content) ? content.toString('base64') : content
                }))
            }),
            signal: AbortSignal.timeout(15000)
        });
        if (!response.ok) throw new Error(`Email provider rejected request (${response.status})`);
        return response.json();
    }
    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || smtpUser,
            to,
            subject,
            html,
            attachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return info;
    } catch (error) {
        console.error('Email error:', error);
        throw error;
    }
};

async function sendEmail(to, subject, html, attachments = [], idempotencyKey) {
    const database = require('../config/database');
    const [rows] = await database.query(`
        INSERT INTO public.email_queue (to_email, subject, body_html, status, created_at, updated_at)
        VALUES ($recipient, $subject, $body, 'processing', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id`
    , { bind: { recipient: to, subject, body: html } });
    const id = rows[0].id;
    let result;
    try {
        result = await deliverEmail(to, subject, html, attachments, idempotencyKey);
    } catch (error) {
        try {
            await database.query(`
                UPDATE public.email_queue SET status = 'failed', error_message = $reason,
                    updated_at = CURRENT_TIMESTAMP WHERE id = $id`,
            { bind: { id, reason: error.code ? 'Provider error: ' + error.code : error.message } });
        } catch (historyError) {
            console.error('Could not record email failure:', historyError.name);
        }
        throw error;
    }
    try {
        await database.query(`
            UPDATE public.email_queue SET status = 'sent', message_id = $messageId,
                sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $id`,
        { bind: { id, messageId: result.messageId || result.id || null } });
    } catch (error) {
        console.error('Email accepted but history update failed:', error.name);
    }
    return result;
}

// Leave Status Email Template
const getLeaveStatusEmailTemplate = (employeeName, leaveDetails, status, comments = '') => {
    const isApproved = status.toLowerCase() === 'approved';
    const statusColor = isApproved ? '#10b981' : '#ef4444';
    const statusEmoji = isApproved ? '✅' : '❌';
    const statusMessage = isApproved ? 'Approved' : 'Rejected';

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Arial', sans-serif; background-color: #f8fafc; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .header { text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; }
                .header h1 { color: #1e1b4b; font-size: 24px; }
                .status-badge { display: inline-block; padding: 8px 24px; border-radius: 50px; color: white; font-weight: bold; background-color: ${statusColor}; }
                .content { padding: 20px 0; }
                .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
                .detail-label { color: #64748b; font-weight: 600; }
                .detail-value { color: #1e1b4b; font-weight: 500; }
                .footer { text-align: center; padding-top: 20px; border-top: 2px solid #e2e8f0; color: #94a3b8; font-size: 14px; }
                .btn { display: inline-block; padding: 10px 20px; background: #4f46e5; color: white; text-decoration: none; border-radius: 8px; margin-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🌐 HR Dashboard</h1>
                    <h2>Leave Request ${statusMessage}</h2>
                    <div class="status-badge">${statusEmoji} ${statusMessage}</div>
                </div>
                <div class="content">
                    <p>Dear <strong>${escapeHtml(employeeName)}</strong>,</p>
                    <p>Your leave request has been <strong>${statusMessage}</strong>.</p>
                    
                    <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin: 16px 0;">
                        <div class="detail-row">
                            <span class="detail-label">📅 Leave Type</span>
                            <span class="detail-value">${escapeHtml(leaveDetails.leave_type)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📆 Duration</span>
                            <span class="detail-value">${escapeHtml(leaveDetails.start_date)} to ${escapeHtml(leaveDetails.end_date)}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📊 Total Days</span>
                            <span class="detail-value"><b>${escapeHtml(leaveDetails.days)}</b> days</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">📝 Reason</span>
                            <span class="detail-value">${leaveDetails.reason || 'N/A'}</span>
                        </div>
                        ${comments ? `
                        <div class="detail-row">
                            <span class="detail-label">💬 Comments</span>
                            <span class="detail-value">${escapeHtml(comments)}</span>
                        </div>
                        ` : ''}
                    </div>

                    ${isApproved ? `
                        <p>🎉 <b>Enjoy your leave!</b> Make sure to plan your work accordingly.</p>
                    ` : `
                        <p>😞 We understand your request. Please contact HR for more details.</p>
                    `}
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <a href="${escapeHtml(process.env.FRONTEND_ORIGINS?.split(',')[0]?.trim() || 'http://localhost:3000')}" class="btn">📊 View Dashboard</a>
                    </div>
                </div>
                <div class="footer">
                    <p>This is an automated message from HR Dashboard.</p>
                    <p>© ${new Date().getFullYear()} HR Dashboard. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;
};

module.exports = {
    verifySmtp: () => transporter.verify(),
    mailConfigured, escapeHtml,
    sendEmail,
    getLeaveStatusEmailTemplate
};
