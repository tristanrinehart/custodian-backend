const User = require('../../models/user.model.js'); // Import the User model
const {validationResult} = require('express-validator')

// User sign-up endpoint
// This endpoint creates a new user in the database
const signUp = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: errors.array()[0].msg,
    });
  }

  try {
    const user = new User(req.body);
    const savedUser = await user.save(); // modern async/await syntax

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

module.exports = {
    signUp
};