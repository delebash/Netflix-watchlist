const Apify = require('apify');

const loggedCheck = async (page) => {

    try {
        await page.waitForSelector('.icon-search', {timeout: 100000});
        return true;
    } catch (e) {
        try {
            //prfofile page
            await page.waitForSelector('.profile-gate-label', {timeout: 100000});
            return true
        } catch (e) {
            return false
        }
    }
};

const profileCheck = async (page) => {

    try {
        await page.waitForSelector('.profile-link', {timeout: 100000});
        return true;
    } catch (e) {
        return false
    }
};

Apify.main(async () => {
    const input = await Apify.getValue('INPUT');

    const netflixCacheStore = await Apify.openKeyValueStore('netflix-cache');
    const cookiesStoreKey = input.username.replace('@', '(at)');

    const browser = await Apify.launchPuppeteer();
    const page = await browser.newPage();

    let isLogged = false;
    let userCookies = await netflixCacheStore.getValue(cookiesStoreKey);
    if (userCookies) {
        console.log('Try to use cookies from cache..')
        await page.setCookie(...userCookies);
        await page.goto('https://netflix.com/browse');
        isLogged = await loggedCheck(page);
    }

    if (!isLogged) {
        console.log(`Cookies from cache didn't work, try to login..`);
        await page.goto('https://netflix.com/signin');
        await page.type('#id_userLoginId', input.username);
        const navigationPromise = page.waitForNavigation();
        await page.type('#id_password', input.password);
        await page.click('button[type=submit]');
        await navigationPromise; // The navigationPromise resolves after navigation has finished

        // await page.waitForNavigation();
        isLogged = await loggedCheck(page);
    } else {
    }

    if (!isLogged) {
        throw new Error('Incorrect username or password!')
    }

    // Get cookies and refresh them in store cache
    console.log(`Saving new cookies to cache..`);
    const cookies = await page.cookies();
    await netflixCacheStore.setValue(cookiesStoreKey, cookies);
    let isProfilePage = await profileCheck(page);
    if (isProfilePage === true) {
        await page.click('a.profile-link');
    }

    // // Use cookies in other tab or browser
    // const page2 = await browser.newPage();
    // await page2.setCookie(...cookies);
    // await page2.goto('https://netflix.com/browse'); // Opens page as logged user
    console.log(`Saving new cookies to cache..`);
    await browser.close();

    console.log('Done.');
});
