
from services.odoo_service import odoo_client
import json

def test():
    if odoo_client.connect():
        print("Connected")
        # Try hr.employee
        try:
            employees = odoo_client.execute('hr.employee', 'search_read', [], ['name', 'identification_id', 'mobile_phone', 'work_phone', 'active'])
            with open('odoo_employees_list.txt', 'w', encoding='utf-8') as f:
                f.write(f"Found {len(employees)} employees\n")
                for emp in employees:
                    f.write(f"ID: {emp['id']} | Name: {emp['name']} | DNI: {emp['identification_id']} | Mobile: {emp['mobile_phone']} | Active: {emp['active']}\n")
            print("Results written to odoo_employees_list.txt")
        except Exception as e:
            print(f"hr.employee failed: {e}")
            
        # Try hr.attendance
        try:
            fields = odoo_client.execute('hr.attendance', 'fields_get', [], attributes=['string', 'type', 'required'])
            print("HR.ATTENDANCE Fields:")
            with open('odoo_fields_attendance.json', 'w') as f:
                json.dump(fields, f, indent=2)
            print("Attendance fields written to odoo_fields_attendance.json")
        except Exception as e:
            print(f"hr.attendance fields_get failed: {e}")

        # Try hr.expense
        try:
            fields = odoo_client.execute('hr.expense', 'fields_get', [], attributes=['string', 'type', 'required'])
            print("HR.EXPENSE Fields:")
            with open('odoo_fields_expense.json', 'w') as f:
                json.dump(fields, f, indent=2)
            print("Expense fields written to odoo_fields_expense.json")
        except Exception as e:
            print(f"hr.expense fields_get failed: {e}")
            
        # Try hr.expense.sheet (Report)
        try:
            fields = odoo_client.execute('hr.expense.sheet', 'fields_get', [], attributes=['string', 'type', 'required'])
            print("HR.EXPENSE.SHEET Fields:")
            with open('odoo_fields_expense_sheet.json', 'w') as f:
                json.dump(fields, f, indent=2)
        except Exception as e:
            print(f"hr.expense.sheet fields_get failed: {e}")
    else:
        print("Failed to connect")

if __name__ == "__main__":
    test()
