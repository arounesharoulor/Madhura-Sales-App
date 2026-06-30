const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.MAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Send an email with optional attachments
 * @param {Object} opts - { to, subject, html, attachments }
 */
const sendMail = async (opts) => {
  await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.MAIL_USER,
    ...opts,
  });
};

module.exports = { sendMail };
