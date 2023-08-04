const mj = require('./mj')
const fetch = require('node-fetch');
const express = require('express');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const { port, token } = require('./config.json');
const { Client, Intents } = require('discord.js');
const path = require('path')
const fs = require('fs').promises;

const app = express()
const wss = new WebSocket.Server({ port });
const pageInfo = {}
const client = new Client({ 
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

const sleep = () => {}
const createParams = (baseReq) => {
	return {
		method: 'post',
		body: JSON.stringify(baseReq),
		headers: {
			'Content-Type': 'application/json',
			Cookie: pageInfo.cookies,
			authorization: pageInfo.headers.authorization
		}
	}
}
const onInteractionsCallback = async (req, res, type, sid) => {
	const check = checkFields(
		req.body, 
		['index', 'customId', 'messageId', 'channelId', 'guildId', 'applicationId']
	);

	if(check !== true) {
		return res.send(401, {
			msg: `缺少参数${check}`
		})
	}
	const nonce = `${Date.now()}000000`
	const { index, customId, messageId, channelId, guildId, applicationId, sessionId } = req.body
	const baseReq = {"type":3, nonce, "guild_id": guildId,"channel_id": channelId, "message_flags":0,"message_id":messageId,"application_id": applicationId,"session_id": sid || sessionId || "f6ce562a6b4979c4b1cbc5b436d3be76","data":{"component_type":2,"custom_id":`MJ::JOB::${type}::${index >= 4 ? index - 4 : index}::${customId}`}}

	console.log({baseReq: JSON.stringify(baseReq)})
	return {
		params: createParams(baseReq),
		originParams: req.body,
		index
	}
}
const checkFields = (para = {}, fields) => {

  for (const it of fields) {
    if (!para[it] && para[it] !== 0) {
      return it;
    }
  }
  return true;
}


wss.on('connection', function connection(ws, req) {
	// const count = client.listenerCount('messageCreate')
	const uuid = req.headers['sec-websocket-protocol']
	function onDiscordMsg(message, ...rest) {
		const result = message.attachments?.first() || {}
		const { url = '' } = result
		const { content = '' } = message || {}

		const splitIndex = content.lastIndexOf('--no')
		const txt = content.slice(0, splitIndex)
		const params = content.slice(splitIndex + 4, content.length).trim()
		const [reqUUID, frontMessageId, frontSessionId, ...args] = params.split(" ")
		const upsampleIndex = args.join(" ").match(/ Image #([1-4])/)?.[1]
		const variationIndex = args.join(" ").match(/ Variation #([1-4])/)?.[1]

		let type = ''
		if (upsampleIndex) {
			type = 'upsample'
		} else if (variationIndex) {
			type = 'variation'
		}

		// console.log(message)
		if (uuid === reqUUID && frontMessageId) {
			const response = {
				frontMessageId: Number(type === 'upsample' ? `${frontMessageId}${upsampleIndex}` : frontMessageId),
				// 因为interactions的时候默认重新请求的上一个content
				frontSessionId: Number(frontSessionId)
			}
			if (!/^\*\*\w/.test(content)) {
				console.log({code: 404, content, url})
				ws?.send?.(JSON.stringify({
					code: 404,
					content: '请求过于频繁，请重试~',
					...response
				}))
			} else if (url) {				
				console.log({code: 0, content, url, frontSessionId})
				ws?.send?.(JSON.stringify({
					code: 0,
					url: url,
					content: txt,
					completeContent: message.content,
					messageId: message.id,
					channelId: message.channelId,
					guildId: message.guildId,
					applicationId: message.author.id,
					customId: url.slice(
						url.lastIndexOf('_') + 1, url.lastIndexOf('.')
					), 
					...response,
					type: type || 'imagine'
				}));
			}
		}
	}

	ws.onclose = function(event) {
		console.log('WebSocket connection closed');
		client.removeListener('messageCreate', onDiscordMsg)
	};
  ws.on('message', function incoming(message) {
    console.log('received: %s', message);
  });
	client.on('messageCreate', onDiscordMsg);
	ws?.send?.('ok');
});
mj.createMainPage(pageInfo)

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

app.use(bodyParser());
app.post('/mj', async (req, res) => {
	if(!req.body.messages) {
		return res.send(401, {
			msg: '缺少参数'
		})
	}
	console.log('/mj', req.body.messages)
	const sessionId = await mj.createPic(req.body.messages)
	res.send(200, {
		msg: '请求成功，mj正在拼命做图，请稍候~',
		sessionId
	})
})

app.post('/interactions/upsample', async (req, res) => {
	const { params } = await onInteractionsCallback(req, res, 'upsample')
	const response = await fetch('https://discord.com/api/v9/interactions', params);
	const data = await response.text();

	res.send(response.status < 400 ? 200 : response.status, {
		code: response.status,
		msg: response.statusText,
		data
	})
})

app.post('/interactions/variation', async (req, res) => {

	try {

		const { page, sessionId } = await mj.execMJByAction('/invite', true, 'Get an invite link to the Midjourney Discord server')
		const { params, index } = await onInteractionsCallback(req, res, 'variation', sessionId)
		// mj.debugChrome(page)
		const response = await page.evaluateHandle(async (_params) => {
			const res = await fetch('https://discord.com/api/v9/interactions', _params);
			console.log(res)
			return res;
		}, params);
	
		await page.waitForXPath('//*[contains(text(), "New Prompt for image")]', { timeout: 60000 });
		await page.waitForFunction(() => {
			return document.body.textContent.includes('New Prompt for image')
		}, { timeout: 60000 })
		// console.log({sessionId, params, response})
		// await page.waitForTimeout(1000);
		// await page.screenshot({path: './test2.png'})
		
		const activeElement = await page.evaluateHandle(() => document.activeElement.querySelector('textarea') || document.activeElement);
		const content = await page.evaluate(() => document.activeElement.querySelector('textarea')?.value || document.activeElement?.value);
		// console.log({content})

		const splitIndex = content.lastIndexOf('--no')
		const txt = content.slice(0, splitIndex)
		const p = content.slice(splitIndex + 4, content.length).trim()
		const [reqUUID, frontMessageId, frontSessionId, ...args] = p.replace(/Variation #\d/g, '').split(" ")
		const query = [reqUUID, req.body.frontMessageId, frontSessionId, `Variation #${index}`, ...args].join(" ")

		const focusedInputValue = `${txt} --no ${query}`
		
		console.log({focusedInputValue})
		// 点击输入框以获取焦点，然后选择所有文本
		await activeElement.click({ clickCount: 3 });
		await page.keyboard.press('Backspace')
		// await page.keyboard.press('ArrowRight');
		await page.keyboard.type(focusedInputValue)
	
		await page.evaluate(async () => {
			document.querySelector('button[type="submit"]').click()
		});
	
		// await page.waitForTimeout(1000);
		// await page.screenshot({path: './test2.png'})
		await page.close()
		
		res.send(response?.status ? (response?.status < 400 ? 200 : response?.status) : 200, {
			code: response?.status || 200,
			msg: response?.statusText || '请求成功, 正在作图~',
			// data
		})
	} catch (e) {
		console.log(`[/interactions/variation fail ${e}]`)
		res.send(400, {
			code: 400,
			msg: '请求过于频繁，请重试~',
		})
	}
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