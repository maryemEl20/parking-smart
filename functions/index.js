const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "YOUR_EMAIL@gmail.com",
    pass: "YOUR_APP_PASSWORD", 
  },
});

exports.sendVerificationEmail = functions.https.onRequest(async (req, res) => {
  const { email, fullName, verificationCode } = req.body;

  const mailOptions = {
    from: "YOUR_EMAIL@gmail.com",
    to: email,
    subject: "Code de vérification SmartParking",
    text: `Bonjour ${fullName}, votre code de vérification est : ${verificationCode}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("Email envoyé");
  } catch (error) {
    console.error(error);
    res.status(500).send("Erreur lors de l'envoi de l'email");
  }
});
