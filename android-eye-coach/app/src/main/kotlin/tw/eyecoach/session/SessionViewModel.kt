package tw.eyecoach.session

import android.app.Application
import android.provider.Settings
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import tw.eyecoach.analysis.DemoSnapshots
import tw.eyecoach.analysis.EnvironmentAnalyzer
import tw.eyecoach.analysis.EnvironmentReport
import tw.eyecoach.analysis.SensorSnapshot
import tw.eyecoach.camera.FaceMetrics
import tw.eyecoach.sensor.DeviceSensors

enum class SessionMode {
    IDLE,
    LIVE,
    DEMO,
}

data class SessionUiState(
    val mode: SessionMode = SessionMode.IDLE,
    val demoId: String? = null,
    val report: EnvironmentReport? = null,
    val cameraEnabled: Boolean = false,
    val showPreview: Boolean = true,
    val calibrationScale: Float = 1f,
    val lastFace: FaceMetrics = FaceMetrics(false, null, null, null),
    val fiveMinuteReview: String? = null,
    val reminder: String? = null,
    val privacyAccepted: Boolean = true,
)

class SessionViewModel(application: Application) : AndroidViewModel(application) {

    private val analyzer = EnvironmentAnalyzer()
    private val _state = MutableStateFlow(SessionUiState())
    val state: StateFlow<SessionUiState> = _state

    private var sessionStartedAt = 0L
    private var tickJob: Job? = null
    private var sensors: DeviceSensors? = null
    private var lux: Float? = null
    private var pitch: Float? = null
    private var lastRemindAt = 0L
    private var lastReviewBucket = 0L

    fun onFaceMetrics(metrics: FaceMetrics) {
        _state.update { it.copy(lastFace = metrics) }
    }

    fun togglePreview() {
        _state.update { it.copy(showPreview = !it.showPreview) }
    }

    /**
     * 使用者確認「現在實際約 40 公分」時，用當下估測值校正。
     */
    fun calibrateToCm(actualCm: Float) {
        val estimated = _state.value.lastFace.distanceCm ?: return
        if (estimated < 8f) return
        val scale = (actualCm / estimated).coerceIn(0.5f, 2f)
        _state.update { it.copy(calibrationScale = scale) }
    }

    fun startLive() {
        stopInternal(keepReport = false)
        sessionStartedAt = System.currentTimeMillis()
        lastRemindAt = 0L
        lastReviewBucket = 0L
        _state.update {
            it.copy(
                mode = SessionMode.LIVE,
                demoId = null,
                cameraEnabled = true,
                fiveMinuteReview = null,
                reminder = null,
            )
        }
        bindSensors()
        startTicker()
    }

    fun startDemo(demoId: String) {
        stopInternal(keepReport = false)
        sessionStartedAt = System.currentTimeMillis()
        lastRemindAt = 0L
        lastReviewBucket = 0L
        _state.update {
            it.copy(
                mode = SessionMode.DEMO,
                demoId = demoId,
                cameraEnabled = false,
                fiveMinuteReview = null,
                reminder = null,
            )
        }
        startTicker()
    }

    fun stopSession() {
        stopInternal(keepReport = true)
        _state.update {
            it.copy(
                mode = SessionMode.IDLE,
                cameraEnabled = false,
                reminder = null,
            )
        }
    }

    override fun onCleared() {
        stopInternal(keepReport = false)
        super.onCleared()
    }

    private fun bindSensors() {
        sensors?.stop()
        sensors = DeviceSensors(getApplication()) { newLux, newPitch ->
            lux = newLux
            pitch = newPitch
        }.also { it.start() }
    }

    private fun startTicker() {
        tickJob?.cancel()
        tickJob = viewModelScope.launch {
            while (isActive) {
                publish()
                delay(700)
            }
        }
    }

    private fun publish() {
        val current = _state.value
        if (current.mode == SessionMode.IDLE) return
        val now = System.currentTimeMillis()
        val snapshot = if (current.mode == SessionMode.DEMO) {
            DemoSnapshots.snapshot(
                scenarioId = current.demoId ?: "dark_close",
                nowMs = now,
                sessionStartedAtMs = sessionStartedAt,
            )
        } else {
            val face = current.lastFace
            SensorSnapshot(
                timestampMs = now,
                ambientLux = lux,
                screenBrightness = readScreenBrightness(),
                phonePitchFromFlatDeg = pitch,
                faceDetected = face.detected,
                estimatedDistanceCm = face.distanceCm,
                headDownDeg = face.headDownDeg,
                headTiltDeg = face.headTiltDeg,
            )
        }
        val startedAt = if (current.demoId == "long_session") {
            snapshot.timestampMs - 26 * 60_000L
        } else {
            sessionStartedAt
        }
        val report = analyzer.analyze(snapshot, startedAt)
        val elapsed = snapshot.timestampMs - startedAt
        val bucket = elapsed / FIVE_MIN_MS
        val review = if (bucket > 0 && bucket != lastReviewBucket && current.mode != SessionMode.DEMO) {
            lastReviewBucket = bucket
            "近五分鐘回顧：${report.headline}"
        } else {
            current.fiveMinuteReview
        }
        val reminder = nextReminder(report, now)
        _state.update {
            it.copy(
                report = report,
                fiveMinuteReview = review,
                reminder = reminder,
            )
        }
    }

    private fun nextReminder(report: EnvironmentReport, now: Long): String? {
        val worst = report.dimensions.firstOrNull {
            it.severity == tw.eyecoach.analysis.Severity.BAD
        } ?: report.dimensions.firstOrNull {
            it.severity == tw.eyecoach.analysis.Severity.WARN
        }
        if (worst == null) return _state.value.reminder?.takeIf { now - lastRemindAt < 8_000 }
        if (now - lastRemindAt < 45_000 && _state.value.reminder != null) {
            return _state.value.reminder
        }
        lastRemindAt = now
        return "${worst.title}需要改善：${worst.gapLabel}"
    }

    private fun readScreenBrightness(): Float? {
        return try {
            val raw = Settings.System.getInt(
                getApplication<Application>().contentResolver,
                Settings.System.SCREEN_BRIGHTNESS,
            )
            (raw / 255f).coerceIn(0f, 1f)
        } catch (_: Exception) {
            null
        }
    }

    private fun stopInternal(keepReport: Boolean) {
        tickJob?.cancel()
        tickJob = null
        sensors?.stop()
        sensors = null
        if (!keepReport) {
            _state.update { it.copy(report = null) }
        }
    }

    companion object {
        const val FIVE_MIN_MS = 5 * 60 * 1000L
    }
}
