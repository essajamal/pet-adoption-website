// Importing required libraries
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bcrypt = require('bcrypt');

// Initialize Express app
const app = express();

// Middleware to parse JSON data from requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from "public" folder
app.use(express.static('public'));

// Set up session for authentication
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

// SQLite database setup
const db = new sqlite3.Database('./pets.db');

// Create tables if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS pets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT,
    color TEXT,
    age INTEGER,
    location TEXT,
    description TEXT,
    image TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS adoption_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    pet_id INTEGER NOT NULL,
    status TEXT DEFAULT 'Pending',
    request_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (pet_id) REFERENCES pets(id)
  )`);
});

// Home route
app.get('/', (req, res) => {
  res.send('Welcome to the Pet Adoption Website!');
});

// User Registration
app.post('/register', (req, res) => {
  const { email, password } = req.body;

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error hashing password');
    }

    db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error saving user');
      }
      res.redirect('/login.html');
    });
  });
});

// User Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }

    if (!user) {
      return res.status(401).send('Invalid email or password');
    }

    bcrypt.compare(password, user.password, (err, match) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error comparing passwords');
      }

      if (match) {
        req.session.userId = user.id;
        req.session.email = user.email;
        res.redirect('/user.html');
      } else {
        res.status(401).send('Invalid email or password');
      }
    });
  });
});

// User Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error logging out');
    }
    res.send('Logged out successfully!');
  });
});

// Retrieve all pets
app.get('/pets', (req, res) => {
  db.all('SELECT * FROM pets', [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }
    res.json(rows);
  });
});

// Retrieve pet by ID
app.get('/pets/:id', (req, res) => {
  const petId = req.params.id;
  db.get('SELECT * FROM pets WHERE id = ?', [petId], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Database error');
    }
    res.json(row);
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
