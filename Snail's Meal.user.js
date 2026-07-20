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
const FEED_INTERVAL = 10 * 60 * 1000; // 10분

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


// UI

// const → let 으로 변경
let FEED_INTERVAL =
    (Number(localStorage.getItem("feed_interval_minutes")) || 10) * 60 * 1000;

(function () {
    'use strict';

    const BUTTON_SIZE = 44;
    const STORAGE_KEY = "feed-button-position";

    //------------------------------------
    // 버튼
    //------------------------------------

    const feedBtn = document.createElement("button");

    Object.assign(feedBtn.style, {
        position: "fixed",
        width: BUTTON_SIZE + "px",
        height: BUTTON_SIZE + "px",
        right: "20px",
        top: "350px",
        zIndex: 1999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        border: "1px solid #32404e",
        background: "linear-gradient(180deg,#111923,#0b131c)",
        color: "#fff",
        fontSize: "22px",
        cursor: "grab",
        userSelect: "none",
        boxShadow: "0 10px 28px rgba(0,0,0,.45)"
    });

    feedBtn.textContent = "🍖";
    feedBtn.title = "Feed Interval";

    document.body.appendChild(feedBtn);

    //------------------------------------
    // 드래그
    //------------------------------------

    let drag = null;

    feedBtn.onpointerdown = e => {

        const rect = feedBtn.getBoundingClientRect();

        drag = {
            x: e.clientX,
            y: e.clientY,
            left: rect.left,
            top: rect.top,
            moved: false
        };

        feedBtn.setPointerCapture(e.pointerId);
        feedBtn.style.cursor = "grabbing";
    };

    feedBtn.onpointermove = e => {

        if (!drag) return;

        const dx = e.clientX - drag.x;
        const dy = e.clientY - drag.y;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3)
            drag.moved = true;

        feedBtn.style.left = drag.left + dx + "px";
        feedBtn.style.top = drag.top + dy + "px";
        feedBtn.style.right = "auto";
    };

    feedBtn.onpointerup = () => {

        feedBtn.style.cursor = "grab";

        if (!drag.moved)
            togglePanel();

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            left: feedBtn.style.left,
            top: feedBtn.style.top
        }));

        drag = null;
    };

    //------------------------------------
    // 위치 복원
    //------------------------------------

    try{

        const pos = JSON.parse(localStorage.getItem(STORAGE_KEY));

        if(pos){
            feedBtn.style.left = pos.left;
            feedBtn.style.top = pos.top;
            feedBtn.style.right = "auto";
        }

    }catch{}

    //------------------------------------
    // 패널
    //------------------------------------

    const panel = document.createElement("div");

    Object.assign(panel.style,{
        position:"fixed",
        width:"220px",
        padding:"15px",
        background:"#10161d",
        border:"1px solid #32404e",
        borderRadius:"10px",
        color:"white",
        fontFamily:"sans-serif",
        zIndex:2000000,
        display:"none",
        boxShadow:"0 10px 30px rgba(0,0,0,.45)"
    });

    panel.innerHTML=`
        <div style="font-size:17px;font-weight:bold;margin-bottom:10px;">
            🍖 Feed Interval
        </div>

        <div style="margin-bottom:5px;">
            Minutes
        </div>

        <input id="feedMinutes"
            type="number"
            min="1"
            style="
                width:100%;
                padding:6px;
                font-size:16px;
                margin-bottom:10px;
                background:#1b2530;
                color:white;
                border:1px solid #444;
                border-radius:6px;
            ">

        <button id="feedApply"
            style="
                width:100%;
                padding:8px;
                border:none;
                border-radius:6px;
                background:#4caf50;
                color:white;
                cursor:pointer;
                font-size:15px;
            ">
            Apply
        </button>

        <div id="feedCurrent"
            style="
                margin-top:10px;
                text-align:center;
                opacity:.7;
                font-size:13px;
            ">
        </div>
    `;

    document.body.appendChild(panel);

    const input=panel.querySelector("#feedMinutes");
    const apply=panel.querySelector("#feedApply");
    const current=panel.querySelector("#feedCurrent");

    //------------------------------------
    // 표시
    //------------------------------------

    function refreshLabel(){

        current.textContent=
            `Current : ${FEED_INTERVAL/60000} minute(s)`;

        input.value=FEED_INTERVAL/60000;
    }

    //------------------------------------
    // 열기
    //------------------------------------

    function togglePanel(){

        if(panel.style.display==="none"){

            panel.style.display="block";

            const rect=feedBtn.getBoundingClientRect();

            panel.style.left=(rect.left-235)+"px";
            panel.style.top=rect.top+"px";

            refreshLabel();

            input.focus();
            input.select();

        }else{

            panel.style.display="none";

        }
    }

    //------------------------------------
    // 적용
    //------------------------------------

    function applyValue(){

        const min=Math.max(1,Number(input.value));

        FEED_INTERVAL=min*60000;

        localStorage.setItem(
            "feed_interval_minutes",
            min
        );

        refreshLabel();

        console.log("Feed Interval =",FEED_INTERVAL,"ms");
    }

    apply.onclick=applyValue;

    input.onkeydown=e=>{

        if(e.key==="Enter")
            applyValue();

        if(e.key==="Escape")
            panel.style.display="none";
    };

})();
