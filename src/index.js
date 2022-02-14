// Dependencies
const { Client, Collection } = require('discord.js'),
	{ token } = require('./config'),
	bot = new Client({ intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS' ] }),
	{ promisify } = require('util'),
	readdir = promisify(require('fs').readdir),
	path = require('path');

// Load commands
(async () => {
	bot.aliases = new Collection();
	bot.commands = new Collection();
	bot.interactions = new Collection();
	bot.cooldowns = new Collection();
	bot.logger = require('./utils').logger;
	bot.config = require('./config');
	bot.mongoose = require('./database');
	// load commands
	await loadCommands();

	// load events
	await loadEvents();

	bot.login(token).catch(e => bot.logger.error(e.message));
})();

// load commands
async function loadCommands() {
	const commands = (await readdir('./src/commands/')).filter((v, i, a) => a.indexOf(v) === i);
	bot.logger.log(`=-=-=-=-=-=-=- Loading commands(s): ${commands.length} -=-=-=-=-=-=-=`);

	// Loop through each file loading into bot.commands
	for (const command of commands) {
		const cmd = new (require(`./commands/${command}`))(bot);
		bot.logger.log(`Loading Command: ${cmd.help.name}.`);
		bot.commands.set(cmd.help.name, cmd);
		cmd.help.aliases.forEach((alias) => {
			bot.aliases.set(alias, cmd.help.name);
		});
	}
}

// load events
async function loadEvents() {
	const events = await readdir('./src/events/');
	bot.logger.log(`=-=-=-=-=-=-=- Loading events(s): ${events.length} -=-=-=-=-=-=-=`);

	for (const file of events) {
		delete require.cache[file];
		const { name } = path.parse(file);
		const event = new (require(`./events/${file}`))(bot, name);
		bot.logger.log(`Loading Event: ${name}`);
		bot.on(name, (...args) => event.run(bot, ...args));
	}
}
