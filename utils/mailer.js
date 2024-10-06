const nodeMailer = require("nodemailer");

class Mailer {
    static async sendEmail({ email, subject, message }) {

        const transporter = nodeMailer.createTransport({
            host: "live.smtp.mailtrap.io", // TODO move this to env
            port: 587,
            auth: {
              user: "api",
              pass: 'd4f7cec201095ca646e708b4d6a6ad9d' // TODO move this to env
            
            },
          });

        const sender = {
            address: "ceo@storytime.social", // TODO move this to env
            name: "Storytime",
        };

        const mailOptions = {
            from: sender,
            to: email,
            subject,
            text: message,
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log("Email sent: " + info.response);
        } catch (error) {
            console.log(error);
        }
    }
}

module.exports = Mailer;