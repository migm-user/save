// ==UserScript==
// @name         JH's Auto Mod
// @namespace    junhwan
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
// @description  junhwan Made
// @downloadURL  https://raw.githubusercontent.com/migm-user/save/main/JH's%20Mod.user.js
// @updateURL    https://raw.githubusercontent.com/migm-user/save/main/JH's%20Mod.user.js
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================
    // 설정
    // =========================================================

    var VERSION = '1.3.5';

    // 페이지 접속 후 첫 실행: 15초
    var FIRST_RUN_DELAY_MS = 15000;

    // 이후 반복 실행: 60초
    var REPEAT_INTERVAL_MS = 60000;

    // Arie's Mod 알림 종 준비 최대 대기시간
    var BELL_READY_TIMEOUT_MS = 40000;

    // 팝업 열림 확인 최대시간
    var POPUP_OPEN_TIMEOUT_MS = 3000;

    // 팝업 닫힘 확인 최대시간
    var POPUP_CLOSE_TIMEOUT_MS = 3000;

    // 팝업을 연 후 Buy all 버튼이 나타나기를 기다리는 시간
    var BUY_ALL_WAIT_TIMEOUT_MS = 5000;

    // 구매 또는 구매 실패 후 닫기 전 시간
    var CLOSE_DELAY_MS = 100;

    // Arie's Mod 알림 종 PixiJS label
    var BELL_LABEL = 'GeminiNotificationBell';

    /*
     * 알림 팝업 안에 표시되는 고유 문구입니다.
     * 대소문자와 공백은 자동으로 정규화합니다.
     */
    var POPUP_TEXT_MARKERS = [
        'tracked items available'
    ];

    // 중복 실행 방지
    var autoBuyRunning = false;

    // 타이머
    var firstRunTimer = null;
    var repeatTimer = null;

    // =========================================================
    // 로그 및 공통 함수
    // =========================================================

    function log() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[Snail]');
        console.log.apply(console, args);
    }

    function warn() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[Snail]');
        console.warn.apply(console, args);
    }

    function errorLog() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[Snail]');
        console.error.apply(console, args);
    }

    function sleep(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function getPageWindow() {
        try {
            if (
                typeof unsafeWindow !== 'undefined' &&
                unsafeWindow
            ) {
                return unsafeWindow;
            }
        } catch (error) {
            // unsafeWindow에 접근할 수 없으면 일반 window 사용
        }

        return window;
    }

    function normalizeText(value) {
        return String(value || '')
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    // =========================================================
    // HTML 요소 확인
    // =========================================================

    function isVisible(element) {
        if (
            !element ||
            !element.isConnected
        ) {
            return false;
        }

        var rect = element.getBoundingClientRect();
        var style = window.getComputedStyle(element);

        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
        );
    }

    function getButtonText(button) {
        return normalizeText(
            button ? button.textContent : ''
        );
    }

    // =========================================================
    // Buy all 버튼 찾기
    // =========================================================

    function findBuyAllButtons() {
        return Array.prototype.slice
            .call(document.querySelectorAll('button'))
            .filter(function (button) {
                return (
                    button &&
                    button.isConnected &&
                    isVisible(button) &&
                    !button.disabled &&
                    getButtonText(button) === 'buy all'
                );
            });
    }

    async function waitForBuyAllButtons(timeoutMs) {
        var startedAt = Date.now();

        while (
            Date.now() - startedAt <
            timeoutMs
        ) {
            var buttons = findBuyAllButtons();

            if (buttons.length > 0) {
                return buttons;
            }

            await sleep(100);
        }

        return [];
    }

    // =========================================================
    // 알림 팝업 열림 여부 확인
    // =========================================================

    function elementContainsPopupMarker(element) {
        if (
            !element ||
            !isVisible(element)
        ) {
            return false;
        }

        var text = normalizeText(
            element.textContent
        );

        if (!text) {
            return false;
        }

        return POPUP_TEXT_MARKERS.some(function (marker) {
            var normalizedMarker =
                normalizeText(marker);

            return (
                text === normalizedMarker ||
                text.indexOf(normalizedMarker) !== -1
            );
        });
    }

    function findNotificationPopupMarker() {
        var candidates =
            Array.prototype.slice.call(
                document.querySelectorAll(
                    'div, section, aside, dialog, span, p, h1, h2, h3, h4'
                )
            );

        for (
            var index = 0;
            index < candidates.length;
            index++
        ) {
            if (
                elementContainsPopupMarker(
                    candidates[index]
                )
            ) {
                return candidates[index];
            }
        }

        return null;
    }

    function isNotificationPopupOpen() {
        /*
         * Buy all 버튼이 보이면 팝업은 확실히 열린 상태입니다.
         */
        if (findBuyAllButtons().length > 0) {
            return true;
        }

        /*
         * 구매 가능한 상품이 없어서 Buy all 버튼이 없는 경우에는
         * 팝업의 고유 제목 또는 문구로 확인합니다.
         */
        return Boolean(
            findNotificationPopupMarker()
        );
    }

    async function waitForPopupState(
        expectedOpen,
        timeoutMs
    ) {
        var startedAt = Date.now();

        while (
            Date.now() - startedAt <
            timeoutMs
        ) {
            if (
                isNotificationPopupOpen() ===
                expectedOpen
            ) {
                return true;
            }

            await sleep(50);
        }

        return (
            isNotificationPopupOpen() ===
            expectedOpen
        );
    }

    // =========================================================
    // Arie's Mod PixiJS 상태 찾기
    // =========================================================

    function getPixiState() {
        var pageWindow = getPageWindow();

        return (
            pageWindow.__MG_SPRITE_STATE__ ||
            window.__MG_SPRITE_STATE__ ||
            null
        );
    }

    function getPixiRenderer(state) {
        if (!state) {
            return null;
        }

        if (state.renderer) {
            return state.renderer;
        }

        if (
            state.app &&
            state.app.renderer
        ) {
            return state.app.renderer;
        }

        return null;
    }

    function getPixiStage(state) {
        if (!state) {
            return null;
        }

        if (
            state.app &&
            state.app.stage
        ) {
            return state.app.stage;
        }

        if (
            state.renderer &&
            state.renderer.lastObjectRendered
        ) {
            return state.renderer.lastObjectRendered;
        }

        if (
            state.renderer &&
            state.renderer.stage
        ) {
            return state.renderer.stage;
        }

        return null;
    }

    function getPixiCanvas(state) {
        var renderer =
            getPixiRenderer(state);

        if (!renderer) {
            return null;
        }

        if (renderer.canvas) {
            return renderer.canvas;
        }

        if (
            renderer.view &&
            renderer.view.canvas
        ) {
            return renderer.view.canvas;
        }

        if (renderer.view) {
            return renderer.view;
        }

        return null;
    }

    function findPixiObjectByLabel(
        root,
        targetLabel
    ) {
        if (!root) {
            return null;
        }

        var stack = [root];
        var visited = new Set();

        while (stack.length > 0) {
            var node = stack.pop();

            if (
                !node ||
                visited.has(node)
            ) {
                continue;
            }

            visited.add(node);

            if (
                node.label === targetLabel ||
                node.name === targetLabel
            ) {
                return node;
            }

            if (Array.isArray(node.children)) {
                for (
                    var index =
                        node.children.length - 1;
                    index >= 0;
                    index--
                ) {
                    stack.push(
                        node.children[index]
                    );
                }
            }
        }

        return null;
    }

    async function waitForNotificationBell() {
        var startedAt = Date.now();

        while (
            Date.now() - startedAt <
            BELL_READY_TIMEOUT_MS
        ) {
            var state = getPixiState();
            var stage = getPixiStage(state);
            var canvas = getPixiCanvas(state);

            if (
                state &&
                stage &&
                canvas
            ) {
                var bell =
                    findPixiObjectByLabel(
                        stage,
                        BELL_LABEL
                    );

                if (
                    bell &&
                    !bell.destroyed &&
                    bell.visible !== false &&
                    bell.renderable !== false
                ) {
                    return {
                        state: state,
                        stage: stage,
                        canvas: canvas,
                        bell: bell
                    };
                }
            }

            await sleep(200);
        }

        return null;
    }

    // =========================================================
    // 알림 종 좌표 계산
    // =========================================================

    function getBellClientPosition(
        canvas,
        bell
    ) {
        if (
            !canvas ||
            !bell
        ) {
            return null;
        }

        try {
            var canvasRect =
                canvas.getBoundingClientRect();

            /*
             * Arie's Mod가 사용하는 방식과 같이
             * PixiJS 전역 좌표를 캔버스 화면 좌표에 더합니다.
             */
            if (
                typeof bell.toGlobal ===
                'function'
            ) {
                var buttonSize = 45;

                /*
                 * RightSideRail의 폭이 정상적인 버튼 크기 범위라면
                 * 실제 버튼 크기로 사용합니다.
                 */
                if (
                    bell.parent &&
                    Number.isFinite(
                        Number(bell.parent.width)
                    ) &&
                    Number(bell.parent.width) > 10 &&
                    Number(bell.parent.width) < 150
                ) {
                    buttonSize =
                        Number(bell.parent.width);
                }

                var topLeft =
                    bell.toGlobal({
                        x: 0,
                        y: 0
                    });

                var bottomRight =
                    bell.toGlobal({
                        x: buttonSize,
                        y: buttonSize
                    });

                if (
                    topLeft &&
                    bottomRight &&
                    Number.isFinite(topLeft.x) &&
                    Number.isFinite(topLeft.y) &&
                    Number.isFinite(bottomRight.x) &&
                    Number.isFinite(bottomRight.y)
                ) {
                    return {
                        clientX:
                            canvasRect.left +
                            (
                                topLeft.x +
                                bottomRight.x
                            ) / 2,

                        clientY:
                            canvasRect.top +
                            (
                                topLeft.y +
                                bottomRight.y
                            ) / 2
                    };
                }
            }

            /*
             * toGlobal 사용이 실패한 경우 getBounds로 대체합니다.
             */
            if (
                typeof bell.getBounds ===
                'function'
            ) {
                var bounds =
                    bell.getBounds();

                if (
                    bounds &&
                    Number.isFinite(bounds.x) &&
                    Number.isFinite(bounds.y) &&
                    Number.isFinite(bounds.width) &&
                    Number.isFinite(bounds.height) &&
                    bounds.width > 0 &&
                    bounds.height > 0
                ) {
                    return {
                        clientX:
                            canvasRect.left +
                            bounds.x +
                            bounds.width / 2,

                        clientY:
                            canvasRect.top +
                            bounds.y +
                            bounds.height / 2
                    };
                }
            }
        } catch (error) {
            warn(
                '알림 종 좌표 계산 오류:',
                error
            );
        }

        return null;
    }

    // =========================================================
    // 알림 종 클릭
    // =========================================================

    function dispatchBellClick(
        canvas,
        clientX,
        clientY
    ) {
        var baseOptions = {
            bubbles: true,
            cancelable: true,
            composed: true,

            clientX: clientX,
            clientY: clientY,

            screenX:
                window.screenX + clientX,

            screenY:
                window.screenY + clientY,

            pointerId: 1,
            pointerType: 'mouse',
            isPrimary: true,
            button: 0
        };

        /*
         * Arie's Mod는 window 캡처 단계의 pointerdown으로
         * 알림 종 클릭을 처리합니다.
         */
        canvas.dispatchEvent(
            new PointerEvent(
                'pointermove',
                Object.assign(
                    {},
                    baseOptions,
                    {
                        buttons: 0
                    }
                )
            )
        );

        canvas.dispatchEvent(
            new PointerEvent(
                'pointerdown',
                Object.assign(
                    {},
                    baseOptions,
                    {
                        buttons: 1
                    }
                )
            )
        );

        canvas.dispatchEvent(
            new PointerEvent(
                'pointerup',
                Object.assign(
                    {},
                    baseOptions,
                    {
                        buttons: 0
                    }
                )
            )
        );
    }

    async function clickNotificationBell() {
        var context =
            await waitForNotificationBell();

        if (!context) {
            warn(
                'Arie’s Mod 알림 종을 찾지 못했습니다.'
            );

            return false;
        }

        var position =
            getBellClientPosition(
                context.canvas,
                context.bell
            );

        if (!position) {
            warn(
                '알림 종 화면 좌표를 계산하지 못했습니다.'
            );

            return false;
        }

        log(
            '알림 종 클릭:',
            Math.round(position.clientX),
            Math.round(position.clientY)
        );

        dispatchBellClick(
            context.canvas,
            position.clientX,
            position.clientY
        );

        return true;
    }

    // =========================================================
    // 팝업 열기 및 닫기
    // =========================================================

    async function ensureNotificationPopupOpen() {
        /*
         * 사용자가 수동으로 이미 열어놓았다면
         * 종 버튼을 다시 누르지 않습니다.
         */
        if (isNotificationPopupOpen()) {
            log(
                '알림 팝업이 이미 열려 있습니다.'
            );

            return true;
        }

        log('알림 팝업을 엽니다.');

        var clicked =
            await clickNotificationBell();

        if (!clicked) {
            warn(
                '알림 종 클릭에 실패했습니다.'
            );

            return false;
        }

        var opened =
            await waitForPopupState(
                true,
                POPUP_OPEN_TIMEOUT_MS
            );

        if (!opened) {
            warn(
                '종을 눌렀지만 팝업 열림이 확인되지 않았습니다.'
            );
        }

        return opened;
    }

    async function closeNotificationPopupIfOpen() {
        /*
         * 현재 실제로 열린 상태일 때만 종을 누릅니다.
         */
        if (!isNotificationPopupOpen()) {
            log(
                '팝업이 이미 닫혀 있어 닫기 클릭을 생략합니다.'
            );

            return true;
        }

        /*
         * 요청대로 거의 즉시 닫습니다.
         */
        if (CLOSE_DELAY_MS > 0) {
            await sleep(
                CLOSE_DELAY_MS
            );
        }

        /*
         * 100ms 사이에 다른 동작으로 이미 닫혔을 수도 있으므로
         * 종을 누르기 직전에 다시 확인합니다.
         */
        if (!isNotificationPopupOpen()) {
            log(
                '대기 중 팝업이 닫혀 종 클릭을 생략합니다.'
            );

            return true;
        }

        log(
            '열려 있는 알림 팝업을 닫습니다.'
        );

        var clicked =
            await clickNotificationBell();

        if (!clicked) {
            warn(
                '팝업 닫기용 종 클릭에 실패했습니다.'
            );

            return false;
        }

        var closed =
            await waitForPopupState(
                false,
                POPUP_CLOSE_TIMEOUT_MS
            );

        if (closed) {
            log(
                '🔔 알림 팝업 닫기 완료'
            );
        } else {
            warn(
                '종을 눌렀지만 팝업 닫힘이 확인되지 않았습니다.'
            );
        }

        return closed;
    }

    // =========================================================
    // Buy all 버튼 동시 클릭
    // =========================================================

    function clickAllBuyAllButtons(
        buttons
    ) {
        var validButtons =
            buttons.filter(function (button) {
                return (
                    button &&
                    button.isConnected &&
                    isVisible(button) &&
                    !button.disabled &&
                    getButtonText(button) ===
                        'buy all'
                );
            });

        if (
            validButtons.length === 0
        ) {
            log(
                '클릭 가능한 Buy all 버튼이 없습니다.'
            );

            return 0;
        }

        log(
            'Buy all 버튼 ' +
            String(validButtons.length) +
            '개 동시 클릭'
        );

        /*
         * 버튼 사이에 await나 sleep을 넣지 않습니다.
         * 같은 JavaScript 실행 흐름에서 모두 클릭합니다.
         */
        validButtons.forEach(
            function (button, index) {
                try {
                    button.click();

                    log(
                        String(index + 1) +
                        '/' +
                        String(validButtons.length) +
                        ' Buy all 클릭'
                    );
                } catch (error) {
                    errorLog(
                        'Buy all 버튼 클릭 실패:',
                        error
                    );
                }
            }
        );

        return validButtons.length;
    }

    // =========================================================
    // 자동 구매
    // =========================================================

    async function autoBuy() {
        if (autoBuyRunning) {
            log(
                '이전 자동 구매 작업이 진행 중입니다.'
            );

            return;
        }

        autoBuyRunning = true;

        try {
            log('자동 구매 검사 시작');

            /*
             * 실제 팝업 상태를 확인합니다.
             * 닫혀 있을 때만 종을 눌러 엽니다.
             */
            var popupOpened =
                await ensureNotificationPopupOpen();

            if (!popupOpened) {
                warn(
                    '알림 팝업을 열지 못해 작업을 종료합니다.'
                );

                return;
            }

            /*
             * 팝업이 열렸으므로 Buy all 버튼을 찾습니다.
             */
            var buttons =
                await waitForBuyAllButtons(
                    BUY_ALL_WAIT_TIMEOUT_MS
                );

            if (
                buttons.length > 0
            ) {
                log(
                    'Buy all 버튼 ' +
                    String(buttons.length) +
                    '개 발견'
                );

                var clickedCount =
                    clickAllBuyAllButtons(
                        buttons
                    );

                log(
                    '자동 구매 클릭 완료: ' +
                    String(clickedCount) +
                    '개'
                );
            } else {
                log(
                    '구매 가능한 Buy all 버튼이 없습니다.'
                );
            }

            /*
             * 구매 성공, 실패, 구매 대상 없음과 관계없이
             * 실제로 팝업이 열려 있을 때만 닫습니다.
             */
            await closeNotificationPopupIfOpen();
        } catch (error) {
            errorLog(
                '자동 구매 작업 오류:',
                error
            );

            /*
             * 오류가 발생해도 실제로 팝업이 열려 있으면 닫습니다.
             */
            try {
                await closeNotificationPopupIfOpen();
            } catch (closeError) {
                errorLog(
                    '오류 발생 후 팝업 닫기 실패:',
                    closeError
                );
            }
        } finally {
            autoBuyRunning = false;
        }
    }

    // =========================================================
    // 콘솔 테스트 API
    // =========================================================

    var SnailModApi = {
        version: VERSION,

        run: function () {
            return autoBuy();
        },

        clickBell: function () {
            return clickNotificationBell();
        },

        isPopupOpen: function () {
            return isNotificationPopupOpen();
        },

        openPopup: function () {
            return ensureNotificationPopupOpen();
        },

        closePopup: function () {
            return closeNotificationPopupIfOpen();
        },

        findBuyAll: function () {
            return findBuyAllButtons();
        },

        findBell: function () {
            var state = getPixiState();
            var stage = getPixiStage(state);

            return findPixiObjectByLabel(
                stage,
                BELL_LABEL
            );
        },

        getDebug: function () {
            var state = getPixiState();
            var stage = getPixiStage(state);
            var canvas = getPixiCanvas(state);
            var bell =
                findPixiObjectByLabel(
                    stage,
                    BELL_LABEL
                );

            return {
                version: VERSION,
                running: autoBuyRunning,

                pixiStateFound:
                    Boolean(state),

                stageFound:
                    Boolean(stage),

                canvasFound:
                    Boolean(canvas),

                bellFound:
                    Boolean(bell),

                popupOpen:
                    isNotificationPopupOpen(),

                popupMarker:
                    findNotificationPopupMarker(),

                buyAllButtons:
                    findBuyAllButtons(),

                bell: bell
            };
        },

        stop: function () {
            if (firstRunTimer) {
                clearTimeout(
                    firstRunTimer
                );

                firstRunTimer = null;
            }

            if (repeatTimer) {
                clearInterval(
                    repeatTimer
                );

                repeatTimer = null;
            }

            log(
                '자동 실행 타이머를 중지했습니다.'
            );
        },

        start: function () {
            SnailModApi.stop();

            firstRunTimer =
                setTimeout(
                    autoBuy,
                    FIRST_RUN_DELAY_MS
                );

            repeatTimer =
                setInterval(
                    autoBuy,
                    REPEAT_INTERVAL_MS
                );

            log(
                '자동 실행 타이머를 시작했습니다.'
            );
        }
    };

    try {
        window.SnailMod =
            SnailModApi;
    } catch (error) {
        warn(
            'window.SnailMod 등록 실패:',
            error
        );
    }

    try {
        getPageWindow().SnailMod =
            SnailModApi;
    } catch (error) {
        warn(
            '페이지 SnailMod 등록 실패:',
            error
        );
    }

    // =========================================================
    // 시작
    // =========================================================

    log(
        'Snail’s Mod v' +
        VERSION +
        ' 실행됨'
    );

    firstRunTimer =
        setTimeout(
            autoBuy,
            FIRST_RUN_DELAY_MS
        );

    repeatTimer =
        setInterval(
            autoBuy,
            REPEAT_INTERVAL_MS
        );
})();
