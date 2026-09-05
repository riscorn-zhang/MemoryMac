// 共享类型和纯函数 + Web 默认实现（in-memory）
// Native 端由 db.native.ts 覆盖（expo-sqlite）

export interface KnowledgePoint {
    id: number;
    name: string;
    s: number;
    last: string;
    archived: boolean;
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

// ========== Web: In-memory CRUD ==========
let store: KnowledgePoint[] = [];
let nextId = 1;

export async function addKnowledgePoint(name: string): Promise<void> {
    store.push({ id: nextId++, name, s: 1.0, last: today(), archived: false });
}

export async function reviewKnowledgePoint(
    id: number,
    score: number
): Promise<{ oldS: number; newS: number }> {
    const kp = store.find((k) => k.id === id);
    if (!kp) throw new Error(`知识点 ${id} 不存在`);
    const oldS = kp.s;
    kp.s = Math.max(0.5, Math.min(365, (oldS * score) / 50));
    kp.last = today();
    return { oldS, newS: kp.s };
}

export async function getAll(): Promise<KnowledgePoint[]> {
    return [...store].sort((a, b) => a.id - b.id);
}

export async function getDue(
    threshold: number = 40
): Promise<(KnowledgePoint & { mastery: number })[]> {
    return store
        .filter((kp) => !kp.archived)
        .map((kp) => ({ ...kp, mastery: calcMastery(kp.s, kp.last) }))
        .filter((kp) => kp.mastery < threshold)
        .sort((a, b) => a.mastery - b.mastery);
}

export async function deleteKnowledgePoint(id: number): Promise<void> {
    store = store.filter((k) => k.id !== id);
}

export async function updateKnowledgePointName(id: number, name: string): Promise<void> {
    const kp = store.find((k) => k.id === id);
    if (!kp) throw new Error(`知识点 ${id} 不存在`);
    kp.name = name;
}

export async function toggleArchiveKnowledgePoint(id: number): Promise<boolean> {
    const kp = store.find((k) => k.id === id);
    if (!kp) throw new Error(`知识点 ${id} 不存在`);
    kp.archived = !kp.archived;
    return kp.archived;
}