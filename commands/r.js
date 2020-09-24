const fs = require('fs');
const moment = require('moment');
const date = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');

let voiceChannelID = '';
let voiceConnection;
let audioWriteStream = fs.createWriteStream('./audios/writeTemp');
module.exports = {
	name: 'r',
    description: 'Record!',
    aliases: ['record'],
    args: false,
	usage: '<user> <role>',
    guildOnly: true,
    voiceChannelID,
    voiceConnection,
    audioWriteStream,
	async execute(message, args) {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {return message.channel.send(`Join a voice channel first!`)}

        voiceChannelID = voiceChannel.id;
        //当前语音房的所有禁麦
        voiceChannel.members.forEach(member => {
            member.voice.setSelfMute(true);
        });
        voiceConnection = await voiceChannel.join();
        message.channel.send('开始录音···');
        audioWriteStream = fs.createWriteStream(`./audios/${date}.pcm`);
    },
    pcm2mp3(){
		const encoder = new Lame({
			'raw': true,
			'sfreq': 48,
			'bitwidth': 16,
			'signed': true,
			'little-endian': true,
			'mode': 's',
	
			'output': `./audios/${date}.mp3`,
			'bitrate': 192
		}).setFile(`./audios/${date}.pcm`);
		
		encoder.encode()
			.then(() => {
				console.log('音频转换成功！');
			})
			.catch((error) => {
				console.log(`音频转换失败！\n${error}`);
			});
	},
};
