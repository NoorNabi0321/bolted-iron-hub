import nodemailer from "nodemailer";
import { ENV } from "./env";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize Gmail SMTP transporter
 */
function getTransporter(): nodemailer.Transporter {
  if (transporter) {
    return transporter;
  }

  if (!ENV.gmailEmail || !ENV.gmailAppPassword) {
    throw new Error(
      "Gmail credentials not configured (GMAIL_EMAIL, GMAIL_APP_PASSWORD)"
    );
  }

  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: ENV.gmailEmail,
      pass: ENV.gmailAppPassword.replace(/\s/g, ""), // Remove spaces from app password
    },
  });

  return transporter;
}

/**
 * Send email with optional PDF attachment
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    console.log("[Email] Starting email send...");
    console.log("[Email] From:", ENV.gmailEmail);
    console.log("[Email] To:", options.to);
    console.log("[Email] Subject:", options.subject);
    console.log("[Email] Attachments:", options.attachments?.length || 0);

    const transporter = getTransporter();
    console.log("[Email] Transporter created successfully");

    const mailOptions = {
      from: ENV.gmailEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments || [],
    };

    console.log("[Email] Sending mail...");
    const info = await transporter.sendMail(mailOptions);
    console.log("[Email] Sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("[Email] Failed to send:", error);
    if (error instanceof Error) {
      console.error("[Email] Error message:", error.message);
      console.error("[Email] Error stack:", error.stack);
    }
    return false;
  }
}

/**
 * Send weekly project progress report via email
 */
export async function sendWeeklyReportEmail(
  recipientEmail: string,
  pdfBuffer: Buffer,
  stats: {
    totalProjects: number;
    completedProjects: number;
    totalItems: number;
    completedItems: number;
    overallProgress: number;
  }
): Promise<boolean> {
  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px;">BOLTED IRON HUB</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px;">Weekly Project Progress Report</p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
        <p style="margin: 0 0 15px 0; color: #666;">
          <strong>Report Generated:</strong> ${reportDate}
        </p>
        
        <div style="background-color: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
          <h3 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">Summary</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #666;">Total Projects:</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #333;">${stats.totalProjects}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #666;">Completed Projects:</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #22C55E;">${stats.completedProjects}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #666;">Total Checklist Items:</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #333;">${stats.totalItems}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #666;">Completed Items:</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #22C55E;">${stats.completedItems}</td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #666;">Overall Progress:</td>
              <td style="padding: 8px; font-weight: bold; color: #22C55E; font-size: 18px;">${stats.overallProgress}%</td>
            </tr>
          </table>
        </div>
        
        <p style="margin: 0; color: #666; font-size: 14px;">
          Detailed project-by-project breakdown is attached in the PDF report.
        </p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px;">
        <p style="margin: 0;">This is an automated report from Bolted Iron Hub System</p>
        <p style="margin: 5px 0 0 0;">© 2026 Bolted Iron Hub. All rights reserved.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: recipientEmail,
    subject: `Weekly Project Progress Report - ${reportDate}`,
    html: htmlContent,
    attachments: [
      {
        filename: `Weekly_Report_${new Date().toISOString().split("T")[0]}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
