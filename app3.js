const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql');
const session = require('express-session');

const app = express();
const port = 3000;

// 세션 미들웨어 설정
app.use(session({
  secret: 'your_secret_key', // 세션 암호화에 사용할 키
  resave: false,
  saveUninitialized: true
}));

// MySQL 연결 설정
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'JHUser',
  password: '1234',
  database: 'stockdb'
});

// MySQL 연결
connection.connect((err) => {
  if (err) {
    console.error('MySQL 연결 실패: ' + err.stack);
    return;
  }
  console.log('MySQL 연결 성공. 연결 ID: ' + connection.threadId);
});

// 뷰 엔진 설정
app.set('view engine', 'ejs');

// 정적 파일 제공을 위한 미들웨어 설정
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));

// 로그인 페이지 라우트
app.get('/login', (req, res) => {
  res.render('login');
});

// 로그인 처리 라우트
app.post('/login', (req, res) => {
  const { id, password } = req.body;

  // 사용자 테이블에서 사용자 인증
  const userQuery = 'SELECT * FROM User WHERE user_id = ? AND user_pw = ?';
  connection.query(userQuery, [id, password], (err, userResults) => {
    if (err) throw err;

    // 관리자 테이블에서 관리자 인증
    const adminQuery = 'SELECT * FROM Admin WHERE admin_id = ? AND admin_pw = ?';
    connection.query(adminQuery, [id, password], (err, adminResults) => {
      if (err) throw err;

      // 사용자로 인증된 경우
      if (userResults.length > 0) {
        const user = userResults[0];
        req.session.user = user;

        // 사용자 ID가 'admin_id'인 경우 관리자 페이지로 리디렉션
        if (id === 'admin_id') {
          res.redirect('/admin');
        } else {
          res.redirect('/user'); // 사용자 페이지로 리디렉션
        }
      }
      // 관리자로 인증된 경우
      else if (adminResults.length > 0) {
        const admin = adminResults[0];
        req.session.admin = admin;
        res.redirect('/admin'); // 관리자 페이지로 리디렉션
      }
      // 사용자 정보가 없는 경우 로그인 페이지로 리디렉션
      else {
        res.redirect('/login');
      }
    });
  });
});
  

// 사용자 모드 페이지 라우트
app.get('/user', async (req, res) => {
  try {
      const user = req.session.user; // 세션에서 사용자 정보 가져오기
      if (!user) { // 로그인되지 않은 사용자라면 로그인 페이지로 리디렉션
          res.redirect('/login');
          return;
      }

      // Stock 테이블에서 주식 시세 데이터 가져오기
      connection.query('SELECT * FROM Stock', (err, stocks) => {
          if (err) {
              console.error('주식 시세 조회 에러:', err);
              res.status(500).send('주식 시세 조회 중 에러가 발생했습니다.');
              return;
          }
          // 주식 시세 조회 페이지 렌더링
          res.render('user', { user, stocks });
      });
  } catch (err) {
      console.error('사용자 모드 페이지 라우트 에러:', err);
      res.status(500).send('사용자 모드 페이지 로딩 중 에러가 발생했습니다.');
  }
});

// 주식 정보 조회 페이지 라우트
app.get('/stock-info', (req, res) => {
  // Stock 테이블에서 주식 정보를 가져와서 stock-info.ejs에 전달
  connection.query('SELECT * FROM Stock', (err, Stocks) => {
    if (err) {
      console.error('주식 정보 조회 에러:', err);
      res.status(500).send('주식 정보 조회 중 에러가 발생했습니다.');
      return;
    }
    res.render('stock-info', { Stocks: Stocks });
  });
});

// 포트폴리오 조회 페이지 라우트
app.get('/portfolio', (req, res) => {
  const user = req.session.user; // 현재 로그인된 사용자 정보 가져오기
  if (!user) { // 로그인되지 않은 사용자라면 로그인 페이지로 리디렉션
      res.redirect('/login');
      return;
  }

  const userId = user.user_id; // 현재 로그인된 사용자의 아이디
  const query = 'SELECT * FROM Portfolio WHERE user_id = ?'; // 해당 사용자의 포트폴리오 조회 쿼리
  connection.query(query, [userId], (err, rows) => {
      if (err) {
          console.error('포트폴리오 조회 에러:', err);
          res.status(500).send('포트폴리오 조회 중 에러가 발생했습니다.');
          return;
      }
      res.render('portfolio', { portfolio: rows });
  });
});

