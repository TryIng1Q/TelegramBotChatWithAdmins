// Telegraf
const { Telegraf, Scenes, session } = require('telegraf');
const { BaseScene, Stage } = Scenes;
const { Markup } = require('telegraf');

// Database 
const { readDb, writeDb } = require("./dbFunctions");

// Подключение к базе данных
const mysql = require('mysql');
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'oNA2b@9t5237',
  database: 'TelegramBotWithAdmins'
});
// Обработка ошибок подключения
connection.on('error', (err) => {
  console.error('Ошибка базы данных', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    handleDisconnect(); // Переподключение при разрыве соединения
  } else {
    throw err;
  }
});

const databaseMethods = {
  createNewUser(user_info) {
    const sql = "INSERT INTO `users_info` (`chat_id`, `user_tel`, `user_admin`, `question_count`) VALUES ?;";

    console.log(user_info);

    // connection.connect((err) => {
    //   if (err) {
    //     console.error('Ошибка подключения к базе данных:', err.stack);
    //     return false;
    //   }
    //   console.log('Подключено к базе данных MySQL.');
    // });

		return connection.query(sql, [[user_info]], function(err, result) {
			if (err) {
				console.log('Ошибка добавления нового клиента строка', err);
				return false;
			};
			
			return true;
		});
  },
  getUserInfo(user_tel) {
		const sql = `SELECT * FROM users_info WHERE user_tel = ${user_tel}`;

		return new Promise((resolve, reject) => {
			connection.query(sql, function(err, result) {
				if (err) {
						reject(err);
				};

				resolve(result);
			});
		});
	},
  setChatIDToUser(user_chat_ID, user_tel) {
		const sql = `UPDATE users_info SET chat_id = ${user_chat_ID} WHERE user_tel = ${user_tel};`;

		return connection.query(sql, function(err, result) {
			if (err) {
				console.log('Ошибка не удалось привязать user к chat_id', err);
				return false;
			};
			
			return true;
		});
	},
  checkUserAuthorization(user_chat_ID) {
    const query = 'SELECT COUNT(*) as count FROM users_info WHERE chat_id = ?';

    return new Promise((resolve, reject) => {
      connection.query(query, [user_chat_ID], (err, results) => {
        if (err) {
          console.error('Ошибка при выполнении запроса:', err.message);
          return;
        }
      
        if (results[0].count > 0) {
          resolve(true);
        } else {
          resolve(false);
        };
      });
		});
  },
  loginExist(user_tel) {
    const query = 'SELECT COUNT(*) as count FROM users_info WHERE user_tel = ?';

    return new Promise((resolve, reject) => {
      connection.query(query, [user_tel], (err, results) => {
        if (err) {
          console.error('Ошибка при выполнении запроса:', err.message);
          return;
        }
      
        if (results[0].count > 0) {
          reject(true);
        } else {
          resolve(false);
        }
      });
    });
  },
  getUserAdmin(user_chat_ID) {
    const query = 'SELECT user_admin FROM users_info WHERE chat_id = ? LIMIT 1';

    return new Promise((resolve, reject) => {
      connection.query(query, [user_chat_ID], (err, results) => {
        if (err) {
          console.error('Ошибка при выполнении запроса:', err.message);
          reject(false);
        }
      
        if (results.length > 0) {
          resolve(results[0].user_admin);
        } else {
          reject(false);
        };
			});
		});
  },
  reconnectDatabase() {
    setInterval(() => {
      console.log('Повторное соединение с базой данных');
  
      mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'oNA2b@9t5237',
        database: 'TelegramBotWithAdmins'
      });
    }, 2000000);
  },
};

