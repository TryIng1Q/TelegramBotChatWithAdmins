const bot = require('./bot.js');
const { reconnectDatabase } = require('./sql.js');

reconnectDatabase();
bot.launch();