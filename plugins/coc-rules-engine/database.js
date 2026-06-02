// plugins/coc-rules-engine/database.js
// SQLite character persistence for CoC Rules Engine

let Database;
try {
    Database = require('better-sqlite3');
} catch {
    try {
        // Try project node_modules (primary development location)
        const projModules = '/home/xhaoshen/projects/st-coc-platform/node_modules';
        Database = require(require.resolve('better-sqlite3', { paths: [projModules] }));
    } catch {
        throw new Error('better-sqlite3 not found. Install: npm install better-sqlite3');
    }
}

const path = require('path');
const fs = require('fs');

// Store DB in ST's data directory so it survives restarts
const DB_DIR = path.join(process.env.DATA_ROOT || path.join(__dirname, '..', '..', 'data'), 'coc');
const DB_PATH = path.join(DB_DIR, 'characters.db');

let db = null;

/**
 * Initialize the database connection and create tables if needed.
 */
function initDB() {
    if (db) return db;

    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // better concurrent read performance
    db.pragma('foreign_keys = ON');

    db.exec(`
        CREATE TABLE IF NOT EXISTS characters (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            era TEXT DEFAULT '1920s',
            occupation_code TEXT,
            occupation_name TEXT,
            age INTEGER,
            sex TEXT,
            residence TEXT,
            birthplace TEXT,
            -- Attributes
            str INTEGER DEFAULT 50, con INTEGER DEFAULT 50, siz INTEGER DEFAULT 50,
            dex INTEGER DEFAULT 50, app INTEGER DEFAULT 50, int_ INTEGER DEFAULT 50,
            pow INTEGER DEFAULT 50, edu INTEGER DEFAULT 50, luk INTEGER DEFAULT 50,
            -- Derived
            hp_max INTEGER, hp_current INTEGER,
            mp_max INTEGER, mp_current INTEGER,
            san_max INTEGER, san_current INTEGER, san_start INTEGER,
            db INTEGER DEFAULT 0, build INTEGER DEFAULT 0, mov INTEGER DEFAULT 7,
            -- Social
            credit_rating INTEGER,
            cash INTEGER DEFAULT 0,
            assets INTEGER DEFAULT 0,
            -- Background
            personal_description TEXT,
            ideology TEXT,
            significant_person TEXT,
            meaningful_location TEXT,
            treasured_possession TEXT,
            traits TEXT,
            injuries_scars TEXT,
            phobias_manias TEXT,
            background_story TEXT,
            -- Timestamps
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS character_skills (
            character_id TEXT NOT NULL,
            skill_name TEXT NOT NULL,
            base_value INTEGER DEFAULT 1,
            occupation_points INTEGER DEFAULT 0,
            interest_points INTEGER DEFAULT 0,
            growth_marks INTEGER DEFAULT 0,
            current_value INTEGER NOT NULL,
            PRIMARY KEY (character_id, skill_name),
            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS character_equipment (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            character_id TEXT NOT NULL,
            name TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            location TEXT DEFAULT 'carried',
            FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
        );
    `);

    return db;
}

/**
 * Create a new character record.
 */
function createCharacter(data) {
    const d = initDB();
    const id = data.id || `char_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const stmt = d.prepare(`
        INSERT INTO characters (id, name, era, occupation_code, occupation_name,
            str, con, siz, dex, app, int_, pow, edu, luk,
            hp_max, hp_current, mp_max, mp_current, san_max, san_current, san_start,
            db, build, mov, credit_rating, cash, assets,
            personal_description, ideology, significant_person, meaningful_location,
            treasured_possession, traits, injuries_scars, phobias_manias, background_story)
        VALUES (@id, @name, @era, @occupation_code, @occupation_name,
            @str, @con, @siz, @dex, @app, @int_, @pow, @edu, @luk,
            @hp_max, @hp_current, @mp_max, @mp_current, @san_max, @san_current, @san_start,
            @db, @build, @mov, @credit_rating, @cash, @assets,
            @personal_description, @ideology, @significant_person, @meaningful_location,
            @treasured_possession, @traits, @injuries_scars, @phobias_manias, @background_story)
    `);

    const defaults = {
        era: '1920s', occupation_code: null, occupation_name: null,
        str: 50, con: 50, siz: 50, dex: 50, app: 50,
        int_: 50, pow: 50, edu: 50, luk: 50,
        hp_max: 10, hp_current: 10, mp_max: 10, mp_current: 10,
        san_max: 99, san_current: 50, san_start: 50,
        db: 0, build: 0, mov: 7, credit_rating: null, cash: 0, assets: 0,
        personal_description: null, ideology: null,
        significant_person: null, meaningful_location: null,
        treasured_possession: null, traits: null,
        injuries_scars: null, phobias_manias: null, background_story: null,
        age: null, sex: null, residence: null, birthplace: null
    };

    const char = { id, ...defaults, ...data };
    stmt.run(char);
    return { id, ...char };
}

/**
 * Get a character by ID.
 */
function getCharacter(id) {
    const d = initDB();
    const char = d.prepare('SELECT * FROM characters WHERE id = ?').get(id);
    if (!char) return null;

    const skills = d.prepare('SELECT * FROM character_skills WHERE character_id = ?').all(id);
    const equipment = d.prepare('SELECT * FROM character_equipment WHERE character_id = ?').all(id);

    return { ...char, skills, equipment };
}

/**
 * Update SAN value for a character.
 */
function updateSAN(characterId, newSAN) {
    const d = initDB();
    d.prepare(`UPDATE characters SET san_current = ?, updated_at = datetime('now') WHERE id = ?`)
        .run(Math.max(0, newSAN), characterId);
    return getCharacter(characterId);
}

/**
 * Update HP value for a character.
 */
function updateHP(characterId, newHP, newMaxHP = null) {
    const d = initDB();
    if (newMaxHP !== null) {
        d.prepare(`UPDATE characters SET hp_current = ?, hp_max = ?, updated_at = datetime('now') WHERE id = ?`)
            .run(Math.max(0, newHP), newMaxHP, characterId);
    } else {
        d.prepare(`UPDATE characters SET hp_current = ?, updated_at = datetime('now') WHERE id = ?`)
            .run(Math.max(0, newHP), characterId);
    }
    return getCharacter(characterId);
}

/**
 * Update a skill's growth mark (.en) and optional new value.
 */
function markSkillGrowth(characterId, skillName) {
    const d = initDB();
    d.prepare(`UPDATE character_skills SET growth_marks = growth_marks + 1
        WHERE character_id = ? AND skill_name = ?`).run(characterId, skillName);
    return getCharacter(characterId);
}

/**
 * Set all skills for a character (used during character creation).
 */
function setSkills(characterId, skills) {
    const d = initDB();
    const insert = d.prepare(`INSERT OR REPLACE INTO character_skills
        (character_id, skill_name, base_value, occupation_points, interest_points, growth_marks, current_value)
        VALUES (?, ?, ?, ?, ?, ?, ?)`);

    const transaction = d.transaction((skills) => {
        for (const skill of skills) {
            insert.run(
                characterId,
                skill.name,
                skill.base || 1,
                skill.occupation || 0,
                skill.interest || 0,
                skill.growth_marks || 0,
                skill.value
            );
        }
    });

    transaction(skills);
    return getCharacter(characterId);
}

module.exports = { initDB, createCharacter, getCharacter, updateSAN, updateHP, markSkillGrowth, setSkills };
