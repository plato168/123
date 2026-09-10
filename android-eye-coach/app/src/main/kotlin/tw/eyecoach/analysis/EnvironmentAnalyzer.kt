package tw.eyecoach.analysis

import kotlin.math.roundToInt

/**
 * 把感測數值轉成「要改善什麼、還差多少」。
 * 門檻參考常見用眼衛生建議，不是醫療診斷。
 */
class EnvironmentAnalyzer {

    fun analyze(snapshot: SensorSnapshot, sessionStartedAtMs: Long): EnvironmentReport {
        val elapsedMs = (snapshot.timestampMs - sessionStartedAtMs).coerceAtLeast(0L)
        val dimensions = listOf(
            distanceAdvice(snapshot),
            lightingAdvice(snapshot),
            contrastAdvice(snapshot),
            postureAdvice(snapshot),
            restAdvice(elapsedMs),
        )
        val scored = dimensions.filter { it.severity != Severity.UNKNOWN }
        val overall = if (scored.isEmpty()) {
            50
        } else {
            scored.sumOf { it.score } / scored.size
        }
        val worst = dimensions
            .filter { it.severity == Severity.BAD || it.severity == Severity.WARN }
            .sortedBy { it.score }
        val topActions = worst.take(3).map { item ->
            "${item.title}：${item.gapLabel}。${item.howTo}"
        }
        val needsRest = dimensions.any { it.id == ID_REST && it.severity == Severity.BAD }
        return EnvironmentReport(
            overallScore = overall,
            overallGrade = grade(overall),
            headline = headline(overall, worst.firstOrNull()),
            dimensions = dimensions,
            topActions = topActions,
            elapsedLabel = formatElapsed(elapsedMs),
            needsImmediateRest = needsRest,
        )
    }

    private fun distanceAdvice(snapshot: SensorSnapshot): DimensionAdvice {
        if (!snapshot.faceDetected || snapshot.estimatedDistanceCm == null) {
            return DimensionAdvice(
                id = ID_DISTANCE,
                title = "觀看距離",
                severity = Severity.UNKNOWN,
                score = 50,
                currentLabel = "尚未偵測到臉部",
                targetLabel = "手機建議 35–50 公分（至少 30 公分）",
                gapLabel = "請把前鏡頭對準臉，才能估計距離",
                howTo = "把手機立在桌上或拿穩，讓臉出現在預覽中。",
            )
        }
        val cm = snapshot.estimatedDistanceCm
        val current = cm.roundToInt()
        return when {
            cm < 30f -> {
                val gap = (30 - current).coerceAtLeast(1)
                DimensionAdvice(
                    id = ID_DISTANCE,
                    title = "觀看距離",
                    severity = Severity.BAD,
                    score = (cm / 30f * 55f).roundToInt().coerceIn(10, 54),
                    currentLabel = "約 $current 公分",
                    targetLabel = "至少 30 公分，理想 35–50 公分",
                    gapLabel = "過近，請再拉遠約 $gap 公分",
                    howTo = "手臂伸直約一臂距離再看；若一直湊近，改用支架把螢幕固定住。",
                )
            }
            cm < 35f -> DimensionAdvice(
                id = ID_DISTANCE,
                title = "觀看距離",
                severity = Severity.WARN,
                score = 72,
                currentLabel = "約 $current 公分",
                targetLabel = "理想 35–50 公分",
                gapLabel = "略近，再拉遠約 ${35 - current} 公分會更輕鬆",
                howTo = "把手機再拿遠一點，字變小就放大字級，不要用身體去就螢幕。",
            )
            cm <= 50f -> DimensionAdvice(
                id = ID_DISTANCE,
                title = "觀看距離",
                severity = Severity.GOOD,
                score = 95,
                currentLabel = "約 $current 公分",
                targetLabel = "理想 35–50 公分",
                gapLabel = "距離合適，維持即可",
                howTo = "保持這個距離，需要看細節時放大畫面，而不是把臉湊上去。",
            )
            cm <= 80f -> DimensionAdvice(
                id = ID_DISTANCE,
                title = "觀看距離",
                severity = Severity.WARN,
                score = 78,
                currentLabel = "約 $current 公分",
                targetLabel = "理想 35–50 公分",
                gapLabel = "偏遠，字會變小，之後容易又不自覺湊近",
                howTo = "略為靠近到約 40 公分，或把字級調大。",
            )
            else -> DimensionAdvice(
                id = ID_DISTANCE,
                title = "觀看距離",
                severity = Severity.WARN,
                score = 70,
                currentLabel = "約 $current 公分",
                targetLabel = "理想 35–50 公分",
                gapLabel = "遠大於建議範圍，偵測可能不穩",
                howTo = "確認臉有完整入鏡後再判斷；必要時點「校正距離」。",
            )
        }
    }

