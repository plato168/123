package tw.eyecoach.analysis

/**
 * 示範情境的固定快照，方便沒有真實光線／鏡頭時預覽提醒文案。
 */
object DemoSnapshots {
    fun snapshot(scenarioId: String, nowMs: Long, sessionStartedAtMs: Long): SensorSnapshot {
        return when (scenarioId) {
            "good" -> SensorSnapshot(
                timestampMs = nowMs,
                ambientLux = 420f,
                screenBrightness = 0.45f,
                phonePitchFromFlatDeg = 72f,
                faceDetected = true,
                estimatedDistanceCm = 42f,
                headDownDeg = 8f,
                headTiltDeg = 2f,
            )
            "lying" -> SensorSnapshot(
                timestampMs = nowMs,
                ambientLux = 80f,
                screenBrightness = 0.7f,
                phonePitchFromFlatDeg = 12f,
                faceDetected = true,
                estimatedDistanceCm = 28f,
                headDownDeg = 18f,
                headTiltDeg = 6f,
            )
            "long_session" -> SensorSnapshot(
                timestampMs = sessionStartedAtMs + 26 * 60_000L,
                ambientLux = 310f,
                screenBrightness = 0.5f,
                phonePitchFromFlatDeg = 65f,
                faceDetected = true,
                estimatedDistanceCm = 38f,
                headDownDeg = 12f,
                headTiltDeg = 1f,
            )
            else -> SensorSnapshot(
                timestampMs = nowMs,
                ambientLux = 22f,
                screenBrightness = 0.82f,
                phonePitchFromFlatDeg = 58f,
                faceDetected = true,
                estimatedDistanceCm = 18f,
                headDownDeg = 36f,
                headTiltDeg = 4f,
            )
        }
    }
}
