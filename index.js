// Telegraf
const { Telegraf, Scenes, session } = require('telegraf');
const { BaseScene, Stage } = Scenes;


// DataBase 
const { readDb } = require("./dbFunctions");
const { writeDb } = require("./dbFunctions");


// Admins info
const ChatAdmins = readDb('dataBase/adminsInfo.json')[0];
let currentAdminInfo = ChatAdmins[ChatAdmins.currentAdmin];
let oldAdminInfo;
let oldAdminID = 1;
console.log(currentAdminInfo);


// Bot
const bot = new Telegraf('7197566941:AAFEi_OATOQ-JfjMkwIGdX1PmWGybbaTmzM');
const botMethods = {
	async sendAnswer(ctx) {
		const chatReplyInfo = (ctx.message.reply_to_message.text).split('\n');
		const chatID = chatReplyInfo[chatReplyInfo.length - 1].split(' ')[1];
		const replyToMessageID = chatReplyInfo[chatReplyInfo.length - 1].split(' ')[2];

		console.log(`Ответ админа >>> ${ctx.message.text}`);
		console.log(`Пользователь который получит ответ >>> ${chatID}`);

		
		ctx.sendMessage(ctx.message.text, {
			chat_id: chatID,
			reply_to_message_id: replyToMessageID
		});
	},
	async sendRatingQuestion(ctx) {
		const chatReplyInfo = (ctx.message.reply_to_message.text).split('\n');
		const chatID = chatReplyInfo[chatReplyInfo.length - 1].split(' ')[1];

		let btnRandomID = this.makeID();
		let userEstimation = await ctx.reply(`Сіз бұл жауапты пайдалы деп санайсыз ба ?`, { 
			reply_markup: {
				inline_keyboard: [
					[
						{ text: "Көмектесті 👍", callback_data: `btn-success-${btnRandomID}` },
						{ text: "Көмектеспеді 👎", callback_data: `btn-fail-${btnRandomID}` },
					],
				]
			},
			chat_id: chatID,
		});

		bot.action(`btn-success-${btnRandomID}`, async() => {
			bot.telegram.deleteMessage(userEstimation.chat.id, userEstimation.message_id).catch(error => {
				console.log(`Ошибка - ${error}`);
			});

			const newQuestionBtn = await ctx.reply(`Бағалағаныңыз үшін рахмет. Біз сізге көмектесе алғанымызға қуаныштымыз`, {
				reply_markup: {
					inline_keyboard: [
						[
							{ text: "Тағы бір сұрақ қойыңыз ↩", callback_data: `btn-question-${btnRandomID}` },
						],
					]
				},
				chat_id: chatID}
			);
		
			bot.action(`btn-question-${btnRandomID}`, async(ctx) => {
				bot.telegram.deleteMessage(newQuestionBtn.chat.id, newQuestionBtn.message_id).catch(error => {
					console.log(`Ошибка - ${error}`);
			});
		
				ctx.scene.enter('GET_QUESTION');
				delete `btn-question-${btnRandomID}`;
			});

			delete `btn-success-${btnRandomID}`;
		});

		bot.action(`btn-fail-${btnRandomID}`, async() => {
			bot.telegram.deleteMessage(userEstimation.chat.id, userEstimation.message_id).catch(error => {
				console.log(`Ошибка - ${error}`);
			});


			// Админу засчитывается неудачная попытка
			oldAdminInfo.adminBadReviews.push({
				"chat_id": chatID,
				"question": chatReplyInfo[2],
				"answer": ctx.message.text,
			});

			console.log(ChatAdmins[oldAdminID]);
			ChatAdmins[oldAdminID] = oldAdminInfo;
			writeDb([ChatAdmins], 'dataBase/adminsInfo.json');

			if (ChatAdmins[oldAdminID].adminBadReviews.length >= 4) {
				bot.telegram.sendMessage(934870703, `Ответы админа ${ChatAdmins[oldAdminID].admin_name} не помогли 4 раза`);
			};


			const newQuestionBtn = await ctx.reply(`Жауап сізге көмектеспегені үшін кешірім сұраймыз, келесі сұрағыңызға жауап беруге тырысамыз`, {
				reply_markup: {
					inline_keyboard: [
						[
							{ text: "Тағы бір сұрақ қойыңыз ↩", callback_data: `btn-question-${btnRandomID}` },
						],
					]
				},
				chat_id: chatID}
			);
		
			bot.action(`btn-question-${btnRandomID}`, async(ctx) => {
				bot.telegram.deleteMessage(newQuestionBtn.chat.id, newQuestionBtn.message_id).catch(error => {
					console.log(`Ошибка - ${error}`);
				});

		
				ctx.scene.enter('GET_QUESTION');
				delete `btn-question-${btnRandomID}`;
			});

			delete `btn-fail-${btnRandomID}`;
		});
	},
	async resendToAdmin(ctx) {
		ctx.telegram.sendMessage(currentAdminInfo.chat_id, `
Имя: ${ctx.message.from.first_name}

Вопрос: ${ctx.message.text}

UserInfo: ${ctx.message.chat.id} ${ctx.message.message_id}
		`);
	},
	makeID() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < 30) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
	},
};
const SceneCreate = {
	getQuestionScene() {
		// Создание сцены
		const questionScene = new BaseScene('GET_QUESTION');
		questionScene.enter((ctx) => ctx.reply('Сіздің келесі хабарламаңыз сұраққа есептеледі.'));

		questionScene.on('text', async (ctx) => {
			oldAdminInfo = currentAdminInfo;
			oldAdminID = ChatAdmins.currentAdmin;

			await ctx.reply(`Сіздің сұрағыңызға ${currentAdminInfo.admin_name} жауап береді. Жауап 10-20 минут ішінде келеді.`);

			botMethods.resendToAdmin(ctx);

			// Change Admin
			if (ChatAdmins.currentAdmin + 1 > ChatAdmins.adminCount) {
				ChatAdmins.currentAdmin = 1;
			} else {
				ChatAdmins.currentAdmin += 1;
			};
			currentAdminInfo = ChatAdmins[ChatAdmins.currentAdmin];
			writeDb([ChatAdmins], 'dataBase/adminsInfo.json');

			ctx.scene.leave();
		});

		return questionScene;
	},
};


