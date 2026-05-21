// ==UserScript==
// @name         Snail's Mod
// @namespace    @_"
// @version      1.2.0
// @match        https://1227719606223765687.discordsays.com/*
// @match        https://magiccircle.gg/r/*
// @match        https://magicgarden.gg/r/*
// @match        https://starweaver.org/r/*
// @match        https://ariesmod-api.ariedam.fr/*
// @run-at       document-idle
// @inject-into  page
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

// @downloadURL  
// @updateURL    
// ==/UserScript==
//★ 구매
const autoClickAllButtons = () => {

    // Notifications 버튼 찾기
    const notificationBtn = document.querySelector('button[aria-label="Notifications"]');

    // 있으면 먼저 클릭
    if (notificationBtn) {
        notificationBtn.click();
        console.log('🔔 Notifications 열기');

    setTimeout(() => {
        notificationBtn.click();
        console.log('🔔 Notifications 닫기');
    }, 500);
    }

    // 잠깐 기다렸다가 Buy all 클릭
    setTimeout(() => {

        const allButtons = Array.from(document.querySelectorAll('button'))
            .filter(btn => btn.textContent.trim() === 'Buy all');

        allButtons.forEach(btn => {
            if (btn && !btn.disabled) {
                btn.click();
                console.log('✅ Buy all 버튼 클릭');
            }
        });

    }, 1000); // 1초 기다림
};

// 10초 뒤 시작 + 2분마다 반복
setTimeout(autoClickAllButtons, 20000);
setInterval(autoClickAllButtons, 1 * 60 * 1000);
//요기가 끝
