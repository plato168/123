package tw.eyecoach.analysis

/**
 * 單次感測快照。鏡頭畫面不會進入這裡，只保留數值。
 */
data class SensorSnapshot(
    val timestampMs: Long,
    val ambientLux: Float? = null,
    val screenBrightness: Float? = null,
    val phonePitchFromFlatDeg: Float? = null,
    val faceDetected: Boolean = false,
    val estimatedDistanceCm: Float? = null,
    val headDownDeg: Float? = null,
    val headTiltDeg: Float? = null,
)

enum class Severity {
    GOOD,
    WARN,
    BAD,
    UNKNOWN,
}

/**
 * 單一指標：現況、目標、還差多少、怎麼改。
 */
data class DimensionAdvice(
    val id: String,
    val title: String,
    val severity: Severity,
    val score: Int,
    val currentLabel: String,
    val targetLabel: String,
    val gapLabel: String,
    val howTo: String,
)

data class EnvironmentReport(
    val overallScore: Int,
    val overallGrade: String,
    val headline: String,
    val dimensions: List<DimensionAdvice>,
    val topActions: List<String>,
    val elapsedLabel: String,
    val needsImmediateRest: Boolean,
)

data class DemoScenario(
    val id: String,
    val title: String,
    val subtitle: String,
)
