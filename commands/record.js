const AudioMixer = require('audio-mixer');
const spawn = require('child_process').spawn;
const fs = require('fs');

class myMixer extends AudioMixer.Mixer{
	constructor(args) {
		super(args);
	}
	//重写_read方法，使mix过程不再对各语音通道的input归一化。
	_read() {
        let samples = this.getMaxSamples();
        if (samples > 0 && samples !== Number.MAX_VALUE) {
            let mixedBuffer = new Buffer(samples * this.sampleByteLength * this.args.channels);
            mixedBuffer.fill(0);
            this.inputs.forEach((input) => {
                if (input.hasData) {
                    let inputBuffer = this.args.channels === 1 ? input.readMono(samples) : input.readStereo(samples);
                    for (let i = 0; i < samples * this.args.channels; i++) {
                        let sample = this.readSample.call(mixedBuffer, i * this.sampleByteLength) + Math.floor(this.readSample.call(inputBuffer, i * this.sampleByteLength));
                        this.writeSample.call(mixedBuffer, sample, i * this.sampleByteLength);
                    }
                }
            });
            this.push(mixedBuffer);
        }
        else if (this.needReadable) {
            clearImmediate(this._timer);
            this._timer = setImmediate(this._read.bind(this));
        }
        this.clearBuffers();
    }
}

let voiceChannel;
let voiceConnection;
let isRecording = false;
let timeInterval;
let outputStream;
function getChannel(){return voiceChannel;}
function setChannel(obj){voiceChannel = obj}
function getConnection(){return voiceConnection;}
function setConnection(obj){voiceConnection = obj}
function getRecordStatus(){return isRecording;}
function setRecordStatus(status){isRecording = status;}
function manualStopRecord(message){
	setRecordStatus(false);
	voiceConnection.disconnect();
	setConnection(0);
	message.channel.send(`The bot has stopped recording and left ${voiceChannel.name} channel!`);
	voiceChannel.leave();
	setChannel(0);
	setTimeout(() => {
		clearInterval(timeInterval);
		outputStream.kill();
	}, 3000);
	return;
}
module.exports = {
	name: 'record',
    description: `\`record\` and \`stop\` is a set of combined commands for a voice channel recording.`,
    aliases: ['start','开始录音'],
    args: false,
	usage: `The bot will start recording by using the \`record\`(or it\'s alias: \`start\`) command and stop recording by \`stop\`(alias: \`leave\`) command. Before \`record\`, you should join in a voice channel of the guild so that the bot can know which voice channel to follow in and start recording. After \`stop\` recoding, the bot will \`leave\` the voice channel. In addition, the both commands are guild only, which means they\'re used only inside servers and won't work whatsoever in DMs.`,
	guildOnly: true,
	cooldown: 15,
	getChannel,
	setChannel,
	getConnection,
	setConnection,
	getRecordStatus,
	setRecordStatus,
	manualStopRecord,
	execute(message, args) {
		lastChannel = getChannel();
        lastConnection = getConnection();
		console.log('已连接的语音频道\n', lastChannel, lastConnection);

		if (getRecordStatus()) {
			message.channel.send(`The bot is recording in ${lastChannel.name} channel! If you want to start another recording, you should \`stop\` it first.`);
            return;
        }

        if (lastChannel) {
            message.channel.send(`The bot is in ${lastChannel.name} channel! If you want to join in another one, you should \`leave\` it first.`);
            return;
		}
		
		channel = message.member.voice.channel;
		if (!channel) {
			message.channel.send(`Please join in a voice channel first!`);
			return;
		}
		console.log('加入语音频道\n', channel);
		setChannel(channel);
		
		//创建语音连接
		channel.join().catch(err=>{
			message.channel.send(`Connection timeout. Please \`leave\` this channel and try again later!`);
			console.log(`连接失败\n`, err);
		}).then(con=>{
			connection = con;
			setConnection(con);
			connection.play('./audios/00_empty.mp3', { volume: 0.01 });
			console.log('开始录音\n', connection);
			message.channel.send('Start recording···');
			setRecordStatus(true);
			let mixer = new myMixer({
				channels: 2,
				bitDepth: 16,
				sampleRate: 48000,
			});
			let inputSet = new Set();
			const receiver = connection.receiver;
			//监听成员语音
			connection.on('speaking', (user, speaking)=>{
				if (speaking) {
					const audioStream = receiver.createStream(user, {mode: 'pcm'});
					let input = new AudioMixer.Input({
						channels: 2,
						bitDepth: 16,
						sampleRate: 48000,
						volume: 100,
						clearInterval: 250
					});
					input.lastDataTime = new Date().getTime();
					mixer.addInput(input);
					inputSet.add(input);
					//将discord语音pipe到混音通道input
					audioStream.pipe(input);
				}
			});
			//监听连接断开
			connection.on('disconnect', ()=>{
				message.author.send(`The recording has been interrupted! Please ignore if it is stopped manually.`);
				//同时私信下载mp3的URL？;
			});
			//间隔10s移除一次mixer中的无效input
			timeInterval = setInterval((inputs) => {
				inputs.forEach((input) => {
					if (new Date().getTime() - input.lastDataTime >= AudioMixer.Mixer.INPUT_IDLE_TIMEOUT) {
						input.destroy();
						mixer.removeInput(input);
						inputs.delete(input);
					}
				});
			}, 10000, inputSet);
			//pcm to mp3
			outputStream = spawn(require('ffmpeg-static'), [
                '-f', 's16le', // Input is signed 16-bit little-endian raw PCM
                '-ac', '2', // Input channels
                '-ar', '48000', // Input sample rate
				'-i', '-', // Get from stdin
				'-f', 'mp3', //MP3 container
				'-', // stdout
            ])
			mixer.pipe(outputStream.stdin);
			//写入本地文件
			const fileStream = fs.createWriteStream(`./audios/${voiceChannel.name} ${new Date()
				.toLocaleDateString(undefined, {year: 'numeric', month: '2-digit', day: '2-digit',
				hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short', hour12: false})
				.replace(/[\/:]/g, '-').replace(/\s/, '<').replace(/\s/, '>')}${(Math.random().toFixed(3)+'').substr(2)}.mp3`);
			outputStream.stdout.pipe(fileStream, { end: false });
			outputStream.stderr.pipe(process.stderr, { end: false })
		});

	},
};



