package tw.eyecoach.analysis

import kotlin.math.tan

/**
 * 以前鏡頭人臉寬度粗估觀看距離。
 * 這是經驗公式，誤差常有 10–20 公分，只適合作「過近／尚可」判斷。
 */
object DistanceEstimator {
    const val DEFAULT_FACE_WIDTH_CM = 14f
    const val DEFAULT_HFOV_DEG = 75f

    fun estimateCm(
        faceWidthPx: Float,
        imageWidthPx: Int,
        faceWidthCm: Float = DEFAULT_FACE_WIDTH_CM,
        horizontalFovDeg: Float = DEFAULT_HFOV_DEG,
        calibrationScale: Float = 1f,
    ): Float? {
        if (faceWidthPx < 8f || imageWidthPx < 16) return null
        val fovRad = Math.toRadians(horizontalFovDeg.toDouble())
        val focalPx = (imageWidthPx / 2.0) / tan(fovRad / 2.0)
        val distance = (faceWidthCm * focalPx) / faceWidthPx.toDouble()
        return (distance * calibrationScale).toFloat().coerceIn(8f, 200f)
    }
}
