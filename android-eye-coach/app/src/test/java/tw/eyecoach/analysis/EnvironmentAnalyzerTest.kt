package tw.eyecoach.analysis

import com.google.common.truth.Truth.assertThat
import org.junit.Test

class EnvironmentAnalyzerTest {

    private val analyzer = EnvironmentAnalyzer()

    @Test
    fun tooCloseAndDarkRoom_explainsHowMuchToImprove() {
        val report = analyzer.analyze(
            snapshot = SensorSnapshot(
                timestampMs = 10_000,
                ambientLux = 22f,
                screenBrightness = 0.82f,
                phonePitchFromFlatDeg = 58f,
                faceDetected = true,
                estimatedDistanceCm = 18f,
                headDownDeg = 36f,
            ),
            sessionStartedAtMs = 0,
        )
        val distance = report.dimensions.first { it.id == EnvironmentAnalyzer.ID_DISTANCE }
        val light = report.dimensions.first { it.id == EnvironmentAnalyzer.ID_LIGHT }
        val contrast = report.dimensions.first { it.id == EnvironmentAnalyzer.ID_CONTRAST }
        val posture = report.dimensions.first { it.id == EnvironmentAnalyzer.ID_POSTURE }

        assertThat(distance.severity).isEqualTo(Severity.BAD)
        assertThat(distance.gapLabel).contains("拉遠約 12 公分")
        assertThat(light.gapLabel).contains("還差 278 lux")
        assertThat(contrast.severity).isEqualTo(Severity.BAD)
        assertThat(contrast.gapLabel).contains("降低")
        assertThat(posture.gapLabel).contains("抬頭約 21 度")
        assertThat(report.overallScore).isLessThan(60)
        assertThat(report.headline).contains("最需要改善")
        assertThat(report.topActions).isNotEmpty()
    }

    @Test
    fun goodEnvironment_saysMaintain() {
        val report = analyzer.analyze(
            snapshot = DemoSnapshots.snapshot("good", nowMs = 60_000, sessionStartedAtMs = 0),
            sessionStartedAtMs = 0,
        )
        assertThat(report.overallScore).isAtLeast(80)
        assertThat(report.overallGrade).isEqualTo("良好")
        assertThat(report.headline).contains("維持")
        report.dimensions.filter { it.id != EnvironmentAnalyzer.ID_REST }.forEach { item ->
            assertThat(item.severity).isEqualTo(Severity.GOOD)
        }
    }

    @Test
    fun lyingDown_flagsBedUse() {
        val report = analyzer.analyze(
            snapshot = DemoSnapshots.snapshot("lying", nowMs = 5_000, sessionStartedAtMs = 0),
            sessionStartedAtMs = 0,
        )
        val posture = report.dimensions.first { it.id == EnvironmentAnalyzer.ID_POSTURE }
        assertThat(posture.severity).isEqualTo(Severity.BAD)
        assertThat(posture.howTo).contains("坐著")
    }

    @Test
    fun longSession_tellsUserToLookFar() {
        val started = 0L
        val report = analyzer.analyze(
            snapshot = DemoSnapshots.snapshot("long_session", nowMs = started, sessionStartedAtMs = started),
            sessionStartedAtMs = started,
        )
        val rest = report.dimensions.first { it.id == EnvironmentAnalyzer.ID_REST }
        assertThat(rest.severity).isEqualTo(Severity.BAD)
        assertThat(report.needsImmediateRest).isTrue()
        assertThat(rest.gapLabel).contains("立刻休息")
    }

    @Test
    fun missingFace_marksDistanceUnknown() {
        val report = analyzer.analyze(
            snapshot = SensorSnapshot(
                timestampMs = 1_000,
                ambientLux = 400f,
                screenBrightness = 0.4f,
                phonePitchFromFlatDeg = 70f,
                faceDetected = false,
            ),
            sessionStartedAtMs = 0,
        )
        val distance = report.dimensions.first { it.id == EnvironmentAnalyzer.ID_DISTANCE }
        assertThat(distance.severity).isEqualTo(Severity.UNKNOWN)
        assertThat(distance.gapLabel).contains("前鏡頭")
    }

    @Test
    fun slightlyClose_givesSmallGap() {
        val report = analyzer.analyze(
            snapshot = SensorSnapshot(
                timestampMs = 1_000,
                ambientLux = 320f,
                screenBrightness = 0.5f,
                phonePitchFromFlatDeg = 70f,
                faceDetected = true,
                estimatedDistanceCm = 32f,
                headDownDeg = 10f,
            ),
            sessionStartedAtMs = 0,
        )
        val distance = report.dimensions.first { it.id == EnvironmentAnalyzer.ID_DISTANCE }
        assertThat(distance.severity).isEqualTo(Severity.WARN)
        assertThat(distance.gapLabel).contains("再拉遠約 3 公分")
    }
}

class DistanceEstimatorTest {
    @Test
    fun largerFace_meansCloser() {
        val close = DistanceEstimator.estimateCm(faceWidthPx = 540f, imageWidthPx = 1080)!!
        val far = DistanceEstimator.estimateCm(faceWidthPx = 220f, imageWidthPx = 1080)!!
        assertThat(close).isLessThan(far)
        assertThat(close).isLessThan(30f)
        assertThat(far).isGreaterThan(35f)
    }

    @Test
    fun calibrationScale_adjustsResult() {
        val raw = DistanceEstimator.estimateCm(faceWidthPx = 300f, imageWidthPx = 1080, calibrationScale = 1f)!!
        val scaled = DistanceEstimator.estimateCm(faceWidthPx = 300f, imageWidthPx = 1080, calibrationScale = 1.2f)!!
        assertThat(scaled).isGreaterThan(raw)
    }
}
