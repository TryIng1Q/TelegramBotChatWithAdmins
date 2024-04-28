// Telegraf
const { Telegraf, Scenes, session } = require('telegraf');
const { Stage } = Scenes;

// Bot
global.bot = new Telegraf('7197566941:AAFEi_OATOQ-JfjMkwIGdX1PmWGybbaTmzM');
bot.telegram.setMyCommands([
  {
    command: 'create_new_user',
    description: 'Создать пользователя',
  },
  {
    command: 'start',
    description: 'Зайти в аккаунт',
  },
	{
		command: 'question',
		description: 'Задать вопрос',
	},
]);
// Bot methods
const botMethods = require('./botMethods.js');

// Scenes init
const { myScenes } = require('./scenes.js');

const addNewUserScene = myScenes.addNewUser();
const setUserPassword = myScenes.setNewUserPassword();
const loginUserScene = myScenes.loginUser();
const setUserNameScene = myScenes.passwordUser();
const questionScene = myScenes.getQuestionScene();
const stage = new Stage([addNewUserScene, loginUserScene, setUserPassword, setUserNameScene, questionScene]);



bot.use(session());
bot.use(stage.middleware());

// Bot Commands
bot.command('create_new_user', async (ctx) => {
	if (ctx.chat.id === 934870703 || ctx.chat.id === 319439576) {
		await ctx.scene.enter('ADD_NEW_USER');
	} else {
		await ctx.reply('Вам не доступна эта команда');
	};
});
bot.command('start', async (ctx) => {
	// Создание кнопки для авторизации в аккаунт
	const loginForm = await ctx.reply('Жұмысты бастау үшін төмендегі кнопканы басыңыз👇', {
		reply_markup: {
				inline_keyboard: [ [{ text: "Жұмысты бастау ↩", callback_data: "login-btn" }] ]
		}
	});

	// Обработчик событий для кнопки
	bot.action('login-btn', async (ctx) => {
		// Удаление формы входа
		bot.telegram.deleteMessage(loginForm.chat.id, loginForm.message_id).catch(error => {
			console.log(`Не удалось удалить кнопку login - ${error}`);
		});

		// Подключение сцены входа
		await ctx.scene.enter('LOGIN_USER');
	});
});
bot.command('question', async (ctx) => {
	await ctx.scene.enter('GET_QUESTION');
});

bot.on('message', async (ctx) => {
	if (ctx.message.chat.id === 756191020 && ctx.message.reply_to_message) {
		await botMethods.sendAnswer(ctx);
		setTimeout(async() => {
			await botMethods.sendRatingQuestion(ctx);
		}, 1000);
	}
});


// Export
module.exports = bot;