import mysql from 'mysql2/promise';
const db = await mysql.createConnection({ uri: process.env.MYSQL_TEST_URL, multipleStatements: true });
const q = async (s, p) => { try { const [r] = await db.query(s, p); return r; } catch (e) { return 'ERR ' + e.code + ' ' + e.sqlState + ' ' + e.message; } };
console.log(await q('SELECT VERSION() v, @@sql_mode m'));
console.log(await q(`CREATE TABLE _p (id INT PRIMARY KEY, r VARCHAR(20) NOT NULL, b BOOLEAN, j JSON, d DATE NOT NULL DEFAULT (CURRENT_DATE), s INT NULL);
CREATE TRIGGER _p_bi BEFORE INSERT ON _p FOR EACH ROW BEGIN
  DECLARE v INT;
  IF NEW.r IS NULL THEN SET NEW.r = CONCAT('X-', YEAR(NEW.d)); END IF;
  IF NEW.s IS NULL THEN SET NEW.s = (SELECT COALESCE(MAX(s),0)+1 FROM _p); END IF;
END;
CREATE TRIGGER _p_bi2 BEFORE INSERT ON _p FOR EACH ROW FOLLOWS _p_bi BEGIN
  IF NEW.id = 99 THEN SIGNAL SQLSTATE '42501' SET MESSAGE_TEXT = 'Maliyet ve kâr alanlarını yalnız yönetici yazabilir (x)'; END IF;
END;
SELECT 1;`));
console.log(await q('INSERT INTO _p (id, b, j) VALUES (1, 1, \'{"a":[1,2]}\')'));
console.log(await q('INSERT INTO _p (id, r, b) VALUES (2, NULL, 0)'));
console.log(await q('INSERT INTO _p (id) VALUES (99)'));
console.log(await q(`SELECT r, d, s, JSON_OBJECT('b', b, 'b2', IF(b, TRUE, FALSE), 'b3', b IS TRUE, 'j', j, 'j2', JSON_EXTRACT(j,'$'), 'j3', JSON_QUERY(j,'$'), 'n', CAST(1.50 AS DECIMAL(10,2)), 'jnull', JSON_EXTRACT(NULL,'$'), 'bt', IF(b, JSON_EXTRACT('true','$'), JSON_EXTRACT('false','$'))) o FROM _p`));
console.log(await q('DROP TABLE _p'));
await db.end();
