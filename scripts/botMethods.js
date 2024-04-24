// Import SQL methods
const { getUserInfoByChatID, changeAdminFail, changeAdmin } = require('./sql.js');

// DataBase 
const { readDb, writeDb } = require("./dbFunctions");

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
						{ text: "Иа 👍", callback_data: `btn-success-${btnRandomID}` },
						{ text: "Жоқ 👎", callback_data: `btn-fail-${btnRandomID}` },
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

			const currentUser = await getUserInfoByChatID(chatID);
			
			if (currentUser.admin_fail >= 2) {
				const adminsTable = {
					'756191020': 1,
				};

				let currentAdmin;
				const adminsInfo = readDb('data_base/adminsInfo.json')[0];
				
				if (adminsTable[currentUser.admin_id] + 1 > adminsInfo.adminCount) {
					currentAdmin = adminsInfo['1'];
				} else {
					currentAdmin = adminsInfo[adminsTable[currentUser.admin_id] + 1];
				}

				await ctx.reply(`В связи с вашими отзывами мы сменили админа на ${currentAdmin.admin_name}`, {chat_id: chatID});

				changeAdmin(chatID, currentAdmin.chat_id, currentAdmin.admin_name);
				changeAdminFail(chatID, 0);
			} else {
				changeAdminFail(chatID, currentUser.admin_fail + 1);
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
			});
		});
	},
	async resendToAdmin(ctx, adminID) {
		ctx.telegram.sendMessage(adminID, `
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


module.exports = botMethods;