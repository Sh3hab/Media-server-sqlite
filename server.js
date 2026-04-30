require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./database');
const { v4: uuidv4 } = require('uuid');

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const TMDB_API_KEY = process.env.TMDB_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname));

const folders = [
    'data',
    'uploads/posters',
    'uploads/posters/backdrops',
    'uploads/actors',
    'uploads/episodes',
    'uploads/movies',
    'uploads/flags',
    'uploads/others'
];

folders.forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

db.initDatabase().then(() => console.log('Database initialized')).catch(err => console.error('Database init error:', err));
const authenticateAdmin = (req, res, next) => {
    const token = req.headers['x-admin-token'];
    if (token === ADMIN_TOKEN) {
        next();
    } else {
        res.status(401).json({ error: 'الوصول مرفوض. يلزم تسجيل الدخول.' });
    }
};
// Helper to format duration from minutes to 00:00:00
function formatDuration(minutes) {
    if (!minutes) return "00:00:00";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const secs = 0;
    return [hrs, mins, secs].map(v => v < 10 ? "0" + v : v).join(":");
}
// Helper to download image from URL to local storage
async function downloadImage(url, folder) {
    if (!url || !url.startsWith('http')) return url;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        // Ensure folder exists
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        const extension = path.extname(url.split('?')[0]) || '.jpg';
        const filename = `${uuidv4()}${extension}`;
        const filePath = path.join(folder, filename);
        fs.writeFileSync(filePath, buffer);
        // Return relative URL for frontend
        const relativePath = folder.replace(/\\/g, '/');
        return `/${relativePath}/${filename}`;
    } catch (error) {
        console.error('Error downloading image:', error);
        return url; // Fallback to original URL if download fails
    }
}
app.post('/api/tmdb/import', authenticateAdmin, async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'الرابط مطلوب' });
    try {
        // Extract type and id from URL
        const movieMatch = url.match(/movie\/(\d+)/);
        const tvMatch = url.match(/tv\/(\d+)/);
        const type = movieMatch ? 'movie' : (tvMatch ? 'tv' : null);
        const id = movieMatch ? movieMatch[1] : (tvMatch ? tvMatch[1] : null);
        if (!type || !id) {
            return res.status(400).json({ error: 'رابط TMDB غير صالح' });
        }
        // Fetch main data
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_API_KEY}&language=ar&append_to_response=credits,content_ratings,release_dates,keywords`);
        const data = await tmdbRes.json();
        if (data.status_code === 34) {
            return res.status(404).json({ error: 'المحتوى غير موجود في TMDB' });
        }
        // Return full data for preview
        const responseData = {
            id: data.id,
            title: data.title || data.name,
            year: (data.release_date || data.first_air_date || '').split('-')[0],
            poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
            backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : '',
            rating: data.vote_average,
            description: data.overview,
            genres: (data.genres || []).map(g => g.name),
            countries: (data.production_countries || []).map(c => c.name),
            isMovie: type === 'movie',
            duration: data.runtime ? `${data.runtime} دقيقة` : (data.episode_run_time ? `${data.episode_run_time[0]} دقيقة` : ''),
            language: data.original_language,
            director: (data.credits?.crew || []).find(c => c.job === 'Director')?.name || '',
            actorRoles: (data.credits?.cast || []).slice(0, 15).map(member => ({
                actorId: member.id,
                actorName: member.name,
                roleName: member.character,
                image: member.profile_path ? `https://image.tmdb.org/t/p/w500${member.profile_path}` : ''
            }))
        };
        if (type === 'tv') {
            const seasons = [];
            for (const s of (data.seasons || [])) {
                if (s.season_number === 0) continue; 
                
                const seasonRes = await fetch(`https://api.themoviedb.org/3/tv/${id}/season/${s.season_number}?api_key=${TMDB_API_KEY}&language=ar`);
                const sData = await seasonRes.json();
                
                seasons.push({
                    seasonNumber: s.season_number,
                    title: s.name,
                    description: s.overview,
                    poster: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : responseData.poster,
                    backdrop: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : '',
                    year: (s.air_date || '').split('-')[0] || responseData.year,
                    episodes: (sData.episodes || []).map(e => ({
                        episodeNumber: e.episode_number,
                        title: e.name,
                        description: e.overview,
                        image: e.still_path ? `https://image.tmdb.org/t/p/w500${e.still_path}` : '',
                        duration: responseData.duration
                    }))
                });
            }
            responseData.seasons = seasons;
        }
        res.json(responseData);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في جلب بيانات TMDB: ' + error.message });
    }
});

// --- API: Users ---
app.get('/api/admin/users', authenticateAdmin, (req, res) => {
    db.all("SELECT id, username, role, createdAt FROM users", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});
app.get('/api/tmdb/search', authenticateAdmin, async (req, res) => {
    const { query, type } = req.query;
    if (!query) return res.status(400).json({ error: 'البحث مطلوب' });
    try {
        const searchType = type === 'series' ? 'tv' : 'movie';
        const response = await fetch(`https://api.themoviedb.org/3/search/${searchType}?api_key=${TMDB_API_KEY}&language=ar&query=${encodeURIComponent(query)}`);
        const data = await response.json();
        const results = (data.results || []).map(item => ({
            id: item.id,
            title: item.title || item.name,
            year: (item.release_date || item.first_air_date || '').split('-')[0],
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '/uploads/posters/default.png',
            backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : '',
            type: searchType,
            url: `https://www.themoviedb.org/${searchType}/${item.id}`
        }));
        res.json({ results });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في بحث TMDB: ' + error.message });
    }
});
app.post('/api/admin/users', authenticateAdmin, (req, res) => {
    const { username, password, role } = req.body;
    db.run("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", [username, password, role || 'user'], function(err) {
        if (err) return res.status(400).json({ error: 'Username already exists' });
        res.json({ success: true, id: this.lastID });
    });
});
const logRequest = (req, res, next) => {
    const logData = [
        req.originalUrl,
        req.method,
        req.ip,
        new Date().toISOString(),
        req.headers['x-admin-user'] || 'unknown'
    ];
    db.run(`INSERT INTO logs (endpoint, method, ip, timestamp, admin) VALUES (?, ?, ?, ?, ?)`, logData)
        .catch(err => console.error("Error writing logs:", err));
    next();
};
app.use(logRequest);
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.query.type || req.body.type || 'other';
        let folder = 'uploads/';
        switch (type) {
            case 'poster': folder += 'posters/'; break;
            case 'backdrop': folder += 'posters/backdrops/'; break;
            case 'actor': folder += 'actors/'; break;
            case 'episode': folder += 'episodes/'; break;
            case 'movie': folder += 'movies/'; break;
            case 'flag': folder += 'flags/'; break;
            default: folder += 'others/';
        }
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        cb(null, folder);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 3.5 * 1024 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        cb(null, true);
    }
});

app.get('/api/genres', (req, res) => {
    const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Animation', 'Documentary'];
    res.json(genres);
});

