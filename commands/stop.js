const Lame = require('node-lame').Lame;

const join = require('./join.js');
module.exports = {
	name: 'stop',
    description: 'Command the bot to stop recording.',
    aliases: ['stop'],
    args: false,
	usage: `It\'s a guild only command. And it only works on a recording.`,
    guildOnly: true,
	async execute(message, args) {

        voiceConnection = join.getConnection();
        if(!voiceConnection) {
            return message.channel.send('The robot has not started recording yet!');
        }
        
        message.channel.send('Stop recording!');
        return join.getChannel().leave();
	},
};



