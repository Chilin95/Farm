const AudioMixer = require('audio-mixer');
const spawn = require('child_process').spawn;
// require('ffmpeg-static');

class myMixer extends AudioMixer.Mixer{
	constructor(args) {
		super(args);
	}
	//重写_read方法，使mix过程不再对各个input语音归一化。
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
let isRecording;
let interval;
module.exports = {
	name: 'record',
    description: `**record** and **stop** is a set of combined commands for a voice channel recording.`,
    aliases: ['start','开始录音'],
    args: false,
	usage: `The bot will start recording by using the **record**(or it\'s alias: **start**) command and stop recording by **stop**(alias: **leave**) command. Before **record**, you should join in a voice channel of the guild so that the bot can know which voice channel to follow in and start recording. After **stop** recoding, the bot will **leave** the voice channel. In addition, the both commands are guild only, which means they\'re used only inside servers and won't work whatsoever in DMs.`,
	guildOnly: true,
	cooldown: 180,
	voiceChannel,
	voiceConnection,
	isRecording: false,
	interval,
	getChannel(){return voiceChannel;},
	setChannel(obj){voiceChannel = obj},
	getConnection(){return voiceConnection;},
	setConnection(obj){voiceConnection = obj},
	getRecordStatus(){return isRecording;},
	setRecordStatus(status){isRecording = status;},
	getTimeInterval(){return interval;},
	setTimeInterval(obj){interval = obj;},
	execute(message, args) {
		channel = this.getChannel();
        connection = this.getConnection();
		console.log('已连接的语音频道\n', channel, connection);

		if (this.getRecordStatus()) {
			message.channel.send(`The bot is recording in ${channel.name} channel! If you want to start another recording, you should **stop** it first.`);
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
		console.log('加入语音频道\n', voiceChannel);
		this.setChannel(voiceChannel);
		
		voiceChannel.join().catch(err=>{
			message.channel.send(`Connection timeout. Please **leave** this channel and try again at least 3 minutes later!`);
			console.log(`连接失败\n`, err);
		}).then(con=>{
			voiceConnection = con;
			this.setConnection(con);
			voiceConnection.play('./audios/00_empty.mp3', { volume: 0.01 });
			console.log('开始录音\n', voiceConnection);
			message.channel.send('Start recording···');
			this.setRecordStatus(true);
			let mixer = new myMixer({
				channels: 2,
				bitDepth: 16,
				sampleRate: 48000,
			});
			let inputSet = new Set();
			
			const receiver = voiceConnection.receiver;
			voiceConnection.on('speaking', (user, speaking) =>{
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
			//定时移除mixer中的无效input
			timeInterval = setInterval((inputs) => {
				inputs.forEach((input) => {
					if (new Date().getTime() - input.lastDataTime >= AudioMixer.Mixer.INPUT_IDLE_TIMEOUT) {
						input.destroy();
						mixer.removeInput(input);
						inputs.delete(input);
					}
				});
			}, 5000, inputSet);
			this.setTimeInterval(timeInterval);
			//输出mp3文件，默认每256kb写一次硬盘
			const outputStream = spawn('ffmpeg', [
                '-f', 's16le', // Input is signed 16-bit little-endian raw PCM
                '-ac', '2', // Input channels
                '-ar', '48000', // Input sample rate
                '-i', '-', // Get from stdin
                '-y', `./audios/${voiceChannel.name}-${new Date().toISOString().replace(/[^\d]/g, '-').substring().slice(0,-1)}.mp3`
            ])
            mixer.pipe(outputStream.stdin);
            outputStream.stdout.pipe(process.stdout, { end: false })
            outputStream.stderr.pipe(process.stderr, { end: false })
		});
		
	},
};

