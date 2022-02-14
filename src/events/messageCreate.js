// Dependencies
const { Collection } = require('discord.js'),
	{ GuildSchema } = require('../database/models'),
	Event = require('../structures/Event');

/**
 * Message create event
 * @event Egglord#MessageCreate
 * @extends {Event}
*/
class MessageCreate extends Event {
	constructor(...args) {
		super(...args, {
			dirname: __dirname,
		});
	}

	/**
	 * Function for recieving event.
	 * @param {bot} bot The instantiating client
	 * @param {Message} message The message that ran the command
	 * @readonly
	*/
	async run(bot, message) {

		if (message.author.bot) return;
		const settings = await GuildSchema.findOne({ guildID: message.guild.id });
		console.log(settings);
		console.log(settings.prefix);

		// Check if message was a command
		const args = message.content.split(/ +/);
		if ([settings.prefix, `<@!${bot.user.id}>`].find(p => message.content.startsWith(p))) {
			const command = args.shift().slice(settings.prefix.length).toLowerCase();
			let cmd = bot.commands.get(command) || bot.commands.get(bot.aliases.get(command));
			if (!cmd && message.content.startsWith(`<@!${bot.user.id}>`)) {
				// check to see if user is using mention as prefix
				cmd = bot.commands.get(args[0]) || bot.commands.get(bot.aliases.get(args[0]));
				args.shift();
				if (!cmd) return;
			} else if (!cmd) {
				return;
			}
			message.args = args;

			// Make sure user does not have access to ownerOnly commands
			if (cmd.conf.ownerOnly && !bot.config.ownerID.includes(message.author.id)) {
				if (message.deletable) message.delete();
				return message.channel.send('Nice try').then(m => m.timedDelete({ timeout:5000 }));
			}

			// check permissions
			if (message.guild) {
				// check bot permissions
				let neededPermissions = [];
				cmd.conf.botPermissions.forEach((perm) => {
					if (['SPEAK', 'CONNECT'].includes(perm)) {
						if (!message.member.voice.channel) return;
						if (!message.member.voice.channel.permissionsFor(message.guild.me).has(perm)) {
							neededPermissions.push(perm);
						}
					} else if (!message.channel.permissionsFor(message.guild.me).has(perm)) {
						neededPermissions.push(perm);
					}
				});

				if (neededPermissions.length > 0) {
					bot.logger.error(`Missing permission: \`${neededPermissions.join(', ')}\` in [${message.guild.id}].`);
					if (message.deletable) message.delete();
					return message.channel.error('misc:MISSING_PERMISSION', { PERMISSIONS: neededPermissions.map((p) => message.translate(`permissions:${p}`)).join(', ') }).then(m => m.timedDelete({ timeout: 10000 }));
				}

				// check user permissions
				neededPermissions = [];
				cmd.conf.userPermissions.forEach((perm) => {
					if (!message.channel.permissionsFor(message.member).has(perm)) {
						neededPermissions.push(perm);
					}
				});

				if (neededPermissions.length > 0) {
					if (message.deletable) message.delete();
					return message.channel.error('misc:USER_PERMISSION', { PERMISSIONS: neededPermissions.map((p) => message.translate(`permissions:${p}`)).join(', ') }).then(m => m.timedDelete({ timeout: 10000 }));
				}
			}

			// Check to see if user is in 'cooldown'
			if (!bot.cooldowns.has(cmd.help.name)) {
				bot.cooldowns.set(cmd.help.name, new Collection());
			}

			const now = Date.now();
			const timestamps = bot.cooldowns.get(cmd.help.name);
			const cooldownAmount = (message.author.premium ? cmd.conf.cooldown * 0.75 : cmd.conf.cooldown);

			if (timestamps.has(message.author.id)) {
				const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

				if (now < expirationTime) {
					const timeLeft = (expirationTime - now) / 1000;
					if (message.deletable) message.delete();
					return message.channel.error('events/message:COMMAND_COOLDOWN', { NUM: timeLeft.toFixed(1) }).then(m => m.timedDelete({ timeout:5000 }));
				}
			}

			// run the command
			bot.commandsUsed++;
			if (bot.config.debug) bot.logger.debug(`Command: ${cmd.help.name} was ran by ${message.author.tag}${!message.guild ? ' in DM\'s' : ` in guild: ${message.guild.id}`}.`);
			cmd.run(bot, message, settings);
			timestamps.set(message.author.id, now);
			setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
		}
	}
}

module.exports = MessageCreate;
