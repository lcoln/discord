console.log(88888)
const fetch = require('node-fetch');
const express = require('express');
const { clientId, clientSecret, channelId, port, token } = require('./config.json');

const { Client, Intents, GatewayIntentBits, MessageEmbed } = require('discord.js');
const Discord = require('discord.js');

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port });

wss.on('connection', function connection(ws) {
	const count = client.listenerCount('messageCreate')
	console.log({count})
	function onDiscordMsg(message) {
		// console.log({ message });
		const result = message.attachments.first()
		// const result = {}
		// message.attachments?.forEach((v,k) => {result[k] = v})
		console.log(result, message.content, result?.url)
		ws?.send?.(JSON.stringify({
			url: result?.url,
			content: message.content.replace(/-.*/, '').trim()
		}));
	}

	ws.onclose = function(event) {
		console.log('WebSocket connection closed');
		client.removeListener('messageCreate', onDiscordMsg)
	};
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
		console.log({count})
  });
	client.on('messageCreate', onDiscordMsg);
	ws?.send?.('ok');
});

// Create a new client instance
const client = new Client({ 
  // intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

// Login to Discord with your client's token
client.login(token);
client.on('interactionCreate', async interaction => {
	// console.log({ interaction });

	const filter = m => m.content.includes('discord');
	const collector = interaction.channel.createMessageCollector({ filter, time: 15000 });

	collector.on('collect', m => {
		console.log(`Collected ${m.content}`);
	});
});