// Bot
bot = new Telegraf('7197566941:AAFEi_OATOQ-JfjMkwIGdX1PmWGybbaTmzM');
const botMethods = {
  sendAdminAnswer(ctx, answerType) {
    const userInfo = (ctx.message.reply_to_message.text).split('\n');
    const chatID = userInfo[userInfo.length - 1].split(' ')[0];
    const replyToMessageID = userInfo[userInfo.length - 1].split(' ')[1];

    if (answerType === 'audio') {
      ctx.replyWithAudio(ctx.message.voice.file_id, {
        chat_id: chatID,
        reply_to_message_id: replyToMessageID
      });
    } else if (answerType === 'text') { 
      ctx.reply(ctx.message.text, {
        chat_id: chatID,
        reply_to_message_id: replyToMessageID
      });
    }
  },
};

// Bot Scenes
const SceneCreate = {
  registerUserTel() {
    const registrationTel = new BaseScene('REGISTER_TEL');

		registrationTel.enter(async(ctx) => {
      await ctx.reply('Введите номер телефона нового пользователя');
		});

    registrationTel.on('text', async(ctx) => {
      if (Number(ctx.message.text) && (ctx.message.text).length === 11) {
        const adminsInfo = readDb('./database/admin_info.json');
        const currentAdmin = adminsInfo.currentAdmin;

        const serverAnswer = databaseMethods.createNewUser([0, ctx.message.text, String(adminsInfo[currentAdmin].chat_id), 10]);
        
        if (serverAnswer) {
          if (adminsInfo.adminCount === currentAdmin) {
            adminsInfo.currentAdmin = 1;
          } else {
            adminsInfo.currentAdmin += 1;
          };
  
          // writeDb(adminsInfo, './database/admin_info.json');
        };
      } else {
        await ctx.reply('Вы ввели не правильный формат телефона');
        await ctx.scene.leave();
      };
		});

		return registrationTel;
  },
  registerUserPass() {
    const registrationPass = new BaseScene('REGISTER_PASS');

		registrationPass.enter(async(ctx) => {
      await ctx.reply('Введите пароль нового пользователя');
		});

    registrationPass.on('text', async(ctx) => {
      if ((ctx.message.text).length < 20) {
        const adminsInfo = readDb('./database/admin_info.json');
        const currentAdmin = adminsInfo.currentAdmin;

        ctx.session.current_pass = ctx.message.text;

        const serverAnswer = databaseMethods.createNewUser([0, ctx.session.current_tel, ctx.session.current_pass, String(adminsInfo[currentAdmin].chat_id), 10]);

        if (serverAnswer) {
          if (adminsInfo.adminCount === currentAdmin) {
            adminsInfo.currentAdmin = 1;
          } else {
            adminsInfo.currentAdmin += 1;
          };
  
          // writeDb(adminsInfo, './database/admin_info.json');
        };
      } else {
        await ctx.reply('Вы ввели слишком длинный пароль');
        await ctx.scene.leave();
      };
		});

		return registrationPass;
  },
  loginTelScene() {
    const loginTel = new BaseScene('LOGIN_TEL');

		loginTel.enter(async(ctx) => {
      await ctx.reply('Введите ваш номер телефона в формате 7777777777');
		});

    loginTel.on('text', async(ctx) => {
      // const loginExist = await databaseMethods.loginExist(ctx.message.text);

      if (Number(ctx.message.text) && (ctx.message.text).length === 11) {
        const serverAnswer = await databaseMethods.getUserInfo(ctx.message.text);
        console.log(serverAnswer);

        if (serverAnswer.length === 0) {
          await ctx.reply('Аккаунта с вашим номером не существует');
          await ctx.scene.leave();
        } else {
          // ctx.session.current_user = serverAnswer[0];
          databaseMethods.setChatIDToUser(ctx.chat.id, ctx.message.text);

          await ctx.reply('Вы вошли в аккаунт');
          await ctx.scene.leave();
        };
      } else {
        await ctx.reply('Вы ввели не правильный формат телефона');
        await ctx.scene.leave();
      };
		});

		return loginTel;
  },
  loginPassScene() {
    const loginPass = new BaseScene('LOGIN_PASS');

		loginPass.enter(async(ctx) => {
      await ctx.reply('Введите пароль');
		});

    loginPass.on('text', async(ctx) => {
      console.log(ctx.session.current_user.user_pass);

      if (ctx.message.text === ctx.session.current_user.user_pass) {
        databaseMethods.setChatIDToUser(ctx.chat.id, ctx.session.current_user.user_tel);

        await ctx.reply('Вы вошли в аккаунт');
      } else {
        await ctx.reply('Вы ввели не правильный пароль');
      };
      await ctx.scene.leave();
		});

		return loginPass;
  },
  askQuestionScene() {
		const askQuestion = new BaseScene('ASK_QUESTION');

		askQuestion.enter(async(ctx) => {
      await ctx.reply('Ваша следующие сообщение будет считаться за вопрос');
		});

    askQuestion.on('text', async(ctx) => {
      const userAdmin = await databaseMethods.getUserAdmin(ctx.chat.id);
      
      if (userAdmin) {
        await ctx.reply(`
Вопрос: ${ctx.message.text}

-------------------------------
${ctx.message.chat.id} ${ctx.message.message_id}
      `, {chat_id: userAdmin});
        
        await ctx.scene.leave();
      } 
      await ctx.scene.leave();
		});

		askQuestion.leave(async(ctx) => {
      await ctx.reply('Ответ на ваш вопрос прийдет в течение 20-30 минут');
		});

		return askQuestion;
  },
};
const askQuestionScene = SceneCreate.askQuestionScene();
const registerUserTel = SceneCreate.registerUserTel();
// const registerUserPass = SceneCreate.registerUserPass();
const loginTelScene = SceneCreate.loginTelScene();
const loginPassScene = SceneCreate.loginPassScene();
const stage = new Stage([askQuestionScene, registerUserTel, loginTelScene, loginPassScene]);

