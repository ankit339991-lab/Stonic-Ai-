import initSqlJs, { Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export interface MemoryRecord {
  id: number;
  category: string;
  key: string;
  value: string;
  importance: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  goal: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'paused';
  stepsJson: string;
  resultSummary?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TaskLogRecord {
  id?: number;
  taskId: string;
  stepIndex: number;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: string;
}

export interface FrequentAppRecord {
  id: number;
  appName: string;
  path: string;
  launchCount: number;
  lastLaunched: string;
}

export interface NoteRecord {
  id: number;
  title: string;
  content: string;
  tags: string;
  createdAt: string;
}

export class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;
  private isInitialized = false;

  constructor() {
    let userDataDir: string;
    try {
      userDataDir = app.getPath('userData');
    } catch {
      userDataDir = path.join(process.cwd(), '.stonic_data');
    }

    if (!fs.existsSync(userDataDir)) {
      fs.mkdirSync(userDataDir, { recursive: true });
    }

    this.dbPath = path.join(userDataDir, 'stonic_memory.db');
  }

  async init(): Promise<void> {
    if (this.isInitialized && this.db) return;

    const SQL = await initSqlJs({
      locateFile: (file) => {
        const candidates = [
          path.join(__dirname, file),
          path.join(__dirname, '..', 'assets', file),
          path.join(process.cwd(), 'assets', file),
          path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) return c;
        }
        return path.join(__dirname, file);
      }
    });

    let buffer: Buffer | null = null;
    if (fs.existsSync(this.dbPath)) {
      try {
        buffer = fs.readFileSync(this.dbPath);
      } catch (e) {
        console.error('Failed reading existing sqlite db, creating new one', e);
      }
    }

    this.db = buffer ? new SQL.Database(buffer) : new SQL.Database();
    this.createTables();
    this.save();
    this.isInitialized = true;
  }

  private save(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    } catch (e) {
      console.error('Failed to persist database to disk', e);
    }
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        importance INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        goal TEXT NOT NULL,
        status TEXT NOT NULL,
        steps_json TEXT NOT NULL,
        result_summary TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS task_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        step_index INTEGER NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS frequent_apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        app_name TEXT NOT NULL UNIQUE,
        path TEXT NOT NULL,
        launch_count INTEGER DEFAULT 1,
        last_launched TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT DEFAULT '',
        created_at TEXT NOT NULL
      );
    `);

    // Seed default preferences if table is empty
    const check = this.db.exec("SELECT COUNT(*) as count FROM memories");
    if (check.length > 0 && check[0].values[0][0] === 0) {
      const now = new Date().toISOString();
      this.db.run(
        `INSERT INTO memories (category, key, value, importance, created_at, updated_at) VALUES 
        (?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?),
        (?, ?, ?, ?, ?, ?)`,
        [
          'preference', 'assistant_name', 'STONIC AI (JARVIS Mode)', 5, now, now,
          'preference', 'voice_tone', 'Futuristic, polite, concise, and highly intelligent', 4, now, now,
          'custom_instruction', 'always_confirm_deletion', 'Always ask user confirmation before deleting or overwriting any file', 5, now, now,
        ]
      );
    }
  }

  // --- MEMORIES ---
  async getMemories(category?: string): Promise<MemoryRecord[]> {
    await this.init();
    if (!this.db) return [];

    let query = "SELECT id, category, key, value, importance, created_at, updated_at FROM memories";
    const params: any[] = [];
    if (category) {
      query += " WHERE category = ?";
      params.push(category);
    }
    query += " ORDER BY importance DESC, updated_at DESC";

    const stmt = this.db.prepare(query);
    stmt.bind(params);

    const results: MemoryRecord[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      results.push({
        id: row[0] as number,
        category: row[1] as string,
        key: row[2] as string,
        value: row[3] as string,
        importance: row[4] as number,
        createdAt: row[5] as string,
        updatedAt: row[6] as string,
      });
    }
    stmt.free();
    return results;
  }

  async addMemory(category: string, key: string, value: string, importance: number = 1): Promise<number> {
    await this.init();
    if (!this.db) return -1;

    const now = new Date().toISOString();
    this.db.run(
      "INSERT INTO memories (category, key, value, importance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [category, key, value, importance, now, now]
    );
    this.save();

    const lastId = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;
    return lastId;
  }

  async updateMemory(id: number, key: string, value: string, importance: number): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    const now = new Date().toISOString();
    this.db.run(
      "UPDATE memories SET key = ?, value = ?, importance = ?, updated_at = ? WHERE id = ?",
      [key, value, importance, now, id]
    );
    this.save();
    return true;
  }

  async deleteMemory(id: number): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    this.db.run("DELETE FROM memories WHERE id = ?", [id]);
    this.save();
    return true;
  }

  // --- TASKS ---
  async saveTask(task: TaskRecord): Promise<void> {
    await this.init();
    if (!this.db) return;

    this.db.run(
      `INSERT OR REPLACE INTO tasks (id, title, goal, status, steps_json, result_summary, created_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id,
        task.title,
        task.goal,
        task.status,
        task.stepsJson,
        task.resultSummary || null,
        task.createdAt,
        task.completedAt || null
      ]
    );
    this.save();
  }

  async getTasks(limit: number = 20): Promise<TaskRecord[]> {
    await this.init();
    if (!this.db) return [];

    const stmt = this.db.prepare("SELECT id, title, goal, status, steps_json, result_summary, created_at, completed_at FROM tasks ORDER BY created_at DESC LIMIT ?");
    stmt.bind([limit]);

    const results: TaskRecord[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      results.push({
        id: row[0] as string,
        title: row[1] as string,
        goal: row[2] as string,
        status: row[3] as any,
        stepsJson: row[4] as string,
        resultSummary: (row[5] as string) || undefined,
        createdAt: row[6] as string,
        completedAt: (row[7] as string) || undefined,
      });
    }
    stmt.free();
    return results;
  }

  async addTaskLog(log: TaskLogRecord): Promise<void> {
    await this.init();
    if (!this.db) return;

    this.db.run(
      "INSERT INTO task_logs (task_id, step_index, level, message, timestamp) VALUES (?, ?, ?, ?, ?)",
      [log.taskId, log.stepIndex, log.level, log.message, log.timestamp]
    );
    this.save();
  }

  async getTaskLogs(taskId: string): Promise<TaskLogRecord[]> {
    await this.init();
    if (!this.db) return [];

    const stmt = this.db.prepare("SELECT id, task_id, step_index, level, message, timestamp FROM task_logs WHERE task_id = ? ORDER BY id ASC");
    stmt.bind([taskId]);

    const results: TaskLogRecord[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      results.push({
        id: row[0] as number,
        taskId: row[1] as string,
        stepIndex: row[2] as number,
        level: row[3] as any,
        message: row[4] as string,
        timestamp: row[5] as string,
      });
    }
    stmt.free();
    return results;
  }

  // --- NOTES ---
  async getNotes(): Promise<NoteRecord[]> {
    await this.init();
    if (!this.db) return [];

    const stmt = this.db.prepare("SELECT id, title, content, tags, created_at FROM notes ORDER BY id DESC");
    const results: NoteRecord[] = [];
    while (stmt.step()) {
      const row = stmt.get();
      results.push({
        id: row[0] as number,
        title: row[1] as string,
        content: row[2] as string,
        tags: row[3] as string,
        createdAt: row[4] as string,
      });
    }
    stmt.free();
    return results;
  }

  async addNote(title: string, content: string, tags: string = ''): Promise<number> {
    await this.init();
    if (!this.db) return -1;

    const now = new Date().toISOString();
    this.db.run("INSERT INTO notes (title, content, tags, created_at) VALUES (?, ?, ?, ?)", [title, content, tags, now]);
    this.save();
    return this.db.exec("SELECT last_insert_rowid()")[0].values[0][0] as number;
  }

  async deleteNote(id: number): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    this.db.run("DELETE FROM notes WHERE id = ?", [id]);
    this.save();
    return true;
  }

  // --- EXPORT / IMPORT ---
  async exportAllData(): Promise<string> {
    const memories = await this.getMemories();
    const tasks = await this.getTasks(100);
    const notes = await this.getNotes();

    return JSON.stringify({
      exportDate: new Date().toISOString(),
      memories,
      tasks,
      notes,
    }, null, 2);
  }
}