// 포트폴리오 추가 라우트
app.post('/portfolio', (req, res) => {
  const user = req.session.user; // 현재 로그인된 사용자 정보 가져오기
  if (!user) { // 로그인되지 않은 사용자라면 로그인 페이지로 리디렉션
      res.redirect('/login');
      return;
  }

  const userId = user.user_id; // 현재 로그인된 사용자의 아이디
  const { symbol, quantity } = req.body;

  // 기존 포트폴리오에 같은 심볼이 존재하는지 확인
  const checkQuery = 'SELECT * FROM Portfolio WHERE user_id = ? AND symbol = ?';
  connection.query(checkQuery, [userId, symbol], (err, rows) => {
      if (err) {
          console.error('포트폴리오 확인 에러:', err);
          res.status(500).send('포트폴리오 확인 중 에러가 발생했습니다.');
          return;
      }

      // 존재하는 경우 해당 심볼의 수량과 총 가격을 업데이트
      if (rows.length > 0) {
          const existingQuantity = rows[0].quantity;
          const existingTotalPrice = rows[0].total_price;
          const newQuantity = existingQuantity + parseInt(quantity);
          const priceQuery = 'SELECT price FROM Stock WHERE symbol = ?';
          connection.query(priceQuery, [symbol], (err, priceRows) => {
              if (err) {
                  console.error('주식 가격 조회 에러:', err);
                  res.status(500).send('주식 가격 조회 중 에러가 발생했습니다.');
                  return;
              }
              if (priceRows.length === 0) {
                  console.error('해당 심볼에 대한 주식 정보가 없습니다.');
                  res.status(404).send('해당 심볼에 대한 주식 정보가 없습니다.');
                  return;
              }
              const price = priceRows[0].price; // 조회된 주식 가격
              const newTotalPrice = existingTotalPrice + (price * quantity); // 총 가격 재계산

              // 포트폴리오 업데이트 쿼리
              const updateQuery = 'UPDATE Portfolio SET quantity = ?, total_price = ? WHERE user_id = ? AND symbol = ?';
              connection.query(updateQuery, [newQuantity, newTotalPrice, userId, symbol], (err, result) => {
                  if (err) {
                      console.error('포트폴리오 업데이트 에러:', err);
                      res.status(500).send('포트폴리오 업데이트 중 에러가 발생했습니다.');
                      return;
                  }
                  console.log('포트폴리오 업데이트 성공:', result);
                  res.redirect('/portfolio');
              });
          });
      } else { // 존재하지 않는 경우 포트폴리오 추가
          const priceQuery = 'SELECT price FROM Stock WHERE symbol = ?';
          connection.query(priceQuery, [symbol], (err, rows) => {
              if (err) {
                  console.error('주식 가격 조회 에러:', err);
                  res.status(500).send('주식 가격 조회 중 에러가 발생했습니다.');
                  return;
              }
              if (rows.length === 0) {
                  console.error('해당 심볼에 대한 주식 정보가 없습니다.');
                  res.status(404).send('해당 심볼에 대한 주식 정보가 없습니다.');
                  return;
              }
              const price = rows[0].price; // 조회된 주식 가격
              const totalPrice = price * quantity; // 총 가격 계산

              // 포트폴리오 추가 쿼리
              const insertQuery = 'INSERT INTO Portfolio (user_id, symbol, quantity, total_price) VALUES (?, ?, ?, ?)';
              connection.query(insertQuery, [userId, symbol, quantity, totalPrice], (err, result) => {
                  if (err) {
                      console.error('포트폴리오 추가 에러:', err);
                      res.status(500).send('포트폴리오 추가 중 에러가 발생했습니다.');
                      return;
                  }
                  console.log('포트폴리오 추가 성공:', result);
                  res.redirect('/portfolio');
              });
          });
      }
  });
});

// 포트폴리오 수정 페이지 라우트
app.get('/portfolio/edit/:id', (req, res) => {
  const user = req.session.user; // 현재 로그인된 사용자 정보 가져오기
  if (!user) { // 로그인되지 않은 사용자라면 로그인 페이지로 리디렉션
      res.redirect('/login');
      return;
  }

  const portfolioId = req.params.id;

  // Portfolio 테이블에서 해당 포트폴리오 정보 조회
  const query = 'SELECT * FROM Portfolio WHERE id = ?';
  connection.query(query, [portfolioId], (err, portfolio) => {
      if (err) {
          console.error('포트폴리오 수정 페이지 조회 에러:', err);
          res.status(500).send('포트폴리오 수정 페이지 조회 중 에러가 발생했습니다.');
          return;
      }
      if (portfolio.length === 0) {
          console.error('포트폴리오를 찾을 수 없습니다.');
          res.status(404).send('포트폴리오를 찾을 수 없습니다.');
          return;
      }
      // 포트폴리오 수정 페이지 렌더링
      res.render('edit-portfolio', { portfolio: portfolio[0] });
  });
});

