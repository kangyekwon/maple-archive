"""Verify job_advancements data."""
import sqlite3
import sys

DB_PATH = "C:\\Users\\yekwon\\maple-archive\\data\\maple.db"

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Total count
cur.execute("SELECT COUNT(*) FROM job_advancements")
total = cur.fetchone()[0]
print(f"Total job_advancements: {total}")

# Distinct job classes covered
cur.execute("SELECT COUNT(DISTINCT job_class_id) FROM job_advancements")
classes = cur.fetchone()[0]
print(f"Distinct job classes: {classes}")

# Check all classes have 7 advancements
cur.execute("""
    SELECT jc.name, COUNT(DISTINCT ja.advancement_level) as levels
    FROM job_advancements ja
    JOIN job_classes jc ON ja.job_class_id = jc.id
    GROUP BY jc.name
    HAVING levels != 7
""")
issues = cur.fetchall()
if issues:
    print(f"Classes without 7 advancements: {issues}")
else:
    print("All 49 classes have exactly 7 advancement levels (0-6).")

# Hero path sample
cur.execute("""
    SELECT ja.advancement_level, ja.name, ja.name_ko, ja.level_required
    FROM job_advancements ja
    JOIN job_classes jc ON ja.job_class_id = jc.id
    WHERE jc.name = 'Hero'
    ORDER BY ja.advancement_level
""")
sys.stdout.reconfigure(encoding="utf-8")
print("\nHero advancement path:")
for level, name, name_ko, req in cur.fetchall():
    print(f"  Lv.{req:>3} | Adv {level}: {name} ({name_ko})")

# Dawn Warrior path sample
cur.execute("""
    SELECT ja.advancement_level, ja.name, ja.name_ko, ja.level_required
    FROM job_advancements ja
    JOIN job_classes jc ON ja.job_class_id = jc.id
    WHERE jc.name = 'Dawn Warrior'
    ORDER BY ja.advancement_level
""")
print("\nDawn Warrior advancement path:")
for level, name, name_ko, req in cur.fetchall():
    print(f"  Lv.{req:>3} | Adv {level}: {name} ({name_ko})")

# Zero path (special)
cur.execute("""
    SELECT ja.advancement_level, ja.name, ja.name_ko, ja.level_required
    FROM job_advancements ja
    JOIN job_classes jc ON ja.job_class_id = jc.id
    WHERE jc.name = 'Zero'
    ORDER BY ja.advancement_level
""")
print("\nZero advancement path:")
for level, name, name_ko, req in cur.fetchall():
    print(f"  Lv.{req:>3} | Adv {level}: {name} ({name_ko})")

# Branch summary
cur.execute("""
    SELECT jc.branch, COUNT(ja.id)
    FROM job_advancements ja
    JOIN job_classes jc ON ja.job_class_id = jc.id
    GROUP BY jc.branch
    ORDER BY COUNT(ja.id) DESC
""")
print("\nAdvancements by branch:")
for branch, count in cur.fetchall():
    print(f"  {branch}: {count}")

conn.close()
