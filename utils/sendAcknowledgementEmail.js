const nodemailer = require("nodemailer");

const sendAcknowledgementEmail = async ({ to, crn, submissionDateTime }) => {
  if (!to) return;

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const iauEmail = process.env.IAU_CONTACT_EMAIL || "iau@example.com";
  const iauPhone = process.env.IAU_CONTACT_PHONE || "Not provided";

  const formattedDate = new Date(submissionDateTime).toLocaleString("en-LK", {
    timeZone: "Asia/Colombo",
  });

  await transporter.sendMail({
    from: `"IAU Complaint Portal" <${process.env.MAIL_USER}>`,
    to,
    subject: `Complaint Acknowledgement - ${crn}`,
    html: `
      <h2>Complaint Submission Acknowledgement</h2>

      <p>Dear Reporter,</p>

      <p>Your complaint has been submitted successfully.</p>

      <p><strong>Complaint Reference Number:</strong> ${crn}</p>
      <p><strong>Submission Date/Time:</strong> ${formattedDate}</p>

      <p>Please keep this CRN safely for future follow-up.</p>

      <hr />

      <p><strong>IAU Contact Details</strong></p>
      <p>Email: ${iauEmail}</p>
      <p>Phone: ${iauPhone}</p>

      <p>Thank you.</p>
    `,
  });
};

module.exports = sendAcknowledgementEmail;