// 포트폴리오 수정 처리 라우트
app.post('/portfolio/edit/:id', (req, res) => {
  const user = req.session.user; // 현재 로그인된 사용자 정보 가져오기
  if (!user) { // 로그인되지 않은 사용자라면 로그인 페이지로 리디렉션
      res.redirect('/login');
      return;
  }

  const portfolioId = req.params.id;
  const { quantity } = req.body;

  // 데이터베이스 연결 객체에서 쿼리 실행
  connection.query('UPDATE Portfolio SET quantity = ? WHERE id = ?', [quantity, portfolioId], (err, result) => {
      if (err) {
          console.error('포트폴리오 수정 에러:', err);
          res.status(500).send('포트폴리오 수정 중 에러가 발생했습니다.');
          return;
      }
      console.log('포트폴리오 수정 성공:', result);
      res.redirect('/portfolio'); // 수정 완료 후 포트폴리오 페이지로 리디렉션
  });
});



// 포트폴리오 삭제 라우트
app.delete('/portfolio/:id', (req, res) => {
  const user = req.session.user; // 현재 로그인된 사용자 정보 가져오기
  if (!user) { // 로그인되지 않은 사용자라면 로그인 페이지로 리디렉션
      res.redirect('/login');
      return;
  }

  const portfolioId = req.params.id;
  const userId = user.user_id; // 현재 로그인된 사용자의 아이디

  // 데이터베이스 연결 객체에서 쿼리 실행
  connection.query('DELETE FROM Portfolio WHERE id = ? AND user_id = ?', [portfolioId, userId], (err, result) => {
      if (err) {
          console.error('포트폴리오 삭제 에러:', err);
          res.status(500).send('포트폴리오 삭제 중 에러가 발생했습니다.');
          return;
      }
      console.log('포트폴리오 삭제 성공:', result);
      res.redirect('/portfolio');
  });
});


// 회원 가입 처리 라우트
app.get('/register', (req, res) => {
    res.render('register');
});
app.post('/register', (req, res) => {
    const { username, user_id, user_pw } = req.body;
  
    // 회원 가입 정보를 User 테이블에 삽입하는 SQL 쿼리
    const sql = 'INSERT INTO User (username, user_id, user_pw) VALUES (?, ?, ?)';
    connection.query(sql, [username, user_id, user_pw], (err, result) => {
      if (err) {
        console.error('회원 가입 에러:', err);
        res.status(500).send('회원 가입 중 에러가 발생했습니다.');
        return;
      }
      console.log('회원 가입 성공:', result);
      res.redirect('/login'); // 가입 완료 후 로그인 페이지로 리디렉션
    });
});

// 관리자 모드 페이지 라우트
app.get('/admin', (req, res) => {
  // 현재 로그인된 사용자가 관리자인지 확인
  const admin = req.session.admin;
  if (!admin) { // 로그인되지 않은 경우 로그인 페이지로 리디렉션
      res.redirect('/login');
      return;
  }
  

  // 사용자 테이블에서 모든 회원 정보 조회
  const sql = 'SELECT * FROM User';
  connection.query(sql, (err, users) => {
      if (err) {
          console.error('회원 조회 에러:', err);
          res.status(500).send('회원 조회 중 에러가 발생했습니다.');
          return;
      }
      res.render('admin', { users: users }); // 회원 목록과 함께 admin.ejs 렌더링
  });
});

// 회원 정보 수정 라우트
app.get('/admin/user/edit/:userId', (req, res) => {
  const userId = req.params.userId;

  // User 테이블에서 해당 사용자의 정보 조회
  const query = 'SELECT * FROM User WHERE user_id = ?';
  connection.query(query, [userId], (err, user) => {
      if (err) {
          console.error('사용자 정보 조회 에러:', err);
          res.status(500).send('사용자 정보 조회 중 에러가 발생했습니다.');
          return;
      }
      if (user.length === 0) {
          console.error('사용자를 찾을 수 없습니다.');
          res.status(404).send('사용자를 찾을 수 없습니다.');
          return;
      }
      // 사용자 정보 수정 페이지 렌더링
      res.render('edit-user', { user: user[0] });
  });
});

