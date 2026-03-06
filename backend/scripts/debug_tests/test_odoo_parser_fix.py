
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.odoo_service import OdooClient

def test_parser():
    client = OdooClient()
    
    # Mock order lines from Odoo notes
    mock_lines = [
        {'name': 'CONCEPTO DEL PEDIDO', 'display_type': 'line_section'},
        {'name': 'CONDUCTOR: ION GARMENDIA', 'display_type': 'line_note'},
        {'name': 'FECHA: 2026-02-15 09:00:00', 'display_type': 'line_note'},
        {'name': 'ORIGEN: ZERAIN', 'display_type': 'line_note'},
        {'name': 'DESTINO: BEASAIN', 'display_type': 'line_note'},
        {'name': 'DISTANCIAS', 'display_type': 'line_section'},
        {'name': 'KM HASTA ORIGEN: 18.5 KM', 'display_type': 'line_note'},
        {'name': 'KM CONDUCCION (A-B): 122.81 KM', 'display_type': 'line_note'},
        {'name': 'TIEMPOS ESTIMADOS', 'display_type': 'line_section'},
        {'name': 'TIEMPO PREP: 20 min', 'display_type': 'line_note'},
        {'name': 'TIEMPO VIAJE: 15 min', 'display_type': 'line_note'},
        {'name': 'TIEMPO TRABAJO: 60 min', 'display_type': 'line_note'},
        {'name': 'PREVIO (Desde): BASE', 'display_type': 'line_note'},
    ]
    
    data = client._parse_order_lines(mock_lines)
    
    print("Parsed Data:")
    for k, v in data.items():
        print(f"  {k}: {v}")
    
    # Assertions
    assert data.get('origin') == 'ZERAIN', f"Origin mismatch: {data.get('origin')}"
    assert data.get('dest') == 'BEASAIN', f"Dest mismatch: {data.get('dest')}"
    assert data.get('km_to_origin') == 18.5, f"KM to origin mismatch: {data.get('km_to_origin')}"
    assert data.get('km') == 122.81, f"KM mismatch: {data.get('km')}"
    assert data.get('prep_time') == 20, f"Prep time mismatch: {data.get('prep_time')}"
    assert data.get('driving_time') == 15, f"Driving time mismatch: {data.get('driving_time')}"
    assert data.get('work_time') == 60, f"Work time mismatch: {data.get('work_time')}"
    assert data.get('previous_location') == 'BASE', f"Previous location mismatch: {data.get('previous_location')}"
    
    print("\n✅ Parser test passed!")

if __name__ == "__main__":
    try:
        test_parser()
    except Exception as e:
        print(f"\n❌ Parser test failed: {e}")
        sys.exit(1)
