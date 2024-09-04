const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require("bcrypt");
const fs = require('fs');
const app = express();
const PORT = 5001;

app.use(bodyParser.json());
app.use(cors()); 
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.header("Content-Type", "application/json; charset=UTF-8");
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "*");
    next();
});


const readJSONFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) reject(err);
      resolve(JSON.parse(data || '[]'));
    });
  });
};

const writeJSONFile = (filePath, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8', (err) => {
      if (err) reject(err);
      resolve(true);
    });
  });
};

const USERS_FILE = './users.json';

app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const users = await readJSONFile(USERS_FILE);

    const checkUserExists = async (email) => {
        for (let user of users) {
          const emailMatch = await bcrypt.compare(email, user.encodeEmail);
          if (emailMatch) return true; 
        }
        return false; 
      };

    const userExists = await checkUserExists(email);

    
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const encodePassword = await bcrypt.hash(password, 10);
    const encodeEmail = await bcrypt.hash(email, 10);
    users.push({ name, encodeEmail, encodePassword });
    await writeJSONFile(USERS_FILE, users);

    res.status(200).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error saving user data' });
  }
});


app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const users = await readJSONFile(USERS_FILE);

    const user = await findUserWithValidPassword(email, password, users);

    async function findUserWithValidPassword(email, password, users) {
    for (let user of users) {
        const isEmailMatch = await bcrypt.compare(email, user.encodeEmail);
        if (isEmailMatch) {
        const isMatch = await bcrypt.compare(password, user.encodePassword);
        if (isMatch) {
            return user;
        }
        }
    }
    return null; 
    }
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({ message: 'Login successful', user: { name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Error reading user data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
