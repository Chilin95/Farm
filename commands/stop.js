const Lame = require('node-lame').Lame;

const join = require('./join.js');
module.exports = {
	name: 'stop',
    description: 'Command the bot to stop recording or leave the voice channel.',
    aliases: ['停止录音','leave'],
    args: false,
	usage: `The command is guild only. And it only works while the bot is in a voice channel. For more usage information, look up the **join** command.`,
    guildOnly: true,
	execute(message, args) {
        channel = join.getChannel();
        connection = join.getConnection();
        console.log('停止录音\n', channel, connection);

        if (join.getRecordStatus()) {
            join.setRecordStatus(false);
            connection.disconnect();
            join.destroyConnection();
            message.channel.send(`The bot has stopped recording and left ${channel.name} channel!`);
            channel.leave();
            join.destroyChannel();
            return;
        }

        if (channel) {
            if (connection) {
                connection.disconnect();
                join.destroyConnection();
            }
            message.channel.send(`The bot has left ${channel.name} channel!`);
            channel.leave();
            join.destroyChannel();
            return;
        }
        if (!channel) {
            return message.channel.send('The command doesn\'t work while the bot has not joined in any voice channel yet!');
        }
	},
};



