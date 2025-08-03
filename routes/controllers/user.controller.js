const User = require('../../models/user.model.js'); // Import the User model
const {validationResult} = require('express-validator')

// User sign-up endpoint
// This endpoint creates a new user in the database
// Re-witten by Chat-GPT
const signUp = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg,
    });
  }

  const { username, email, firstName, lastName, password } = req.body;

  try {
    const user = new User({ username, email, firstName, lastName });
    user.password = password; // triggers virtual setter
    const savedUser = await user.save();

    return res.status(201).json({
      message: "Success",
      user: savedUser,
    });
  } catch (err) {
    console.error("Error saving user:", err.message);
    return res.status(400).json({
      error: "Unable to add user",
    });
  }
};



const signIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+encrypted_password +salt');
    if (!user) {
      return res.status(401).json({ error: "Email not found" });
    }

    const isMatch = user.authenticate(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Email and password do not match" });
    }

    const token = jwt.sign({ _id: user._id }, process.env.SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const { _id, username, email: userEmail } = user;
    return res.json({
      token,
      user: { _id, username, email: userEmail },
    });
  } catch (err) {
    console.error("Signin error:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
    signUp,
    signIn
};