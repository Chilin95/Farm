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
	async execute(message, args2) {
		voiceChannel = message.member.voice.channel;
		if (!voiceChannel) {return message.channel.send('Please join in a voice channel first!')}
		
		try {
			voiceConnection = await voiceChannel.join();
		} catch (error) {
			console.log('连接失败，尝试再次连接...\n', error);
			return this.execute(message, args2);
		}
		message.channel.send('The bot has connected to the voice channel···');

		return voiceConnection.play('../audios/init.mp3', { volume: 0.5 });
	},
	getChannel(){return voiceChannel;},
	getConnection(){return voiceConnection;},
};


