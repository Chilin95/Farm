const moment = require('moment');
let AudioMixer = require('audio-mixer');
const fs = require('fs');
const Lame = require('node-lame').Lame;
// const exec = require('child_process').exec

let date;
const join = require('./join.js');
module.exports = {
	name: 'record',
    description: 'Command the bot to start a recording.',
    aliases: ['开始录音','start'],
    args: false,
	usage: `The command is guild only. And before **record**, you should have the bot connected to a voice channel by using the **join** command.`,
    guildOnly: true,
    pcm2mp3,
	execute(message, args) {
        connection = join.getConnection();
        console.log('开始录音\n', connection);
        if (!connection) {
            return message.channel.send('The command doesn\'t work while the bot has not joined in any voice channel yet!');
        }

        if (join.getRecordStatus()) {
            return message.channel.send(`The bot is recording in ${join.getChannel().name} channel! If you want another recording, you should **stop** it first.`);
        }
        
        connection.play('./audios/init.mp3', { volume: 0.01 });

        message.channel.send('Start recording···');
        date = moment(new Date()).format('YYYY-MM-DD HH-mm-ss');
        join.setRecordStatus(true);
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
        }, 2000, inputSet);

        mixer.pipe(audioWriteStream);

        // connection.on('disconnect', ()=>{
        //     if (join.getRecordStatus()) {
        //         join.setRecordStatus(false);
        //         join.destroyConnection();
        //         join.getChannel().leave();
        //         join.destroyChannel();
        //         setTimeout(() => {
        //             pcm2mp3();
        //         }, 5000);
        //         return;
        //     }
        // });

    },
};

function pcm2mp3() {
    const encoder = new Lame({
        raw: true,
        sfreq: 48,
        mode: 's',

        output: `./audios/${date}.mp3`,
        bitrate: 192
    }).setFile(`./audios/${date}.pcm`);
    
    encoder.encode()
        .then(() => {
            console.log('音频转换成功！');
            // let cmdStr = `rm -f ./audios/${date}.pcm`;
            // exec(cmdStr, function (err, stdout, srderr) {
            //     if (err) {
            //         console.log(srderr);
            //     } else {
            //         console.log(stdout);
            //     }
            // });
        })
        .catch((error) => {
            console.log(`音频转换失败！\n${error}`);
        });
}
