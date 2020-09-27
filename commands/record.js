const moment = require('moment');
var AudioMixer = require('audio-mixer');
const fs = require('fs');
const Lame = require('node-lame').Lame;

const join = require('./join.js');
module.exports = {
	name: 'record',
    description: 'Command the bot to start the voice channel recording...',
    aliases: ['开始录音'],
    args: false,
	usage: `It\'s a guild only command. And before send the command message, you should have the bot connected to a voice channel by using the **join** command.`,
    guildOnly: true,
	execute(message, args) {
        connection = join.getConnection();
        if (!connection) {
            return message.channel.send('The bot has not connected to any voice channel yet!');
        }
        
        message.channel.send('Start recording···');
        const date = moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
        audioWriteStream = fs.createWriteStream(`./audios/${date}.pcm`);
        let mixer = new AudioMixer.Mixer({
            channels: 2,
            bitDepth: 16,
            sampleRate: 48000,
        });
        let inputSet = new Set();
        
		const receiver = connection.receiver;
		connection.on('speaking', (user, speaking) =>{
            if (speaking) {
                const audioStream = receiver.createStream(user, {mode: 'pcm'});
                let input = new AudioMixer.Input({
                    channels: 2,
                    bitDepth: 16,
                    sampleRate: 48000,
                    volume: 100,
                    clearInterval: 250
                });
                mixer.addInput(input);
                inputSet.add(input);
                audioStream.pipe(input);
            }
        });
        
        setInterval((inputs) => {
            inputs.forEach((input) => {
                if (input.lastDataTime && !input.hasData) {
                    input.destroy();
                    mixer.removeInput(input);
                    inputs.delete(input);
                }
            });
        }, 1000, inputSet);

        mixer.pipe(audioWriteStream);
    },
};

function pcm2mp3() {
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
}
