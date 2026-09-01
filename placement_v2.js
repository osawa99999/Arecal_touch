/**
 * ================================================================
 *  Arecalay (placement.js) — 免責事項および利用上の注意
 * ================================================================
 *  本ソフトウェア（Arecalay、AreCalの配置モード拡張）は、大崎建設株式会社
 *  ICT推進室が独自に開発したものであり、同社内での使用を
 *  目的としています。
 *
 *  ・本ソフトウェアは現状のまま提供されるものとし、その動作、精度、完全性
 *    についていかなる保証も行いません。
 *  ・本ソフトウェアの使用または使用不能により生じた、直接的・間接的損害
 *    （データの損失、業務の中断、計算結果の誤りに起因する損害等を含みます
 *    がこれらに限りません）について、開発者および開発元は一切の責任を負い
 *    ません。使用は利用者ご自身の責任において行ってください。
 *  ・本ソフトウェアの著作権は開発元に帰属します。開発元の事前の許可なく、
 *    本ソフトウェア（本ファイルおよび関連する一式のファイルを含みます）を
 *    複製、転載、再配布すること、ならびに改変・翻案の上で二次的著作物を
 *    作成し利用・頒布することを固く禁じます。
 * ================================================================
 *
 * placement.js — AreCal 配置モード拡張 v0.9.39
 *
 * [最新の変更]
 * v0.0068:
 *   - 【究極軽量化・iPadフリーズ対策】
 *     AreCal本体(v0.0472)の「パン操作中の再描画スキップ」に完全対応。
 *     Arecalay側もパン中（`panning === true`）は重い `renderPmLayer` をスキップし、
 *     CSSの `transform` だけで滑らかに追従するように最適化。パンが終了した瞬間に
 *     一度だけ再描画することで、重機を大量配置しても画面移動がヌルヌルになる。
 *     また、AreCal側のiOS限定`_CPAD`ゼロ化にも動的に追従し、座標ズレを起こさない。
 * v0.0067:
 *   - 【外部監査による致命的ボトルネックの完全排除（超軽量化）】
 *     ① 重機(SVG)描画のパース結果キャッシュ化 (`_parsed`に保持し正規表現を回避)
 *     ② 無条件の永久再描画ループの停止 (`_pmDirty`フラグによる制御)
 * v0.0066:
 *   - syncPmCvのDOM参照(pdf-cv/draw-cv)をキャッシュ化し、フレーム毎の取得コストを削減。
 * v0.0065:
 *   - AreCal本体v0.0458と対になる改修。四隅+中心スナップの目印の色統一・バグ修正、
 *     中クリック(ホイール押し)+ドラッグパンの追加。
 * v0.0064:
 *   - 「PDFをグレースケール表示」トグルを追加。PDF出力時にも適用。
 * v0.0063:
 *   - ドラッグ&ドロップ時の挿入線表示と簡易FLIPアニメーションの追加。
 * v0.0062:
 *   - MojiWaku(文字枠)ボタンの白黒割り当てを「縁＝黒地白文字」「逆＝白地黒文字」に変更。
 */
