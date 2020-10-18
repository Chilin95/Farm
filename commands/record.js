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
            let mixedBuffer = Buffer.alloc(samples * this.sampleByteLength * this.args.channels);
            mixedBuffer.fill(0);
            this.inputs.forEach((input) => {
                if (input.hasData) {
                    let inputBuffer = this.args.channels === 1 ? input.readMono(samples) : input.readStereo(samples);
                    for (let i = 0; i < samples * this.args.channels; i++) {
                        let sample = this.readSample.call(mixedBuffer, i * this.sampleByteLength) + Math.floor(this.readSample.call(inputBuffer, i * this.sampleByteLength))/2;
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

let channelMap = new Map();
let isRecordingMap = new Map();
let stopper = 'Abnormal stop';

function getChannel(guildId){return channelMap.get(guildId);}
function deleteChannel(guildId){channelMap.delete(guildId);}
function getRecordStatus(guildId){return isRecordingMap.get(guildId);}
function manualStopRecord(stopMessage){
	const voiceChannel = getChannel(stopMessage.guild.id);
	stopper = stopMessage.author.username+'#'+stopMessage.author.discriminator+'('+stopMessage.author.id+')';
	stopMessage.channel.send(`The bot has stopped recording and left **${voiceChannel.name}** channel!`);
	voiceChannel.leave();
	return;
}
function dateTime(date){
	return date
	.toLocaleDateString(undefined, {year: 'numeric', month: '2-digit', day: '2-digit',
	hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short', hour12: false})
	.replace(/[\/:]/g, '-').replace(/\s/g, '_');
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
	deleteChannel,
	getRecordStatus,
	manualStopRecord,
	execute(message, args) {
		const guildId = message.guild.id;
		const guildName = message.guild.name;
		const lastChannel = getChannel(guildId);

		if (getRecordStatus(guildId)) {
			message.channel.send(`The bot is recording in **${lastChannel.name}** channel! If you want to start another recording, you should \`stop\` it first.`);
			console.log('正在录音的语音频道:', guildName, lastChannel.name);
			return;
        }

        if (lastChannel) {
            message.channel.send(`The bot is in **${lastChannel.name}** channel! If you want to join in another one, you should \`leave\` it first.`);
			console.log('已连接的语音频道:', guildName, lastChannel.name);
			return;
		}
		
		const channel = message.member.voice.channel;
		if (!channel) {
			message.channel.send(`Please join in a voice channel first!`);
			return;
		}
		console.log('加入语音频道:', guildName, channel.name);
		channelMap.set(guildId, channel);
		

		//创建语音连接
		channel.join().catch(err=>{
			message.channel.send(`Connection timeout. Please \`leave\` this channel and try again later!`);
			console.log('连接失败!', guildName, channel.name, '\n', err);
		}).then(con=>{
			connection = con;
			connection.play('./commands/00_empty.mp3', { volume: 0.01 });
			console.log('开始录音...', guildName, channel.name);
			message.channel.send(`**${channel.name}** Start recording...`);
			isRecordingMap.set(guildId, true);
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
			//间隔10s移除一次mixer中的无效input
			const timeInterval = setInterval((inputs) => {
				inputs.forEach((input) => {
					if (new Date().getTime() - input.lastDataTime >= AudioMixer.Mixer.INPUT_IDLE_TIMEOUT) {
						input.destroy();
						mixer.removeInput(input);
						inputs.delete(input);
					}
				});
			}, 10000, inputSet);
			//pcm to mp3
			const outputStream = spawn(require('ffmpeg-static'), [
                '-f', 's16le', // Input is signed 16-bit little-endian raw PCM
                '-ac', '2', // Input channels
                '-ar', '48000', // Input sample rate
				'-i', '-', // Get from stdin
				'-filter:a', 'atempo=0.9',
				// '-af', 'lowpass=2000,highpass=200',
				'-f', 'mp3', //MP3 container
				'-', // stdout
            ])
			mixer.pipe(outputStream.stdin);
			//写入mp3文件
			const startTime = new Date();
			const filename = `${channel.name}_${dateTime(startTime)}${(Math.random().toFixed(3)+'').substring(2)}`;
			const fileStream = fs.createWriteStream(`./audios/${filename}.mp3`);
			outputStream.stdout.pipe(fileStream, { end: false });
			outputStream.stderr.pipe(process.stderr, { end: false });

			//统计参会成员id & onlineTime
			let memberMap = new Map();
			//设置初始时长为0，最后一次加入语音房的时间戳记为当前时间
			channel.members.forEach(member=>{
				const joinedUser = member.user;
				memberMap.set(joinedUser.id, [joinedUser.username+'#'+joinedUser.discriminator, 0, startTime]);
			});
			//更新进入语音房的时间戳
			message.client.on('voiceStateUpdate', (oldState, newState)=>{
				if (channel && oldState.channelID !== channel.id && newState.channelID === channel.id) {
					const addUser = newState.member.user;
					const joinUser = memberMap.get(addUser.id);
					const nowTime = new Date();
					if (joinUser) {
						memberMap.set(addUser.id, [addUser.username+'#'+addUser.discriminator, joinUser[1], nowTime]);
					} else {
						memberMap.set(addUser.id, [addUser.username+'#'+addUser.discriminator, 0, nowTime]);
					}
				}
			});
			//更新离开语音房的在线时长
			message.client.on('voiceStateUpdate', (oldState, newState)=>{
				if (channel && oldState.channelID === channel.id && newState.channelID !== channel.id) {
					const addUser = newState.member.user;
					const leftUser = memberMap.get(addUser.id);
					const now = new Date();
					if (leftUser) {
						onlineTime = leftUser[1] + (now-leftUser[2])/1000;
						memberMap.set(addUser.id, [addUser.username+'#'+addUser.discriminator, onlineTime, leftUser[2]]);
					} else {
						memberMap.set(addUser.id, [addUser.username+'#'+addUser.discriminator, 0, now]);
					}
				}
			});

			//监听连接断开
			connection.on('disconnect', ()=>{
				//保证10s间隔内清除所有无效的input后再clearInterval
				setTimeout(() => {
					clearInterval(timeInterval);
				}, 10000);
				setTimeout(() => {
					//2s后杀掉子进程，保证语音数据都写入到本地mp3文件
					outputStream.kill();
				}, 2000);
				const stopGuildId = message.guild.id;
				isRecordingMap.delete(stopGuildId);
				channelMap.delete(stopGuildId);
				//向starter私信mp3文件链接
				message.author.send(`The recording of **${channel.name}** has been interrupted! Please ignore if it is stopped manually.`
				+ `\nDownload link of **${filename}** Recording: `);
				
				//生成参会记录json文件
				const endTime = new Date();
				//对还没离开房间的用户更新在线时长
				channel.members.forEach(member=>{
					const stationUser = member.user;
					const updateUser = memberMap.get(stationUser.id);
					onlineTime = updateUser[1] + (endTime-updateUser[2])/1000;
					memberMap.set(stationUser.id, [stationUser.username+'#'+stationUser.discriminator, onlineTime, updateUser[2]]);
				});
				//memberMap to memberObj
				let memberObj = {'userId': ['userName', 'onlineTime/seconds', 'The last timestamp of join in the voiceChannel']};
				for (let[k,v] of memberMap) {
					memberObj[k] = [v[0], v[1], dateTime(v[2])];
				}
				let recordObj= {
					GuildName: guildName+'('+guildId+')',
					VoiceChannel: filename.substring(0, filename.indexOf('_')),
					ParticipantsNum: memberMap.size,
					Starter : message.author.username+'#'+message.author.discriminator+'('+message.author.id+')',
					Stopper: stopper,
					StartTime: dateTime(startTime),
					EndTime: dateTime(endTime),
					members: memberObj
				};
				const recordStr = JSON.stringify(recordObj, null, '\t');
				//写入本地json文件
				fs.writeFile(`./audios/${filename}.json`, recordStr, 'utf8', (err) => {
					if (err) throw err;
					console.log('参会成员数据已写入文件', guildName, filename.substring(0, filename.indexOf('_')));
					//向starter私信json文件
					message.author.send({
						files: [{
							attachment: `./audios/${filename}.json`,
							name: `${filename}.json`
						}]
					})
					.then().catch(console.error);
				});

			});
			
		});

	},

};