    private fun lightingAdvice(snapshot: SensorSnapshot): DimensionAdvice {
        val lux = snapshot.ambientLux
        if (lux == null) {
            return DimensionAdvice(
                id = ID_LIGHT,
                title = "環境光線",
                severity = Severity.UNKNOWN,
                score = 50,
                currentLabel = "這台裝置沒有光線感測器",
                targetLabel = "閱讀／看螢幕建議 300 lux 以上",
                gapLabel = "無法量測環境亮度",
                howTo = "盡量在有窗或開燈的地方使用，避免只靠螢幕當唯一光源。",
            )
        }
        val current = lux.roundToInt().coerceAtLeast(0)
        return when {
            lux < 50f -> DimensionAdvice(
                id = ID_LIGHT,
                title = "環境光線",
                severity = Severity.BAD,
                score = 25,
                currentLabel = "約 $current lux（幾乎全黑或僅螢幕照明）",
                targetLabel = "至少 300 lux，書寫則約 500 lux",
                gapLabel = "過暗，亮度大約還差 ${300 - current} lux",
                howTo = "請開燈或坐到窗邊。不要在被窩裡只靠手機螢幕當燈。",
            )
            lux < 150f -> DimensionAdvice(
                id = ID_LIGHT,
                title = "環境光線",
                severity = Severity.WARN,
                score = 58,
                currentLabel = "約 $current lux（偏暗）",
                targetLabel = "至少 300 lux",
                gapLabel = "再提高約 ${300 - current} lux（開一盞桌燈通常就夠）",
                howTo = "打開桌燈或房間主燈，讓臉與桌面都有均勻光線。",
            )
            lux < 300f -> DimensionAdvice(
                id = ID_LIGHT,
                title = "環境光線",
                severity = Severity.WARN,
                score = 75,
                currentLabel = "約 $current lux",
                targetLabel = "建議 300 lux 以上",
                gapLabel = "略暗，再亮約 ${300 - current} lux 更接近建議值",
                howTo = "把燈調亮一格，或讓身體不要擋住光源。",
            )
            else -> DimensionAdvice(
                id = ID_LIGHT,
                title = "環境光線",
                severity = Severity.GOOD,
                score = if (lux >= 500f) 96 else 88,
                currentLabel = "約 $current lux",
                targetLabel = "建議 300 lux 以上",
                gapLabel = "光線足夠，維持即可",
                howTo = "若燈光從後方直射螢幕造成反光，改成側光或調一下角度。",
            )
        }
    }

