import sqlite3
from datetime import datetime, timedelta

def create_test_data():
    """Create test attendance and expense data for this week"""
    conn = sqlite3.connect('zerain.db')
    c = conn.cursor()
    
    # Test driver ID
    driver_id = "1"  # Use internal ID for testing
    
    print("🧪 Creating Test Data for Weekly Summary\n")
    print("=" * 50)
    
    # Get this week's Monday
    today = datetime.now()
    monday = today - timedelta(days=today.weekday())
    
    # Create attendance records for this week
    test_days = [
        # (day_offset, in_time, out_time)
        (0, "07:00", "15:30"),  # Monday: 8.5h (0.5h extras)
        (1, "08:00", "17:00"),  # Tuesday: 9h (1h extras)
        (2, "07:30", "16:00"),  # Wednesday: 8.5h (0.5h extras)
        (3, "08:00", "16:00"),  # Thursday: 8h (no extras)
        (4, "07:00", "18:00"),  # Friday: 11h (3h extras)
    ]
    
    print("\n📝 Creating Attendance Records:")
    print("-" * 50)
    
    for day_offset, in_time, out_time in test_days:
        work_date = monday + timedelta(days=day_offset)
        date_str = work_date.strftime("%Y-%m-%d")
        
        # Insert IN
        c.execute("""
            INSERT INTO attendance_log (driver_id, type, timestamp, approved)
            VALUES (?, 'IN', ?, 0)
        """, (driver_id, f"{date_str} {in_time}"))
        
        # Insert OUT
        c.execute("""
            INSERT INTO attendance_log (driver_id, type, timestamp, approved)
            VALUES (?, 'OUT', ?, 0)
        """, (driver_id, f"{date_str} {out_time}"))
        
        # Calculate hours
        in_dt = datetime.strptime(f"{date_str} {in_time}", "%Y-%m-%d %H:%M")
        out_dt = datetime.strptime(f"{date_str} {out_time}", "%Y-%m-%d %H:%M")
        duration = (out_dt - in_dt).total_seconds() / 3600
        overtime = max(0, duration - 8)
        
        day_name = work_date.strftime("%A")
        print(f"✅ {day_name}: {in_time} - {out_time} ({duration:.1f}h, extras: {overtime:.1f}h)")
    
    # Create some expenses (dietas)
    print("\n💶 Creating Expense Records:")
    print("-" * 50)
    
    expense_days = [
        (0, 25.0, "Dieta"),  # Monday
        (1, 25.0, "Dieta"),  # Tuesday
        (4, 30.0, "Dieta"),  # Friday
    ]
    
    for day_offset, amount, exp_type in expense_days:
        work_date = monday + timedelta(days=day_offset)
        date_str = work_date.strftime("%Y-%m-%d")
        
        c.execute("""
            INSERT INTO expenses (driver_id, date, amount, type, approved)
            VALUES (?, ?, ?, ?, 0)
        """, (driver_id, date_str, amount, exp_type))
        
        day_name = work_date.strftime("%A")
        print(f"✅ {day_name}: {amount}€ ({exp_type})")
    
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 50)
    print("✅ Test data created successfully!")
    print(f"\n📱 Use driver_id: {driver_id} to test")
    print("\n💡 Expected totals:")
    print("   - Días trabajados: 5")
    print("   - Total horas: 45.0h")
    print("   - Total extras: 5.0h")
    print("   - Total dietas: 80€")

if __name__ == '__main__':
    create_test_data()
