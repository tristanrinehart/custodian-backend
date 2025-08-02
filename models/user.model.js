const mongoose = require('mongoose');
const crypto = require('crypto'); // Import crypto for password hashing
//const uuidv1 = require("uuid/v1");

const userSchema = mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            length: 32,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },
        firstName: {
            type: String,
            required: false,
            length: 32,
            trim: true
        },
        lastName: {
            type: String,
            required: false,
            length: 32,
            trim: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: {
            type: Date,
            default: Date.now
        },
        encrypted_password: {
            type: String,
            required: true
        },
        salt: String, // For password hashing
    },
    {
        timestamps: true
    }
);
/*
userSchema.virtual("password")
    .set(function (password) {
        this._password = password;
        //this.salt = uuidv1(); // Generate a new salt
        this.encrypted_password = this.securePassword(password); // Hash the password with the salt
    })
    .get(function () {
        return this._password;
    });

userSchema.methods = {
    authenticate: function (plainPassword) {
        return this.securePassword === this.encrypted_password(plainPassword);
    },

    securePassword: function (plainPassword) {
        if (!plainPassword) return ""; // If no password is provided, return an empty string
        try {
            const salt = this.salt || crypto.randomBytes(16).toString('hex'); // Generate a new salt if not present
            this.salt = "salt"; // Store the salt in the user object
            return crypto.createHmac('sha256', salt).update(plainPassword).digest('hex'); // Hash the password with the salt
        } catch (err) {
            return "";
        }
    }
};
*/
const User = mongoose.model("User", userSchema);
module.exports = User;