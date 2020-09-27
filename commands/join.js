let voiceChannel;
let voiceConnection;
module.exports = {
	name: 'join',
    description: 'Command the bot to join the voice channel in which you are, and ready for the voice channel recording...',
    aliases: ['加入语音频道'],
    args: false,
	usage: `It\'s a guild only command. And before send the command message, you should join in a voice channel of the guild.`,
	guildOnly: true,
	voiceChannel,
	voiceConnection,
	execute(message, args2) {
		voiceChannel = message.member.voice.channel;
		if (!voiceChannel) {return message.channel.send('Please join in a voice channel first!')}
		
		voiceChannel.join().then(con=>{
			voiceConnection = con;
			message.channel.send('The bot has connected to the voice channel...');
			return;
		}).catch(error=>{
			console.log('连接失败，尝试再次连接...\n', error);
			message.channel.send('Connection timeout, please try again...');
		});
	},
	getChannel(){return voiceChannel;},
	getConnection(){return voiceConnection;},
};


