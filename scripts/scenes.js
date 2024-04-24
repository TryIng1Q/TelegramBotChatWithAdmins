// DataBase 
const { readDb, writeDb } = require("./dbFunctions");

// SQL methods
const { createNewUser, getUserInfo, setChatIDToUser, getUserInfoByChatID } = require('./sql.js');

// Scenes
const { Scenes} = require('telegraf');
const { BaseScene } = Scenes;


// Bot methods
const botMethods = require('./botMethods.js');


const myScenes = {
	addNewUser() {
		const newUserScene = new BaseScene('ADD_NEW_USER');
		newUserScene.enter((ctx) => ctx.reply('Введите телефон нового пользователя'));

		newUserScene.on('text', async (ctx) => {
			if ((ctx.message.text).length === 11) {
				ctx.session.tel = ctx.message.text;
				await ctx.scene.enter('SET_USER_PASSWORD');
			} else {
				await ctx.reply('Телефонный номер должен содержать ровно 11 символов');

				await ctx.scene.reenter();
			}
		});

		return newUserScene;
	},
	setNewUserPassword() {
		const setPasswordScene = new BaseScene('SET_USER_PASSWORD');

		setPasswordScene.enter((ctx) => ctx.reply(`Введите пароль для пользователя с телефоном ${ctx.session.tel}`));

		setPasswordScene.on('text', async (ctx) => {
			// Запрос на данные админов чтобы выбрать админа пользователю
			const adminsInfo = readDb('data_base/adminsInfo.json')[0];
			let {adminCount, currentAdmin} = adminsInfo;

			// Добавление нового пользователя
			const currentDate = new Date();

			const serverAwswer = createNewUser([
				0, 
				Number(ctx.session.tel), 
				'name', 
				`${currentDate.getDate()} ${currentDate.getMonth()} ${currentDate.getFullYear()}`,
				adminsInfo[currentAdmin].chat_id,
				adminsInfo[currentAdmin].admin_name,
				0,
				10,
				ctx.message.text
			]);

			// Смена админа
			if (currentAdmin + 1 > adminCount) currentAdmin = 1;
			else currentAdmin += 1;

			adminsInfo.currentAdmin = currentAdmin;
			writeDb([adminsInfo], 'data_base/adminsInfo.json');


			if (serverAwswer) {
				await ctx.reply('Новый пользователь зарегестрирован');
			} else {
				await ctx.reply('Что то пошло не так, попробуйте позже');
			}

			await ctx.scene.leave();
		});

		return setPasswordScene;
	},
	loginUser() {
		const loginScene = new BaseScene('LOGIN_USER');
		loginScene.enter((ctx) => ctx.reply('Телефон нөміріңізді 77767713172 форматында енгізіңіз'));

		loginScene.on('text', async (ctx) => {
			const serverAnswer = await getUserInfo(ctx.message.text);

			if (serverAnswer === undefined) {
				ctx.reply('Сіз дұрыс емес нөмірді енгізген сияқтысыз');

				ctx.scene.leave();
			} else {
				ctx.session.currentUser = serverAnswer;

				await ctx.scene.enter('SET_USER_PASS');
			};
		});

		return loginScene;
	},
	passwordUser() {
		const setPasswordScene = new BaseScene('SET_USER_PASS');

		setPasswordScene.enter((ctx) => ctx.reply('Құпия сөзді енгізіңіз'));

		setPasswordScene.on('text', async (ctx) => {
			if (ctx.message.text === ctx.session.currentUser.pass) {
				// Привязка аккаунта к chat_id
				const serverAnswer = await setChatIDToUser(ctx.chat.id, ctx.session.currentUser.tel_id);

				if (serverAnswer) {
					const questionForm = await ctx.reply('Сіз есептік жазбаға сәтті кірдіңіз', {
						reply_markup: {
								inline_keyboard: [ [{ text: "Сұрақ қою ↩", callback_data: "question-btn" }] ]
						},
						chat_id: ctx.chat.id,
					});

					bot.action('question-btn', async (ctx) => {
						bot.telegram.deleteMessage(questionForm.chat.id, questionForm.message_id).catch(error => {
							console.log(`Не удалось удалить кнопку question - ${error}`);
						});

						await ctx.scene.enter('GET_QUESTION');
					});
				} else {
					ctx.reply('Бірдеңе дұрыс болмады, кейінірек көріңіз');
				};
			} else {
				ctx.reply('Құпия сөз сәйкес келмейді');

				ctx.scene.leave();
			};
		});

		return setPasswordScene;
	},
	getQuestionScene() {
		// Создание сцены
		const questionScene = new BaseScene('GET_QUESTION');
		questionScene.enter((ctx) => ctx.reply('Сіздің келесі хабарламаңыз сұраққа есептеледі'));

		questionScene.on('text', async (ctx) => {
			const userInfo = await getUserInfoByChatID(ctx.chat.id);
			
			const adminsInfo = readDb('data_base/adminsInfo.json')[0];
			await ctx.reply(`Сіздің сұрағыңызға ${userInfo.admin_name} жауап береді. Жауап 10-20 минут ішінде келеді.`);


			botMethods.resendToAdmin(ctx, userInfo.admin_id);

			ctx.scene.leave();
		});

		return questionScene;
	},
};

module.exports = {myScenes: myScenes};