// 회원 정보 수정 처리 라우트
app.post('/admin/user/edit/:userId', (req, res) => {
  const userId = req.params.userId;
  const { user_id, username, user_pw } = req.body; // user_id 추가

  // User 테이블에서 해당 사용자의 정보 업데이트
  const query = 'UPDATE User SET user_id = ?, username = ?, user_pw = ? WHERE user_id = ?'; // user_id 추가
  connection.query(query, [user_id, username, user_pw, userId], (err, result) => {
      if (err) {
          console.error('사용자 정보 업데이트 에러:', err);
          res.status(500).send('사용자 정보 업데이트 중 에러가 발생했습니다.');
          return;
      }
      console.log('사용자 정보 업데이트 성공:', result);
      res.redirect('/admin-userlist'); // 수정 완료 후 회원 목록 페이지로 리디렉션
  });
});



// 회원 삭제 라우트
app.post('/admin/user/delete/:userId', (req, res) => {
  const userId = req.params.userId;

  // User 테이블에서 해당 사용자의 정보 삭제
  const query = 'DELETE FROM User WHERE user_id = ?';
  connection.query(query, [userId], (err, result) => {
      if (err) {
          console.error('사용자 정보 삭제 에러:', err);
          res.status(500).send('사용자 정보 삭제 중 에러가 발생했습니다.');
          return;
      }
      console.log('사용자 정보 삭제 성공:', result);
      res.redirect('/admin-userlist'); // 삭제 완료 후 회원 목록 페이지로 리디렉션
  });
});
// 회원 추가 페이지 라우트
app.get('/admin/user/new', (req, res) => {
  res.render('new'); // 회원 추가 페이지 렌더링
});

// 회원 추가 처리 라우트
app.post('/admin/user/new', (req, res) => {
  const { username, user_id, user_pw } = req.body;

  // 회원 추가를 위한 SQL 쿼리
  const sql = 'INSERT INTO User (username, user_id, user_pw) VALUES (?, ?, ?)';
  connection.query(sql, [username, user_id, user_pw], (err, result) => {
      if (err) {
          console.error('회원 추가 에러:', err);
          res.status(500).send('회원 추가 중 에러가 발생했습니다.');
          return;
      }
      console.log('회원 추가 성공:', result);
      res.redirect('/admin-userlist'); // 회원 추가 완료 후 회원 목록 페이지로 리디렉션
  });
});

// 회원 목록 조회 페이지 라우트
app.get('/admin-userlist', (req, res) => {
  // 데이터베이스에서 모든 회원 정보를 조회하는 쿼리
  const query = 'SELECT * FROM User';

  // 쿼리 실행
  connection.query(query, (err, users) => {
    if (err) {
      console.error('회원 목록 조회 에러:', err);
      res.status(500).send('회원 목록 조회 중 에러가 발생했습니다.');
      return;
    }

    // 조회된 회원 정보를 admin-userlist.ejs 템플릿에 전달하여 렌더링
    res.render('admin-userlist', { users: users });
  });
});






// 주식 목록 조회 라우트
app.get('/admin-stocklist', (req, res) => {
  const admin = req.session.admin;
  if (!admin) { // 관리자가 아닌 경우 로그인 페이지로 리디렉션
      res.redirect('/login');
      return;
  }

  // Stock 테이블에서 모든 주식 정보를 조회
  const query = 'SELECT * FROM Stock';
  connection.query(query, (err, stocks) => {
    if (err) {
      console.error('주식 목록 조회 에러:', err);
      res.status(500).send('주식 목록 조회 중 에러가 발생했습니다.');
      return;
    }
    res.render('admin-stocklist', { stocks: stocks });
  });
});

// 주식 추가 라우트
app.post('/admin/stock/add', (req, res) => {
  const admin = req.session.admin;
  if (!admin) { // 관리자가 아닌 경우 로그인 페이지로 리디렉션
      res.redirect('/login');
      return;
  }

  const { symbol, price, volume } = req.body;

  // 주식 추가를 위한 SQL 쿼리
  const sql = 'INSERT INTO Stock (symbol, price, volume, timestamp) VALUES (?, ?, ?, NOW())';
  connection.query(sql, [symbol, price, volume], (err, result) => {
    if (err) {
      console.error('주식 추가 에러:', err);
      res.status(500).send('주식 추가 중 에러가 발생했습니다.');
      return;
    }
    console.log('주식 추가 성공:', result);
    res.redirect('/admin-stocklist'); // 주식 추가 완료 후 주식 목록 페이지로 리디렉션
  });
});

