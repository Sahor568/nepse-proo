import { DatabaseSync, type StatementSync } from 'node:sqlite';

/**
 * sqlite3-compatible callback driver backed by Node's built-in `node:sqlite`.
 * Lets the `sqlite` npm wrapper run without the native `sqlite3` module,
 * which avoids native-module build/load failures on shared hosting.
 */

type Cb = (err: Error | null, result?: unknown) => void;

function normalize(value: unknown): unknown {
  if (value === undefined) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof Date) return value.toISOString();
  return value;
}

function collectParams(params: unknown[]): any[] {
  if (params.length === 1 && Array.isArray(params[0])) {
    return (params[0] as unknown[]).map(normalize);
  }
  return params.map(normalize);
}

class NodeSqliteStatement {
  private stmt: StatementSync | null;

  constructor(stmt: StatementSync) {
    this.stmt = stmt;
  }

  bind(...params: unknown[]) {
    const cb = params.pop() as Cb;
    try {
      (this.stmt as StatementSync).run(...collectParams(params));
      cb(null);
    } catch (err) {
      cb(err as Error);
    }
  }

  reset(cb: () => void) {
    cb();
  }

  finalize(cb: Cb) {
    this.stmt = null;
    cb(null);
  }

  run(...params: unknown[]) {
    const cb = params.pop() as (this: { stmt: unknown; lastID: number; changes: number }, err: Error | null) => void;
    try {
      const info = (this.stmt as StatementSync).run(...collectParams(params));
      cb.call(
        { stmt: this.stmt, lastID: Number(info.lastInsertRowid), changes: Number(info.changes) },
        null
      );
    } catch (err) {
      cb.call({ stmt: this.stmt, lastID: 0, changes: 0 }, err as Error);
    }
  }

  get(...params: unknown[]) {
    const cb = params.pop() as (err: Error | null, row?: unknown) => void;
    try {
      const row = (this.stmt as StatementSync).get(...collectParams(params));
      cb(null, row);
    } catch (err) {
      cb(err as Error);
    }
  }

  all(...params: unknown[]) {
    const cb = params.pop() as (err: Error | null, rows?: unknown[]) => void;
    try {
      const rows = (this.stmt as StatementSync).all(...collectParams(params));
      cb(null, rows);
    } catch (err) {
      cb(err as Error);
    }
  }

  each(...params: unknown[]) {
    const completeCb = params.pop() as (err: Error | null, count?: number) => void;
    const rowCb = params.pop() as (err: Error | null, row?: unknown) => void;
    try {
      const rows = (this.stmt as StatementSync).all(...collectParams(params)) as unknown[];
      for (const row of rows) {
        rowCb(null, row);
      }
      completeCb(null, rows.length);
    } catch (err) {
      completeCb(err as Error);
    }
  }
}

export class NodeSqliteDriver {
  private db!: DatabaseSync;

  constructor(filename: string, modeOrCb: unknown, maybeCb?: Cb) {
    const cb = (typeof modeOrCb === 'function' ? modeOrCb : maybeCb) as Cb;
    try {
      this.db = new DatabaseSync(filename as string);
      this.db.exec('PRAGMA busy_timeout = 5000;');
      queueMicrotask(() => cb(null));
    } catch (err) {
      queueMicrotask(() => cb(err as Error));
    }
  }

  on(_event: string, _listener: (...args: unknown[]) => void) {
    /* no-op: verbose tracing not needed */
  }

  configure(_option: unknown, _value: unknown) {
    /* no-op */
  }

  run(sql: string, ...params: unknown[]) {
    const cb = params.pop() as (this: { stmt: unknown; lastID: number; changes: number }, err: Error | null) => void;
    try {
      const stmt = this.db.prepare(sql);
      const info = stmt.run(...collectParams(params));
      cb.call({ stmt, lastID: Number(info.lastInsertRowid), changes: Number(info.changes) }, null);
    } catch (err) {
      cb.call({ stmt: null, lastID: 0, changes: 0 }, err as Error);
    }
  }

  get(sql: string, ...params: unknown[]) {
    const cb = params.pop() as (err: Error | null, row?: unknown) => void;
    try {
      const stmt = this.db.prepare(sql);
      const row = stmt.get(...collectParams(params));
      cb(null, row);
    } catch (err) {
      cb(err as Error);
    }
  }

  all(sql: string, ...params: unknown[]) {
    const cb = params.pop() as (err: Error | null, rows?: unknown[]) => void;
    try {
      const stmt = this.db.prepare(sql);
      const rows = stmt.all(...collectParams(params));
      cb(null, rows);
    } catch (err) {
      cb(err as Error);
    }
  }

  each(sql: string, ...params: unknown[]) {
    const completeCb = params.pop() as (err: Error | null, count?: number) => void;
    const rowCb = params.pop() as (err: Error | null, row?: unknown) => void;
    try {
      const stmt = this.db.prepare(sql);
      const rows = stmt.all(...collectParams(params)) as unknown[];
      for (const row of rows) {
        rowCb(null, row);
      }
      completeCb(null, rows.length);
    } catch (err) {
      completeCb(err as Error);
    }
  }

  exec(sql: string, cb: Cb) {
    try {
      this.db.exec(sql);
      cb(null);
    } catch (err) {
      cb(err as Error);
    }
  }

  close(cb: Cb) {
    try {
      this.db.close();
      cb(null);
    } catch (err) {
      cb(err as Error);
    }
  }

  prepare(sql: string, ...params: unknown[]) {
    const cb = params.pop() as (err: Error | null, stmt?: unknown) => void;
    try {
      const stmt = this.db.prepare(sql);
      if (params.length > 0) {
        stmt.run(...collectParams(params));
      }
      cb(null, new NodeSqliteStatement(stmt));
    } catch (err) {
      cb(err as Error);
    }
  }
}
