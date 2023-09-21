import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

(async () => {

  //const crns = ["x","x","x","x","x","x","x","x","x","x"]
  const crns = ["10116", "10118"]

  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });

  let relogin = true;

  while (relogin) {
    const page = await browser.newPage();

    page.on("dialog", async (dialog) => {
      console.log(`Dialog message: ${dialog.message()}`);

      await dialog.accept();
    });

    await page.goto(
      "https://suis.sabanciuniv.edu/dolly/twbkwbis.P_SabanciLogin"
    );

    const usernameField = "input#UserID";
    const passwordField = "input#PIN";

    await page.click(usernameField);
    await page.keyboard.type(process.env.id);

    await page.click(passwordField);
    await page.keyboard.type(process.env.pass);

    const submitButton = await page.$('input[type="submit"]');

    await submitButton.click();

    await page.waitForNavigation();

    await page.goto("https://suis.sabanciuniv.edu/dolly/bwskfreg.P_AltPin");

    const termSelectButton = await page.$('input[type="submit"]');

    await termSelectButton.click();

    
    let crncnt = 1
    for (const crn of crns) {

      const crnField = "input#crn_id" + crncnt.toString();
      await page.waitForSelector(crnField);
      await page.click(crnField);
      await page.keyboard.type(crn);
      crncnt += 1

    }


    let wait = true;
    let cycle = 0;
    while (wait) {
      try {
        console.log("Checking whether there is a seat!");
        const response = await fetch(
          "https://suis.sabanciuniv.edu/dolly/bwckschd.p_disp_detail_sched?term_in=202301&crn_in=10116"
        );

        if (!response.ok) {
          throw new Error("HTTP error!");
        }

        const html = await response.text();

        const $ = cheerio.load(html);
        const element = $(
          "body > div.pagebodydiv > table:nth-child(1) > tbody > tr:nth-child(2) > td > table > tbody > tr:nth-child(2) > td:nth-child(4)"
        );

        if (parseInt(element.text()) === 52) {
          console.log("A seat found!");
          const finalSubmitButton = await page.$('input[type="submit"]');
          await finalSubmitButton.click();
          await page.waitForNavigation();
          const error = await page.$("body > div.pagebodydiv > form > table:nth-child(22) > tbody > tr > td:nth-child(1) > img");

          if (error === null){
            wait = false;
            relogin = false;
            break;
          }
          else {
            wait = false;
            page.close();
            break;
          }
          
        }
      } catch (e) {
        console.log(e.message);
      }
      cycle += 1
      if (cycle === 61) {
        page.close();
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 6000));
    }
  }

  
  console.log("Hopefully you took the course!");

  await browser.close();
})();