// 주식 정보 수정 라우트
app.post('/admin/stock/edit/:symbol', (req, res) => {
  const admin = req.session.admin;
  if (!admin) { // 관리자가 아닌 경우 로그인 페이지로 리디렉션
      res.redirect('/login');
      return;
  }

  const symbol = req.params.symbol;
  const { price, volume } = req.body;

  // 주식 테이블에서 주식 정보 수정
  const sql = 'UPDATE Stock SET price = ?, volume = ?, timestamp = NOW() WHERE symbol = ?';
  connection.query(sql, [price, volume, symbol], (err, result) => {
    if (err) {
      console.error('주식 정보 수정 에러:', err);
      res.status(500).send('주식 정보 수정 중 에러가 발생했습니다.');
      return;
    }
    console.log('주식 정보 수정 성공:', result);
    res.redirect('/admin-stocklist'); // 수정 완료 후 주식 목록 페이지로 리디렉션
  });
});

// 주식 삭제 라우트
app.post('/admin/stock/delete/:symbol', (req, res) => {
  const admin = req.session.admin;
  if (!admin) { // 관리자가 아닌 경우 로그인 페이지로 리디렉션
      res.redirect('/login');
      return;
  }

  const symbol = req.params.symbol;

  // 주식 테이블에서 주식 삭제
  const sql = 'DELETE FROM Stock WHERE symbol = ?';
  connection.query(sql, [symbol], (err, result) => {
    if (err) {
      console.error('주식 삭제 에러:', err);
      res.status(500).send('주식 삭제 중 에러가 발생했습니다.');
      return;
    }
    console.log('주식 삭제 성공:', result);
    res.redirect('/admin-stocklist'); // 삭제 완료 후 주식 목록 페이지로 리디렉션
  });
});

// 관심 종목 조회 라우트
app.get('/watchlist', (req, res) => {
  const user = req.session.user;
  if (!user) {
    res.redirect('/login');
    return;
  }

  const userId = user.user_id;
  const query = `
    SELECT w.id, w.symbol, s.price, s.volume, s.timestamp 
    FROM Watchlist w 
    JOIN Stock s ON w.symbol = s.symbol 
    WHERE w.user_id = ?
  `;
  connection.query(query, [userId], (err, results) => {
    if (err) {
      console.error('관심 종목 조회 에러:', err);
      res.status(500).send('관심 종목 조회 중 에러가 발생했습니다.');
      return;
    }
    res.render('watchlist', { user: user, watchlist: results });
  });
});

// 관심 종목 추가 라우트
app.post('/watchlist/add', (req, res) => {
  const user = req.session.user;
  if (!user) {
    res.redirect('/login');
    return;
  }

  const userId = user.user_id;
  const { symbol } = req.body;

  const query = 'INSERT INTO Watchlist (user_id, symbol) VALUES (?, ?)';
  connection.query(query, [userId, symbol], (err, results) => {
    if (err) {
      console.error('관심 종목 추가 에러:', err);
      res.status(500).send('관심 종목 추가 중 에러가 발생했습니다.');
      return;
    }
    // 관심 종목 추가 후, 주식 시세 페이지로 리다이렉트
    res.redirect('/watchlist');
  });
});

// 관심 종목 삭제 라우트
app.post('/watchlist/delete/:id', (req, res) => {
  const user = req.session.user;
  if (!user) {
    res.redirect('/login');
    return;
  }

  const watchlistId = req.params.id;
  const userId = user.user_id;

  const query = 'DELETE FROM Watchlist WHERE id = ? AND user_id = ?';
  connection.query(query, [watchlistId, userId], (err, results) => {
    if (err) {
      console.error('관심 종목 삭제 에러:', err);
      res.status(500).send('관심 종목 삭제 중 에러가 발생했습니다.');
      return;
    }
    // 관심 종목 삭제 후, 주식 시세 페이지로 리다이렉트
    res.redirect('/watchlist');
  });
});


