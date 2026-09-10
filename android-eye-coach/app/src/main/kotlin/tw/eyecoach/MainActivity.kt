package tw.eyecoach

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import tw.eyecoach.session.SessionViewModel
import tw.eyecoach.ui.EyeCoachApp
import tw.eyecoach.ui.theme.EyeCoachTheme

class MainActivity : ComponentActivity() {
    private val sessionViewModel: SessionViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            EyeCoachTheme {
                EyeCoachApp(sessionViewModel)
            }
        }
    }
}