    private fun contrastAdvice(snapshot: SensorSnapshot): DimensionAdvice {
        val lux = snapshot.ambientLux
        val brightness = snapshot.screenBrightness
        if (lux == null || brightness == null) {
            return DimensionAdvice(
                id = ID_CONTRAST,
                title = "螢幕對比",
                severity = Severity.UNKNOWN,
                score = 50,
                currentLabel = "缺少亮度或螢幕亮度資料",
                targetLabel = "環境越暗，螢幕應越暗",
                gapLabel = "無法評估螢幕是否過亮",
                howTo = "暗處請把螢幕亮度降到剛好能看清。",
            )
        }
        val percent = (brightness * 100).roundToInt().coerceIn(0, 100)
        val darkAndBright = lux < 50f && brightness >= 0.55f
        val dimAndBright = lux < 150f && brightness >= 0.75f
        return when {
            darkAndBright -> DimensionAdvice(
                id = ID_CONTRAST,
                title = "螢幕對比",
                severity = Severity.BAD,
                score = 28,
                currentLabel = "環境約 ${lux.roundToInt()} lux，螢幕約 $percent%",
                targetLabel = "暗室螢幕亮度建議降到 40% 以下",
                gapLabel = "螢幕相對環境過亮，請再降低約 ${(percent - 40).coerceAtLeast(10)} 個百分點",
                howTo = "先開燈；若暫時不能開燈，把亮度滑桿往下拉，並開系統深色模式。",
            )
            dimAndBright -> DimensionAdvice(
                id = ID_CONTRAST,
                title = "螢幕對比",
                severity = Severity.WARN,
                score = 62,
                currentLabel = "環境偏暗，螢幕約 $percent%",
                targetLabel = "亮度跟著環境走",
                gapLabel = "螢幕偏亮，建議降到約 50% 試試",
                howTo = "調低亮度直到白底畫面不刺眼，但文字仍清楚。",
            )
            lux >= 300f && brightness <= 0.15f -> DimensionAdvice(
                id = ID_CONTRAST,
                title = "螢幕對比",
                severity = Severity.WARN,
                score = 70,
                currentLabel = "環境夠亮，螢幕約 $percent%",
                targetLabel = "亮處可適度提高亮度以免瞇眼",
                gapLabel = "螢幕可能偏暗，可再提高約 20 個百分點",
                howTo = "白天戶外或窗邊，把亮度提高，避免一直瞇眼。",
            )
            else -> DimensionAdvice(
                id = ID_CONTRAST,
                title = "螢幕對比",
                severity = Severity.GOOD,
                score = 90,
                currentLabel = "螢幕約 $percent%，與環境大致匹配",
                targetLabel = "亮度隨環境調整",
                gapLabel = "對比尚可，維持即可",
                howTo = "覺得刺眼就降一點，覺得看不清就升一點。",
            )
        }
    }

    private fun postureAdvice(snapshot: SensorSnapshot): DimensionAdvice {
        val headDown = snapshot.headDownDeg
        val pitch = snapshot.phonePitchFromFlatDeg
        val lying = pitch != null && pitch < 35f
        if (!snapshot.faceDetected && !lying) {
            return DimensionAdvice(
                id = ID_POSTURE,
                title = "姿勢與握持",
                severity = Severity.UNKNOWN,
                score = 50,
                currentLabel = "尚未偵測到臉部",
                targetLabel = "視線接近水平，避免躺著滑手機",
                gapLabel = "還不能判斷低頭或躺姿",
                howTo = "讓前鏡頭看到臉與肩膀，或先改為坐直使用。",
            )
        }
        if (lying) {
            return DimensionAdvice(
                id = ID_POSTURE,
                title = "姿勢與握持",
                severity = Severity.BAD,
                score = 30,
                currentLabel = "手機接近平放，多半是躺著或螢幕朝天",
                targetLabel = "坐直，螢幕抬到接近視線高度",
                gapLabel = "躺姿會讓頸椎長時間後仰或過度屈曲",
                howTo = "改成坐著，把手機舉到眼前，不要把枕頭當書桌。",
            )
        }
        val down = headDown ?: 0f
        val downInt = down.roundToInt()
        return when {
            down >= 40f -> DimensionAdvice(
                id = ID_POSTURE,
                title = "姿勢與握持",
                severity = Severity.BAD,
                score = 32,
                currentLabel = "低頭約 $downInt 度",
                targetLabel = "低頭小於 15 度",
                gapLabel = "請抬頭約 ${downInt - 15} 度，把螢幕抬高",
                howTo = "把手機或支架升高，讓螢幕上緣接近眉心，而不是放在膝上。",
            )
            down >= 25f -> DimensionAdvice(
                id = ID_POSTURE,
                title = "姿勢與握持",
                severity = Severity.WARN,
                score = 60,
                currentLabel = "低頭約 $downInt 度",
                targetLabel = "低頭小於 15 度",
                gapLabel = "略低頭，再抬頭約 ${downInt - 15} 度",
                howTo = "手肘靠桌、螢幕抬高，或改用支架。",
            )
            down >= 15f -> DimensionAdvice(
                id = ID_POSTURE,
                title = "姿勢與握持",
                severity = Severity.WARN,
                score = 78,
                currentLabel = "低頭約 $downInt 度",
                targetLabel = "低頭小於 15 度",
                gapLabel = "接近建議範圍，再微微抬頭即可",
                howTo = "把螢幕再抬高一點點。",
            )
            else -> DimensionAdvice(
                id = ID_POSTURE,
                title = "姿勢與握持",
                severity = Severity.GOOD,
                score = 94,
                currentLabel = if (headDown == null) "未偵測到明顯低頭" else "低頭約 $downInt 度",
                targetLabel = "低頭小於 15 度",
                gapLabel = "姿勢合適，維持即可",
                howTo = "每隔一段時間還是要起身活動，好姿勢也不能鎖死不動。",
            )
        }
    }

