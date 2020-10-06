const record = require('./record.js');
module.exports = {
	name: 'stop',
    description: 'Command the bot to stop recording or leave the voice channel.',
    aliases: ['leave','停止录音'],
    args: false,
	usage: `The command is guild only. And it only works while the bot is in a voice channel. For more usage information, look up the \`record\` command.`,
    guildOnly: true,
	execute(message, args) {
        channel = record.getChannel();
        connection = record.getConnection();
        console.log('停止录音\n', channel, connection);

        if (record.getRecordStatus()) {
            record.manualStopRecord(message);
            return;
        }

        if (channel) {
            if (connection) {
                connection.disconnect();
                record.setConnection(0);
            }
            message.channel.send(`The bot has left ${channel.name} channel!`);
            channel.leave();
            record.setChannel(0);
            return;
        }
        
        if (!channel) {
            return message.channel.send('This command doesn\'t work while the bot has not joined in any voice channel yet!');
        }
	},
};


