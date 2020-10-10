const record = require('./record.js');
module.exports = {
	name: 'stop',
    description: 'Command the bot to stop recording or leave the voice channel.',
    aliases: ['leave','停止录音'],
    args: false,
	usage: `The command is guild only. And it only works while the bot is in a voice channel. For more usage information, look up the \`record\` command.`,
    guildOnly: true,
	execute(message, args) {
        const guildId = message.guild.id;
        const guildName = message.guild.name;
        const voiceChannel = record.getChannel(guildId);

        if (record.getRecordStatus(guildId)) {
            record.manualStopRecord(message);
            console.log('停止录音:',guildName, voiceChannel.name);
            return;
        }

        if (voiceChannel) {
            message.channel.send(`The bot has left **${voiceChannel.name}** channel!`);
            voiceChannel.leave();
            record.removeChannel(guildId);
            console.log('停止录音:',guildName, voiceChannel.name);
            return;
        }
        
        if (!voiceChannel) {
            return message.channel.send('This command doesn\'t work while the bot has not joined in any voice channel yet!');
        }
	},
};
