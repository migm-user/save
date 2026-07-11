// ==UserScript==
// @name         Snail's Mod
// @namespace    O_"
// @version      1.3.1
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
// @description  o.o_b & junhwan Made
// @downloadURL  https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mod.user.js
// @updateURL    https://raw.githubusercontent.com/migm-user/save/main/Snail's%20Mod.user.js
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================
    // 설정
    // =========================================================

    var VERSION = '1.3.3';

    // 페이지 진입 후 첫 실행 대기시간
    var FIRST_RUN_DELAY_MS = 15000;

    // 반복 실행 주기
    var REPEAT_INTERVAL_MS = 60000;

    // Arie's Mod 알림 종 준비 대기시간
    var ARIES_WAIT_TIMEOUT_MS = 40000;

    // Buy all 버튼 생성 대기시간
    var BUY_BUTTON_WAIT_TIMEOUT_MS = 10000;

    // 구매 버튼을 누른 후 팝업 닫기 전 대기시간
    var CLOSE_AFTER_PURCHASE_MS = 2500;

    // 구매할 버튼이 없을 때 팝업 닫기 전 대기시간
    var CLOSE_WITHOUT_PURCHASE_MS = 1000;

    // Arie's Mod 알림 종 PixiJS label
    var BELL_LABEL = 'GeminiNotificationBell';

    // 중복 실행 방지
    var autoBuyRunning = false;

    // =========================================================
    // 공통 함수
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
            // unsafeWindow 접근 실패 시 window 사용
        }

        return window;
    }

    // =========================================================
    // PixiJS 상태 찾기
    // =========================================================

    function getPixiState() {
        var pageWindow = getPageWindow();

        return (
            pageWindow.__MG_SPRITE_STATE__ ||
            window.__MG_SPRITE_STATE__ ||
            null
        );
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
        if (!state) {
            return null;
        }

        var renderer = state.renderer;

        if (
            !renderer &&
            state.app &&
            state.app.renderer
        ) {
            renderer = state.app.renderer;
        }

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

    function findPixiObjectByLabel(root, targetLabel) {
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
                    var index = node.children.length - 1;
                    index >= 0;
                    index--
                ) {
                    stack.push(node.children[index]);
                }
            }
        }

        return null;
    }

    async function waitForNotificationBell() {
        var startedAt = Date.now();

        while (
            Date.now() - startedAt <
            ARIES_WAIT_TIMEOUT_MS
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

            await sleep(250);
        }

        return null;
    }

    // =========================================================
    // 알림 종 좌표 계산
    // =========================================================

    function getBellClientPosition(canvas, bell) {
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
             * 우선 Arie's Mod 방식과 비슷하게
             * toGlobal 좌표를 사용합니다.
             */
            if (
                typeof bell.toGlobal === 'function'
            ) {
                var buttonSize = 45;

                /*
                 * 부모 RightSideRail의 폭이 정상적으로 잡히면
                 * 버튼 크기로 사용합니다.
                 */
                if (
                    bell.parent &&
                    Number(bell.parent.width) > 0 &&
                    Number(bell.parent.width) < 200
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
             * toGlobal 실패 시 getBounds 사용
             */
            if (
                typeof bell.getBounds === 'function'
            ) {
                var bounds = bell.getBounds();

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
        var commonOptions = {
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

        canvas.dispatchEvent(
            new PointerEvent(
                'pointermove',
                Object.assign(
                    {},
                    commonOptions,
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
                    commonOptions,
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
                    commonOptions,
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
                '알림 종 위치를 계산하지 못했습니다.'
            );

            return false;
        }

        log(
            '알림 종 클릭 좌표:',
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
    // Buy all 버튼 찾기
    // =========================================================

    function isVisible(element) {
        if (
            !element ||
            !element.isConnected
        ) {
            return false;
        }

        var rect =
            element.getBoundingClientRect();

        var style =
            window.getComputedStyle(element);

        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0'
        );
    }

    function normalizeButtonText(button) {
        return String(
            button && button.textContent
                ? button.textContent
                : ''
        )
            .trim()
            .replace(/\s+/g, ' ')
            .toLowerCase();
    }

    function findBuyAllButtons() {
        return Array.prototype.slice
            .call(
                document.querySelectorAll(
                    'button'
                )
            )
            .filter(function (button) {
                return (
                    button &&
                    button.isConnected &&
                    isVisible(button) &&
                    !button.disabled &&
                    normalizeButtonText(button) ===
                        'buy all'
                );
            });
    }

    async function waitForBuyAllButtons() {
        var startedAt = Date.now();

        while (
            Date.now() - startedAt <
            BUY_BUTTON_WAIT_TIMEOUT_MS
        ) {
            var buttons =
                findBuyAllButtons();

            if (buttons.length > 0) {
                return buttons;
            }

            await sleep(250);
        }

        return [];
    }

    // =========================================================
    // Buy all 동시 클릭
    // =========================================================

    async function clickBuyAllButtons(buttons) {
        var validButtons =
            buttons.filter(function (button) {
                return (
                    button &&
                    button.isConnected &&
                    isVisible(button) &&
                    !button.disabled &&
                    normalizeButtonText(button) ===
                        'buy all'
                );
            });

        if (validButtons.length === 0) {
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
         * await나 지연 없이 같은 실행 흐름에서
         * 모든 버튼을 즉시 클릭합니다.
         */
        validButtons.forEach(
            function (button, index) {
                try {
                    button.click();

                    log(
                        String(index + 1) +
                        '/' +
                        String(validButtons.length) +
                        ' Buy all 클릭 전송'
                    );
                } catch (error) {
                    console.error(
                        '[Snail] Buy all 클릭 실패:',
                        error
                    );
                }
            }
        );

        return validButtons.length;
    }

    // =========================================================
    // 자동 구매 전체 과정
    // =========================================================

    async function autoBuy() {
        if (autoBuyRunning) {
            log(
                '이전 자동 구매가 진행 중입니다.'
            );

            return;
        }

        autoBuyRunning = true;

        /*
         * 이번 실행에서 팝업을 직접 열었는지 기록합니다.
         */
        var popupOpenedBySnail = false;

        try {
            log('자동 구매 검사 시작');

            /*
             * 이미 열린 팝업에 Buy all 버튼이 있는지 확인
             */
            var buttons =
                findBuyAllButtons();

            /*
             * 버튼이 없으면 종을 눌러 팝업을 엽니다.
             */
            if (buttons.length === 0) {
                var openResult =
                    await clickNotificationBell();

                if (!openResult) {
                    warn(
                        '알림 팝업을 열지 못했습니다.'
                    );

                    return;
                }

                popupOpenedBySnail = true;

                /*
                 * 팝업과 Buy all 버튼이 나타날 때까지 대기
                 */
                buttons =
                    await waitForBuyAllButtons();
            }

            /*
             * 구매 가능한 버튼이 있는 경우
             */
            if (buttons.length > 0) {
                log(
                    'Buy all 버튼 ' +
                    String(buttons.length) +
                    '개 발견'
                );

                var clickedCount =
                    await clickBuyAllButtons(
                        buttons
                    );

                log(
                    '자동 구매 완료: ' +
                    String(clickedCount) +
                    '개 클릭'
                );

                /*
                 * 구매 요청 처리 및 화면 갱신 대기
                 */
                await sleep(
                    CLOSE_AFTER_PURCHASE_MS
                );
            } else {
                /*
                 * 구매할 버튼이 없는 경우
                 */
                log(
                    '구매 가능한 Buy all 버튼이 없습니다.'
                );

                await sleep(
                    CLOSE_WITHOUT_PURCHASE_MS
                );
            }

            /*
             * Snail's Mod가 이번 실행에서 팝업을 열었다면
             * 종 버튼을 다시 눌러 팝업을 닫습니다.
             */
            if (popupOpenedBySnail) {
                var closeResult =
                    await clickNotificationBell();

                if (closeResult) {
                    log(
                        '🔔 알림 팝업 닫기 완료'
                    );
                } else {
                    warn(
                        '알림 팝업을 닫지 못했습니다.'
                    );
                }
            }
        } catch (error) {
            console.error(
                '[Snail] 자동 구매 오류:',
                error
            );
        } finally {
            autoBuyRunning = false;
        }
    }

    // =========================================================
    // 콘솔 테스트용 API
    // =========================================================

    var SnailModApi = {
        version: VERSION,

        run: function () {
            return autoBuy();
        },

        clickBell: function () {
            return clickNotificationBell();
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
                stateFound: Boolean(state),
                stageFound: Boolean(stage),
                canvasFound: Boolean(canvas),
                bellFound: Boolean(bell),
                bell: bell,
                buyAllButtons:
                    findBuyAllButtons()
            };
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

    /*
     * 첫 실행
     */
    setTimeout(
        autoBuy,
        FIRST_RUN_DELAY_MS
    );

    /*
     * 반복 실행
     */
    setInterval(
        autoBuy,
        REPEAT_INTERVAL_MS
    );
})();
