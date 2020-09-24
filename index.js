const fs = require('fs');
const Discord = require('discord.js');
const config = require('./config.json');
const prefix = config.prefix;

const client = new Discord.Client();
client.commands = new Discord.Collection();
const cooldowns = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);

	// set a new item in the Collection
	// with the key as the command name and the value as the exported module
	client.commands.set(command.name, command);
}


client.once('ready', () => {
	console.log('Ready!');
});
//Promise功能用起来，录音+Help
//第三方装饰器库：npm install core-decorators

client.on('message', message => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	if (commandName === 'prune') {
		const amount = parseInt(args[0]) + 1;
		if (isNaN(amount)) {
			return message.reply('that doesn\'t seem to be a valid number.');
		}
		else if (amount <= 1 || amount > 100) {
			return message.reply('you need to input a number between 1 and 99.');
		}
		message.channel.bulkDelete(amount, true).catch(err => {
			console.error(err);
			message.channel.send('there was an error trying to prune messages in this channel!');
		});
	}

	

	const command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	if (command.guildOnly && message.channel.type === 'dm') {
		return message.reply('I can\'t execute that command inside DMs!');
	}

	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`;
		if (command.usage) {
			reply += `\nThe proper usage would be: \`${prefix}${command.name} ${command.usage}\``;
		}

		return message.channel.send(reply);
	}

	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}
	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;
	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
		}
	}
	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

	try {
		command.execute(message, args);
	}
	catch (error) {
		console.error(error);
		message.reply('there was an error trying to execute that command!');
	}

});

const record = require('./commands/r.js');
const audioReadStream = require('./fun/audioReadStream.js');

client.on('voiceStateUpdate', (oldState, newState)=>{
	//把刚进入语音房的成员禁麦
	if(record.voiceChannelID!=='' &&
		oldState.channelID!==record.voiceChannelID &&
		newState.channelID===record.voiceChannelID) {
			try {
				newState.setMute(true);
			} catch (error) {
				console.log(error);
			}
		}
	//member打开mac，创建readStream
	if(newState.channelID===record.voiceChannelID &&
		typeof(record.voiceConnection)!== 'undefined' &&
		oldState.selfMute && !newState.selfMute){
			try {
				audioReadStream.createAudioStream(newState);
			} catch (error) {
				console.log(error);
			}
	}
	//关闭mac，销毁对应用户的readStream
	if(newState.channelID===record.voiceChannelID &&
		typeof(record.voiceConnection)!== 'undefined' && 
		!oldState.selfMute && newState.selfMute){
			try {
				audioReadStream.pauseAudioStream(newState.id);
			} catch (error) {
				console.log(error);
			}
	}

});

let tempStream;
record.audioWriteStream.on('unpipe', (tempReadStream)=>{
	try {
		record.audioWriteStream.write(tempReadStream.read());
		tempStream = tempReadStream;
		tempReadStream.destroy();
	} catch (error) {
		console.log(error);
	}
	
});
record.audioWriteStream.once('drain', ()=>{
	try {
		tempStream.destroy();
	} catch (error) {
		console.log(error);
	}
});
record.audioWriteStream.on('finish', ()=>{
	try {
		record.audioWriteStream.destroy();
		record.pcm2mp3();
	} catch (error) {
		console.log(error);
	}
});

client.login(config.token);