(function () {
  'use strict';

  const ARECALAY_VER = '0.0068'; 
  window._pmVersion = ARECALAY_VER;
  const COLORS      = ['#ff4081','#e8a020','#188C1C','#1B3EAB','#aaaaaa','#ff8c00','#111111'];
  const PM_UNDO_MAX = 30;
  
  const ARROW_LW    = [7, 14, 21, 33, 57, 90];  
  const LINE_LW     = [4, 7, 10, 14, 21, 33, 57, 90];   
  const TEXT_FS     = [20, 40, 56, 80, 112, 160]; 

  let placementMode = false;
  let pmIoMenuOpen = false, pmIoWriteOpen = false; 
  let _pmExporting  = false; 
  let pmLineWeightLevel = 2;
  const PM_LINE_WEIGHT_RATIO = {1: 0.5, 2: 0.75, 3: 1.0};

  let PM_SELECT_BLINK_MS  = 500;  
  let PM_SELECT_BLINK_LOW = 0.35; 
  function _selectBlinkAlpha() {
    const phase = Math.floor(Date.now() / Math.max(50, PM_SELECT_BLINK_MS)) % 2;
    return phase === 0 ? 1.0 : PM_SELECT_BLINK_LOW;
  }
  let annotMode     = null;
  let arrowStart    = null;
  let lineStart     = null;
  let _lastArrowDirToastAt = 0;
  let _lastLineStyleToastAt = 0; 
  const ARROW_DIR_TOAST_COOLDOWN_MS = 5 * 60 * 1000; 
  let previewPos    = null;
  let steps         = [[],[],[],[],[]];
  let currentStep   = 0;
  let annCounter    = 0;
  let pmUndoStack   = [];
  let pmRedoStack   = [];
  let spaceHeld     = false;
  let pixelScale    = 1;
  let pdfCvLeft     = 0;
  let pdfCvTop      = 0;
  let pmCpad        = 0; 
  let _pmLastMouseCX = null, _pmLastMouseCY = null; 
  let selectedUuids = new Set();
  let defArrowStep  = 1;
  let defLineStep   = 1;
  let defTextStep   = 1;
  let defTextColor  = COLORS[5]; 
  let machineryData = {};
  let selectedAssetId = null;
  let _mpLastCat    = 'all'; 
  let _mpLastDiv    = 'all'; 
  let _mpThumbLevel = 1;     

  let hoverUuid     = null;
  let dragState     = null;

  let lastClickMs   = 0;
  let lastClickUuid = null;

  let pmCv = null, pmCtx = null;
  let _pmPdfElCache = null, _pmDrawCvCache = null;
  let pmRightPanel = null, pmLeftPanel = null;

  let _pmDirty = true;
  function markPmDirty() { _pmDirty = true; }

  function hookSetStatus() {
    if (typeof window.setStatus === 'function' && !window._origSetStatus) {
      window._origSetStatus = window.setStatus;
      window.setStatus = function(msg) {
        if (!msg || msg === '') {
          if (placementMode) {
            window._origSetStatus('🏗 Arecalay モード（配置レイアウト）');
          } else {
            window._origSetStatus('📐 AreCal モード（面積計算） ｜ ツールを選択してください');
          }
        } else {
          window._origSetStatus(msg);
        }
      };
      window.setStatus('');
    }
  }

  function applyTheme(isArecalay) {
    const themeStyleId = 'arecalay-theme-style';
    let styleEl = document.getElementById(themeStyleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = themeStyleId;
      document.head.appendChild(styleEl);
    }
    
    if (isArecalay) {
      styleEl.innerHTML = `
        :root {
          --blue: #4caf50 !important;
        }
        #status-bar {
          background: #1b3320 !important;
          border-bottom: 2px solid #4caf50 !important;
          color: #dcedc8 !important;
        }
        #tot-wrap {
          background: rgba(76, 175, 80, 0.1) !important;
        }
        #union-btn {
          background: rgba(76, 175, 80, 0.18) !important;
          color: #a5d6a7 !important;
        }
        #union-btn:hover {
          background: rgba(76, 175, 80, 0.4) !important;
          color: #fff !important;
        }
        .sc-badge {
          background: rgba(76, 175, 80, 0.2) !important;
          color: #a5d6a7 !important;
        }
        #sh-list li.selected {
          background: #1b3320 !important;
          border-left-color: #81c784 !important;
        }
        .sh-area {
          color: #a5d6a7 !important;
        }
      `;
    } else {
      styleEl.innerHTML = ``;
    }
  }

  function getPaperScale() {
    const pdfEl = document.getElementById('pdf-cv');
    if (!pdfEl || !pdfEl.width) return 1;
    return Math.max(Math.min(pdfEl.width, pdfEl.height) / 2000, 0.1);
  }

  function init() {
    hookSetStatus();
    buildPmCanvas();
    buildRightPanel();
    buildLeftPanel();
    registerEvents();
    startPmLoop();
    window._pmSaveData          = pmSaveJSON;
    window._pmLoadData          = pmLoadJSON;
    window._pmBuildSaveData     = buildPmSaveData;
    window._pmApplyData         = applyPmData;
    window._pmToggle            = togglePlacementMode;
    window._pmLoadMachineryFile = loadMachineryFile;
    window._pmMachineryCount    = () => Object.keys(machineryData).length;
    tryAutoLoadMachinery();
  }

  function _pmAnnounceMachineryStatus() {
    const count = Object.keys(machineryData).length;
    window.dispatchEvent(new CustomEvent('arecalay:machinery-status', {detail:{count}}));
    return count;
  }

  async function _decodeMachineryBytes(buf) {
    const bytes = new Uint8Array(buf);
    const isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    if (isGzip) {
      if (typeof DecompressionStream !== 'function') {
        throw new Error('このブラウザはGZIP展開(DecompressionStream)に対応していません');
      }
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      const blob = await new Response(stream).blob();
      return await blob.text();
    }
    return new TextDecoder('utf-8').decode(bytes);
  }

  function _extractMachineryObjectText(text) {
    const kw = 'MACHINERY_DATA';
    const kwPos = text.indexOf(kw);
    if (kwPos < 0) return null;
    const open = text.indexOf('{', kwPos);
    if (open < 0) return null;
    const close = text.lastIndexOf('}');
    if (close < open) return null;
    return text.substring(open, close + 1);
  }

  // SVGパースのキャッシュ化ヘルパー群
  function _ensureParsedSvg(asset) {
    if (asset._parsed) return;
    asset._parsed = {
      lower: _parseSvg(asset.lower_svg || asset.svg || asset.left_svg || ''),
      color: _parseSvg(asset.color_svg || ''),
      upper: _parseSvg(asset.upper_svg || '')
    };
  }

  function _parseSvg(svgStr) {
    if (!svgStr) return null;
    const fills = [];
    const strokes = [];
    
    const polyRe = /<polygon\s+([^>]+)\/?>/g;
    let m;
    while ((m = polyRe.exec(svgStr)) !== null) {
      const attrs = m[1];
      const ptsMatch = attrs.match(/points=['"]([^'"]+)['"]/);
      if (!ptsMatch) continue;
      const pts = ptsMatch[1].trim().split(/\s+/).filter(Boolean).map(p => {
        const xy = p.split(',');
        return { x: parseFloat(xy[0]), y: parseFloat(xy[1]) };
      }).filter(pt => !isNaN(pt.x) && !isNaN(pt.y));
      if (!pts.length) continue;
      const fillMatch = attrs.match(/fill=['"]([^'"]+)['"]/);
      const fill = fillMatch ? fillMatch[1] : null;
      fills.push({ pts, fill });
      strokes.push({ type: 'polygon', pts });
    }

    const lineRe = /<line\s+[^>]*?x1=['"]([^'"]+)['"]\s+y1=['"]([^'"]+)['"]\s+x2=['"]([^'"]+)['"]\s+y2=['"]([^'"]+)['"][^>]*?\/?>/g;
    while ((m = lineRe.exec(svgStr)) !== null) {
      strokes.push({
        type: 'line',
        x1: parseFloat(m[1]), y1: parseFloat(m[2]),
        x2: parseFloat(m[3]), y2: parseFloat(m[4])
      });
    }

    const circRe = /<circle\s+[^>]*?cx=['"]([^'"]+)['"]\s+cy=['"]([^'"]+)['"]\s+r=['"]([^'"]+)['"][^>]*?\/?>/g;
    while ((m = circRe.exec(svgStr)) !== null) {
      strokes.push({
        type: 'circle',
        cx: parseFloat(m[1]), cy: parseFloat(m[2]), r: parseFloat(m[3])
      });
    }
    
    return { fills, strokes };
  }

  function _drawParsedFills(ctx, parsed, defaultFill, scale) {
    if (!parsed) return;
    for (const f of parsed.fills) {
      const pts = f.pts;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = f.fill || defaultFill || '#cccccc';
      ctx.fill();
      ctx.restore();
    }
  }

  function _drawParsedStrokes(ctx, parsed, scale) {
    if (!parsed) return;
    const lwRatio = _pmExporting ? (PM_LINE_WEIGHT_RATIO[pmLineWeightLevel] || 1) : 1;
    
    for (const s of parsed.strokes) {
      if (s.type === 'polygon') {
        const pts = s.pts;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = (0.5 / scale) * lwRatio;
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = (0.8 / scale) * lwRatio;
    ctx.beginPath();
    for (const s of parsed.strokes) {
      if (s.type === 'line') {
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
      }
    }
    ctx.stroke();

    for (const s of parsed.strokes) {
      if (s.type === 'circle') {
        ctx.beginPath();
        ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function _parsedPointBounds(parsedList) {
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    const consider = (x,y) => {
      if (isNaN(x) || isNaN(y)) return;
      if (x<minX) minX=x; if (x>maxX) maxX=x;
      if (y<minY) minY=y; if (y>maxY) maxY=y;
    };
    parsedList.forEach(parsed => {
      if (!parsed) return;
      for (const s of parsed.strokes) {
        if (s.type === 'polygon') {
          s.pts.forEach(p => consider(p.x, p.y));
        } else if (s.type === 'line') {
          consider(s.x1, s.y1); consider(s.x2, s.y2);
        } else if (s.type === 'circle') {
          consider(s.cx - s.r, s.cy - s.r); consider(s.cx + s.r, s.cy + s.r);
        }
      }
    });
    return isFinite(minX) ? {minX,minY,maxX,maxY} : null;
  }

  async function tryAutoLoadMachinery() {
    try {
      const resp = await fetch('./CalayMachineryData.dat', {cache:'no-cache'});
      if (resp.ok) {
        const buf  = await resp.arrayBuffer();
        const text = await _decodeMachineryBytes(buf);
        const objText = _extractMachineryObjectText(text);
        if (objText) machineryData = _migrateMachineryCategories(JSON.parse(objText));
      }
    } catch(_) {}
    _pmAnnounceMachineryStatus();
  }

  function buildPmCanvas() {
    pmCv = document.createElement('canvas');
    pmCv.id = 'pm-cv';
    Object.assign(pmCv.style, {
      position:'absolute', display:'none', left:'0', top:'0',
      zIndex:'11', pointerEvents:'none', transformOrigin:'0 0',
      willChange:'transform' 
    });
    const cvw = document.getElementById('cv-wrap');
    if (cvw) cvw.appendChild(pmCv);
    else document.body.appendChild(pmCv);
    pmCtx = pmCv.getContext('2d');
  }

  function syncPmCv() {
    const pdfEl = _pmPdfElCache || (_pmPdfElCache = document.getElementById('pdf-cv'));
    if (!pdfEl || !pmCv) return;
    const dCv = _pmDrawCvCache || (_pmDrawCvCache = document.getElementById('draw-cv'));
    const refEl = dCv || pdfEl;
    if (pmCv.width  !== refEl.width)  pmCv.width  = refEl.width;
    if (pmCv.height !== refEl.height) pmCv.height = refEl.height;
    if (pmCv.style.width  !== refEl.style.width)  pmCv.style.width  = refEl.style.width;
    if (pmCv.style.height !== refEl.style.height) pmCv.style.height = refEl.style.height;
    if (pmCv.style.left   !== refEl.style.left)   pmCv.style.left   = refEl.style.left;
    if (pmCv.style.top    !== refEl.style.top)    pmCv.style.top    = refEl.style.top;
    pmCv.style.transform = refEl.style.transform;
    pmCpad = dCv ? (typeof _CPAD !== 'undefined' ? _CPAD : 0) : 0;

    const pr = pdfEl.getBoundingClientRect();
    pdfCvLeft  = pr.left;
    pdfCvTop   = pr.top;
    pixelScale = pr.width > 0 ? pdfEl.width / pr.width : 1;
  }

  let _pmLastZoom = 0, _pmLastOx = 0, _pmLastOy = 0;
  let _pmLastRefCssText = '';
  let _pmWasPanning = false;

  function startPmLoop() {
    (function loop() {
      requestAnimationFrame(loop);
      if (!placementMode) return;
      
      const st = getState();
      // v0.0068: AreCal本体側の panning 変数を見て、パン操作中かどうかを判定
      const isPanningNow = (typeof panning !== 'undefined' && panning);

      if (st.zoom !== _pmLastZoom || st.ox !== _pmLastOx || st.oy !== _pmLastOy) {
        _pmLastZoom = st.zoom; _pmLastOx = st.ox; _pmLastOy = st.oy;
        _pmDirty = true;
      }
      
      // パン(画面移動)が終了した瞬間に確実に再描画する
      if (_pmWasPanning && !isPanningNow) {
        _pmDirty = true;
      }
      _pmWasPanning = isPanningNow;

      const refEl = _pmDrawCvCache || _pmPdfElCache;
      if (refEl) {
        const css = refEl.style.cssText;
        if (css !== _pmLastRefCssText) {
          _pmLastRefCssText = css;
          _pmDirty = true;
        }
      }

      if (selectedUuids.size > 0 || annotMode === 'arrow' || annotMode === 'line' || (annotMode === 'machinery' && selectedAssetId)) {
        _pmDirty = true; 
      }

      if (hoverUuid) { 
        _pmDirty = true;
      }

      // パン操作中はCSSのtransformで画面が動くため、重いCanvas再描画はスキップする
      if (_pmDirty && !isPanningNow) {
        syncPmCv();
        renderPmLayer();
        _pmDirty = false;
      } else if (isPanningNow) {
        // パン中もサイズやtransformの追従は必要なのでsyncPmCvだけは呼ぶ
        syncPmCv();
      }
    })();
  }

  function buildRightPanel() {
    const sb = document.getElementById('sb');
    if (!sb) return;
    pmRightPanel = document.createElement('div');
    pmRightPanel.id = 'pm-right-panel';
    pmRightPanel.style.cssText = 'display:none;padding:0;padding-bottom:120px;';
    pmRightPanel.innerHTML = `
      <div class="card" style="border-left:3px solid #4caf50;">
        <h4 style="margin:0 0 8px;font-size:.82em;color:#4caf50;
                   display:flex;justify-content:space-between;align-items:center;">
          <span>🏗 配置モード</span>
          <span style="font-size:.72em;color:#CACACA;font-family:monospace;">
            Arecalay v${ARECALAY_VER}</span>
        </h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">
          <button id="pm-arrow-btn">↗ 矢印</button>
          <button id="pm-text-btn">💬 テキスト</button>
          <button id="pm-line-btn">📏 線</button>
          <button id="pm-circle-btn"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:transparent;border:2px solid #cacaca;margin-right:3px;vertical-align:-1px;"></span>円</button>
          <button id="pm-dist-btn">📐 距離測定</button>
          <button id="pm-machinery-btn">🏗 図形</button>
          <button id="pm-io-btn" style="grid-column:1/-1;">📁 入出力</button>
        </div>
        <div id="pm-io-menu" style="display:none;margin-top:6px;border:1px solid #446;border-radius:6px;overflow:hidden;">
          <div style="display:flex;gap:0;">
            <button class="io-top-btn" id="pm-io-read-btn" style="flex:1;border-radius:0;border:none;border-right:1px solid #446;">📥 読込</button>
            <button class="io-top-btn" id="pm-io-write-btn" style="flex:1;border-radius:0;border:none;">📤 書出</button>
          </div>
          <div id="pm-io-write-sub" style="display:none;padding:4px;">
            <button class="io-sub-btn" id="pm-save-btn"
              style="background:rgba(30,80,180,.22);border-color:#3060b060;color:#80b0f0;">
              💾 保存（Arela）</button>
            <button class="io-sub-btn" id="pm-pdf-btn"
              style="background:rgba(60,140,60,.18);border-color:#3a7a3a;color:#80e080;">
              🖨 PDF出力</button>
          </div>
        </div>

        <div id="pm-arrow-default-ctrl" style="display:none;margin-top:8px;
          border-top:1px solid #2a2a2a;padding-top:6px;">
          <div style="font-size:.74em;color:#CACACA;margin-bottom:4px;">デフォルト太さ</div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button id="pm-arrow-step-dn" style="width:22px;height:22px;font-size:.9em;display:inline-flex;align-items:center;justify-content:center;padding:0;">◀</button>
            <span id="pm-arrow-step-lbl" style="flex:1;text-align:center;font-size:.8em;color:#4caf50;line-height:22px;">1</span>
            <button id="pm-arrow-step-up" style="width:22px;height:22px;font-size:.9em;display:inline-flex;align-items:center;justify-content:center;padding:0;">▶</button>
          </div>
        </div>

        <div id="pm-line-default-ctrl" style="display:none;margin-top:8px;
          border-top:1px solid #2a2a2a;padding-top:6px;">
          <div style="font-size:.74em;color:#CACACA;margin-bottom:4px;">デフォルト太さ</div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button id="pm-line-step-dn" style="width:22px;height:22px;font-size:.9em;display:inline-flex;align-items:center;justify-content:center;padding:0;">◀</button>
            <span id="pm-line-step-lbl" style="flex:1;text-align:center;font-size:.8em;color:#4caf50;line-height:22px;">1</span>
            <button id="pm-line-step-up" style="width:22px;height:22px;font-size:.9em;display:inline-flex;align-items:center;justify-content:center;padding:0;">▶</button>
          </div>
        </div>

        <div id="pm-text-default-ctrl" style="display:none;margin-top:8px;
          border-top:1px solid #2a2a2a;padding-top:6px;">
          <div style="font-size:.74em;color:#CACACA;margin-bottom:4px;">デフォルト文字サイズ</div>
          <div style="display:flex;align-items:center;gap:6px;">
            <button id="pm-text-step-dn" style="width:22px;height:22px;font-size:.9em;display:inline-flex;align-items:center;justify-content:center;padding:0;">◀</button>
            <span id="pm-text-step-lbl" style="flex:1;text-align:center;font-size:.8em;color:#4caf50;line-height:22px;">1</span>
            <button id="pm-text-step-up" style="width:22px;height:22px;font-size:.9em;display:inline-flex;align-items:center;justify-content:center;padding:0;">▶</button>
          </div>
        </div>

        <div style="margin-top:8px;border-top:1px solid #2a2a2a;padding-top:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:.74em;color:#CACACA;">AreCal 図形の濃度</span>
            <span id="pm-opacity-val" style="font-size:.74em;color:#4caf50;">50%</span>
          </div>
          <input type="range" id="pm-opacity-slider"
            min="0" max="100" value="50" step="5"
            style="width:100%;accent-color:#4caf50;height:4px;cursor:pointer;">
        </div>
      </div>

      <div id="pm-copy-area" style="display:none;margin-top:6px;padding:6px;
        border:1px solid #2a4a2a;border-radius:4px;background:rgba(76,175,80,.08);">
        <div style="font-size:.72em;color:#7ec87e;margin-bottom:5px;">
          <span id="pm-sel-count">0</span>件選択中</div>
        <button id="pm-copy-btn" style="width:100%;padding:6px;font-size:.76em;
          background:rgba(76,175,80,.2);border:1px solid #4caf50;
          color:#4caf50;border-radius:4px;cursor:pointer;">📋 他のSTEPにコピー</button>
      </div>

      <div id="pm-layout-info" class="card" style="font-size:.7em;line-height:1.9;color:#CACACA;">
        <b style="color:#CACACA;">操作ガイド（レイアウトモード）</b><br>
        クリック：図形を選択<br>
        ドラッグ：グリップを掴んで移動・変形<br>
        矢印キー：選択中を微調整移動（Shiftで大きく）<br>
        Del/Backspace：選択中の図形を削除<br>
        <span style="color:#CACACA;font-size:1.15em;line-height:1.5;">AreCal で描いた図形は<br>このモードでは操作不可</span>
      </div>

      <button id="pm-clear-btn" style="width:100%;margin-top:4px;padding:7px;
        background:rgba(200,50,50,.15);border:1px solid #c03030;
        color:#ff6060;border-radius:4px;font-size:.8em;cursor:pointer;">🗑 全消去</button>

      <div class="card" style="padding:8px;margin-top:6px;">
        <button id="pm-feedback-btn"
          title="Arecalay に関する評価・要望・バグ報告をお願いします。回答数によって今後の開発継続が決まります"
          onclick="window.open('https://docs.google.com/forms/d/e/1FAIpQLSe82_50OHAm-0qFG0e2rEeaOMYjyev3mmmlN0O7m-1sMQAJRA/viewform?usp=dialog','_blank')"
          style="width:100%;background:rgba(255,180,0,.15);border-color:#c8a000;color:#ffd060;font-size:.78em;padding:6px;">
          📝 評価・要望・バグ報告
        </button>
      </div>
    `;
    const _togWrap = document.getElementById('mode-toggle-wrap');
    if (_togWrap) {
      sb.insertBefore(pmRightPanel, _togWrap);
      _togWrap.style.background = '#242424'; 
      _togWrap.style.boxShadow = '0 -4px 10px rgba(0,0,0,0.4)';
    } else {
      sb.appendChild(pmRightPanel);
    }

    pmRightPanel.querySelector('#pm-arrow-btn').onclick     = () => setAnnotMode('arrow');
    pmRightPanel.querySelector('#pm-text-btn').onclick      = () => setAnnotMode('text');
    pmRightPanel.querySelector('#pm-line-btn').onclick      = () => setAnnotMode('line');
    pmRightPanel.querySelector('#pm-circle-btn').onclick    = () => setAnnotMode('circle');
    pmRightPanel.querySelector('#pm-machinery-btn').onclick      = openMachineryPicker;
    pmRightPanel.querySelector('#pm-dist-btn').onclick      = () => {
      cancelAnnotMode();
      closeMachineryPicker();
      if (typeof window.setDistMode === 'function') {
        const on = typeof window._isDistModeOn === 'function' ? window._isDistModeOn() : false;
        window.setDistMode(!on);
        pmCv.style.cursor = !on ? 'crosshair' : 'default';
      }
    };

    pmRightPanel.querySelector('#pm-io-btn').onclick = () => {
      pmIoMenuOpen = !pmIoMenuOpen;
      pmRightPanel.querySelector('#pm-io-menu').style.display = pmIoMenuOpen ? 'block' : 'none';
      if (pmIoMenuOpen) {
        cancelAnnotMode();
        closeMachineryPicker();
        _lockPmToolButtons(true);
      } else {
        closePmIoMenu();
      }
    };
    pmRightPanel.querySelector('#pm-io-read-btn').onclick = () => {
      closePmIoMenu();
      pmLoadJSON();
    };
    pmRightPanel.querySelector('#pm-io-write-btn').onclick = () => {
      pmIoWriteOpen = !pmIoWriteOpen;
      pmRightPanel.querySelector('#pm-io-write-sub').style.display = pmIoWriteOpen ? 'block' : 'none';
      pmRightPanel.querySelector('#pm-io-write-btn').classList.toggle('active', pmIoWriteOpen);
    };
    pmRightPanel.querySelector('#pm-pdf-btn').onclick       = () => {
      cancelAnnotMode();
      closeMachineryPicker();
      doPdfExport();
      closePmIoMenu();
    };
    pmRightPanel.querySelector('#pm-save-btn').onclick      = () => {
      closePmIoMenu();
      if (typeof window.saveArela === 'function') {
        window.saveArela();
      } else {
        pmSaveJSON(); 
      }
    };
    pmRightPanel.querySelector('#pm-clear-btn').onclick     = pmClearAll;
    pmRightPanel.querySelector('#pm-copy-btn').onclick      = showCopyDialog;

    pmRightPanel.querySelector('#pm-arrow-step-dn').onclick = () => {
      defArrowStep = Math.max(0,defArrowStep-1); 
      pmRightPanel.querySelector('#pm-arrow-step-lbl').textContent = defArrowStep;
    };
    pmRightPanel.querySelector('#pm-arrow-step-up').onclick = () => {
      defArrowStep = Math.min(5,defArrowStep+1);
      pmRightPanel.querySelector('#pm-arrow-step-lbl').textContent = defArrowStep;
    };
    pmRightPanel.querySelector('#pm-line-step-dn').onclick = () => {
      defLineStep = Math.max(0,defLineStep-1); 
      pmRightPanel.querySelector('#pm-line-step-lbl').textContent = defLineStep;
    };
    pmRightPanel.querySelector('#pm-line-step-up').onclick = () => {
      defLineStep = Math.min(7,defLineStep+1);
      pmRightPanel.querySelector('#pm-line-step-lbl').textContent = defLineStep;
    };
    pmRightPanel.querySelector('#pm-text-step-dn').onclick = () => {
      defTextStep = Math.max(0,defTextStep-1); 
      pmRightPanel.querySelector('#pm-text-step-lbl').textContent = defTextStep;
    };
    pmRightPanel.querySelector('#pm-text-step-up').onclick = () => {
      defTextStep = Math.min(5,defTextStep+1);
      pmRightPanel.querySelector('#pm-text-step-lbl').textContent = defTextStep;
    };

    const opSlider = pmRightPanel.querySelector('#pm-opacity-slider');
    if (opSlider) {
      opSlider.oninput = () => {
        const val = opSlider.value / 100;
        pmRightPanel.querySelector('#pm-opacity-val').textContent = opSlider.value + '%';
        const d = document.getElementById('draw-cv');
        if (d) d.style.opacity = val;
      };
    }
  }

  function buildLeftPanel() {
    const listArea = document.getElementById('list-area');
    if (!listArea) return;
    pmLeftPanel = document.createElement('div');
    pmLeftPanel.id = 'pm-left-panel';
    pmLeftPanel.style.cssText = 'display:none;flex-direction:column;flex:1;min-height:0;overflow:hidden;';
    pmLeftPanel.innerHTML = `
      <div id="pm-step-tabs" style="display:flex;gap:2px;padding:6px 6px 0;flex-shrink:0;">
        ${[1,2,3,4,5].map(n=>`
          <button data-step="${n-1}" style="flex:1;padding:4px 2px;font-size:.72em;
            border-radius:4px 4px 0 0;border:1px solid #333;border-bottom:none;
            background:rgba(255,255,255,.05);color:#CACACA;cursor:pointer;
            transition:background .15s;">
            S${n}<br><span class="pm-tab-cnt" data-step="${n-1}" style="font-size:.8em;color:#CACACA;">0</span>
          </button>`).join('')}
      </div>
      <div style="padding:4px 8px 5px;font-size:.73em;color:#CACACA;border-bottom:1px solid #2a2a2a;
                  flex-shrink:0;">クリックで選択<br>Shift+クリックで複数選択<br>上：前面 / 下：背面</div>
      <ul id="pm-placed-list" style="list-style:none;padding:6px;margin:0;
        flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:4px;font-size:.76em;"></ul>
      <div style="display:flex;gap:4px;padding:5px 6px;flex-shrink:0;border-top:1px solid #2a2a2a;">
        <button id="pm-undo-btn" disabled style="flex:1;padding:5px;font-size:.74em;border-radius:4px;
          background:rgba(255,180,0,.12);border-color:#c8960060;color:#c8a000;">↩ 元に戻す</button>
        <button id="pm-redo-btn" disabled style="flex:1;padding:5px;font-size:.74em;border-radius:4px;
          background:rgba(100,200,100,.1);border-color:#40804060;color:#70c070;">↪ やり直す</button>
      </div>
      <div style="padding:0 6px 6px;flex-shrink:0;">
        <button id="pm-gray-toggle" style="width:100%;padding:5px;font-size:.74em;border-radius:4px;
          background:rgba(150,150,150,.18);border:1px solid #888;color:#ccc;cursor:pointer;
          transition:background .2s;">🌫 PDFをグレースケール表示</button>
      </div>
      <div style="padding:0 6px 6px;flex-shrink:0;">
        <button id="pm-vistype-btn" style="width:100%;padding:6px;font-size:.78em;border-radius:4px;
          background:rgba(255,255,255,.05);border:1px solid #444;color:#ccc;cursor:pointer;">🏷 種別表示</button>
      </div>
    `;
    listArea.parentElement.appendChild(pmLeftPanel);
    pmLeftPanel.querySelectorAll('#pm-step-tabs button').forEach(btn => {
      btn.onclick = () => switchStep(Number(btn.dataset.step));
    });
    pmLeftPanel.querySelector('#pm-undo-btn').onclick = pmUndo; 
    pmLeftPanel.querySelector('#pm-redo-btn').onclick = pmRedo;
    pmLeftPanel.querySelector('#pm-vistype-btn').onclick = openVisTypePanel; 
    const grayBtn = pmLeftPanel.querySelector('#pm-gray-toggle');
    _syncGrayBtn(grayBtn);
    grayBtn.onclick = () => {
      pdfGrayscale = !pdfGrayscale;
      const pdfCvEl = document.getElementById('pdf-cv');
      if (pdfCvEl) pdfCvEl.style.filter = pdfGrayscale ? 'grayscale(1)' : 'none';
      _syncGrayBtn(grayBtn);
      const arecalBtn = document.getElementById('gray-toggle');
      if (arecalBtn) arecalBtn.classList.toggle('on', pdfGrayscale);
      markPmDirty();
    };
    updatePlacedList();
    updateTabUI();
  }

  function _syncGrayBtn(btn) {
    if (!btn) return;
    const on = !!pdfGrayscale;
    btn.classList.toggle('on', on);
    btn.style.background  = on ? 'rgba(76,175,80,.35)' : 'rgba(150,150,150,.18)';
    btn.style.borderColor = on ? '#4caf50' : '#888';
    btn.style.color       = on ? '#fff' : '#ccc';
  }

  function registerEvents() {
    document.addEventListener('keydown', e => { if(e.code==='Space') spaceHeld=true;  }, {capture:true});
    document.addEventListener('keyup',   e => { if(e.code==='Space') spaceHeld=false; }, {capture:true});

    document.addEventListener('keydown', function(e) {
      if (!placementMode) return;
      if (e.key==='Delete'||e.key==='Backspace') {
        if (e.target && e.target.tagName === 'INPUT') return;
        e.stopPropagation();
        if (!annotMode && selectedUuids.size > 0) {
          pushPmUndo();
          steps[currentStep] = steps[currentStep].filter(a => !selectedUuids.has(a.uuid));
          selectedUuids.clear();
          updatePlacedList();
          markPmDirty();
        }
        return;
      }
      if (e.key==='ArrowUp'||e.key==='ArrowDown'||e.key==='ArrowLeft'||e.key==='ArrowRight') {
        if (e.target && (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA' || e.target.isContentEditable)) return;
        if (!annotMode && selectedUuids.size > 0) {
          e.stopPropagation(); e.preventDefault();
          const { zoom: gz } = getState();
          const step = (e.shiftKey ? 10 : 1) / Math.max(gz, 0.01);
          let dx = 0, dy = 0;
          if (e.key==='ArrowUp')    dy = -step;
          if (e.key==='ArrowDown')  dy =  step;
          if (e.key==='ArrowLeft') dx = -step;
          if (e.key==='ArrowRight')dx =  step;
          pushPmUndo();
          steps[currentStep].forEach(a => {
            if (!selectedUuids.has(a.uuid)) return;
            if (a.type==='arrow' || a.type==='line') {
              a.x1 += dx; a.y1 += dy; a.x2 += dx; a.y2 += dy;
            } else if (a.type==='circle') {
              a.cx += dx; a.cy += dy;
            } else {
              a.lx += dx; a.ly += dy;
            }
          });
          markPmDirty();
        }
        return;
      }
      if (e.ctrlKey && e.code==='KeyZ' && !e.shiftKey) { e.stopPropagation(); e.preventDefault(); pmUndo(); return; }
      if ((e.ctrlKey&&e.code==='KeyY')||(e.ctrlKey&&e.shiftKey&&e.code==='KeyZ')) {
        e.stopPropagation(); e.preventDefault(); pmRedo(); return;
      }
      if (e.key==='Escape') {
        if (pmIoMenuOpen) {
          e.stopPropagation();
          closePmIoMenu();
          _toast('↩ 入出力をキャンセル', 800);
          return;
        }
        if (typeof window._isDistModeOn === 'function' && window._isDistModeOn()) {
          e.stopPropagation();
          window.setDistMode(false);
          _toast('↩ 距離計測をキャンセル', 800);
          return;
        }
        e.stopPropagation();
        document.getElementById('pm-text-float')?.remove();
        if (annotMode) cancelAnnotMode();
        else { selectedUuids.clear(); updatePlacedList(); markPmDirty(); }
      }
    }, {capture:true});

    document.addEventListener('pointerdown', function(e) { 
      if (!placementMode) return;
      const drawCv = document.getElementById('draw-cv');
      if (e.target !== drawCv && e.target !== pmCv) return;
      if (e.button===1) return;
      if (e.button===0 && spaceHeld) return;

      if (e.button===2) {
        if (typeof window._isDistModeOn === 'function' && window._isDistModeOn()) return;
        e.stopPropagation(); e.preventDefault();
        if (annotMode) { cancelAnnotMode(); return; }
        selectedUuids.clear(); updatePlacedList(); markPmDirty();
        return;
      }

      if (e.button===0) {
        if (annotMode) {
          e.stopPropagation();
          handleCanvasClick(e);
        } else if (typeof window._isDistModeOn === 'function' && window._isDistModeOn()) {
          return;
        } else {
          const hit = hitTestCSS(e.clientX-pdfCvLeft, e.clientY-pdfCvTop);
          if (hit) e.stopPropagation();
          handleEditClick(e, hit);
        }
      }
    }, {capture:true});

    document.addEventListener('pointermove', function(e) { 
      if (!placementMode) return;
      _pmLastMouseCX = e.clientX; _pmLastMouseCY = e.clientY; 
      if (dragState) {
        e.stopPropagation();
        handleDragMove(e);
        return;
      }
      if (annotMode==='arrow' && arrowStart) {
        const _pos = getLogical(e);
        if (e.shiftKey && _pos) {
          const _dx = _pos.lx - arrowStart.lx, _dy = _pos.ly - arrowStart.ly;
          if (Math.abs(_dx) >= Math.abs(_dy)) _pos.ly = arrowStart.ly;
          else                              _pos.lx = arrowStart.lx;
        }
        previewPos = _pos;
        markPmDirty();
        return;
      }
      if (annotMode==='line' && lineStart) {
        const _pos = getLogical(e);
        if (e.shiftKey && _pos) {
          const _dx = _pos.lx - lineStart.lx, _dy = _pos.ly - lineStart.ly;
          if (Math.abs(_dx) >= Math.abs(_dy)) _pos.ly = lineStart.ly;
          else                              _pos.lx = lineStart.lx;
        }
        previewPos = _pos;
        markPmDirty();
        return;
      }
      if (annotMode==='machinery' && selectedAssetId) {
        previewPos = getLogical(e);
        markPmDirty();
        return;
      }
      if (!annotMode) {
        if (typeof window._isDistModeOn === 'function' && window._isDistModeOn()) {
          pmCv.style.cursor = 'crosshair';
        } else {
          updateHoverCursor(e);
        }
      }
    }, {capture:true});

    document.addEventListener('pointerup', function(e) { 
      if (!placementMode || !dragState) return;
      e.stopPropagation();
      endDrag();
    }, {capture:true});

    document.addEventListener('contextmenu', function(e) {
      if (!placementMode) return;
      if (pmIoMenuOpen) {
        e.preventDefault();
        closePmIoMenu();
        _toast('↩ 入出力をキャンセル', 800);
        return;
      }
      if (e.target===pmCv || e.target===document.getElementById('draw-cv')) {
        e.preventDefault();
      }
    }, {capture:true});
  }

  function togglePlacementMode() {
    if (!placementMode) {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {key:'Escape',code:'Escape',bubbles:true,cancelable:true})
      );
      placementMode = true;
      enterPlacementMode();
    } else {
      placementMode = false;
      exitPlacementMode();
    }
  }

  function enterPlacementMode() {
    syncPmCv();
    pmCv.style.display = 'block';
    const _slider = document.getElementById('pm-opacity-slider');
    const _opVal = _slider ? _slider.value / 100 : 0.5;
    document.getElementById('draw-cv').style.opacity = _opVal;

    const sb = document.getElementById('sb');
    sb.querySelectorAll(':scope > *:not(#pm-right-panel):not(#mode-toggle-wrap)').forEach(el => {
      el.dataset.pmHidden='1'; el.style.display='none';
    });
    pmRightPanel.style.display = 'block';

    const listArea = document.getElementById('list-area');
    if (listArea) {
      listArea.parentElement.querySelectorAll(':scope > *:not(#pm-left-panel):not(#logo-area)').forEach(el => {
        el.dataset.pmHiddenLeft='1'; el.style.display='none';
      });
      if (pmLeftPanel) pmLeftPanel.style.display='flex';
    }
    updateTabUI();
    document.getElementById('cv-wrap').style.overflow = 'hidden';
    pmCv.style.pointerEvents = 'all';
    pmCv.style.cursor        = 'default';
    _toast('🏗 配置モード ON', 2000);

    applyTheme(true);
    _setStatus('');
    markPmDirty();
    if (typeof window._onPmModeChange === 'function') window._onPmModeChange(true);
  }

  function exitPlacementMode() {
    pmCv.style.display = 'none';
    pmCv.style.pointerEvents = 'none';
    const d = document.getElementById('draw-cv');
    d.style.opacity='1'; d.style.cursor='';
    document.getElementById('cv-wrap').style.overflow = '';
    document.querySelectorAll('[data-pm-hidden]').forEach(el => { el.style.display=''; delete el.dataset.pmHidden; });
    pmRightPanel.style.display = 'none';

    const mb = document.getElementById('pm-machinery-btn');
    closeMachineryPicker();
    if (mb) mb.classList.remove('on');
    if (pmLeftPanel) pmLeftPanel.style.display='none';
    document.querySelectorAll('[data-pm-hidden-left]').forEach(el => { el.style.display=''; delete el.dataset.pmHiddenLeft; });
    cancelAnnotMode();
    closePmIoMenu(); 
    if (typeof window._isDistModeOn === 'function' && window._isDistModeOn()
        && typeof window.setDistMode === 'function') {
      window.setDistMode(false);
    }
    previewPos=null; selectedUuids.clear(); dragState=null; hoverUuid=null;
    _toast('📐 面積計算モードに戻りました', 2000);

    applyTheme(false);
    _setStatus('');
    if (typeof window._onPmModeChange === 'function') window._onPmModeChange(false);
  }

  function setAnnotMode(mode) {
    annotMode = (annotMode===mode) ? null : mode;
    if (annotMode !== 'machinery') selectedAssetId = null;
    arrowStart=null; lineStart=null; previewPos=null;

    if (annotMode && typeof window._isDistModeOn === 'function' && window._isDistModeOn()
        && typeof window.setDistMode === 'function') {
      window.setDistMode(false);
    }

    if (annotMode === 'arrow' || annotMode === 'text' || annotMode === 'line' || annotMode === 'circle') {
      closeMachineryPicker();
      const mb = document.getElementById('pm-machinery-btn');
      if (mb) mb.classList.remove('on');
    }

    syncToolBtns();
    const ac = document.getElementById('pm-arrow-default-ctrl');
    const lc = document.getElementById('pm-line-default-ctrl');
    const tc = document.getElementById('pm-text-default-ctrl');
    if (ac) ac.style.display = annotMode==='arrow'     ? 'block' : 'none';
    if (lc) lc.style.display = annotMode==='line'      ? 'block' : 'none';
    if (tc) tc.style.display = annotMode==='text'      ? 'block' : 'none';
    
    _setStatus(annotMode ? (
      annotMode === 'arrow'  ? '↗ 矢印：始点クリック  |  Shift:水平/垂直固定  |  右クリック/ESC：キャンセル' :
      annotMode === 'line'   ? '📏 線：始点クリック  |  Shift:水平/垂直固定  |  右クリック/ESC：キャンセル' :
      annotMode === 'circle' ? '⭕ 円：中心をクリック  |  右クリック/ESC：キャンセル' :
      annotMode === 'text'   ? '💬 テキスト：配置位置をクリック  |  右クリック/ESC：キャンセル' :
      '🏗 クリックで配置  |  右クリック/ESC：キャンセル'
    ) : '');
    
    pmCv.style.cursor = annotMode ? 'crosshair' : 'default';
    const d = document.getElementById('draw-cv');
    if (d) d.style.cursor = '';
    markPmDirty();
  }

  function cancelAnnotMode() {
    document.getElementById('pm-text-float')?.remove();
    annotMode=null; arrowStart=null; lineStart=null; previewPos=null; selectedAssetId=null;
    syncToolBtns();
    const ac = document.getElementById('pm-arrow-default-ctrl');
    const lc = document.getElementById('pm-line-default-ctrl');
    const tc = document.getElementById('pm-text-default-ctrl');
    if (ac) ac.style.display='none';
    if (lc) lc.style.display='none';
    if (tc) tc.style.display='none';

    _setStatus(''); 
    pmCv.style.cursor = 'default';
    const d = document.getElementById('draw-cv');
    if (d) d.style.cursor = '';
    markPmDirty();
  }

  function syncToolBtns() {
    ['arrow','text','line','circle'].forEach(m => {
      const b = document.getElementById(`pm-${m}-btn`);
      if (b) b.classList.toggle('on', annotMode===m);
    });
  }

  function openMachineryPicker() {
    if (annotMode === 'arrow' || annotMode === 'text') setAnnotMode(null);
    document.getElementById('pm-machinery-btn').classList.add('on');

    document.getElementById('pm-machinery-picker')?.remove();
    const dlg = document.createElement('div');
    dlg.id = 'pm-machinery-picker';
    dlg.style.cssText = `position:fixed;inset:0;z-index:99850;display:flex;
      align-items:center;justify-content:center;background:rgba(0,0,0,.6);`;
    dlg.innerHTML = `
      <div style="background:#182a1c;border:1px solid #4caf50;border-radius:10px;
        padding:20px 22px;width:560px;max-width:92vw;max-height:82vh;
        display:flex;flex-direction:column;box-shadow:0 4px 24px rgba(0,0,0,.7);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;">
          <div style="font-size:.95em;color:#81c784;font-weight:bold;white-space:nowrap;">🏗 図形を選択</div>
          <div id="pm-mp-size" style="display:flex;gap:3px;">
            <button class="pm-mp-size-btn" data-size="1"   style="padding:4px 8px;font-size:.7em;
              border-radius:4px;cursor:pointer;border:1px solid #3a4a3a;background:#1a1a1a;color:#CACACA;">1x</button>
            <button class="pm-mp-size-btn" data-size="1.5" style="padding:4px 8px;font-size:.7em;
              border-radius:4px;cursor:pointer;border:1px solid #3a4a3a;background:#1a1a1a;color:#CACACA;">1.5x</button>
            <button class="pm-mp-size-btn" data-size="2"   style="padding:4px 8px;font-size:.7em;
              border-radius:4px;cursor:pointer;border:1px solid #3a4a3a;background:#1a1a1a;color:#CACACA;">2x</button>
          </div>
          <button id="pm-mp-close" style="background:#333;border:1px solid #666;color:#CACACA;
            border-radius:6px;padding:4px 10px;cursor:pointer;font-size:.8em;">✕ 閉じる</button>
        </div>
        <div id="pm-mp-divfilter" style="display:none;gap:4px;margin-bottom:8px;">
          <button class="pm-mp-div-btn" data-div="all" style="flex:1;padding:5px 2px;font-size:.76em;
            border-radius:4px;cursor:pointer;border:1px solid #3a4a3a;background:#1a1a1a;color:#CACACA;">全て</button>
          <button class="pm-mp-div-btn" data-div="plan" style="flex:1;padding:5px 2px;font-size:.76em;
            border-radius:4px;cursor:pointer;border:1px solid #3a4a3a;background:#1a1a1a;color:#CACACA;">📐 平面</button>
          <button class="pm-mp-div-btn" data-div="elevation" style="flex:1;padding:5px 2px;font-size:.76em;
            border-radius:4px;cursor:pointer;border:1px solid #3a4a3a;background:#1a1a1a;color:#CACACA;">📏 立面</button>
        </div>
        <div id="pm-mp-catfilter" style="display:none;margin-bottom:10px;">
          <select id="pm-mp-cat" style="width:100%;padding:5px;font-size:.78em;
            background:#1a1a1a;color:#ccc;border:1px solid #333;border-radius:4px;">
            <option value="all">全カテゴリー</option>
            <option value="heavy_vehicle">🔵 重機・車両</option>
            <option value="temp_material">🟡 仮設・資材</option>
            <option value="scaffold">⚪ 足場材</option>
            <option value="operation">🔴 作業</option>
            <option value="other">🟢 その他</option>
          </select>
        </div>
        <div id="pm-mp-body" style="flex:1;overflow-y:auto;min-height:120px;"></div>
      </div>`;
    document.body.appendChild(dlg);

    document.getElementById('pm-mp-close').onclick = () => closeMachineryPicker();
    dlg.addEventListener('pointerdown', e => { if (e.target === dlg) closeMachineryPicker(); }); 

    const catSel = dlg.querySelector('#pm-mp-cat');
    catSel.value = _mpLastCat;
    catSel.onchange = () => {
      _mpLastCat = catSel.value;
      _renderMachineryGrid(dlg, _mpLastCat, _mpActiveDiv(dlg));
    };

    function _activateDivBtn(btn) {
      dlg.querySelectorAll('.pm-mp-div-btn').forEach(b => {
        b.classList.remove('active');
        b.style.background = '#1a1a1a'; b.style.borderColor = '#3a4a3a'; b.style.color = '#CACACA';
      });
      btn.classList.add('active');
      btn.style.background = '#1b5e20'; btn.style.borderColor = '#4caf50'; btn.style.color = '#fff';
    }
    dlg.querySelectorAll('.pm-mp-div-btn').forEach(btn => {
      if (btn.dataset.div === _mpLastDiv) _activateDivBtn(btn);
      btn.onclick = () => {
        _mpLastDiv = btn.dataset.div;
        _activateDivBtn(btn);
        _renderMachineryGrid(dlg, catSel.value, _mpLastDiv);
      };
    });

    function _activateSizeBtn(btn) {
      dlg.querySelectorAll('.pm-mp-size-btn').forEach(b => {
        b.style.background = '#1a1a1a'; b.style.borderColor = '#3a4a3a'; b.style.color = '#CACACA';
      });
      btn.style.background = '#1b5e20'; btn.style.borderColor = '#4caf50'; btn.style.color = '#fff';
    }
    dlg.querySelectorAll('.pm-mp-size-btn').forEach(btn => {
      if (parseFloat(btn.dataset.size) === _mpThumbLevel) _activateSizeBtn(btn);
      btn.onclick = () => {
        _mpThumbLevel = parseFloat(btn.dataset.size);
        _activateSizeBtn(btn);
        _renderMachineryGrid(dlg, catSel.value, _mpActiveDiv(dlg));
      };
    });

    _renderMachineryGrid(dlg, _mpLastCat, _mpLastDiv);
  }

  const _PM_IO_LOCK_BTNS = ['pm-arrow-btn','pm-text-btn','pm-line-btn','pm-circle-btn',
    'pm-machinery-btn','pm-dist-btn','pm-undo-btn','pm-redo-btn','pm-vistype-btn',
    'pm-copy-btn','pm-clear-btn'];
  function _ensurePmLockStyle() {
    if (document.getElementById('pm-lock-style')) return;
    const s = document.createElement('style');
    s.id = 'pm-lock-style';
    s.innerHTML = `.pm-locked{opacity:.35 !important;filter:grayscale(60%) !important;
      pointer-events:none !important;cursor:not-allowed !important;}`;
    document.head.appendChild(s);
  }
  function _lockPmToolButtons(lock) {
    _ensurePmLockStyle();
    _PM_IO_LOCK_BTNS.forEach(id => {
      const el = (pmRightPanel && pmRightPanel.querySelector('#'+id)) || document.getElementById(id);
      if (!el) return;
      el.disabled = lock;
      el.classList.toggle('pm-locked', lock);
    });
  }
  function closePmIoMenu() { 
    pmIoMenuOpen = false; pmIoWriteOpen = false;
    const menu     = pmRightPanel.querySelector('#pm-io-menu');
    const writeSub = pmRightPanel.querySelector('#pm-io-write-sub');
    const writeBtn = pmRightPanel.querySelector('#pm-io-write-btn');
    if (menu)     menu.style.display = 'none';
    if (writeSub) writeSub.style.display = 'none';
    if (writeBtn) writeBtn.classList.remove('active');
    _lockPmToolButtons(false); 
  }
  const PM_VISTYPE_DEFS = [
    {key:'heavy_vehicle', label:'🔵 重機・車両', match: a => a.type==='machinery' && (machineryData[a.assetId]?.category)==='heavy_vehicle'},
    {key:'temp_material', label:'🟡 仮設・資材', match: a => a.type==='machinery' && (machineryData[a.assetId]?.category)==='temp_material'},
    {key:'scaffold',      label:'⚪ 足場材',     match: a => a.type==='machinery' && (machineryData[a.assetId]?.category)==='scaffold'},
    {key:'operation',     label:'🔴 作業',       match: a => a.type==='machinery' && (machineryData[a.assetId]?.category)==='operation'},
    {key:'other',         label:'🟢 その他',     match: a => a.type==='machinery' && (machineryData[a.assetId]?.category)==='other'},
    {key:'arrow',         label:'↗ 矢印',        match: a => a.type==='arrow'},
    {key:'text',          label:'💬 テキスト',    match: a => a.type==='text'},
    {key:'line',          label:'📏 線',         match: a => a.type==='line'},
    {key:'circle',        label:'⭕ 円',         match: a => a.type==='circle'},
  ];
  function _visStateToValue(ann, state){
    if (ann.type === 'text') return state===0?'edge-primary':state===1?'edge-secondary':'hidden';
    return state===0?'visible':state===1?'translucent':'hidden';
  }
  function _visValueToState(ann){
    const v = ann.visibility || (ann.type==='text' ? 'edge-primary' : 'visible');
    if (v === 'hidden') return 2;
    if (v === 'translucent' || v === 'edge-secondary') return 1;
    return 0;
  }
  function applyVisTypeState(defKey, state){
    const def = PM_VISTYPE_DEFS.find(d => d.key === defKey);
    if (!def) return;
    const targets = steps[currentStep].filter(def.match);
    if (!targets.length) return;
    pushPmUndo();
    targets.forEach(a => { a.visibility = _visStateToValue(a, state); });
    updatePlacedList();
    markPmDirty();
  }
  function openVisTypePanel(){
    if (typeof window.customChoice !== 'function') return; 
    let d = document.getElementById('_pmVisTypePanel');
    if (!d) {
      d = document.createElement('div');
      d.id = '_pmVisTypePanel';
      d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99000;display:flex;align-items:center;justify-content:center;';
      document.body.appendChild(d);
    }
    const rows = PM_VISTYPE_DEFS.map(def => {
      const cnt = steps[currentStep].filter(def.match).length;
      const curStates = steps[currentStep].filter(def.match).map(_visValueToState);
      const cur = curStates.length ? curStates[0] : -1; 
      const seg = (state, label) => `
        <button class="pm-vt-seg" data-key="${def.key}" data-state="${state}"
          style="flex:1;padding:5px 0;font-size:.72em;cursor:pointer;border:none;
            background:${cur===state?'rgba(76,175,80,.35)':'rgba(255,255,255,.06)'};
            color:${cur===state?'#a5d6a7':'#999'};">${label}</button>`;
      return `
        <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid #333;">
          <span style="flex:1;font-size:.82em;color:${cnt?'#ddd':'#555'};">${def.label} <span style="color:#CACACA;font-size:.85em;">(${cnt})</span></span>
          <div style="display:flex;width:150px;border:1px solid #444;border-radius:4px;overflow:hidden;${cnt?'':'opacity:.35;pointer-events:none;'}">
            ${seg(0,'表示')}${seg(1,'半透明')}${seg(2,'非表示')}
          </div>
        </div>`;
    }).join('');
    d.innerHTML = `<div style="background:#1e1e2e;border:1px solid #4caf50;border-radius:10px;
        padding:20px 22px;min-width:340px;max-width:90vw;">
      <p style="color:#a5d6a7;font-size:1em;margin:0 0 10px;">🏷 種別表示（現在のStepのみ）</p>
      <div>${rows}</div>
      <button id="_pmVisTypeClose" style="width:100%;margin-top:14px;padding:8px;
        background:#333;border:1px solid #666;color:#ccc;border-radius:6px;cursor:pointer;">閉じる</button>
    </div>`;
    d.style.display = 'flex';
    d.querySelectorAll('.pm-vt-seg').forEach(btn => {
      btn.onclick = () => {
        applyVisTypeState(btn.dataset.key, Number(btn.dataset.state));
        openVisTypePanel(); 
      };
    });
    document.getElementById('_pmVisTypeClose').onclick = () => { d.style.display = 'none'; };
  }

  function closeMachineryPicker() {
    document.getElementById('pm-machinery-picker')?.remove();
    const mb = document.getElementById('pm-machinery-btn');
    if (mb && annotMode !== 'machinery') mb.classList.remove('on');
  }

  function _mpActiveDiv(dlg) {
    const a = dlg.querySelector('.pm-mp-div-btn.active');
    return a ? a.dataset.div : 'all';
  }

  function _renderMachineryGrid(dlg, cat, div) {
    const body      = dlg.querySelector('#pm-mp-body');
    const divFilter = dlg.querySelector('#pm-mp-divfilter');
    const catFilter = dlg.querySelector('#pm-mp-catfilter');
    const count     = Object.keys(machineryData).length;

    if (!count) {
      if (divFilter) divFilter.style.display = 'none';
      if (catFilter) catFilter.style.display = 'none';
      body.innerHTML = `
        <div style="text-align:center;color:#CACACA;padding:30px 10px;font-size:.82em;line-height:1.8;">
          図形データが未読込です<br>
          <span style="color:#CACACA;font-size:.9em;">CalayMachineryData.dat</span><br><br>
          <button id="pm-mp-load" style="padding:8px 20px;font-size:.82em;border-radius:5px;
            background:rgba(76,175,80,.2);border:1px solid #4caf50;color:#a5d6a7;cursor:pointer;">
            📂 CalayMachineryData.dat を読込</button>
        </div>`;
      body.querySelector('#pm-mp-load').onclick = () => loadMachineryFile(() => _renderMachineryGrid(dlg, 'all', 'all'));
      return;
    }

    if (divFilter) divFilter.style.display = 'flex';
    if (catFilter) catFilter.style.display = 'block';

    const entries = Object.entries(machineryData)
      .filter(([,a]) => (cat === 'all' || a.category === cat)
                     && (div === 'all' || a.division === div));

    if (!entries.length) {
      body.innerHTML = `<div style="text-align:center;color:#CACACA;padding:30px 10px;font-size:.82em;">該当する図形がありません</div>`;
      return;
    }

    entries.sort(([idA,a],[idB,b]) => {
      const hasSortA = 'sort_no' in a && a.sort_no !== null && a.sort_no !== undefined;
      const hasSortB = 'sort_no' in b && b.sort_no !== null && b.sort_no !== undefined;
      if (hasSortA && hasSortB) return a.sort_no - b.sort_no;
      if (hasSortA) return -1;
      if (hasSortB) return 1;
      const hasOrderA = 'order_no' in a && a.order_no !== null && a.order_no !== undefined;
      const hasOrderB = 'order_no' in b && b.order_no !== null && b.order_no !== undefined;
      if (hasOrderA && hasOrderB) return a.order_no - b.order_no;
      if (hasOrderA) return -1;
      if (hasOrderB) return 1;
      return idA.localeCompare(idB);
    });

    const tw = Math.round(80 * _mpThumbLevel);
    const th = Math.round(70 * _mpThumbLevel);
    body.innerHTML = `<div id="pm-mp-grid" style="display:grid;
      grid-template-columns:repeat(auto-fill, minmax(${tw + 16}px, 1fr));gap:8px;"></div>`;
    const grid = body.querySelector('#pm-mp-grid');

    entries.forEach(([id, a]) => {
      const card = document.createElement('div');
      card.style.cssText = `background:#1a1a1a;border:1px solid #2a2a2a;border-radius:6px;
        padding:6px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;`;
      card.innerHTML = `
        <canvas width="${tw}" height="${th}" style="background:#fff;border-radius:4px;max-width:100%;"></canvas>
        <span style="font-size:.68em;color:#ccc;text-align:center;overflow:hidden;
          text-overflow:ellipsis;white-space:nowrap;width:100%;">${_escHtml(a.name)}</span>
        <span style="font-size:.62em;color:#CACACA;">${_escHtml(_MCAT_LABEL[a.category] || a.category)}</span>`;
      grid.appendChild(card);
      _renderAssetThumb(a, card.querySelector('canvas'));

      card.onmouseover = () => card.style.borderColor = '#4caf50';
      card.onmouseout  = () => card.style.borderColor = '#2a2a2a';
      card.onclick = () => {
        if (annotMode !== 'machinery') setAnnotMode('machinery');
        selectedAssetId = id;
        closeMachineryPicker();
        _toast(`🏗 「${a.name}」→ クリックで配置`, 2000);
      };
    });
  }

  function _renderAssetThumb(asset, canvasEl) {
    _ensureParsedSvg(asset);
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    
    const hb = _getAssetHitBounds(asset);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    [hb.base, hb.upper].forEach(b => {
      if (!b) return;
      if (b.minX < minX) minX = b.minX; if (b.maxX > maxX) maxX = b.maxX;
      if (b.minY < minY) minY = b.minY; if (b.maxY > maxY) maxY = b.maxY;
    });

    const cx = canvasEl.width / 2, cy = canvasEl.height / 2;
    let thumbScale, offX = 0, offY = 0;
    if (isFinite(minX)) {
      const bw = Math.max(maxX - minX, 0.05);
      const bh = Math.max(maxY - minY, 0.05);
      thumbScale = Math.min(canvasEl.width / bw, canvasEl.height / bh) * 0.86; 
      offX = -(minX + maxX) / 2;
      offY = -(minY + maxY) / 2;
    } else {
      thumbScale = Math.min(canvasEl.width, canvasEl.height) / ((asset.real_width_m || 4) * 2.2);
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(thumbScale, thumbScale);
    ctx.translate(offX, offY);
    _drawParsedFills(ctx, asset._parsed.lower, '#888888', thumbScale);
    _drawParsedFills(ctx, asset._parsed.color, '#e0e0e0', thumbScale);
    _drawParsedFills(ctx, asset._parsed.upper, '#e0e0e0', thumbScale);
    _drawParsedStrokes(ctx, asset._parsed.lower, thumbScale);
    _drawParsedStrokes(ctx, asset._parsed.color, thumbScale);
    _drawParsedStrokes(ctx, asset._parsed.upper, thumbScale);
    ctx.restore();
  }

  function handleCanvasClick(e) {
    const pos = getLogical(e);
    if (!pos) return;
    const {lx,ly} = pos;

    if (annotMode==='machinery' && selectedAssetId) {
      const asset = machineryData[selectedAssetId];
      if (!asset) return;
      pushPmUndo();
      steps[currentStep].push({
        uuid: uid(), type: 'machinery',
        name: annName('machinery'),
        assetId: selectedAssetId,
        lx, ly,
        rotation: 0, upperRotation: 0,
        arrayN: 0, arrayNX: 0, arrayNY: 0,
        color: asset.hatch_color || '#CCFF99',
        sizeMultiplier: 1,
        flipped: asset.flip_x || false
      });
      updatePlacedList();
      markPmDirty();
      return;
    }
    if (annotMode==='arrow') {
      if (!arrowStart) {
        arrowStart={lx,ly};
        _setStatus('↗ 矢印：終点クリック  |  Shift:水平/垂直固定  |  右クリック：キャンセル');
      } else {
        let endLx = lx, endLy = ly;
        if (e.shiftKey) {
          const dx = lx - arrowStart.lx, dy = ly - arrowStart.ly;
          if (Math.abs(dx) >= Math.abs(dy)) endLy = arrowStart.ly;
          else                              endLx = arrowStart.lx;
        }
        pushPmUndo();
        steps[currentStep].push({uuid:uid(),type:'arrow',name:annName('arrow'),
          x1:arrowStart.lx,y1:arrowStart.ly,x2:endLx,y2:endLy,
          color:COLORS[0],sizeStep:defArrowStep,arrowDir:'fwd'});
        arrowStart=null; previewPos=null;
        _setStatus('↗ 矢印：始点クリック  |  ESC：キャンセル');
        updatePlacedList();
        const _nowMs = Date.now();
        if (_nowMs - _lastArrowDirToastAt > ARROW_DIR_TOAST_COOLDOWN_MS) {
          _lastArrowDirToastAt = _nowMs;
          _toast('矢印の向きを変えたい場合は、矢印をダブルクリックしてください', 3600);
        }
      }
      markPmDirty();
      return;
    }
    if (annotMode==='line') {
      if (!lineStart) {
        lineStart={lx,ly};
        _setStatus('📏 線：終点クリック  |  Shift:水平/垂直固定  |  右クリック：キャンセル');
      } else {
        let endLx = lx, endLy = ly;
        if (e.shiftKey) {
          const dx = lx - lineStart.lx, dy = ly - lineStart.ly;
          if (Math.abs(dx) >= Math.abs(dy)) endLy = lineStart.ly;
          else                              endLx = lineStart.lx;
        }
        pushPmUndo();
        steps[currentStep].push({uuid:uid(),type:'line',name:annName('line'),
          x1:lineStart.lx,y1:lineStart.ly,x2:endLx,y2:endLy,
          color:COLORS[6],sizeStep:defLineStep});
        lineStart=null; previewPos=null;
        _setStatus('📏 線：始点クリック  |  ESC：キャンセル');
        updatePlacedList();
        const _nowMsL = Date.now();
        if (_nowMsL - _lastLineStyleToastAt > ARROW_DIR_TOAST_COOLDOWN_MS) {
          _lastLineStyleToastAt = _nowMsL;
          _toast('線種を変えるときは線をダブルクリックしてください', 3600);
        }
      }
      markPmDirty();
      return;
    }
    if (annotMode==='circle') { placeCircleDefault(lx, ly); return; }
    if (annotMode==='text') showTextInput(e.clientX, e.clientY, lx, ly);
  }

  function placeCircleDefault(centerLx, centerLy) {
    const pdfEl = document.getElementById('pdf-cv');
    const longSide = (pdfEl && pdfEl.width) ? Math.max(pdfEl.width, pdfEl.height) : 1000;
    const r = longSide * 0.1;
    pushPmUndo();
    steps[currentStep].push({
      uuid: uid(), type:'circle', name: annName('circle'),
      cx: centerLx, cy: centerLy, r: r, radiusM: _pxToM(r),
      color: COLORS[6], sizeStep: defLineStep, lineStyle: 'solid'
    });
    updatePlacedList();
    _setStatus('⭕ 円：中心をクリック  |  右クリック/ESC：キャンセル');
    markPmDirty();
  }

  function handleEditClick(e, hit) {
    const now = Date.now();
    const isDbl = hit && hit.uuid===lastClickUuid && now-lastClickMs < 400;
    lastClickMs   = now;
    lastClickUuid = hit ? hit.uuid : null;

    if (!hit) {
      selectedUuids.clear();
      updatePlacedList();
      markPmDirty();
      return;
    }

    if (isDbl && hit.part==='body') {
      const ann = steps[currentStep].find(a=>a.uuid===hit.uuid);
      if (ann && ann.type==='text') {
        showTextInput(e.clientX, e.clientY, ann.lx, ann.ly, ann.uuid);
        return;
      }
      if (ann && ann.type==='arrow') {
        pushPmUndo();
        const cycle = ['fwd','rev','both'];
        const cur   = ann.arrowDir || 'fwd';
        ann.arrowDir = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
        updatePlacedList();
        markPmDirty();
        return;
      }
      if (ann && ann.type==='line') {
        pushPmUndo();
        const cycle = ['solid','dashA','dashB','dashC'];
        const cur   = ann.lineStyle || 'solid';
        ann.lineStyle = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
        updatePlacedList();
        markPmDirty();
        return;
      }
      if (ann && ann.type==='circle') {
        pushPmUndo();
        const cycle = ['solid','dashA','dashB','dashC'];
        const cur   = ann.lineStyle || 'solid';
        ann.lineStyle = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
        updatePlacedList();
        markPmDirty();
        return;
      }
    }

    if (e.shiftKey) {
      if (selectedUuids.has(hit.uuid)) { selectedUuids.delete(hit.uuid); }
      else { selectedUuids.add(hit.uuid); }
      updatePlacedList();
    } else {
      selectedUuids.clear(); selectedUuids.add(hit.uuid);
      updatePlacedList();
      startDrag(e, hit);
    }
    markPmDirty();
  }

  function startDrag(e, hit) {
    const ann = steps[currentStep].find(a=>a.uuid===hit.uuid);
    if (!ann) return;
    if (ann.type === 'machinery' && hit.part === 'body') return;
    const {lx: startLx, ly: startLy} = getLogical(e);
    pushPmUndo();
    dragState = {
      uuid:    hit.uuid,
      part:    hit.part,
      startLx, startLy,
      origX1: ann.x1,  origY1: ann.y1,
      origX2: ann.x2,  origY2: ann.y2,
      origLx: ann.lx,  origLy: ann.ly,
      origRotation:      ann.rotation      || 0,
      origUpperRotation: ann.upperRotation || 0,
      origArrayN:  ann.arrayN  || 0,
      origArrayNX: ann.arrayNX || 0,
      origArrayNY: ann.arrayNY || 0,
      origFlipped: ann.flipped || false,
      origCx: ann.cx, origCy: ann.cy, origR: ann.r, 
    };
  }

  function handleDragMove(e) {
    if (!dragState) return;
    const ann = steps[currentStep].find(a=>a.uuid===dragState.uuid);
    if (!ann) { dragState=null; return; }

    const {lx: curLx, ly: curLy} = getLogical(e);
    const ddx = curLx - dragState.startLx;
    const ddy = curLy - dragState.startLy;

    if (ann.type==='arrow' || ann.type==='line') {
      if (dragState.part==='start') {
        let x1 = dragState.origX1 + ddx, y1 = dragState.origY1 + ddy;
        if (e.shiftKey) {
          const dx = x1 - dragState.origX2, dy = y1 - dragState.origY2;
          if (Math.abs(dx) >= Math.abs(dy)) y1 = dragState.origY2;
          else                              x1 = dragState.origX2;
        }
        ann.x1 = x1; ann.y1 = y1;
      } else if (dragState.part==='end') {
        let x2 = dragState.origX2 + ddx, y2 = dragState.origY2 + ddy;
        if (e.shiftKey) {
          const dx = x2 - dragState.origX1, dy = y2 - dragState.origY1;
          if (Math.abs(dx) >= Math.abs(dy)) y2 = dragState.origY1;
          else                              x2 = dragState.origX1;
        }
        ann.x2 = x2; ann.y2 = y2;
      } else {
        ann.x1 = dragState.origX1 + ddx; ann.y1 = dragState.origY1 + ddy;
        ann.x2 = dragState.origX2 + ddx; ann.y2 = dragState.origY2 + ddy;
      }
    } else if (ann.type==='machinery') {
      const asset = machineryData[ann.assetId];
      if (!asset) return;
      const S     = _getMachScale(asset, ann);
      const isElev = asset.division === 'elevation';

      if (dragState.part==='red' || dragState.part==='body') {
        ann.lx = dragState.origLx + ddx;
        ann.ly = dragState.origLy + ddy;
      } else if (dragState.part==='orange_plan') {
        let angle = Math.atan2(curLy - ann.ly, curLx - ann.lx);
        if (e.shiftKey) angle = Math.round(angle / (Math.PI / 8)) * (Math.PI / 8);
        ann.rotation = angle;
      } else if (dragState.part==='orange_elev') {
        ann.flipped = (curLx < ann.lx);
      } else if (dragState.part==='blue') {
        const behavior = asset.behavior;
        const rot  = ann.rotation || 0;
        const cosR = Math.cos(-rot), sinR = Math.sin(-rot);
        const flipXSign = (isElev && ann.flipped) ? -1 : 1;
        const dx   = flipXSign * (curLx - ann.lx), dy = curLy - ann.ly;
        const lxM = (dx * cosR - dy * sinR) / S;
        const lyM = -(dx * sinR + dy * cosR) / S;

        if (behavior === 'rotate') {
          const gx  = (asset.grip_blue_x != null) ? asset.grip_blue_x : (asset.real_width_m || 2) * 0.8;
          const gy  = asset.grip_blue_y || 0;
          const phi = Math.atan2(gy, gx);
          const thetaMouse = Math.atan2(curLy - ann.ly, curLx - ann.lx); 
          let relAngle = (isElev && ann.flipped)
            ? (Math.PI - phi - thetaMouse)
            : (thetaMouse - rot - phi);
          if (e.shiftKey) relAngle = Math.round(relAngle / (Math.PI / 8)) * (Math.PI / 8);
          ann.upperRotation = relAngle;
        } else if (behavior === 'array') {
          const pitch = asset.array_pitch_m || asset.grip_blue_x || 2;
          ann.arrayN = Math.max(0, Math.round(lxM / pitch) - 1);
        } else if (behavior === 'array_y') {
          const pitch = asset.array_pitch_y_m || 2;
          ann.arrayN = Math.max(0, Math.round(lyM / pitch) - 1);
        } else if (behavior === 'array_xy') {
          ann.arrayNX = Math.max(0, Math.round(lxM / (asset.array_pitch_x_m || 2)) - 1);
          ann.arrayNY = Math.max(0, Math.round(lyM / (asset.array_pitch_y_m || 2)) - 1);
        }
      }
    } else if (ann.type==='circle') {
      if (dragState.part==='radius') {
        const newR = Math.hypot(curLx-ann.cx, curLy-ann.cy);
        ann.r = Math.max(2, newR);
        ann.radiusM = _pxToM(ann.r);
      } else {
        ann.cx = dragState.origCx + ddx;
        ann.cy = dragState.origCy + ddy;
      }
    } else if (ann.type==='text') {
      if (dragState.part==='rotate') {
        const halfW = (ann._twPx || 0) / 2;
        let _rot = Math.atan2(curLy - ann.ly, curLx - (ann.lx + halfW));
        if (e.shiftKey) _rot = Math.round(_rot / (Math.PI / 2)) * (Math.PI / 2);
        ann.rotation = _rot;
      } else {
        ann.lx = dragState.origLx + ddx;
        ann.ly = dragState.origLy + ddy;
      }
    }
    markPmDirty();
  }

  function endDrag() {
    dragState = null;
  }

  function hitTestCSS(cssx, cssy) {
    const {zoom,ox,oy} = getState();
    for (let i=steps[currentStep].length-1; i>=0; i--) {
      const ann = steps[currentStep][i];
      const _vis = ann.visibility || (ann.type==='text' ? 'edge-primary' : 'visible');
      if (_vis === 'hidden') continue;
      if (ann.type==='arrow' || ann.type==='line') {
        const pScale = getPaperScale();
        const lwArr = ann.type==='line' ? LINE_LW : ARROW_LW;
        const lw    = lwArr[ann.sizeStep??1] * pScale; 
        const lwSc  = lw * zoom;
        const grip  = Math.max(lwSc / 2 + 10, 14);
        const sx = ann.x1*zoom, sy = ann.y1*zoom;
        const tx = ann.x2*zoom, ty = ann.y2*zoom;
        if (Math.hypot(cssx-sx,cssy-sy) < grip) return {uuid:ann.uuid,part:'start'};
        if (Math.hypot(cssx-tx,cssy-ty) < grip) return {uuid:ann.uuid,part:'end'};
        if (distToSeg(cssx,cssy,sx,sy,tx,ty) < lwSc / 2 + 6)  return {uuid:ann.uuid,part:'body'};
      }
      if (ann.type==='circle') {
        const lw   = LINE_LW[ann.sizeStep??1] * getPaperScale(); 
        const lwSc = lw * zoom;
        const grip = Math.max(lwSc / 2 + 10, 14);
        const cxs = ann.cx*zoom, cys = ann.cy*zoom, rS = (ann.r||0)*zoom;
        const gx = cxs + rS, gy = cys; 
        if (Math.hypot(cssx-gx, cssy-gy) < grip) return {uuid:ann.uuid, part:'radius'};
        const dist = Math.hypot(cssx-cxs, cssy-cys);
        if (Math.abs(dist - rS) < lwSc/2 + 6) return {uuid:ann.uuid, part:'body'};
      }
      if (ann.type==='machinery') {
        const asset = machineryData[ann.assetId];
        if (!asset) continue;
        const {zoom:z} = getState();
        const S      = _getMachScale(asset, ann);
        const isElev = asset.division === 'elevation';
        const GR     = 14;
        const rotation = isElev ? 0 : (ann.rotation || 0);
        const rx = ann.lx * z, ry = ann.ly * z;
        if (Math.hypot(cssx - rx, cssy - ry) < GR) return {uuid:ann.uuid, part:'red'};
        if (isElev) {
          const dir = ann.flipped ? -1 : 1;
          const fGx = (ann.lx + dir * (asset.real_width_m || 2) * S * 0.5) * z;
          if (Math.hypot(cssx - fGx, cssy - ry) < GR) return {uuid:ann.uuid, part:'orange_elev'};
        } else {
          const oD  = _getOrangeDist(asset) * S;
          const oGx = (ann.lx + oD * Math.cos(rotation)) * z;
          const oGy = (ann.ly + oD * Math.sin(rotation)) * z;
          if (Math.hypot(cssx - oGx, cssy - oGy) < GR) return {uuid:ann.uuid, part:'orange_plan'};
        }
        if (asset.behavior !== 'static') {
          const bPos = _getBlueGripPos(asset, ann, S);
          if (bPos && Math.hypot(cssx - bPos.x * z, cssy - bPos.y * z) < GR)
            return {uuid:ann.uuid, part:'blue'};
        }
        const localPt = _worldToAssetLocal(asset, ann, S, isElev, rotation, cssx/z, cssy/z);
        if (_hitAssetBody(asset, ann, localPt.x, localPt.y)) return {uuid:ann.uuid, part:'body'};
      }
      if (ann.type==='text') {
        const pScale   = getPaperScale();
        const fs       = TEXT_FS[ann.sizeStep ?? 1] * pScale; 
        const rotation = ann.rotation || 0;
        const tw_css   = ann._twPx ? ann._twPx * zoom
                                   : ann.text.length * fs * zoom;
        const th_css   = ann._fsPx ? ann._fsPx * zoom * 0.7
                                   : fs * zoom * 0.65;
        const tcx      = ann.lx*zoom + tw_css/2;
        const tcy      = ann.ly*zoom;
        const ddx = cssx-tcx, ddy = cssy-tcy;
        const cosR = Math.cos(-rotation), sinR = Math.sin(-rotation);
        const lx = ddx*cosR - ddy*sinR;
        const ly = ddx*sinR + ddy*cosR;
        const rotHit = Math.max(16, fs * zoom * 0.35);
        if (Math.hypot(lx-(tw_css/2+18), ly) < rotHit) return {uuid:ann.uuid, part:'rotate'};
        if (lx >= -tw_css/2-6 && lx <= tw_css/2+6 && Math.abs(ly) <= th_css+6) return {uuid:ann.uuid, part:'body'};
      }
    }
    return null;
  }

  function distToSeg(px,py,ax,ay,bx,by) {
    const dx=bx-ax, dy=by-ay, len2=dx*dx+dy*dy;
    if (len2===0) return Math.hypot(px-ax,py-ay);
    const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len2));
    return Math.hypot(px-(ax+t*dx), py-(ay+t*dy));
  }

  function updateHoverCursor(e) {
    const hit = hitTestCSS(e.clientX-pdfCvLeft, e.clientY-pdfCvTop);
    if (hoverUuid !== (hit ? hit.uuid : null)) markPmDirty();
    hoverUuid = hit ? hit.uuid : null;
    if (!hit) { pmCv.style.cursor = 'default'; return; }
    if (hit.part === 'rotate') { pmCv.style.cursor = 'crosshair'; return; }
    if (hit.part !== 'body')   { pmCv.style.cursor = 'grab'; return; }
    const ann = steps[currentStep].find(a => a.uuid === hit.uuid);
    pmCv.style.cursor = (ann && ann.type === 'machinery') ? 'pointer' : 'move';
  }

  function showTextInput(clientX, clientY, lx, ly, editUuid=null) {
    document.getElementById('pm-text-float')?.remove();
    const editAnn = editUuid ? steps[currentStep].find(a=>a.uuid===editUuid) : null;

    const isEdit = !!editUuid;
    const borderColor = isEdit ? '#40c8ff' : '#4caf50';
    const titleLabel  = isEdit ? '✏️ テキスト編集' : '📝 テキスト入力';

    let curColor = editAnn ? (editAnn.color || defTextColor) : defTextColor;
    let curSize  = editAnn ? (editAnn.sizeStep ?? defTextStep) : defTextStep; 
    const TEXT_COLORS = COLORS; 

    const wrap = document.createElement('div');
    wrap.id = 'pm-text-float';
    wrap.style.cssText = `
      position:fixed;z-index:99999;
      left:${clientX}px;top:${Math.max(10,clientY-52)}px;
      background:#1e1e2e;border:2px solid ${borderColor};border-radius:7px;
      padding:8px 10px;display:flex;flex-direction:column;gap:6px;
      box-shadow:0 4px 18px rgba(0,0,0,.65);`;
    wrap.innerHTML = `
      <div style="font-size:.72em;color:${borderColor};margin-bottom:2px;">${titleLabel}</div>
      <div style="display:flex;gap:6px;align-items:center;">
        <input id="pm-text-val" type="text" placeholder="テキストを入力..."
          style="background:#2a2a3a;border:1px solid ${borderColor}55;color:#eee;border-radius:4px;
                 padding:5px 9px;font-size:.84em;width:190px;outline:none;box-sizing:border-box;">
        <button id="pm-text-stamp-tgl" title="定型文"
          style="padding:5px 8px;background:#2a2a3a;border:1px solid ${borderColor};color:${borderColor};
                 border-radius:4px;cursor:pointer;font-size:.75em;">▼</button>
        <button id="pm-text-ok"
          style="padding:5px 12px;background:${borderColor};border:none;color:#000;
                 border-radius:4px;cursor:pointer;font-weight:700;font-size:.82em;">✓</button>
      </div>
      <div id="pm-text-stamp-panel" style="display:none;overflow-y:auto;
        background:rgba(0,0,0,.25);border:1px solid #333;border-radius:5px;padding:6px 7px;"></div>
      <div style="display:flex;align-items:center;gap:8px;">
        <div id="pm-text-colors" style="display:flex;gap:4px;">
          ${TEXT_COLORS.map(c => `<button class="pm-text-color-btn" data-color="${c}"
            style="width:16px;height:16px;border-radius:50%;padding:0;cursor:pointer;
                   background:${c};border:2px solid ${c===curColor?'#fff':'rgba(255,255,255,.35)'};"></button>`).join('')}
        </div>
        <div style="flex:1;"></div>
        <div style="display:flex;align-items:center;gap:5px;">
          <span style="font-size:.68em;color:#CACACA;">サイズ</span>
          <button id="pm-text-size-dn" style="width:18px;height:18px;font-size:.75em;padding:0;
            display:inline-flex;align-items:center;justify-content:center;">◀</button>
          <span id="pm-text-size-lbl" style="font-size:.72em;color:${borderColor};width:12px;
            text-align:center;">${curSize}</span>
          <button id="pm-text-size-up" style="width:18px;height:18px;font-size:.75em;padding:0;
            display:inline-flex;align-items:center;justify-content:center;">▶</button>
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const STAMP_GROUPS = [
      ['あ', ['アウトリガー張出','アスファルト','足場組立範囲','足元注意','安全設備','安全通路',
               'AS','AP','SMW','親綱']],
      ['か', ['開口部注意','概算数量','火気厳禁','火気使用','仮設トイレ','仮置き','仮囲い',
               '基礎','基層','基準点','既存','休憩所','切梁','躯体','掘削範囲','クレーン作業',
               'ゲート','現場事務所','工事車両','高所作業','Con','コンクリート']],
      ['さ', ['砕石','作業エリア','作業時間','作業半径','参考図','残工事','残土置場','資機材置場',
               '資材置場','車両ルート','GL','重機作業中','消火器','消火設備','捨てコン','頭上注意',
               '施工範囲','設置範囲','旋回範囲','先行工事','洗車場','測点']],
      ['た', ['待機場所','第三者','打設範囲','立入禁止','玉掛作業','断面図','丁張','墜落注意',
               '吊荷','TP','手摺','転落注意','床付け','土砂仮置場']],
      ['な', ['法肩','法面']],
      ['は', ['排水処理','搬出経路','搬入経路','BM','飛来落下注意','表層','分電盤','平面図',
               '別途','別途工事','保安設備','歩行者通路']],
      ['ま', ['埋設物','水替え','見積範囲','見積範囲外']],
      ['や', ['ヤード','矢板','山留','誘導員配置','要確認','要協議']],
      ['ら', ['立面図','レベルコン','路床','路盤']],
    ];
    const stampPanel = document.getElementById('pm-text-stamp-panel');
    const stampTgl    = document.getElementById('pm-text-stamp-tgl');
    let stampBuilt = false;
    function buildStampPanel() {
      if (stampBuilt) return;
      stampBuilt = true;
      stampPanel.innerHTML = STAMP_GROUPS.map(([label, words]) => `
        <div style="display:flex;align-items:flex-start;gap:5px;margin-bottom:4px;">
          <span style="flex-shrink:0;width:2.2em;padding-top:4px;font-size:.66em;color:#888;text-align:right;">${label}</span>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${words.map(w => `<button class="pm-stamp-btn" data-w="${w}"
              style="padding:3px 8px;background:#2a2a3a;border:1px solid #444;color:#cacaca;
                     border-radius:4px;font-size:.72em;cursor:pointer;white-space:nowrap;">${w}</button>`).join('')}
          </div>
        </div>`).join('');
      stampPanel.querySelectorAll('.pm-stamp-btn').forEach(btn => {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          const w = btn.dataset.w;
          inp.value = inp.value ? (inp.value + ' ' + w) : w;
          stampPanel.style.display = 'none';
          stampTgl.textContent = '▼';
          inp.focus();
        };
      });
    }
    stampTgl.onclick = (ev) => {
      ev.stopPropagation();
      buildStampPanel();
      const show = stampPanel.style.display === 'none';
      if (show) {
        const margin = 10;
        const wr = wrap.getBoundingClientRect();
        const availW = window.innerWidth  - margin*2;
        const availH = window.innerHeight - wr.top - margin;
        stampPanel.style.width    = Math.min(640, availW) + 'px';
        stampPanel.style.maxWidth = availW + 'px';
        stampPanel.style.maxHeight= Math.max(80, availH) + 'px';
        stampPanel.style.display  = 'block';
      } else {
        stampPanel.style.display  = 'none';
      }
      stampTgl.textContent = show ? '▲' : '▼';
      if (show) {
        requestAnimationFrame(() => {
          const r = wrap.getBoundingClientRect();
          const margin = 8;
          let dx = 0, dy = 0;
          if (r.right  > window.innerWidth  - margin) dx = (window.innerWidth  - margin) - r.right;
          if (r.bottom > window.innerHeight - margin) dy = (window.innerHeight - margin) - r.bottom;
          if (r.left + dx < margin) dx = margin - r.left;
          if (r.top  + dy < margin) dy = margin - r.top;
          if (dx || dy) {
            wrap.style.left = (parseFloat(wrap.style.left) + dx) + 'px';
            wrap.style.top  = (parseFloat(wrap.style.top)  + dy) + 'px';
          }
        });
      }
      inp.focus();
    };

    const inp = document.getElementById('pm-text-val');
    if (editAnn) inp.value = editAnn.text;
    setTimeout(() => { inp.focus(); inp.select(); }, 30);

    wrap.querySelectorAll('.pm-text-color-btn').forEach(btn => {
      btn.onclick = (ev) => {
        ev.stopPropagation();
        curColor = btn.dataset.color;
        wrap.querySelectorAll('.pm-text-color-btn').forEach(b => { b.style.borderColor = 'rgba(255,255,255,.35)'; });
        btn.style.borderColor = '#fff';
        inp.focus();
      };
    });
    document.getElementById('pm-text-size-dn').onclick = (ev) => {
      ev.stopPropagation();
      curSize = Math.max(0, curSize - 1); 
      document.getElementById('pm-text-size-lbl').textContent = curSize;
      inp.focus();
    };
    document.getElementById('pm-text-size-up').onclick = (ev) => {
      ev.stopPropagation();
      curSize = Math.min(5, curSize + 1);
      document.getElementById('pm-text-size-lbl').textContent = curSize;
      inp.focus();
    };

    function outside(ev) {
      if (!wrap.contains(ev.target)) { cleanup(); }
    }
    function cleanup() {
      wrap.remove();
      document.removeEventListener('pointerdown', outside);
    }
    function confirm() {
      const txt=inp.value.trim(); cleanup();
      if (!txt) return;
      pushPmUndo();
      if (editAnn) {
        editAnn.text = txt;
        editAnn.color = curColor;
        editAnn.sizeStep = curSize;
      } else {
        steps[currentStep].push({uuid:uid(),type:'text',name:annName('text'),lx,ly,text:txt,
          color:curColor,sizeStep:curSize});
      }
      defTextColor = curColor;
      defTextStep  = curSize;
      const lbl = pmRightPanel && pmRightPanel.querySelector('#pm-text-step-lbl');
      if (lbl) lbl.textContent = defTextStep;
      updatePlacedList();
      markPmDirty();
    }
    document.getElementById('pm-text-ok').onclick     = confirm;
    inp.addEventListener('keydown', ev => {
      if (ev.key==='Enter')  { ev.stopPropagation(); confirm(); }
      if (ev.key==='Escape') { ev.stopPropagation(); cleanup(); }
    }, {capture:true});
    setTimeout(() => {
      document.addEventListener('pointerdown', outside);
    }, 150);
  }

  function getState() {
    const base = window._pmState || {
      zoom:       typeof zoom       !== 'undefined' ? zoom       : 1,
      ox:         typeof ox         !== 'undefined' ? ox         : 0,
      oy:         typeof oy         !== 'undefined' ? oy         : 0,
      scaleDenom: typeof scaleDenom !== 'undefined' ? scaleDenom : 100
    };
    const actualZoom = (pixelScale > 0 && pixelScale < 1000)
      ? (1 / pixelScale)
      : base.zoom;
    return { ...base, zoom: actualZoom };
  }

  function l2c(lx,ly) {
    return { cx: lx, cy: ly };
  }

  function getLogical(e) {
    if (typeof getLogi === 'function') {
      const r = getLogi(e);
      if (r && typeof r.x  === 'number') return { lx: r.x, ly: r.y };
      if (r && typeof r.lx === 'number') return r;
    }
    const {zoom,ox,oy}=getState();
    const cvw = document.getElementById('cv-wrap');
    const rc  = cvw ? cvw.getBoundingClientRect() : {left:0,top:0};
    return { lx:(e.clientX-rc.left-ox)/zoom, ly:(e.clientY-rc.top-oy)/zoom };
  }

  function renderPmLayer() {
    if (!pmCtx||!pmCv.width) return;
    pmCtx.clearRect(0,0,pmCv.width,pmCv.height);
    pmCtx.save();
    pmCtx.translate(pmCpad,pmCpad); 

    steps[currentStep].forEach(ann => {
      const sel = selectedUuids.has(ann.uuid);
      const isHov = (hoverUuid === ann.uuid);
      if      (ann.type === 'machinery') drawMachinery(ann, sel, isHov);
      else if (ann.type === 'arrow')     drawArrow(ann, sel, isHov);
      else if (ann.type === 'line')      drawLine(ann, sel, isHov);
      else if (ann.type === 'circle')    drawCircle(ann, sel, isHov);
      else if (ann.type === 'text')      drawText(ann, sel, isHov);
    });

    if (!annotMode && !_pmExporting) {
      if (selectedUuids.size===1) {
        const selAnn = steps[currentStep].find(a=>a.uuid===[...selectedUuids][0]);
        if (selAnn && (selAnn.type==='arrow' || selAnn.type==='line')) {
          const s=l2c(selAnn.x1,selAnn.y1), t=l2c(selAnn.x2,selAnn.y2);
          const {zoom:gz}=getState();
          const r = 6 / Math.max(gz, 0.005);
          [s,t].forEach(pt => {
            pmCtx.beginPath(); pmCtx.arc(pt.cx,pt.cy,r,0,Math.PI*2);
            pmCtx.fillStyle='#fff'; pmCtx.fill();
            pmCtx.strokeStyle=selAnn.color||'#ff4081';
            pmCtx.lineWidth=2 / Math.max(gz, 0.005); pmCtx.stroke();
          });
        }
        if (selAnn && selAnn.type==='circle') {
          const c = l2c(selAnn.cx, selAnn.cy);
          const {zoom:gz}=getState();
          const gr = 6 / Math.max(gz, 0.005);
          const gx = c.cx + (selAnn.r||0), gy = c.cy;
          pmCtx.beginPath(); pmCtx.arc(gx,gy,gr,0,Math.PI*2);
          pmCtx.fillStyle='#fff'; pmCtx.fill();
          pmCtx.strokeStyle=selAnn.color||'#111111';
          pmCtx.lineWidth=2 / Math.max(gz, 0.005); pmCtx.stroke();
          const curM = (typeof _pxToM === 'function') ? _pxToM(selAnn.r||0) : (selAnn.radiusM||0);
          const label = `r=${curM.toFixed(2)}m`;
          const fs = 13 / Math.max(gz, 0.005) * (window._supportTextScale||1);
          pmCtx.save();
          pmCtx.font = `bold ${fs}px "Segoe UI","Yu Gothic",sans-serif`;
          pmCtx.textAlign = 'left'; pmCtx.textBaseline = 'middle';
          const lw2 = 3 / Math.max(gz, 0.005);
          pmCtx.lineWidth = lw2; pmCtx.strokeStyle = 'rgba(0,0,0,.8)';
          pmCtx.strokeText(label, gx + gr + 4/Math.max(gz,0.005), gy);
          pmCtx.fillStyle = '#fff';
          pmCtx.fillText(label, gx + gr + 4/Math.max(gz,0.005), gy);
          pmCtx.restore();
        }
      }
      if (hoverUuid && !selectedUuids.has(hoverUuid)) {
        const hovAnn = steps[currentStep].find(a=>a.uuid===hoverUuid);
        if (hovAnn && (hovAnn.type==='arrow' || hovAnn.type==='line')) {
          const s=l2c(hovAnn.x1,hovAnn.y1), t=l2c(hovAnn.x2,hovAnn.y2);
          const {zoom:gz}=getState();
          const r = 6 / Math.max(gz, 0.005);
          pmCtx.save();
          pmCtx.globalAlpha = 0.6;
          [s,t].forEach(pt => {
            pmCtx.beginPath(); pmCtx.arc(pt.cx,pt.cy,r,0,Math.PI*2);
            pmCtx.fillStyle='#fff'; pmCtx.fill();
            pmCtx.strokeStyle=hovAnn.color||'#ff4081';
            pmCtx.lineWidth=2 / Math.max(gz, 0.005); pmCtx.stroke();
          });
          pmCtx.restore();
        }
        if (hovAnn && hovAnn.type==='circle') {
          const c = l2c(hovAnn.cx, hovAnn.cy);
          const {zoom:gz}=getState();
          const gr = 6 / Math.max(gz, 0.005);
          const gx = c.cx + (hovAnn.r||0), gy = c.cy;
          pmCtx.save();
          pmCtx.globalAlpha = 0.6;
          pmCtx.beginPath(); pmCtx.arc(gx,gy,gr,0,Math.PI*2);
          pmCtx.fillStyle='#fff'; pmCtx.fill();
          pmCtx.strokeStyle=hovAnn.color||'#111111';
          pmCtx.lineWidth=2 / Math.max(gz, 0.005); pmCtx.stroke();
          pmCtx.restore();
        }
      }
    }

    if (annotMode==='arrow'&&arrowStart&&previewPos) {
      const s=l2c(arrowStart.lx,arrowStart.ly), t=l2c(previewPos.lx,previewPos.ly);
      const lw = ARROW_LW[defArrowStep] * getPaperScale();
      drawArrowRaw(s.cx,s.cy,t.cx,t.cy,'rgba(255,64,129,.5)',lw,true,lw);
    }
    if (annotMode==='arrow'&&arrowStart) {
      const {cx,cy}=l2c(arrowStart.lx,arrowStart.ly);
      const {zoom:pz}=getState();
      pmCtx.beginPath(); pmCtx.arc(cx,cy,5/Math.max(pz,0.005),0,Math.PI*2);
      pmCtx.fillStyle='#ff4081'; pmCtx.fill();
    }

    if (annotMode==='line'&&lineStart&&previewPos) {
      const s=l2c(lineStart.lx,lineStart.ly), t=l2c(previewPos.lx,previewPos.ly);
      const lw = LINE_LW[defLineStep] * getPaperScale();
      pmCtx.save();
      pmCtx.strokeStyle='rgba(17,17,17,.5)'; pmCtx.lineWidth=lw; pmCtx.lineCap='round';
      pmCtx.setLineDash([6,4]);
      pmCtx.beginPath(); pmCtx.moveTo(s.cx,s.cy); pmCtx.lineTo(t.cx,t.cy); pmCtx.stroke();
      pmCtx.setLineDash([]);
      pmCtx.restore();
    }
    if (annotMode==='line'&&lineStart) {
      const {cx,cy}=l2c(lineStart.lx,lineStart.ly);
      const {zoom:pz}=getState();
      pmCtx.beginPath(); pmCtx.arc(cx,cy,5/Math.max(pz,0.005),0,Math.PI*2);
      pmCtx.fillStyle='#111111'; pmCtx.fill();
    }

    if (annotMode==='machinery' && selectedAssetId && previewPos) {
      const asset = machineryData[selectedAssetId];
      if (asset) {
        const previewAnn = {
          assetId: selectedAssetId,
          lx: previewPos.lx, ly: previewPos.ly,
          rotation: 0, upperRotation: 0,
          arrayN: 0, arrayNX: 0, arrayNY: 0,
          color: asset.hatch_color || '#CCFF99',
          sizeMultiplier: 1, flipped: asset.flip_x || false
        };
        pmCtx.save();
        pmCtx.globalAlpha = 0.5;
        drawMachinery(previewAnn, false, false);
        pmCtx.restore();
      }
    }
    if (typeof window._isDistModeOn === 'function' && window._isDistModeOn()
        && typeof window._getDistPoints === 'function') {
      const {pts: dPts, history: dHist, cursor: dCursor} = window._getDistPoints() || {};
      if ((dHist && dHist.length) || (dPts && dPts.length)) {
        const {zoom: dz} = getState();
        pmCtx.save();
        if (dHist && dHist.length >= 2) {
          pmCtx.beginPath();
          pmCtx.moveTo(dHist[0].x, dHist[0].y);
          for (let i = 1; i < dHist.length; i++) pmCtx.lineTo(dHist[i].x, dHist[i].y);
          pmCtx.strokeStyle = '#ff6600'; pmCtx.lineWidth = 3.5 / Math.max(dz, 0.005);
          pmCtx.setLineDash([]); pmCtx.stroke();
        }
        (dHist || []).forEach(pt => {
          pmCtx.beginPath(); pmCtx.arc(pt.x, pt.y, 5 / Math.max(dz, 0.005), 0, Math.PI*2);
          pmCtx.fillStyle = '#ff6600'; pmCtx.fill();
          pmCtx.strokeStyle = '#fff'; pmCtx.lineWidth = 1.5 / Math.max(dz, 0.005); pmCtx.stroke();
        });
        const lastPt = (dHist && dHist.length) ? dHist[dHist.length-1]
                     : (dPts && dPts.length ? dPts[dPts.length-1] : null);
        if (lastPt && dCursor) {
          pmCtx.beginPath();
          pmCtx.moveTo(lastPt.x, lastPt.y);
          pmCtx.lineTo(dCursor.x, dCursor.y);
          pmCtx.strokeStyle = '#ff6600'; pmCtx.lineWidth = 3.5 / Math.max(dz, 0.005);
          pmCtx.setLineDash([8/Math.max(dz,0.005), 5/Math.max(dz,0.005)]);
          pmCtx.stroke(); pmCtx.setLineDash([]);
        }
        pmCtx.restore();
      }
    }
    pmCtx.restore(); 
  }

  function _getMachScale(asset, ann) {
    const sDenom = typeof scaleDenom !== 'undefined' ? scaleDenom : 100;
    return (11340 / sDenom) * (ann.sizeMultiplier || 1);
  }

  function _mToPx(meters) {
    const sDenom = typeof scaleDenom !== 'undefined' ? scaleDenom : 100;
    const rs     = typeof RS !== 'undefined' ? RS : 4;
    return meters * 1000 * rs / ((25.4/72) * sDenom);
  }
  function _pxToM(px) {
    const sDenom = typeof scaleDenom !== 'undefined' ? scaleDenom : 100;
    const rs     = typeof RS !== 'undefined' ? RS : 4;
    return px * (25.4/72) * sDenom / 1000 / rs;
  }

  function _getAssetHitBounds(asset) {
    if (asset._hitBoundsCache) return asset._hitBoundsCache;
    _ensureParsedSvg(asset);
    let base = _parsedPointBounds([asset._parsed.lower, asset._parsed.color]);
    const up  = _parsedPointBounds([asset._parsed.upper]);
    if (!base && !up) {
      const hw = (asset.real_width_m||2)/2, hl = (asset.real_length_m||2)/2;
      base = {minX:-hw, minY:-hl, maxX:hw, maxY:hl};
    } else if (!base) {
      base = up;
    }
    asset._hitBoundsCache = { base, upper: up };
    return asset._hitBoundsCache;
  }

  function _ptInBox(x, y, box, pad) {
    if (!box) return false;
    pad = pad || 0;
    return x >= box.minX-pad && x <= box.maxX+pad && y >= box.minY-pad && y <= box.maxY+pad;
  }

  function _worldToAssetLocal(asset, ann, S, isElev, rotation, wx, wy) {
    let ox = wx - ann.lx, oy = wy - ann.ly;
    if (isElev && ann.flipped) ox = -ox;
    const cosR = Math.cos(-rotation), sinR = Math.sin(-rotation);
    return { x: (ox*cosR - oy*sinR) / S, y: (ox*sinR + oy*cosR) / S };
  }

  function _hitAssetBody(asset, ann, lx, ly) {
    const bounds = _getAssetHitBounds(asset);
    const pad = 0.15;
    if (_ptInBox(lx, ly, bounds.base, pad)) return true;
    if (!bounds.upper) return false;
    const behavior = asset.behavior;
    if (behavior === 'rotate') {
      const ur = ann.upperRotation || 0;
      const ux = lx*Math.cos(-ur) - ly*Math.sin(-ur);
      const uy = lx*Math.sin(-ur) + ly*Math.cos(-ur);
      return _ptInBox(ux, uy, bounds.upper, pad);
    }
    if (behavior === 'array') {
      const pitch = asset.array_pitch_m || asset.grip_blue_x || 2;
      const total = (ann.arrayN||0)+1;
      const ext = {minX:bounds.upper.minX, maxX:bounds.upper.maxX+(total-1)*pitch,
                   minY:bounds.upper.minY, maxY:bounds.upper.maxY};
      return _ptInBox(lx, ly, ext, pad);
    }
    if (behavior === 'array_y') {
      const pitch = asset.array_pitch_y_m || 2;
      const total = (ann.arrayN||0)+1;
      const ext = {minX:bounds.upper.minX, maxX:bounds.upper.maxX,
                   minY:bounds.upper.minY-(total-1)*pitch, maxY:bounds.upper.maxY};
      return _ptInBox(lx, ly, ext, pad);
    }
    if (behavior === 'array_xy') {
      const pX=asset.array_pitch_x_m||2, pY=asset.array_pitch_y_m||2;
      const tX=(ann.arrayNX||0)+1, tY=(ann.arrayNY||0)+1;
      const ext = {minX:bounds.upper.minX, maxX:bounds.upper.maxX+(tX-1)*pX,
                   minY:bounds.upper.minY-(tY-1)*pY, maxY:bounds.upper.maxY};
      return _ptInBox(lx, ly, ext, pad);
    }
    return _ptInBox(lx, ly, bounds.upper, pad);
  }

  function _getOrangeDist(asset) {
    const d = Math.hypot(asset.grip_yellow_x || 0, asset.grip_yellow_y || 0);
    return d > 0 ? d : Math.max(asset.real_width_m || 2, asset.real_length_m || 2) * 0.5;
  }

  function _getBlueGripPos(asset, ann, S) {
    const behavior = asset.behavior;
    let bx = 0, by = 0;
    if (behavior === 'rotate') {
      const gx = (asset.grip_blue_x != null) ? asset.grip_blue_x : (asset.real_width_m || 2) * 0.8;
      const gy = asset.grip_blue_y || 0;
      const ur = ann.upperRotation || 0;
      bx = gx * Math.cos(ur) - gy * Math.sin(ur);
      by = gx * Math.sin(ur) + gy * Math.cos(ur);
    } else if (behavior === 'array') {
      const pitch = asset.array_pitch_m || asset.grip_blue_x || 2;
      bx = ((ann.arrayN || 0) + 1) * pitch; by = 0;
    } else if (behavior === 'array_y') {
      const pitch = asset.array_pitch_y_m || 2;
      bx = 0; by = -((ann.arrayN || 0) + 1) * pitch; 
    } else if (behavior === 'array_xy') {
      bx =  ((ann.arrayNX || 0) + 1) * (asset.array_pitch_x_m || 2);
      by = -((ann.arrayNY || 0) + 1) * (asset.array_pitch_y_m || 2); 
    } else { return null; }
    if (asset.division === 'elevation' && ann.flipped) bx = -bx;
    const rot  = ann.rotation || 0;
    const cosR = Math.cos(rot), sinR = Math.sin(rot);
    const bxPx = bx * S, byPx = by * S; 
    return {
      x: ann.lx + bxPx * cosR - byPx * sinR,
      y: ann.ly + bxPx * sinR + byPx * cosR
    };
  }

  function drawMachinery(ann, selected, isHover) {
    const asset = machineryData[ann.assetId];
    const vis   = ann.visibility || 'visible';
    const {zoom:z} = getState();
    if (!asset) {
      const R = 20 / Math.max(z, 0.005);
      pmCtx.save();
      pmCtx.strokeStyle = '#666'; pmCtx.lineWidth = 2 / Math.max(z, 0.005);
      pmCtx.setLineDash([4/Math.max(z,.005), 4/Math.max(z,.005)]);
      pmCtx.strokeRect(ann.lx - R, ann.ly - R, R*2, R*2);
      pmCtx.setLineDash([]);
      pmCtx.beginPath();
      pmCtx.moveTo(ann.lx - R*.6, ann.ly - R*.6); pmCtx.lineTo(ann.lx + R*.6, ann.ly + R*.6);
      pmCtx.moveTo(ann.lx + R*.6, ann.ly - R*.6); pmCtx.lineTo(ann.lx - R*.6, ann.ly + R*.6);
      pmCtx.stroke();
      if (selected) {
        const GR = 7 / Math.max(z, 0.005);
        pmCtx.beginPath(); pmCtx.arc(ann.lx, ann.ly, GR, 0, Math.PI*2);
        pmCtx.fillStyle = '#ff4040'; pmCtx.fill();
      }
      pmCtx.restore();
      return;
    }
    if (vis === 'hidden') return;
    const S          = _getMachScale(asset, ann);
    if (vis === 'translucent') pmCtx.save(), pmCtx.globalAlpha = 0.4;
    
    const strokeS    = S * Math.max(z, 0.05);
    const isElev     = asset.division === 'elevation';
    const behavior   = asset.behavior || 'static';
    const fillColor  = ann.color || '#CCFF99';
    const cx = ann.lx, cy = ann.ly;
    const rotation   = isElev ? 0 : (ann.rotation || 0);
    const DASH = val => [val, val];

    _ensureParsedSvg(asset);

    pmCtx.save();
    pmCtx.translate(cx, cy);
    if (isElev && ann.flipped) pmCtx.scale(-1, 1);
    pmCtx.rotate(rotation);
    pmCtx.scale(S, S);

    const renderStatic = (isFill) => {
      if (isFill) {
        _drawParsedFills(pmCtx, asset._parsed.lower, '#888888', strokeS);
        _drawParsedFills(pmCtx, asset._parsed.color, fillColor, strokeS);
      } else {
        _drawParsedStrokes(pmCtx, asset._parsed.lower, strokeS);
        _drawParsedStrokes(pmCtx, asset._parsed.color, strokeS);
      }
    };

    const renderRotate = (isFill) => {
      if (isFill) {
        _drawParsedFills(pmCtx, asset._parsed.lower, '#888888', strokeS);
        _drawParsedFills(pmCtx, asset._parsed.color, fillColor, strokeS);
      } else {
        _drawParsedStrokes(pmCtx, asset._parsed.lower, strokeS);
        _drawParsedStrokes(pmCtx, asset._parsed.color, strokeS);
      }
      pmCtx.save();
      pmCtx.rotate(ann.upperRotation || 0);
      if (isFill) _drawParsedFills(pmCtx, asset._parsed.upper, fillColor, strokeS);
      else        _drawParsedStrokes(pmCtx, asset._parsed.upper, strokeS);
      pmCtx.restore();
    };

    const renderArray = (isFill) => {
      const pitch = asset.array_pitch_m || asset.grip_blue_x || 2;
      const total = (ann.arrayN || 0) + 1;
      if (isFill) {
        _drawParsedFills(pmCtx, asset._parsed.lower, '#888888', strokeS);
        _drawParsedFills(pmCtx, asset._parsed.color, fillColor, strokeS);
      } else {
        _drawParsedStrokes(pmCtx, asset._parsed.lower, strokeS);
        _drawParsedStrokes(pmCtx, asset._parsed.color, strokeS);
      }
      for (let i = 0; i < total; i++) {
        pmCtx.save(); pmCtx.translate(i * pitch, 0);
        if (isFill) _drawParsedFills(pmCtx, asset._parsed.upper, fillColor, strokeS);
        else        _drawParsedStrokes(pmCtx, asset._parsed.upper, strokeS);
        pmCtx.restore();
      }
      if (!isFill && !_pmExporting) {
        for (let i = 0; i < ann.arrayN; i++) {
          pmCtx.save();
          pmCtx.strokeStyle = '#ffcc00'; pmCtx.lineWidth = 0.3 / strokeS;
          pmCtx.setLineDash(DASH(0.3 / strokeS));
          pmCtx.beginPath();
          pmCtx.moveTo(i * pitch, 0); pmCtx.lineTo((i + 1) * pitch, 0);
          pmCtx.stroke(); pmCtx.setLineDash([]); pmCtx.restore();
        }
      }
    };

    const renderArrayY = (isFill) => {
      const pitch = asset.array_pitch_y_m || 2;
      const total = (ann.arrayN || 0) + 1;
      if (isFill) {
        _drawParsedFills(pmCtx, asset._parsed.lower, '#888888', strokeS);
        _drawParsedFills(pmCtx, asset._parsed.color, fillColor, strokeS);
      } else {
        _drawParsedStrokes(pmCtx, asset._parsed.lower, strokeS);
        _drawParsedStrokes(pmCtx, asset._parsed.color, strokeS);
      }
      for (let i = 0; i < total; i++) {
        pmCtx.save(); pmCtx.translate(0, -i * pitch);
        if (isFill) _drawParsedFills(pmCtx, asset._parsed.upper, fillColor, strokeS);
        else        _drawParsedStrokes(pmCtx, asset._parsed.upper, strokeS);
        pmCtx.restore();
      }
    };

    const renderArrayXY = (isFill) => {
      const pX = asset.array_pitch_x_m || 2, pY = asset.array_pitch_y_m || 2;
      const tX = (ann.arrayNX || 0) + 1, tY = (ann.arrayNY || 0) + 1;

      if (isElev) {
        for (let i = 0; i < tX; i++) {
          pmCtx.save(); pmCtx.translate(i * pX, 0);
          if (isFill) {
            _drawParsedFills(pmCtx, asset._parsed.lower, '#888888', strokeS);
            _drawParsedFills(pmCtx, asset._parsed.color, fillColor, strokeS);
          } else {
            _drawParsedStrokes(pmCtx, asset._parsed.lower, strokeS);
            _drawParsedStrokes(pmCtx, asset._parsed.color, strokeS);
          }
          for (let j = 0; j < tY; j++) {
            pmCtx.save(); pmCtx.translate(0, -j * pY);
            if (isFill) _drawParsedFills(pmCtx, asset._parsed.upper, fillColor, strokeS);
            else        _drawParsedStrokes(pmCtx, asset._parsed.upper, strokeS);
            pmCtx.restore();
          }
          pmCtx.restore();
        }
        if (!isFill && !_pmExporting) {
          for (let i = 0; i < ann.arrayNX; i++) {
            pmCtx.save(); pmCtx.strokeStyle='#ffcc00'; pmCtx.lineWidth=0.3/strokeS;
            pmCtx.setLineDash(DASH(0.3/strokeS));
            pmCtx.beginPath(); pmCtx.moveTo(i*pX,0); pmCtx.lineTo((i+1)*pX,0);
            pmCtx.stroke(); pmCtx.setLineDash([]); pmCtx.restore();
          }
          for (let i = 0; i < tX; i++) {
            for (let j = 0; j < ann.arrayNY; j++) {
              pmCtx.save(); pmCtx.strokeStyle='#ffcc00'; pmCtx.lineWidth=0.3/strokeS;
              pmCtx.setLineDash(DASH(0.3/strokeS));
              pmCtx.beginPath(); pmCtx.moveTo(i*pX,-j*pY); pmCtx.lineTo(i*pX,-(j+1)*pY);
              pmCtx.stroke(); pmCtx.setLineDash([]); pmCtx.restore();
            }
          }
        }
      } else {
        for (let j = 0; j < tY; j++) {
          for (let i = 0; i < tX; i++) {
            pmCtx.save(); pmCtx.translate(i * pX, -j * pY);
            if (isFill) {
              _drawParsedFills(pmCtx, asset._parsed.lower, '#888888', strokeS);
              _drawParsedFills(pmCtx, asset._parsed.color, fillColor, strokeS);
              _drawParsedFills(pmCtx, asset._parsed.upper, fillColor, strokeS);
            } else {
              _drawParsedStrokes(pmCtx, asset._parsed.lower, strokeS);
              _drawParsedStrokes(pmCtx, asset._parsed.color, strokeS);
              _drawParsedStrokes(pmCtx, asset._parsed.upper, strokeS);
            }
            pmCtx.restore();
          }
        }
        if (!isFill && !_pmExporting) {
          for (let j = 0; j < tY; j++) {
            for (let i = 0; i < ann.arrayNX; i++) {
              pmCtx.save(); pmCtx.strokeStyle='#ffcc00'; pmCtx.lineWidth=0.3/strokeS;
              pmCtx.setLineDash(DASH(0.3/strokeS));
              pmCtx.beginPath(); pmCtx.moveTo(i*pX,-j*pY); pmCtx.lineTo((i+1)*pX,-j*pY);
              pmCtx.stroke(); pmCtx.setLineDash([]); pmCtx.restore();
            }
          }
          for (let i = 0; i < tX; i++) {
            for (let j = 0; j < ann.arrayNY; j++) {
              pmCtx.save(); pmCtx.strokeStyle='#ffcc00'; pmCtx.lineWidth=0.3/strokeS;
              pmCtx.setLineDash(DASH(0.3/strokeS));
              pmCtx.beginPath(); pmCtx.moveTo(i*pX,-j*pY); pmCtx.lineTo(i*pX,-(j+1)*pY);
              pmCtx.stroke(); pmCtx.setLineDash([]); pmCtx.restore();
            }
          }
        }
      }
    };

    if (selected) pmCtx.globalAlpha = _selectBlinkAlpha();
    if      (behavior === 'rotate')   renderRotate(true);
    else if (behavior === 'array')    renderArray(true);
    else if (behavior === 'array_y')  renderArrayY(true);
    else if (behavior === 'array_xy') renderArrayXY(true);
    else                               renderStatic(true);

    if      (behavior === 'rotate')   renderRotate(false);
    else if (behavior === 'array')    renderArray(false);
    else if (behavior === 'array_y')  renderArrayY(false);
    else if (behavior === 'array_xy') renderArrayXY(false);
    else                               renderStatic(false);

    pmCtx.restore(); 
    if (vis === 'translucent') pmCtx.restore(); 

    if (!selected && !isHover) return;
    
    const GR = 7 / Math.max(z, 0.005); 
    const LW = 1.5 / Math.max(z, 0.005);
    const DW = 1   / Math.max(z, 0.005);

    function _grip(gx, gy, color, alpha = 1.0) {
      pmCtx.save();
      pmCtx.globalAlpha = alpha;
      pmCtx.beginPath(); pmCtx.arc(gx, gy, GR, 0, Math.PI * 2);
      pmCtx.fillStyle = color; pmCtx.fill();
      pmCtx.strokeStyle = '#fff'; pmCtx.lineWidth = LW; pmCtx.stroke();
      pmCtx.restore();
    }
    function _guideLine(x1, y1, x2, y2, color) {
      pmCtx.save(); pmCtx.setLineDash([4/Math.max(z,.005), 4/Math.max(z,.005)]);
      pmCtx.strokeStyle = color; pmCtx.lineWidth = DW;
      pmCtx.beginPath(); pmCtx.moveTo(x1,y1); pmCtx.lineTo(x2,y2); pmCtx.stroke();
      pmCtx.setLineDash([]); pmCtx.restore();
    }

    if (!_pmExporting) {
      const redAlpha = selected ? 1.0 : 0.6;
      _grip(cx, cy, '#ff4040', redAlpha);
    }

    if (!selected) return;

    if (isElev) {
      const dir = ann.flipped ? -1 : 1;
      const fGx = cx + dir * (asset.real_width_m || 2) * S * 0.5;
      _guideLine(cx, cy, fGx, cy, 'rgba(232,160,32,.5)');
      _grip(fGx, cy, '#e8a020');
    } else {
      const oDist = _getOrangeDist(asset) * S;
      const oGx = cx + oDist * Math.cos(rotation);
      const oGy = cy + oDist * Math.sin(rotation);
      _guideLine(cx, cy, oGx, oGy, 'rgba(232,160,32,.5)');
      _grip(oGx, oGy, '#e8a020');
    }

    if (behavior !== 'static') {
      const bPos = _getBlueGripPos(asset, ann, S);
      if (bPos) {
        _guideLine(cx, cy, bPos.x, bPos.y, 'rgba(33,150,243,.5)');
        _grip(bPos.x, bPos.y, '#2196f3');
      }
    }
  }

  function drawArrow(ann, selected, isHover) {
    const vis = ann.visibility || 'visible';
    if (vis === 'hidden') return;
    const s=l2c(ann.x1,ann.y1), t=l2c(ann.x2,ann.y2);
    const lw    = ARROW_LW[ann.sizeStep??1] * getPaperScale(); 
    const color = ann.color||'#ff4081';
    const dir   = ann.arrowDir || 'fwd'; 
    pmCtx.save();
    if (vis === 'translucent') pmCtx.globalAlpha = 0.4;
    if (selected) {
      pmCtx.globalAlpha = _selectBlinkAlpha();
    }
    if (dir === 'rev') {
      drawArrowRaw(t.cx,t.cy,s.cx,s.cy,color,lw,false,lw);
    } else if (dir === 'both') {
      drawArrowRaw(s.cx,s.cy,t.cx,t.cy,color,lw,false,lw,true);       
      drawArrowRaw(t.cx,t.cy,s.cx,s.cy,color,lw,false,lw,true,true);  
    } else {
      drawArrowRaw(s.cx,s.cy,t.cx,t.cy,color,lw,false,lw);
    }
    pmCtx.restore();
  }

  function drawLine(ann, selected, isHover) {
    const vis = ann.visibility || 'visible';
    if (vis === 'hidden') return;
    const s=l2c(ann.x1,ann.y1), t=l2c(ann.x2,ann.y2);
    const lw    = LINE_LW[ann.sizeStep??1] * getPaperScale(); 
    const color = ann.color||'#111111';
    const lineStyle = ann.lineStyle || 'solid';
    pmCtx.save();
    if (vis === 'translucent') pmCtx.globalAlpha = 0.4;
    if (selected) {
      pmCtx.globalAlpha = _selectBlinkAlpha();
    }
    pmCtx.strokeStyle = color;
    pmCtx.lineWidth = lw;
    pmCtx.lineCap = (lineStyle === 'solid') ? 'round' : 'butt';
    if      (lineStyle === 'dashA') pmCtx.setLineDash([lw*3.5, lw*2]);            
    else if (lineStyle === 'dashB') pmCtx.setLineDash([lw*7, lw*2]);              
    else if (lineStyle === 'dashC') pmCtx.setLineDash([lw*8, lw*1.5, lw*1.5, lw*1.5]); 
    pmCtx.beginPath();
    pmCtx.moveTo(s.cx, s.cy);
    pmCtx.lineTo(t.cx, t.cy);
    pmCtx.stroke();
    pmCtx.setLineDash([]);
    pmCtx.restore();
  }

  function drawCircle(ann, selected, isHover) {
    const vis = ann.visibility || 'visible';
    if (vis === 'hidden') return;
    const c  = l2c(ann.cx, ann.cy);
    const lw = LINE_LW[ann.sizeStep??1] * getPaperScale(); 
    const color = ann.color || '#111111';
    const lineStyle = ann.lineStyle || 'solid';
    pmCtx.save();
    if (vis === 'translucent') pmCtx.globalAlpha = 0.4;
    if (selected) pmCtx.globalAlpha = _selectBlinkAlpha();
    pmCtx.strokeStyle = color;
    pmCtx.lineWidth = lw;
    if      (lineStyle === 'dashA') pmCtx.setLineDash([lw*3.5, lw*2]);
    else if (lineStyle === 'dashB') pmCtx.setLineDash([lw*7, lw*2]);
    else if (lineStyle === 'dashC') pmCtx.setLineDash([lw*8, lw*1.5, lw*1.5, lw*1.5]);
    pmCtx.beginPath();
    pmCtx.arc(c.cx, c.cy, Math.max(0,ann.r||0), 0, Math.PI*2);
    pmCtx.stroke();
    pmCtx.setLineDash([]);
    pmCtx.restore();
  }


  function drawArrowRaw(x1,y1,x2,y2,color,lw,dashed,hwLw,trimStart,skipShaft) {
    const angle  = Math.atan2(y2-y1,x2-x1);
    const hw     = Math.max(21, hwLw*3.3); 
    const hwA    = 0.52;
    const stopX  = x2 - hw * Math.cos(angle);
    const stopY  = y2 - hw * Math.sin(angle);
    const startX = trimStart ? (x1 + hw * Math.cos(angle)) : x1;
    const startY = trimStart ? (y1 + hw * Math.sin(angle)) : y1;
    pmCtx.save();
    pmCtx.strokeStyle=color; pmCtx.fillStyle=color;
    pmCtx.lineWidth=lw; pmCtx.lineCap='square'; pmCtx.lineJoin='miter';
    if (!skipShaft) {
      if (dashed) pmCtx.setLineDash([6, 4]);
      pmCtx.beginPath(); pmCtx.moveTo(startX,startY); pmCtx.lineTo(stopX,stopY); pmCtx.stroke();
      pmCtx.setLineDash([]);
    }
    pmCtx.beginPath();
    pmCtx.moveTo(x2,y2);
    pmCtx.lineTo(x2-hw*Math.cos(angle-hwA), y2-hw*Math.sin(angle-hwA));
    pmCtx.lineTo(x2-hw*Math.cos(angle+hwA), y2-hw*Math.sin(angle+hwA));
    pmCtx.closePath(); pmCtx.fill();
    pmCtx.restore();
  }

  function drawText(ann, selected, isHover) {
    const vis = ann.visibility || 'edge-primary';
    const pScale = getPaperScale();
    const fs = TEXT_FS[ann.sizeStep ?? 1] * pScale; 
    pmCtx.font = `bold ${fs}px "Segoe UI","Yu Gothic",sans-serif`;
    const tw = pmCtx.measureText(ann.text||'').width;
    ann._twPx = tw;
    ann._fsPx = fs;
    if (vis === 'hidden') return;

    const {cx, cy} = l2c(ann.lx + tw/2, ann.ly);
    const rotation  = ann.rotation || 0;
    const {zoom:tz} = getState();
    const textColor = ann.color || '#ffffff';
    const isBlack = (textColor === '#111111' || textColor === '#000000');
    const mojiWaku = ann.mojiWaku || 0; 
    let outlineColor;
    if (vis === 'edge-secondary') {
      outlineColor = 'rgba(128,128,128,.9)'; 
    } else if (mojiWaku === 2) {
      outlineColor = isBlack ? 'rgba(0,0,0,.9)' : 'rgba(255,255,255,.9)';
    } else { 
      outlineColor = isBlack ? 'rgba(255,255,255,.9)' : 'rgba(0,0,0,.9)';
    }

    pmCtx.save();
    if (vis === 'edge-secondary') pmCtx.globalAlpha = 0.5; 

    pmCtx.save();
    pmCtx.translate(cx, cy);
    pmCtx.rotate(rotation);

    if (selected) {
      pmCtx.globalAlpha = _selectBlinkAlpha();
    }

    pmCtx.font          = `bold ${fs}px "Segoe UI","Yu Gothic",sans-serif`;
    pmCtx.textBaseline  = 'middle';
    pmCtx.textAlign     = 'left';
    pmCtx.fillStyle     = textColor;
    if (mojiWaku !== 1) { 
      pmCtx.lineWidth   = fs * 0.08;
      pmCtx.strokeStyle = outlineColor;
      pmCtx.strokeText(ann.text, -tw/2, 0);
    }
    pmCtx.fillText(ann.text, -tw/2, 0);

    if (selected || isHover) {
      pmCtx.save();
      pmCtx.globalAlpha = selected ? 1.0 : 0.6; 
      pmCtx.beginPath();
      pmCtx.arc(0, 0, 5/Math.max(tz,0.005), 0, Math.PI*2);
      pmCtx.fillStyle   = 'rgba(255,255,255,.9)';
      pmCtx.fill();
      pmCtx.strokeStyle = textColor;
      pmCtx.lineWidth   = 2/Math.max(tz,0.005);
      pmCtx.stroke();
      pmCtx.restore();
    }

    if (selected) {
      pmCtx.globalAlpha = 1;
      const rg = tw/2 + 18/Math.max(tz,0.005); 
      pmCtx.setLineDash([3/Math.max(tz,0.005), 3/Math.max(tz,0.005)]);
      pmCtx.beginPath();
      pmCtx.moveTo(tw/2, 0); pmCtx.lineTo(rg - 6/Math.max(tz,0.005), 0);
      pmCtx.strokeStyle = 'rgba(232,160,32,.6)';
      pmCtx.lineWidth   = 1.5/Math.max(tz,0.005);
      pmCtx.stroke();
      pmCtx.setLineDash([]);
      pmCtx.beginPath();
      pmCtx.arc(rg, 0, 6/Math.max(tz,0.005), 0, Math.PI*2);
      pmCtx.fillStyle   = 'rgba(232,160,32,.9)';
      pmCtx.fill();
      pmCtx.strokeStyle = '#fff';
      pmCtx.lineWidth   = 1.5/Math.max(tz,0.005);
      pmCtx.stroke();
    }
    pmCtx.restore(); 
    pmCtx.restore(); 
  }

  function _pmConfirm(msg, onYes, onNo) {
    let d = document.getElementById('_pmConfirm');
    if (!d) {
      d = document.createElement('div');
      d.id = '_pmConfirm';
      d.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99900;display:flex;align-items:center;justify-content:center;';
      document.body.appendChild(d);
    }
    d.innerHTML = `<div style="background:#182a1c;border:1px solid #4caf50;border-radius:10px;padding:28px 32px;min-width:320px;text-align:center;">`
      + `<p style="color:#d8ecd8;font-size:.97em;white-space:pre-wrap;margin:0 0 20px">${msg}</p>`
      + `<div style="display:flex;gap:12px;justify-content:center;">`
      + `<button id="_pc_no" style="padding:8px 28px;background:#333;border:1px solid #666;color:#CACACA;border-radius:6px;cursor:pointer">キャンセル</button>`
      + `<button id="_pc_yes" style="padding:8px 28px;background:#1b5e20;border:1px solid #4caf50;color:#fff;border-radius:6px;cursor:pointer">OK</button>`
      + `</div></div>`;
    d.style.display = 'flex';
    document.getElementById('_pc_yes').onclick = () => { d.style.display = 'none'; if (onYes) onYes(); };
    document.getElementById('_pc_no').onclick  = () => { d.style.display = 'none'; if (onNo) onNo(); };
  }

  function doPdfExport() {
    if (!window.jspdf) { _toast('⚠ jsPDFが読み込まれていません'); return; }
    document.getElementById('pm-pdf-dialog')?.remove();

    const dlg = document.createElement('div');
    dlg.id = 'pm-pdf-dialog';
    dlg.style.cssText = `
      position:fixed;inset:0;z-index:99900;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,.6);`;

    const stepRows = [0,1,2,3,4].map(s => {
      const cnt = steps[s].length;
      const col = cnt > 0 ? '#81c784' : '#555';
      return `<label style="display:flex;align-items:center;gap:8px;padding:5px 4px;
        cursor:${cnt>0?'pointer':'default'};border-radius:4px;text-align:left;">
        <input type="checkbox" data-step="${s}" ${cnt>0?'checked':''} ${cnt===0?'disabled':''}
          style="width:15px;height:15px;accent-color:#4caf50;">
        <span style="color:${col};font-size:.82em;">STEP ${s+1}
          <span style="color:#555;font-size:.85em;">(${cnt}件)</span></span>
      </label>`;
    }).join('');

    dlg.innerHTML = `
      <div style="background:#182a1c;border:1px solid #4caf50;border-radius:10px;
        padding:28px 32px;min-width:320px;box-shadow:0 4px 24px rgba(0,0,0,.7);text-align:center;">
        <div style="font-size:.88em;color:#81c784;font-weight:bold;margin-bottom:12px;">
          🖨️ 何ページを印刷しますか？</div>
        <div style="font-size:.72em;color:#CACACA;margin-bottom:8px;">※ 面積ページは含みません</div>
        <div style="display:flex;flex-direction:column;gap:2px;margin-bottom:20px;">${stepRows}</div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button id="pm-pdf-cancel" style="padding:8px 28px;font-size:.85em;border-radius:6px;
            background:#333;border:1px solid #666;color:#CACACA;cursor:pointer;">キャンセル</button>
          <button id="pm-pdf-ok" style="padding:8px 28px;font-size:.85em;border-radius:6px;
            background:#1b5e20;border:1px solid #4caf50;
            color:#fff;cursor:pointer;font-weight:bold;">📐 印刷範囲を選択</button>
        </div>
      </div>`;
    document.body.appendChild(dlg);

    document.getElementById('pm-pdf-cancel').onclick = () => dlg.remove();
    document.getElementById('pm-pdf-ok').onclick = () => {
      const selected = [...dlg.querySelectorAll('input[type=checkbox]:checked')]
        .map(cb => Number(cb.dataset.step));
      dlg.remove();
      if (selected.length === 0) { _toast('⚠ STEPが選択されていません'); return; }
      pmStartRangeSelect(selected);
    };
  }

  function pmStartRangeSelect(selectedSteps) {
    const ov = document.createElement('div');
    ov.id = 'pm-range-ov';
    ov.style.cssText = `position:fixed;inset:0;z-index:9992;cursor:crosshair;
      background:rgba(0,0,0,.38);pointer-events:auto;`;
    document.body.appendChild(ov);

    _toast('🖨 出力範囲を指定してください\n（右クリック/Escでキャンセル）', 4000);

    const pdfCvEl = document.getElementById('pdf-cv');
    const defW = (typeof _origPdfW !== 'undefined' && _origPdfW) || pdfCvEl.width;
    const defH = (typeof _origPdfH !== 'undefined' && _origPdfH) || pdfCvEl.height;
    const cpad = typeof _CPAD !== 'undefined' ? _CPAD : 1200;
    const dv   = document.getElementById('draw-cv');
    const cvWrapEl = document.getElementById('cv-wrap');
    let rangeMag = 1;
    let refPoint = 'bl'; 
    let orient = (defW>defH) ? 'landscape' : 'portrait'; 

    const rb = document.createElement('div');
    rb.style.cssText = `position:fixed;border:2px solid #4caf50;
      pointer-events:none;display:none;background:rgba(76,175,80,.08);z-index:9993;`;
    document.body.appendChild(rb);

    const magPanel = document.createElement('div');
    magPanel.id = 'pm-range-mag-panel';
    magPanel.style.cssText = `position:fixed;left:16px;top:50%;transform:translateY(-50%);
      z-index:9994;background:rgba(20,32,22,.92);border:1px solid #4caf50;border-radius:8px;
      padding:12px 10px;display:flex;flex-direction:column;gap:12px;width:118px;
      box-shadow:0 2px 12px rgba(0,0,0,.5);`;
    magPanel.innerHTML = `
      <div>
        <div style="color:#d8ecd8;font-size:.68em;text-align:center;margin-bottom:6px;white-space:nowrap;">出力倍率</div>
        <input type="range" id="pm-mag-slider" min="1" max="5" step="1" value="1" style="width:100%;accent-color:#4caf50;cursor:pointer;">
        <div style="display:flex;justify-content:space-between;font-size:.6em;color:#9c9;margin-top:3px;">
          <span>標準</span><span>MAX</span>
        </div>
      </div>
      <div style="border-top:1px solid #2a3a2a;padding-top:10px;">
        <div style="color:#d8ecd8;font-size:.68em;text-align:center;margin-bottom:6px;line-height:1.4;">
          図形の<br>線の太さ: <span id="pm-lw-lbl">中間</span>
        </div>
        <input type="range" id="pm-lw-slider" min="1" max="3" step="1" value="${pmLineWeightLevel}" style="width:100%;accent-color:#4caf50;cursor:pointer;">
        <div style="display:flex;justify-content:space-between;font-size:.6em;color:#9c9;margin-top:3px;">
          <span>細い</span><span>太い</span>
        </div>
      </div>
      <div style="border-top:1px solid #2a3a2a;padding-top:10px;">
        <div style="color:#d8ecd8;font-size:.68em;text-align:center;margin-bottom:6px;white-space:nowrap;">印刷方向</div>
        <div style="display:flex;gap:4px;">
          <button class="pm-orient-btn" data-orient="portrait"  style="flex:1;padding:5px 2px;font-size:.72em;">📄 縦</button>
          <button class="pm-orient-btn" data-orient="landscape" style="flex:1;padding:5px 2px;font-size:.72em;">📄 横</button>
        </div>
      </div>
      <div style="border-top:1px solid #2a3a2a;padding-top:10px;">
        <div style="color:#d8ecd8;font-size:.68em;text-align:center;margin-bottom:6px;white-space:nowrap;">基準点</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,24px);gap:3px;box-sizing:border-box;">
          <button class="pm-ref-btn" data-ref="tl"     style="grid-column:1;grid-row:1;box-sizing:border-box;">↖</button>
          <button class="pm-ref-btn" data-ref="tr"     style="grid-column:3;grid-row:1;box-sizing:border-box;">↗</button>
          <button class="pm-ref-btn" data-ref="center" style="grid-column:2;grid-row:2;box-sizing:border-box;">◆</button>
          <button class="pm-ref-btn" data-ref="bl"     style="grid-column:1;grid-row:3;box-sizing:border-box;">↙</button>
          <button class="pm-ref-btn" data-ref="br"     style="grid-column:3;grid-row:3;box-sizing:border-box;">↘</button>
        </div>
      </div>`;
    function _paintOrientBtns() {
      magPanel.querySelectorAll('.pm-orient-btn').forEach(b=>{
        const active = b.dataset.orient===orient;
        b.style.cssText += `border-radius:5px;cursor:pointer;box-sizing:border-box;
          background:${active?'#1b5e20':'#22301f'};border:1px solid ${active?'#4caf50':'#3a4a3a'};
          color:${active?'#fff':'#aaa'};`;
      });
    }
    _paintOrientBtns();
    magPanel.querySelectorAll('.pm-orient-btn').forEach(b=>{
      b.onclick = () => { orient = b.dataset.orient; _paintOrientBtns(); redrawFromLastMouse(); };
    });
    magPanel.querySelectorAll('.pm-ref-btn').forEach(b=>{
      b.style.cssText += `box-sizing:border-box;width:100%;height:100%;margin:0;padding:0;
        font-size:.8em;line-height:1;border-radius:4px;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        background:${b.dataset.ref==='bl'?'#1b5e20':'#22301f'};
        border:1px solid ${b.dataset.ref==='bl'?'#4caf50':'#3a4a3a'};
        color:${b.dataset.ref==='bl'?'#fff':'#aaa'};`;
    });
    document.body.appendChild(magPanel);

    let lastMouseCX = null, lastMouseCY = null;

    function cvToScreen(lx, ly) {
      const { zoom } = getState();
      const r = pdfCvEl.getBoundingClientRect();
      return { sx: r.left + lx * zoom, sy: r.top + ly * zoom };
    }
    const _snapMarkerEls = [];
    let _snapActiveIdx = -1;
    function renderSnapMarkers() {
      if (typeof window._pdfCornerSnapPoints !== 'function') return;
      const pts = window._pdfCornerSnapPoints();
      pts.forEach((p, i) => {
        let m = _snapMarkerEls[i];
        if (!m) {
          m = document.createElement('div');
          m.style.cssText = 'position:fixed;width:14px;height:14px;margin-left:-7px;margin-top:-7px;'
            + 'border-radius:50%;border:2px solid #00e5ff;background:rgba(0,229,255,.15);'
            + 'pointer-events:none;z-index:9995;transition:background .1s,transform .1s;';
          ov.appendChild(m);
          _snapMarkerEls[i] = m;
        }
        const s = cvToScreen(p.x, p.y);
        m.style.left = s.sx + 'px'; m.style.top = s.sy + 'px';
        const active = (i === _snapActiveIdx);
        m.style.background = active ? 'rgba(0,229,255,.75)' : 'rgba(0,229,255,.15)';
        m.style.transform = active ? 'scale(1.5)' : 'scale(1)';
      });
    }
    function applySnap(lx, ly) {
      if (typeof window._pdfCornerSnapPoints !== 'function') return { x:lx, y:ly };
      const { zoom } = getState();
      const SNAP_PX = 14;
      const pts = window._pdfCornerSnapPoints();
      const thresh = SNAP_PX / zoom;
      let best = null, bestIdx = -1, bestD = thresh;
      pts.forEach((p, i) => {
        const d = Math.hypot(lx - p.x, ly - p.y);
        if (d < bestD) { bestD = d; best = p; bestIdx = i; }
      });
      _snapActiveIdx = bestIdx;
      renderSnapMarkers();
      return best ? { x: best.x, y: best.y } : { x: lx, y: ly };
    }
    function drawRangeBox(x1, y1, x2, y2) {
      const s1 = cvToScreen(x1, y1), s2 = cvToScreen(x2, y2);
      rb.style.left   = Math.min(s1.sx, s2.sx) + 'px';
      rb.style.top    = Math.min(s1.sy, s2.sy) + 'px';
      rb.style.width  = Math.abs(s2.sx - s1.sx) + 'px';
      rb.style.height = Math.abs(s2.sy - s1.sy) + 'px';
      rb.style.display = 'block';
    }
    function computeRect(lx, ly, ew, eh) {
      switch (refPoint) {
        case 'tr':     return { x1:lx-ew, y1:ly,    x2:lx,    y2:ly+eh };
        case 'bl':     return { x1:lx,    y1:ly-eh, x2:lx+ew, y2:ly };
        case 'br':     return { x1:lx-ew, y1:ly-eh, x2:lx,    y2:ly };
        case 'center': return { x1:lx-ew/2,y1:ly-eh/2,x2:lx+ew/2,y2:ly+eh/2 };
        default:       return { x1:lx,    y1:ly,    x2:lx+ew, y2:ly+eh }; 
      }
    }
    function currentEwEh() {
      const k = 1/Math.sqrt(rangeMag);
      let ew = defW*k, eh = defH*k;
      const wantLandscape = orient === 'landscape';
      const isLandscapeNow = ew > eh;
      if (wantLandscape !== isLandscapeNow) { const t = ew; ew = eh; eh = t; }
      return { ew, eh };
    }
    function redrawFromLastMouse() {
      if (lastMouseCX == null) return;
      let { lx, ly } = getLogical({ clientX:lastMouseCX, clientY:lastMouseCY });
      ({ x:lx, y:ly } = applySnap(lx, ly)); 
      const { ew, eh } = currentEwEh();
      const rect = computeRect(lx, ly, ew, eh);
      if (rangeStart) rangeRect = rect;
      drawRangeBox(rect.x1, rect.y1, rect.x2, rect.y2);
    }
    function inCanvasView(e) {
      if (!cvWrapEl) return true;
      const r = cvWrapEl.getBoundingClientRect();
      return e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom;
    }

    const magSlider = magPanel.querySelector('#pm-mag-slider');
    magSlider.oninput = () => {
      rangeMag = Number(magSlider.value);
      redrawFromLastMouse();
    };
    const PM_LW_LABELS = {1:'細い', 2:'中間', 3:'太い'};
    const lwSlider = magPanel.querySelector('#pm-lw-slider');
    const lwLbl    = magPanel.querySelector('#pm-lw-lbl');
    lwLbl.textContent = PM_LW_LABELS[pmLineWeightLevel] || '中間';
    lwSlider.oninput = () => {
      pmLineWeightLevel = Number(lwSlider.value);
      lwLbl.textContent = PM_LW_LABELS[pmLineWeightLevel] || '中間';
    };
    magPanel.querySelectorAll('.pm-ref-btn').forEach(btn=>{
      btn.onclick = () => {
        refPoint = btn.dataset.ref;
        magPanel.querySelectorAll('.pm-ref-btn').forEach(b=>{
          const active = b===btn;
          b.style.background   = active?'#1b5e20':'#22301f';
          b.style.borderColor   = active?'#4caf50':'#3a4a3a';
          b.style.color         = active?'#fff':'#aaa';
        });
        redrawFromLastMouse();
      };
    });

    function onWheel(e) {
      e.preventDefault();
      if (cvWrapEl) {
        const evt = new WheelEvent('wheel', {
          deltaX:e.deltaX, deltaY:e.deltaY, deltaZ:e.deltaZ,
          clientX:e.clientX, clientY:e.clientY, bubbles:true, cancelable:true
        });
        cvWrapEl.dispatchEvent(evt);
      }
      redrawFromLastMouse();
    }
    ov.addEventListener('wheel', onWheel, { passive:false });

    let rangeStart = null, rangeRect = null, dragging = false;

    function cleanup() {
      ov.remove(); rb.remove(); magPanel.remove();
      ov.removeEventListener('wheel', onWheel);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('keydown', onKey, true);
    }
    function onKey(e) {
      if (e.key === 'Escape') { cleanup(); _toast('キャンセルしました'); }
    }
    document.addEventListener('keydown', onKey, true);
    ov.oncontextmenu = e => { e.preventDefault(); cleanup(); _toast('キャンセルしました'); };

    function onDown(e) {
      if (magPanel.contains(e.target)) return; 
      if (e.button === 1) {
        e.preventDefault();
        panning = true;
        const r = cvWrapEl.getBoundingClientRect();
        psx = (e.clientX - r.left) - ox; psy = (e.clientY - r.top) - oy;
        cvWrapEl.style.cursor = 'grabbing';
        return;
      }
      if (e.button === 2) { cleanup(); _toast('キャンセルしました'); return; }
      if (e.button !== 0) return;
      if (!inCanvasView(e)) return; 
      lastMouseCX = e.clientX; lastMouseCY = e.clientY;
      let { lx, ly } = getLogical(e);
      ({ x:lx, y:ly } = applySnap(lx, ly)); 
      const { ew, eh } = currentEwEh();
      rangeStart = { x: lx, y: ly };
      rangeRect  = computeRect(lx, ly, ew, eh);
      dragging = true;
    }
    function onMove(e) {
      if (magPanel.contains(e.target)) return;
      if (panning) { 
        if (typeof applyTrans === 'function') {
          const r = cvWrapEl.getBoundingClientRect();
          ox = (e.clientX - r.left) - psx; oy = (e.clientY - r.top) - psy;
          applyTrans();
        }
      }
      if (!inCanvasView(e)) return; 
      lastMouseCX = e.clientX; lastMouseCY = e.clientY;
      let { lx, ly } = getLogical(e);
      ({ x:lx, y:ly } = applySnap(lx, ly)); 
      const { ew, eh } = currentEwEh();
      const rect = computeRect(lx, ly, ew, eh);
      if (rangeStart) rangeRect = rect;
      drawRangeBox(rect.x1, rect.y1, rect.x2, rect.y2);
    }
    function onUp(e) {
      if (magPanel.contains(e.target)) return; 
      if (e.button === 1) { 
        panning = false; cvWrapEl.style.cursor = '';
        if (typeof redraw === 'function') redraw();
        return;
      }
      if (e.button !== 0 || !dragging) return;
      if (!inCanvasView(e)) return; 
      dragging = false;
      if (!rangeRect) {
        let { lx, ly } = getLogical(e);
        ({ x:lx, y:ly } = applySnap(lx, ly)); 
        const { ew, eh } = currentEwEh();
        rangeRect = computeRect(lx, ly, ew, eh);
      }
      const rc = rangeRect;
      cleanup();
      _pmConfirm('この範囲でPDFを出力しますか？', () => {
        const mnX = Math.max(0,        Math.round(Math.min(rc.x1, rc.x2) + cpad));
        const mnY = Math.max(0,        Math.round(Math.min(rc.y1, rc.y2) + cpad));
        const mxX = Math.min(dv.width, Math.round(Math.max(rc.x1, rc.x2) + cpad));
        const mxY = Math.min(dv.height,Math.round(Math.max(rc.y1, rc.y2) + cpad));
        pmDoExportPDF(selectedSteps, mnX, mnY, mxX, mxY);
      }, null);
    }
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }

  async function pmDoExportPDF(selectedSteps, mnX, mnY, mxX, mxY) {
    _toast('🖨 PDF生成中...', 4000);
    const {jsPDF} = window.jspdf;
    const cpad   = typeof _CPAD !== 'undefined' ? _CPAD : 1200;
    const cW = mxX - mnX, cH = mxY - mnY;
    if (cW <= 0 || cH <= 0) { _toast('⚠ 印刷範囲が無効です'); return; }

    const pdfCvEl  = document.getElementById('pdf-cv');
    const drawCvEl = document.getElementById('draw-cv');

    const isLand = cW > cH;
    const doc = new jsPDF({orientation:isLand?'landscape':'portrait', unit:'mm', format:'a3', compress:true});
    const mg=5, mmW=isLand?420:297, mmH=isLand?297:420;
    const usW=mmW-mg*2, usH=mmH-mg*2;
    const asp=cW/cH, pgA=usW/usH;
    let iW=usW, iH=usH;
    if (asp>pgA){iH=usW/asp;}else{iW=usH*asp;}
    const imgX=mg+(usW-iW)/2, imgY=mg+(usH-iH)/2;

    const savedStep  = currentStep;
    const savedUuids = new Set(selectedUuids);
    _pmExporting = true;

    try {
      for (let i=0; i<selectedSteps.length; i++) {
        if (i>0) doc.addPage('a3', isLand?'landscape':'portrait');
        const stepIdx = selectedSteps[i];

        currentStep = stepIdx;
        selectedUuids.clear();
        syncPmCv();
        renderPmLayer();

        const comp   = document.createElement('canvas');
        comp.width   = cW; comp.height = cH;
        const cctx   = comp.getContext('2d');
        cctx.fillStyle = '#ffffff';
        cctx.fillRect(0, 0, cW, cH);
        if (pdfCvEl && pdfCvEl.width>0) {
          cctx.filter = (typeof pdfGrayscale !== 'undefined' && pdfGrayscale) ? 'grayscale(1)' : 'none';
          cctx.drawImage(pdfCvEl,  mnX-cpad, mnY-cpad, cW, cH, 0, 0, cW, cH);
          cctx.filter = 'none';
        }
        cctx.drawImage(drawCvEl, mnX,      mnY,      cW, cH, 0, 0, cW, cH);
        cctx.drawImage(pmCv,     mnX,      mnY,      cW, cH, 0, 0, cW, cH);

        doc.setFontSize(11);
        doc.setTextColor(232, 160, 32);
        doc.text(`STEP ${stepIdx+1}  (${steps[stepIdx].length} annotations)`,
          imgX, imgY - 2);

        const imgData = comp.toDataURL('image/jpeg', 0.92);
        doc.addImage(imgData, 'JPEG', imgX, imgY, iW, iH);
      }

      const ts = typeof getTs==='function' ? getTs() : new Date().toISOString().slice(0,16).replace('T','_');
      doc.save(`Arecal_${ts.replace(/[: ]/g,'')}.pdf`); 
      _toast(`✅ PDF出力完了（${selectedSteps.length}ページ）`);

    } catch(err) {
      console.error('pmDoExportPDF error:', err);
      _toast('⚠ PDF生成中にエラーが発生しました');
    } finally {
      _pmExporting = false;
      currentStep = savedStep;
      selectedUuids.clear();
      savedUuids.forEach(u => selectedUuids.add(u));
      markPmDirty();
      document.getElementById('draw-cv').style.opacity = '0.5';
    }
  }

  const MACH_COLORS = ['#FFFFFF','#E6E6E6','#FFA6A6','#FFA6FF','#A6BFFF',
                       '#A6FFFF','#4DFF80','#CCFF99','#FFFF99','#FFE6A6'];
  const MACH_SIZES  = [1, 2, 3, 5, 10];

  function updatePlacedList() {
    const list=document.getElementById('pm-placed-list');
    if (!list) return;
    const _pmOldListRects = new Map();
    list.querySelectorAll('li[data-uuid]').forEach(li => {
      _pmOldListRects.set(li.dataset.uuid, li.getBoundingClientRect());
    });
    const copyArea = document.getElementById('pm-copy-area');
    const selCnt   = document.getElementById('pm-sel-count');
    if (copyArea) copyArea.style.display = selectedUuids.size > 0 ? 'block' : 'none';
    if (selCnt)   selCnt.textContent = selectedUuids.size;
    updateTabUI();
    if (steps[currentStep].length===0) {
      list.innerHTML=`<li style="color:#CACACA;text-align:center;padding:10px 0;">配置なし</li>`; return;
    }
    list.innerHTML = [...steps[currentStep]].reverse().map(ann => {
      const isSel = selectedUuids.has(ann.uuid);
      const liStyle = `
        display:flex;align-items:center;gap:4px;padding:4px 5px;
        border-radius:3px;overflow:hidden;cursor:pointer;
        background:${isSel?'rgba(76,175,80,.2)':'rgba(255,255,255,.04)'};
        border:1px solid ${isSel?'rgba(76,175,80,.8)':'transparent'};
        box-shadow:${isSel?'0 0 6px rgba(76,175,80,.4)':'none'};
        transition:background .15s;`;

      if (ann.type === 'machinery') {
        const col     = ann.color || '#CCFF99';
        const curSz   = ann.sizeMultiplier || 1;
        const szLabel = curSz === 1 ? '×1' : `×${curSz}`;
        const vis     = ann.visibility || 'visible';
        const [visIcon, visCol] = vis==='hidden'?['✕','#f55']:vis==='translucent'?['◑','#e8a020']:['●','#4c4'];
        const asset    = machineryData[ann.assetId];
        const hasHatch = !!(asset && (
          (asset.color_svg && asset.color_svg.trim()) ||
          (asset.upper_svg && asset.upper_svg.trim())
        ));
        const colorCell = hasHatch
          ? `<span class="pm-color-dot" data-uuid="${ann.uuid}"
              style="width:11px;height:11px;border-radius:50%;flex-shrink:0;cursor:pointer;
                     background:${col};border:1px solid rgba(255,255,255,.3);
                     opacity:${vis==='hidden'?'0.3':'1'}"></span>`
          : `<span class="pm-color-none" data-uuid="${ann.uuid}"
              title="この図形はハッチングが無いため色を変更できません"
              style="width:11px;height:11px;border-radius:50%;flex-shrink:0;
                     display:flex;align-items:center;justify-content:center;
                     background:#2a2a2a;border:1px solid #555;color:#CACACA;
                     font-size:.65em;line-height:1;cursor:default;
                     opacity:${vis==='hidden'?'0.3':'1'}">×</span>`;
        return `
          <li data-uuid="${ann.uuid}" style="${liStyle}">
            <button class="pm-vis-btn" data-uuid="${ann.uuid}"
              style="flex-shrink:0;background:none;border:none;cursor:pointer;
                     font-size:.8em;padding:0 2px;color:${visCol};"
              title="表示 → 半透明 → 非表示">${visIcon}</button>
            ${colorCell}
            <span class="pm-ann-label" data-uuid="${ann.uuid}"
              style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
                     color:${vis==='hidden'?'#444':'#bbb'};font-size:.82em;"
              title="${ann.name}">${ann.name}</span>
            <span class="pm-mach-sz" data-uuid="${ann.uuid}"
              style="font-size:.68em;color:#4caf50;cursor:pointer;flex-shrink:0;
                     padding:1px 4px;border:1px solid #444;border-radius:3px;"
              title="サイズ変更">${szLabel}</span>
            <button class="pm-del-btn" data-uuid="${ann.uuid}"
              style="background:rgba(200,80,80,.15);border:1px solid #c04040;border-radius:3px;
                     color:#f88;cursor:pointer;padding:1px 5px;font-size:.72em;flex-shrink:0;">✕</button>
          </li>`;
      }
      const vis   = ann.visibility || (ann.type==='text' ? 'edge-primary' : 'visible');
      const col   = ann.color||(ann.type==='text'?'#ffffff':'#ff4081');
      const step  = ann.sizeStep ?? 1; 
      let visIcon, visCol;
      if (ann.type === 'text') {
        visIcon = vis==='hidden' ? '✕' : vis==='edge-secondary' ? 'A̲' : 'A';
        visCol  = vis==='hidden' ? '#f55' : vis==='edge-secondary' ? '#e8a020' : '#4c4';
      } else {
        visIcon = vis==='hidden' ? '✕' : vis==='translucent' ? '◑' : '●';
        visCol  = vis==='hidden' ? '#f55' : vis==='translucent' ? '#e8a020' : '#4c4';
      }
      return `
        <li data-uuid="${ann.uuid}" style="${liStyle}">
          <button class="pm-vis-btn" data-uuid="${ann.uuid}"
            style="flex-shrink:0;background:none;border:none;cursor:pointer;
                   font-size:.8em;padding:0 2px;color:${visCol};"
            title="${ann.type==='text'?'エッジ切替 → 非表示':'表示 → 半透明 → 非表示'}">${visIcon}</button>
          <span class="pm-color-dot" data-uuid="${ann.uuid}"
            style="width:11px;height:11px;border-radius:50%;flex-shrink:0;cursor:pointer;
                   background:${col};border:1px solid rgba(255,255,255,.3);
                   opacity:${vis==='hidden'?'0.3':'1'}"></span>
          <span class="pm-ann-label" data-uuid="${ann.uuid}"
            style="flex:1;overflow:hidden;text-overflow:ellipsis;
                   white-space:nowrap;color:${vis==='hidden'?'#444':'#bbb'};
                   font-size:.82em;">${_escHtml(ann.name||ann.text||'?')}</span>
          <span style="display:flex;align-items:center;gap:2px;flex-shrink:0;">
            <button class="pm-step-dn" data-uuid="${ann.uuid}"
              style="width:16px;height:16px;font-size:.65em;padding:0;border-radius:2px;
                background:rgba(255,255,255,.06);border:1px solid #444;color:#CACACA;cursor:pointer;">◀</button>
            <span class="pm-step-val"
              style="width:12px;text-align:center;font-size:.7em;color:#4caf50;">${step}</span>
            <button class="pm-step-up" data-uuid="${ann.uuid}"
              style="width:16px;height:16px;font-size:.65em;padding:0;border-radius:2px;
                background:rgba(255,255,255,.06);border:1px solid #444;color:#CACACA;cursor:pointer;">▶</button>
          </span>${ann.type==='text' ? (() => {
            const mw = ann.mojiWaku || 0;
            const mwIcon  = mw===1 ? '無' : '縁'; 
            const mwBg    = mw===0 ? '#000' : mw===1 ? 'rgba(255,255,255,.06)' : '#fff';
            const mwCol   = mw===0 ? '#fff' : mw===1 ? '#888' : '#000';
            const mwBorder= mw===1 ? '#444' : '#888';
            const mwTitle = mw===0 ? '文字枠：通常（次で非表示）'
                           : mw===1 ? '文字枠：非表示（次で色反転）'
                           : '文字枠：色反転（次で通常）';
            return `<button class="pm-mojiwaku-btn" data-uuid="${ann.uuid}"
              style="width:16px;height:16px;font-size:.62em;padding:0;border-radius:2px;flex-shrink:0;
                background:${mwBg};border:1px solid ${mwBorder};color:${mwCol};cursor:pointer;"
              title="${mwTitle}">${mwIcon}</button>`;
          })() : ''}
          <button class="pm-del-btn" data-uuid="${ann.uuid}"
            style="background:rgba(200,80,80,.15);border:1px solid #c04040;border-radius:3px;
                   color:#f88;cursor:pointer;padding:1px 5px;font-size:.72em;flex-shrink:0;">✕</button>
        </li>`;
    }).join('');

    let _dragSrcDisplayIdx = null;
    list.querySelectorAll('li[data-uuid]').forEach((li, displayIdx) => {
      li.draggable = true;
      li.addEventListener('dragstart', e => {
        _dragSrcDisplayIdx = displayIdx;
        e.dataTransfer.effectAllowed = 'move';
        requestAnimationFrame(() => { li.style.opacity = '0.35'; });
      });
      li.addEventListener('dragend', () => {
        li.style.opacity = '';
        list.querySelectorAll('li[data-uuid]').forEach(x => { x.style.boxShadow = ''; });
      });
      li.addEventListener('dragover', e => {
        e.preventDefault();
        if (_dragSrcDisplayIdx === null || _dragSrcDisplayIdx === displayIdx) return;
        const rect = li.getBoundingClientRect();
        const isTop = (e.clientY - rect.top) < rect.height / 2;
        li.style.boxShadow = isTop
          ? 'inset 0 3px 0 0 #4caf50'
          : 'inset 0 -3px 0 0 #4caf50';
      });
      li.addEventListener('dragleave', () => { li.style.boxShadow = ''; });
      li.addEventListener('drop', e => {
        e.preventDefault();
        const rect = li.getBoundingClientRect();
        const isTop = (e.clientY - rect.top) < rect.height / 2;
        li.style.boxShadow = '';
        if (_dragSrcDisplayIdx === null || _dragSrcDisplayIdx === displayIdx) return;
        pushPmUndo();
        const arr = steps[currentStep];
        const total = arr.length;
        const srcIdx = total - 1 - _dragSrcDisplayIdx;
        let dstDisplayIdx = isTop ? displayIdx : displayIdx + 1;
        if (_dragSrcDisplayIdx < dstDisplayIdx) dstDisplayIdx--; 
        const dstIdx = total - 1 - dstDisplayIdx;
        _dragSrcDisplayIdx = null;
        if (srcIdx === dstIdx) return;
        const [item] = arr.splice(srcIdx, 1);
        arr.splice(dstIdx, 0, item);
        updatePlacedList();
        markPmDirty();
      });
    });
    list.querySelectorAll('li[data-uuid]').forEach(li => {
      const uuid = li.dataset.uuid;
      const old = _pmOldListRects.get(uuid);
      if (!old) return;
      const now = li.getBoundingClientRect();
      const dy = old.top - now.top;
      if (Math.abs(dy) < 1) return;
      li.style.transition = 'none';
      li.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        li.style.transition = 'transform .18s ease';
        li.style.transform = '';
      });
    });

    list.querySelectorAll('li[data-uuid]').forEach(li => {
      li.addEventListener('click', ev => {
        if (['pm-del-btn','pm-color-dot','pm-color-none','pm-step-dn','pm-step-up','pm-mach-sz','pm-mojiwaku-btn']
            .some(c=>ev.target.classList.contains(c))) return;
        const uuid = li.dataset.uuid;
        if (ev.shiftKey) {
          selectedUuids.has(uuid) ? selectedUuids.delete(uuid) : selectedUuids.add(uuid);
        } else {
          if (selectedUuids.has(uuid) && selectedUuids.size===1) selectedUuids.clear();
          else { selectedUuids.clear(); selectedUuids.add(uuid); }
        }
        updatePlacedList();
        markPmDirty();
      });
    });
    list.querySelectorAll('.pm-vis-btn').forEach(btn => {
      btn.onclick = ev => {
        ev.stopPropagation();
        const a = steps[currentStep].find(x => x.uuid === btn.dataset.uuid);
        if (!a) return;
        pushPmUndo();
        if (a.type === 'text') {
          const cycle = ['edge-primary','edge-secondary','hidden'];
          const cur   = a.visibility || 'edge-primary';
          a.visibility = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
        } else {
          const cycle = ['visible','translucent','hidden'];
          const cur   = a.visibility || 'visible';
          a.visibility = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
        }
        updatePlacedList();
        markPmDirty();
      };
    });
    list.querySelectorAll('.pm-color-dot').forEach(dot => {
      dot.onclick = ev => {
        ev.stopPropagation();
        const a = steps[currentStep].find(x=>x.uuid===dot.dataset.uuid);
        if (!a) return;
        pushPmUndo();
        if (a.type === 'machinery') {
          const idx = MACH_COLORS.indexOf(a.color);
          a.color = MACH_COLORS[(idx + 1) % MACH_COLORS.length];
        } else {
          a.color = COLORS[(COLORS.indexOf(a.color)+1) % COLORS.length];
        }
        updatePlacedList();
        markPmDirty();
      };
    });
    list.querySelectorAll('.pm-mach-sz').forEach(btn => {
      btn.onclick = ev => {
        ev.stopPropagation();
        const a = steps[currentStep].find(x=>x.uuid===btn.dataset.uuid);
        if (!a) return;
        pushPmUndo();
        const idx = MACH_SIZES.indexOf(a.sizeMultiplier || 1);
        a.sizeMultiplier = MACH_SIZES[(idx + 1) % MACH_SIZES.length];
        updatePlacedList();
        markPmDirty();
      };
    });
    list.querySelectorAll('.pm-step-dn').forEach(btn => {
      btn.onclick=ev=>{ev.stopPropagation();
        const a=steps[currentStep].find(x=>x.uuid===btn.dataset.uuid);
        if(a){
          const min=0;
          a.sizeStep=Math.max(min,(a.sizeStep??1)-1);updatePlacedList();markPmDirty();
        }
      };
    });
    list.querySelectorAll('.pm-step-up').forEach(btn => {
      btn.onclick=ev=>{ev.stopPropagation();
        const a=steps[currentStep].find(x=>x.uuid===btn.dataset.uuid);
        if(a){const max=(a.type==='line'||a.type==='circle')?7:5; a.sizeStep=Math.min(max,(a.sizeStep??1)+1);updatePlacedList();markPmDirty();}
      };
    });
    list.querySelectorAll('.pm-mojiwaku-btn').forEach(btn => {
      btn.onclick=ev=>{ev.stopPropagation();
        const a=steps[currentStep].find(x=>x.uuid===btn.dataset.uuid);
        if(a){pushPmUndo();a.mojiWaku=((a.mojiWaku||0)+1)%3;updatePlacedList();markPmDirty();}
      };
    });
    list.querySelectorAll('.pm-del-btn').forEach(btn => {
      btn.onclick=ev=>{ev.stopPropagation();
        pushPmUndo();
        selectedUuids.delete(btn.dataset.uuid);
        steps[currentStep]=steps[currentStep].filter(x=>x.uuid!==btn.dataset.uuid);
        updatePlacedList();
        markPmDirty();
      };
    });

    markPmDirty(); 
  }

  function switchStep(n) {
    if (n === currentStep) return;
    cancelAnnotMode(); 
    currentStep = n;
    selectedUuids.clear();
    updatePlacedList();
    updateTabUI();
    _toast(`STEP ${n+1} に切り替えました`, 1500);
    markPmDirty();
  }

  function updateTabUI() {
    if (!pmLeftPanel) return;
    pmLeftPanel.querySelectorAll('#pm-step-tabs button').forEach(btn => {
      const s = Number(btn.dataset.step);
      const active = s === currentStep;
      btn.style.background = active ? 'rgba(76,175,80,.25)' : 'rgba(255,255,255,.05)';
      btn.style.color       = active ? '#4caf50' : '#666';
      btn.style.borderColor = active ? '#4caf50' : '#333';
      btn.style.fontWeight  = active ? 'bold' : 'normal';
    });
    pmLeftPanel.querySelectorAll('.pm-tab-cnt').forEach(sp => {
      const s = Number(sp.dataset.step);
      sp.textContent = steps[s].length;
      sp.style.color = steps[s].length > 0 ? '#4caf50' : '#444';
    });
  }

  function showCopyDialog() {
    if (selectedUuids.size === 0) return;
    document.getElementById('pm-copy-dialog')?.remove();
    const dlg = document.createElement('div');
    dlg.id = 'pm-copy-dialog';
    dlg.style.cssText = `
      position:fixed;inset:0;z-index:99900;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,.6);`;
    const otherSteps = [0,1,2,3,4].filter(s => s !== currentStep);
    dlg.innerHTML = `
      <div style="background:#182a1c;border:1px solid #4caf50;border-radius:10px;
        padding:28px 32px;min-width:280px;box-shadow:0 4px 24px rgba(0,0,0,.7);text-align:center;">
        <div style="font-size:.88em;color:#81c784;margin-bottom:16px;font-weight:bold;">
          📋 コピー先を選択（${selectedUuids.size}件）
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;text-align:left;">
          ${otherSteps.map(s=>`
            <button data-target="${s}" style="padding:8px;font-size:.8em;border-radius:5px;
              background:rgba(255,255,255,.07);border:1px solid #333;color:#ccc;cursor:pointer;
              text-align:left;">
              STEP ${s+1}
              <span style="font-size:.8em;color:#CACACA;">(現在 ${steps[s].length}件)</span>
            </button>`).join('')}
        </div>
        <button id="pm-copy-cancel" style="width:100%;margin-top:16px;padding:8px;font-size:.85em;
          background:#333;border:1px solid #666;color:#CACACA;border-radius:6px;cursor:pointer;">
          キャンセル</button>
      </div>
    `;
    document.body.appendChild(dlg);
    dlg.querySelectorAll('button[data-target]').forEach(btn => {
      btn.onclick = () => { doCopyToStep(Number(btn.dataset.target)); dlg.remove(); };
      btn.onmouseenter = () => { btn.style.background='rgba(76,175,80,.2)'; btn.style.borderColor='#4caf50'; btn.style.color='#a5d6a7'; };
      btn.onmouseleave = () => { btn.style.background='rgba(255,255,255,.07)'; btn.style.borderColor='#333'; btn.style.color='#ccc'; };
    });
    document.getElementById('pm-copy-cancel').onclick = () => dlg.remove();
  }

  function doCopyToStep(targetStep) {
    if (targetStep === currentStep) return;
    pushPmUndo();
    const copied = steps[currentStep]
      .filter(a => selectedUuids.has(a.uuid))
      .map(a => ({ ...a, uuid: uid(), name: annName(a.type) }));
    steps[targetStep].push(...copied);
    updateTabUI();
    _toast(`STEP ${targetStep+1} に ${copied.length}件コピーしました`, 2200);
    markPmDirty();
  }

  function pushPmUndo() {
    pmUndoStack.push(JSON.stringify(steps));
    if (pmUndoStack.length>PM_UNDO_MAX) pmUndoStack.shift();
    pmRedoStack.length=0; syncUndoRedoBtns();
  }
  function pmUndo() {
    if (!pmUndoStack.length) return;
    pmRedoStack.push(JSON.stringify(steps));
    steps=JSON.parse(pmUndoStack.pop());
    selectedUuids.clear(); updatePlacedList(); syncUndoRedoBtns();
    markPmDirty();
  }
  function pmRedo() {
    if (!pmRedoStack.length) return;
    pmUndoStack.push(JSON.stringify(steps));
    steps=JSON.parse(pmRedoStack.pop());
    selectedUuids.clear(); updatePlacedList(); syncUndoRedoBtns();
    markPmDirty();
  }
  function syncUndoRedoBtns() {
    const u=document.getElementById('pm-undo-btn');
    const r=document.getElementById('pm-redo-btn');
    if(u) u.disabled=pmUndoStack.length===0;
    if(r) r.disabled=pmRedoStack.length===0;
  }
  function pmClearAll() {
    if(!steps[currentStep].length){_toast('配置データがありません');return;}
    const doClear=()=>{pushPmUndo();steps[currentStep]=[];selectedUuids.clear();updatePlacedList();markPmDirty();};
    _pmConfirm('配置を全て消去しますか？', doClear, null);
  }

  const _CATEGORY_MIGRATION_MAP = {
    heavy: 'heavy_vehicle',
    equipment: 'heavy_vehicle',
    temporary: 'temp_material',
    material: 'temp_material',
    scaffold: 'scaffold',
    operation: 'operation'
  };
  function _migrateMachineryCategories(dataObj) {
    Object.keys(dataObj).forEach(key => {
      const cat = dataObj[key].category;
      if (_CATEGORY_MIGRATION_MAP[cat]) {
        dataObj[key].category = _CATEGORY_MIGRATION_MAP[cat];
      } else if (!['heavy_vehicle','temp_material','scaffold','operation','other'].includes(cat)) {
        dataObj[key].category = 'other';
      }
    });
    return dataObj;
  }

  function loadMachineryFile(onDone) {
    const inp  = document.createElement('input');
    inp.type   = 'file';
    inp.accept = '.dat,.js';
    inp.onchange = () => {
      const file = inp.files[0];
      if (!file) return;
      (async () => {
        try {
          const buf  = await file.arrayBuffer();
          const text = await _decodeMachineryBytes(buf); 
          const objText = _extractMachineryObjectText(text); 
          if (!objText) { _toast('⚠ MACHINERY_DATA が見つかりません'); return; }
          machineryData = _migrateMachineryCategories(JSON.parse(objText));
          const count = _pmAnnounceMachineryStatus();
          _toast(`📦 読込完了（${count}件）`, 2500);
          if (placementMode) renderPmLayer(); 
          if (typeof onDone === 'function') onDone();
        } catch(err) {
          _toast('⚠ 読み込みエラー（形式確認してください）');
          console.error('[Arecalay] loadMachineryFile:', err);
        }
      })();
    };
    inp.click();
  }

  const _MCAT_LABEL = {
    heavy_vehicle:'🔵重機・車両', temp_material:'🟡仮設・資材',
    scaffold:'⚪足場材', operation:'🔴作業', other:'🟢その他'
  };

  function buildPmSaveData() {
    const machineryMeta = {};
    steps.flat().filter(a => a.type === 'machinery').forEach(a => {
      if (!machineryMeta[a.assetId]) {
        const asset = machineryData[a.assetId];
        machineryMeta[a.assetId] = asset
          ? { name: asset.name, category: asset.category, division: asset.division }
          : { name: a.name, category: '?', division: '?' };
      }
    });
    return {
      version:      '1.2', 
      appId:        'arecalay-placement',
      annCounter,
      steps,
      machineryMeta,
      scaleDenom:   (typeof scaleDenom !== 'undefined' && scaleDenom > 0) ? scaleDenom : null
    };
  }
  function pmSaveJSON() {
    const data = buildPmSaveData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const ts = typeof getTs === 'function'
      ? getTs()
      : new Date().toISOString().slice(0,16).replace('T','_');
    a.download = `arecalay_${ts.replace(/[: ]/g,'')}.calay`;
    a.click();
    URL.revokeObjectURL(a.href);
    const total   = steps.reduce((s,arr) => s + arr.length, 0);
    const machCnt = steps.flat().filter(a => a.type === 'machinery').length;
    _toast(`💾 保存しました（計${total}件 / 図形${machCnt}件）`, 2500);
  }

  function applyPmData(data) {
    if (!data.steps || !Array.isArray(data.steps) || data.steps.length !== 5) {
      _toast('⚠ 無効なファイル形式です（steps[5] が見つかりません）'); return false;
    }
    if (data.appId && data.appId !== 'arecalay-placement') {
      _toast('⚠ このファイルは Arecalay 用ではありません'); return false;
    }
    if (typeof data.scaleDenom === 'number' && data.scaleDenom > 0 &&
        typeof scaleDenom !== 'undefined' && scaleDenom > 0) {
      const ratio = data.scaleDenom / scaleDenom;
      if (Math.abs(ratio - 1) > 0.001) {
        _toast(`⚠ 配置データの保存時スケール(1/${Math.round(data.scaleDenom)})が現在のAreCal本体スケール` +
               `(1/${Math.round(scaleDenom)})と一致していません。配置位置がずれている可能性があります`, 6000);
      }
    }
    pushPmUndo();
    if (!placementMode && typeof window._pmToggle === 'function') {
      window._pmToggle();
    }
    steps      = data.steps;
    annCounter = typeof data.annCounter === 'number' ? data.annCounter : annCounter;
    selectedUuids.clear();
    cancelAnnotMode();
    updatePlacedList();
    updateTabUI();

    const machAnns    = steps.flat().filter(a => a.type === 'machinery');
    const missingIds  = [...new Set(
      machAnns.map(a => a.assetId).filter(id => !machineryData[id])
    )];
    if (missingIds.length) {
      const names = missingIds.map(id => {
        const meta = data.machineryMeta?.[id];
        return meta ? meta.name : id;
      }).join('、');
      tryAutoLoadMachinery().then(() => {
        const stillMissing = missingIds.filter(id => !machineryData[id]);
        if (stillMissing.length) {
          _toast(`⚠ 図形データ未読込: ${names} — CalayMachineryData.dat を確認してください`, 5000);
        }
      });
    }

    const total    = steps.reduce((s,arr) => s + arr.length, 0);
    const machCnt  = machAnns.length;
    const suffix   = machCnt ? `（図形${machCnt}件含む）` : '';
    _toast(`📂 読み込みました（計${total}件${suffix}）`, 2500);
    markPmDirty();
    return true;
  }

  function pmLoadJSON() {
    const inp = document.createElement('input');
    inp.type   = 'file';
    inp.accept = '.arela';
    inp.onchange = () => {
      const file = inp.files[0];
      if (!file) return;
      if (!/\.arela$/i.test(file.name)) {
        _toast('⚠ .arela形式のファイルのみ読み込めます');
        return;
      }
      if (/\.arela$/i.test(file.name)) {
        if (typeof window.customConfirm === 'function' && typeof window.loadArela === 'function') {
          window.customConfirm(
            'Arelaファイルを読み込むと、現在作図中の内容(AreCal・Arecalay 両方)は\n破棄され、読み込んだ内容に置き換わります。よろしいですか？',
            () => window.loadArela(file), null
          );
        } else {
          _toast('⚠ Arelaの読込はAreCal本体の準備ができてから行ってください');
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          applyPmData(data);
        } catch(err) {
          _toast('⚠ ファイルの読み込みに失敗しました');
          console.error('[Arecalay] pmLoadJSON error:', err);
        }
      };
      reader.readAsText(file);
    };
    inp.click();
  }

  function _toast(msg,dur) { if(typeof toast==='function') toast(msg,dur||2200); }
  function _setStatus(msg) { if(typeof setStatus==='function') setStatus(msg); }
  function annName(type) {
    const suffix = (annCounter++).toString(16).toUpperCase().padStart(2,'0');
    if (type === 'text')     return `テキスト_${suffix}`;
    if (type === 'line')     return `線_${suffix}`;
    if (type === 'circle')   return `円_${suffix}`;
    if (type === 'machinery') {
      const a = selectedAssetId && machineryData[selectedAssetId];
      return `${a ? a.name : '図形'}_${suffix}`;
    }
    return `矢印_${suffix}`;
  }

  function uid() {
    return crypto.randomUUID?crypto.randomUUID()
      :Math.random().toString(36).slice(2)+Date.now().toString(36);
  }

  function _escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded',init);
  } else { setTimeout(init,80); }

})();