// 관리자 목록 조회 페이지 라우트
app.get('/admin/adminlist', (req, res) => {
  // 데이터베이스에서 모든 관리자 정보를 조회하는 쿼리
  const query = 'SELECT * FROM Admin';

  // 쿼리 실행
  connection.query(query, (err, admins) => {
    if (err) {
      console.error('관리자 목록 조회 에러:', err);
      res.status(500).send('관리자 목록 조회 중 에러가 발생했습니다.');
      return;
    }

    // 조회된 관리자 정보를 admin-adminlist.ejs 템플릿에 전달하여 렌더링
    res.render('admin-adminlist', { admins: admins });
  });
});


// 관리자 모드 페이지 라우트
app.get('/admin', (req, res) => {
  // 현재 로그인된 사용자가 관리자인지 확인
  const admin = req.session.admin;
  if (!admin) { // 로그인되지 않은 경우 로그인 페이지로 리디렉션
      res.redirect('/login');
      return;
  }

  // 관리자 테이블에서 모든 관리자 정보 조회
  const sql = 'SELECT * FROM Admin';
  connection.query(sql, (err, admins) => {
      if (err) {
          console.error('관리자 조회 에러:', err);
          res.status(500).send('관리자 조회 중 에러가 발생했습니다.');
          return;
      }
      res.render('admin', { admins: admins }); 
  });
});

// 관리자 추가 페이지 라우트
app.get('/admin/admin/add', (req, res) => {
  res.render('admin-admin-add'); // 관리자 추가 페이지 렌더링
});

// 관리자 추가 처리 라우트
app.post('/admin/admin/add', (req, res) => {
  const { admin_id, admin_pw, adminname } = req.body;

  // 관리자 추가를 위한 SQL 쿼리
  const sql = 'INSERT INTO Admin (admin_id, admin_pw, adminname) VALUES (?, ?, ?)';
  connection.query(sql, [admin_id, admin_pw, adminname], (err, result) => {
      if (err) {
          console.error('관리자 추가 에러:', err);
          res.status(500).send('관리자 추가 중 에러가 발생했습니다.');
          return;
      }
      console.log('관리자 추가 성공:', result);
      res.redirect('/admin/adminlist'); // 관리자 추가 완료 후 관리자 목록 페이지로 리디렉션
  });
});


// 관리자 정보 수정 양식
app.get('/admin/admin/edit/:id', (req, res) => {
  const id = req.params.id;
  let sql = 'SELECT * FROM Admin WHERE admin_id = ?';
  connection.query(sql, [id], (err, result) => {
      if (err) {
          console.error(err);
          res.status(500).send('서버 오류');
      } else {
          res.render('admin-admin-edit', { admin: result[0] });
      }
  });
});

// 관리자 수정
app.post('/admin/admin/edit/:id', (req, res) => {
  const id = req.params.id;
  const { admin_pw, adminname } = req.body;
  let sql = 'UPDATE Admin SET admin_pw = ?, adminname = ? WHERE admin_id = ?';
  connection.query(sql, [admin_pw, adminname, id], (err, result) => {
      if (err) {
          console.error(err);
          res.status(500).send('관리자 정보 수정에 실패했습니다.');
      } else {
          console.log('관리자 정보가 수정되었습니다.');
          res.redirect('/admin/adminlist');
      }
  });
});

// 관리자 삭제
app.post('/admin/admin/delete/:id', (req, res) => {
  const id = req.params.id;
  let sql = 'DELETE FROM Admin WHERE admin_id = ?';
  connection.query(sql, [id], (err, result) => {
      if (err) {
          console.error(err);
          res.status(500).send('관리자 삭제에 실패했습니다.');
      } else {
          console.log('관리자가 삭제되었습니다.');
          res.redirect('/admin/adminlist');
      }
  });
});


