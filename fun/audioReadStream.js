const record = require('../commands/r.js');
let readStreamMaps = new Map();
module.exports = {
	readStreamMaps,
	createAudioStream(voiceState) {
        voiceState.guild.members.fetch(voiceState.id)
			.then(audioMember =>{
				const audioReadStream = record.voiceConnection.receiver.createStream(audioMember.user, { mode: 'pcm', end: 'silence'});
				readStreamMaps.set(voiceState.id, audioReadStream);
				audioReadStream.pipe(record.audioWriteStream);
			});
	},
	async pauseAudioStream(userId) {
		const tempReadStream = readStreamMaps.get(userId);
		await pause(tempReadStream);
		//此时管道中的数据怎么办？
		await unpipe(tempReadStream);
		readStreamMaps.delete(userId);
	},
};

function pause(tempReadStream){
	return new Promise(res=>{
		setTimeout(()=>{
			tempReadStream.pause();
			res();
		}, 1);
	});
}

function unpipe(tempReadStream){
	return new Promise(res=>{
		setTimeout(()=>{
			tempReadStream.unpipe();
			res();
		}, 1);
	});
}
