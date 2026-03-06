from passlib.hash import pbkdf2_sha256
h = "$pbkdf2-sha256$29000$JYRwzhnjnLO2VgoBwHgvZQ$7Vd2aaAJKmJWPlU1yHo8JSkvGvw9eDRLtRudtCc7wvgE"
print(f"Testing against hash: {h}")
print(f"Is empty string? {pbkdf2_sha256.verify('', h)}")
print(f"Is 'Zerain2026!'? {pbkdf2_sha256.verify('Zerain2026!', h)}")
