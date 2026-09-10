package tw.eyecoach.sensor

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import kotlin.math.abs
import kotlin.math.sqrt

/**
 * 讀取環境光與手機傾角。平放接近 0 度、直立接近 90 度。
 */
class DeviceSensors(
    context: Context,
    private val onUpdate: (lux: Float?, pitchFromFlatDeg: Float?) -> Unit,
) : SensorEventListener {

    private val manager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val lightSensor = manager.getDefaultSensor(Sensor.TYPE_LIGHT)
    private val gravitySensor = manager.getDefaultSensor(Sensor.TYPE_GRAVITY)
        ?: manager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    private var lastLux: Float? = null
    private var lastPitch: Float? = null

    fun start() {
        lightSensor?.let { manager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI) }
        gravitySensor?.let { manager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI) }
        if (lightSensor == null) {
            lastLux = null
            emit()
        }
    }

    fun stop() {
        manager.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_LIGHT -> lastLux = event.values[0]
            Sensor.TYPE_GRAVITY, Sensor.TYPE_ACCELEROMETER -> {
                val x = event.values[0]
                val y = event.values[1]
                val z = event.values[2]
                val g = sqrt(x * x + y * y + z * z).coerceAtLeast(0.001f)
                // 重力在 z 軸最大時接近平放；在 y 軸最大時接近直立握持。
                val fromFlat = Math.toDegrees(kotlin.math.acos((abs(z) / g).coerceIn(0f, 1f)).toDouble())
                lastPitch = fromFlat.toFloat()
            }
        }
        emit()
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit

    private fun emit() {
        onUpdate(lastLux, lastPitch)
    }
}
