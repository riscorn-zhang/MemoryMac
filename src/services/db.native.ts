// Native (iOS/Android): expo-sqlite
// Metro resolves this instead of db.ts on native platforms
import * as SQLite from 'expo-sqlite';

export interface KnowledgePoint {
    id: number;
    name: string;
    s: number;
    last: string;
}

// ========== 时间偏移 ==========
let timeOffset = 0;

export function getTimeOffset(): number {
    return timeOffset;
}

export function setTimeOffset(days: number): void {
    timeOffset = days;
}

export function today(): string {
    const now = new Date();
    if (timeOffset !== 0) {
        now.setDate(now.getDate() + timeOffset);
    }
    return now.toISOString().split('T')[0];
}

// ========== 掌握度计算 ==========
export function calcMastery(s: number, last: string): number {
    const lastDate = new Date(last);
    const todayDate = new Date(today());
    const days = Math.floor(
        (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 0) return 100;
    return 100 * Math.exp(-days / s);
}

// ========== SQLite CRUD ==========
let db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!db) {
        db = await SQLite.openDatabaseAsync('memory.db');
        await db.execAsync(
            `CREATE TABLE IF NOT EXISTS k (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        s REAL DEFAULT 1.0,
        last TEXT NOT NULL
      )`
        );
    }
    return db;
}

export async function addKnowledgePoint(name: string): Promise<void> {
    const database = await getDb();
    await database.runAsync(
        'INSERT INTO k (name, s, last) VALUES (?, 1.0, ?)',
        name,
        today()
    );
}

export async function reviewKnowledgePoint(
    id: number,
    score: number
): Promise<{ oldS: number; newS: number }> {
    const database = await getDb();
    const row = await database.getFirstAsync<{ s: number }>(
        'SELECT s FROM k WHERE id = ?',
        id
    );
    if (!row) throw new Error(`知识点 ${id} 不存在`);
    const oldS = row.s;
    const newS = Math.max(0.5, Math.min(365, (oldS * score) / 50));
    await database.runAsync(
        'UPDATE k SET s = ?, last = ? WHERE id = ?',
        newS,
        today(),
        id
    );
    return { oldS, newS };
}

export async function getAll(): Promise<KnowledgePoint[]> {
    const database = await getDb();
    return database.getAllAsync<KnowledgePoint>(
        'SELECT id, name, s, last FROM k ORDER BY id'
    );
}

export async function getDue(
    threshold: number = 40
): Promise<(KnowledgePoint & { mastery: number })[]> {
    const all = await getAll();
    return all
        .map((kp) => ({ ...kp, mastery: calcMastery(kp.s, kp.last) }))
        .filter((kp) => kp.mastery < threshold)
        .sort((a, b) => a.mastery - b.mastery);
}

export async function deleteKnowledgePoint(id: number): Promise<void> {
    const database = await getDb();
    await database.runAsync('DELETE FROM k WHERE id = ?', id);
}