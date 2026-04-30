const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

const initDatabase = () => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Series & Movies Table
            db.run(`CREATE TABLE IF NOT EXISTS series (
                id TEXT PRIMARY KEY,
                title TEXT,
                year INTEGER,
                poster TEXT,
                backdrop TEXT,
                rating REAL,
                order_num INTEGER,
                promoted INTEGER,
                description TEXT,
                videoUrl TEXT,
                subtitleUrl TEXT,
                tags TEXT,
                genres TEXT,
                countries TEXT,
                actors TEXT,
                actorRoles TEXT,
                isMovie INTEGER,
                duration TEXT,
                director TEXT,
                language TEXT,
                createdAt TEXT,
                updatedAt TEXT,
                views INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                type TEXT,
                ageRating TEXT
            )`);

            // Seasons Table
            db.run(`CREATE TABLE IF NOT EXISTS seasons (
                id TEXT PRIMARY KEY,
                seriesId TEXT,
                seriesTitle TEXT,
                seasonNumber INTEGER,
                title TEXT,
                poster TEXT,
                backdrop TEXT,
                description TEXT,
                year INTEGER,
                episodeCount INTEGER,
                createdAt TEXT,
                updatedAt TEXT
            )`);

            // Episodes Table
            db.run(`CREATE TABLE IF NOT EXISTS episodes (
                id TEXT PRIMARY KEY,
                seriesId TEXT,
                seasonId TEXT,
                episodeNumber INTEGER,
                title TEXT,
                description TEXT,
                videoUrl TEXT,
                duration TEXT,
                poster TEXT,
                thumbnail TEXT,
                isFree INTEGER DEFAULT 1,
                views INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                createdAt TEXT,
                updatedAt TEXT,
                subtitleUrl TEXT
            )`);

            // Actors Table
            db.run(`CREATE TABLE IF NOT EXISTS actors (
                id TEXT PRIMARY KEY,
                name TEXT,
                image TEXT,
                bio TEXT,
                nationality TEXT,
                birthDate TEXT,
                movies TEXT,
                series TEXT,
                createdAt TEXT,
                updatedAt TEXT
            )`);

            // Admins Table
            db.run(`CREATE TABLE IF NOT EXISTS admins (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                name TEXT,
                role TEXT DEFAULT 'admin',
                createdAt TEXT
            )`);

            // Genres Table
            db.run(`CREATE TABLE IF NOT EXISTS genres (
                id TEXT PRIMARY KEY,
                name TEXT,
                color TEXT,
                icon TEXT
            )`);

            // Countries Table
            db.run(`CREATE TABLE IF NOT EXISTS countries (
                id TEXT PRIMARY KEY,
                name TEXT,
                code TEXT,
                flag TEXT,
                continent TEXT
            )`);

            // Tags Table
            db.run(`CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT,
                color TEXT,
                type TEXT,
                count INTEGER DEFAULT 0
            )`);

            // Users Table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                name TEXT,
                role TEXT DEFAULT 'user',
                age INTEGER DEFAULT 0,
                isGuest INTEGER DEFAULT 0,
                avatar TEXT,
                preferences TEXT,
                groupId TEXT,
                custom_restrictions TEXT DEFAULT '{"titles":[],"genres":[]}',
                createdAt TEXT,
                lastActive TEXT
            )`);

            // Profiles Table
            db.run(`CREATE TABLE IF NOT EXISTS profiles (
                id TEXT PRIMARY KEY,
                userId TEXT,
                name TEXT,
                age INTEGER DEFAULT 0,
                avatar TEXT,
                is_child INTEGER DEFAULT 0,
                ageLimit INTEGER DEFAULT 0,
                restrictions TEXT DEFAULT '[]',
                isDefault INTEGER DEFAULT 0,
                group_ids TEXT,
                blocked_genres TEXT,
                blocked_titles TEXT,
                createdAt TEXT,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )`);

            // Age Groups Table
            db.run(`CREATE TABLE IF NOT EXISTS age_groups (
                id TEXT PRIMARY KEY,
                name TEXT,
                min_age INTEGER,
                max_age INTEGER,
                allowed_genres TEXT,
                restricted_tags TEXT,
                blocked_genres TEXT DEFAULT '[]',
                blocked_titles TEXT DEFAULT '[]',
                createdAt TEXT
            )`);

            // Watch History Table
            db.run(`CREATE TABLE IF NOT EXISTS watch_history (
                id TEXT PRIMARY KEY,
                userId TEXT,
                contentId TEXT,
                contentType TEXT,
                watchedAt TEXT,
                progress INTEGER DEFAULT 0,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )`);

            // Watchlist Table
            db.run(`CREATE TABLE IF NOT EXISTS watchlist (
                id TEXT PRIMARY KEY,
                userId TEXT,
                contentId TEXT,
                contentType TEXT,
                addedAt TEXT,
                FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
            )`);

            // Logs Table
            db.run(`CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint TEXT,
                method TEXT,
                ip TEXT,
                timestamp TEXT,
                admin TEXT
            )`);

            // Seed Default Data
            const defaultGenres = [
                { name: 'عالي الدقة', color: '#1bd68e', icon: 'fas fa-hd' },
                { name: 'حركة', color: '#ff4d4d', icon: 'fas fa-fist-raised' },
                { name: 'دراما', color: '#ffcc00', icon: 'fas fa-theater-masks' },
                { name: 'مغامرة', color: '#33ccff', icon: 'fas fa-mountain' },
                { name: 'خيال علمي', color: '#9966ff', icon: 'fas fa-rocket' },
                { name: 'كوميديا', color: '#ff66b2', icon: 'fas fa-laugh-beam' },
                { name: 'خيال علمي وفانتازيا', color: '#cc66ff', icon: 'fas fa-magic' },
                { name: 'غموض', color: '#999999', icon: 'fas fa-user-secret' },
                { name: 'رعب', color: '#000000', icon: 'fas fa-ghost' },
                { name: 'رومانسي', color: '#ff3366', icon: 'fas fa-heart' },
                { name: 'جريمة', color: '#333333', icon: 'fas fa-handcuffs' },
                { name: 'عائلي', color: '#66ff66', icon: 'fas fa-users' },
                { name: 'رسوم متحركة', color: '#ff9933', icon: 'fas fa-palette' },
                { name: 'تاريخ', color: '#8b4513', icon: 'fas fa-landmark' },
                { name: 'حرب', color: '#556b2f', icon: 'fas fa-shield-alt' },
                { name: 'وثائقي', color: '#4682b4', icon: 'fas fa-microphone' },
                { name: 'موسيقى', color: '#da70d6', icon: 'fas fa-music' }
            ];

            defaultGenres.forEach(g => {
                db.get('SELECT id FROM genres WHERE name = ?', [g.name], (err, row) => {
                    if (!err && !row) {
                        db.run('INSERT INTO genres (id, name, color, icon) VALUES (?, ?, ?, ?)',
                            ['genre_' + uuidv4().substring(0, 8), g.name, g.color, g.icon]);
                    }
                });
            });

            // Check if admin exists
            db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
                if (!row) {
                    db.run("INSERT INTO users (id, username, password, role, createdAt) VALUES (?, ?, ?, ?, ?)",
                        [uuidv4(), 'admin', 'admin123', 'admin', new Date().toISOString()]);
                }
            });

            resolve();
        });
    });
};

module.exports = {
    db,
    initDatabase,
    run: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    },
    get: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },
    all: (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
};