    private fun restAdvice(elapsedMs: Long): DimensionAdvice {
        val minutes = (elapsedMs / 60_000L).toInt()
        val seconds = ((elapsedMs / 1000L) % 60L).toInt()
        val currentLabel = if (minutes <= 0) "已連續 ${seconds} 秒" else "已連續 ${minutes} 分 ${seconds} 秒"
        return when {
            elapsedMs >= 25 * 60_000L -> DimensionAdvice(
                id = ID_REST,
                title = "連續使用時間",
                severity = Severity.BAD,
                score = 35,
                currentLabel = currentLabel,
                targetLabel = "每 20 分鐘遠眺 20 秒（20-20-20）",
                gapLabel = "已超過建議時間，請立刻休息並看向 6 公尺外",
                howTo = "放下手機，看窗外或遠物 20 秒以上，再決定要不要繼續。",
            )
            elapsedMs >= 20 * 60_000L -> DimensionAdvice(
                id = ID_REST,
                title = "連續使用時間",
                severity = Severity.WARN,
                score = 55,
                currentLabel = currentLabel,
                targetLabel = "每 20 分鐘休息一次",
                gapLabel = "已到休息點，請遠眺 20 秒",
                howTo = "看遠處 20 秒，眨眨眼，起來走動更好。",
            )
            else -> {
                val remainMin = ((20 * 60_000L - elapsedMs) / 60_000L).toInt().coerceAtLeast(0)
                val remainSec = (((20 * 60_000L - elapsedMs) / 1000L) % 60L).toInt()
                DimensionAdvice(
                    id = ID_REST,
                    title = "連續使用時間",
                    severity = Severity.GOOD,
                    score = 92,
                    currentLabel = currentLabel,
                    targetLabel = "每 20 分鐘休息一次",
                    gapLabel = "距離下次休息還有 ${remainMin} 分 ${remainSec} 秒",
                    howTo = "時間到會提醒你看遠處，不必現在中斷。",
                )
            }
        }
    }

    private fun grade(score: Int): String = when {
        score >= 80 -> "良好"
        score >= 60 -> "尚可"
        score >= 40 -> "需要改善"
        else -> "不建議繼續"
    }

    private fun headline(score: Int, worst: DimensionAdvice?): String {
        if (worst == null) {
            return if (score >= 80) {
                "目前環境大致健康，維持就好。"
            } else {
                "環境資料還不夠，請允許鏡頭或在光線下使用。"
            }
        }
        return when {
            score >= 80 -> "目前環境大致健康，維持就好。"
            worst.severity == Severity.BAD -> "最需要改善：${worst.title}（${worst.gapLabel}）"
            else -> "有項目可以更好：${worst.title}（${worst.gapLabel}）"
        }
    }

    private fun formatElapsed(elapsedMs: Long): String {
        val minutes = elapsedMs / 60_000L
        val seconds = (elapsedMs / 1000L) % 60L
        return "%d:%02d".format(minutes, seconds)
    }

    companion object {
        const val ID_DISTANCE = "distance"
        const val ID_LIGHT = "light"
        const val ID_CONTRAST = "contrast"
        const val ID_POSTURE = "posture"
        const val ID_REST = "rest"

        val demoScenarios = listOf(
            DemoScenario("dark_close", "暗室把手機拿很近", "距離過近 + 光線不足 + 螢幕過亮"),
            DemoScenario("good", "坐姿端正、光線充足", "各項接近建議值"),
            DemoScenario("lying", "躺在床上滑手機", "手機平放的躺姿"),
            DemoScenario("long_session", "已連續使用超過 25 分鐘", "該遠眺休息"),
        )
    }
}
