USE mysql;
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'ZerainStrongPass';
ALTER USER 'zerain_user'@'%' IDENTIFIED BY 'ZerainStrongPass';
FLUSH PRIVILEGES;