bot.use(session());
bot.use(stage.middleware());



// Bot events
bot.command('start', async(ctx) => {
  await ctx.reply(`Добро пожаловать в чат-бота! \nИспользуйте меню для навигации`, Markup
    .keyboard([
      ['🟢 Зайти в аккаунт'],
      // ['🔵 Задать вопрос']
    ])
    .resize()
  );
});
bot.command('create_new_user', async(ctx) => {
  if (ctx.chat.id === 934870703 || ctx.chat.id === 319439576) {
		await ctx.scene.enter('REGISTER_TEL');
	} else {
		await ctx.reply('Вам не доступна эта команда');
	};
});
bot.hears('🟢 Зайти в аккаунт', async(ctx) => {
  const serverAnswer = await databaseMethods.checkUserAuthorization(ctx.chat.id);
  console.log(serverAnswer);

  if (serverAnswer) {
    await ctx.reply('Вы уже прошли регистрацию');
  } else {
    await ctx.scene.enter('LOGIN_TEL');
  }
});
bot.hears('🔵 Задать вопрос', async(ctx) => {
  await ctx.scene.enter('ASK_QUESTION');
});
bot.on('text', async(ctx) => {
	if (ctx.message.chat.id === 934870703 && ctx.message.reply_to_message) {
    bot.telegram.deleteMessage(ctx.chat.id, ctx.message.reply_to_message.message_id).catch(error => {
			console.log(`Не удалось удалить сообщение - ${error}`);
		});

    botMethods.sendAdminAnswer(ctx, 'text');
	} else {
    const userAdmin = await databaseMethods.getUserAdmin(ctx.chat.id);
      
    if (userAdmin) {
      await ctx.reply(`
Вопрос: ${ctx.message.text}

-------------------------------
${ctx.message.chat.id} ${ctx.message.message_id}
    `, {chat_id: userAdmin});
    } 
  };
});
bot.on('voice', async(ctx) => {
	if (ctx.message.chat.id === 934870703 && ctx.message.reply_to_message) {
    bot.telegram.deleteMessage(ctx.chat.id, ctx.message.reply_to_message.message_id).catch(error => {
			console.log(`Не удалось удалить сообщение - ${error}`);
		});

    botMethods.sendAdminAnswer(ctx, 'audio');
	};
});

databaseMethods.reconnectDatabase();
bot.launch();