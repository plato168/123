package tw.eyecoach.camera

import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import tw.eyecoach.analysis.DistanceEstimator
import java.util.concurrent.atomic.AtomicBoolean

data class FaceMetrics(
    val detected: Boolean,
    val distanceCm: Float?,
    val headDownDeg: Float?,
    val headTiltDeg: Float?,
)

/**
 * 分析前鏡頭畫面：只輸出距離與頭部角度，影像用完即丟。
 */
class FaceFrameAnalyzer(
    private val onMetrics: (FaceMetrics) -> Unit,
) : ImageAnalysis.Analyzer {

    @Volatile
    var calibrationScale: Float = 1f

    private val busy = AtomicBoolean(false)
    private val detector = FaceDetection.getClient(
        FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
            .enableTracking()
            .build(),
    )

    override fun analyze(imageProxy: ImageProxy) {
        val media = imageProxy.image
        if (media == null) {
            imageProxy.close()
            return
        }
        if (!busy.compareAndSet(false, true)) {
            imageProxy.close()
            return
        }
        val rotation = imageProxy.imageInfo.rotationDegrees
        val frameWidth = if (rotation % 180 == 0) imageProxy.width else imageProxy.height
        val image = InputImage.fromMediaImage(media, rotation)
        detector.process(image)
            .addOnSuccessListener { faces ->
                val face = faces.maxByOrNull { it.boundingBox.width() * it.boundingBox.height() }
                if (face == null) {
                    onMetrics(FaceMetrics(false, null, null, null))
                    return@addOnSuccessListener
                }
                val distance = DistanceEstimator.estimateCm(
                    faceWidthPx = face.boundingBox.width().toFloat(),
                    imageWidthPx = frameWidth,
                    calibrationScale = calibrationScale,
                )
                val headDown = (-face.headEulerAngleX).coerceAtLeast(0f)
                onMetrics(
                    FaceMetrics(
                        detected = true,
                        distanceCm = distance,
                        headDownDeg = headDown,
                        headTiltDeg = kotlin.math.abs(face.headEulerAngleZ),
                    ),
                )
            }
            .addOnFailureListener {
                onMetrics(FaceMetrics(false, null, null, null))
            }
            .addOnCompleteListener {
                busy.set(false)
                imageProxy.close()
            }
    }

    fun close() {
        detector.close()
    }
}
