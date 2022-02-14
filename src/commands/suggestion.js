// Dependencies
const { MessageEmbed } = require('discord.js'),
	{ suggestionSchema } = require('../database/models'),
	Command = require('../structures/Command.js');

/**
 * Docs command
 * @extends {Command}
*/
class Suggestion extends Command {
	/**
 	 * @param {Client} client The instantiating client
 	 * @param {CommandData} data The data for the command
	*/
	constructor(bot) {
		super(bot, {
			name: 'suggestion',
			ownerOnly: true,
			dirname: __dirname,
			botPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'ADD_REACTIONS'],
			description: 'Add a suggestion to bot',
			usage: 'suggestion [option] <title> - <description> - <plugin>',
			cooldown: 3000,
			examples: ['suggestion Level reset - Should member levels reset when they leave the server - Economy plugin'],
		});
	}

	/**
	 * Function for recieving message.
	 * @param {bot} bot The instantiating client
 	 * @param {message} message The message that ran the command
 	 * @param {settings} settings The settings of the channel the command ran in
 	 * @readonly
	*/
	async run(bot, message) {
		// Get suggestion channel and role
		const suggestionChannel = bot.channels.cache.get(bot.config.SupportServer.SuggestionChannel);
		const suggestionRole = message.guild.roles.cache.get(bot.config.SupportServer.SuggestionRole);
		if (!suggestionChannel || !suggestionRole) return message.channel.send('Please fill in the neccessary settings');

		// Check the member has the suggestion role
		if (!message.member._roles.includes(suggestionRole.id)) return message.channel.send('You do not have the support role.');

		switch (message.args[0]) {
		case 'add': {
			const words = message.args.join(' ').split('-');
			if (words.length != 3) return message.channel.send('Error');

			// send message
			const title = words[0],
				description = words[1],
				plugin = words[2];

			const embed = new MessageEmbed()
				.setTitle(title)
				.setDescription(description)
				.addField('Category', plugin)
				.setTimestamp()
				.setFooter({ text: `${bot.user.username} suggestions`, iconURL: bot.user.displayAvatarURL() });

			try {
				const msg = await suggestionChannel.send({ embeds: [embed] });
				const suggestionCount = await suggestionSchema.find({}).then(res => res.length);
				const suggestion = new suggestionSchema({
					num: (suggestionCount + 1),
					messageId: msg.id,
					suggestion: description,
				});
				await suggestion.save();
			} catch (err) {
				console.log(err);
				message.channel.send(err.message);
			}
			break;
		}
		case 'edit': {

			break;
		}
		case 'delete':
			break;

		case 'respond': {
			const suggestion = await suggestionSchema.findOne({ num: Number(message.args[1]) });
			if (!suggestion) return message.channel.send('Suggestion not found');
			suggestion.response = message.args.join(' ');
			suggestion.responseOption = 'Accepted';
			const newMessage = await suggestionChannel.messages.fetch(suggestion.messageId);
			const embed = newMessage.embeds[0];
			embed.description = `${embed.description}\nApproved by: ${message.member}\n${suggestion.response}`;
			try {
				await newMessage.edit({ embeds: [embed] });
				await suggestion.save();
			} catch (err) {
				console.log(err);
			}
			break;
		}
		default:
			message.channel.send('Invalid option');
		}
	}
}

module.exports = Suggestion;