// Scene init
const questionScene = SceneCreate.getQuestionScene();
const stage = new Stage([questionScene]);

bot.use(session());
bot.use(stage.middleware());


// Bot init
bot.command('start', async(ctx) => {
	let btnRandomID = botMethods.makeID();

	const questionBtnInfo = await ctx.reply('Ережелер', { 
		reply_markup: {
			inline_keyboard: [
				[
					{ text: "Бірінші сұрағыңызды қойыңыз ↩", callback_data: `start-btn-question-${btnRandomID}` },
				],
			]
		},
		chat_id: ctx.chat.id,
	});

	bot.action(`start-btn-question-${btnRandomID}`, async(ctx) => {
		bot.telegram.deleteMessage(questionBtnInfo.chat.id, questionBtnInfo.message_id).catch(error => {
			console.log(`Ошибка - ${error}`);
		});

		ctx.scene.enter('GET_QUESTION');

		delete `start-btn-question-${btnRandomID}`;
	});
});
bot.on('message', async(ctx) => {
	if ((ctx.message.chat.id === 934870703 || ctx.message.chat.id === 870643619 || ctx.message.chat.id === 319439576) && ctx.message.reply_to_message) {
		botMethods.sendAnswer(ctx);
		setTimeout(() => {
			botMethods.sendRatingQuestion(ctx);
		}, 1000);
	} else {
		botMethods.resendToAdmin(ctx);
	};
});

bot.launch();
