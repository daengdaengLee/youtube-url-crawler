const fs = require("fs");
const puppeteer = require("puppeteer");

const names = require("./names.json");

const MS_TIME = {
    ONE_SECOND: 1000,
};

const getYouTubeUrl = async (page, name) => {
    await page.goto("https://youtube.com");
    await page.waitForSelector("input#search");
    await page.type("input#search", name);
    await page.waitFor(MS_TIME.ONE_SECOND);
    await page.waitForSelector("button#search-icon-legacy");
    await Promise.all([
        page.waitForNavigation({ waitUntil: "load" }),
        page.click("button#search-icon-legacy")
    ]);
    await page.waitForSelector("ytd-channel-renderer")
    const $channels = [...await page.$$("ytd-channel-renderer")];
    const $as = (await Promise.all($channels.map($c => $c.$$("a#main-link")))).flat();
    const urls = await Promise.all($as.map($a => $a.evaluate($a => $a.href)));
    await page.waitFor(MS_TIME.ONE_SECOND);
    return urls;
};

const writeResult = result => new Promise((resolve, reject) =>
    fs.writeFile("result.json", JSON.stringify(result, null, 2), { encoding: "utf-8" }, error => {
        if (error) return reject(error);
        return resolve();
    }));

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            "--start-fullscreen"
        ]
    });
    const page = await browser.newPage();

    const result = [];

    try {
        for (const name of names) {
            const urls = await getYouTubeUrl(page, name);
            result.push({ name, urls });
        }
    } catch (error) {
        await browser.close();

        console.group("puppeteer");
        console.error(error);
        console.groupEnd();
    }

    await writeResult(result)
        .catch(error => {
            console.group("fs.writeFile");
            console.error(error);
            console.groupEnd();
        });

    await browser.close();
})();