const nodeMailer = require("nodemailer");

class Mailer {
    static async sendEmail({ email, subject, message }) {
        const transporter = nodeMailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.EMAIL,
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