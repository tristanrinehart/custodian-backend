// 3100

const usersDB = {
    users: require('../../models/users.json'),
    setUsers: function (data) {this.users = data }
}
const fsPromises = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const handleNewUser = async (req, res) => {
    const { email, pwd } = req.body; //destructure
    if (!email || !pwd) return res.status(400).json({ 'message': 'Email and password are required.' });
    const duplicate = usersDB.users.find(person => person.email === email);
    if (duplicate) return res.sendStatus(409); //Conflict
    try {
        //encrypt password
        const hashedPwd = await bcrypt.hash(pwd, 10);
        //store new user
        const newUser = { "email": email, "password": hashedPwd };
        usersDB.setUsers([...usersDB.users, newUser]);
        await fsPromises.writeFile(
            path.join(__dirname, '..', '..', 'models', 'users.json'),
            JSON.stringify(usersDB.users)
        );
        console.log(usersDB.user);
        res.status(201).json({ 'success': `New user ${email} created!` });
    } catch (err) {
        res.status(500).json({ 'message': err.message });
    }
}

module.exports = { handleNewUser };