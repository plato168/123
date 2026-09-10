package tw.eyecoach

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build

class EyeCoachApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "用眼環境提醒",
                NotificationManager.IMPORTANCE_DEFAULT,
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    companion object {
        const val CHANNEL_ID = "eye_coach_reminders"
    }
}
