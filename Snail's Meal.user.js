// ==UserScript==
// @name         Snail's Meal
// @namespace    O_"
// @author       O_"
// @version      1.1.1
// @match        https://1227719606223765687.discordsays.com/*
// @match        https://magiccircle.gg/r/*
// @match        https://magicgarden.gg/r/*
// @match        https://starweaver.org/r/*
// @match        https://ariesmod-api.ariedam.fr/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_info
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_download
// @connect      raw.githubusercontent.com
// @connect      api.github.com
// @connect      ariesmod-api.ariedam.fr
// @connect      mg-api.ariedam.fr
// @connect      ariedam.fr
// @connect      cdn.pixabay.com
// @connect      cdn.jsdelivr.net
// @connect      magicgarden.gg
// @connect      i.imgur.com
// @connect      cdn.discordapp.com
// @description  o.o_b
// @downloadURL  https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Meal.user.js
// @updateURL    https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Meal.user.js
// ==/UserScript==

// ★ Instant Feed Test
const FEED_INTERVAL = 15 * 60 * 1000; // 10분

function clickAllInstantFeedButtons() {

    const buttons = [
        ...document.querySelectorAll(
            'button[data-instant-feed-btn="1"]'
        )
    ].filter(btn =>
        btn.isConnected &&
        !btn.disabled &&
        btn.offsetParent !== null
    );

    if (!buttons.length) {
        console.log("[InstantFeed] 버튼 없음");
        return;
    }

    console.log(`[InstantFeed] ${buttons.length}개 버튼 클릭`);

    buttons.forEach((btn, index) => {
        setTimeout(() => {
            try {
                btn.click();
                console.log(
                    `[InstantFeed] ${index + 1}/${buttons.length} 클릭`
                );
            } catch (e) {
                console.warn(e);
            }
        }, index * 300); // 0.3초 간격
    });
}

// 5초 후 첫 실행
setTimeout(clickAllInstantFeedButtons, 5000);

// 이후 10분마다 반복
setInterval(clickAllInstantFeedButtons, FEED_INTERVAL);
