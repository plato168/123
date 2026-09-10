# 用眼環境教練（Android）

用前鏡頭、光線感測與手機傾角，評估目前閱讀／滑手機環境，並告訴你：

- 哪一項需要改善
- 現況與建議值差多少
- 具體可以怎麼改

影像只在手機裡計算，不存檔、不上雲。這不是醫療診斷。

## 功能

- **觀看距離**：以前鏡頭人臉大小粗估，過近會顯示還要再拉遠幾公分
- **環境光線**：用光線感測器（沒有感測器的裝置會標示無法判斷）
- **螢幕對比**：暗室卻把亮度開很高時會提醒再降多少
- **姿勢與握持**：低頭角度、是否躺著滑手機
- **連續時間**：接近或超過 20 分鐘會提醒遠眺（20-20-20）
- **示範模式**：不開鏡頭也能預覽提醒文案

鏡頭只在「本段守護」進行中開啟。離開 App 就停止偵測（系統不允許背景偷拍）。

## 在電腦編譯

1. 安裝 [Android Studio](https://developer.android.com/studio) 或 Android SDK（platform 35、build-tools 35）
2. 複製 `local.properties.example` 為 `local.properties`，填入 `sdk.dir`
3. 執行：

```bash
cd android-eye-coach
./gradlew testDebugUnitTest assembleDebug
```

Debug APK 位於 `app/build/outputs/apk/debug/app-debug.apk`。用 USB 傳到 Android 手機安裝即可。

## 在手機上使用

1. 允許相機權限
2. 按「開始守護」，把前鏡頭對準臉（建議立在桌上）
3. 看綜合分數與各項「還差多少」
4. 若距離不太準，可點「我現在大約一臂遠」做校正
5. 也可以先從首頁開示範情境，確認提醒內容
