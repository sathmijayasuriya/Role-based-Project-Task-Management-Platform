import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

interface InviteEmailParams {
  to: string;
  name: string;
  inviteLink: string;
  expiresAt: Date;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host) {
      this.logger.warn(
        'SMTP not configured (missing SMTP_HOST). Emails will be logged to console.',
      );
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });

    // Fire-and-forget verification to surface bad creds/config early.
    this.transporter
      .verify()
      .then(() => this.logger.log('SMTP transporter verified.'))
      .catch((err) =>
        this.logger.error(
          `SMTP verification failed: ${err?.message ?? err}. Emails may not send.`,
        ),
      );
  }

  async sendInviteEmail(params: InviteEmailParams) {
    const from =
      process.env.MAIL_FROM ?? process.env.SMTP_USER ?? 'no-reply@example.com';
    const subject = 'Set your password';
    const { html, text } = this.buildInviteEmail(
      params.name,
      params.inviteLink,
      params.expiresAt,
    );

    if (!this.transporter) {
      this.logger.warn(
        `Invite email not sent (SMTP not configured). to=${params.to} link=${params.inviteLink}`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({
        from,
        to: params.to,
        subject,
        html,
        text,
      });
      this.logger.log(`Invite email sent to ${params.to}`);
    } catch (err: any) {
      this.logger.error(
        `Failed to send invite email to ${params.to}: ${err?.message ?? err}`,
      );
      this.logger.warn(`Fallback: invite link ${params.inviteLink}`);
    }
  }

  private buildInviteEmail(name: string, inviteLink: string, expiresAt: Date) {
    const prettyExpiry = expiresAt.toLocaleString();
    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f7f9fc; padding:32px; color:#0f172a;">
        <div style="max-width:520px; margin:0 auto; background:#ffffff; border-radius:12px; box-shadow:0 10px 35px rgba(15,23,42,0.08); overflow:hidden;">
          <div style="padding:28px 32px 12px;">
            <div style="font-size:14px; color:#636a7a; text-transform:uppercase; letter-spacing:0.08em; font-weight:700;">Welcome to the workspace</div>
            <h1 style="margin:8px 0 0; font-size:22px; color:#0f172a;">Hi ${name || 'there'}, set your password</h1>
            <p style="margin:16px 0 0; font-size:15px; color:#334155; line-height:1.6;">
              You’ve been invited to join. Click the button below to choose your password and activate your account.
            </p>
          </div>
          <div style="padding:0 32px 24px;">
            <a href="${inviteLink}" style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; font-weight:600; padding:12px 18px; border-radius:10px; box-shadow:0 10px 25px rgba(37,99,235,0.25);">Set your password</a>
            <p style="margin:18px 0 0; font-size:14px; color:#475569;">
              This link expires in 48 hours (by ${prettyExpiry}). If you didn’t expect this, you can ignore this email.
            </p>
          </div>
          <div style="padding:18px 32px 28px; background:#0f172a; color:#e2e8f0;">
            <p style="margin:0; font-size:14px;">Need help? Reply to this email or contact support.</p>
          </div>
        </div>
      </div>
    `;

    const text = `Hi ${name || 'there'},

You’ve been invited to join. Set your password here: ${inviteLink}
This link expires in 48 hours (by ${prettyExpiry}). If you didn’t expect this, you can ignore this email.

Thanks!`;

    return { html, text };
  }
}