// Portfolio 정보 수정 처리 라우트
app.post('/admin/portfolio/edit/:id', (req, res) => {
  const id = req.params.id;
  const { user_id, symbol, quantity } = req.body;

  // Stock 테이블에서 해당 심볼의 가격 조회
  const stockQuery = 'SELECT price FROM Stock WHERE symbol = ?';
  connection.query(stockQuery, [symbol], (stockErr, stockResult) => {
    if (stockErr) {
      console.error('주식 정보 조회 에러:', stockErr);
      res.status(500).send('주식 정보 조회 중 에러가 발생했습니다.');
      return;
    }

    // 조회된 주식 정보가 없으면 에러 반환
    if (stockResult.length === 0) {
      console.error('주식 정보를 찾을 수 없습니다.');
      res.status(404).send('주식 정보를 찾을 수 없습니다.');
      return;
    }

    const stockPrice = stockResult[0].price;
    const total_price = quantity * stockPrice;

    // Portfolio 테이블에서 해당 포트폴리오 정보 업데이트
    const query = 'UPDATE Portfolio SET user_id = ?, symbol = ?, quantity = ?, total_price = ? WHERE id = ?';
    connection.query(query, [user_id, symbol, quantity, total_price, id], (err, result) => {
      if (err) {
        console.error('포트폴리오 정보 업데이트 에러:', err);
        res.status(500).send('포트폴리오 정보 업데이트 중 에러가 발생했습니다.');
        return;
      }
      console.log('포트폴리오 정보 업데이트 성공:', result);
      res.redirect('/admin-portfolio-list'); // 수정 완료 후 포트폴리오 목록 페이지로 리디렉션
    });
  });
});
// Portfolio 정보 수정 페이지 렌더링
app.get('/admin/portfolio/edit/:id', (req, res) => {
  const id = req.params.id;

  // Portfolio 테이블에서 해당 포트폴리오의 정보 조회
  const query = 'SELECT * FROM Portfolio WHERE id = ?';
  connection.query(query, [id], (err, portfolio) => {
    if (err) {
      console.error('포트폴리오 정보 조회 에러:', err);
      res.status(500).send('포트폴리오 정보 조회 중 에러가 발생했습니다.');
      return;
    }
    if (portfolio.length === 0) {
      console.error('포트폴리오를 찾을 수 없습니다.');
      res.status(404).send('포트폴리오를 찾을 수 없습니다.');
      return;
    }
    // 포트폴리오 정보 수정 페이지 렌더링
    res.render('edit-portfolio', { portfolio: portfolio[0] });
  });
});



// 포트폴리오 정보 삭제 라우트
app.post('/admin/portfolio/delete/:id', (req, res) => {
  const id = req.params.id;

  // Portfolio 테이블에서 해당 포트폴리오 정보 삭제
  const query = 'DELETE FROM Portfolio WHERE id = ?';
  connection.query(query, [id], (err, result) => {
    if (err) {
      console.error('포트폴리오 정보 삭제 에러:', err);
      res.status(500).send('포트폴리오 정보 삭제 중 에러가 발생했습니다.');
      return;
    }
    console.log('포트폴리오 정보 삭제 성공:', result);
    res.redirect('/admin-portfolio-list'); // 삭제 완료 후 포트폴리오 목록 페이지로 리디렉션
  });
});

// 포트폴리오 정보 추가 페이지 라우트
app.get('/admin/portfolio/new', (req, res) => {
  res.render('new-portfolio'); // 포트폴리오 추가 페이지 렌더링
});

// 포트폴리오 정보 추가 처리 라우트
app.post('/admin/portfolio/new', async (req, res) => {
  const { user_id, symbol, quantity } = req.body;

  // Stock 테이블에서 해당 심볼의 가격 가져오기
  const query = 'SELECT price FROM Stock WHERE symbol = ?';
  connection.query(query, [symbol], async (err, results) => {
    if (err) {
      console.error('가격 조회 에러:', err);
      res.status(500).send('가격 조회 중 에러가 발생했습니다.');
      return;
    }

    // 결과가 없으면 해당 심볼이 존재하지 않는 것으로 처리
    if (results.length === 0) {
      console.error('해당 심볼이 존재하지 않습니다.');
      res.status(404).send('해당 심볼이 존재하지 않습니다.');
      return;
    }

    // 데이터베이스에서 가격 가져오기
    const currentPrice = results[0].price;

    // 총 가격 계산
    const totalPrice = currentPrice * quantity;

    // 포트폴리오 추가를 위한 SQL 쿼리
    const insertQuery = 'INSERT INTO Portfolio (user_id, symbol, quantity, total_price) VALUES (?, ?, ?, ?)';
    connection.query(insertQuery, [user_id, symbol, quantity, totalPrice], (insertErr, insertResult) => {
      if (insertErr) {
        console.error('포트폴리오 추가 에러:', insertErr);
        res.status(500).send('포트폴리오 추가 중 에러가 발생했습니다.');
        return;
      }
      console.log('포트폴리오 추가 성공:', insertResult);
      res.redirect('/admin-portfolio-list'); // 포트폴리오 추가 완료 후 포트폴리오 목록 페이지로 리디렉션
    });
  });
});


