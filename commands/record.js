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
let isRecording = false;
let timeInterval;
let outputStream;
let stopper = 'Abnormal stop';
function getChannel(){return voiceChannel;}
function setChannel(obj){voiceChannel = obj}
function getRecordStatus(){return isRecording;}
function setRecordStatus(status){isRecording = status;}
function getStopper(){return stopper;}
function setStopper(str){stopper = str}
function manualStopRecord(stopMessage){
	setStopper(stopMessage.author.username+'#'+stopMessage.author.discriminator);
	setRecordStatus(false);
	stopMessage.channel.send(`The bot has stopped recording and left ${voiceChannel.name} channel!`);
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
	getRecordStatus,
	setRecordStatus,
	manualStopRecord,
	execute(message, args) {
		lastChannel = getChannel();

		if (getRecordStatus()) {
			message.channel.send(`The bot is recording in ${lastChannel.name} channel! If you want to start another recording, you should \`stop\` it first.`);
			console.log('已连接的语音频道:', lastChannel.name);
			return;
        }

        if (lastChannel) {
            message.channel.send(`The bot is in ${lastChannel.name} channel! If you want to join in another one, you should \`leave\` it first.`);
			console.log('已连接的语音频道:', lastChannel.name);
			return;
		}
		
		channel = message.member.voice.channel;
		if (!channel) {
			message.channel.send(`Please join in a voice channel first!`);
			return;
		}
		console.log('加入语音频道:', channel.name);
		setChannel(channel);
		
		//创建语音连接
		channel.join().catch(err=>{
			message.channel.send(`Connection timeout. Please \`leave\` this channel and try again later!`);
			console.log(`连接失败\n`, err);
		}).then(con=>{
			connection = con;
			connection.play('./audios/00_empty.mp3', { volume: 0.01 });
			console.log('开始录音...');
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
				//向recorder私信mp3文件
				message.author.send({
					files: [{
						attachment: `./audios/${filename}.mp3`,
						name: `${filename}.mp3`
					}]
				})
				.then((data)=>{
					message.author.send(`Download link of **${filename}** Recording: ${data.attachments.first().url}`)
					.then().catch(console.error);
				})
				.catch(console.error);
				//记录参会成员
				let memberObj= {
					Recorder : message.author.username+'#'+message.author.discriminator,
					Stopper: getStopper(),
					DateTime: filename,
					ParticipantsNum: memberMap.size
				};
				for (let[k,v] of memberMap) {
					memberObj[k] = v;
				}
				const memberStr = JSON.stringify(memberObj);
				
				fs.writeFile(`./audios/${filename}.json`, memberStr, 'utf8', (err) => {
					if (err) throw err;
					console.log('此次参会成员数据已写入文件');
					//向recorder私信参会成员文件
					message.author.send({
						files: [{
							attachment: `./audios/${filename}.json`,
							name: `Participants_Record_${filename}.json`
						}]
					})
					.then().catch(console.error);
				});

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
			const filename = `${voiceChannel.name}_${new Date()
				.toLocaleDateString(undefined, {year: 'numeric', month: '2-digit', day: '2-digit',
				hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short', hour12: false})
				.replace(/[\/:]/g, '-').replace(/\s/g, '_')}${(Math.random().toFixed(3)+'').substr(2)}`;
			const fileStream = fs.createWriteStream(`./audios/${filename}.mp3`);
			outputStream.stdout.pipe(fileStream, { end: false });
			outputStream.stderr.pipe(process.stderr, { end: false });
			//统计参会成员
			let memberMap = new Map();
			channel.members.forEach(member=>{
				const joinedUser = member.user;
				memberMap.set(joinedUser.id, joinedUser.username+'#'+joinedUser.discriminator);
			});
			message.client.on('voiceStateUpdate', (oldState, newState)=>{
				if (channel && oldState.channelID !== channel.id && newState.channelID === channel.id) {
					const addUser = newState.member.user;
					memberMap.set(addUser.id, addUser.username+'#'+addUser.discriminator);
				}
			});
		});

	},
};



