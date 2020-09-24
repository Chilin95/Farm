const Lame = require('node-lame').Lame;
const record = require('./r.js');
const audioReadStream = require('../fun/audioReadStream.js');
module.exports = {
	name: 's',
    description: 'Stop record!',
    aliases: ['stop'],
    args: false,
	usage: '<user> <role>',
    guildOnly: true,
	async execute(message, args) {

        if(typeof(record.voiceConnection) === 'undefined') {
            return message.channel.send('尚未开始录音！');
        }
        
        message.channel.send('停止录音···');
        await robLeaveVioceChannel();
        //关闭所有用户的audioReadStream
        await closeAudioStreams();
        await colseWriteStreams();
        return;
	},
};

function robLeaveVioceChannel(){
    return new Promise(res=>{
        setTimeout(()=>{
            record.voiceChannel.leave();
            res();
        },1);
    });
}

function closeAudioStreams(){
    return new Promise(res=>{
        setTimeout(() => {
            audioReadStream.readStreamMaps.forEach((readStream, userId) => {
                audioReadStream.pauseAudioStream(userId).then().catch(error => {
                    console.log(error);
                });
            });
            res();
        }, 500);
    });
}

function colseWriteStreams(){
    return new Promise(res=>{
        setTimeout(()=>{
            record.audioWriteStream.end();
            res();
        }, 10000);
    });
}