app.get('/api/admin/content-titles', authenticateAdmin, (req, res) => {
    // جلب العناوين من قاعدة البيانات (أو إرجاع قائمة افتراضية حالياً)
    res.json([
        { id: '1', title: 'Avatar' },
        { id: '2', title: 'Inception' },
        { id: '3', title: 'The Dark Knight' }
    ]);
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/srt', (req, res) => {
    res.sendFile(path.join(__dirname, 'conv.html'));
});
app.get('/404', (req, res) => {
    res.sendFile(path.join(__dirname, '404.html'));
});
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await db.get('SELECT * FROM admins WHERE username = ? AND password = ?', [username, password]);
        if (admin) {
            res.json({
                success: true,
                token: ADMIN_TOKEN,
                admin: {
                    id: admin.id,
                    username: admin.username,
                    name: admin.name,
                    role: admin.role
                }
            });
        } else {
            res.status(401).json({ success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/upload', authenticateAdmin, upload.single('file'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });
        const type = req.query.type || req.body.type || 'other';
        let folderName = 'others';
        if (type === 'poster') folderName = 'posters';
        else if (type === 'backdrop') folderName = 'posters/backdrops';
        else if (['actor', 'episode', 'movie', 'flag'].includes(type)) folderName = type + 's';
        
        const fileUrl = `/uploads/${folderName}/${req.file.filename}`;
        res.json({
            success: true,
            filename: req.file.filename,
            originalname: req.file.originalname,
            url: fileUrl,
            size: req.file.size,
            mimetype: req.file.mimetype,
            type: type
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- API: Stats ---
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const userRow = await db.get("SELECT COUNT(*) as count FROM users");
        const movieRow = await db.get("SELECT COUNT(*) as count FROM series WHERE isMovie = 1");
        const seriesRow = await db.get("SELECT COUNT(*) as count FROM series WHERE isMovie = 0");
        
        res.json({
            success: true,
            users: userRow ? userRow.count : 0,
            movies: movieRow ? movieRow.count : 0,
            series: seriesRow ? seriesRow.count : 0,
            views: '0'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/series', async (req, res) => {
    try {
        const series = await db.all('SELECT * FROM series');
        const seasons = await db.all('SELECT * FROM seasons');
        const episodes = await db.all('SELECT * FROM episodes');
        const enhancedSeries = series.map(s => ({
            ...s,
            tags: JSON.parse(s.tags || '[]'),
            genres: JSON.parse(s.genres || '[]'),
            countries: JSON.parse(s.countries || '[]'),
            actors: JSON.parse(s.actors || '[]'),
            actorRoles: JSON.parse(s.actorRoles || '[]'),
            promoted: !!s.promoted,
            isMovie: !!s.isMovie,
            seasons: seasons.filter(season => season.seriesId === s.id),
            totalEpisodes: episodes.filter(ep => ep.seriesId === s.id).length
        }));
        enhancedSeries.sort((a, b) => a.order_num - b.order_num);
        const finalSeries = await filterContentForUser(enhancedSeries, req.query.userId);
        res.json(finalSeries);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في قراءة البيانات' });
    }
});
app.get('/api/movies', async (req, res) => {
    try {
        const movies = await db.all('SELECT * FROM series WHERE isMovie = 1');
        const enhancedMovies = movies.map(s => ({
            ...s,
            tags: JSON.parse(s.tags || '[]'),
            genres: JSON.parse(s.genres || '[]'),
            countries: JSON.parse(s.countries || '[]'),
            actors: JSON.parse(s.actors || '[]'),
            actorRoles: JSON.parse(s.actorRoles || '[]'),
            promoted: !!s.promoted,
            isMovie: true
        }));
        enhancedMovies.sort((a, b) => a.order_num - b.order_num);
        const finalMovies = await filterContentForUser(enhancedMovies, req.query.userId);
        res.json(finalMovies);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في قراءة الأفلام' });
    }
});
app.post('/api/movies', async (req, res) => {
    try {
        const newMovie = {
            id: Date.now().toString(),
            title: req.body.title,
            videoUrl: req.body.videoUrl || '',
            subtitleUrl: req.body.subtitleUrl || '',
            isMovie: 1,
            type: 'movie',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await db.run(
            `INSERT INTO series (id, title, videoUrl, subtitleUrl, isMovie, type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [newMovie.id, newMovie.title, newMovie.videoUrl, newMovie.subtitleUrl, 1, 'movie', newMovie.createdAt, newMovie.updatedAt]
        );
        res.json(newMovie);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/series/:id', async (req, res) => {
    try {
        const series = await db.get('SELECT * FROM series WHERE id = ?', [req.params.id]);
        if (!series) return res.status(404).json({ error: 'المحتوى غير موجود' });
        const seasons = await db.all('SELECT * FROM seasons WHERE seriesId = ?', [series.id]);
        const episodes = await db.all('SELECT * FROM episodes WHERE seriesId = ?', [series.id]);
        const actorIds = JSON.parse(series.actors || '[]');
        const actors = await db.all(`SELECT * FROM actors WHERE id IN (${actorIds.map(() => '?').join(',') || 'NULL'})`, actorIds);
        const actorRoles = JSON.parse(series.actorRoles || '[]');
        res.json({
            ...series,
            tags: JSON.parse(series.tags || '[]'),
            genres: JSON.parse(series.genres || '[]'),
            countries: JSON.parse(series.countries || '[]'),
            actors: actors.map(a => ({
                ...a,
                movies: JSON.parse(a.movies || '[]'),
                series: JSON.parse(a.series || '[]')
            })),
            actorRoles,
            promoted: !!series.promoted,
            isMovie: !!series.isMovie,
            seasons,
            episodes: episodes.map(ep => ({ ...ep, isFree: !!ep.isFree })),
            totalEpisodes: episodes.length,
            totalSeasons: seasons.length
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في قراءة البيانات: ' + error.message });
    }
});
app.post('/api/series', authenticateAdmin, async (req, res) => {
    try {
        const {
            title, year, poster, backdrop, rating, order, promoted, description,
            tags, genres, countries, actors, actorRoles, isMovie, duration, director, language,
            videoUrl, subtitleUrl, ageRating
        } = req.body;
        const id = 'series_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newSeries = {
            id: id,
            title: title.trim(),
            year: parseInt(year) || new Date().getFullYear(),
            poster: await downloadImage(poster, 'uploads/posters'),
            backdrop: await downloadImage(backdrop, 'uploads/posters/backdrops'),
            rating: parseFloat(rating) || 0.0,
            order_num: parseInt(order) || 0,
            promoted: (promoted === true || promoted === 'true') ? 1 : 0,
            description: description || '',
            videoUrl: videoUrl || '',
            subtitleUrl: subtitleUrl || '',
            tags: JSON.stringify(Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : [])),
            genres: JSON.stringify(Array.isArray(genres) ? genres : (genres ? genres.split(',').map(g => g.trim()) : [])),
            countries: JSON.stringify(Array.isArray(countries) ? countries : (countries ? countries.split(',').map(c => c.trim()) : [])),
            actors: JSON.stringify(Array.isArray(actors) ? actors : (actors ? actors.split(',').map(a => a.trim()) : [])),
            actorRoles: JSON.stringify(Array.isArray(actorRoles) ? actorRoles : []),
            isMovie: (isMovie === true || isMovie === 'true') ? 1 : 0,
            duration: duration || '',
            director: director || '',
            language: language || 'ar',
            ageRating: ageRating || 'G',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            views: 0,
            likes: 0,
            type: (isMovie === true || isMovie === 'true') ? 'movie' : 'series'
        };
        const keys = Object.keys(newSeries);
        const values = Object.values(newSeries);
        const sql = `INSERT INTO series (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`;
        await db.run(sql, values);
        res.json({ success: true, message: 'تم الإضافة بنجاح', series: newSeries });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في الحفظ: ' + error.message });
    }
});
app.put('/api/series/:id', authenticateAdmin, async (req, res) => {
    try {
        const series = await db.get('SELECT * FROM series WHERE id = ?', [req.params.id]);
        if (!series) return res.status(404).json({ error: 'غير موجود' });
        const updates = { ...req.body, updatedAt: new Date().toISOString() };
        // Map order to order_num if present
        if (updates.order !== undefined) {
            updates.order_num = parseInt(updates.order);
            delete updates.order;
        }
        // Handle array fields
        ['tags', 'genres', 'countries', 'actors', 'actorRoles'].forEach(field => {
            if (updates[field] !== undefined) {
                updates[field] = JSON.stringify(updates[field]);
            }
        });
        // Handle booleans
        ['promoted', 'isMovie'].forEach(field => {
            if (updates[field] !== undefined) {
                updates[field] = (updates[field] === true || updates[field] === 'true') ? 1 : 0;
            }
        });
        // Filter out any properties that are not columns in the series table
        const allowedKeys = ['title', 'year', 'poster', 'backdrop', 'rating', 'order_num', 'promoted', 'description', 'videoUrl', 'subtitleUrl', 'tags', 'genres', 'countries', 'actors', 'actorRoles', 'isMovie', 'duration', 'director', 'language', 'views', 'likes', 'type', 'updatedAt', 'ageRating'];
        const validUpdates = {};
        for (const key of allowedKeys) {
            if (updates[key] !== undefined) {
                validUpdates[key] = updates[key];
            }
        }
        const keys = Object.keys(validUpdates);
        if (keys.length === 0) return res.json({ success: true, message: 'لا توجد بيانات للتحديث' });
        const sql = `UPDATE series SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`;
        await db.run(sql, [...Object.values(validUpdates), req.params.id]);
        res.json({ success: true, message: 'تم التحديث بنجاح' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في التحديث: ' + error.message });
    }
});
app.delete('/api/series/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM seasons WHERE seriesId = ?', [req.params.id]);
        await db.run('DELETE FROM episodes WHERE seriesId = ?', [req.params.id]);
        await db.run('DELETE FROM series WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في الحذف' });
    }
});
app.put('/api/content/:id/unpromote', authenticateAdmin, async (req, res) => {
    try {
        await db.run('UPDATE series SET promoted = 0 WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'تم إلغاء التمييز' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
// ==================== 2. إدارة المواسم ====================
app.get('/api/series/:seriesId/seasons', async (req, res) => {
    try {
        const seasons = await db.all('SELECT * FROM seasons WHERE seriesId = ? ORDER BY seasonNumber ASC', [req.params.seriesId]);
        res.json(seasons);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في القراءة' });
    }
});
app.get('/api/seasons/:id', async (req, res) => {
    try {
        const season = await db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]);
        if (!season) return res.status(404).json({ error: 'غير موجود' });
        const episodes = await db.all('SELECT * FROM episodes WHERE seasonId = ? ORDER BY episodeNumber ASC', [req.params.id]);
        res.json({ ...season, episodes, episodeCount: episodes.length });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.post('/api/seasons', authenticateAdmin, async (req, res) => {
    try {
        const { seriesId, seasonNumber, title, poster, backdrop, description, year } = req.body;
        const series = await db.get('SELECT * FROM series WHERE id = ?', [seriesId]);
        if (!series) return res.status(404).json({ error: 'المسلسل غير موجود' });
        const id = 'season_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newSeason = {
            id, seriesId, seriesTitle: series.title,
            seasonNumber: parseInt(seasonNumber) || 1,
            title: title || `الموسم ${seasonNumber}`,
            poster: await downloadImage(poster || series.poster, 'uploads/posters'),
            backdrop: await downloadImage(backdrop || series.backdrop || '', 'uploads/posters/backdrops'),
            description: description || '',
            year: parseInt(year) || series.year,
            episodeCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const keys = Object.keys(newSeason);
        await db.run(`INSERT INTO seasons (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, Object.values(newSeason));
        res.json({ success: true, message: 'تم الإضافة', season: newSeason });
    } catch (error) {
        res.status(500).json({ error: 'خطأ: ' + error.message });
    }
});
app.put('/api/seasons/:id', authenticateAdmin, async (req, res) => {
    try {
        const season = await db.get('SELECT * FROM seasons WHERE id = ?', [req.params.id]);
        if (!season) return res.status(404).json({ error: 'غير موجود' });
        const updates = { ...req.body, updatedAt: new Date().toISOString() };
        const keys = Object.keys(updates);
        await db.run(`UPDATE seasons SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`, [...Object.values(updates), req.params.id]);
        res.json({ success: true, message: 'تم التحديث' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.delete('/api/seasons/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM episodes WHERE seasonId = ?', [req.params.id]);
        await db.run('DELETE FROM seasons WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'تم الحذف' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
// جلب كل المواسم (مطلوب لنافذة إضافة الحلقات)
app.get('/api/seasons', async (req, res) => {
    try {
        const seasons = await db.all('SELECT * FROM seasons ORDER BY seasonNumber ASC');
        res.json(seasons);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في قراءة المواسم' });
    }
});

app.get('/api/episodes', async (req, res) => {
    try {
        let sql = 'SELECT * FROM episodes';
        let params = [];
        let conditions = [];
        if (req.query.seriesId) {
            conditions.push('seriesId = ?');
            params.push(req.query.seriesId);
        }
        if (req.query.seasonId) {
            conditions.push('seasonId = ?');
            params.push(req.query.seasonId);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' ORDER BY episodeNumber ASC';
        const episodes = await db.all(sql, params);
        const series = await db.all('SELECT id, title, poster FROM series');
        const seasons = await db.all('SELECT id, title FROM seasons');
        const enhancedEpisodes = episodes.map(ep => {
            const s = series.find(ser => ser.id === ep.seriesId);
            const sea = seasons.find(season => season.id === ep.seasonId);
            return {
                ...ep,
                isFree: !!ep.isFree,
                seriesTitle: s ? s.title : 'غير معروف',
                seasonTitle: sea ? sea.title : 'غير معروف',
                poster: ep.poster || (s ? s.poster : '')
            };
        });
        res.json(enhancedEpisodes);
    } catch (error) {
        res.status(500).json({ error: 'خطأ: ' + error.message });
    }
});
app.get('/api/episodes/:id', async (req, res) => {
    try {
        const episode = await db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]);
        if (!episode) return res.status(404).json({ error: 'غير موجود' });
        const series = await db.get('SELECT title FROM series WHERE id = ?', [episode.seriesId]);
        const season = await db.get('SELECT title FROM seasons WHERE id = ?', [episode.seasonId]);
        res.json({
            ...episode,
            isFree: !!episode.isFree,
            seriesTitle: series ? series.title : 'غير معروف',
            seasonTitle: season ? season.title : 'غير معروف'
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.post('/api/episodes', authenticateAdmin, async (req, res) => {
    try {
        const { seriesId, seasonId, episodeNumber, title, description, videoUrl, duration, thumbnail, isFree } = req.body;
        const series = await db.get('SELECT * FROM series WHERE id = ?', [seriesId]);
        if (!series) return res.status(404).json({ error: 'المسلسل غير موجود' });
        const id = 'episode_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newEpisode = {
            id, seriesId, seasonId: seasonId || null,
            episodeNumber: parseInt(episodeNumber) || 1,
            title: title || `الحلقة ${episodeNumber}`,
            description: description || '',
            videoUrl, duration: duration || '00:00',
            thumbnail: await downloadImage(thumbnail || series.poster, 'uploads/episodes'),
            isFree: (isFree === true || isFree === 'true') ? 1 : 0,
            views: 0, likes: 0,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        const keys = Object.keys(newEpisode);
        await db.run(`INSERT INTO episodes (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, Object.values(newEpisode));
        if (seasonId) {
            const count = await db.get('SELECT COUNT(*) as count FROM episodes WHERE seasonId = ?', [seasonId]);
            await db.run('UPDATE seasons SET episodeCount = ? WHERE id = ?', [count.count, seasonId]);
        }
        res.json({ success: true, message: 'تم الإضافة', episode: newEpisode });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.put('/api/episodes/:id', authenticateAdmin, async (req, res) => {
    try {
        const episode = await db.get('SELECT * FROM episodes WHERE id = ?', [req.params.id]);
        if (!episode) return res.status(404).json({ error: 'غير موجود' });
        const updates = { ...req.body, updatedAt: new Date().toISOString() };
        if (updates.isFree !== undefined) updates.isFree = (updates.isFree === true || updates.isFree === 'true') ? 1 : 0;
        const keys = Object.keys(updates);
        await db.run(`UPDATE episodes SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`, [...Object.values(updates), req.params.id]);
        res.json({ success: true, message: 'تم التحديث' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.delete('/api/episodes/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM episodes WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'تم الحذف' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
// ==================== 4. إدارة الممثلين ====================
app.get('/api/actors', async (req, res) => {
    try {
        const actors = await db.all('SELECT * FROM actors');
        res.json(actors.map(a => ({
            ...a,
            movies: JSON.parse(a.movies || '[]'),
            series: JSON.parse(a.series || '[]')
        })));
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.get('/api/actors/search', async (req, res) => {
    try {
        const query = req.query.q?.toLowerCase() || '';
        const results = await db.all('SELECT * FROM actors WHERE name LIKE ? OR nationality LIKE ?', [`%${query}%`, `%${query}%`]);
        res.json(results.map(a => ({
            ...a,
            movies: JSON.parse(a.movies || '[]'),
            series: JSON.parse(a.series || '[]')
        })));
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.get('/api/actors/:id', async (req, res) => {
    try {
        const actor = await db.get('SELECT * FROM actors WHERE id = ?', [req.params.id]);
        if (!actor) return res.status(404).json({ error: 'غير موجود' });
        const series = await db.all('SELECT id, title, year, poster, isMovie, actors, actorRoles FROM series');
        const linkedMovies = series.filter(s => s.isMovie && JSON.parse(s.actors || '[]').includes(req.params.id));
        const linkedSeries = series.filter(s => !s.isMovie && JSON.parse(s.actors || '[]').includes(req.params.id));
        const actorRoles = [];
        series.forEach(content => {
            const roles = JSON.parse(content.actorRoles || '[]');
            roles.forEach(role => {
                if (role.actorId === req.params.id) {
                    actorRoles.push({
                        contentId: content.id,
                        contentTitle: content.title,
                        contentType: content.isMovie ? 'movie' : 'series',
                        characterName: role.characterName,
                        role: role.role,
                        order: role.order
                    });
                }
            });
        });
        res.json({
            ...actor,
            movies: linkedMovies.map(m => ({ id: m.id, title: m.title, year: m.year, poster: m.poster })),
            series: linkedSeries.map(s => ({ id: s.id, title: s.title, year: s.year, poster: s.poster })),
            roles: actorRoles
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ: ' + error.message });
    }
});
app.post('/api/actors', authenticateAdmin, async (req, res) => {
    try {
        const { name, image, bio, nationality, birthDate } = req.body;
        const id = 'actor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newActor = {
            id, name: name.trim(),
            image: image || '/uploads/actors/default.jpg',
            bio: bio || '',
            nationality: nationality || '',
            birthDate: birthDate || '',
            movies: JSON.stringify([]),
            series: JSON.stringify([]),
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        const keys = Object.keys(newActor);
        await db.run(`INSERT INTO actors (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, Object.values(newActor));
        res.json({ success: true, message: 'تم الإضافة', actor: newActor });
    } catch (error) {
        res.status(500).json({ error: 'خطأ: ' + error.message });
    }
});
app.put('/api/actors/:id', authenticateAdmin, async (req, res) => {
    try {
        const updates = { ...req.body, updatedAt: new Date().toISOString() };
        if (updates.movies) updates.movies = JSON.stringify(updates.movies);
        if (updates.series) updates.series = JSON.stringify(updates.series);
        const keys = Object.keys(updates);
        await db.run(`UPDATE actors SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`, [...Object.values(updates), req.params.id]);
        res.json({ success: true, message: 'تم التحديث' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.delete('/api/actors/:id', authenticateAdmin, async (req, res) => {
    try {
        // Cleaning relations in series
        const series = await db.all('SELECT id, actors, actorRoles FROM series');
        for (const content of series) {
            let actors = JSON.parse(content.actors || '[]');
            let roles = JSON.parse(content.actorRoles || '[]');
            if (actors.includes(req.params.id) || roles.some(r => r.actorId === req.params.id)) {
                actors = actors.filter(id => id !== req.params.id);
                roles = roles.filter(r => r.actorId !== req.params.id);
                await db.run('UPDATE series SET actors = ?, actorRoles = ? WHERE id = ?', [JSON.stringify(actors), JSON.stringify(roles), content.id]);
            }
        }
        await db.run('DELETE FROM actors WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'تم الحذف' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
// ربط الممثلين بالمحتوى
app.post('/api/content/:contentId/actors', authenticateAdmin, async (req, res) => {
    try {
        const { actorId, role, characterName, order } = req.body;
        const content = await db.get('SELECT * FROM series WHERE id = ?', [req.params.contentId]);
        if (!content) return res.status(404).json({ error: 'المحتوى غير موجود' });
        const actor = await db.get('SELECT * FROM actors WHERE id = ?', [actorId]);
        if (!actor) return res.status(404).json({ error: 'الممثل غير موجود' });
        const actorRole = {
            actorId, actorName: actor.name,
            characterName: characterName || actor.name,
            role: role || 'ممثل',
            order: parseInt(order) || 0
        };
        let actorRoles = JSON.parse(content.actorRoles || '[]');
        let actors = JSON.parse(content.actors || '[]');
        const existingIndex = actorRoles.findIndex(ar => ar.actorId === actorId);
        if (existingIndex !== -1) {
            actorRoles[existingIndex] = actorRole;
        } else {
            actorRoles.push(actorRole);
        }
        if (!actors.includes(actorId)) actors.push(actorId);
        await db.run('UPDATE series SET actors = ?, actorRoles = ? WHERE id = ?', [JSON.stringify(actors), JSON.stringify(actorRoles), req.params.contentId]);
        res.json({ success: true, message: 'تم الربط', actorRole });
    } catch (error) {
        res.status(500).json({ error: 'خطأ: ' + error.message });
    }
});
app.delete('/api/content/:contentId/actors/:actorId', authenticateAdmin, async (req, res) => {
    try {
        const content = await db.get('SELECT * FROM series WHERE id = ?', [req.params.contentId]);
        if (!content) return res.status(404).json({ error: 'المحتوى غير موجود' });
        let actors = JSON.parse(content.actors || '[]');
        let actorRoles = JSON.parse(content.actorRoles || '[]');
        actors = actors.filter(id => id !== req.params.actorId);
        actorRoles = actorRoles.filter(r => r.actorId !== req.params.actorId);
        await db.run('UPDATE series SET actors = ?, actorRoles = ? WHERE id = ?', [JSON.stringify(actors), JSON.stringify(actorRoles), req.params.contentId]);
        res.json({ success: true, message: 'تم فك الربط' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.put('/api/content/:contentId/actors/:actorId/order', authenticateAdmin, async (req, res) => {
    try {
        const content = await db.get('SELECT * FROM series WHERE id = ?', [req.params.contentId]);
        if (!content) return res.status(404).json({ error: 'المحتوى غير موجود' });
        let actorRoles = JSON.parse(content.actorRoles || '[]');
        const roleIndex = actorRoles.findIndex(r => r.actorId === req.params.actorId);
        if (roleIndex === -1) return res.status(404).json({ error: 'الدور غير موجود' });
        actorRoles[roleIndex].order = parseInt(req.body.order) || 0;
        await db.run('UPDATE series SET actorRoles = ? WHERE id = ?', [JSON.stringify(actorRoles), req.params.contentId]);
        res.json({ success: true, message: 'تم تحديث الترتيب' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.get('/api/content/:contentId/actors', async (req, res) => {
    try {
        const content = await db.get('SELECT * FROM series WHERE id = ?', [req.params.contentId]);
        if (!content) return res.status(404).json({ error: 'غير موجود' });
        const actorRoles = JSON.parse(content.actorRoles || '[]');
        actorRoles.sort((a, b) => a.order - b.order);
        const actors = await db.all('SELECT id, image, bio, nationality FROM actors');
        const enhancedRoles = actorRoles.map(role => {
            const actor = actors.find(a => a.id === role.actorId);
            return {
                ...role,
                actorImage: actor ? actor.image : '',
                actorBio: actor ? actor.bio : '',
                actorNationality: actor ? actor.nationality : ''
            };
        });
        res.json(enhancedRoles);
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
// ==================== 5. إدارة الأجزاء (Parts) ====================
app.get('/api/parts', async (req, res) => {
    try {
        const parts = await db.all('SELECT * FROM parts');
        const series = await db.all('SELECT id, title, isMovie, poster FROM series');
        const enhancedParts = parts.map(part => {
            const parent = series.find(s => s.id === part.parentId);
            return {
                ...part,
                parentTitle: parent ? parent.title : 'غير معروف',
                parentType: parent ? (parent.isMovie ? 'movie' : 'series') : 'unknown',
                parentPoster: parent ? parent.poster : ''
            };
        });
        res.json(enhancedParts);
    } catch (error) {
        res.status(500).json({ error: 'خطأ: ' + error.message });
    }
});
// مسار لجلب أجزاء محتوى معين (تم تغيير المسار لتجنب التعارض)
app.get('/api/content/:parentId/parts', async (req, res) => {
    try {
        const parts = await db.all('SELECT * FROM parts WHERE parentId = ? ORDER BY partNumber ASC', [req.params.parentId]);
        res.json(parts);
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
// مسار لجلب تفاصيل جزء واحد
app.get('/api/parts/:id', async (req, res) => {
    try {
        const part = await db.get('SELECT * FROM parts WHERE id = ?', [req.params.id]);
        if (!part) return res.status(404).json({ error: 'غير موجود' });
        const parent = await db.get('SELECT title, poster, isMovie FROM series WHERE id = ?', [part.parentId]);
        res.json({
            ...part,
            parentTitle: parent ? parent.title : 'غير معروف',
            parentPoster: parent ? parent.poster : '',
            parentType: parent ? (parent.isMovie ? 'movie' : 'series') : 'unknown'
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.post('/api/parts', authenticateAdmin, async (req, res) => {
    try {
        const { parentId, partNumber, title, year, poster, description, duration, videoUrl } = req.body;
        const parent = await db.get('SELECT title, year, poster, isMovie FROM series WHERE id = ?', [parentId]);
        if (!parent) return res.status(404).json({ error: 'المحتوى الأصلي غير موجود' });
        const id = 'part_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newPart = {
            id, parentId, parentTitle: parent.title,
            parentType: parent.isMovie ? 'movie' : 'series',
            partNumber: parseInt(partNumber) || 1,
            title: title || `الجزء ${partNumber}`,
            year: parseInt(year) || parent.year,
            poster: poster || parent.poster,
            description: description || '',
            duration: duration || '',
            videoUrl: videoUrl || '',
            views: 0, likes: 0,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
        };
        const keys = Object.keys(newPart);
        await db.run(`INSERT INTO parts (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, Object.values(newPart));
        res.json({ success: true, message: 'تم الإضافة', part: newPart });
    } catch (error) {
        res.status(500).json({ error: 'خطأ: ' + error.message });
    }
});
app.put('/api/parts/:id', authenticateAdmin, async (req, res) => {
    try {
        const updates = { ...req.body, updatedAt: new Date().toISOString() };
        const keys = Object.keys(updates);
        await db.run(`UPDATE parts SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`, [...Object.values(updates), req.params.id]);
        res.json({ success: true, message: 'تم التحديث' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.delete('/api/parts/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM parts WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'تم الحذف' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
// ==================== 6. إدارة التصنيفات (Genres) ====================
app.get('/api/genres', async (req, res) => {
    try {
        const genres = await db.all('SELECT * FROM genres');
        const series = await db.all('SELECT genres FROM series');
        const enhancedGenres = genres.map(genre => {
            const count = series.filter(s => {
                try {
                    const sGenres = JSON.parse(s.genres || '[]');
                    return sGenres.includes(genre.name);
                } catch (e) { return false; }
            }).length;
            return { ...genre, count };
        });
        res.json(enhancedGenres);
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.get('/api/genres/:id', async (req, res) => {
    try {
        const genre = await db.get('SELECT * FROM genres WHERE id = ?', [req.params.id]);
        if (!genre) return res.status(404).json({ error: 'غير موجود' });
        const series = await db.all('SELECT id, title, year, poster, isMovie, genres FROM series');
        const relatedContent = series.filter(s => JSON.parse(s.genres || '[]').includes(genre.name));
        res.json({
            ...genre,
            contentCount: relatedContent.length,
            content: relatedContent.map(c => ({
                id: c.id, title: c.title, year: c.year, poster: c.poster, type: c.isMovie ? 'movie' : 'series'
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.post('/api/genres', authenticateAdmin, async (req, res) => {
    try {
        const { name, color, icon } = req.body;
        const id = 'genre_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newGenre = { id, name: name.trim(), color: color || '#1bd68e', icon: icon || 'fa-tag' };
        const keys = Object.keys(newGenre);
        await db.run(`INSERT INTO genres (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, Object.values(newGenre));
        res.json({ success: true, message: 'تم الإضافة', genre: newGenre });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.put('/api/genres/:id', authenticateAdmin, async (req, res) => {
    try {
        const oldGenre = await db.get('SELECT * FROM genres WHERE id = ?', [req.params.id]);
        if (!oldGenre) return res.status(404).json({ error: 'غير موجود' });
        const updates = req.body;
        const keys = Object.keys(updates);
        await db.run(`UPDATE genres SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`, [...Object.values(updates), req.params.id]);
        // Update name in series if changed
        if (updates.name && updates.name !== oldGenre.name) {
            const series = await db.all('SELECT id, genres FROM series');
            for (const s of series) {
                let genres = JSON.parse(s.genres || '[]');
                if (genres.includes(oldGenre.name)) {
                    genres = genres.map(g => g === oldGenre.name ? updates.name : g);
                    await db.run('UPDATE series SET genres = ? WHERE id = ?', [JSON.stringify(genres), s.id]);
                }
            }
        }
        res.json({ success: true, message: 'تم التحديث' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.delete('/api/genres/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM genres WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'تم الحذف' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
// ==================== 7. إدارة الدول (Countries) ====================
app.get('/api/countries', async (req, res) => {
    try {
        const countries = await db.all('SELECT * FROM countries');
        res.json(countries);
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.post('/api/countries', authenticateAdmin, async (req, res) => {
    try {
        const { name, code, flag, continent } = req.body;
        const id = 'country_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newCountry = { id, name: name.trim(), code: code.trim().toUpperCase(), flag: flag || '', continent: continent || '', createdAt: new Date().toISOString() };
        const keys = Object.keys(newCountry);
        await db.run(`INSERT INTO countries (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, Object.values(newCountry));
        res.json({ success: true, message: 'تم الإضافة', country: newCountry });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.put('/api/countries/:id', authenticateAdmin, async (req, res) => {
    try {
        const oldCountry = await db.get('SELECT * FROM countries WHERE id = ?', [req.params.id]);
        if (!oldCountry) return res.status(404).json({ error: 'غير موجود' });
        const updates = { ...req.body, updatedAt: new Date().toISOString() };
        const keys = Object.keys(updates);
        await db.run(`UPDATE countries SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`, [...Object.values(updates), req.params.id]);
        // Update nationality in actors if changed
        if (updates.name && updates.name !== oldCountry.name) {
            await db.run('UPDATE actors SET nationality = ? WHERE nationality = ?', [updates.name, oldCountry.name]);
        }
        res.json({ success: true, message: 'تم التحديث' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.delete('/api/countries/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM countries WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'تم الحذف' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});

app.get('/api/tags', async (req, res) => {
    try {
        const tags = await db.all('SELECT * FROM tags');
        res.json(tags);
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.get('/api/tags/:id', async (req, res) => {
    try {
        const tag = await db.get('SELECT * FROM tags WHERE id = ?', [req.params.id]);
        if (!tag) return res.status(404).json({ error: 'غير موجود' });
        const series = await db.all('SELECT id, title, year, poster, isMovie, tags FROM series');
        const relatedContent = series.filter(s => JSON.parse(s.tags || '[]').includes(tag.name));
        res.json({
            ...tag,
            contentCount: relatedContent.length,
            content: relatedContent.slice(0, 10).map(c => ({
                id: c.id, title: c.title, year: c.year, poster: c.poster, type: c.isMovie ? 'movie' : 'series'
            }))
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.post('/api/tags', authenticateAdmin, async (req, res) => {
    try {
        const { name, color, type } = req.body;
        const id = 'tag_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const newTag = { id, name: name.trim(), color: color || '#1bd68e', type: type || 'general', count: 0 };
        const keys = Object.keys(newTag);
        await db.run(`INSERT INTO tags (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`, Object.values(newTag));
        res.json({ success: true, message: 'تم الإضافة', tag: newTag });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.put('/api/tags/:id', authenticateAdmin, async (req, res) => {
    try {
        const oldTag = await db.get('SELECT * FROM tags WHERE id = ?', [req.params.id]);
        if (!oldTag) return res.status(404).json({ error: 'غير موجود' });
        const updates = req.body;
        const keys = Object.keys(updates);
        await db.run(`UPDATE tags SET ${keys.map(k => `${k} = ?`).join(',')} WHERE id = ?`, [...Object.values(updates), req.params.id]);
        if (updates.name && updates.name !== oldTag.name) {
            const series = await db.all('SELECT id, tags FROM series');
            for (const s of series) {
                let tags = JSON.parse(s.tags || '[]');
                if (tags.includes(oldTag.name)) {
                    tags = tags.map(t => t === oldTag.name ? updates.name : t);
                    await db.run('UPDATE series SET tags = ? WHERE id = ?', [JSON.stringify(tags), s.id]);
                }
            }
        }
        res.json({ success: true, message: 'تم التحديث' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.delete('/api/tags/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM tags WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'تم الحذف' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.post('/api/content/:contentId/tags', authenticateAdmin, async (req, res) => {
    try {
        const { tagIds } = req.body;
        const content = await db.get('SELECT * FROM series WHERE id = ?', [req.params.contentId]);
        if (!content) return res.status(404).json({ error: 'المحتوى غير موجود' });
        const allTags = await db.all('SELECT * FROM tags');
        const validTags = allTags.filter(tag => tagIds.includes(tag.id));
        const tagNames = validTags.map(tag => tag.name);
        await db.run('UPDATE series SET tags = ? WHERE id = ?', [JSON.stringify(tagNames), req.params.contentId]);
        for (const tag of validTags) {
            await db.run('UPDATE tags SET count = (SELECT COUNT(*) FROM series WHERE tags LIKE ?) WHERE id = ?', [`%${tag.name}%`, tag.id]);
        }
        res.json({ success: true, message: 'تم ربط الوسوم', tags: validTags });
    } catch (error) {
        res.status(500).json({ error: 'خطأ: ' + error.message });
    }
});
// ==================== 9. مسارات عامة (بحث، إحصائيات، الصفحة الرئيسية) ====================
app.get('/api/promoted', async (req, res) => {
    try {
        const promoted = await db.all('SELECT * FROM series WHERE promoted = 1 ORDER BY order_num ASC');
        res.json(promoted.map(s => ({
            ...s,
            tags: JSON.parse(s.tags || '[]'),
            genres: JSON.parse(s.genres || '[]'),
            countries: JSON.parse(s.countries || '[]'),
            actors: JSON.parse(s.actors || '[]'),
            actorRoles: JSON.parse(s.actorRoles || '[]'),
            promoted: true,
            isMovie: !!s.isMovie
        })));
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.get('/api/stats', authenticateAdmin, async (req, res) => {
    try {
        const seriesCount = await db.get('SELECT COUNT(*) as count FROM series WHERE isMovie = 0');
        const moviesCount = await db.get('SELECT COUNT(*) as count FROM series WHERE isMovie = 1');
        const seasonsCount = await db.get('SELECT COUNT(*) as count FROM seasons');
        const episodesCount = await db.get('SELECT COUNT(*) as count FROM episodes');
        const actorsCount = await db.get('SELECT COUNT(*) as count FROM actors');
        const genresCount = await db.get('SELECT COUNT(*) as count FROM genres');
        const countriesCount = await db.get('SELECT COUNT(*) as count FROM countries');
        const promotedCount = await db.get('SELECT COUNT(*) as count FROM series WHERE promoted = 1');
        const viewsSeries = await db.get('SELECT SUM(views) as total FROM series');
        const viewsEpisodes = await db.get('SELECT SUM(views) as total FROM episodes');
        const stats = {
            totalSeries: seriesCount.count,
            totalMovies: moviesCount.count,
            totalSeasons: seasonsCount.count,
            totalEpisodes: episodesCount.count,
            totalActors: actorsCount.count,
            totalGenres: genresCount.count,
            totalCountries: countriesCount.count,
            totalPromoted: promotedCount.count,
            totalViews: (viewsSeries.total || 0) + (viewsEpisodes.total || 0),
            lastUpdated: new Date().toISOString()
        };
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q?.toLowerCase() || '';
        const type = req.query.type || 'all';
        let results = [];
        if (type === 'all' || type === 'series' || type === 'movie') {
            const series = await db.all('SELECT * FROM series WHERE title LIKE ? OR description LIKE ?', [`%${query}%`, `%${query}%`]);
            results = [...results, ...series.map(s => ({
                ...s,
                type: s.isMovie ? 'movie' : 'series',
                tags: JSON.parse(s.tags || '[]'),
                genres: JSON.parse(s.genres || '[]'),
                countries: JSON.parse(s.countries || '[]'),
                actors: JSON.parse(s.actors || '[]'),
                actorRoles: JSON.parse(s.actorRoles || '[]')
            }))];
        }
        if (type === 'all' || type === 'actors') {
            const actors = await db.all('SELECT * FROM actors WHERE name LIKE ?', [`%${query}%`]);
            results = [...results, ...actors.map(a => ({ ...a, type: 'actor' }))];
        }
        if (type === 'all' || type === 'episodes') {
            const episodes = await db.all('SELECT * FROM episodes WHERE title LIKE ?', [`%${query}%`]);
            results = [...results, ...episodes.map(ep => ({ ...ep, type: 'episode' }))];
        }
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.get('/api/home', async (req, res) => {
    try {
        const featured = await db.all('SELECT * FROM series WHERE promoted = 1 LIMIT 5');
        const latestSeries = await db.all('SELECT * FROM series WHERE isMovie = 0 ORDER BY createdAt DESC LIMIT 10');
        const latestMovies = await db.all('SELECT * FROM series WHERE isMovie = 1 ORDER BY createdAt DESC LIMIT 10');
        const genres = await db.all('SELECT * FROM genres');
        const countries = await db.all('SELECT * FROM countries');
        const mapSeries = s => ({
            ...s,
            tags: JSON.parse(s.tags || '[]'),
            genres: JSON.parse(s.genres || '[]'),
            countries: JSON.parse(s.countries || '[]'),
            actors: JSON.parse(s.actors || '[]'),
            actorRoles: JSON.parse(s.actorRoles || '[]'),
            promoted: !!s.promoted,
            isMovie: !!s.isMovie
        });
        res.json({
            featured: featured.map(mapSeries),
            latestSeries: latestSeries.map(mapSeries),
            latestMovies: latestMovies.map(mapSeries),
            genres,
            countries
        });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.post('/api/watch/:id', async (req, res) => {
    try {
        const { type = 'episode' } = req.body;
        if (type === 'episode') {
            const ep = await db.get('SELECT seriesId FROM episodes WHERE id = ?', [req.params.id]);
            if (ep) {
                await db.run('UPDATE episodes SET views = views + 1 WHERE id = ?', [req.params.id]);
                await db.run('UPDATE series SET views = views + 1 WHERE id = ?', [ep.seriesId]);
            }
        } else {
            await db.run('UPDATE series SET views = views + 1 WHERE id = ?', [req.params.id]);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
// ==================== USER AUTHENTICATION & PROFILES ====================
// تسجيل حساب جديد
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, name, age } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبة' });
        }
        const existing = await db.get('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
            return res.status(400).json({ error: 'اسم المستخدم موجود مسبقاً' });
        }
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const now = new Date().toISOString();
        await db.run(`INSERT INTO users (id, username, password, createdAt, lastActive) VALUES (?, ?, ?, ?, ?)`,
            [userId, username, password, now, now]);
        const profileId = 'profile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await db.run(`INSERT INTO profiles (id, userId, name, avatar, isDefault, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            [profileId, userId, name || username, '/uploads/avatars/default.png', 1, now]);
        res.json({ success: true, message: 'تم إنشاء الحساب بنجاح', user: { id: userId, username }, profile: { id: profileId, name: name || username } });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ في إنشاء الحساب' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.get('SELECT id, username FROM users WHERE username = ? AND password = ?', [username, password]);
        if (!user) {
            return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
        }
        await db.run('UPDATE users SET lastActive = ? WHERE id = ?', [new Date().toISOString(), user.id]);
        const profiles = await db.all('SELECT id, name, avatar, isDefault FROM profiles WHERE userId = ?', [user.id]);
        res.json({ success: true, user, profiles });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ في تسجيل الدخول' });
    }
});
// اختيار ملف شخصي
app.post('/api/auth/select-profile', async (req, res) => {
    try {
        const { profileId, userId } = req.body;
        const profile = await db.get(`SELECT p.*, u.username FROM profiles p JOIN users u ON p.userId = u.id WHERE p.id = ? AND u.id = ?`, [profileId, userId]);
        if (!profile) {
            return res.status(404).json({ error: 'الملف الشخصي غير موجود' });
        }
        res.json({ success: true, session: { userId: profile.userId, username: profile.username, profileId: profile.id, profileName: profile.name, profileAvatar: profile.avatar, restrictions: JSON.parse(profile.restrictions || '[]'), ageLimit: profile.ageLimit || 0 } });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ' });
    }
});
// جلب جميع الملفات الشخصية لمستخدم
app.get('/api/users/:userId/profiles', async (req, res) => {
    try {
        const profiles = await db.all('SELECT id, name, avatar, isDefault, ageLimit FROM profiles WHERE userId = ?', [req.params.userId]);
        res.json(profiles);
    } catch (error) {
        res.status(500).json({ error: 'خطأ في جلب الملفات الشخصية' });
    }
});
// إضافة ملف شخصي جديد
app.post('/api/profiles', async (req, res) => {
    try {
        const { userId, name, avatar } = req.body;
        if (!userId || !name) return res.status(400).json({ error: 'معرف المستخدم واسم الملف الشخصي مطلوبان' });
        const profileId = 'profile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        await db.run(`INSERT INTO profiles (id, userId, name, avatar, isDefault, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
            [profileId, userId, name, avatar || '/uploads/avatars/default.png', 0, new Date().toISOString()]);
        res.json({ success: true, message: 'تم إنشاء الملف الشخصي بنجاح', profile: { id: profileId, name, avatar: avatar || '/uploads/avatars/default.png' } });
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ في إنشاء الملف الشخصي' });
    }
});
// تحديث ملف شخصي (للرقابة الأبوية)
app.put('/api/profiles/:profileId', async (req, res) => {
    try {
        const { name, avatar, ageLimit, restrictions } = req.body;
        const updates = [], values = [];
        if (name !== undefined) { updates.push('name = ?'); values.push(name); }
        if (avatar !== undefined) { updates.push('avatar = ?'); values.push(avatar); }
        if (ageLimit !== undefined) { updates.push('ageLimit = ?'); values.push(ageLimit); }
        if (restrictions !== undefined) { updates.push('restrictions = ?'); values.push(JSON.stringify(restrictions)); }
        if (updates.length === 0) return res.json({ success: true });
        values.push(req.params.profileId);
        await db.run(`UPDATE profiles SET ${updates.join(', ')} WHERE id = ?`, values);
        res.json({ success: true, message: 'تم تحديث الملف الشخصي' });
    } catch (error) {
        res.status(500).json({ error: 'خطأ في تحديث الملف الشخصي' });
    }
});
app.get('/api/logs', authenticateAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const logs = await db.all('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?', [limit]);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.get('/api/backup', authenticateAdmin, async (req, res) => {
    try {
        const backup = {
            series: await db.all('SELECT * FROM series'),
            seasons: await db.all('SELECT * FROM seasons'),
            episodes: await db.all('SELECT * FROM episodes'),
            actors: await db.all('SELECT * FROM actors'),
            genres: await db.all('SELECT * FROM genres'),
            countries: await db.all('SELECT * FROM countries'),
            tags: await db.all('SELECT * FROM tags'),
            admins: await db.all('SELECT * FROM admins'),
            timestamp: new Date().toISOString()
        };
        res.json(backup);
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
app.post('/api/restore', authenticateAdmin, upload.single('backup'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'لم يتم رفع ملف' });
        const backupData = JSON.parse(fs.readFileSync(req.file.path, 'utf8'));
        if (backupData.db && backupData.admins) {
            fs.writeFileSync('data/db.json', JSON.stringify(backupData.db, null, 2));
            fs.writeFileSync('data/admins.json', JSON.stringify(backupData.admins, null, 2));
            fs.unlinkSync(req.file.path);
            res.json({ success: true, message: 'تم الاستعادة بنجاح' });
        } else {
            res.status(400).json({ error: 'ملف غير صالح' });
        }
    } catch (error) {
        res.status(500).json({ error: 'خطأ' });
    }
});
// ==================== 10. إدارة الملفات (Files Management) ====================
// دالة مساعدة لفحص نوع الملف
function getFileCategory(filename, mimetype) {
    if (!filename) return 'other';
    const ext = path.extname(filename).toLowerCase();
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const videoExts = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];
    const subtitleExts = ['.vtt', '.srt', '.ass', '.ssa'];
    if (imageExts.includes(ext) || mimetype?.startsWith('image/')) return 'image';
    if (videoExts.includes(ext) || mimetype?.startsWith('video/')) return 'video';
    if (subtitleExts.includes(ext)) return 'subtitle';
    return 'other';
}
// دالة لجلب جميع الارتباطات من قاعدة البيانات لسرعة الفحص
async function getAllFileLinks() {
    const map = new Map();
    const addLink = (url, linkData) => {
        if (!url) return;
        try {
            const decodedUrl = decodeURIComponent(url);
            const filename = path.basename(decodedUrl);
            if (!map.has(filename)) map.set(filename, []);
            map.get(filename).push(linkData);
            if (!map.has(url)) map.set(url, []);
            map.get(url).push(linkData);
        } catch (e) { }
    };
    try {
        const series = await db.all('SELECT id, title, isMovie, poster, videoUrl, subtitleUrl FROM series');
        for (const c of series) {
            const type = c.isMovie ? 'فيلم' : 'مسلسل';
            addLink(c.poster, { id: c.id, title: c.title, type, field: 'صورة' });
            addLink(c.videoUrl, { id: c.id, title: c.title, type, field: 'فيديو' });
            addLink(c.subtitleUrl, { id: c.id, title: c.title, type, field: 'ترجمة' });
        }
        const seasons = await db.all('SELECT id, title, poster FROM seasons');
        for (const s of seasons) addLink(s.poster, { id: s.id, title: s.title, type: 'موسم', field: 'صورة' });
        const episodes = await db.all('SELECT id, title, poster, thumbnail, videoUrl, subtitleUrl FROM episodes');
        for (const e of episodes) {
            addLink(e.poster, { id: e.id, title: e.title, type: 'حلقة', field: 'صورة' });
            addLink(e.thumbnail, { id: e.id, title: e.title, type: 'حلقة', field: 'صورة مصغرة' });
            addLink(e.videoUrl, { id: e.id, title: e.title, type: 'حلقة', field: 'فيديو' });
            addLink(e.subtitleUrl, { id: e.id, title: e.title, type: 'حلقة', field: 'ترجمة' });
        }
        const actors = await db.all('SELECT id, name, image FROM actors');
        for (const a of actors) addLink(a.image, { id: a.id, title: a.name, type: 'ممثل', field: 'صورة' });
        const countries = await db.all('SELECT id, name, flag FROM countries');
        for (const c of countries) addLink(c.flag, { id: c.id, title: c.name, type: 'دولة', field: 'علم' });
        const partsCheck = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='parts'");
        if (partsCheck.length > 0) {
            const parts = await db.all('SELECT id, title, poster, videoUrl FROM parts');
            for (const p of parts) {
                addLink(p.poster, { id: p.id, title: p.title, type: 'جزء', field: 'صورة' });
                addLink(p.videoUrl, { id: p.id, title: p.title, type: 'جزء', field: 'فيديو' });
            }
        }
    } catch (err) { console.error("Error getting links:", err); }
    return map;
}
// دالة لتحديث الروابط في قاعدة البيانات بعد نقل أو إعادة تسمية ملف
async function updateDbLinks(oldUrl, newUrl) {
    try {
        await db.run('UPDATE series SET poster = ? WHERE poster = ?', [newUrl, oldUrl]);
        await db.run('UPDATE series SET videoUrl = ? WHERE videoUrl = ?', [newUrl, oldUrl]);
        await db.run('UPDATE series SET subtitleUrl = ? WHERE subtitleUrl = ?', [newUrl, oldUrl]);
        await db.run('UPDATE seasons SET poster = ? WHERE poster = ?', [newUrl, oldUrl]);
        await db.run('UPDATE episodes SET poster = ? WHERE poster = ?', [newUrl, oldUrl]);
        await db.run('UPDATE episodes SET thumbnail = ? WHERE thumbnail = ?', [newUrl, oldUrl]);
        await db.run('UPDATE episodes SET videoUrl = ? WHERE videoUrl = ?', [newUrl, oldUrl]);
        await db.run('UPDATE episodes SET subtitleUrl = ? WHERE subtitleUrl = ?', [newUrl, oldUrl]);
        await db.run('UPDATE actors SET image = ? WHERE image = ?', [newUrl, oldUrl]);
        await db.run('UPDATE countries SET flag = ? WHERE flag = ?', [newUrl, oldUrl]);
        const partsCheck = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='parts'");
        if (partsCheck.length > 0) {
            await db.run('UPDATE parts SET poster = ? WHERE poster = ?', [newUrl, oldUrl]);
            await db.run('UPDATE parts SET videoUrl = ? WHERE videoUrl = ?', [newUrl, oldUrl]);
        }
    } catch (err) { console.error("Error updating DB links:", err); }
}
// جلب قائمة الملفات
app.get('/api/fs/list', authenticateAdmin, async (req, res) => {
    try {
        const queryDir = req.query.dir || '';
        const baseUploads = path.join(__dirname, 'uploads');
        const targetDir = path.join(baseUploads, queryDir);
        if (!targetDir.startsWith(baseUploads)) return res.status(403).json({ error: 'وصول غير مصرح به' });
        if (!fs.existsSync(targetDir)) return res.status(404).json({ error: 'المجلد غير موجود' });
        const items = fs.readdirSync(targetDir);
        const map = await getAllFileLinks();
        const filesInfo = items.map(item => {
            const itemPath = path.join(targetDir, item);
            let isDir = false;
            let size = 0;
            try {
                const stat = fs.statSync(itemPath);
                isDir = stat.isDirectory();
                size = stat.size;
            } catch (e) { }
            const relPath = path.join(queryDir, item).replace(/\\/g, '/');
            const fileUrl = `/uploads/${relPath}`;
            let links = [];
            if (!isDir) {
                const linksByUrl = map.get(fileUrl) || [];
                const linksByName = map.get(item) || [];
                const merged = [...linksByUrl, ...linksByName];
                const uniqueIds = new Set();
                links = merged.filter(l => {
                    const k = `${l.id}-${l.field}`;
                    if (uniqueIds.has(k)) return false;
                    uniqueIds.add(k);
                    return true;
                });
            }
            return {
                name: item,
                path: relPath,
                isDir,
                size,
                category: isDir ? 'folder' : getFileCategory(item),
                url: fileUrl,
                links
            };
        });
        // ترتيب المجلدات أولاً
        filesInfo.sort((a, b) => {
            if (a.isDir && !b.isDir) return -1;
            if (!a.isDir && b.isDir) return 1;
            return a.name.localeCompare(b.name);
        });
        res.json({ success: true, files: filesInfo });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/fs/mkdir', authenticateAdmin, (req, res) => {
    try {
        const { dir, name } = req.body;
        const baseUploads = path.join(__dirname, 'uploads');
        const targetDir = path.join(baseUploads, dir, name);
        if (!targetDir.startsWith(baseUploads)) return res.status(403).json({ error: 'غير مصرح' });
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/fs/move', authenticateAdmin, async (req, res) => {
    try {
        const { source, destination } = req.body;
        const baseUploads = path.join(__dirname, 'uploads');
        const srcPath = path.join(baseUploads, source);
        const destPath = path.join(baseUploads, destination);
        if (!srcPath.startsWith(baseUploads) || !destPath.startsWith(baseUploads)) return res.status(403).json({ error: 'غير مصرح' });
        if (!fs.existsSync(srcPath)) return res.status(404).json({ error: 'الملف غير موجود' });
        fs.renameSync(srcPath, destPath);
        const oldUrl = `/uploads/${source.replace(/\\/g, '/')}`;
        const newUrl = `/uploads/${destination.replace(/\\/g, '/')}`;
        await updateDbLinks(oldUrl, newUrl);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/fs/delete', authenticateAdmin, (req, res) => {
    try {
        const { path: delPath } = req.body;
        const baseUploads = path.join(__dirname, 'uploads');
        const targetPath = path.join(baseUploads, delPath);
        if (!targetPath.startsWith(baseUploads)) return res.status(403).json({ error: 'غير مصرح' });
        if (!fs.existsSync(targetPath)) return res.status(404).json({ error: 'غير موجود' });
        if (fs.statSync(targetPath).isDirectory()) {
            fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(targetPath);
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// دالة مساعدة لتنسيق حجم الملف
// جلب قائمة الملفات (نسخة مصححة 100%)
// ==================== USERS & GROUPS API ====================
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const users = await db.all('SELECT * FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const { username, password, name, age, avatar, groupId, custom_restrictions } = req.body;
        const id = 'user_' + Date.now();
        const createdAt = new Date().toISOString();
        await db.run(`INSERT INTO users (id, username, password, name, age, avatar, groupId, custom_restrictions, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, username, password, name, age, avatar, groupId, custom_restrictions, createdAt]);
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.put('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const { username, password, name, age, avatar, groupId, custom_restrictions } = req.body;
        await db.run(`UPDATE users SET username=?, password=?, name=?, age=?, avatar=?, groupId=?, custom_restrictions=? WHERE id=?`,
            [username, password, name, age, avatar, groupId, custom_restrictions, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM users WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (user) {
            // Update last active
            await db.run('UPDATE users SET lastActive = ? WHERE id = ?', [new Date().toISOString(), user.id]);
            res.json({ success: true, user });
        } else {
            res.status(401).json({ error: 'Username or password incorrect' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/admin/groups', authenticateAdmin, async (req, res) => {
    try {
        const groups = await db.all('SELECT * FROM age_groups');
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/admin/groups', authenticateAdmin, async (req, res) => {
    try {
        const { name, min_age, max_age, blocked_genres, blocked_titles } = req.body;
        const id = 'group_' + Date.now();
        const createdAt = new Date().toISOString();
        await db.run(`INSERT INTO age_groups (id, name, min_age, max_age, blocked_genres, blocked_titles, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, name, min_age, max_age, blocked_genres, blocked_titles, createdAt]);
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.put('/api/admin/groups/:id', authenticateAdmin, async (req, res) => {
    try {
        const { name, min_age, max_age, blocked_genres, blocked_titles } = req.body;
        await db.run(`UPDATE age_groups SET name=?, min_age=?, max_age=?, blocked_genres=?, blocked_titles=? WHERE id=?`,
            [name, min_age, max_age, blocked_genres, blocked_titles, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.delete('/api/admin/groups/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM age_groups WHERE id=?', [req.params.id]);
        await db.run('UPDATE users SET groupId = NULL WHERE groupId=?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ==================== USERS & GROUPS API ====================
// جلب جميع المستخدمين (للوحة التحكم)
app.get('/api/users', authenticateAdmin, async (req, res) => {
    try {
        const users = await db.all('SELECT * FROM users ORDER BY createdAt DESC');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// جلب جميع المجموعات (للوحة التحكم)
app.get('/api/groups', authenticateAdmin, async (req, res) => {
    try {
        const groups = await db.all('SELECT * FROM age_groups ORDER BY min_age ASC');
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const users = await db.all('SELECT * FROM users ORDER BY createdAt DESC');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const { username, password, name, age, avatar, groupId, custom_restrictions } = req.body;
        const id = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const createdAt = new Date().toISOString();
        await db.run(`INSERT INTO users (id, username, password, name, age, avatar, groupId, custom_restrictions, createdAt, lastActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, username, password, name || username, age || 0, avatar || '/uploads/users/default.png', groupId || null, custom_restrictions || '{"titles":[],"genres":[]}', createdAt, createdAt]);
        res.json({ success: true, id, user: { id, username, name, age, groupId } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.put('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
        const { username, password, name, age, avatar, groupId, custom_restrictions } = req.body;
        await db.run(`UPDATE users SET username=?, password=?, name=?, age=?, avatar=?, groupId=?, custom_restrictions=? WHERE id=?`,
            [username, password, name || username, age || 0, avatar || '/uploads/users/default.png', groupId || null, custom_restrictions || '{"titles":[],"genres":[]}', req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.delete('/api/admin/users/:id', authenticateAdmin, async (req, res) => {
    try {
        // حذف الملفات الشخصية المرتبطة أولاً
        await db.run('DELETE FROM profiles WHERE userId = ?', [req.params.id]);
        await db.run('DELETE FROM users WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// جلب المجموعات (للوحة التحكم)
app.get('/api/admin/groups', authenticateAdmin, async (req, res) => {
    try {
        const groups = await db.all('SELECT * FROM age_groups ORDER BY min_age ASC');
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/groups', authenticateAdmin, async (req, res) => {
    try {
        const { name, min_age, max_age, blocked_genres, blocked_titles } = req.body;
        const id = 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const createdAt = new Date().toISOString();
        await db.run(`INSERT INTO age_groups (id, name, min_age, max_age, blocked_genres, blocked_titles, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, name, parseInt(min_age) || 0, parseInt(max_age) || 18, blocked_genres || '[]', blocked_titles || '[]', createdAt]);
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.put('/api/admin/groups/:id', authenticateAdmin, async (req, res) => {
    try {
        const { name, min_age, max_age, blocked_genres, blocked_titles } = req.body;
        await db.run(`UPDATE age_groups SET name=?, min_age=?, max_age=?, blocked_genres=?, blocked_titles=? WHERE id=?`,
            [name, parseInt(min_age) || 0, parseInt(max_age) || 18, blocked_genres || '[]', blocked_titles || '[]', req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.delete('/api/admin/groups/:id', authenticateAdmin, async (req, res) => {
    try {
        // تحديث المستخدمين الذين ينتمون لهذه المجموعة
        await db.run('UPDATE users SET groupId = NULL WHERE groupId=?', [req.params.id]);
        await db.run('DELETE FROM age_groups WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// جلب ملفات المستخدمين الشخصية
app.get('/api/users/:userId/profiles', authenticateAdmin, async (req, res) => {
    try {
        const profiles = await db.all('SELECT * FROM profiles WHERE userId = ?', [req.params.userId]);
        res.json(profiles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// إنشاء ملف شخصي جديد
app.post('/api/profiles', authenticateAdmin, async (req, res) => {
    try {
        const { userId, name, avatar, ageLimit, restrictions } = req.body;
        const id = 'profile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const createdAt = new Date().toISOString();
        await db.run(`INSERT INTO profiles (id, userId, name, avatar, ageLimit, restrictions, isDefault, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, name, avatar || '/uploads/avatars/default.png', ageLimit || 0, JSON.stringify(restrictions || []), 0, createdAt]);
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// تحديث ملف شخصي
app.put('/api/profiles/:id', authenticateAdmin, async (req, res) => {
    try {
        const { name, avatar, ageLimit, restrictions } = req.body;
        await db.run(`UPDATE profiles SET name=?, avatar=?, ageLimit=?, restrictions=? WHERE id=?`,
            [name, avatar, ageLimit || 0, JSON.stringify(restrictions || []), req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// حذف ملف شخصي
app.delete('/api/profiles/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.run('DELETE FROM profiles WHERE id=?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// جلب سجل المشاهدات لمستخدم
app.get('/api/history/:userId', authenticateAdmin, async (req, res) => {
    try {
        const history = await db.all('SELECT * FROM watch_history WHERE userId = ? ORDER BY watchedAt DESC LIMIT 100', [req.params.userId]);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/history/:userId', async (req, res) => {
    try {
        const history = await db.all('SELECT * FROM watch_history WHERE userId = ? ORDER BY watchedAt DESC', [req.params.userId]);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/history', async (req, res) => {
    try {
        const { userId, contentId, contentType, progress } = req.body;
        if (!userId || !contentId) return res.status(400).json({error: 'userId and contentId required'});
        const id = 'hist_' + Date.now();
        const watchedAt = new Date().toISOString();
        await db.run(`INSERT INTO watch_history (id, userId, contentId, contentType, watchedAt, progress) VALUES (?, ?, ?, ?, ?, ?)`,
            [id, userId, contentId, contentType, watchedAt, progress || 0]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Helper for Content Filtering
async function filterContentForUser(contentArray, userId) {
    if (!userId) return contentArray;
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) return contentArray;
    let blockedGenres = [];
    let blockedTitles = [];
    
    // Custom restrictions
    try {
        const custom = JSON.parse(user.custom_restrictions || '{"titles":[],"genres":[]}');
        blockedGenres.push(...(custom.genres || []));
        blockedTitles.push(...(custom.titles || []));
    } catch(e){}
    // Group restrictions
    if (user.groupId) {
        const group = await db.get('SELECT * FROM age_groups WHERE id = ?', [user.groupId]);
        if (group) {
            try {
                blockedGenres.push(...JSON.parse(group.blocked_genres || '[]'));
                blockedTitles.push(...JSON.parse(group.blocked_titles || '[]'));
            } catch(e){}
        }
    }
    return contentArray.filter(item => {
        // Filter by title
        if (blockedTitles.includes(item.title)) return false;
        
        // Filter by genre
        let itemGenres = [];
        try { itemGenres = typeof item.genres === 'string' ? JSON.parse(item.genres) : item.genres; } catch(e){}
        if (itemGenres && itemGenres.some(g => blockedGenres.includes(g))) return false;
        // Filter by Age
        // Try mapping TMDB age ratings to minimum age required
        const ratingMap = { 'G': 0, 'PG': 8, 'PG-13': 13, 'R': 17, 'NC-17': 18, 'TV-Y': 0, 'TV-Y7': 7, 'TV-G': 0, 'TV-PG': 8, 'TV-14': 14, 'TV-MA': 18 };
        const reqAge = ratingMap[item.ageRating] || 0;
        if (user.age < reqAge) return false;
        return true;
    });
}
// 404 & Error Handlers
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'حدث خطأ في الخادم', message: err.message });


});

(async () => {
    try {
        // التأكد من وجود مشرف
        const adminCheck = await db.get('SELECT * FROM admins WHERE username = ?', ['admin']);
        if (!adminCheck) {
            await db.run(`INSERT INTO admins (id, username, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
                ['admin_1', 'admin', 'admin123', 'مدير النظام', 'super_admin', new Date().toISOString()]);
            console.log('✅ تم إنشاء مشرف: admin / admin123');
        }
        
        // التأكد من وجود بعض الفئات العمرية
        const groupsCheck = await db.get('SELECT * FROM age_groups LIMIT 1');
        if (!groupsCheck) {
            await db.run(`INSERT INTO age_groups (id, name, min_age, max_age, blocked_genres, blocked_titles, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['group_1', 'أطفال', 0, 12, '[]', '[]', new Date().toISOString()]);
            await db.run(`INSERT INTO age_groups (id, name, min_age, max_age, blocked_genres, blocked_titles, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['group_2', 'مراهقين', 13, 17, '[]', '[]', new Date().toISOString()]);
            await db.run(`INSERT INTO age_groups (id, name, min_age, max_age, blocked_genres, blocked_titles, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                ['group_3', 'بالغين', 18, 100, '[]', '[]', new Date().toISOString()]);
            console.log('✅ تم إنشاء فئات عمرية تجريبية');
        }
        
        // التأكد من وجود مستخدم تجريبي
        const userCheck = await db.get('SELECT * FROM users LIMIT 1');
        if (!userCheck) {
            await db.run(`INSERT INTO users (id, username, password, name, age, avatar, createdAt, lastActive) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                ['user_1', 'test', '123', 'مستخدم تجريبي', 25, '/uploads/avatars/default.png', new Date().toISOString(), new Date().toISOString()]);
            console.log('✅ تم إنشاء مستخدم تجريبي: test / 123');
        }
    } catch (error) {
        console.error('خطأ في إضافة البيانات:', error);
    }
})();
// بدء السيرفر
app.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
    console.log(`http://localhost:${PORT}/admin`);
    console.log(`http://localhost:${PORT}/srt`);
});