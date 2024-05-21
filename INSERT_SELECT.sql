INSERT INTO Stock (symbol, price, volume, timestamp) VALUES
('AAPL', 189.87, 100000, '2024-05-18 09:00:00'),
('MSFT', 420.21, 75000, '2024-05-18 09:01:00'),
('GOOGL', 176.06, 50000, '2024-05-18 09:02:00'),
('AMZN', 184.70, 30000, '2024-05-18 09:03:00'),
('TSLA', 177.46, 150000, '2024-05-18 09:04:00'),
('META', 471.90, 90000, '2024-05-18 09:05:00'),
('NFLX', 621.10, 60000, '2024-05-18 09:06:00'),
('NVDA', 924.79, 45000, '2024-05-18 09:07:00'),
('AMD', 164.47, 120000, '2024-05-18 09:08:00'),
('INTC', 31.83, 180000, '2024-05-18 09:09:00');
SELECT*FROM Stock;


INSERT INTO User (user_id, user_pw, username) VALUES
('user1', '1234', 'Park1'),
('user2', '1234', 'Park2'),
('user3', '1234', 'Park3'),
('user4', '1234', 'Kim1'),
('user5', '1234', 'Kim2'),
('user6', '1234', 'Kim3'),
('user7', '1234', 'Lee1'),
('user8', '1234', 'Lee2'),
('user9', '1234', 'Lee3'),
('user10', '1234', 'son1');
SELECT*FROM User;

INSERT INTO Admin (admin_id, admin_pw, adminname) VALUES
('admin1', '0000', 'Admin 1'),
('admin2', '0000', 'Admin 2'),
('admin3', '0000', 'Admin 3'),
('admin4', '0000', 'Admin 4'),
('admin5', '0000', 'Admin 5'),
('admin6', '0000', 'Admin 6'),
('admin7', '0000', 'Admin 7'),
('admin8', '0000', 'Admin 8'),
('admin9', '0000', 'Admin 9'),
('admin10', '0000', 'Admin 10');
SELECT*FROM Admin;


INSERT INTO Portfolio (user_id, symbol, quantity, total_price) VALUES
('user1', 'AAPL', 10, 1898.70),
('user1', 'MSFT', 20, 8404.20),
('user2', 'GOOGL', 5, 880.30),
('user2', 'AMZN', 3, 554.10),
('user3', 'TSLA', 15, 2661.90),
('user3', 'META', 8, 3775.20),
('user4', 'NFLX', 12, 7453.20),
('user4', 'NVDA', 18, 16665.42),
('user5', 'AMD', 25, 4111.75),
('user5', 'INTC', 30, 954.90);
SELECT*FROM Portfolio;


INSERT INTO Watchlist (user_id, symbol) VALUES
('user1', 'AAPL'),
('user1', 'MSFT'),
('user2', 'GOOGL'),
('user2', 'AMZN'),
('user3', 'TSLA'),
('user3', 'META'),
('user4', 'NFLX'),
('user4', 'NVDA'),
('user5', 'AMD'),
('user5', 'META');
SELECT*FROM Watchlist;