const { executablePath } = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const CapSolverPlugin = require('puppeteer-extra-plugin-capsolver')();
const formidable = require('formidable');

const { DISCORD_U, DISCORD_P, CAP } = require('./config.json')
let browser = null
let page = null

puppeteer.use(CapSolverPlugin);
CapSolverPlugin.setHandler(CAP);

const interceptUrl = (page, url) => {
  return new Promise((yes) => {
    page.on('request', req => {
      // console.log(req.url(), 'req.url()')
      if (req.url() === url) {
        return yes(req)
      }
    })
  })
}

const waitForRequestPromise = async (_page, innerHTML, shouldInclude = true) => {
  const checkForContent = `
    new Promise((resolve, reject) => {
      const observer = new MutationObserver((mutationsList, observer) => {
        const result = document.body.innerHTML.includes("${innerHTML}");
        const yes = ${shouldInclude} ? result : !result;
        if (yes) {
          resolve();
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  `;
  await _page.evaluate(checkForContent);
}

const createMainPage = async (pageInfo = {}) => {
  browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    executablePath: executablePath(),
  });
  console.log('[launch success]')

  page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0'
  );

  // 登录
  await page.goto('https://discord.com/login');
  console.log('[go to login page success]')
  await page.waitForTimeout(1000);
  await page.type('input[name="email"]', DISCORD_U);
  console.log('[type email success]')
  await page.type('input[name="password"]', DISCORD_P);
  console.log('[type password success]')
  await page.waitForTimeout(1500);
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 6000 });
  console.log('[login success]')

  // 等待主页面加载
  await page.waitForFunction(() => {
    const div = document.querySelector('button');
    return div && ['Find or start a conversation', '寻找或开始新的对话'].includes(div.innerHTML);
  });

  // 点击按钮开始新会话
  const newConversationButton = await page.$x(
    "//*/text()[contains(., '寻找或开始新的对话') or contains(., 'Find or start a conversation')]/parent::*"
  );
  await page.waitForTimeout(1500);
  await newConversationButton[0].click();
  console.log('[newConversationButton success]')
  await page.waitForTimeout(1500);
  await page.waitForSelector('input[placeholder="想要去哪里？"], input[placeholder="Where would you like to go?"]', { timeout: 30000 });
  console.log('[show input success]')

  // 搜索"imagi"
  await page.type('input[placeholder="想要去哪里？"], input[placeholder="Where would you like to go?"]', 'imagi');
  const [searchResult] = await page.$x(
    "//*/text()[contains(., 'imagineio')]/parent::*"
  );
  await searchResult.click();
  console.log('[access imagineio channel success]')

  // 进入"imagine"频道
  await page.keyboard.press('Escape');
  
  console.log('[Escape success]')
  const info = await getPageInfo(page);
  pageInfo.cookies = info.cookies
  pageInfo.headers = info.headers
  console.log('[getPageInfo success]')
}

const getPageInfo = async (page) => {
  const cookies = (await page.cookies()).reduce((item, next) => {
    item += `${next.name}=${next.value};`
    return item
  }, '');
  const headers = await interceptUrl(page, 'https://discord.com/api/v9/science')

  return {
    cookies,
    headers: headers.headers()
  }
}

const createNewPage = async () => {
  console.log('[start createNewPage]')
  const currentUrl = page.url()
  console.log(`[currentUrl ${currentUrl}]`)
  const tmpPage = await browser.newPage();
  await tmpPage.goto(currentUrl);
  await tmpPage.waitForXPath('//*[contains(text(), "Message #imagineio")]', { timeout: 60000 });
  console.log(`[Message #imagineio show success]`)
  await tmpPage.waitForTimeout(1000);
  return tmpPage
}

const createPic = async (prompt) => {

  console.log('[start input]')

  // 打开第二个标签页
  const tmpPage = await createNewPage();

  try {
  
    await Promise.all([
      waitForRequestPromise(tmpPage, 'Create images with Midjourney'),
      new Promise((yes) => {
        setTimeout(async () => {
          const res = await tmpPage.keyboard.type('/imagine')
          yes(res)
        }, 2000)
      })
    ])

    console.log(`[prompt ${prompt}]`)
    
    await tmpPage.keyboard.press('Enter');
    await tmpPage.waitForTimeout(500);
    await tmpPage.keyboard.type(prompt);
    tmpPage.keyboard.press('Enter');

    const request = await interceptUrl(tmpPage, 'https://discord.com/api/v9/interactions')
    const sessionId = request.postData().match(/"session_id":"([\w\W]*?)"/)?.[1]
    
    console.log(`[interceptUrl ${sessionId}]`)

    await tmpPage.keyboard.press('Escape');
    await tmpPage.close()
    console.log(`[type prompt done]`)
    return sessionId
  } catch(e) {
    await tmpPage.close()
  }
};

const execMJByAction = async (action, getSessionId, waitRequest) => {
  const tmpPage = await createNewPage();

  try {
  
    await Promise.all([
      waitForRequestPromise(tmpPage, waitRequest),
      new Promise((yes) => {
        setTimeout(async () => {
          const res = await tmpPage.keyboard.type(action)
          yes(res)
        }, 2000)
      })
    ])

    await tmpPage.keyboard.press('Enter');
    await tmpPage.waitForTimeout(500);
    tmpPage.keyboard.press('Enter');

    let sessionId
    if (getSessionId) {
      const request = await interceptUrl(tmpPage, 'https://discord.com/api/v9/interactions')
      sessionId = request.postData().match(/"session_id":"([\w\W]*?)"/)?.[1]
    }
    
    console.log(`[interceptUrl ${sessionId}]`)

    await tmpPage.keyboard.press('Escape');

    await Promise.all([
      waitForRequestPromise(tmpPage, waitRequest, false),
      waitForRequestPromise(tmpPage, 'Sending command', false),
      waitForRequestPromise(tmpPage, 'Midjourney Bot is thinking', false),
      tmpPage.waitForTimeout(3000)
      // new Promise((yes) => {
      //   setTimeout(async () => {
      //     yes()
      //   }, 3000)
      // })
    ])

    console.log(`[waitForRequestPromise ${waitRequest} disappear]`);
    console.log(`[waitForRequestPromise Midjourney Bot is thinking disappear]`);
    
    return {
      page: tmpPage,
      sessionId
    }
  } catch(e) {
    console.log(`[error ${e}]`)
    await tmpPage.close()
  }

}

const debugChrome = (page) => {
	page.on('console', message => console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))
    .on('pageerror', ({ message }) => console.log(message))
    .on('response', async response => console.log(`${response.status()} ${response.url()} ${await response.text()}`))
    .on('requestfailed', request => console.log(`${request.failure().errorText} ${request.url()}`))
}

module.exports = {
  createMainPage,
  createNewPage,
  createPic,
  execMJByAction,
  debugChrome
};
