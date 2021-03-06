const { prefix } = require('../config.json');
module.exports = {
	name: 'help',
	description: 'List all of my commands or info about a specific command.',
	aliases: ['commands'],
	usage: `\`!help [...command]\``,
	execute(message, args) {
		const { commands } = message.client;
		const invalid = [];

		if (!args.length) {
			const data = [];
			data.push('Here\'s a list of all my commands:');
			data.push(commands.map(command => command.name).join(', '));
			data.push(`\nYou can send \`${prefix}help [command name]\` to get info on a specific command!`);

			return message.author.send(data, { split: true })
				.then(() => {
					if (message.channel.type === 'dm') return;
					message.reply('I\'ve sent you a DM with all my commands!');
				})
				.catch(error => {
					console.error(`Could not send help DM to ${message.author.tag}.\n`, error);
					message.reply('it seems like I can\'t DM you! Do you have DMs disabled?');
				});
		}
		
		for (let arg of args) {
			const data = [];
			const name = arg.toLowerCase();
			const command = commands.get(name) || commands.find(c => c.aliases && c.aliases.includes(name));
			
			if (!command) {
				invalid.push(`\n **WARNING: ${name} is not a valid command!**\n`);
				continue;
			}

			data.push(`\n**Name:** ${command.name}`);

			if (command.aliases) data.push(`**Aliases:** ${command.aliases.join(', ')}`);
			if (command.description) data.push(`**Description:** ${command.description}`);
			if (command.usage) data.push(`**Usage:** ${prefix}${command.name}\n  ${command.usage}`);

			data.push(`**Cooldown:** ${command.cooldown || 3} second(s)\n`);
			message.channel.send(data, { split: true });
		}
		if (!invalid) {
			message.channel.send(invalid, { split: true });
		}
	},
};
