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

const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, changes: this.changes });
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

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
                ageRating TEXT,
                titleAr TEXT,
                titleEn TEXT
            )`);

            // Safely alter existing tables to add new columns if they don't exist
            db.run(`ALTER TABLE series ADD COLUMN titleAr TEXT`, (err) => {});
            db.run(`ALTER TABLE series ADD COLUMN titleEn TEXT`, (err) => {});

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
                tmdbId TEXT,
                name TEXT,
                nameAr TEXT,
                nameEn TEXT,
                image TEXT,
                bio TEXT,
                nationality TEXT,
                birthDate TEXT,
                movies TEXT,
                series TEXT,
                createdAt TEXT,
                updatedAt TEXT
            )`);

            // Safely alter existing tables
            db.run(`ALTER TABLE actors ADD COLUMN tmdbId TEXT`, (err) => {});
            db.run(`ALTER TABLE actors ADD COLUMN nameAr TEXT`, (err) => {});
            db.run(`ALTER TABLE actors ADD COLUMN nameEn TEXT`, (err) => {});

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
                tmdbId INTEGER UNIQUE,
                name TEXT,
                color TEXT,
                icon TEXT,
                contentCount INTEGER DEFAULT 0
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

            // Parts Table (Fix missing table)
            db.run(`CREATE TABLE IF NOT EXISTS parts (
                id TEXT PRIMARY KEY,
                parentId TEXT,
                parentTitle TEXT,
                parentType TEXT,
                partNumber INTEGER,
                title TEXT,
                year INTEGER,
                poster TEXT,
                description TEXT,
                duration TEXT,
                videoUrl TEXT,
                views INTEGER DEFAULT 0,
                likes INTEGER DEFAULT 0,
                createdAt TEXT,
                updatedAt TEXT
            )`);

            // Collections Table
            db.run(`CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                name TEXT,
                description TEXT,
                poster TEXT,
                backdrop TEXT,
                type TEXT DEFAULT 'collection',
                order_num INTEGER DEFAULT 0,
                createdAt TEXT,
                updatedAt TEXT
            )`);

            // Collection Items Table
            db.run(`CREATE TABLE IF NOT EXISTS collection_items (
                id TEXT PRIMARY KEY,
                collectionId TEXT,
                mediaId TEXT,
                orderNum INTEGER,
                createdAt TEXT,
                FOREIGN KEY (collectionId) REFERENCES collections(id) ON DELETE CASCADE,
                FOREIGN KEY (mediaId) REFERENCES series(id) ON DELETE CASCADE
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

            // Check if admin exists
            get("SELECT * FROM users WHERE username = 'admin'").then(row => {
                if (!row) {
                    run("INSERT INTO users (id, username, password, role, createdAt) VALUES (?, ?, ?, ?, ?)",
                        [uuidv4(), 'admin', 'admin123', 'admin', new Date().toISOString()]);
                }
            }).catch(err => console.error("Error checking/creating admin:", err));
            
            resolve();
        });
    });
};

module.exports = {
    db,
    initDatabase,
    run,
    get,
    all
};