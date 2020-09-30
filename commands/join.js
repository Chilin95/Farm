let voiceChannel;
let voiceConnection;
let isRecording;
module.exports = {
	name: 'join',
    description: `**join**, **record** and **stop** is a set of combined commands for a voice channel recording.`,
    aliases: ['连接频道','connect'],
    args: false,
	usage: `The set of commands is guild only. First, you can use **join**(or it\'s alias: **connect**) command the bot to join the voice channel in which you are. After the connection established, let the bot start recording by using the **record**(alias: **start**) command. Finally, you can **stop**(alias: **leave**) the recording at anytime, meanwhile the bot will **leave** the voice channel too.`,
	guildOnly: true,
	voiceChannel,
	voiceConnection,
	isRecording: false,
	getChannel(){return voiceChannel;},
	getConnection(){return voiceConnection;},
	destroyConnection(){voiceConnection = 0},
	destroyChannel(){voiceChannel = 0},
	getRecordStatus(){return isRecording;},
	setRecordStatus(status){isRecording = status;},
	execute(message, args) {
		channel = this.getChannel();
        connection = this.getConnection();
		console.log('连接频道\n', channel, connection);

		if (this.getRecordStatus()) {
			message.channel.send(`The bot is recording in ${channel.name} channel! If you want another recording, you should **stop** it first.`);
            return;
        }

        if (channel) {
            message.channel.send(`The bot is in ${channel.name} channel! If you want to join in another one, you should **leave** it first.`);
            return;
		}
		
		voiceChannel = message.member.voice.channel;
		if (!voiceChannel) {
			message.channel.send(`Please join in a voice channel first!`);
			return;
		}
		
		message.channel.send('The bot has joined in the voice channel. It\'s waiting for connection established...');
		
		connect(voiceChannel, message.channel).catch(error=>{
			message.channel.send(`Connection timeout. Please **leave** the channel and try again!`);
			console.log(`连接超时\n`, error);
		});
		
	},
};

async function connect(voiceChannel, txChannel){
	voiceConnection = await voiceChannel.join();
	txChannel.send('The bot has connected to the voice channel.');
}
