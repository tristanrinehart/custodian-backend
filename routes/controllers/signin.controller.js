const usersDB = {
    users: require('../../models/users.json'),
    setUsers: function (data) {this.users = data }
}
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const fsPromises = require('fs').promises;
const path = require('path');

const handleSignIn = async (req, res) => {
    const { email, pwd } = req.body; //destructure
    if (!email || !pwd) return res.status(400).json({ 'message': 'Email and password are required.' });
    const foundUser = usersDB.users.find(user => user.email === email); //look for email match

    if (!foundUser) return res.sendStatus(401); // Unauthorized
    // Evaluate password
    const match = await bcrypt.compare(pwd, foundUser.password); 
    if (match) {
        //Need to create JWTs here
        const accessToken = jwt.sign(
            {"email": foundUser.email},
            process.env.ACCESS_TOKEN_SECRET,
            {expiresIn: '15m'} // Access token expires in 15 minutes,
        )
        const refreshToken = jwt.sign(
            {"email": foundUser.email},
            process.env.REFRESH_TOKEN_SECRET,
            {expiresIn: '1000d'} // Refresh tokoen expires in 1000 days
        )
        //Saving refreshToken with current user via nuke & pave
        const otherUser = usersDB.users.filter(person => person.email !== foundUser.email);
        const currentUser = { ...foundUser, refreshToken };
        usersDB.setUsers([...otherUser, currentUser]); // Update the users.json file
        await fsPromises.writeFile(
            path.join(__dirname, '..', '..', 'models', 'users.json'),
            JSON.stringify(usersDB.users)
        );
        res.cookie('jwt', refreshToken, {
            httpOnly: true, // Accessible only by web server
            //sameSite: 'None', // Cross-site cookie
            maxAge: 24 * 60 * 60 * 1000 * 1000// 1000 days
        });
        res.json({accessToken})
    } else {
        res.sendStatus(401); // Unauthorized
    }

}

module.exports = { handleSignIn };