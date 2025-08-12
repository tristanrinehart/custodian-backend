const User = require('../../models/user.model.js');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// Sign up
const signUp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  
  try {
    const user = new User(req.body)

    const savedUser = await user.save();

    return res.status(201).json({
      message: "Success",
      user: {
        _id: savedUser._id,
        //username: savedUser.username,
        email: savedUser.email
      }
    });
  } catch (err) {
    console.error("Error saving user:", err.message);
    return res.status(400).json({ error: "Unable to add user" });
  }
};

// Sign in
const signIn = async (req, res) => {
  const { email, password } = req.body;
  
  // Validate input
  try {
    const user = await User.findOne({ email }).select('+encrypted_password +salt'); // important!
    if (!user) {
      return res.status(401).json({ error: "Email not found" });
    }
    // Authenticate user
    const isMatch = user.authenticate(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Email and password do not match" });
    }
    // Generate JWT token
    const accessToken = jwt.sign({ _id: user._id }, process.env.SECRET, { expiresIn: "7d" });
    console.log("Generated token:", accessToken);
    // Set token in cookie
    //res.cookie("accessToken", accessToken, {
    //  httpOnly: true,
    //  secure: process.env.NODE_ENV === "production",
    //  maxAge: 7 * 24 * 60 * 60 * 1000,
    //})
    //res.json({ accessToken });
    //console.log("Token set in cookie");

    // Return user data without password
    // Note: Do not return encrypted_password or salt in the response
    // Use destructuring to avoid sending sensitive data
    const { _id, email: userEmail } = user;
    return res.json({
      accessToken,
      user: { _id, email: userEmail }
    });
    // Note: Do not send the password or salt in the response
  } catch (err) {
    console.error("Signin error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { signUp, signIn };
