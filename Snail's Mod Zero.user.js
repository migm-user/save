// ==UserScript==
// @name         Snail's Mod Zero
// @namespace    O_"
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
// @connect      cdn.pixabay.com
// @connect      cdn.jsdelivr.net
// @connect      magicgarden.gg
// @connect      i.imgur.com
// @connect      cdn.discordapp.com
// @description  o.o_b
// @downloadURL  https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mod%20Zero.user.js
// @updateURL    https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mod%20Zero.user.js
// ==/UserScript==

//★ 자동 구매

async function autoBuy() {

    // 플로팅 알림 버튼 찾기
    const bell = document.querySelector(
        'button[data-notification-bell-widget="1"]'
    );

    if (!bell) {
        console.log("🔔 Notification 버튼 없음");
        return;
    }

    // 알림창 열기
    bell.click();

    // 패널이 열릴 시간 대기
    await new Promise(r => setTimeout(r, 300));

    // Buy all 클릭
    const buttons = [...document.querySelectorAll("button")]
        .filter(btn =>
            btn.textContent.trim() === "Buy all" &&
            !btn.disabled &&
            btn.offsetParent !== null
        );

    if (buttons.length === 0) {
        console.log("구매할 상품 없음");
    }

    buttons.forEach(btn => {
        btn.click();
        console.log("✅ Buy all");
    });

    // 서버 처리 대기
    await new Promise(r => setTimeout(r, 500));

    // 패널 닫기
    bell.click();
}

// 15초 후 시작
setTimeout(autoBuy, 15000);

// 이후 1분마다
setInterval(autoBuy, 60000);

//요기가 끝
