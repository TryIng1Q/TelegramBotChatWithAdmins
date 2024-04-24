// Data Base
const mysql = require('mysql');

const conn = mysql.createConnection({
	host: 'localhost',
  user: 'root',
  password: 'oNA2b@9t5237',
  database: 'TelegramBotWithAdmins'
});
conn.connect((err) => {
	if (err) {
		console.log('Error connecting:'+ err);
	} else {
		console.log('Connected!');
	};
});

const dataBaseMethods = {
	connect() {
		mysql.createConnection({
			host: 'localhost',
			user: 'root',
			password: '',
			database: 'TelegramBotDataBase'
		});
	},
	closeConnect() {
		conn.end((err) => {
      if (err) {
        return console.log('Error connecting:'+ err);
      } else {
        console.log('Connected!');
      };
    });
	},
	createNewUser(userInfo) {
		console.log(userInfo);
		const sql = "INSERT INTO `UsersInfo` (`chat_id`, `tel_id`, `name`, `activation_date`, `admin_id`, `admin_name`, `admin_fail`, `question_count`, `pass`) VALUES ?;";

		return conn.query(sql, [[userInfo]], function(err, result) {
			if (err) {
				console.log('Ошибка добавления нового клиента строка 29', err);
				return false;
			};
			
			return true;
		});
	},
	getUserInfo(userTel) {
		const sql = `SELECT * FROM UsersInfo WHERE tel_id = ${userTel}`;

		return new Promise((resolve, reject) => {
			conn.query(sql, function(err, result) {
				if (err) {
						reject(err);
				};

				resolve(result[0]);
			});
		});
	},
	getUserInfoByChatID(userChatID) {
		const sql = `SELECT * FROM UsersInfo WHERE chat_id = ${userChatID}`;

		return new Promise((resolve, reject) => {
			conn.query(sql, function(err, result) {
				if (err) {
						reject(err);
				};

				resolve(result[0]);
			});
		});
	},
	setChatIDToUser(userChatID, userTel) {
		const sql = `UPDATE UsersInfo SET chat_id = ${userChatID} WHERE tel_id = ${userTel};`;

		return conn.query(sql, function(err, result) {
			if (err) {
				console.log('Ошибка не удалось привязать user к chat_id', err);
				return false;
			};
			
			return true;
		});
	},
	changeAdminFail(userChatID, failCount) {
		const sql = `UPDATE UsersInfo SET admin_fail = ${failCount} WHERE chat_id = ${userChatID};`;

		return conn.query(sql, function(err, result) {
			if (err) {
				console.log('Ошибка не удалось привязать user к chat_id', err);
				return false;
			};
			
			return true;
		});
	},
	changeAdmin(chatID, adminID, adminName) {
		const sql = `UPDATE UsersInfo SET admin_id = ${adminID}, admin_name = '${adminName}' WHERE chat_id = ${chatID};`;

		return conn.query(sql, function(err, result) {
			if (err) {
				console.log('Ошибка не удалось привязать user к chat_id', err);
				return false;
			};
			
			return true;
		});
	},
};



// Export
module.exports = {
	createNewUser: dataBaseMethods.createNewUser,
	getUserInfo: dataBaseMethods.getUserInfo,
	setChatIDToUser: dataBaseMethods.setChatIDToUser,
	getUserInfoByChatID: dataBaseMethods.getUserInfoByChatID,
	changeAdminFail: dataBaseMethods.changeAdminFail,
	changeAdmin: dataBaseMethods.changeAdmin,
};