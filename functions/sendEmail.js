// functions/sendVerificationEmail.js
const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "melagadir2002@gmail.com",
    pass: "yiws rgzy xpnl yhob", 
  },
});

exports.sendVerificationEmail = functions.https.onRequest(async (req, res) => {
  const { email, fullName, verificationCode } = req.body;

  if (!email || !fullName || !verificationCode) {
    return res.status(400).send("Paramètres manquants");
  }

  const mailOptions = {
    from: "melagadir2002@gmail.com",
    to: email,
    subject: "Code de vérification SmartParking",
    text: `Bonjour ${fullName}, votre code de vérification est : ${verificationCode}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send("Email envoyé !");
  } catch (error) {
    console.error(error);
    res.status(500).send("Erreur lors de l'envoi de l'email");
  }
});
