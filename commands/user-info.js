module.exports = {
	name: 'user-info',
	description: 'User Info!',
	execute(message, args) {
		message.guild.members.fetch()
        .then(members =>{
            for (const guildMember of members){
				const audioUser = guildMember[1].user;
				console.log(audioUser);
            }
            return buf;
        })
        .catch(console.error);
		message.channel.send(`Your username: ${message.author.username}\nYour ID: ${message.author.id}`);
	},
};