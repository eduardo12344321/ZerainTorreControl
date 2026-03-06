from datetime import datetime

def calculate_zerain_stats(day_records):
    """
    Apply Zerain specific business rules to calculate hours and diets.
    Rules:
    - Mon-Thu: 08:00-13:00, 15:00-18:00 (8h)
    - Fri: 08:00-13:00, 15:00-16:45 (6h 45m)
    - If lunch break < 1.5h AND worker logged MEAL_IN/OUT: +1h Overtime + 1 Diet.
    """
    date_str = day_records.get('date')
    if not date_str: return 0, 0, 0, 0
    
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    is_friday = dt.weekday() == 4
    
    # Standard limits
    MORNING_START = 8.0 # 08:00
    MORNING_END = 13.0   # 13:00
    AFTERNOON_START = 15.0 # 15:00
    AFTERNOON_END = 16.75 if is_friday else 18.0 # 16:45 or 18:00
    
    regular_hours = 0
    overtime_hours = 0
    meal_duration = 0
    diet_count = 0
    
    def time_to_float(ts):
        if not ts: return None
        try:
            # ts is YYYY-MM-DD HH:MM
            t_part = ts.split(' ')[1]
            parts = t_part.split(':')
            h, m = int(parts[0]), int(parts[1])
            return h + m/60.0
        except: return None

    t_in = time_to_float(day_records.get('in'))
    t_out = time_to_float(day_records.get('out'))
    t_meal_in = time_to_float(day_records.get('meal_in'))
    t_meal_out = time_to_float(day_records.get('meal_out'))

    if t_in is not None and t_out is not None:
        # 1. Regular Hours Morning
        m_in = max(t_in, MORNING_START)
        m_out = min(t_meal_in if t_meal_in else t_out, MORNING_END)
        if m_out > m_in:
            regular_hours += (m_out - m_in)
        
        # 2. Regular Hours Afternoon
        a_in = max(t_meal_out if t_meal_out else t_in, AFTERNOON_START)
        a_out = min(t_out, AFTERNOON_END)
        if a_out > a_in:
            regular_hours += (a_out - a_in)
            
        # 3. Overtime: Before 08:00
        if t_in < MORNING_START:
            overtime_hours += (MORNING_START - t_in)
            
        # 4. Overtime: After standard end
        if t_out > AFTERNOON_END:
            overtime_hours += (t_out - AFTERNOON_END)
            
        # 5. Diet & Meal Overtime
        if t_meal_in is not None and t_meal_out is not None:
            meal_duration = t_meal_out - t_meal_in
            if meal_duration < 1.5:
                # Zerain rule: if meal break is short, they get 1h overtime extra and 1 diet
                overtime_hours += 1.0
                diet_count = 1
                
    return (
        round(regular_hours, 2), 
        round(overtime_hours, 2), 
        round(meal_duration, 2), 
        diet_count, 
        bool(day_records.get('modified'))
    )