// 포트폴리오 목록 조회 페이지 라우트
app.get('/admin-portfolio-list', (req, res) => {
  // 데이터베이스에서 모든 포트폴리오 정보를 조회하는 쿼리
  const query = 'SELECT * FROM Portfolio';

  // 쿼리 실행
  connection.query(query, (err, portfolios) => {
    if (err) {
      console.error('포트폴리오 목록 조회 에러:', err);
      res.status(500).send('포트폴리오 목록 조회 중 에러가 발생했습니다.');
      return;
    }

    // 조회된 포트폴리오 정보를 admin-portfolio-list.ejs 템플릿에 전달하여 렌더링
    res.render('admin-portfolio-list', { portfolios: portfolios });
  });
});


app.get('/admin/watchlist', (req, res) => {
  // Watchlist 테이블에서 모든 watchlist 조회
  const query = 'SELECT * FROM Watchlist';
  connection.query(query, (err, watchlists) => {
    if (err) {
      console.error('Watchlist 조회 에러:', err);
      res.status(500).send('Watchlist 조회 중 에러가 발생했습니다.');
      return;
    }
    // 조회된 watchlist 데이터를 템플릿으로 렌더링하여 클라이언트에 전송
    res.render('admin-watchlist', { watchlists: watchlists });
  });
});

app.get('/admin/watchlist/edit/:id', (req, res) => {
  const id = req.params.id;

  // Watchlist 테이블에서 해당 id의 watchlist 정보 조회
  const query = 'SELECT * FROM Watchlist WHERE id = ?';
  connection.query(query, [id], (err, watchlist) => {
    if (err) {
      console.error('Watchlist 조회 에러:', err);
      res.status(500).send('Watchlist 조회 중 에러가 발생했습니다.');
      return;
    }
    // 조회된 watchlist 데이터를 템플릿으로 렌더링하여 클라이언트에 전송
    res.render('edit-watchlist', { watchlist: watchlist[0] });
  });
});


app.post('/admin/watchlist/edit/:id', (req, res) => {
  const id = req.params.id;
  const { user_id, symbol } = req.body;

  // Watchlist 테이블에서 해당 watchlist 정보 업데이트
  const query = 'UPDATE Watchlist SET user_id = ?, symbol = ? WHERE id = ?';
  connection.query(query, [user_id, symbol, id], (err, result) => {
    if (err) {
      console.error('Watchlist 정보 업데이트 에러:', err);
      res.status(500).send('Watchlist 정보 업데이트 중 에러가 발생했습니다.');
      return;
    }
    console.log('Watchlist 정보 업데이트 성공:', result);
    res.redirect('/admin/watchlist'); // 수정 완료 후 watchlist 페이지로 리디렉션
  });
});

app.get('/admin/watchlist/add', (req, res) => {
  res.render('add-watchlist'); // add-watchlist.ejs 페이지를 렌더링하여 클라이언트에게 전송
});


app.post('/admin/watchlist/add', (req, res) => {
  const { user_id, symbol } = req.body;

  // Watchlist 테이블에 새로운 watchlist 추가
  const query = 'INSERT INTO Watchlist (user_id, symbol) VALUES (?, ?)';
  connection.query(query, [user_id, symbol], (err, result) => {
    if (err) {
      console.error('Watchlist 추가 에러:', err);
      res.status(500).send('Watchlist 추가 중 에러가 발생했습니다.');
      return;
    }
    console.log('Watchlist 추가 성공:', result);
    res.redirect('/admin/watchlist'); // 추가 완료 후 watchlist 페이지로 리디렉션
  });
});

app.post('/admin/watchlist/delete/:id', (req, res) => {
  const id = req.params.id;

  // Watchlist 테이블에서 해당 watchlist 삭제
  const query = 'DELETE FROM Watchlist WHERE id = ?';
  connection.query(query, [id], (err, result) => {
    if (err) {
      console.error('Watchlist 삭제 에러:', err);
      res.status(500).send('Watchlist 삭제 중 에러가 발생했습니다.');
      return;
    }
    console.log('Watchlist 삭제 성공:', result);
    res.redirect('/admin/watchlist'); // 삭제 완료 후 watchlist 페이지로 리디렉션
  });
});



// 서버 시작
app.listen(port, () => {
  console.log(`서버 시작: http://localhost:${port}`);
});
