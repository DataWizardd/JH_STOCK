CREATE USER 'JHUser'@'localhost' IDENTIFIED WITH mysql_native_password BY '1234';
GRANT ALL PRIVILEGES ON *.* TO 'JHUser'@'localhost' WITH GRANT OPTION;
CREATE DATABASE stockdb;
USE stockdb;
-- Stock 테이블 
CREATE TABLE Stock (
    symbol VARCHAR(255) PRIMARY KEY,
    price DECIMAL(18, 2),
    volume INT,
    timestamp TIMESTAMP
);
-- User 테이블 
CREATE TABLE User (
    user_id VARCHAR(255) PRIMARY KEY,
    user_pw VARCHAR(255),
    username VARCHAR(255)
);

-- Portfolio 테이블
CREATE TABLE Portfolio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255),
    symbol VARCHAR(255),
    quantity INT,
    total_price DECIMAL(18, 2),
    FOREIGN KEY (user_id) REFERENCES User(user_id),
    FOREIGN KEY (symbol) REFERENCES Stock(symbol)
);

-- Watchlist 테이블
CREATE TABLE Watchlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255),
    symbol VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES User(user_id),
    FOREIGN KEY (symbol) REFERENCES Stock(symbol)
);


-- Admin 테이블 생성 (admin_id 데이터 형식 변경)
CREATE TABLE Admin (
    admin_id VARCHAR(255) PRIMARY KEY,
    admin_pw VARCHAR(255),
    adminname VARCHAR(255)
);
SHOW tables;