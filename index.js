console.log(88888)
const mj = require('./mj')
const fetch = require('node-fetch');
const express = require('express');
const { clientId, clientSecret, channelId, port, token } = require('./config.json');

const { Client, Intents, GatewayIntentBits, MessageEmbed } = require('discord.js');
const Discord = require('discord.js');

const WebSocket = require('ws');
const page = mj.createPage()
// const page = new Promise(() => {})
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

var bodyParser = require('body-parser');

const app = express()
app.use(bodyParser());
let count = 0
app.post('/mj', async (req, res) => {
	count += 1
	if(!req.body.messages) {
		return res.send(401, {
			msg: '缺少参数'
		})
	}
	page.then(async pageCtx => {
		await mj.main(pageCtx, req.body.messages, count)
		res.send(200, {
			msg: '请求成功，mj正在拼命做图~'
		})
	})
})

app.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', '*')
		res.header('Access-Control-Allow-Headers', 'Authorization,X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method' )
		res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, PUT, DELETE')
		res.header('Allow', 'GET, POST, PATCH, OPTIONS, PUT, DELETE')
		next();
	}
);

app.listen(53022, () => {
  console.log(`Example app listening on port ${port}`)
})