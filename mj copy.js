const { executablePath } = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const CapSolverPlugin = require('puppeteer-extra-plugin-capsolver')();
const { DISCORD_U, DISCORD_P, CAP } = require('./config.json')

puppeteer.use(CapSolverPlugin);
CapSolverPlugin.setHandler(CAP);


const getHeader = (page) => {
  return new Promise((yes) => {
    page.on('request', req => {
      if (req.url() === 'https://discord.com/api/v9/science') {
        yes(req.headers())
      }
    })
  })
}
let browser = null

const waitForRequestPromise = async (_page) => {
  const checkForContent = `
    new Promise((resolve, reject) => {
      const observer = new MutationObserver((mutationsList, observer) => {
        if (document.body.innerHTML.includes('Create images with Midjourney')) {
          resolve();
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });
  `;
  await _page.evaluate(checkForContent);
}

const createPage = async () => {
  browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    executablePath: executablePath(),
  });
  console.log('[launch success]')

  const page = await browser.newPage();
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

  const headers = await getHeader(page)

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
  const cookies = await page.cookies();

  return {
    page,
    cookies,
    headers,
  }
}

const main = async (page, prompt) => {

  console.log('[start input]')

  // const waitForRequestPromise = (_page) => {
  //   return new Promise((resolve, reject) => {
  //     _page.on('request', (request) => {
  //       const url = request.url();
  //       if (/\/v9\/science/.test(url)) {
  //         console.log(url)
  //         resolve(request);
  //       }
  //     });
  //   });
  // }

  // const waitForRequestPromise = (_page) => {
  //   return new Promise((yes) => {
  //     _page.on('response', async (response) => {
  //       const content = await response.text();
  //       if (content.includes('Create images with Midjourney')) {
  //         yes('Text found');
  //         console.log(content, 87890987)
  //         // await _page.screenshot({path: './test.png'})
  //       }
  //     });
  //   })
  // }

  // 主要流程
  const currentUrl = page.url()
  console.log(`[currentUrl ${currentUrl}]`)
  // 打开第二个标签页
  const tmpPage = await browser.newPage();

  try {
    await tmpPage.goto(currentUrl);
    await page.waitForXPath('//*[contains(text(), "Message #imagineio")]', { timeout: 60000 });
    console.log(`[Message #imagineio show success]`)
  
    // await tmpPage.waitForNavigation();
    // await tmpPage.waitForLoadState('domcontentloaded');
    // await tmpPage.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

    await tmpPage.waitForTimeout(1000);
    await Promise.all([
      waitForRequestPromise(tmpPage),
      new Promise((yes) => {
        setTimeout(async () => {
          const res = await tmpPage.keyboard.type('/imagine')
          yes(res)
        }, 2000)
      })
    ])
    // await tmpPage.keyboard.type('imagine');
    // await tmpPage.screenshot({path: './test.png'})
    
    // await page.waitForSelector("body:contains('Create images with Midjourney')")
    //   .then(() => {
    //     console.log('Text found')
    //   });

    // await tmpPage.waitForTimeout(2000);
    // await page.waitForSelector("body:contains('Create images with Midjourney')")
    // await waitForRequestPromise(tmpPage)
    // console.log('requestdone')
    // await tmpPage.waitForSelector('div:has-text("Midjourney Bot")', { timeout: 60000 });
    // await tmpPage.waitForFunction(() => {
    //   console.log(876789876)
    //   return document.body.textContent.includes('Create images with Midjourney')
    // }, { timeout: 60000 });
    // await page.waitForSelector(':contains("Create images with Midjourney")', { timeout: 60000 });
    // await page.waitForXPath('//*[contains(text(), "Create images with Midjourney")]', { timeout: 60000 });

    // await tmpPage.screenshot({path: './test.png'})

    console.log(`[prompt ${prompt}]`)
    // await tmpPage.screenshot({path: './test.png'})
  
    // 点击"Create images with Midjourney"选项
    // const [createImagesOption] = await tmpPage.$x(
    //   "//*/text()[contains(., '/imagine')]/parent::*"
    // );
    // if (count > 3) {
    //   await tmpPage.screenshot({path: './test.png'})
    // }
    // await tmpPage.waitForTimeout(200);
    // const [createImagesOption] = await tmpPage.$$('button:has-text("Create images with Midjourney")');
    await tmpPage.keyboard.press('Enter');
    // await createImagesOption.click();
    // 输入"test"并按Enter键
    await tmpPage.waitForTimeout(500);
    await tmpPage.keyboard.type(prompt);
    await tmpPage.keyboard.press('Enter');
    await tmpPage.keyboard.press('Escape');
    await tmpPage.close()
    console.log(`[type prompt done]`)
  } catch(e) {
    await tmpPage.close()
  }
};

module.exports = {
  createPage,
  main
};
