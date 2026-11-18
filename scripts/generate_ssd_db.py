import sqlite3
import os
import math
import random

os.makedirs("data", exist_ok=True)
DB_PATH = os.path.join("data", "ssd_benchmark.db")
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.executescript("""
CREATE TABLE ssd_models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    interface TEXT NOT NULL,
    capacity_tb REAL NOT NULL,
    controller TEXT NOT NULL,
    nand_type TEXT NOT NULL
);

CREATE TABLE firmware_versions (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    release_date TEXT NOT NULL,
    channel TEXT NOT NULL,
    power_profile TEXT NOT NULL,
    notes TEXT NOT NULL
);

CREATE TABLE test_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    block_size TEXT NOT NULL,
    queue_depth INTEGER NOT NULL,
    rw_mix TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE benchmark_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id TEXT NOT NULL,
    firmware_id TEXT NOT NULL,
    test_id TEXT NOT NULL,
    throughput_mbps REAL NOT NULL,
    iops INTEGER NOT NULL,
    latency_avg_us REAL NOT NULL,
    latency_p99_us REAL NOT NULL,
    latency_p999_us REAL NOT NULL,
    power_avg_w REAL NOT NULL,
    power_peak_w REAL NOT NULL,
    efficiency_mbps_per_w REAL NOT NULL,
    efficiency_kiops_per_w REAL NOT NULL,
    temp_controller_c REAL NOT NULL,
    temp_nand_c REAL NOT NULL,
    throttle_events INTEGER NOT NULL,
    pass_status TEXT NOT NULL,
    FOREIGN KEY(model_id) REFERENCES ssd_models(id),
    FOREIGN KEY(firmware_id) REFERENCES firmware_versions(id),
    FOREIGN KEY(test_id) REFERENCES test_items(id)
);

CREATE TABLE power_telemetry_timeseries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id TEXT NOT NULL,
    firmware_id TEXT NOT NULL,
    test_id TEXT NOT NULL,
    elapsed_sec INTEGER NOT NULL,
    throughput_mbps REAL NOT NULL,
    power_w REAL NOT NULL,
    temp_c REAL NOT NULL,
    latency_p99_us REAL NOT NULL
);

CREATE TABLE regression_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firmware_id TEXT NOT NULL,
    test_id TEXT NOT NULL,
    severity TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    delta_metric TEXT NOT NULL
);
""")

models = [
    ("x900-2tb", "NovaX900 Pro 2TB", "PCIe 5.0 x4 NVMe 2.0", 2.0, "Phison E26-Max", "232L TLC NAND"),
    ("x900-4tb", "NovaX900 Pro 4TB", "PCIe 5.0 x4 NVMe 2.0", 4.0, "Phison E26-Max", "232L TLC NAND"),
    ("dc7000-7tb", "Enterprise DC7000 7.68TB", "PCIe 5.0 x4 Dual-Port", 7.68, "Titan-8C Enterprise", "232L eTLC NAND"),
]
cur.executemany("INSERT INTO ssd_models VALUES (?, ?, ?, ?, ?, ?)", models)

firmwares = [
    ("fw-104", "FW 1.0.4-GA", "2025-11-10", "GA", "Balanced", "Initial mass-production baseline firmware"),
    ("fw-120", "FW 1.2.0-OPT", "2026-01-18", "GA", "Performance", "Aggressive SLC cache & FTL prefetch tuning"),
    ("fw-142", "FW 1.4.2-PWR", "2026-04-05", "GA", "Eco-ASPM", "ASPM L1.2 & dynamic clock gating for low idle/active power"),
    ("fw-160", "FW 1.6.0-RC1", "2026-06-22", "RC", "Balanced+", "Reduced P99.9 tail latency under mixed OLTP load"),
    ("fw-200", "FW 2.0.0-PRO", "2026-09-02", "GA", "Adaptive", "ML-assisted thermal & NAND wear-leveling scheduler"),
    ("fw-213", "FW 2.1.3-NEXT", "2026-11-12", "Beta", "Ultra-Eff", "Next-gen LDPC ECC + dynamic voltage frequency scaling"),
]
cur.executemany("INSERT INTO firmware_versions VALUES (?, ?, ?, ?, ?, ?)", firmwares)

