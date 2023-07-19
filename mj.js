const { executablePath } = require('puppeteer');
const puppeteer = require('puppeteer-extra');
const CapSolverPlugin = require('puppeteer-extra-plugin-capsolver')();
const { DISCORD_U, DISCORD_P, CAP } = require('./config.json')

puppeteer.use(CapSolverPlugin);
CapSolverPlugin.setHandler(CAP);

const createPage = async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    executablePath: executablePath(),
  });
  // console.log(111111, cookie)

  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0'
  );

  // 登录
  await page.goto('https://discord.com/login');
  // console.log(2222, cookies)
  // await page.setCookie({"aa":"aa"})
  console.log(222222)
  await page.waitForTimeout(2000);
  console.log(233333333)
  await page.type('input[name="email"]', DISCORD_U);
  console.log(233333333112)
  await page.type('input[name="password"]', DISCORD_P);
  console.log(2333453463333112)
  await page.waitForTimeout(2500);
  // await page.screenshot({path: './test.png'})
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ timeout: 6000 });
  console.log(1234)
  await page.waitForTimeout(3000);
  console.log(2222223)
  // await page.screenshot({path: './test.png'})

  // 等待主页面加载
  await page.waitForFunction(() => {
    const div = document.querySelector('button');
    return div && ['Find or start a conversation', '寻找或开始新的对话'].includes(div.innerHTML);
  });


  // 点击按钮开始新会话
  const newConversationButton = await page.$x(
    "//*/text()[contains(., '寻找或开始新的对话') or contains(., 'Find or start a conversation')]/parent::*"
  );
  await page.waitForTimeout(2000);
  // console.log(newConversationButton[0].focus)
  await newConversationButton[0].click();
  console.log(4444444)
  await page.waitForTimeout(2000);
  // await page.screenshot({path: './test.png'})
  // 等待搜索框出现
  // await page.waitForFunction(() => {
  //   const div = document.querySelector('input');
  //   return div && div.placeholder === '想要去哪里？';
  // });
  await page.waitForSelector('input[placeholder="想要去哪里？"], input[placeholder="Where would you like to go?"]', { timeout: 30000 });
  console.log(555555)

  // 搜索"imagi"
  await page.type('input[placeholder="想要去哪里？"], input[placeholder="Where would you like to go?"]', 'imagi');
  const [searchResult] = await page.$x(
    "//*/text()[contains(., 'imagineio')]/parent::*"
  );
  await searchResult.click();
  console.log(666666)

  // 进入"imagine"频道
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  
  console.log(888888)

  return page
}

const main = async (page, prompt, count) => {
  
  // await page.waitForFunction(
  //   () => {
  //     const div = document.querySelector('button');
  //     return div && div.innerHTML === '寻找或开始新的对话';
  //   },
  //   { timeout: 60000 } // 60 秒
  // );

  console.log(3333333)

  // 主要流程
  const go = async () => {
    await page.keyboard.type('/imagine');
    await page.waitForTimeout(1000);
    console.log({count})

    // await page.waitForSelector('div:has-text("Midjourney Bot")', { timeout: 60000 });
    await page.waitForFunction(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      
      for (const el of elements) {
        if (el.textContent.includes('Midjourney Bot')) {
          console.log(el)
          return true; // 找到包含目标文本的元素，返回 true
        }
      }
      
      return false; // 没有找到匹配的元素，返回 false
    }, { timeout: 60000 });

    console.log(777777)
  // await page.screenshot({path: './test.png'})
  
    // 点击"Create images with Midjourney"选项
    const [createImagesOption] = await page.$x(
      "//*/text()[contains(., '/imagine')]/parent::*"
    );
    // if (count > 3) {
    //   await page.screenshot({path: './test.png'})
    // }
    // await page.waitForTimeout(200);
    // const [createImagesOption] = await page.$$('button:has-text("Create images with Midjourney")');
    await page.keyboard.press('Enter');
    // await createImagesOption.click();
    // 输入"test"并按Enter键
    await page.waitForTimeout(500);
    await page.keyboard.type(prompt);
    await page.keyboard.press('Enter');
    // await page.keyboard.type('');
    await page.keyboard.press('Escape');
    // await page.waitForTimeout(500);

    // await page.keyboard.down('Control');
    // await page.keyboard.press('A');
    // await page.keyboard.up('Control');
    // await page.keyboard.press('Backspace')
    // await page.screenshot({path: './test.png'})
    // 等待结果并关闭浏览器
    // await page.waitForTimeout(5000);
    // await page.keyboard.press('Escape');
    // await browser.close();
  };

  await go();
};

module.exports = {
  createPage,
  main
};
