import sqlite3
import os
import time

os.makedirs("data", exist_ok=True)
DB_PATH = os.path.join("data", "ssd_150mb_sim.db")
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

t0 = time.time()
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# High-throughput WAL ingestion settings
cur.executescript("""
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA cache_size = -64000;

CREATE TABLE raw_io_traces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id TEXT NOT NULL,
    firmware_id TEXT NOT NULL,
    test_id TEXT NOT NULL,
    ts_ms INTEGER NOT NULL,
    lba INTEGER NOT NULL,
    io_size_kb INTEGER NOT NULL,
    is_write INTEGER NOT NULL,
    latency_us REAL NOT NULL,
    power_mw INTEGER NOT NULL,
    temp_c REAL NOT NULL,
    payload_note TEXT NOT NULL
);
""")

models = ("x900-2tb", "x900-4tb", "dc7000-7tb")
fws = ("fw-104", "fw-120", "fw-142", "fw-160", "fw-200", "fw-213")
tests = ("SEQ_128K_Q32_R", "RAND_4K_Q64T8_R", "MIXED_70R_30W", "SLC_EXHAUST_W", "THERMAL_75C")

# Target ~150 MB: ~1.35M rows of ~110 bytes each
BATCH_SIZE = 50_000
TOTAL_ROWS = 1_350_000

conn.execute("BEGIN")
for batch_start in range(0, TOTAL_ROWS, BATCH_SIZE):
    rows = []
    for i in range(batch_start, min(batch_start + BATCH_SIZE, TOTAL_ROWS)):
        m = models[i % 3]
        f = fws[(i // 3) % 6]
        t = tests[(i // 18) % 5]
        rows.append((
            m, f, t,
            1763470000000 + i * 2,
            (i * 4096) % 1000000000,
            128 if (i % 2 == 0) else 4,
            i % 3 == 0,
            round(45.0 + (i % 400) * 0.45, 1),
            4200 + (i % 5800),
            round(44.0 + (i % 350) * 0.1, 1),
            f"nvme_io_trace_block_{i % 997}_ch{i % 8}_die{i % 16}"
        ))
    cur.executemany("""
        INSERT INTO raw_io_traces (
            model_id, firmware_id, test_id, ts_ms, lba, io_size_kb,
            is_write, latency_us, power_mw, temp_c, payload_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)
conn.commit()

# Build covering index for sub-millisecond filtered/paginated queries
cur.execute("CREATE INDEX idx_traces_mft ON raw_io_traces(model_id, firmware_id, test_id, ts_ms DESC)")
cur.execute("PRAGMA wal_checkpoint(TRUNCATE)")
conn.commit()

# Benchmark an indexed query
q0 = time.time()
sample = cur.execute("""
    SELECT COUNT(*), AVG(latency_us), AVG(power_mw)
    FROM raw_io_traces
    WHERE model_id = 'x900-2tb' AND firmware_id = 'fw-213' AND test_id = 'SEQ_128K_Q32_R'
""").fetchone()
q_ms = (time.time() - q0) * 1000

conn.close()
size_mb = os.path.getsize(DB_PATH) / (1024 * 1024)
print(f"Generated {TOTAL_ROWS:,} rows in {time.time() - t0:.2f}s")
print(f"Database size: {size_mb:.2f} MB ({DB_PATH})")
print(f"Indexed aggregation query result: {sample} in {q_ms:.2f} ms")
