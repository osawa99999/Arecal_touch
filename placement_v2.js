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
 * placement.js — AreCal 配置モード拡張 v0.9.37
 *
 * [最新の変更]
 * v0.0067:
 *   - マスターより「startPmLoopが何も触ってない状態でも動き続けてるのはダメ、直そう」との指示。
 *     前回(v0.0066)は影響範囲の広さを理由に改修を見送っていたが、個別のミューテーション箇所を
 *     全て洗い出す(見落としリスクが高い)代わりに、以下の設計で対応：
 *     「ユーザーによる状態変化は必ず何らかのDOMイベント(pointerdown/move/up・wheel・keydown・
 *     click・input・change・drop・dragover等)を伴う」という前提のもと、これらのイベント発生
 *     時刻だけを広く記録する(_pmMarkActive)。startPmLoopは直近400ms(_PM_IDLE_GRACE_MS)以内に
 *     何らかの操作が無ければ、その回のsyncPmCv()+renderPmLayer()を丸ごとスキップする。
 *     ドラッグ・ホバー追従中はpointermove自体が継続発火するため、動きが必要な間は従来通り
 *     毎フレーム描画される。setInterval/setTimeoutによる自律的な注記変更が無いことも確認済み
 *     (唯一のsetTimeout用途はinput要素へのフォーカス設定とinit()のリトライのみ)。
 *     resizeイベントのみdocumentにバブルしないためwindow側に個別登録。
 *     この方式なら「変化があった操作を1つ1つ洗い出す」より遥かに見落としが起きにくく、
 *     仮に想定外の操作経路が漏れていても「その操作の直後400ms間だけ描画が遅れる」程度で
 *     済み、「操作しても永久に描画されない」ような致命的な不具合にはなりにくい設計とした。
 * v0.0066:
 *   - マスターより「全機能の書き出し(テスト用)＋軽量化できる箇所があれば対応(機能削除は禁止)」との
 *     依頼(AreCal本体v0.0466と対になる対応)。
 *     コード全体を精査した結果の対応・所見は以下の通り：
 *     ①(実施)startPmLoopはArecalayモード中、requestAnimationFrameで「毎フレーム無条件に」
 *     syncPmCv()を呼び続けており、その中で毎回document.getElementById('pdf-cv')/('draw-cv')を
 *     実行していた。この2要素はページ内に1個だけ存在し動的に作り直されることも無い静的な
 *     canvasのため、初回取得後はモジュール変数(_pmPdfElCache/_pmDrawCvCache)にキャッシュして
 *     使い回す形にした。挙動は完全に同一で、フレーム毎のDOM参照コストのみ削減。
 *     ②(要検討・今回は未着手)startPmLoop自体が「変化の有無に関わらず毎フレーム
 *     syncPmCv()+renderPmLayer()(全注記の再描画)を無条件に実行し続ける」設計になっている点。
 *     ドラッグ中や値変更中は追従のため常時描画が必要だが、何も操作していない静止状態でも
 *     背景で永久に描き続けており、特にタブレット等バッテリー駆動端末では無駄な発熱・消費電力に
 *     つながりうる。これを「変更があった時だけ描画する」方式に直すには、注記の追加/移動/削除・
 *     選択/ホバー変更・パン/ズーム・STEP切替・不透明度変更など、描画に影響する全ての操作箇所を
 *     漏れなく洗い出して「再描画フラグ」を立てる必要があり、1箇所でも見落とすと「操作したのに
 *     画面が更新されない」という気づきにくい不具合につながるリスクがある。実機での動作確認
 *     なしに踏み込むには影響範囲が広すぎると判断し、今回は改修を見送った。次回予定の
 *     タブレット対応と合わせて、実機テストとセットで着手することを推奨する。
 * v0.0065:
 *   - 実機NG再対応。AreCal本体v0.0458と対になる改修：
 *     ①四隅+中心スナップの目印の色をAreCal本体側(#00e5ff)と統一(以前は#4caf50で食い違って
 *     いた)。また、吸着中の点をオブジェクト参照で判定していたため強調表示が常にOFFになって
 *     いたバグを、配列インデックス判定に変更して修正(AreCal本体側と同じ原因・同じ対応)。
 *     ②PDF出力範囲選択中の中クリック(ホイール押し)+ドラッグパンをArecalayにも追加
 *     (AreCal本体側は既にv0.0456③で対応済みだったが、Arecalay独自の範囲選択には未移植だった)。
 *     ③図形番号ルールの見直し(AreCal本体v0.0458③)自体はAreCal本体側(shapes配列)のみが
 *     対象で、このファイルには変更なし。
 * v0.0064:
 *   - AreCal本体v0.0457と対になる改修。マスターより新規指摘2件＋実機NG再対応1件：
 *     ①「PDFをグレースケール表示」トグルをArecalay左UI(「元に戻す/やり直す」の下、
 *     「種別表示」の上)にも新設。AreCal本体の#gray-toggleと同じ変数(pdfGrayscale)・
 *     pdfCv要素を共有し、どちらの画面でON/OFFしてももう一方の見た目にも反映されるよう
 *     相互同期。pmDoExportPDF(Arecalay独自のPDF出力)にも同フィルタを適用。
 *     ②PDF出力範囲選択(pmStartRangeSelect)に、AreCal本体と同じ元PDF四隅+中心スナップを追加。
 *     座標算出はAreCal本体側のwindow._pdfCornerSnapPointsをそのまま共用し、二重実装を避けた。
 *     ③AreCal本体v0.0456④「ホバー強調エッジ点滅色」の実機NG再対応(AreCal本体側のみの修正、
 *     このファイルには変更なし)。詳細はArecal_v0_0457.html側のchangelog参照。
 * v0.0063:
 *   - ③マスターより要望。配置オブジェクトリスト(#pm-placed-list)のドラッグ&ドロップ時、
 *     以前は「ドラッグ中のli全体を緑枠で囲むだけ」で上に入るか下に入るか分かりにくかったため、
 *     カーソル位置(行の上半分/下半分)に応じて挿入線(上端/下端)を表示する方式に変更。
 *     AreCal本体側(#sh-list)の同様の改修と統一。あわせて、外部ライブラリを使わない簡易FLIP
 *     アニメーション(旧位置→新位置の差分をtransformで巻き戻してから0に戻す)を追加し、
 *     並び替え後の移動が滑らかに見えるようにした。
 * v0.0062:
 *   - ①マスターの好みで白黒の割り当てを入れ替え。「縁」＝黒地に白文字、「逆(ラベルは同じ縁)」＝
 *     白地に黒文字のボタンに変更(v0.0061の逆)。
 * v0.0061:
 *   - ①マスターより再訂正：「枠」という言い換えではなく、左パネルの小さいトグルボタン自体の
 *     見た目(背景色/文字色)で状態を示してほしいとのこと。「縁」＝白地に黒文字のボタン、
 *     「無」＝現状のまま、「逆」＝ラベルは同じ「縁」だが黒地に白文字のボタン(色が反転している
 *     ことで区別)に変更。キャンバス上のテキスト描画方式(縁取りストローク)自体は変更していない。
 * v0.0060:
 *   - ①マスターより訂正：直すのは描画ロジックではなく左パネルの小さいトグルボタンの表記のみ。
 *     「縁」の字が「緑」に見えるうえボタン色も緑(#4c4)のため、「なぜ緑色にならないのか」と
 *     誤解されていたのが真因。描画方式(縁取りストローク)・配色は変更せず、mwIcon文字だけ
 *     「縁」→「枠」に変更して解消(v0.0059時点の「保留」判断を撤回)。
 * v0.0059:
 *   - マスターより「前回0430ベースの誤ったブランチで作業してしまった」との指摘を受け、
 *     このv0.0058ベースへ改めて4項目を適用(番号は指示書どおり)：
 *     ①テキストの縁UI(MojiWaku)は「白地黒文字／黒地白文字」化という描画方式そのものの変更を伴う
 *     ため、drawText()中枢や選択・ホバー表示との相互作用の精査が必要と判断し、今回は保留(要相談)。
 *     ②矢印/線プレビューの太さ不一致を修正。v0.0055でsizeStep系を直接index方式に統一した際、
 *     プレビュー側(defArrowStep-1 / defLineStep-1 ＋ 太さ0.7倍)だけ追従できていなかった取り残しが
 *     真因。ARROW_LW[defArrowStep]・LINE_LW[defLineStep]をそのまま使い、0.7倍も廃止して実際の
 *     描画と完全一致させた。
 *     ③円ツールの半径入力ダイアログ(promptCircleRadius)を廃止。中心クリックと同時に、
 *     作図エリア(pdf-cv実寸)の縦横長い方の10%を半径として即時作図するplaceCircleDefault()に
 *     置き換え。半径の微調整は従来通りグリップドラッグで行う。
 *     ④PDF出力ファイル名のプレフィックスをplacement_→Arecal_に変更。
 *     ⑦操作ガイド最終行「AreCal図形はこのモードでは操作不可」を1.15em・2行表示に変更。
 *   - あわせて、内部バージョン定数ARECALAY_VERが実際にはv0.0046のまま長期間更新されておらず、
 *     このchangelogの実際の到達バージョン(v0.0058)と食い違っていたため、今回0.0059へ修正。
 *     (画面右下のバージョン表示が実態と異なって見えていたのはこの定数の更新漏れが原因)
 * v0.0058:
 *   - 定型文スタンプ(STAMP_GROUPS)の収録語をマスター指定の新リストへ全面差し替え(ボタン変更.txt)。
 *     矢板をあ行→や行へ移動、FL・感電注意を削除、既存構造物/既存利用→「既存」に統合、
 *     工事車両進入路→「工事車両」、コンクリート打設範囲→「打設範囲」(た行へ移動)、
 *     第三者立入禁止→「第三者」、吊荷下立入禁止→「吊荷」に短縮、GLをか行→さ行へ移動。
 *   - 【外部AI監査対応】配置モードのスケール依存バグを解消。buildPmSaveData()の保存データに
 *     保存時点のAreCal本体スケール(scaleDenom)を追加。読込側applyPmData()で、保存時スケールと
 *     読込直後(AreCal側のapplyArecDataで復元済み)の現在スケールを比較し、不一致であれば
 *     「配置位置がずれている可能性があります」とtoast警告を出すよう対応(座標の自動補正は
 *     誤補正リスクを避けるため行わず、警告に留める安全策とした)。
 * v0.0057:
 *   - 定型文スタンプの挙動を要望に合わせて調整。1)パネルを開いた時だけ、画面内に収まる範囲でダイアログの
 *     横幅を動的に広げるようにし(閉じている時は元の幅のまま)、固定max-width/max-heightをやめて
 *     window.innerWidth/innerHeightから残り表示可能な幅・高さを都度計算するよう変更(ページ全体のスクロールは
 *     発生させない方針は維持、入りきらない場合のみパネル内部がoverflow-y:autoでスクロール)。
 *     2)定型文ボタンを1個クリックしたら自動でパネルを閉じる(▲→▼)よう変更(旧: 複数選択可のまま開いたまま)。
 *     3)「BM」(ベンチマークの略)を英数グループから「は」行(べ)へ移動。4)追加希望のあった以下26語を
 *     読みに応じて五十音各行へ振り分けて追加、「ら」行を新設(英数グループは全て解消し廃止):
 *     切梁(か)・山留(や)・SMW(あ)・矢板(や)・AP(あ)・FL(あ)・GL(か)・捨てコン(さ)・TP(た)・床付け(た)・
 *     レベルコン(ら)・路床(ら)・路盤(ら)・表層(は)・基層(か)・砕石(さ)・アスファルト(あ)・AS(あ)・
 *     コンクリート(か)・Con(か)・基礎(か)・躯体(か)・立面図(ら)・断面図(た)・平面図(は)・ヤード(や)・掘削範囲(か)
 * v0.0056:
 *   - テキスト入力ダイアログに「定型文スタンプ」機能を追加。入力欄の右に▼ボタンを新設し、押すと
 *     五十音行ごとに整理された定型文ボタン一覧(現場で使う用語约90語)を展開。クリックで入力欄に
 *     半角スペース区切りで追記(複数連続選択可、パネルは自動では閉じない)。パネルはmax-width/max-height
 *     +overflow-y:autoで内部スクロールに留め、開いた際にダイアログ全体が画面端からはみ出す場合は
 *     位置を自動補正(ページ全体のスクロールが発生しないようにする対応)。参考用に貰ったサンプルHTML
 *     (色/サイズ項目なし・左詰め単純折返し)は元々の実装に既にある色/サイズUIとは別物のため、その2項目は
 *     そのまま流用せず、五十音の行見出し付きレイアウトで独自に整理して実装。
 * v0.0055:
 *   - Arecalayの「線」「矢印」「円」に、テキストと同様の呼称「0」(現行の1より細い最小サイズ)を追加。
 *     ARROW_LW/LINE_LWの先頭に0番目の値を追加し、参照方式を旧来の(sizeStep||1)-1(1始まりのindex変換)から
 *     TEXT_FSと同じ sizeStep??1 の直接index方式に統一。デフォルトサイズ選択(defArrowStep/defLineStep)の
 *     下限、および左UIの-ボタンの下限もtext限定(0)から全タイプ共通(0)に変更。
 * v0.0054:
 *   - 外部監査で指摘された「正規表現[\s\S]*によるバックトラック地獄でフリーズする」という懸念を実測で検証。
 *     結果: 9MB級・末尾に空白20万文字を追加した意地悪ケースでも約175msで完了し、指数関数的な遅延(ReDoS)は
 *     発生しないことを確認([\s\S]*は入れ子の量指定子を含まないためReDoS脆弱パターンには該当しない。監査の
 *     「フリーズ/スタックオーバーフロー」という結論は実測上は誇張だったが、正規表現版でも数百msの同期的な
 *     メインスレッドブロックは発生するし、今後データがさらに肥大化する可能性もあるため、監査提案の方針
 *     (indexOf/lastIndexOfによる軽量な切り出し)自体は妥当と判断し採用。
 *   - 共通ヘルパー _extractMachineryObjectText を新設(indexOf('MACHINERY_DATA')の直後から'{'を探し、
 *     text全体のlastIndexOf('}')までを切り出す。キーワード起点にしている点は監査の提案より安全側)。
 *     tryAutoLoadMachinery・loadMachineryFile 両方の正規表現マッチを置き換え。実測: 0.7MB(16000件)で
 *     抽出3ms未満、JSON.parseの結果も従来の正規表現方式と完全一致することを確認済み。
 * v0.0053:
 *   - マスター作成の圧縮ツール(ブラウザ標準CompressionStreamでGZIP圧縮し、CalayMachineryData.dat固定名で
 *     出力するもの)に対応。重機データ(.dat)の自動読込(tryAutoLoadMachinery)・手動読込(loadMachineryFile)
 *     の両方で、ファイル先頭2バイトのGZIPマジックナンバー(0x1f,0x8b)を見て圧縮/非圧縮を自動判別し、
 *     圧縮されていればDecompressionStream('gzip')で展開してから従来通りMACHINERY_DATAをパースするよう変更
 *     (共通ヘルパー _decodeMachineryBytes を新設)。旧来の非圧縮.datファイルもそのまま読み込める。
 *     手動読込側はFileReader.readAsTextからfile.arrayBuffer()ベースに変更。
 * v0.0052:
 *   - Chromeのタッチエミュレートによる検証で「一度選択したオブジェクトを空白タップで選択解除できない」
 *     不具合を確認。document pointerdownハンドラ内で `if(hit){...handleEditClick(e,hit)}` となっており、
 *     何もヒットしなかった場合にhandleEditClick自体が呼ばれず、関数内部の「!hit→selectedUuids.clear()」
 *     (空クリックで選択解除するためのコード)が常にデッドコードになっていたのが原因。hit有無に関わらず
 *     必ずhandleEditClickを呼ぶよう修正(stopPropagationはhitがある時のみ従来通り)。
 * v0.0051:
 *   - 実機(iPad Pro)テストで、Arecalayの配置オブジェクトが左UIには反映されるがpm-cv上に描画されない
 *     不具合を確認。AreCal本体のdraw-cv(v0.0440)と同根と判断し、pm-cv生成時にwill-change:'transform'を
 *     付与してGPUレイヤーを確保。※修正後の実機再確認はまだ。
 * v0.0050:
 *   - 【タブレット・ハイブリッド対応 Step1】マウス専用イベント(mousedown/mousemove/mouseup)を
 *     全てPointer Events(pointerdown/pointermove/pointerup)に機械的置換。{capture:true}等のオプションや
 *     ハンドラ中身のロジックは無変更。テキスト入力ダイアログのoutsideリスナー・機材ピッカーの枠外クリック・
 *     Arecalay独自PDF範囲選択のonDown/onMove/onUpも同様に置換。dblclick等は今回対象外。
 *     2本指ピンチズーム&パン・タッチ座標オフセットはStep2以降で対応予定。※実機(iPad Pro)未確認。
 * v0.0049:
 *   - showTextInput()のテキスト入力ダイアログで、Enter/OKボタン/Escで閉じた場合に
 *     枠外クリック検知用のmousedownリスナー(outside)がdocument側から解除されず残る
 *     不具合を修正。cleanup()関数に閉じる処理とリスナー解除を集約し、確定/Escキー/
 *     枠外クリックの全経路から呼ぶよう整理。
 * v0.0048:
 *   - MojiWakuアイコンの表記を「縁/非/反」→「縁/無/逆」に変更(視認性向上)。
 *   - 呼称0の文字サイズを28px→20pxに変更。
 * v0.0047:
 *   - テキストの文字サイズ呼称に「0」を新設(既存の1〜5より一段小さいサイズ)。TEXT_FSを
 *     [28,40,56,80,112,160]に変更し、呼称0〜5をそのまま配列indexとして参照する方式に統一
 *     (旧: sizeStep-1でindex化 → 新: sizeStepをそのままindex化)。あわせて各所の
 *     `sizeStep||1`(0が偽値になり1へ化けるバグ)を`sizeStep??1`へ修正。
 *   - テキスト注釈にMojiWaku(文字枠)という新規プロパティを追加。デフォルト0(通常の縁取り)、
 *     1で外周エッジライン非表示、2でエッジライン色を反転(白⇔黒)。左UIの配置リストで、
 *     文字サイズ変更ボタンの右にアイコンボタンを追加し、押すたびに0→1→2→0で循環する。
 * v0.0046:
 *   - 免責事項コメント本文から「（旧称・愛称：OSAKI Tech Lab）」の表記を削除し、
 *     「大崎建設株式会社 ICT推進室が独自に開発したものであり、」に統一。
 * v0.0045:
 *   - 距離測定ボタンのアイコンを📏(線ツールと同じ)から📐(三角定規)に変更し、線ツールと
 *     視覚的に区別できるようにした。
 * v0.0044:
 *   - 保存サブメニューのボタン名を「書出」→「保存（Arela）」に変更。
 *   - 会社名表記を「大崎建設株式会社 ICT推進室」に修正(Tech Labは愛称のため)。
 *   - 冒頭の免責事項コメントの会社名も同様に修正。
 *   - セキュリティ監査で発見: 左パネルのオブジェクト名表示・機器選択カードのアセット名表示が
 *     ユーザー入力/datファイルの値をエスケープせずinnerHTMLへ挿入しておりXSSリスクがあった。
 *     _escHtml()を追加して両箇所に適用。
 * v0.0043:
 *   - 1) Arecalayで入出力メニューを開いたままArecal→Arecalayと切り替えても展開状態(ボタン
 *     ロック含む)が残ってしまうバグを修正。exitPlacementMode()でclosePmIoMenu()を呼ぶように
 *     した。
 *   - 2) 入出力メニュー展開中、ESCキー・右クリックの両方でキャンセルできるようにした。
 * v0.0042:
 *   - logo-areaがArecalayモードで一緒に非表示になっていたのを修正(以前のセッションで混入した
 *     バグ)。元々の構成通り、ロゴは常時表示・その下にステップタブが並ぶようにした。それに伴い
 *     pm-left-panelの高さ指定をheight:100%からflex:1に変更(logo-area分の高さを正しく差し引いて
 *     レイアウトされるように)。
 *   - 距離測定のゴムライン(pmCv側)がスナップ点ではなく生のマウス座標に向かって描画されており、
 *     AreCal本体側のスナップ済みゴムラインと2本に見えてしまう問題を修正。AreCal本体側の
 *     window._getDistPoints()にスナップ座標(lastSnap優先、無ければlastMouseX/Y)を追加し、
 *     Arecalay側もそれと同じ終点を使うようにした。
 *   - 冒頭に免責事項・利用規約コメントを追加(自己責任・無断複製改変転載禁止)。
 * v0.0041:
 *   - 2) 距離測定モード中に矢印/線/円/図形ボタンを押すと両方同時に有効になり、クリックのたびに
 *     2つの機能が競合するバグを修正。setAnnotMode()で別ツールへ切り替える際、距離測定がONなら
 *     window.setDistMode(false)で強制OFFにするようにした。
 *   - 3) 距離測定の実線・ゴムラインをArecalayのオブジェクトレイヤー(pmCv、z-index的に最前面)にも
 *     描画するようにし、Arecalayの図形と重なっても常に手前に見えるようにした。AreCal本体側に
 *     window._getDistPoints()を追加して点列を取得。
 *   - 3) 距離測定モード中はオブジェクトへのマウスホバーによるカーソル変化(grab/pointer/move)を
 *     停止し、常に十字カーソルを維持するようにした。
 * v0.0040:
 *   - 4) 距離測定モード中、Arecalayのオブジェクト選択(hitTestCSS)が優先されてしまい距離が
 *     測れないバグを修正。window._isDistModeOn()がtrueの間はArecalay側の選択処理を完全に
 *     スキップし、クリックをそのままAreCal本体の距離測定処理に渡すようにした。
 * v0.0039:
 *   - 3) 正式CalayMachineryData.datで実データ確認。「平面」の重機・車両カテゴリのうちrotate系
 *     (バックホー/クローラー等)はcolor_svgを持たないが、drawMachinery側は元々rotate/array系の
 *     upper_svgにも常にfillColor(ann.color)を適用して描画していた(renderRotate/renderArray等)。
 *     つまり色変更自体は描画パイプライン上は既に効くのに、左パネルのhasHatch判定がcolor_svgの
 *     有無だけを見ていたため、これらの資産だけ色変更UIが「×」(変更不可)表示になっていた。
 *     hasHatch判定にupper_svgの有無も追加し、該当アセットでも色変更ボタンが有効になるよう修正。
 *     (static系はupper_svgを持たないため従来通りcolor_svgの有無のみで判定)
 * v0.0038:
 *   - 3) 左パネルの配置済みリストで、ハッチング無し図形の「×」表示(pm-color-none)がliのクリック
 *     (選択)処理から除外されていなかったのを修正(pm-color-dotと同様に除外)。
 *     ただし報告された「表示切替と色変更の両方が表示切替として動作する」という主症状は、
 *     現状のコード(pm-vis-btn/pm-color-dotは別要素・別ハンドラで、双方ともev.stopPropagation()済み)
 *     を読む限り再現条件を特定できず。CalayMachineryData.datが現在ダミー(空)のため実データでの
 *     確認ができていない。正式dat到着後、該当の「平面」「重機・車両」アセットで再現するか要確認。
 * v0.0037:
 *   - 17) 画面外表示エリア拡張、Arecalay側対応。pmCvの見た目サイズ/位置/transformをAreCal本体の
 *     draw-cv(_CPAD拡張済み)に追従させ、renderPmLayer冒頭でpmCtx.translate(pmCpad,pmCpad)して
 *     描画側だけオフセットを吸収する方式に変更(AreCal本体のdrawCtx.translate(_CPAD,_CPAD)と同じ考え方)。
 *     pdfCvLeft/pdfCvTop/pixelScale(マウス→格納座標変換の基準)はpdf-cv基準のまま不変更 —
 *     ここを触ると座標ズレが再発するので注意(前回セッションで実際に事故った箇所)。
 *     副作用として getPaperScale() がpmCv寸法基準になっていたため紙面(pdf-cv)寸法基準に修正、
 *     PDF出力側(pmDoExportPDF)のpmCvサンプリング位置もdraw-cvと同じmnX,mnY基準に修正。
 * v0.0034 (v0.9.32):
 *   - 円選択時に半径グリップ(白丸)を表示し、現在の半径を「r=○.○○m」の形でリアルタイム表示するように
 *     した。ホバー時も同様にグリップを薄く表示。ドラッグ中も半径ラベルが更新される。
 * v0.0033 (v0.9.31):
 *   - 円ツール(B4)を新規追加。「⭕ 円」ボタン→中心をクリック→ダイアログで半径(m)を入力→
 *     現在の縮尺(scaleDenom)に合わせた円を描画。線と同じ線種サイクル(実線/点線A/点線B/一点鎖線、
 *     ダブルクリックで切替)・色変更に対応、内部は常に透明(線のみ)。
 *   - 中心をドラッグで移動、円周上の1点(0°方向)をドラッグで半径変更が可能。矢印キーでの微調整移動、
 *     種別表示(B3)パネル、サイズ変更(±)にも対応済み。
 *   - C2: 左パネルの削除ボタンをAreCal本体と同じ「✕」スタイルに統一(🗑から変更)。
 *   - C1について確認：左パネルのオブジェクト名クリックで選択を切り替える処理(Shift時は複数選択)は
 *     既存コードに実装済みであることを確認(今回変更なし)。
 * v0.0032 (v0.9.30):
 *   - 左パネル最下部に「🏷 種別表示」ボタンを新設(B3)。押すと重機5カテゴリ(重機・車両/仮設・資材/
 *     足場材/作業/その他)＋矢印/テキスト/線の計8種別について、表示/半透明/非表示を一括切替できる
 *     パネルが開く。個別オブジェクトの表示状態(ann.visibility)にそのまま反映され、範囲は現在のStepのみ。
 * v0.0031 (v0.9.29):
 *   - 右パネルの常時表示「保存」「読込」「PDF出力」ボタンを廃止し、AreCal本体と同じ「入出力」展開メニュー
 *     (📥読込／📤書出、書出の中に書出+PDF出力)に統一(A1/A2)。「保存」→「書出」に改称。
 *   - 「元に戻す」「やり直す」ボタンを右パネルから左パネル最下部(オブジェクトリストの下)に移動(B2)。
 *   - pmLoadJSON()の読込ダイアログでArelaファイルを選択した場合、専用の警告(AreCal・Arecalay両方の
 *     現在の内容が置き換わる旨)を出してからwindow.loadArela()に委譲するようにした(A3)。
 * v0.0030 (v0.9.28):
 *   - pmLoadJSON()のsteps復元部分をapplyPmData()として分離し、window._pmApplyDataとして公開。
 *     AreCal本体側のloadArela()がArecalayデータ(calay)を復元する際に使用。
 * v0.0029 (v0.9.27):
 *   - Arecalay保存(#pm-save-btn)を「オブジェクト」「全体」「キャンセル」の3択ダイアログに変更。
 *     「オブジェクト」=従来通りcalay出力、「全体」=AreCal本体側のsaveArela()を呼びArela統合出力。
 *   - pmSaveJSON()のデータ組み立て部分をbuildPmSaveData()として分離し、window._pmBuildSaveDataとして公開
 *     （AreCal本体側のsaveArela()がArecalayデータを取得するために使用）。
 * v0.0028 (v0.9.26):
 *   - Arecalayの保存ファイル拡張子を .json → .calay に変更（中身の形式はJSONのまま、拡張子だけ偽装）。
 *     読込側(pmLoadJSON)のファイル選択ダイアログも .calay を選べるよう拡張。
 * v0.0027 (v0.9.25):
 *   - AreCal本体側の起動時Dat先読みゲート(#dat-gate)向けに、window._pmLoadMachineryFile
 *     (=loadMachineryFile本体を公開) と window._pmMachineryCount (読込済み件数を返す関数) を追加公開。
 *   - CalayMachineryData.datの読込状況が変化するたび(自動読込tryAutoLoadMachinery完了時／
 *     手動loadMachineryFile成功時)に 'arecalay:machinery-status' カスタムイベントをwindowへdispatch
 *     するように変更。AreCal本体側のゲート表示切替はこのイベント経由で行う。
 *   - loadMachineryFile成功時、placementMode中なら即座にrenderPmLayer()を呼び、
 *     既に☒表示になっているオブジェクトがあればその場で復帰するようにした(保険的対応)。
 * v0.0026 (v0.9.24):
 *   - 線を描いた直後にも「線種を変えるときは線をダブルクリックしてください」と
 *     トースト表示するように追加（矢印と同じ5分クールダウン）
 *   - テキストの回転基準を左端(lx,ly)から見た目の中心へ変更。lx,ly自体は互換のため
 *     従来通り左端アンカーとして保持し、回転の原点・ドラッグ角度計算・当たり判定を
 *     すべて中心基準に統一（drawText/hitTestCSS/回転ドラッグ処理）。
 *     ※既存の保存データで既に回転済みのテキストは、この変更で見た目の位置が変わる点に注意
 *   - 両端矢印(both)で半透明にした時、軸(シャフト)だけ矢じりより色が濃く見えるバグを修正。
 *     軸が2回分アルファ合成されていたのが原因。drawArrowRawにskipShaft引数を追加し、
 *     軸は片方の呼び出しでしか描かないように変更
 * v0.0025 (v0.9.23):
 *   - 線(line)の左UI表示ボタンを他タイプと共通の visible→translucent→hidden に統一
 *     （半透明表示を復活。点線表示はこのボタンの役目から外した）
 *   - 線をダブルクリックする度に「実線→点線A(狭)→点線B(広)→一点鎖線→実線」と
 *     切り替わるように変更（矢印の向き切替と同じ操作方式。ann.lineStyleで保持）
 *
 * [過去の主な履歴]
 * v0.0024 (v0.9.22): 矢印向き変更ヒントのトースト文言修正（「中央付近」削除）
 * v0.0023 (v0.9.21): 両方向矢印(both)で軸が矢じりの先から突き出るバグ修正(trimStart引数追加)
 * v0.0022 (v0.9.20): 矢印をダブルクリックで順方向→逆方向→両方向を切替可能に(ann.arrowDir)、
 *   描いた直後に向き変更ヒントをトースト表示(5分クールダウン)
 * v0.0021 (v0.9.19): 選択強調の点滅速度を確定値に設定、配置リストでハッチング無しオブジェクトは
 *   「色〇」の代わりに「×」表示、古いバージョン別コメントを整理
 * v0.0020 (v0.9.18): 選択強調をsin波グラデ→チカチカ点滅方式に変更(line/arrow/text/オブジェクト共通、
 *   速度と暗さはPM_SELECT_BLINK_MS/LOWで調整可能)
 * v0.0019 (v0.9.17): オブジェクト選択モーダル刷新(サムネイルBBoxフィット／フィルター記憶／
 *   サイズ3段階／sort_no・order_no順ソート)、テキスト入力ダイアログに色・サイズ欄追加、
 *   右パネル操作説明を下部へ移動＋フィードバックボタン追加、PDF出力に線の太さスライダー追加
 * v0.0018 (v0.9.16): pixelScale異常時フォールバック修正、ズームクランプ下限引き下げ
 * v0.9.14 - v0.9.15: ツール排他制御の完全化、ステータスバー・操作ガイドの文言整理
 * v0.9.11 - v0.9.13: ホバーフィードバック追加、テーマカラー動的切替(青/緑)、UI透け防止
 * v0.9.9  - v0.9.10: 矢印・テキスト表示サイズの大幅拡大、ズーム時の当たり判定修正
 */
(function () {
  'use strict';

  const ARECALAY_VER = '0.0070'; // A008(AreCal_Touch): union-btn hoverのsticky対策+_pmHasCancelable公開
  window._pmVersion = ARECALAY_VER;
  const COLORS      = ['#ff4081','#e8a020','#188C1C','#1B3EAB','#aaaaaa','#ff8c00','#111111'];
  const PM_UNDO_MAX = 30;
  
  const ARROW_LW    = [7, 14, 21, 33, 57, 90];  // v0.0055: 呼称0(index0)を新設。太さは元に戻す（矢じりだけ拡大方針に変更）
  const LINE_LW     = [4, 7, 10, 14, 21, 33, 57, 90];   // v0.0055: 呼称0(index0)を新設。線を7段階化(3~7は矢印の太さ1~5と同じ値)
  const TEXT_FS     = [20, 40, 56, 80, 112, 160]; // v0.0048: 呼称0のサイズを20pxに変更(index0=呼称0)

  let placementMode = false;
  let pmIoMenuOpen = false, pmIoWriteOpen = false; // v0.0408: 入出力メニュー統一用
  let _pmExporting  = false; // true の間は編集補助線(複写の黄色連結バー等)を描画しない
  // PDF出力時のArecalayオブジェクト(ベクトル)の線の太さ。1=細い/2=中間(デフォルト)/3=太い
  // 従来の固定線幅(0.5 / 0.8)が「3=太い」の見た目に相当するため、1.0を基準に縮小する比率で管理
  let pmLineWeightLevel = 2;
  const PM_LINE_WEIGHT_RATIO = {1: 0.5, 2: 0.75, 3: 1.0};

  // 選択中オブジェクトの強調表示。旧来のなめらかなグラデ(sin波)は
  // 「わかりにくい/うざい」との指摘があったため、完全透過にはしない
  // 「チカチカ点滅」方式に変更。速度・薄さはここの2変数だけで調整できる。
  let PM_SELECT_BLINK_MS  = 500;  // 点滅の切替間隔(ミリ秒)。小さくすると速く点滅する ※マスター確定値(500ms)
  let PM_SELECT_BLINK_LOW = 0.35; // 点滅の暗い側の不透明度(0=完全透過 / 1=不透明、完全透過にはしない) ※マスター確定値
  function _selectBlinkAlpha() {
    const phase = Math.floor(Date.now() / Math.max(50, PM_SELECT_BLINK_MS)) % 2;
    return phase === 0 ? 1.0 : PM_SELECT_BLINK_LOW;
  }
  let annotMode     = null;
  let arrowStart    = null;
  let lineStart     = null;
  // 矢印の「向き変更ヒント」トースト：連続で出るとウザいので前回表示から一定時間は再表示しない
  let _lastArrowDirToastAt = 0;
  let _lastLineStyleToastAt = 0; // 線の「線種変更ヒント」トースト用(同じクールダウン時間を流用)
  const ARROW_DIR_TOAST_COOLDOWN_MS = 5 * 60 * 1000; // 5分
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
  let pmCpad        = 0; // v0.0411: 17) syncPmCvで確定する実際の描画オフセット量(draw-cv追従時のみ_CPAD、それ以外0)
  let _pmLastMouseCX = null, _pmLastMouseCY = null; // v0.0413: 3) 距離測定ゴムラインをpmCv側に描画するための現在マウス位置
  let selectedUuids = new Set();
  let defArrowStep  = 1;
  let defLineStep   = 1;
  let defTextStep   = 1;
  let defTextColor  = COLORS[5]; // テキストの前回使用色を記憶して次回のデフォルトにする
  let machineryData = {};
  let selectedAssetId = null;
  let _mpLastCat    = 'all'; // オブジェクト選択モーダルの前回カテゴリーを記憶
  let _mpLastDiv    = 'all'; // オブジェクト選択モーダルの前回区分を記憶
  let _mpThumbLevel = 1;     // オブジェクト選択モーダルのサムネイル倍率(1/1.5/2)

  let hoverUuid     = null;
  let dragState     = null;

  let lastClickMs   = 0;
  let lastClickUuid = null;

  let pmCv = null, pmCtx = null;
  // v0.0466: syncPmCvはrAFループから毎フレーム(placementMode中は無条件で永久に)呼ばれるため、
  // 同じ静的なcanvas要素(#pdf-cv/#draw-cv、ページ内で1個だけ・再生成されない)への
  // getElementByIdをフレーム毎に行うのは無駄。一度だけ取得してキャッシュする(挙動は不変)。
  let _pmPdfElCache = null, _pmDrawCvCache = null;
  // v0.0467: startPmLoopが「変化の有無に関わらず毎フレーム無条件で描画し続ける」問題への対応。
  // 個別のミューテーション箇所を全て洗い出す(見落としリスクが高い)代わりに、
  // 「ユーザー操作は必ず何らかのDOMイベントを伴う」という前提のもと、幅広いイベント種別の
  // 発生時刻だけを記録し、直近_PM_IDLE_GRACE_MS以内に何かしら操作があった場合のみ
  // syncPmCv()+renderPmLayer()を実行する。操作が無ければ完全に描画をスキップする(要件：
  // 「全く触ってない状態では止める」)。ドラッグ・ホバー追従中はpointermove自体が
  // 継続発火し続けるため、動きが必要な間は従来通り毎フレーム描画される。
  let _pmLastActive = 0;
  const _PM_IDLE_GRACE_MS = 400;
  function _pmMarkActive(){ _pmLastActive = performance.now(); }
  let pmRightPanel = null, pmLeftPanel = null;

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
        /* A008: マスター指摘 — AreCal本体側でA003にて全:hoverルールをsticky hover対策として
           @media(hover:hover)で囲ったが、この#union-btn:hoverはArecalayテーマ適用時に
           !important付きで後から上書きするため、メディアクエリの外にあると対策が効かなく
           なってしまう(Arecalayモード中だけ症状がぶり返す)。同じ対策をここにも適用する。 */
        @media (hover:hover) and (pointer:fine){
          #union-btn:hover {
            background: rgba(76, 175, 80, 0.4) !important;
            color: #fff !important;
          }
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
    // v0.0411: 17) pmCvはdraw-cv追従でサイズが拡張(_CPAD込み)されたため、
    // 紙面サイズの基準は従来通りpdf-cv(実PDFページ寸法)から取る
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
    // A008: マスター指摘 — AreCal本体の常設キャンセルボタン(追1対応、A003)はAreCal側の状態
    // (drawing/distMode等)しか見ておらず、Arecalay側だけがキャンセル可能な状態(注釈モード中・
    // 機器ピッカー表示中・入出力メニュー展開中)ではボタンが表示されないままだった。
    // AreCal側のポーリング判定にこれを組み込めるよう公開する。
    window._pmHasCancelable     = () => !!(annotMode || pmIoMenuOpen || document.getElementById('pm-machinery-picker'));
    tryAutoLoadMachinery();
  }

  // v0.0027: Dat読込状況の変化をAreCal本体側(#dat-gate)へ知らせるイベント
  function _pmAnnounceMachineryStatus() {
    const count = Object.keys(machineryData).length;
    window.dispatchEvent(new CustomEvent('arecalay:machinery-status', {detail:{count}}));
    return count;
  }

  // v0.0053: 重機データ(.dat)がGZIP圧縮されている場合に自動展開してからテキスト化する共通ヘルパー。
  // 先頭2バイトがGZIPマジックナンバー(0x1f,0x8b)かどうかで、圧縮版/従来の生テキスト版を自動判別する
  // (=旧来の非圧縮.datファイルも引き続きそのまま読み込める)。
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

  // v0.0054: 正規表現([\s\S]*の貪欲マッチ)をやめ、indexOf/lastIndexOfによる軽量な切り出しに変更。
  // 実測では正規表現でも指数関数的な遅延(ReDoS)は発生しない([\s\S]*は入れ子の量指定子が無いため該当しない)が、
  // indexOf方式の方が桁違いに高速(9MB級でも1ms未満)かつ今後データが増えても安全なため採用。
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

  async function tryAutoLoadMachinery() {
    try {
      const resp = await fetch('./CalayMachineryData.dat', {cache:'no-cache'});
      if (resp.ok) {
        const buf  = await resp.arrayBuffer();
        const text = await _decodeMachineryBytes(buf);
        const objText = _extractMachineryObjectText(text);
        if (objText) machineryData = _migrateMachineryCategories(JSON.parse(objText));
      }
    } catch(_) {
      // file:// 運用など、fetchが失敗する環境では手動読込(#dat-gate)に委ねる
    }
    _pmAnnounceMachineryStatus();
  }

  function buildPmCanvas() {
    pmCv = document.createElement('canvas');
    pmCv.id = 'pm-cv';
    Object.assign(pmCv.style, {
      position:'absolute', display:'none', left:'0', top:'0',
      zIndex:'11', pointerEvents:'none', transformOrigin:'0 0',
      willChange:'transform' // v0.0051: iOS Safariでの再描画コンポジット不具合対策(AreCal側draw-cvと同じ対応)
    });
    const cvw = document.getElementById('cv-wrap');
    if (cvw) cvw.appendChild(pmCv);
    else document.body.appendChild(pmCv);
    pmCtx = pmCv.getContext('2d');
  }

  function syncPmCv() {
    const pdfEl = _pmPdfElCache || (_pmPdfElCache = document.getElementById('pdf-cv'));
    if (!pdfEl || !pmCv) return;
    // v0.0411: 17) 画面外表示エリア拡張(Arecalay側)
    // pmCvの「見た目サイズ・位置・変形」はAreCal本体のdraw-cv(_CPAD分拡張済み)に追従させる。
    // ただし pdfCvLeft/pdfCvTop/pixelScale は従来通り pdf-cv 基準のまま変更しない
    // (ann.x/ann.y等の格納座標はpdf-cv原点基準で保存されているため、ここを変えると
    //  マウス→格納座標の変換(hitTestCSS/getLogical等)が全てズレる。過去に事故った箇所)。
    // 描画時のオフセットはrenderPmLayer側でpmCtx.translate(pmCpad,pmCpad)として個別に加える。
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

  function startPmLoop() {
    (function loop() {
      requestAnimationFrame(loop);
      if (!placementMode) return;
      // v0.0467: 直近_PM_IDLE_GRACE_MS以内に操作が無ければ、この回の描画をスキップして
      // 完全にアイドル状態にする(バッテリー・発熱対策)。
      if (performance.now() - _pmLastActive > _PM_IDLE_GRACE_MS) return;
      syncPmCv();
      renderPmLayer();
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
        <!-- v0.0408: AreCal本体の入出力メニューと同じ見た目・挙動に統一 -->
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
    // A003(AreCal_Touchマスター実機報告): 矢印/線/円/テキストはsetAnnotMode()のトグルで
    // 再タップ=キャンセルになっているのに、図形(機器)ボタンだけopenMachineryPickerを毎回
    // 無条件に呼んでいたため、開いている状態で再タップすると毎回ダイアログが再生成されて
    // しまっていた(キャンセルにならない)。既に開いている時はcloseMachineryPickerを呼ぶよう修正。
    pmRightPanel.querySelector('#pm-machinery-btn').onclick      = () => {
      if (document.getElementById('pm-machinery-picker')) {
        closeMachineryPicker();
      } else {
        openMachineryPicker();
      }
    };
    pmRightPanel.querySelector('#pm-dist-btn').onclick      = () => {
      // v0.0409: 15) AreCal本体の距離測定機能をArecalayからも呼び出す
      cancelAnnotMode();
      closeMachineryPicker();
      if (typeof window.setDistMode === 'function') {
        const on = typeof window._isDistModeOn === 'function' ? window._isDistModeOn() : false;
        window.setDistMode(!on);
        // v0.0413: 3) 距離測定ON時は即座に十字カーソルに、OFF時は通常カーソルに戻す
        pmCv.style.cursor = !on ? 'crosshair' : 'default';
      }
    };

    // v0.0412: 4) AreCal本体と同様、入出力メニューを開いている間は他の配置ツールを操作不可にする
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
      // PDF出力を押したら、進行中の他ツール(矢印/テキスト/オブジェクト配置)は全てキャンセルする
      cancelAnnotMode();
      closeMachineryPicker();
      doPdfExport();
      closePmIoMenu();
    };
    pmRightPanel.querySelector('#pm-save-btn').onclick      = () => {
      // v0.0409: 1) 保存形式をArelaに一本化。旧「オブジェクト(calay単体)」選択肢は廃止
      closePmIoMenu();
      if (typeof window.saveArela === 'function') {
        window.saveArela();
      } else {
        pmSaveJSON(); // 保険（AreCal本体側が読み込まれていない場合）
      }
    };
    pmRightPanel.querySelector('#pm-clear-btn').onclick     = pmClearAll;
    pmRightPanel.querySelector('#pm-copy-btn').onclick      = showCopyDialog;

    pmRightPanel.querySelector('#pm-arrow-step-dn').onclick = () => {
      defArrowStep = Math.max(0,defArrowStep-1); // v0.0055: 呼称0を追加
      pmRightPanel.querySelector('#pm-arrow-step-lbl').textContent = defArrowStep;
    };
    pmRightPanel.querySelector('#pm-arrow-step-up').onclick = () => {
      defArrowStep = Math.min(5,defArrowStep+1);
      pmRightPanel.querySelector('#pm-arrow-step-lbl').textContent = defArrowStep;
    };
    pmRightPanel.querySelector('#pm-line-step-dn').onclick = () => {
      defLineStep = Math.max(0,defLineStep-1); // v0.0055: 呼称0を追加
      pmRightPanel.querySelector('#pm-line-step-lbl').textContent = defLineStep;
    };
    pmRightPanel.querySelector('#pm-line-step-up').onclick = () => {
      defLineStep = Math.min(7,defLineStep+1);
      pmRightPanel.querySelector('#pm-line-step-lbl').textContent = defLineStep;
    };
    pmRightPanel.querySelector('#pm-text-step-dn').onclick = () => {
      defTextStep = Math.max(0,defTextStep-1); // v0.0047: 呼称0を追加
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
    pmLeftPanel.querySelector('#pm-undo-btn').onclick = pmUndo; // v0.0408: 右パネルから左パネル最下部へ移動
    pmLeftPanel.querySelector('#pm-redo-btn').onclick = pmRedo;
    pmLeftPanel.querySelector('#pm-vistype-btn').onclick = openVisTypePanel; // v0.0409
    // v0.0457: AreCal本体の「PDFをグレースケール表示」トグル(#gray-toggle)と同じ pdfGrayscale
    // 変数・pdfCv要素を共有するボタンをArecalay側にも新設。どちらの画面でON/OFFしても
    // もう一方の見た目にも反映されるよう、クリック時に相互で見た目を同期する。
    const grayBtn = pmLeftPanel.querySelector('#pm-gray-toggle');
    _syncGrayBtn(grayBtn);
    grayBtn.onclick = () => {
      pdfGrayscale = !pdfGrayscale;
      const pdfCvEl = document.getElementById('pdf-cv');
      if (pdfCvEl) pdfCvEl.style.filter = pdfGrayscale ? 'grayscale(1)' : 'none';
      _syncGrayBtn(grayBtn);
      const arecalBtn = document.getElementById('gray-toggle');
      if (arecalBtn) arecalBtn.classList.toggle('on', pdfGrayscale);
    };
    updatePlacedList();
    updateTabUI();
  }

  // v0.0457: pm-gray-toggleの見た目(ON/OFF)を現在のpdfGrayscaleに合わせる
  function _syncGrayBtn(btn) {
    if (!btn) return;
    const on = !!pdfGrayscale;
    btn.classList.toggle('on', on);
    btn.style.background  = on ? 'rgba(76,175,80,.35)' : 'rgba(150,150,150,.18)';
    btn.style.borderColor = on ? '#4caf50' : '#888';
    btn.style.color       = on ? '#fff' : '#ccc';
  }

  function registerEvents() {
    // v0.0467: startPmLoopのアイドル検出用。ユーザー操作は必ずこのいずれかのイベントを伴う
    // という前提で、幅広く「活動があった」時刻だけを記録する(個別機能の洗い出しはしない)。
    ['pointerdown','pointermove','pointerup','wheel','keydown','click','input','change',
     'drop','dragover','dragstart','dragend'
    ].forEach(evt => document.addEventListener(evt, _pmMarkActive, {capture:true, passive:true}));
    window.addEventListener('resize', _pmMarkActive, {passive:true}); // resizeはdocumentにバブルしないためwindowに個別登録

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
        }
        return;
      }
      // 選択中オブジェクトを矢印キーで微調整移動（Arecalay限定・Shiftで大きく移動）
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
        }
        return;
      }
      if (e.ctrlKey && e.code==='KeyZ' && !e.shiftKey) { e.stopPropagation(); e.preventDefault(); pmUndo(); return; }
      if ((e.ctrlKey&&e.code==='KeyY')||(e.ctrlKey&&e.shiftKey&&e.code==='KeyZ')) {
        e.stopPropagation(); e.preventDefault(); pmRedo(); return;
      }
      if (e.key==='Escape') {
        // v0.0414: 2) 入出力メニュー展開中はまずそちらを閉じる(距離測定より優先。距離測定は
        // 入出力メニュー展開中は_lockPmToolButtonsでボタン自体が無効化されているため到達しない想定だが、念のため先に処理)
        if (pmIoMenuOpen) {
          e.stopPropagation();
          closePmIoMenu();
          _toast('↩ 入出力をキャンセル', 800);
          return;
        }
        // v0.0409: 15) 距離測定モード中はまずそちらをキャンセル(AreCal側の関数を呼ぶ)
        if (typeof window._isDistModeOn === 'function' && window._isDistModeOn()) {
          e.stopPropagation();
          window.setDistMode(false);
          _toast('↩ 距離計測をキャンセル', 800);
          return;
        }
        e.stopPropagation();
        document.getElementById('pm-text-float')?.remove();
        if (annotMode) cancelAnnotMode();
        else { selectedUuids.clear(); updatePlacedList(); }
      }
    }, {capture:true});

    document.addEventListener('pointerdown', function(e) { // v0.0050: タブレット対応Step1でpointerdownに置換(中身は無変更)
      if (!placementMode) return;
      const drawCv = document.getElementById('draw-cv');
      if (e.target !== drawCv && e.target !== pmCv) return;
      if (e.button===1) return;
      if (e.button===0 && spaceHeld) return;

      if (e.button===2) {
        // v0.0409: 15) 距離測定モード中は右クリック(1回戻る)をAreCal側に渡す
        if (typeof window._isDistModeOn === 'function' && window._isDistModeOn()) return;
        e.stopPropagation(); e.preventDefault();
        if (annotMode) { cancelAnnotMode(); return; }
        selectedUuids.clear(); updatePlacedList();
        return;
      }

      if (e.button===0) {
        if (annotMode) {
          e.stopPropagation();
          handleCanvasClick(e);
        } else if (typeof window._isDistModeOn === 'function' && window._isDistModeOn()) {
          // v0.0413: 4) 距離測定モード中はArecalayのオブジェクト選択を完全に無効化し、
          // クリックをそのままAreCal本体の距離測定処理に渡す(選択が優先されて測定できないバグの修正)
          return;
        } else {
          const hit = hitTestCSS(e.clientX-pdfCvLeft, e.clientY-pdfCvTop);
          if (hit) e.stopPropagation();
          // v0.0051: 元は if(hit){...handleEditClick} で、何もない場所をクリックした時に
          // handleEditClick(e,null)が一切呼ばれず、内部の「!hit→selectedUuids.clear()」が
          // 常にデッドコードになっていた(選択解除する手段が無いバグ)。hit有無に関わらず必ず呼ぶよう修正。
          handleEditClick(e, hit);
        }
      }
    }, {capture:true});

    document.addEventListener('pointermove', function(e) { // v0.0050: タブレット対応Step1でpointermoveに置換(中身は無変更)
      if (!placementMode) return;
      _pmLastMouseCX = e.clientX; _pmLastMouseCY = e.clientY; // v0.0413: 3)
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
        return;
      }
      if (annotMode==='machinery' && selectedAssetId) {
        previewPos = getLogical(e);
        return;
      }
      if (!annotMode) {
        // v0.0413: 3) 距離測定モード中はオブジェクトホバーによるカーソル変化(grab/pointer/move等)を
        // 一切行わず、常に十字カーソルを維持する
        if (typeof window._isDistModeOn === 'function' && window._isDistModeOn()) {
          pmCv.style.cursor = 'crosshair';
        } else {
          updateHoverCursor(e);
        }
      }
    }, {capture:true});

    document.addEventListener('pointerup', function(e) { // v0.0050: タブレット対応Step1でpointerupに置換(中身は無変更)
      if (!placementMode || !dragState) return;
      e.stopPropagation();
      endDrag();
    }, {capture:true});

    document.addEventListener('contextmenu', function(e) {
      if (!placementMode) return;
      // v0.0414: 2) 入出力メニュー展開中は右クリックでキャンセルできるようにする(キャンバス外でも可)
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
      // v0.0413: logo-areaも一緒に非表示にしてしまっていたのを修正(以前のセッションで混入したバグ)。
      // 元々はロゴが常時表示、その下にステップタブが並ぶ構成だったため、logo-areaは除外する
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
    // 配置モード開始時に隠したArecal左UI(矩形リスト等)を元に戻す処理が
    // 抜けていた。これが原因でArecalay→Arecal復帰後、左UIの表示が更新されなくなっていた。
    document.querySelectorAll('[data-pm-hidden-left]').forEach(el => { el.style.display=''; delete el.dataset.pmHiddenLeft; });
    cancelAnnotMode();
    closePmIoMenu(); // v0.0414: Arecalay→Arecal復帰後も入出力メニュー(ロック状態含む)が
                     // 残ってしまい、再度Arecalayに戻ると入出力ボタンが押しっぱなしになるバグの修正
    // v0.0413: Arecalay→AreCal復帰時、Arecalayで起動していたAreCal本体側の距離測定が
    // キャンセルされずに残ってしまうバグを修正。AreCal/Arecalayは排他使用の方針のため、
    // モード切替時は必ず全ての進行中操作をキャンセルする
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

  /* ツール排他制御 */
  function setAnnotMode(mode) {
    annotMode = (annotMode===mode) ? null : mode;
    if (annotMode !== 'machinery') selectedAssetId = null;
    arrowStart=null; lineStart=null; previewPos=null;

    // v0.0413: 2) 距離測定モード中に矢印/線/円/テキスト/図形ボタンを押すと両方同時に有効になり
    // クリックのたびに2つの機能が競合するバグを修正。別ツールへ切り替える際は距離測定を強制OFFにする
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
  }

  function syncToolBtns() {
    ['arrow','text','line','circle'].forEach(m => {
      const b = document.getElementById(`pm-${m}-btn`);
      if (b) b.classList.toggle('on', annotMode===m);
    });
  }

  // テキストのみの一覧をやめ、サムネイル付きの選択モーダルに変更
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
            <option value="scaffold">⚪️ 足場材</option>
            <option value="operation">🔴 作業</option>
            <option value="other">🟢 その他</option>
          </select>
        </div>
        <div id="pm-mp-body" style="flex:1;overflow-y:auto;min-height:120px;"></div>
      </div>`;
    document.body.appendChild(dlg);

    document.getElementById('pm-mp-close').onclick = () => closeMachineryPicker();
    dlg.addEventListener('pointerdown', e => { if (e.target === dlg) closeMachineryPicker(); }); // v0.0050: pointerdownに置換

    // 前回のカテゴリー/区分フィルターを復元
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

    // サムネイルサイズ切替(1x/1.5x/2x)、前回サイズを復元
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

  // v0.0412: 4) 入出力メニューを開いている間にロックする対象ボタン(AreCal本体の_IO_LOCK_BTNS相当)
  const _PM_IO_LOCK_BTNS = ['pm-arrow-btn','pm-text-btn','pm-line-btn','pm-circle-btn',
    'pm-machinery-btn','pm-dist-btn','pm-undo-btn','pm-redo-btn','pm-vistype-btn',
    'pm-copy-btn','pm-clear-btn'];
  function _ensurePmLockStyle() {
    if (document.getElementById('pm-lock-style')) return;
    const s = document.createElement('style');
    s.id = 'pm-lock-style';
    // !important付与。他のインラインstyle/CSSに左右されず確実にグレーアウトさせるため
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
  function closePmIoMenu() { // v0.0408
    pmIoMenuOpen = false; pmIoWriteOpen = false;
    const menu     = pmRightPanel.querySelector('#pm-io-menu');
    const writeSub = pmRightPanel.querySelector('#pm-io-write-sub');
    const writeBtn = pmRightPanel.querySelector('#pm-io-write-btn');
    if (menu)     menu.style.display = 'none';
    if (writeSub) writeSub.style.display = 'none';
    if (writeBtn) writeBtn.classList.remove('active');
    _lockPmToolButtons(false); // v0.0412: 4) ロック解除
  }
  // v0.0409: 種別表示（B3） — カテゴリ／注釈タイプ単位で表示状態(ON/半透明/OFF)を一括変更
  const PM_VISTYPE_DEFS = [
    {key:'heavy_vehicle', label:'🔵 重機・車両', match: a => a.type==='machinery' && (machineryData[a.assetId]?.category)==='heavy_vehicle'},
    {key:'temp_material', label:'🟡 仮設・資材', match: a => a.type==='machinery' && (machineryData[a.assetId]?.category)==='temp_material'},
    {key:'scaffold',      label:'⚪️ 足場材',     match: a => a.type==='machinery' && (machineryData[a.assetId]?.category)==='scaffold'},
    {key:'operation',     label:'🔴 作業',       match: a => a.type==='machinery' && (machineryData[a.assetId]?.category)==='operation'},
    {key:'other',         label:'🟢 その他',     match: a => a.type==='machinery' && (machineryData[a.assetId]?.category)==='other'},
    {key:'arrow',         label:'↗ 矢印',        match: a => a.type==='arrow'},
    {key:'text',          label:'💬 テキスト',    match: a => a.type==='text'},
    {key:'line',          label:'📏 線',         match: a => a.type==='line'},
    {key:'circle',        label:'⭕ 円',         match: a => a.type==='circle'},
  ];
  // 表示状態のUI上3段階(0=表示/1=半透明/2=非表示)を、タイプごとの実際のvisibility値へ変換
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
    if (placementMode) renderPmLayer();
  }
  function openVisTypePanel(){
    if (typeof window.customChoice !== 'function') return; // AreCal本体未準備時の保険
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
      const cur = curStates.length ? curStates[0] : -1; // 混在時は-1（どれもハイライトしない）
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
        openVisTypePanel(); // 状態を反映して再描画
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

    // アセットビルダー(scripts_v2.js)側で付与された並び順を反映
    // 優先度: sort_no(ユーザ指定) > order_no(エクスポート時の確定連番) > id(五十音/辞書順)
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

    // サムネイルサイズ倍率(1x/1.5x/2x)をグリッド・canvasに反映
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
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    const lower = asset.lower_svg || asset.svg || asset.left_svg || '';
    const color = asset.color_svg || '';
    const upper = asset.upper_svg || '';

    // 原点(赤グリップ)中心の固定スケール表示をやめ、当たり判定用に
    // 実装済みの_getAssetHitBoundsを流用して実形状のバウンディングボックスに
    // 合わせた中央寄せ＋フィット表示に変更（見切れ対策）
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
      thumbScale = Math.min(canvasEl.width / bw, canvasEl.height / bh) * 0.86; // 0.86: 余白
      offX = -(minX + maxX) / 2;
      offY = -(minY + maxY) / 2;
    } else {
      // フォールバック: 形状データが無い場合は旧来の原点中心固定スケール
      thumbScale = Math.min(canvasEl.width, canvasEl.height) / ((asset.real_width_m || 4) * 2.2);
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(thumbScale, thumbScale);
    ctx.translate(offX, offY);
    _drawFills(ctx, lower, '#888888', thumbScale);
    _drawFills(ctx, color, '#e0e0e0', thumbScale);
    _drawFills(ctx, upper, '#e0e0e0', thumbScale);
    _drawStrokes(ctx, lower, thumbScale);
    _drawStrokes(ctx, color, thumbScale);
    _drawStrokes(ctx, upper, thumbScale);
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
        // 矢印を描くたびに毎回出すとウザいので、前回表示から5分以上経った時だけヒントを出す
        const _nowMs = Date.now();
        if (_nowMs - _lastArrowDirToastAt > ARROW_DIR_TOAST_COOLDOWN_MS) {
          _lastArrowDirToastAt = _nowMs;
          _toast('矢印の向きを変えたい場合は、矢印をダブルクリックしてください', 3600);
        }
      }
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
        // 矢印と同様、線を描くたびに毎回出すとウザいので前回表示から5分以上経った時だけヒントを出す
        const _nowMsL = Date.now();
        if (_nowMsL - _lastLineStyleToastAt > ARROW_DIR_TOAST_COOLDOWN_MS) {
          _lastLineStyleToastAt = _nowMsL;
          _toast('線種を変えるときは線をダブルクリックしてください', 3600);
        }
      }
      return;
    }
    if (annotMode==='circle') { placeCircleDefault(lx, ly); return; }
    if (annotMode==='text') showTextInput(e.clientX, e.clientY, lx, ly);
  }

  // v0.0442: ③円ツール(B4) — 半径入力ダイアログを廃止。中心クリックと同時に、
  // 作図エリア(PDFページ寸法)の縦横長い方の10%を半径として即時作図する。
  // 半径の微調整はグリップ(円周上0°方向)をドラッグして行う(従来通り)。
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
  }

  function handleEditClick(e, hit) {
    const now = Date.now();
    const isDbl = hit && hit.uuid===lastClickUuid && now-lastClickMs < 400;
    lastClickMs   = now;
    lastClickUuid = hit ? hit.uuid : null;

    if (!hit) {
      selectedUuids.clear();
      updatePlacedList();
      return;
    }

    if (isDbl && hit.part==='body') {
      const ann = steps[currentStep].find(a=>a.uuid===hit.uuid);
      if (ann && ann.type==='text') {
        showTextInput(e.clientX, e.clientY, ann.lx, ann.ly, ann.uuid);
        return;
      }
      if (ann && ann.type==='arrow') {
        // 矢印の中央付近をダブルクリックする度に 順方向→逆方向→両方向 の順で切り替える
        pushPmUndo();
        const cycle = ['fwd','rev','both'];
        const cur   = ann.arrowDir || 'fwd';
        ann.arrowDir = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
        updatePlacedList();
        return;
      }
      if (ann && ann.type==='line') {
        // 線をダブルクリックする度に 実線→点線A(狭)→点線B(広)→一点鎖線→実線 の順で切り替える
        pushPmUndo();
        const cycle = ['solid','dashA','dashB','dashC'];
        const cur   = ann.lineStyle || 'solid';
        ann.lineStyle = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
        updatePlacedList();
        return;
      }
      if (ann && ann.type==='circle') {
        // v0.0409: 円も線と同じ線種サイクルで切替
        pushPmUndo();
        const cycle = ['solid','dashA','dashB','dashC'];
        const cur   = ann.lineStyle || 'solid';
        ann.lineStyle = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
        updatePlacedList();
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
      origCx: ann.cx, origCy: ann.cy, origR: ann.r, // v0.0409: 円用
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
        // 立面×反転(flip_x)時は、描画側と同じくマウスのX方向を鏡像にして扱う。
        // これをしないと、反転時に青グリップの位置・複写数がマウスと一致しなくなる。
        const flipXSign = (isElev && ann.flipped) ? -1 : 1;
        const dx   = flipXSign * (curLx - ann.lx), dy = curLy - ann.ly;
        const lxM = (dx * cosR - dy * sinR) / S;
        const lyM = -(dx * sinR + dy * cosR) / S;

        if (behavior === 'rotate') {
          // grip_blue_x/yが原点から見て斜めの位置にある場合、その初期角度
          // φ=atan2(gy,gx) を差し引かないと、マウス角度とグリップ表示位置がズレる
          // (反転の有無に関係なく発生するバグの根本原因だった)。
          const gx  = (asset.grip_blue_x != null) ? asset.grip_blue_x : (asset.real_width_m || 2) * 0.8;
          const gy  = asset.grip_blue_y || 0;
          const phi = Math.atan2(gy, gx);
          const thetaMouse = Math.atan2(curLy - ann.ly, curLx - ann.lx); // 生のマウス角度(非鏡像)
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
        // v0.0026: 回転の基準を左端(ann.lx,ann.ly)ではなく見た目の中心に変更
        const halfW = (ann._twPx || 0) / 2;
        let _rot = Math.atan2(curLy - ann.ly, curLx - (ann.lx + halfW));
        if (e.shiftKey) _rot = Math.round(_rot / (Math.PI / 2)) * (Math.PI / 2);
        ann.rotation = _rot;
      } else {
        ann.lx = dragState.origLx + ddx;
        ann.ly = dragState.origLy + ddy;
      }
    }
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
        const lw    = lwArr[ann.sizeStep??1] * pScale; // v0.0055: 呼称0対応でindex化方式変更(旧: sizeStep||1)-1)
        const lwSc  = lw * zoom;
        const grip  = Math.max(lwSc / 2 + 10, 14);
        const sx = ann.x1*zoom, sy = ann.y1*zoom;
        const tx = ann.x2*zoom, ty = ann.y2*zoom;
        if (Math.hypot(cssx-sx,cssy-sy) < grip) return {uuid:ann.uuid,part:'start'};
        if (Math.hypot(cssx-tx,cssy-ty) < grip) return {uuid:ann.uuid,part:'end'};
        if (distToSeg(cssx,cssy,sx,sy,tx,ty) < lwSc / 2 + 6)  return {uuid:ann.uuid,part:'body'};
      }
      if (ann.type==='circle') {
        const lw   = LINE_LW[ann.sizeStep??1] * getPaperScale(); // v0.0055: 呼称0対応でindex化方式変更
        const lwSc = lw * zoom;
        const grip = Math.max(lwSc / 2 + 10, 14);
        const cxs = ann.cx*zoom, cys = ann.cy*zoom, rS = (ann.r||0)*zoom;
        const gx = cxs + rS, gy = cys; // 半径グリップ：中心から右方向(0°)の円周上
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
          // 描画側(dir反転)と一致させる。反転時は逆側でヒットするように。
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
        // 本体判定は「赤グリップからの距離」ではなく実際の形状範囲で行う
        const localPt = _worldToAssetLocal(asset, ann, S, isElev, rotation, cssx/z, cssy/z);
        if (_hitAssetBody(asset, ann, localPt.x, localPt.y)) return {uuid:ann.uuid, part:'body'};
      }
      if (ann.type==='text') {
        const pScale   = getPaperScale();
        const fs       = TEXT_FS[ann.sizeStep ?? 1] * pScale; // v0.0047: 呼称0対応でindex化方式変更
        const rotation = ann.rotation || 0;
        const tw_css   = ann._twPx ? ann._twPx * zoom
                                   : ann.text.length * fs * zoom;
        const th_css   = ann._fsPx ? ann._fsPx * zoom * 0.7
                                   : fs * zoom * 0.65;
        // v0.0026: 回転の基準を左端ではなく中心に変更したため、当たり判定の原点も
        // tw_css/2だけ右へずらして中心基準に合わせる
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
    hoverUuid = hit ? hit.uuid : null;
    if (!hit) { pmCv.style.cursor = 'default'; return; }
    if (hit.part === 'rotate') { pmCv.style.cursor = 'crosshair'; return; }
    if (hit.part !== 'body')   { pmCv.style.cursor = 'grab'; return; }
    // オブジェクト(重機等)のボディは選択はできるが赤グリップ以外では移動できないため、
    // 移動可能に見える'move'カーソルは出さない（矢印/線/テキストはボディでも移動できるので'move'のまま）
    const ann = steps[currentStep].find(a => a.uuid === hit.uuid);
    pmCv.style.cursor = (ann && ann.type === 'machinery') ? 'pointer' : 'move';
  }

  function showTextInput(clientX, clientY, lx, ly, editUuid=null) {
    document.getElementById('pm-text-float')?.remove();
    const editAnn = editUuid ? steps[currentStep].find(a=>a.uuid===editUuid) : null;

    const isEdit = !!editUuid;
    const borderColor = isEdit ? '#40c8ff' : '#4caf50';
    const titleLabel  = isEdit ? '✏️ テキスト編集' : '📝 テキスト入力';

    // 色・サイズの初期値は編集中ならその値、新規なら前回使用値(記憶済み)
    let curColor = editAnn ? (editAnn.color || defTextColor) : defTextColor;
    let curSize  = editAnn ? (editAnn.sizeStep ?? defTextStep) : defTextStep; // v0.0047: 0が偽値化けするバグ修正
    const TEXT_COLORS = COLORS; // ['#ff4081','#e8a020','#188C1C','#1B3EAB','#aaaaaa','#ff8c00','#111111']

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

    // v0.0057: 定型文スタンプ機能。▼ボタンでテキスト候補を五十音行ごとに一覧表示し、クリックで入力欄に追記する
    // v0.0058: マスター指定の新リスト(ボタン変更.txt)に全面差し替え。旧リストとの主な変更点：
    // ・矢板をあ行→や行へ移動 / FL・感電注意を削除 / 既存構造物・既存利用→「既存」に統合
    // ・工事車両進入路→「工事車両」、コンクリート打設範囲→「打設範囲」(た行へ移動)、
    //   第三者立入禁止→「第三者」(立入禁止は既存のまま別枠で維持)、吊荷下立入禁止→「吊荷」に短縮
    // ・GLをか行→さ行へ移動
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
          // v0.0057: 1個選んだら自動的にパネルを閉じる(▲→▼)
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
        // v0.0057: 開いた時だけ画面内に収まる範囲で横幅を広げる(ページ全体はスクロールさせない)。
        // 縦方向は残りの表示可能高さに収め、それでも入りきらない場合だけパネル内部をoverflow-y:autoでスクロール
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
        // v0.0056: 開いた後、ダイアログ全体が画面外にはみ出さないよう位置を補正(スクロール発生防止)
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
      curSize = Math.max(0, curSize - 1); // v0.0047: 呼称0を追加
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
      // 次回のデフォルトとして記憶（右パネルの表示もあれば同期）
      defTextColor = curColor;
      defTextStep  = curSize;
      const lbl = pmRightPanel && pmRightPanel.querySelector('#pm-text-step-lbl');
      if (lbl) lbl.textContent = defTextStep;
      updatePlacedList();
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
    pmCtx.translate(pmCpad,pmCpad); // v0.0411: 17) draw-cv座標系に合わせるオフセット(AreCal本体のdrawCtx.translate(_CPAD,_CPAD)と同じ考え方)

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
          // v0.0410: 円選択時、半径グリップと現在の半径(m)を表示
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
      // v0.0442: ②defArrowStepはv0.0055でsizeStepと同じ直接index方式に統一済みなのに、
      // ここだけ旧来の-1(1始まり)換算＋太さ0.7倍のままだったため、実際の矢印より細く見えていた不具合を修正
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
      // v0.0442: ②同上(defLineStep版)。実際の線の太さに合わせる
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
    // v0.0413: 3) 距離測定の仮想線(ゴムライン)・累積軌跡をpmCv側にも描画して最前面化する。
    // pmCv(z-index:11)はdraw-cv(z-index:10、AreCal本体の距離測定はここに描画される)より手前なので、
    // ここで描き直すことでArecalayの図形と重なっても距離測定線が常に見えるようにする
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
          // v0.0413: 3) スナップ点が有効な間は必ずその座標を終点にする(AreCal本体側と完全に一致させ、
          // 「スナップ点への線」と「マウスカーソルへの線」の2本が見えてしまう問題を解消)
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
    pmCtx.restore(); // v0.0411: 17) 冒頭のsave()+translate(pmCpad,pmCpad)と対応
  }

  // AIS仕様のTwo-Passレンダリング用に、塗り(Fill)と輪郭線(Stroke)を分離
  function _drawFills(ctx, svgStr, defaultFill, scale) {
    if (!svgStr) return;
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
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      let currentFill = defaultFill;
      if (!currentFill) {
        const fillMatch = attrs.match(/fill=['"]([^'"]+)['"]/);
        currentFill = fillMatch ? fillMatch[1] : '#cccccc';
      }
      ctx.fillStyle = currentFill;
      ctx.fill();
      ctx.restore();
    }
  }

  function _drawStrokes(ctx, svgStr, scale) {
    if (!svgStr) return;
    // 画面編集中は従来通りの太さ(=レベル3相当)のまま変更せず、
    // PDF出力中(_pmExporting)のみ線の太さ設定(pmLineWeightLevel)を反映する
    const lwRatio = _pmExporting ? (PM_LINE_WEIGHT_RATIO[pmLineWeightLevel] || 1) : 1;
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
    ctx.save();
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = (0.8 / scale) * lwRatio;
    const lineRe = /<line\s+[^>]*?x1=['"]([^'"]+)['"]\s+y1=['"]([^'"]+)['"]\s+x2=['"]([^'"]+)['"]\s+y2=['"]([^'"]+)['"][^>]*?\/?>/g;
    ctx.beginPath();
    while ((m = lineRe.exec(svgStr)) !== null) {
      ctx.moveTo(parseFloat(m[1]), parseFloat(m[2]));
      ctx.lineTo(parseFloat(m[3]), parseFloat(m[4]));
    }
    ctx.stroke();
    const circRe = /<circle\s+[^>]*?cx=['"]([^'"]+)['"]\s+cy=['"]([^'"]+)['"]\s+r=['"]([^'"]+)['"][^>]*?\/?>/g;
    while ((m = circRe.exec(svgStr)) !== null) {
      ctx.beginPath();
      ctx.arc(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* scaleDenomから論理px係数を算出 */
  function _getMachScale(asset, ann) {
    const sDenom = typeof scaleDenom !== 'undefined' ? scaleDenom : 100;
    return (11340 / sDenom) * (ann.sizeMultiplier || 1);
  }

  // v0.0409: 円ツール(B4)用 実距離(m)⇔canvas px 変換。AreCal本体の縮尺換算式と同一
  // (mpp = (25.4/72)*scaleDenom/1000/RS) を流用し、同じ座標系で一致するようにする
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

  // 「本体クリック判定」を赤グリップからの距離(円)ではなく、
  // 実際に描画されるSVG形状の範囲(矩形)で行うためのヘルパー
  function _svgPointBounds(svgStrs) {
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    const consider = (x,y) => {
      if (isNaN(x) || isNaN(y)) return;
      if (x<minX) minX=x; if (x>maxX) maxX=x;
      if (y<minY) minY=y; if (y>maxY) maxY=y;
    };
    svgStrs.forEach(svgStr => {
      if (!svgStr) return;
      const polyRe = /<polygon\s+[^>]*?points=['"]([^'"]+)['"][^>]*?\/?>/g;
      let m;
      while ((m = polyRe.exec(svgStr)) !== null) {
        m[1].trim().split(/\s+/).forEach(p => {
          const xy = p.split(',');
          consider(parseFloat(xy[0]), parseFloat(xy[1]));
        });
      }
      const lineRe = /<line\s+[^>]*?x1=['"]([^'"]+)['"]\s+y1=['"]([^'"]+)['"]\s+x2=['"]([^'"]+)['"]\s+y2=['"]([^'"]+)['"][^>]*?\/?>/g;
      while ((m = lineRe.exec(svgStr)) !== null) {
        consider(parseFloat(m[1]), parseFloat(m[2]));
        consider(parseFloat(m[3]), parseFloat(m[4]));
      }
      const circRe = /<circle\s+[^>]*?cx=['"]([^'"]+)['"]\s+cy=['"]([^'"]+)['"]\s+r=['"]([^'"]+)['"][^>]*?\/?>/g;
      while ((m = circRe.exec(svgStr)) !== null) {
        const cx=parseFloat(m[1]), cy=parseFloat(m[2]), r=parseFloat(m[3]);
        consider(cx-r, cy-r); consider(cx+r, cy+r);
      }
    });
    return isFinite(minX) ? {minX,minY,maxX,maxY} : null;
  }

  function _getAssetHitBounds(asset) {
    if (asset._hitBoundsCache) return asset._hitBoundsCache;
    const lower = asset.lower_svg || asset.svg || asset.left_svg || '';
    const color = asset.color_svg || '';
    const upper = asset.upper_svg || '';
    let base = _svgPointBounds([lower, color]);
    const up  = _svgPointBounds([upper]);
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

  // マウスのワールド座標(cssx/z, cssy/z)をアセットのローカル座標系(m単位)に変換
  function _worldToAssetLocal(asset, ann, S, isElev, rotation, wx, wy) {
    let ox = wx - ann.lx, oy = wy - ann.ly;
    if (isElev && ann.flipped) ox = -ox;
    const cosR = Math.cos(-rotation), sinR = Math.sin(-rotation);
    return { x: (ox*cosR - oy*sinR) / S, y: (ox*sinR + oy*cosR) / S };
  }

  // アセットの本体(土台+可動部+複写分)にローカル座標(lx,ly)がヒットするか判定
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
    // 立面×反転(flip_x)時は、描画側と同じくX成分を反転させて整合を取る
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
    const lowerSvg   = asset.lower_svg || asset.svg || asset.left_svg || '';
    const colorSvg   = asset.color_svg || '';
    const upperSvg   = asset.upper_svg || '';
    const cx = ann.lx, cy = ann.ly;
    const rotation   = isElev ? 0 : (ann.rotation || 0);
    const DASH = val => [val, val];

    pmCtx.save();
    pmCtx.translate(cx, cy);
    if (isElev && ann.flipped) pmCtx.scale(-1, 1);
    pmCtx.rotate(rotation);
    pmCtx.scale(S, S);

    // AIS仕様のTwo-Passレンダリングへ全面刷新
    // lower_svg=土台(常にグレー固定) / color_svg=土台と同期・ハッチング色 / upper_svg=可動部・複写部・ハッチング色
    const renderStatic = (isFill) => {
      if (isFill) {
        _drawFills(pmCtx, lowerSvg, '#888888', strokeS);
        _drawFills(pmCtx, colorSvg, fillColor, strokeS);
      } else {
        _drawStrokes(pmCtx, lowerSvg, strokeS);
        _drawStrokes(pmCtx, colorSvg, strokeS);
      }
    };

    const renderRotate = (isFill) => {
      if (isFill) {
        _drawFills(pmCtx, lowerSvg, '#888888', strokeS);
        _drawFills(pmCtx, colorSvg, fillColor, strokeS);
      } else {
        _drawStrokes(pmCtx, lowerSvg, strokeS);
        _drawStrokes(pmCtx, colorSvg, strokeS);
      }
      pmCtx.save();
      // 反転時の位置整合は_getBlueGripPos側(グリップのX反転)で取るように変更。
      // ここは常にupperRotationそのままでOK（描画全体が同じミラーを通るので絵柄も一緒に反転する）。
      pmCtx.rotate(ann.upperRotation || 0);
      if (isFill) _drawFills(pmCtx, upperSvg, fillColor, strokeS);
      else        _drawStrokes(pmCtx, upperSvg, strokeS);
      pmCtx.restore();
    };

    const renderArray = (isFill) => {
      const pitch = asset.array_pitch_m || asset.grip_blue_x || 2;
      const total = (ann.arrayN || 0) + 1;
      if (isFill) {
        _drawFills(pmCtx, lowerSvg, '#888888', strokeS);
        _drawFills(pmCtx, colorSvg, fillColor, strokeS);
      } else {
        _drawStrokes(pmCtx, lowerSvg, strokeS);
        _drawStrokes(pmCtx, colorSvg, strokeS);
      }
      for (let i = 0; i < total; i++) {
        pmCtx.save(); pmCtx.translate(i * pitch, 0);
        if (isFill) _drawFills(pmCtx, upperSvg, fillColor, strokeS);
        else        _drawStrokes(pmCtx, upperSvg, strokeS);
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
        _drawFills(pmCtx, lowerSvg, '#888888', strokeS);
        _drawFills(pmCtx, colorSvg, fillColor, strokeS);
      } else {
        _drawStrokes(pmCtx, lowerSvg, strokeS);
        _drawStrokes(pmCtx, colorSvg, strokeS);
      }
      for (let i = 0; i < total; i++) {
        pmCtx.save(); pmCtx.translate(0, -i * pitch);
        if (isFill) _drawFills(pmCtx, upperSvg, fillColor, strokeS);
        else        _drawStrokes(pmCtx, upperSvg, strokeS);
        pmCtx.restore();
      }
      // 参照実装(AIS)に合わせ、array_yには連結バーを描画しない
    };

    const renderArrayXY = (isFill) => {
      const pX = asset.array_pitch_x_m || 2, pY = asset.array_pitch_y_m || 2;
      const tX = (ann.arrayNX || 0) + 1, tY = (ann.arrayNY || 0) + 1;

      if (isElev) {
        // [立面] lower/colorはX方向にのみ複写、upperはその各X位置からY方向へ積み上げ複写
        for (let i = 0; i < tX; i++) {
          pmCtx.save(); pmCtx.translate(i * pX, 0);
          if (isFill) {
            _drawFills(pmCtx, lowerSvg, '#888888', strokeS);
            _drawFills(pmCtx, colorSvg, fillColor, strokeS);
          } else {
            _drawStrokes(pmCtx, lowerSvg, strokeS);
            _drawStrokes(pmCtx, colorSvg, strokeS);
          }
          for (let j = 0; j < tY; j++) {
            pmCtx.save(); pmCtx.translate(0, -j * pY);
            if (isFill) _drawFills(pmCtx, upperSvg, fillColor, strokeS);
            else        _drawStrokes(pmCtx, upperSvg, strokeS);
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
        // [平面] lower/color/upperすべてを格子状の各マスに複写
        for (let j = 0; j < tY; j++) {
          for (let i = 0; i < tX; i++) {
            pmCtx.save(); pmCtx.translate(i * pX, -j * pY);
            if (isFill) {
              _drawFills(pmCtx, lowerSvg, '#888888', strokeS);
              _drawFills(pmCtx, colorSvg, fillColor, strokeS);
              _drawFills(pmCtx, upperSvg, fillColor, strokeS);
            } else {
              _drawStrokes(pmCtx, lowerSvg, strokeS);
              _drawStrokes(pmCtx, colorSvg, strokeS);
              _drawStrokes(pmCtx, upperSvg, strokeS);
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

    // Pass 1: Fills（塗りつぶしを全レイヤ・全複写分先にまとめて描画）
    // 選択中はline/arrow/textと同じチカチカ点滅を本体にも適用
    if (selected) pmCtx.globalAlpha = _selectBlinkAlpha();
    if      (behavior === 'rotate')   renderRotate(true);
    else if (behavior === 'array')    renderArray(true);
    else if (behavior === 'array_y')  renderArrayY(true);
    else if (behavior === 'array_xy') renderArrayXY(true);
    else                               renderStatic(true);

    // Pass 2: Strokes（輪郭線を後から描画。塗りが輪郭に被らないようにする）
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
      // 反転(flip_x)時はオレンジグリップも鏡像反転させる
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
    const lw    = ARROW_LW[ann.sizeStep??1] * getPaperScale(); // v0.0055: 呼称0対応でindex化方式変更
    const color = ann.color||'#ff4081';
    const dir   = ann.arrowDir || 'fwd'; // fwd=終点のみ矢じり(既定) / rev=始点のみ / both=両端
    pmCtx.save();
    if (vis === 'translucent') pmCtx.globalAlpha = 0.4;
    if (selected) {
      pmCtx.globalAlpha = _selectBlinkAlpha();
    }
    if (dir === 'rev') {
      drawArrowRaw(t.cx,t.cy,s.cx,s.cy,color,lw,false,lw);
    } else if (dir === 'both') {
      drawArrowRaw(s.cx,s.cy,t.cx,t.cy,color,lw,false,lw,true);       // 軸(両端切り詰め)＋t側の矢じり
      drawArrowRaw(t.cx,t.cy,s.cx,s.cy,color,lw,false,lw,true,true);  // s側の矢じりのみ(軸は描かない)
    } else {
      drawArrowRaw(s.cx,s.cy,t.cx,t.cy,color,lw,false,lw);
    }
    pmCtx.restore();
  }

  function drawLine(ann, selected, isHover) {
    const vis = ann.visibility || 'visible';
    if (vis === 'hidden') return;
    const s=l2c(ann.x1,ann.y1), t=l2c(ann.x2,ann.y2);
    const lw    = LINE_LW[ann.sizeStep??1] * getPaperScale(); // v0.0055: 呼称0対応でindex化方式変更
    const color = ann.color||'#111111';
    // v0.0025: 点線種はダブルクリックで切替(solid/dashA/dashB/dashC=一点鎖線)。
    // 左UIの表示ボタンは他タイプと共通のvisible/translucent/hiddenに戻した
    const lineStyle = ann.lineStyle || 'solid';
    pmCtx.save();
    if (vis === 'translucent') pmCtx.globalAlpha = 0.4;
    if (selected) {
      pmCtx.globalAlpha = _selectBlinkAlpha();
    }
    pmCtx.strokeStyle = color;
    pmCtx.lineWidth = lw;
    // 実線以外の時だけエッジを直角(butt)にする（実線は丸のまま）
    pmCtx.lineCap = (lineStyle === 'solid') ? 'round' : 'butt';
    if      (lineStyle === 'dashA') pmCtx.setLineDash([lw*3.5, lw*2]);            // 点線(狭ピッチ)
    else if (lineStyle === 'dashB') pmCtx.setLineDash([lw*7, lw*2]);              // 点線(広ピッチ)
    else if (lineStyle === 'dashC') pmCtx.setLineDash([lw*8, lw*1.5, lw*1.5, lw*1.5]); // 一点鎖線
    pmCtx.beginPath();
    pmCtx.moveTo(s.cx, s.cy);
    pmCtx.lineTo(t.cx, t.cy);
    pmCtx.stroke();
    pmCtx.setLineDash([]);
    pmCtx.restore();
  }

  function drawCircle(ann, selected, isHover) {
    // v0.0409: 円ツール(B4)。線と同じ線種(実線/点線A/点線B/一点鎖線)・色、内部は常に透明
    const vis = ann.visibility || 'visible';
    if (vis === 'hidden') return;
    const c  = l2c(ann.cx, ann.cy);
    const lw = LINE_LW[ann.sizeStep??1] * getPaperScale(); // v0.0055: 呼称0対応でindex化方式変更
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
    const hw     = Math.max(21, hwLw*3.3); // 矢じりだけ1.5倍(旧: max(14, hwLw*2.2))
    const hwA    = 0.52;
    const stopX  = x2 - hw * Math.cos(angle);
    const stopY  = y2 - hw * Math.sin(angle);
    // 両端矢印(both)の時は始点側も矢じり分だけ軸を切り詰める。切り詰めないと、
    // 反対側から描く軸が始点の矢じりの下から突き出して見えてしまう
    const startX = trimStart ? (x1 + hw * Math.cos(angle)) : x1;
    const startY = trimStart ? (y1 + hw * Math.sin(angle)) : y1;
    pmCtx.save();
    pmCtx.strokeStyle=color; pmCtx.fillStyle=color;
    pmCtx.lineWidth=lw; pmCtx.lineCap='square'; pmCtx.lineJoin='miter';
    // v0.0026: 両端矢印は軸(シャフト)が両呼び出しで完全に同じ区間と重なっていたため、
    // 半透明時に2回分アルファ合成されて軸だけ色が濃く見えるバグがあった。
    // skipShaft=trueの時は矢じりだけ描き、軸は片方の呼び出しでしか描かないようにする
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
    const fs = TEXT_FS[ann.sizeStep ?? 1] * pScale; // v0.0047: 呼称0対応でindex化方式変更
    pmCtx.font = `bold ${fs}px "Segoe UI","Yu Gothic",sans-serif`;
    const tw = pmCtx.measureText(ann.text||'').width;
    ann._twPx = tw;
    ann._fsPx = fs;
    if (vis === 'hidden') return;

    // v0.0026: 回転の基準を左端(lx,ly)ではなく見た目の中心に変更。
    // lx,ly自体は互換のため従来通り左端アンカーとして保持し、描画の原点(cx,cy)だけを
    // tw/2右へずらす。rotation=0の時は従来と完全に同じ位置に描かれる
    const {cx, cy} = l2c(ann.lx + tw/2, ann.ly);
    const rotation  = ann.rotation || 0;
    const {zoom:tz} = getState();
    const textColor = ann.color || '#ffffff';
    const isBlack = (textColor === '#111111' || textColor === '#000000');
    const mojiWaku = ann.mojiWaku || 0; // v0.0047: 0=通常 1=エッジ非表示 2=エッジ色反転
    let outlineColor;
    if (vis === 'edge-secondary') {
      outlineColor = 'rgba(128,128,128,.9)'; 
    } else if (mojiWaku === 2) {
      // 通常とは白黒を入れ替える
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
    if (mojiWaku !== 1) { // v0.0047: 1のときエッジライン(縁取り)を描かない
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

  // Arecal側 customConfirm と同じ意匠（形状・文字サイズ）で、
  // Arecalayの基本色である緑を基調にした確認ダイアログ
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

    // Arecal本体のPDF範囲選択と挙動・文言を統一
    _toast('🖨 出力範囲を指定してください\n（右クリック/Escでキャンセル）', 4000);

    const pdfCvEl = document.getElementById('pdf-cv');
    const defW = (typeof _origPdfW !== 'undefined' && _origPdfW) || pdfCvEl.width;
    const defH = (typeof _origPdfH !== 'undefined' && _origPdfH) || pdfCvEl.height;
    const cpad = typeof _CPAD !== 'undefined' ? _CPAD : 1200;
    const dv   = document.getElementById('draw-cv');
    const cvWrapEl = document.getElementById('cv-wrap');
    let rangeMag = 1;
    let refPoint = 'bl'; // tl/tr/center/bl/br ※建築現場慣習で左下基準をデフォルトに
    let orient = (defW>defH) ? 'landscape' : 'portrait'; // 印刷方向（元PDFの向きを初期値に）

    const rb = document.createElement('div');
    rb.style.cssText = `position:fixed;border:2px solid #4caf50;
      pointer-events:none;display:none;background:rgba(76,175,80,.08);z-index:9993;`;
    document.body.appendChild(rb);

    // 出力倍率パネル（画面左側／Arecalayは緑基調）。倍率はスライダー化し数値は表示しない。
    // 基準点・印刷方向（クリック位置が枠のどこになるか）も同パネル内に配置。
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
    // v0.0064: AreCal本体(Arecal_v0_0457.html)と同じ四隅+中心スナップをArecalayの範囲選択にも追加。
    // 座標算出自体はwindow._pdfCornerSnapPoints(AreCal本体側で定義・共通の座標系)をそのまま使う。
    const _snapMarkerEls = [];
    let _snapActiveIdx = -1;
    // v0.0065: 実機NG対応。①目印の色がAreCal本体側(#00e5ff)とArecalay側(#4caf50)で
    // 別々に指定されており見た目が食い違っていたため、AreCal本体側と全く同じ色指定に統一。
    // ②以前は「マッチしたスナップ点オブジェクト」をそのまま_snapActivePtに保持し、
    // renderSnapMarkers側で再度window._pdfCornerSnapPoints()を呼んで===比較していたが、
    // この関数は呼ぶたびに新しいオブジェクトをmapで生成するため参照が絶対に一致せず、
    // 強調表示(拡大+濃色)が常にOFFのままだった。オブジェクト参照ではなく配列インデックスで
    // 判定するよう修正(AreCal本体側と同じ対応)。
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
    // 基準点に応じて、マウス位置(lx,ly)が枠のどこに来るかを算出
    function computeRect(lx, ly, ew, eh) {
      switch (refPoint) {
        case 'tr':     return { x1:lx-ew, y1:ly,    x2:lx,    y2:ly+eh };
        case 'bl':     return { x1:lx,    y1:ly-eh, x2:lx+ew, y2:ly };
        case 'br':     return { x1:lx-ew, y1:ly-eh, x2:lx,    y2:ly };
        case 'center': return { x1:lx-ew/2,y1:ly-eh/2,x2:lx+ew/2,y2:ly+eh/2 };
        default:       return { x1:lx,    y1:ly,    x2:lx+ew, y2:ly+eh }; // tl
      }
    }
    function currentEwEh() {
      const k = 1/Math.sqrt(rangeMag);
      let ew = defW*k, eh = defH*k;
      // 印刷方向指定に合わせてew/ehを入れ替える
      const wantLandscape = orient === 'landscape';
      const isLandscapeNow = ew > eh;
      if (wantLandscape !== isLandscapeNow) { const t = ew; ew = eh; eh = t; }
      return { ew, eh };
    }
    function redrawFromLastMouse() {
      if (lastMouseCX == null) return;
      let { lx, ly } = getLogical({ clientX:lastMouseCX, clientY:lastMouseCY });
      ({ x:lx, y:ly } = applySnap(lx, ly)); // v0.0064: 四隅+中心スナップ
      const { ew, eh } = currentEwEh();
      const rect = computeRect(lx, ly, ew, eh);
      if (rangeStart) rangeRect = rect;
      drawRangeBox(rect.x1, rect.y1, rect.x2, rect.y2);
    }
    // 図面ビュー（cv-wrap）内かどうかを判定。図面ビュー外のクリックは無視する
    function inCanvasView(e) {
      if (!cvWrapEl) return true;
      const r = cvWrapEl.getBoundingClientRect();
      return e.clientX>=r.left && e.clientX<=r.right && e.clientY>=r.top && e.clientY<=r.bottom;
    }

    // 倍率スライダー（数値は画面に出さない）
    const magSlider = magPanel.querySelector('#pm-mag-slider');
    magSlider.oninput = () => {
      rangeMag = Number(magSlider.value);
      redrawFromLastMouse();
    };
    // 線の太さスライダー（PDF出力時のみ反映。1=細い/2=中間(デフォルト)/3=太い）
    const PM_LW_LABELS = {1:'細い', 2:'中間', 3:'太い'};
    const lwSlider = magPanel.querySelector('#pm-lw-slider');
    const lwLbl    = magPanel.querySelector('#pm-lw-lbl');
    lwLbl.textContent = PM_LW_LABELS[pmLineWeightLevel] || '中間';
    lwSlider.oninput = () => {
      pmLineWeightLevel = Number(lwSlider.value);
      lwLbl.textContent = PM_LW_LABELS[pmLineWeightLevel] || '中間';
    };
    // 基準点ボタン
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

    // overlayを実際にブロックしつつ、ホイールズームだけcv-wrapへ転送
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
      if (magPanel.contains(e.target)) return; // 倍率パネル操作は範囲選択に影響させない
      // v0.0064: AreCal本体(v0.0456③)と同じ、ホイール押し(中クリック)+ドラッグでのパン操作を追加。
      // メインキャンバスのパン実装(panning/psx/psy/ox/oy/applyTrans)をAreCal本体側と共有して再利用する。
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
      if (!inCanvasView(e)) return; // 図面ビュー外のクリックは無視（左右UIでの誤爆防止）
      lastMouseCX = e.clientX; lastMouseCY = e.clientY;
      let { lx, ly } = getLogical(e);
      ({ x:lx, y:ly } = applySnap(lx, ly)); // v0.0064: 四隅+中心スナップ
      const { ew, eh } = currentEwEh();
      rangeStart = { x: lx, y: ly };
      rangeRect  = computeRect(lx, ly, ew, eh);
      dragging = true;
    }
    function onMove(e) {
      if (magPanel.contains(e.target)) return;
      if (panning) { // v0.0064: パン中はox/oyを更新して枠の追従に反映
        const r = cvWrapEl.getBoundingClientRect();
        ox = (e.clientX - r.left) - psx; oy = (e.clientY - r.top) - psy;
        applyTrans();
      }
      if (!inCanvasView(e)) return; // 図面ビュー外では枠を更新しない
      lastMouseCX = e.clientX; lastMouseCY = e.clientY;
      let { lx, ly } = getLogical(e);
      ({ x:lx, y:ly } = applySnap(lx, ly)); // v0.0064: 四隅+中心スナップ
      const { ew, eh } = currentEwEh();
      const rect = computeRect(lx, ly, ew, eh);
      if (rangeStart) rangeRect = rect;
      drawRangeBox(rect.x1, rect.y1, rect.x2, rect.y2);
    }
    function onUp(e) {
      if (magPanel.contains(e.target)) return; // 倍率パネル上のクリックでは確定しない
      if (e.button === 1) { // v0.0064: ホイール押しパン終了
        panning = false; cvWrapEl.style.cursor = '';
        return;
      }
      if (e.button !== 0 || !dragging) return;
      if (!inCanvasView(e)) return; // 図面ビュー外では確定しない
      dragging = false;
      if (!rangeRect) {
        let { lx, ly } = getLogical(e);
        ({ x:lx, y:ly } = applySnap(lx, ly)); // v0.0064: 四隅+中心スナップ
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
          // v0.0064: AreCal本体の「PDFをグレースケール表示」トグルと同じpdfGrayscale変数を
          // Arecalay側のPDF出力にも反映(表示側は既にpm-gray-toggleでpdfCvに直接filterを
          // 当てているが、出力用の合成canvasはpdfCvElを直接drawImageするため、ここでも
          // 別途フィルタをかける必要がある。AreCal本体の_doExportPDFと同じ処理)。
          cctx.filter = (typeof pdfGrayscale !== 'undefined' && pdfGrayscale) ? 'grayscale(1)' : 'none';
          cctx.drawImage(pdfCvEl,  mnX-cpad, mnY-cpad, cW, cH, 0, 0, cW, cH);
          cctx.filter = 'none';
        }
        cctx.drawImage(drawCvEl, mnX,      mnY,      cW, cH, 0, 0, cW, cH);
        // v0.0411: 17) pmCvはdraw-cvと同じ座標系(cpad込み)になったため、drawCvElと同じmnX,mnYでサンプリング
        cctx.drawImage(pmCv,     mnX,      mnY,      cW, cH, 0, 0, cW, cH);

        doc.setFontSize(11);
        doc.setTextColor(232, 160, 32);
        doc.text(`STEP ${stepIdx+1}  (${steps[stepIdx].length} annotations)`,
          imgX, imgY - 2);

        const imgData = comp.toDataURL('image/jpeg', 0.92);
        doc.addImage(imgData, 'JPEG', imgX, imgY, iW, iH);
      }

      const ts = typeof getTs==='function' ? getTs() : new Date().toISOString().slice(0,16).replace('T','_');
      doc.save(`Arecal_${ts.replace(/[: ]/g,'')}.pdf`); // v0.0442: ④ファイル名プレフィックスをplacement_→Arecal_に変更
      _toast(`✅ PDF出力完了（${selectedSteps.length}ページ）`);

    } catch(err) {
      console.error('pmDoExportPDF error:', err);
      _toast('⚠ PDF生成中にエラーが発生しました');
    } finally {
      _pmExporting = false;
      currentStep = savedStep;
      selectedUuids.clear();
      savedUuids.forEach(u => selectedUuids.add(u));
      renderPmLayer();
      document.getElementById('draw-cv').style.opacity = '0.5';
    }
  }

  /* ══ 配置済みリスト ══════════════════════════ */
  const MACH_COLORS = ['#FFFFFF','#E6E6E6','#FFA6A6','#FFA6FF','#A6BFFF',
                       '#A6FFFF','#4DFF80','#CCFF99','#FFFF99','#FFE6A6'];
  const MACH_SIZES  = [1, 2, 3, 5, 10];

  function updatePlacedList() {
    const list=document.getElementById('pm-placed-list');
    if (!list) return;
    // v0.0453: ③簡易FLIPアニメーション用に、再構築前の各liの位置をuuidで記録
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
    // リスト表示を反転し、「上＝前面」に統一
    // （steps配列自体は従来通り末尾＝前面のまま。描画ループ側は変更不要）
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
        // v0.0412: 3) 色変更可否の判定を修正。color_svgが無くても、rotate/array系のupper_svgは
        // renderRotate/renderArray等で常にfillColor(ann.color)が適用される(下記drawMachinery参照)ため、
        // upper_svgがあれば色変更可能。static系はupper_svgを持たないためcolor_svgの有無だけで判定される。
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
      const step  = ann.sizeStep ?? 1; // v0.0047: 0が偽値化けするバグ修正
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
            // v0.0047: MojiWaku(文字枠) 0=通常 1=エッジ非表示 2=エッジ色反転 の3状態を循環
            // v0.0445: ①マスターより再訂正。「枠」という文字への言い換えではなく、ボタン自体の見た目
            // (背景色/文字色)で状態を示してほしいとのこと。「縁」＝白地に黒文字ボタン、
            // 「無」＝現状のまま、「逆」＝ラベルは同じ「縁」だが黒地に白文字ボタン(色が反転している
            // ことで「逆」だとひと目で分かる)。キャンバス上のテキスト描画方式(縁取りストローク)自体は
            // 引き続き変更していない。
            const mw = ann.mojiWaku || 0;
            const mwIcon  = mw===1 ? '無' : '縁'; // 0と2は同じラベル「縁」、色の反転だけで区別
            // v0.0446: ①マスターの好みで白黒を入れ替え。縁=黒地白文字／逆=白地黒文字
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
    // v0.0453: ③以前は「ドラッグ中のli全体を緑枠で囲む」だけで、上に入るか下に入るか
    // 分かりにくかったため、カーソル位置(上半分/下半分)に応じて挿入線(上端/下端)を
    // 表示する方式に変更。あわせて簡易FLIPアニメーションで並び替え後の移動を分かりやすくする。
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
        // 表示は反転しているため、実配列インデックスに変換して並べ替える
        const srcIdx = total - 1 - _dragSrcDisplayIdx;
        let dstDisplayIdx = isTop ? displayIdx : displayIdx + 1;
        if (_dragSrcDisplayIdx < dstDisplayIdx) dstDisplayIdx--; // 取り除いた分の詰めを補正
        const dstIdx = total - 1 - dstDisplayIdx;
        _dragSrcDisplayIdx = null;
        if (srcIdx === dstIdx) return;
        const [item] = arr.splice(srcIdx, 1);
        arr.splice(dstIdx, 0, item);
        updatePlacedList();
      });
    });
    // v0.0453: 簡易FLIPアニメーション(外部ライブラリなし)。旧位置からの移動量をtransformで
    // 巻き戻し、次フレームで0に戻すことで滑らかな移動に見せる
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
          // v0.0025: lineもtranslucentを含む共通サイクルに統一（点線種はダブルクリックへ移動）
          const cycle = ['visible','translucent','hidden'];
          const cur   = a.visibility || 'visible';
          a.visibility = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
        }
        updatePlacedList();
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
      };
    });
    list.querySelectorAll('.pm-step-dn').forEach(btn => {
      btn.onclick=ev=>{ev.stopPropagation();
        const a=steps[currentStep].find(x=>x.uuid===btn.dataset.uuid);
        if(a){
          // v0.0055: 線・矢印・円もテキストと同様に呼称0まで下げられるように統一。||1由来の0化けバグも??1へ修正
          const min=0;
          a.sizeStep=Math.max(min,(a.sizeStep??1)-1);updatePlacedList();
        }
      };
    });
    list.querySelectorAll('.pm-step-up').forEach(btn => {
      btn.onclick=ev=>{ev.stopPropagation();
        const a=steps[currentStep].find(x=>x.uuid===btn.dataset.uuid);
        if(a){const max=(a.type==='line'||a.type==='circle')?7:5; a.sizeStep=Math.min(max,(a.sizeStep??1)+1);updatePlacedList();}
      };
    });
    list.querySelectorAll('.pm-mojiwaku-btn').forEach(btn => {
      btn.onclick=ev=>{ev.stopPropagation();
        const a=steps[currentStep].find(x=>x.uuid===btn.dataset.uuid);
        if(a){pushPmUndo();a.mojiWaku=((a.mojiWaku||0)+1)%3;updatePlacedList();}
      };
    });
    list.querySelectorAll('.pm-del-btn').forEach(btn => {
      btn.onclick=ev=>{ev.stopPropagation();
        pushPmUndo();
        selectedUuids.delete(btn.dataset.uuid);
        steps[currentStep]=steps[currentStep].filter(x=>x.uuid!==btn.dataset.uuid);
        updatePlacedList();
      };
    });
  }

  function switchStep(n) {
    if (n === currentStep) return;
    cancelAnnotMode(); 
    currentStep = n;
    selectedUuids.clear();
    updatePlacedList();
    updateTabUI();
    _toast(`STEP ${n+1} に切り替えました`, 1500);
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
  }
  function pmRedo() {
    if (!pmRedoStack.length) return;
    pmUndoStack.push(JSON.stringify(steps));
    steps=JSON.parse(pmRedoStack.pop());
    selectedUuids.clear(); updatePlacedList(); syncUndoRedoBtns();
  }
  function syncUndoRedoBtns() {
    const u=document.getElementById('pm-undo-btn');
    const r=document.getElementById('pm-redo-btn');
    if(u) u.disabled=pmUndoStack.length===0;
    if(r) r.disabled=pmRedoStack.length===0;
  }
  function pmClearAll() {
    if(!steps[currentStep].length){_toast('配置データがありません');return;}
    const doClear=()=>{pushPmUndo();steps[currentStep]=[];selectedUuids.clear();updatePlacedList();};
    _pmConfirm('配置を全て消去しますか？', doClear, null);
  }

  // 旧カテゴリー体系（heavy/equipment/temporary/material/operation/scaffold）から
  // 新5区分（heavy_vehicle/temp_material/scaffold/operation/other）へ移行
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
          const text = await _decodeMachineryBytes(buf); // v0.0053: GZIP圧縮版にも対応
          const objText = _extractMachineryObjectText(text); // v0.0054: 正規表現からindexOf方式に変更
          if (!objText) { _toast('⚠ MACHINERY_DATA が見つかりません'); return; }
          machineryData = _migrateMachineryCategories(JSON.parse(objText));
          const count = _pmAnnounceMachineryStatus();
          _toast(`📦 読込完了（${count}件）`, 2500);
          if (placementMode) renderPmLayer(); // 保険的対応：既に☒表示のオブジェクトがあればその場で復帰
          if (typeof onDone === 'function') onDone();
        } catch(err) {
          _toast('⚠ 読み込みエラー（形式確認してください）');
          console.error('[Arecalay] loadMachineryFile:', err);
        }
      })();
    };
    inp.click();
  }

  // A008: マスター実機報告「足場材の色ドット(⚪)がオブジェクト名の横だけ黒っぽく見える。
  // ドロップダウンでは正しい色」に対応。⚪(U+26AA WHITE CIRCLE)は🔴🔵🟡🟢等と違い、Unicode上
  // 「絵文字既定ではなくテキスト既定」の古い記号のため、フォント・プラットフォームによっては
  // カラー絵文字ではなく現在のテキスト色(黒に近いグレー)で描画されることがある。native要素
  // (<option>)では正しく出ていたのに、独自にCSS color指定した<span>側だけ黒っぽく見えていたのは
  // これが原因と判断。VS16(U+FE0F、絵文字提示を強制するセレクタ)を付与して確実にカラー表示にする。
  const _MCAT_LABEL = {
    heavy_vehicle:'🔵重機・車両', temp_material:'🟡仮設・資材',
    scaffold:'⚪️足場材', operation:'🔴作業', other:'🟢その他'
  };

  function buildPmSaveData() {
    // v0.0405: Arela(全体保存)からも呼べるよう、データ組み立て部分を分離
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
      version:      '1.2', // v0.0058: scaleDenom記録に伴いバージョン更新
      appId:        'arecalay-placement',
      annCounter,
      steps,
      machineryMeta,
      // v0.0058: 保存時点のAreCal本体スケール(scaleDenom)を記録。読込時に現在のAreCal本体スケールと
      // 比較し、不一致(=配置座標がずれる可能性がある組み合わせ)であればユーザーに警告する用途。
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
    // v0.0407: Arelaからも呼べるよう、ファイル読込後の適用処理を分離
    if (!data.steps || !Array.isArray(data.steps) || data.steps.length !== 5) {
      _toast('⚠ 無効なファイル形式です（steps[5] が見つかりません）'); return false;
    }
    if (data.appId && data.appId !== 'arecalay-placement') {
      _toast('⚠ このファイルは Arecalay 用ではありません'); return false;
    }
    // v0.0058: 保存時のAreCal本体スケール(data.scaleDenom)と、現在アクティブなAreCal本体スケール
    // (scaleDenom、AreCal側のapplyArecDataがこの直前に実行され復元済みの値)を比較。
    // 配置座標そのものは自動補正せず(座標系の解釈を誤って別の不整合を生むリスクを避けるため)、
    // 不一致の場合はユーザーに警告するに留める。
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
    return true;
  }

  function pmLoadJSON() {
    const inp = document.createElement('input');
    inp.type   = 'file';
    inp.accept = '.arela';
    inp.onchange = () => {
      const file = inp.files[0];
      if (!file) return;
      // v0.0409: 1) 保存形式をArelaに一本化。表向きはArela以外読み込めない扱いとする
      if (!/\.arela$/i.test(file.name)) {
        _toast('⚠ .arela形式のファイルのみ読み込めます');
        return;
      }
      // v0.0408: Arelaファイルは AreCal・Arecalay 両方のデータを丸ごと置き換えるため、専用の警告を出す
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

  // v0.0414: セキュリティ監査で発見 — ユーザーが入力した文字列(テキスト注釈の内容等)を
  // innerHTMLへそのまま差し込むとHTMLタグとして解釈されてしまう(自己XSS/共有.arelaファイル経由の
  // XSSリスク)。表示前に必ずこの関数でエスケープする。
  function _escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  if (document.readyState==='loading') {
    document.addEventListener('DOMContentLoaded',init);
  } else { setTimeout(init,80); }

})();