test_items = [
    ("SEQ_128K_Q32_R", "Seq 128K Q32 Read", "Sequential", "128KB", 32, "100% Read", "Peak sequential read bandwidth"),
    ("SEQ_128K_Q32_W", "Seq 128K Q32 Write", "Sequential", "128KB", 32, "100% Write", "Peak sequential write bandwidth"),
    ("RAND_4K_Q1T1_R", "Rand 4K Q1T1 Read", "Random", "4KB", 1, "100% Read", "Single-queue random read latency"),
    ("RAND_4K_Q64T8_R", "Rand 4K Q64T8 Read", "Random", "4KB", 64, "100% Read", "Peak random read IOPS saturation"),
    ("RAND_4K_Q64T8_W", "Rand 4K Q64T8 Write", "Random", "4KB", 64, "100% Write", "Steady-state random write IOPS"),
    ("MIXED_70R_30W", "Mixed 70R/30W 4K", "Mixed OLTP", "4KB", 32, "70R / 30W", "Database OLTP mixed workload"),
    ("SLC_EXHAUST_W", "Sustained SLC Exhaust", "Endurance", "128KB", 16, "100% Write", "Post-SLC cache direct-to-TLC steady write"),
    ("THERMAL_75C", "Thermal Chamber 75°C", "Thermal", "64KB", 32, "50R / 50W", "Sustained load in 75°C ambient chamber"),
    ("IDLE_PS3_WAKE", "PS3/PS4 Deep Sleep", "Power State", "4KB", 1, "Idle -> Read", "Low-power state draw & wake-up latency"),
    ("ZNS_APPEND", "Multi-Stream Append", "Enterprise", "64KB", 16, "100% Write", "Deterministic stream write efficiency"),
]
cur.executemany("INSERT INTO test_items VALUES (?, ?, ?, ?, ?, ?, ?)", test_items)

# Base profiles per test item: (base_mbps, base_iops, base_lat_us, base_power_w, base_temp_c)
BASE_TEST = {
    "SEQ_128K_Q32_R": (13800, 108000, 290, 8.8, 62),
    "SEQ_128K_Q32_W": (11900, 93000, 340, 9.6, 66),
    "RAND_4K_Q1T1_R": (390, 99800, 58, 4.1, 46),
    "RAND_4K_Q64T8_R": (7200, 1840000, 275, 9.4, 65),
    "RAND_4K_Q64T8_W": (5900, 1510000, 330, 9.9, 68),
    "MIXED_70R_30W": (5100, 1305000, 245, 9.1, 64),
    "SLC_EXHAUST_W": (4200, 32800, 980, 10.4, 73),
    "THERMAL_75C": (6800, 106000, 410, 8.9, 79),
    "IDLE_PS3_WAKE": (120, 30700, 185, 0.45, 36),
    "ZNS_APPEND": (8900, 139000, 220, 8.2, 60),
}

# Firmware multipliers: (perf_mult, lat_mult, power_mult, temp_offset)
FW_PROFILE = {
    "fw-104": (0.92, 1.15, 1.08, +3.5),
    "fw-120": (1.03, 0.98, 1.12, +4.2),
    "fw-142": (0.96, 1.04, 0.84, -3.1),
    "fw-160": (1.01, 0.89, 0.97, -0.8),
    "fw-200": (1.06, 0.84, 0.91, -2.4),
    "fw-213": (1.10, 0.78, 0.82, -4.0),
}

MODEL_MULT = {
    "x900-2tb": (1.00, 1.00, 0.96),
    "x900-4tb": (1.04, 0.97, 1.03),
    "dc7000-7tb": (0.97, 0.92, 1.14),
}

random.seed(42)

for m_id, *_ in models:
    m_perf, m_lat, m_pwr = MODEL_MULT[m_id]
    for fw_id, *_ in firmwares:
        f_perf, f_lat, f_pwr, f_temp = FW_PROFILE[fw_id]
        for t_id, *_ in test_items:
            b_mbps, b_iops, b_lat, b_pwr, b_temp = BASE_TEST[t_id]
            jitter = lambda s=0.025: 1.0 + random.uniform(-s, s)

            mbps = round(b_mbps * m_perf * f_perf * jitter(), 1)
            iops = int(b_iops * m_perf * f_perf * jitter())
            lat_avg = round(b_lat * m_lat * f_lat * jitter(0.03), 1)
            lat_p99 = round(lat_avg * random.uniform(1.65, 2.25), 1)
            lat_p999 = round(lat_p99 * random.uniform(1.45, 2.15), 1)

            pwr_avg = round(b_pwr * m_pwr * f_pwr * jitter(0.02), 2)
            pwr_peak = round(pwr_avg * random.uniform(1.12, 1.28), 2)

            eff_mbps_w = round(mbps / max(0.1, pwr_avg), 1)
            eff_kiops_w = round((iops / 1000.0) / max(0.1, pwr_avg), 1)

            temp_ctrl = round(b_temp + f_temp + random.uniform(-1.2, 1.5), 1)
            temp_nand = round(temp_ctrl - random.uniform(4.5, 8.5), 1)

            throttle = 0
            status = "PASS"
            if temp_ctrl >= 78.0:
                throttle = random.randint(2, 9)
                status = "WARN" if fw_id in ("fw-104", "fw-120") else "PASS"
            if fw_id == "fw-104" and t_id in ("SLC_EXHAUST_W", "THERMAL_75C"):
                status = "REGRESSION"
                throttle = random.randint(5, 14)

            cur.execute("""
                INSERT INTO benchmark_runs (
                    model_id, firmware_id, test_id,
                    throughput_mbps, iops, latency_avg_us, latency_p99_us, latency_p999_us,
                    power_avg_w, power_peak_w, efficiency_mbps_per_w, efficiency_kiops_per_w,
                    temp_controller_c, temp_nand_c, throttle_events, pass_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                m_id, fw_id, t_id,
                mbps, iops, lat_avg, lat_p99, lat_p999,
                pwr_avg, pwr_peak, eff_mbps_w, eff_kiops_w,
                temp_ctrl, temp_nand, throttle, status
            ))

# Generate 300-second timeseries (16 points: 0s, 20s, ..., 300s) for all firmware x key tests on x900-2tb & x900-4tb
key_tests = ["SEQ_128K_Q32_R", "RAND_4K_Q64T8_R", "MIXED_70R_30W", "SLC_EXHAUST_W", "THERMAL_75C"]
for m_id in ("x900-2tb", "x900-4tb", "dc7000-7tb"):
    m_perf, m_lat, m_pwr = MODEL_MULT[m_id]
    for fw_id, *_ in firmwares:
        f_perf, f_lat, f_pwr, f_temp = FW_PROFILE[fw_id]
        for t_id in key_tests:
            b_mbps, _, b_lat, b_pwr, b_temp = BASE_TEST[t_id]
            for step in range(16):
                sec = step * 20
                # Simulate SLC cache drop after 140s on SLC_EXHAUST_W, or thermal ramp
                curve = 1.0
                if t_id == "SLC_EXHAUST_W" and sec >= 140:
                    curve = 0.52 + 0.08 * math.sin(step)
                elif t_id == "THERMAL_75C" and sec >= 180 and fw_id in ("fw-104", "fw-120"):
                    curve = 0.78

                tp = round(b_mbps * m_perf * f_perf * curve * (1 + random.uniform(-0.02, 0.02)), 1)
                pw = round(b_pwr * m_pwr * f_pwr * (0.85 + 0.15 * min(1, sec / 60)) * (0.9 if curve < 0.8 else 1.0) * (1 + random.uniform(-0.02, 0.02)), 2)
                tc = round(42 + (b_temp + f_temp - 42) * (1 - math.exp(-sec / 95.0)) + random.uniform(-0.6, 0.6), 1)
                lp99 = round(b_lat * m_lat * f_lat * 1.85 * (1.25 if curve < 0.8 else 1.0) * (1 + random.uniform(-0.03, 0.03)), 1)

                cur.execute("""
                    INSERT INTO power_telemetry_timeseries (
                        model_id, firmware_id, test_id, elapsed_sec,
                        throughput_mbps, power_w, temp_c, latency_p99_us
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (m_id, fw_id, t_id, sec, tp, pw, tc, lp99))

alerts = [
    ("fw-213", "RAND_4K_Q1T1_R", "improvement", "DVFS Low-QD Latency Breakthrough", "FW 2.1.3-NEXT reduced 4K Q1T1 P99 latency by 22.4% while cutting active draw to 3.3W.", "-22.4% P99"),
    ("fw-213", "SEQ_128K_Q32_R", "improvement", "Peak Gen5 Efficiency Milestone", "Achieved 1,980 MB/s per Watt on 128K Sequential Read via dynamic LDPC scaling.", "+31.2% MB/s/W"),
    ("fw-142", "IDLE_PS3_WAKE", "improvement", "ASPM L1.2 Deep Sleep Optimization", "Idle PS4 power dropped to 0.36W with deterministic <150µs wake-up latency.", "-18.9% Idle W"),
    ("fw-120", "THERMAL_75C", "warning", "Thermal Throttle Triggered @ 75°C", "Aggressive prefetch on FW 1.2.0-OPT caused 6 thermal throttle events after 180s.", "+4.2°C Peak"),
    ("fw-104", "SLC_EXHAUST_W", "critical", "Post-SLC Steady-State Tail Latency Spike", "Baseline FW 1.0.4-GA exhibited P99.9 > 3,800µs during direct-to-TLC folding.", "14 Throttles"),
]
cur.executemany("""
    INSERT INTO regression_alerts (firmware_id, test_id, severity, title, detail, delta_metric)
    VALUES (?, ?, ?, ?, ?, ?)
""", alerts)

conn.commit()

# Print summary counts
for tbl in ("ssd_models", "firmware_versions", "test_items", "benchmark_runs", "power_telemetry_timeseries", "regression_alerts"):
    cnt = cur.execute(f"SELECT COUNT(*) FROM {tbl}").fetchone()[0]
    print(f"{tbl}: {cnt} rows")

conn.close()
print(f"SQLite database created at: {DB_PATH}")
